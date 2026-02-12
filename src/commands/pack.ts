import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { ManifestV2, validateManifestV2 } from '../utils/manifest';

type PackOptions = {
  outputDir?: string;
};

type PackIndexMetadata = {
  schema_version: '1.0';
  package: {
    name: string;
    version: string;
    channel: 'stable' | 'prerelease';
    package_format: '2.0';
    distribution_tier: 'source' | 'binary-only';
    description: string;
    license: string;
    platforms: string[];
    provenance?: ManifestV2['provenance'];
    toolchain?: ManifestV2['toolchain'];
    abi?: ManifestV2['abi'];
  };
  artifact: {
    file_name: string;
    file_path: string;
    sha256: string;
    size_bytes: number;
  };
  platform_availability: Record<string, {
    supported: boolean;
    binary?: {
      path: string;
      sha256: string;
    };
  }>;
};

export function packCommand(sourceDir: string, options: PackOptions = {}): void {
  const resolvedSourceDir = path.resolve(sourceDir);
  if (!fs.existsSync(resolvedSourceDir) || !fs.statSync(resolvedSourceDir).isDirectory()) {
    console.log(chalk.red(`❌ Error: Source directory not found: ${sourceDir}`));
    process.exit(1);
  }

  const metadataPath = path.join(resolvedSourceDir, 'picopak.json');
  if (!fs.existsSync(metadataPath)) {
    console.log(chalk.red('❌ Error: picopak.json not found in source directory'));
    process.exit(1);
  }

  const includeDir = path.join(resolvedSourceDir, 'include');
  if (!fs.existsSync(includeDir) || !fs.statSync(includeDir).isDirectory()) {
    console.log(chalk.red('❌ Error: Required include/ directory not found'));
    process.exit(1);
  }

  const rawMetadata = parseMetadata(metadataPath);
  const { manifest: metadata, warnings } = validateManifest(rawMetadata);
  warnings.forEach((warning) => console.log(chalk.yellow(`⚠ Warning: ${warning}`)));

  const tierWarnings = validatePackTierRules(resolvedSourceDir, metadata);
  tierWarnings.forEach((warning) => console.log(chalk.yellow(`⚠ Warning: ${warning}`)));

  const cmakeFile = path.join(resolvedSourceDir, 'cmake', `${metadata.name}.cmake`);
  if (!fs.existsSync(cmakeFile)) {
    console.log(chalk.red(`❌ Error: Required CMake file not found: cmake\\${metadata.name}.cmake`));
    process.exit(1);
  }

  const archiveName = `${metadata.name}-${metadata.version}.picopak`;
  const outputDir = options.outputDir ? path.resolve(options.outputDir) : path.dirname(resolvedSourceDir);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, archiveName);
  createArchive(resolvedSourceDir, outputPath);
  const metadataOutputPath = emitIndexMetadata(outputDir, archiveName, outputPath, metadata);

  console.log(chalk.green('✓ Package created successfully!'));
  console.log(chalk.white(`  ${outputPath}`));
  console.log(chalk.white(`  ${metadataOutputPath}`));
}

function parseMetadata(metadataPath: string): unknown {
  try {
    const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as unknown;
    return parsed;
  } catch (error) {
    console.log(chalk.red('❌ Error: Failed to parse picopak.json'));
    if (error instanceof Error) {
      console.log(chalk.gray(error.message));
    }
    process.exit(1);
  }
}

function validateManifest(metadata: unknown) {
  try {
    return validateManifestV2(metadata);
  } catch (error) {
    console.log(chalk.red('❌ Error: Invalid picopak.json manifest v2'));
    if (error instanceof Error) {
      console.log(chalk.gray(` - ${error.message.replace(/\n/g, '\n - ')}`));
    }
    process.exit(1);
  }
}

function validatePackTierRules(sourceDir: string, manifest: ManifestV2) {
  try {
    return validateTierRules(sourceDir, manifest);
  } catch (error) {
    console.log(chalk.red('❌ Error: Package content validation failed'));
    if (error instanceof Error) {
      console.log(chalk.gray(` - ${error.message.replace(/\n/g, '\n - ')}`));
    }
    process.exit(1);
  }
}

function validateTierRules(sourceDir: string, manifest: ManifestV2): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const platform of manifest.platforms as Array<'rp2040' | 'rp2350'>) {
    const binary = manifest.variants[platform]?.binary;
    if (!binary) {
      continue;
    }

    const resolvedBinaryPath = path.resolve(sourceDir, binary.path);
    const relativeBinaryPath = path.relative(sourceDir, resolvedBinaryPath);
    if (relativeBinaryPath.startsWith('..') || path.isAbsolute(relativeBinaryPath)) {
      errors.push(`variants.${platform}.binary.path must stay inside package root: ${binary.path}`);
      continue;
    }
    if (!fs.existsSync(resolvedBinaryPath) || !fs.statSync(resolvedBinaryPath).isFile()) {
      errors.push(`variants.${platform}.binary.path points to a missing file: ${binary.path}`);
      continue;
    }

    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(resolvedBinaryPath)).digest('hex');
    if (fileHash !== binary.sha256) {
      errors.push(`variants.${platform}.binary.sha256 does not match file contents for ${binary.path} (expected ${binary.sha256}, got ${fileHash})`);
    }
  }

  if (manifest.distribution_tier === 'binary-only') {
    const implementationExts = new Set(['.c', '.cc', '.cpp', '.cxx', '.s', '.asm']);
    const files = listFilesRecursive(sourceDir);
    const implementationFiles = files.filter((filePath) => implementationExts.has(path.extname(filePath).toLowerCase()));
    if (implementationFiles.length > 0) {
      errors.push(`distribution_tier "binary-only" cannot include source implementation files (${implementationFiles[0]})`);
    }
  } else {
    const sourceLikeExts = new Set(['.h', '.hpp', '.hh', '.hxx', '.c', '.cc', '.cpp', '.cxx', '.s', '.asm']);
    const sourceLikeFiles = listFilesRecursive(path.join(sourceDir, 'include')).filter(
      (filePath) => sourceLikeExts.has(path.extname(filePath).toLowerCase())
    );
    if (sourceLikeFiles.length === 0) {
      warnings.push('Tier A source-preferred package should include source or header files under include/');
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n - '));
  }

  return warnings;
}

function listFilesRecursive(rootDir: string): string[] {
  if (!fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) {
    return [];
  }
  const files: string[] = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(absolutePath));
      continue;
    }
    files.push(absolutePath);
  }
  return files;
}

function createArchive(sourceDir: string, outputPath: string): void {
  const spinner = ora('Building .picopak archive...').start();
  const entries = fs.readdirSync(sourceDir);
  const tempZipPath = `${outputPath}.zip`;
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { force: true });
  }
  if (fs.existsSync(tempZipPath)) {
    fs.rmSync(tempZipPath, { force: true });
  }

  const commandResult = spawnSync('tar', ['-a', '-c', '-f', tempZipPath, ...entries], {
    cwd: sourceDir,
    stdio: 'pipe',
    encoding: 'utf-8'
  });

  if (commandResult.status !== 0 || !fs.existsSync(tempZipPath)) {
    spinner.fail('Failed to build archive');
    if (commandResult.stderr) {
      console.log(chalk.red(commandResult.stderr.trim()));
    }
    process.exit(1);
  }

  fs.renameSync(tempZipPath, outputPath);
  spinner.succeed('Archive built');
}

function emitIndexMetadata(outputDir: string, archiveName: string, artifactPath: string, manifest: ManifestV2): string {
  const fileBuffer = fs.readFileSync(artifactPath);
  const metadata: PackIndexMetadata = {
    schema_version: '1.0',
    package: {
      name: manifest.name,
      version: manifest.version,
      channel: inferReleaseChannel(manifest.version),
      package_format: manifest.package_format,
      distribution_tier: manifest.distribution_tier,
      description: manifest.description,
      license: manifest.license,
      platforms: [...manifest.platforms],
      provenance: manifest.provenance,
      toolchain: manifest.toolchain,
      abi: manifest.abi
    },
    artifact: {
      file_name: archiveName,
      file_path: artifactPath,
      sha256: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
      size_bytes: fs.statSync(artifactPath).size
    },
    platform_availability: buildPlatformAvailability(manifest)
  };

  const metadataPath = path.join(outputDir, `${archiveName}.metadata.json`);
  fs.writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf-8');
  return metadataPath;
}

function buildPlatformAvailability(manifest: ManifestV2): PackIndexMetadata['platform_availability'] {
  const knownPlatforms: Array<'rp2040' | 'rp2350'> = ['rp2040', 'rp2350'];
  const availability: PackIndexMetadata['platform_availability'] = {};
  for (const platform of knownPlatforms) {
    const binary = manifest.variants[platform]?.binary;
    availability[platform] = {
      supported: manifest.platforms.includes(platform),
      binary: binary ? { path: binary.path, sha256: binary.sha256 } : undefined
    };
  }
  return availability;
}

function inferReleaseChannel(version: string): 'stable' | 'prerelease' {
  return version.includes('-') ? 'prerelease' : 'stable';
}

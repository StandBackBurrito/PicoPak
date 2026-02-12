import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawnSync } from 'child_process';
import chalk from 'chalk';

type SubmitOptions = {
  outputDir?: string;
  indexFile?: string;
  artifactUrl?: string;
  dryRun?: boolean;
};

type PackMetadata = {
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

type IndexReleasePayload = {
  version: string;
  prerelease: boolean;
  description: string;
  license: string;
  package_format: string;
  distribution_tier: string;
  artifacts: Record<string, { url: string; sha256: string }>;
};

type JsonRecord = Record<string, unknown>;

export function submitCommand(inputPath: string, options: SubmitOptions = {}): void {
  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    fail(`Input path not found: ${inputPath}`);
  }

  const { metadataPath, artifactPath } = resolveSubmitInputs(resolvedInput);
  const metadata = parsePackMetadata(metadataPath);
  const localArtifact = resolveArtifactPath(artifactPath, metadata, metadataPath);
  validateArtifact(localArtifact, metadata);

  const outputBase = options.outputDir ? path.resolve(options.outputDir) : path.dirname(metadataPath);
  const bundleDir = path.join(outputBase, `${metadata.package.name}-${metadata.package.version}-submit`);
  fs.mkdirSync(bundleDir, { recursive: true });

  const releasePayload = buildReleasePayload(metadata, options.artifactUrl);
  fs.writeFileSync(
    path.join(bundleDir, 'index-entry.json'),
    `${JSON.stringify({ [metadata.package.name]: releasePayload }, null, 2)}\n`,
    'utf-8'
  );

  const releaseDataPath = path.join(bundleDir, 'release-data.json');
  fs.writeFileSync(
    releaseDataPath,
    `${JSON.stringify({
      metadata_file: metadataPath,
      artifact_file: localArtifact,
      artifact_sha256: metadata.artifact.sha256,
      package: metadata.package,
      release: releasePayload
    }, null, 2)}\n`,
    'utf-8'
  );

  const indexUpdate = buildOptionalIndexUpdate(metadata, releasePayload, options.indexFile, bundleDir, options.dryRun);
  writeInstructions(bundleDir, metadata, localArtifact, options, indexUpdate);

  console.log(chalk.green('✓ Submit helper bundle generated'));
  console.log(chalk.white(`  Bundle: ${bundleDir}`));
  console.log(chalk.white(`  Release data: ${releaseDataPath}`));
  if (indexUpdate?.patchPath) {
    console.log(chalk.white(`  Patch: ${indexUpdate.patchPath}`));
  } else {
    console.log(chalk.yellow('  No index patch generated (use --index-file to generate one)'));
  }
}

function resolveSubmitInputs(input: string): { metadataPath: string; artifactPath?: string } {
  if (input.endsWith('.metadata.json')) {
    return { metadataPath: input };
  }
  if (input.endsWith('.picopak')) {
    const inferredMetadata = `${input}.metadata.json`;
    if (!fs.existsSync(inferredMetadata)) {
      fail(`Metadata file not found: ${inferredMetadata}\nRun "picopak pack <sourceDir>" first to emit metadata.`);
    }
    return { metadataPath: inferredMetadata, artifactPath: input };
  }
  fail('Input must be a .picopak artifact or a .metadata.json file emitted by pack.');
}

function parsePackMetadata(metadataPath: string): PackMetadata {
  try {
    const parsed = JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as unknown;
    return validatePackMetadata(parsed);
  } catch (error) {
    fail(`Unable to read metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function validatePackMetadata(input: unknown): PackMetadata {
  const metadata = input as Partial<PackMetadata>;
  if (metadata?.schema_version !== '1.0') {
    fail('Unsupported metadata schema. Expected schema_version "1.0".');
  }

  const pkg = metadata.package;
  if (!pkg || !pkg.name || !pkg.version || !pkg.description || !pkg.license || !Array.isArray(pkg.platforms)) {
    fail('Invalid metadata.package content.');
  }
  const artifact = metadata.artifact;
  if (!artifact || !artifact.file_name || !artifact.sha256 || typeof artifact.size_bytes !== 'number') {
    fail('Invalid metadata.artifact content.');
  }
  if (!/^[a-fA-F0-9]{64}$/.test(artifact.sha256)) {
    fail('metadata.artifact.sha256 must be a 64-character hex SHA256.');
  }
  if (!metadata.platform_availability || typeof metadata.platform_availability !== 'object') {
    fail('Invalid metadata.platform_availability content.');
  }

  return metadata as PackMetadata;
}

function resolveArtifactPath(explicitArtifactPath: string | undefined, metadata: PackMetadata, metadataPath: string): string {
  if (explicitArtifactPath && fs.existsSync(explicitArtifactPath)) {
    return explicitArtifactPath;
  }

  const candidates = [
    metadata.artifact.file_path,
    path.join(path.dirname(metadataPath), metadata.artifact.file_name)
  ].map((candidate) => path.resolve(candidate));

  const match = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!match) {
    fail('Unable to locate local .picopak artifact referenced by metadata.');
  }
  return match;
}

function validateArtifact(artifactPath: string, metadata: PackMetadata): void {
  if (!artifactPath.endsWith('.picopak')) {
    fail(`Artifact must be a .picopak file: ${artifactPath}`);
  }

  const artifactStat = fs.statSync(artifactPath);
  if (artifactStat.size !== metadata.artifact.size_bytes) {
    fail(`Artifact size mismatch. Expected ${metadata.artifact.size_bytes}, got ${artifactStat.size}.`);
  }

  const hash = crypto.createHash('sha256').update(fs.readFileSync(artifactPath)).digest('hex');
  if (hash !== metadata.artifact.sha256.toLowerCase()) {
    fail(`Artifact checksum mismatch. Expected ${metadata.artifact.sha256}, got ${hash}.`);
  }
}

function buildReleasePayload(metadata: PackMetadata, artifactUrlOption?: string): IndexReleasePayload {
  const artifacts: Record<string, { url: string; sha256: string }> = {};
  for (const [platform, availability] of Object.entries(metadata.platform_availability)) {
    if (!availability?.supported) {
      continue;
    }
    artifacts[platform] = {
      url: resolveArtifactUrl(artifactUrlOption, metadata.artifact.file_name),
      sha256: metadata.artifact.sha256
    };
  }

  return {
    version: metadata.package.version,
    prerelease: metadata.package.channel === 'prerelease',
    description: metadata.package.description,
    license: metadata.package.license,
    package_format: metadata.package.package_format,
    distribution_tier: metadata.package.distribution_tier,
    artifacts
  };
}

function resolveArtifactUrl(optionValue: string | undefined, fileName: string): string {
  if (!optionValue || !optionValue.trim()) {
    return `https://example.com/picopak/${fileName}`;
  }
  const template = optionValue.trim();
  if (template.includes('{file}')) {
    return template.replace('{file}', fileName);
  }
  return template.endsWith('/') ? `${template}${fileName}` : template;
}

function buildOptionalIndexUpdate(
  metadata: PackMetadata,
  releasePayload: IndexReleasePayload,
  indexFile: string | undefined,
  bundleDir: string,
  dryRun?: boolean
): { updatedPath?: string; patchPath?: string } | undefined {
  if (!indexFile || !indexFile.trim()) {
    return undefined;
  }
  const resolvedIndexFile = path.resolve(indexFile.trim());
  if (!fs.existsSync(resolvedIndexFile)) {
    fail(`Index file not found: ${resolvedIndexFile}`);
  }

  const currentIndex = parseJsonFile(resolvedIndexFile);
  const updatedIndex = applyReleaseToIndex(currentIndex, metadata.package.name, metadata.package.version, releasePayload);
  if (dryRun) {
    return undefined;
  }

  const updatedPath = path.join(bundleDir, 'index.updated.json');
  fs.writeFileSync(updatedPath, `${JSON.stringify(updatedIndex, null, 2)}\n`, 'utf-8');
  const patchPath = path.join(bundleDir, 'index-update.patch');
  const diff = spawnSync('git', ['--no-pager', 'diff', '--no-index', '--', resolvedIndexFile, updatedPath], {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  if (diff.stdout) {
    fs.writeFileSync(patchPath, diff.stdout, 'utf-8');
  }
  return { updatedPath, patchPath: fs.existsSync(patchPath) ? patchPath : undefined };
}

function parseJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
  } catch (error) {
    fail(`Failed to parse JSON: ${filePath}\n${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function applyReleaseToIndex(indexData: unknown, packageName: string, version: string, payload: IndexReleasePayload): unknown {
  const root = structuredCloneJson(indexData);
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    fail('Index root must be a JSON object.');
  }
  const rootRecord = root as JsonRecord;
  const packagesNode = rootRecord.packages;

  if (Array.isArray(packagesNode)) {
    applyToArrayPackages(packagesNode as unknown[], packageName, version, payload);
    return root;
  }

  if (!packagesNode) {
    rootRecord.packages = {};
  }

  if (typeof rootRecord.packages !== 'object' || Array.isArray(rootRecord.packages) || !rootRecord.packages) {
    fail('Unsupported index "packages" format.');
  }

  const packages = rootRecord.packages as JsonRecord;
  if (!packages[packageName]) {
    packages[packageName] = { name: packageName, releases: {} };
  }
  const packageNode = packages[packageName] as JsonRecord;
  applyToPackageReleases(packageNode, packageName, version, payload);
  return root;
}

function applyToArrayPackages(packages: unknown[], packageName: string, version: string, payload: IndexReleasePayload): void {
  let packageNode = packages.find((entry) => {
    const node = entry as JsonRecord;
    return typeof node?.name === 'string' && node.name.toLowerCase() === packageName.toLowerCase();
  }) as JsonRecord | undefined;

  if (!packageNode) {
    packageNode = { name: packageName, releases: [] };
    packages.push(packageNode);
  }

  const releases = packageNode.releases;
  if (!Array.isArray(releases)) {
    fail(`Unsupported releases format for package "${packageName}" (expected array).`);
  }
  const alreadyExists = releases.some((entry) => {
    const release = entry as JsonRecord;
    return String(release.version || '').trim().toLowerCase() === version.toLowerCase();
  });
  if (alreadyExists) {
    fail(`Immutable version check failed: ${packageName}@${version} already exists.`);
  }
  releases.push(payload);
}

function applyToPackageReleases(packageNode: JsonRecord, packageName: string, version: string, payload: IndexReleasePayload): void {
  if (!packageNode.name) {
    packageNode.name = packageName;
  }
  if (!packageNode.description) {
    packageNode.description = payload.description;
  }
  if (!packageNode.releases) {
    packageNode.releases = {};
  }

  if (Array.isArray(packageNode.releases)) {
    const releases = packageNode.releases as unknown[];
    const alreadyExists = releases.some((entry) => {
      const release = entry as JsonRecord;
      return String(release.version || '').trim().toLowerCase() === version.toLowerCase();
    });
    if (alreadyExists) {
      fail(`Immutable version check failed: ${packageName}@${version} already exists.`);
    }
    releases.push(payload);
    return;
  }

  if (typeof packageNode.releases !== 'object' || !packageNode.releases) {
    fail(`Unsupported releases format for package "${packageName}".`);
  }

  const releases = packageNode.releases as JsonRecord;
  if (releases[version]) {
    fail(`Immutable version check failed: ${packageName}@${version} already exists.`);
  }
  releases[version] = payload;
}

function writeInstructions(
  bundleDir: string,
  metadata: PackMetadata,
  artifactPath: string,
  options: SubmitOptions,
  indexUpdate?: { updatedPath?: string; patchPath?: string }
): void {
  const lines = [
    `PicoPak submit helper (non-destructive)`,
    ``,
    `Package: ${metadata.package.name}@${metadata.package.version}`,
    `Artifact: ${artifactPath}`,
    `Artifact SHA256: ${metadata.artifact.sha256}`,
    `Platforms: ${metadata.package.platforms.join(', ')}`,
    ``,
    `Generated files:`,
    `- index-entry.json (release payload for index repo)`,
    `- release-data.json (full helper output)`,
    ...(indexUpdate?.updatedPath ? [`- index.updated.json (local preview update)`] : []),
    ...(indexUpdate?.patchPath ? [`- index-update.patch (git-style patch to apply in index repo)`] : []),
    ``,
    `Next steps:`,
    `1) Upload artifact to your package hosting location.`,
    `2) Clone/update your index repository locally.`,
    `3) Apply generated release payload without editing existing versions.`,
    `4) Open a PR with artifact URL + index change.`,
    ``,
    `Suggested commands (PowerShell):`,
    `git clone <index-repo-url> .\\picopak-index`,
    `Set-Location .\\picopak-index`,
    ...(indexUpdate?.patchPath
      ? [`git apply "${indexUpdate.patchPath}"`]
      : [`# Merge "${path.join(bundleDir, 'index-entry.json')}" into index.json under ${metadata.package.name}.releases.${metadata.package.version}`]),
    `git add .`,
    `git commit -m "Add ${metadata.package.name} ${metadata.package.version}"`,
    `git push origin <branch-name>`,
    ``,
    `Notes:`,
    `- Immutable version principle enforced: existing ${metadata.package.name}@${metadata.package.version} must not be overwritten.`,
    `- Default artifact URL template used: ${resolveArtifactUrl(options.artifactUrl, metadata.artifact.file_name)}`
  ];
  fs.writeFileSync(path.join(bundleDir, 'submission-instructions.txt'), `${lines.join('\n')}\n`, 'utf-8');
}

function structuredCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fail(message: string): never {
  console.log(chalk.red(`❌ Error: ${message}`));
  process.exit(1);
}

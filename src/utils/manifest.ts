interface ManifestBase {
  name: string;
  version: string;
  description: string;
  license: string;
  platforms: string[];
}

type Platform = 'rp2040' | 'rp2350';
type DistributionTier = 'source' | 'binary-only';

interface ManifestVariantBinary {
  path: string;
  sha256: string;
}

interface ManifestVariant {
  platform: Platform;
  binary?: ManifestVariantBinary;
}

interface ManifestProvenance {
  source_repository: string;
  source_revision: string;
}

interface ManifestToolchain {
  compiler: string;
  version: string;
  pico_sdk_version?: string;
}

interface ManifestAbi {
  optimization_flags: string;
  float_abi: string;
  cxx_exceptions: boolean;
  cxx_rtti: boolean;
}

export interface ManifestV2 extends ManifestBase {
  package_format: '2.0';
  distribution_tier: DistributionTier;
  variants: Record<Platform, ManifestVariant>;
  provenance?: ManifestProvenance;
  toolchain?: ManifestToolchain;
  abi?: ManifestAbi;
}

export interface ManifestValidationResult {
  manifest: ManifestV2;
  warnings: string[];
}

export type InstallManifestMetadata = ManifestBase;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => !isNonEmptyString(item))) {
    return undefined;
  }
  return value.map((item) => item.trim());
}

function isPlatform(value: unknown): value is Platform {
  return value === 'rp2040' || value === 'rp2350';
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function validateManifestV2(raw: unknown): ManifestValidationResult {
  const manifest = raw as Record<string, unknown>;
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = manifest.name;
  const version = manifest.version;
  const description = manifest.description;
  const license = manifest.license;
  const packageFormat = manifest.package_format;
  const distributionTierRaw = manifest.distribution_tier;
  const platforms = asStringArray(manifest.platforms);

  if (!isNonEmptyString(name)) errors.push('name must be a non-empty string');
  if (!isNonEmptyString(version)) errors.push('version must be a non-empty string');
  if (!isNonEmptyString(description)) errors.push('description must be a non-empty string');
  if (!isNonEmptyString(license)) errors.push('license must be a non-empty string');
  if (packageFormat !== '2.0') errors.push('package_format must be "2.0"');
  let distributionTier: DistributionTier | undefined;
  if (distributionTierRaw === 'source' || distributionTierRaw === 'source-preferred') {
    distributionTier = 'source';
  } else if (distributionTierRaw === 'binary-only') {
    distributionTier = 'binary-only';
  } else {
    errors.push('distribution_tier must be "source" or "binary-only"');
  }
  if (!platforms || platforms.length === 0) {
    errors.push('platforms must be a non-empty string array');
  }

  const variantsNode = manifest.variants as Record<string, unknown> | undefined;
  if (!variantsNode || typeof variantsNode !== 'object') {
    errors.push('variants must be an object');
  }

  const normalizedPlatforms = Array.from(new Set((platforms || []).filter(isPlatform)));
  if (platforms && normalizedPlatforms.length !== platforms.length) {
    errors.push('platforms may only contain "rp2040" and "rp2350"');
  }

  const validatedVariants: Partial<Record<Platform, ManifestVariant>> = {};
  for (const platform of normalizedPlatforms) {
    const variant = variantsNode?.[platform] as Record<string, unknown> | undefined;
    if (!variant || typeof variant !== 'object') {
      errors.push(`variants.${platform} must be an object`);
      continue;
    }
    if (variant.platform !== platform) {
      errors.push(`variants.${platform}.platform must be "${platform}"`);
    }

    let binary: ManifestVariantBinary | undefined;
    if (variant.binary !== undefined) {
      const binaryNode = variant.binary as Record<string, unknown>;
      if (!binaryNode || typeof binaryNode !== 'object') {
        errors.push(`variants.${platform}.binary must be an object`);
      } else if (!isNonEmptyString(binaryNode.path) || !isNonEmptyString(binaryNode.sha256)) {
        errors.push(`variants.${platform}.binary.path and variants.${platform}.binary.sha256 must be non-empty strings`);
      } else if (!/^[a-fA-F0-9]{64}$/.test(binaryNode.sha256.trim())) {
        errors.push(`variants.${platform}.binary.sha256 must be a 64-character hex SHA256`);
      } else {
        binary = {
          path: binaryNode.path.trim(),
          sha256: binaryNode.sha256.trim().toLowerCase()
        };
      }
    }

    validatedVariants[platform] = {
      platform,
      binary
    };
  }

  const provenanceNode = manifest.provenance as Record<string, unknown> | undefined;
  const hasProvenance = provenanceNode && typeof provenanceNode === 'object'
    && isNonEmptyString(provenanceNode.source_repository)
    && isNonEmptyString(provenanceNode.source_revision);

  const toolchainNode = manifest.toolchain as Record<string, unknown> | undefined;
  const hasToolchain = toolchainNode && typeof toolchainNode === 'object'
    && isNonEmptyString(toolchainNode.compiler)
    && isNonEmptyString(toolchainNode.version);

  const abiNode = manifest.abi as Record<string, unknown> | undefined;
  const hasAbi = abiNode && typeof abiNode === 'object'
    && isNonEmptyString(abiNode.optimization_flags)
    && isNonEmptyString(abiNode.float_abi)
    && isBoolean(abiNode.cxx_exceptions)
    && isBoolean(abiNode.cxx_rtti);

  if (distributionTier === 'binary-only') {
    if (!hasProvenance) errors.push('provenance.source_repository and provenance.source_revision are required for distribution_tier "binary-only"');
    if (!hasToolchain) {
      errors.push('toolchain.compiler and toolchain.version are required for distribution_tier "binary-only"');
    } else if (!isNonEmptyString(toolchainNode!.pico_sdk_version)) {
      errors.push('toolchain.pico_sdk_version is required for distribution_tier "binary-only"');
    }
    if (!hasAbi) errors.push('abi.optimization_flags, abi.float_abi, abi.cxx_exceptions, and abi.cxx_rtti are required for distribution_tier "binary-only"');
    for (const platform of normalizedPlatforms) {
      if (!validatedVariants[platform]?.binary) {
        errors.push(`variants.${platform}.binary is required for distribution_tier "binary-only"`);
      }
    }
  } else if (distributionTier === 'source') {
    if (!hasProvenance) warnings.push('Recommended for source tier: provenance.source_repository and provenance.source_revision');
    if (!hasToolchain) warnings.push('Recommended for source tier: toolchain.compiler and toolchain.version');
    if (!hasAbi) warnings.push('Recommended for source tier: abi.optimization_flags, abi.float_abi, abi.cxx_exceptions, and abi.cxx_rtti');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n - '));
  }

  const typedManifest: ManifestV2 = {
    name: (name as string).trim(),
    version: (version as string).trim(),
    description: (description as string).trim(),
    license: (license as string).trim(),
    package_format: '2.0',
    distribution_tier: distributionTier as DistributionTier,
    platforms: normalizedPlatforms,
    variants: validatedVariants as Record<Platform, ManifestVariant>,
    provenance: hasProvenance
      ? {
        source_repository: String(provenanceNode!.source_repository).trim(),
        source_revision: String(provenanceNode!.source_revision).trim()
      }
      : undefined,
    toolchain: hasToolchain
      ? {
        compiler: String(toolchainNode!.compiler).trim(),
        version: String(toolchainNode!.version).trim(),
        pico_sdk_version: isNonEmptyString(toolchainNode!.pico_sdk_version) ? String(toolchainNode!.pico_sdk_version).trim() : undefined
      }
      : undefined,
    abi: hasAbi
      ? {
        optimization_flags: String(abiNode!.optimization_flags).trim(),
        float_abi: String(abiNode!.float_abi).trim(),
        cxx_exceptions: Boolean(abiNode!.cxx_exceptions),
        cxx_rtti: Boolean(abiNode!.cxx_rtti)
      }
      : undefined
  };

  return { manifest: typedManifest, warnings };
}

export function validateManifestForInstall(raw: unknown): InstallManifestMetadata {
  const manifest = raw as Record<string, unknown>;
  if (manifest.package_format === '2.0') {
    const v2 = validateManifestV2(raw).manifest;
    return {
      name: v2.name,
      version: v2.version,
      description: v2.description,
      license: v2.license,
      platforms: v2.platforms
    };
  }

  const name = manifest.name;
  const version = manifest.version;
  const description = manifest.description;
  const license = manifest.license;
  const platforms = asStringArray(manifest.platforms);
  if (!isNonEmptyString(name) || !isNonEmptyString(version) || !isNonEmptyString(description) || !isNonEmptyString(license) || !platforms || platforms.length === 0) {
    throw new Error('legacy manifest requires name, version, description, license, and non-empty platforms');
  }
  return {
    name: name.trim(),
    version: version.trim(),
    description: description.trim(),
    license: license.trim(),
    platforms
  };
}

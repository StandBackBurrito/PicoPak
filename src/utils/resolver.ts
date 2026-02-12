import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

type Platform = 'rp2040' | 'rp2350';

export interface InstallResolveOptions {
  version?: string;
  includePrerelease?: boolean;
  platform?: Platform;
  projectDir: string;
  indexUrl?: string;
}

interface IndexArtifact {
  url: string;
  checksum?: string;
  sha256?: string;
}

interface IndexRelease {
  version: string;
  prerelease?: boolean;
  platform?: string;
  url?: string;
  checksum?: string;
  sha256?: string;
  artifact?: unknown;
  artifacts?: Record<string, unknown>;
  assets?: unknown;
  platforms?: Record<string, unknown>;
  files?: Record<string, unknown>;
  downloads?: Record<string, unknown>;
}

interface PackageEntry {
  name: string;
  releases: IndexRelease[];
}

interface ResolvedRelease {
  packageName: string;
  version: string;
  platform: Platform;
  downloadUrl: string;
  checksum?: string;
}

export interface ResolvedPackage {
  packageFile: string;
  packageName: string;
  version: string;
  platform: Platform;
  tempPath?: string;
}

const DEFAULT_INDEX_URL = 'https://raw.githubusercontent.com/FastLED/picopak-index/main/index.json';

export function isPackageNameReference(value: string): boolean {
  if (!value || fs.existsSync(value)) {
    return false;
  }
  if (value.endsWith('.picopak')) {
    return false;
  }
  return !value.includes('\\') && !value.includes('/') && !value.includes(':');
}

export async function resolvePackageInput(value: string, options: InstallResolveOptions): Promise<ResolvedPackage> {
  if (!isPackageNameReference(value)) {
    return {
      packageFile: value,
      packageName: '',
      version: '',
      platform: (options.platform || 'rp2040')
    };
  }

  const platform = options.platform || detectPlatform(options.projectDir);
  const release = await resolveRemoteRelease(value, {
    ...options,
    platform
  });
  const downloadedFile = await downloadReleasePackage(release);

  return {
    packageFile: downloadedFile,
    packageName: release.packageName,
    version: release.version,
    platform: release.platform,
    tempPath: downloadedFile
  };
}

export function detectPlatform(projectDir: string): Platform {
  const envPlatform = normalizePlatform(process.env.PICO_PLATFORM);
  if (envPlatform) {
    return envPlatform;
  }

  const cmakePath = path.join(projectDir, 'CMakeLists.txt');
  if (fs.existsSync(cmakePath)) {
    const cmakeText = fs.readFileSync(cmakePath, 'utf-8');
    const match = cmakeText.match(/PICO_PLATFORM\s*\)?\s*["']?(rp2040|rp2350)["']?/i);
    const platform = normalizePlatform(match?.[1]);
    if (platform) {
      return platform;
    }
  }

  return 'rp2040';
}

function normalizePlatform(value?: string): Platform | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'rp2040' || normalized === 'rp2350') {
    return normalized;
  }
  return undefined;
}

async function resolveRemoteRelease(packageName: string, options: Required<Pick<InstallResolveOptions, 'projectDir'>> & Omit<InstallResolveOptions, 'projectDir'> & { platform: Platform }): Promise<ResolvedRelease> {
  const indexUrls = getIndexUrls(options.indexUrl);
  let lastError = '';

  for (const indexUrl of indexUrls) {
    try {
      const indexData = await fetchJson(indexUrl);
      const packageEntry = findPackage(indexData, packageName);
      if (!packageEntry) {
        throw new Error(`Package "${packageName}" not found in index ${indexUrl}`);
      }

      const selectedRelease = selectRelease(packageEntry, options);
      const artifact = selectArtifact(selectedRelease, options.platform);
      if (!artifact?.url) {
        throw new Error(`No downloadable artifact found for ${packageName}@${selectedRelease.version} on platform ${options.platform}`);
      }

      return {
        packageName: packageEntry.name,
        version: selectedRelease.version,
        platform: options.platform,
        downloadUrl: artifact.url,
        checksum: artifact.checksum || artifact.sha256
      };
    } catch (error) {
      lastError = (error as Error).message;
    }
  }

  throw new Error(`Unable to resolve package "${packageName}". ${lastError}`);
}

export function getIndexUrls(explicitUrl?: string): string[] {
  if (explicitUrl?.trim()) {
    return [explicitUrl.trim()];
  }

  const envUrls = process.env.PICO_PAK_INDEX_URLS
    ?.split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  if (envUrls && envUrls.length > 0) {
    return envUrls;
  }

  if (process.env.PICO_PAK_INDEX_URL?.trim()) {
    return [process.env.PICO_PAK_INDEX_URL.trim()];
  }

  return [DEFAULT_INDEX_URL];
}

async function fetchJson(url: string): Promise<unknown> {
  const raw = await requestText(url);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON from index URL: ${url}`);
  }
}

function findPackage(indexData: unknown, packageName: string): PackageEntry | undefined {
  const lowerName = packageName.toLowerCase();
  const root = indexData as Record<string, unknown>;
  const packagesNode = root.packages ?? root;

  if (Array.isArray(packagesNode)) {
    for (const item of packagesNode) {
      const pkg = item as Record<string, unknown>;
      const name = String(pkg.name || '');
      if (name.toLowerCase() === lowerName) {
        return {
          name,
          releases: normalizeReleases(pkg.releases ?? pkg.versions)
        };
      }
    }
    return undefined;
  }

  if (packagesNode && typeof packagesNode === 'object') {
    const packagesRecord = packagesNode as Record<string, unknown>;
    for (const [name, value] of Object.entries(packagesRecord)) {
      if (name.toLowerCase() === lowerName) {
        const pkg = value as Record<string, unknown>;
        return {
          name: String(pkg.name || name),
          releases: normalizeReleases(pkg.releases ?? pkg.versions ?? value)
        };
      }
    }
  }

  return undefined;
}

function normalizeReleases(input: unknown): IndexRelease[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input
      .map((release) => release as IndexRelease)
      .filter((release) => typeof release.version === 'string');
  }

  if (typeof input === 'object') {
    const record = input as Record<string, unknown>;
    return Object.entries(record).map(([version, payload]) => {
      const value = payload as Record<string, unknown>;
      return {
        version: String(value.version || version),
        prerelease: value.prerelease as boolean | undefined,
        platform: value.platform as string | undefined,
        url: value.url as string | undefined,
        checksum: value.checksum as string | undefined,
        sha256: value.sha256 as string | undefined,
        artifact: value.artifact,
        artifacts: value.artifacts as Record<string, unknown> | undefined,
        assets: value.assets,
        platforms: value.platforms as Record<string, unknown> | undefined,
        files: value.files as Record<string, unknown> | undefined,
        downloads: value.downloads as Record<string, unknown> | undefined
      };
    });
  }

  return [];
}

function selectRelease(packageEntry: PackageEntry, options: { version?: string; includePrerelease?: boolean }): IndexRelease {
  if (!packageEntry.releases || packageEntry.releases.length === 0) {
    throw new Error(`Package "${packageEntry.name}" has no releases in the index`);
  }

  if (options.version) {
    const matched = packageEntry.releases.find((release) => normalizeVersion(release.version) === normalizeVersion(options.version!));
    if (!matched) {
      throw new Error(`Version "${options.version}" not found for package "${packageEntry.name}"`);
    }
    return matched;
  }

  const sorted = [...packageEntry.releases].sort((a, b) => compareVersions(b.version, a.version));
  if (options.includePrerelease) {
    return sorted[0];
  }

  const stable = sorted.find((release) => !isPrerelease(release));
  if (!stable) {
    throw new Error(`No stable release found for package "${packageEntry.name}". Use --include-prerelease.`);
  }
  return stable;
}

function selectArtifact(release: IndexRelease, platform: Platform): IndexArtifact | undefined {
  const maps: Array<Record<string, unknown> | undefined> = [release.artifacts, release.platforms, release.files, release.downloads];
  for (const map of maps) {
    if (!map) {
      continue;
    }
    const entry = map[platform];
    const artifact = normalizeArtifact(entry);
    if (artifact?.url) {
      return artifact;
    }
  }

  if (release.platform && normalizePlatform(release.platform) === platform && release.url) {
    return { url: release.url, checksum: release.checksum, sha256: release.sha256 };
  }

  const arrayAssets = Array.isArray(release.assets) ? release.assets : [];
  for (const asset of arrayAssets) {
    const value = asset as Record<string, unknown>;
    if (normalizePlatform(value.platform as string) === platform) {
      const artifact = normalizeArtifact(value);
      if (artifact?.url) {
        return artifact;
      }
    }
  }

  const artifact = normalizeArtifact(release.artifact);
  if (artifact?.url) {
    return artifact;
  }

  if (release.url) {
    return { url: release.url, checksum: release.checksum, sha256: release.sha256 };
  }

  return undefined;
}

function normalizeArtifact(value: unknown): IndexArtifact | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return { url: value };
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const url = (obj.url || obj.downloadUrl || obj.asset || obj.file) as string | undefined;
    if (!url) {
      return undefined;
    }
    return {
      url,
      checksum: obj.checksum as string | undefined,
      sha256: (obj.sha256 || obj.sha_256) as string | undefined
    };
  }
  return undefined;
}

async function downloadReleasePackage(release: ResolvedRelease): Promise<string> {
  const tempFile = path.join(os.tmpdir(), `picopak_${release.packageName}_${release.version}_${release.platform}_${Date.now()}.picopak`);
  await downloadToFile(release.downloadUrl, tempFile);

  if (release.checksum) {
    verifyChecksum(tempFile, release.checksum);
  }

  return tempFile;
}

function verifyChecksum(filePath: string, checksum: string): void {
  const normalized = checksum.trim().toLowerCase();
  const [algorithm, value] = normalized.includes(':') ? normalized.split(':', 2) : ['sha256', normalized];
  if (algorithm !== 'sha256') {
    throw new Error(`Unsupported checksum algorithm "${algorithm}". Only sha256 is supported.`);
  }

  const fileHash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
  if (fileHash !== value) {
    throw new Error('Checksum verification failed for downloaded package');
  }
}

function requestText(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, (res) => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;
      if (statusCode >= 300 && statusCode < 400 && location) {
        if (redirects > 5) {
          reject(new Error(`Too many redirects while fetching ${url}`));
          return;
        }
        const redirectUrl = new URL(location, url).toString();
        res.resume();
        resolve(requestText(redirectUrl, redirects + 1));
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        reject(new Error(`HTTP ${statusCode} while fetching ${url}`));
        res.resume();
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
  });
}

function downloadToFile(url: string, destination: string, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(destination);
    const req = client.get(url, (res) => {
      const statusCode = res.statusCode || 0;
      const location = res.headers.location;
      if (statusCode >= 300 && statusCode < 400 && location) {
        file.close();
        fs.rmSync(destination, { force: true });
        if (redirects > 5) {
          reject(new Error(`Too many redirects while downloading ${url}`));
          return;
        }
        const redirectUrl = new URL(location, url).toString();
        res.resume();
        downloadToFile(redirectUrl, destination, redirects + 1).then(resolve).catch(reject);
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        file.close();
        fs.rmSync(destination, { force: true });
        reject(new Error(`HTTP ${statusCode} while downloading ${url}`));
        res.resume();
        return;
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    req.on('error', (error) => {
      file.close();
      fs.rmSync(destination, { force: true });
      reject(error);
    });

    file.on('error', (error) => {
      file.close();
      fs.rmSync(destination, { force: true });
      reject(error);
    });
  });
}

function compareVersions(a: string, b: string): number {
  const parsedA = parseSemver(a);
  const parsedB = parseSemver(b);

  for (let i = 0; i < 3; i += 1) {
    if (parsedA.core[i] !== parsedB.core[i]) {
      return parsedA.core[i] - parsedB.core[i];
    }
  }

  if (parsedA.prerelease.length === 0 && parsedB.prerelease.length > 0) {
    return 1;
  }
  if (parsedA.prerelease.length > 0 && parsedB.prerelease.length === 0) {
    return -1;
  }

  const prereleaseLength = Math.max(parsedA.prerelease.length, parsedB.prerelease.length);
  for (let i = 0; i < prereleaseLength; i += 1) {
    const aPart = parsedA.prerelease[i];
    const bPart = parsedB.prerelease[i];
    if (aPart === undefined) {
      return -1;
    }
    if (bPart === undefined) {
      return 1;
    }

    const aNum = Number(aPart);
    const bNum = Number(bPart);
    const aIsNum = !Number.isNaN(aNum);
    const bIsNum = !Number.isNaN(bNum);

    if (aIsNum && bIsNum && aNum !== bNum) {
      return aNum - bNum;
    }
    if (aIsNum !== bIsNum) {
      return aIsNum ? -1 : 1;
    }
    if (aPart !== bPart) {
      return aPart.localeCompare(bPart);
    }
  }

  return 0;
}

function parseSemver(value: string): { core: number[]; prerelease: string[] } {
  const normalized = normalizeVersion(value);
  const [core, prerelease] = normalized.split('-', 2);
  const coreParts = core.split('.').map((part) => Number(part));
  while (coreParts.length < 3) {
    coreParts.push(0);
  }
  return {
    core: coreParts.slice(0, 3).map((part) => (Number.isNaN(part) ? 0 : part)),
    prerelease: prerelease ? prerelease.split('.') : []
  };
}

function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, '');
}

function isPrerelease(release: IndexRelease): boolean {
  if (release.prerelease !== undefined) {
    return !!release.prerelease;
  }
  return normalizeVersion(release.version).includes('-');
}

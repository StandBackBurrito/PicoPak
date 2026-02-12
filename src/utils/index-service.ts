import { getIndexUrls } from './resolver';

export interface RemotePackageEntry {
  name: string;
  version?: string;
  description?: string;
  package?: string;
  file?: string;
}

interface RemotePackageIndex {
  packages?: RemotePackageEntry[];
}

export { getIndexUrls };

function parseIndexPayload(payload: unknown): RemotePackageEntry[] {
  const raw = payload as Record<string, unknown>;
  const packageRoot = raw?.packages ?? raw;

  if (packageRoot && typeof packageRoot === 'object' && !Array.isArray(packageRoot)) {
    const entries: RemotePackageEntry[] = [];
    for (const [name, value] of Object.entries(packageRoot as Record<string, unknown>)) {
      const node = value as Record<string, unknown>;
      const releases = node.releases ?? node.versions ?? value;
      const latest = getLatestVersion(releases);
      entries.push({
        name: String(node.name || name),
        description: toOptionalString(node.description),
        version: latest
      });
    }
    return entries;
  }

  if (Array.isArray(payload)) {
    return payload as RemotePackageEntry[];
  }

  if (payload && typeof payload === 'object') {
    const indexPayload = payload as RemotePackageIndex;
    if (Array.isArray(indexPayload.packages)) {
      return indexPayload.packages;
    }
  }

  throw new Error('Invalid index payload format');
}

function getLatestVersion(releases: unknown): string | undefined {
  if (Array.isArray(releases) && releases.length > 0) {
    const last = releases[releases.length - 1] as Record<string, unknown>;
    return toOptionalString(last.version);
  }
  if (releases && typeof releases === 'object') {
    const keys = Object.keys(releases as Record<string, unknown>);
    return keys.length > 0 ? keys[keys.length - 1] : undefined;
  }
  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
}

async function fetchIndexPayload(url: string): Promise<RemotePackageEntry[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Index request failed (${response.status})`);
  }
  const payload: unknown = await response.json();
  return parseIndexPayload(payload);
}

export async function fetchRemoteIndex(indexUrl?: string): Promise<RemotePackageEntry[]> {
  const urls = getIndexUrls(indexUrl);
  let lastError = '';

  for (const url of urls) {
    try {
      return await fetchIndexPayload(url);
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  throw new Error(lastError || 'No index URL available');
}

export function searchIndex(entries: RemotePackageEntry[], query: string): RemotePackageEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter((entry) => {
    const haystack = [entry.name, entry.description, entry.package, entry.file].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

export async function queryRemoteIndex(query: string, indexUrl?: string): Promise<RemotePackageEntry[]> {
  const entries = await fetchRemoteIndex(indexUrl);
  return searchIndex(entries, query);
}

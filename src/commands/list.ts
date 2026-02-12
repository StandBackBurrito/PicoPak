import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

interface InstalledPackageMetadata {
  name?: string;
  version?: string;
}

function readInstalledMetadata(packagePath: string): InstalledPackageMetadata {
  const metadataPath = path.join(packagePath, 'picopak.json');
  if (!fs.existsSync(metadataPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf-8')) as InstalledPackageMetadata;
  } catch {
    return {};
  }
}

export async function listCommand(projectDir = process.cwd()): Promise<void> {
  const libsDir = path.join(projectDir, 'libs');
  if (!fs.existsSync(libsDir)) {
    console.log(chalk.yellow('No installed packages found (libs/ missing).'));
    return;
  }

  const entries = fs.readdirSync(libsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  if (entries.length === 0) {
    console.log(chalk.yellow('No installed packages found.'));
    return;
  }

  console.log(chalk.cyan(`Installed packages (${entries.length}):`));
  for (const entry of entries) {
    const packagePath = path.join(libsDir, entry.name);
    const metadata = readInstalledMetadata(packagePath);
    const packageName = metadata.name || entry.name;
    const version = metadata.version || 'unknown';
    console.log(chalk.white(`- ${packageName} ${chalk.gray(`v${version}`)}`));
  }
}

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

export async function removeCommand(packageName: string, projectDir = process.cwd()): Promise<void> {
  const libsDir = path.join(projectDir, 'libs');
  const targetPackageDir = path.join(libsDir, packageName);

  if (!fs.existsSync(targetPackageDir)) {
    console.log(chalk.red(`❌ Error: Package "${packageName}" is not installed in ${libsDir}`));
    process.exit(1);
  }

  fs.rmSync(targetPackageDir, { recursive: true, force: true });

  console.log(chalk.green(`✓ Removed package "${packageName}" from libs/`));
  console.log(chalk.yellow('Note: Manually remove related include(...) and target_link_libraries(...) entries from CMakeLists.txt.'));
}

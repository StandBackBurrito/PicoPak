#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from './commands/install';
import { packCommand } from './commands/pack';
import { listCommand } from './commands/list';
import { searchCommand } from './commands/search';
import { removeCommand } from './commands/remove';
import { submitCommand } from './commands/submit';
import {
  VERSION,
  playSplashAnimated,
  renderSplashStatic,
  renderVersionDetails,
  shouldAnimate
} from './utils/banner';

type GlobalOpts = {
  banner?: boolean;
};

const program = new Command();

async function showBannerForRun(opts: GlobalOpts): Promise<void> {
  if (shouldAnimate(opts)) {
    await playSplashAnimated(opts);
    return;
  }

  renderSplashStatic(opts);
}

program.name('picopak').description('Package Manager for Raspberry Pi Pico SDK').version(VERSION).option('--banner', 'Show animated splash');

program.hook('preAction', async (thisCommand, actionCommand) => {
  if (actionCommand.name() === 'banner') {
    return;
  }
  const opts = thisCommand.opts<GlobalOpts>();
  await showBannerForRun(opts);
});

program
  .command('install <package>')
  .description('Install a .picopak package or package name')
  .option('-p, --project-dir <path>', 'Target project directory', '.')
  .option('-l, --list', 'List package contents without installing')
  .option('--version <value>', 'Pin package version when installing by name')
  .option('--include-prerelease', 'Allow prerelease when resolving latest version')
  .option('--platform <platform>', 'Target platform override (rp2040|rp2350)')
  .option('--index-url <url>', 'Package index URL override')
  .action(async (
    packageFile: string,
    options: { projectDir?: string; list?: boolean; version?: string; includePrerelease?: boolean; platform?: string; indexUrl?: string }
  ) => {
    if (options.platform && !['rp2040', 'rp2350'].includes(options.platform)) {
      console.log(chalk.red('❌ Error: --platform must be one of: rp2040, rp2350'));
      process.exit(1);
    }

    await installCommand(packageFile, {
      projectDir: options.projectDir,
      list: options.list,
      version: options.version,
      includePrerelease: options.includePrerelease,
      platform: options.platform as 'rp2040' | 'rp2350' | undefined,
      indexUrl: options.indexUrl
    });
  });

program
  .command('pack <sourceDir>')
  .description('Build a .picopak archive from a package source directory')
  .option('-o, --output-dir <path>', 'Output directory for package and metadata')
  .action((sourceDir: string, options: { outputDir?: string }) => {
    packCommand(sourceDir, { outputDir: options.outputDir });
  });

program
  .command('submit <input>')
  .description('Prepare non-destructive index update material from pack metadata')
  .option('-o, --output-dir <path>', 'Output directory for submit helper bundle')
  .option('--index-file <path>', 'Optional local index.json path for immutable version validation + patch output')
  .option('--artifact-url <urlOrTemplate>', 'Artifact URL or template (supports {file})')
  .option('--dry-run', 'Validate and emit bundle without local index patch generation')
  .action((input: string, options: { outputDir?: string; indexFile?: string; artifactUrl?: string; dryRun?: boolean }) => {
    submitCommand(input, {
      outputDir: options.outputDir,
      indexFile: options.indexFile,
      artifactUrl: options.artifactUrl,
      dryRun: options.dryRun
    });
  });

program
  .command('version')
  .description('Show version information')
  .action(() => {
    console.log(chalk.cyan(`PicoPak v${VERSION}`));
    renderVersionDetails();
  });

program
  .command('list')
  .description('List installed packages in libs/')
  .option('-p, --project-dir <path>', 'Target project directory', '.')
  .action(async (options: { projectDir?: string }) => {
    await listCommand(options.projectDir);
  });

program
  .command('search <query>')
  .description('Search packages from remote index')
  .option('--index-url <url>', 'Package index URL override')
  .action(async (query: string, options: { indexUrl?: string }) => {
    await searchCommand(query, { indexUrl: options.indexUrl });
  });

program
  .command('remove <package>')
  .alias('uninstall')
  .description('Remove an installed package from libs/')
  .option('-p, --project-dir <path>', 'Target project directory', '.')
  .action(async (packageName: string, options: { projectDir?: string }) => {
    await removeCommand(packageName, options.projectDir);
  });

program
  .command('banner')
  .description('Show animated banner')
  .action(async () => {
    await playSplashAnimated({ banner: true });
  });

program.on('--help', () => {
  console.log(chalk.cyan('Examples:'));
  console.log(chalk.white('  picopak install FastLED-3.10.3-rp2040.picopak'));
  console.log(chalk.white('  picopak install FastLED-3.10.3-rp2040.picopak --project-dir C:\\path\\to\\project'));
  console.log(chalk.white('  picopak install FastLED-3.10.3-rp2040.picopak --list'));
  console.log(chalk.white('  picopak pack examples\\fastled_picopak_package'));
  console.log(chalk.white('  picopak pack examples\\fastled_picopak_package --output-dir .\\dist'));
  console.log(chalk.white('  picopak submit .\\dist\\MyLibrary-1.0.0.picopak.metadata.json --dry-run'));
  console.log(chalk.white('  picopak list'));
  console.log(chalk.white('  picopak search fastled'));
  console.log(chalk.white('  picopak remove FastLED'));
  console.log(chalk.white('  picopak --banner version'));
});

const hasBannerFlag = process.argv.includes('--banner');
const hasCommand = process.argv.length > 2 && !(process.argv.length === 3 && hasBannerFlag);

if (!hasCommand) {
  const globalOpts: GlobalOpts = { banner: hasBannerFlag };
  showBannerForRun(globalOpts).then(() => {
    console.log(chalk.cyan('Usage:'));
    console.log(chalk.white('  picopak <command> [options]'));
    console.log();
    console.log(chalk.cyan('Commands:'));
    console.log(chalk.white('  install <package>      Install a .picopak package'));
    console.log(chalk.white('  pack <sourceDir>       Build a .picopak package'));
    console.log(chalk.white('  submit <input>         Prepare index update helper bundle'));
    console.log(chalk.white('  list                   List installed packages'));
    console.log(chalk.white('  search <query>         Search remote package index'));
    console.log(chalk.white('  remove <package>       Remove installed package'));
    console.log(chalk.white('  version                Show version information'));
    console.log(chalk.white('  banner                 Show animated splash'));
    console.log(chalk.white('  help                   Show help message'));
    console.log();
    console.log(chalk.gray('Run "picopak help" for more information'));
  });
} else {
  program.parse(process.argv);
}

#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { installCommand } from './commands/install';
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
  .description('Install a .picopak package')
  .option('-p, --project-dir <path>', 'Target project directory', '.')
  .option('-l, --list', 'List package contents without installing')
  .action(async (packageFile: string, options: { projectDir?: string; list?: boolean }) => {
    await installCommand(packageFile, {
      projectDir: options.projectDir,
      list: options.list
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
    console.log(chalk.white('  version                Show version information'));
    console.log(chalk.white('  banner                 Show animated splash'));
    console.log(chalk.white('  help                   Show help message'));
    console.log();
    console.log(chalk.gray('Run "picopak help" for more information'));
  });
} else {
  program.parse(process.argv);
}

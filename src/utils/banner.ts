import chalk from 'chalk';

export const VERSION = '1.0.0';

type Stream = NodeJS.WriteStream;

export interface SplashOptions {
  banner?: boolean;
  stream?: Stream;
  columns?: number;
}

const FRAME_COUNT = 14;
const FRAME_DELAY_MS = 45;
const FINAL_HOLD_MS = 1300;
const PANEL_MAX_WIDTH = 70;
const COMPACT_BREAKPOINT = 60;
const SHEEN_WIDTH = 7;

const MASCOT = [
  ' ▄█▄ ',
  '█████',
  '▀███▀',
  ' ███ '
];

const WORDMARK = [
  '██████  ██   ██████   ██████  ███████  █████  ██   ██',
  '██   ██ ██  ██      ██    ██ ██   ██ ██   ██ ██  ██ ',
  '██████  ██  ██      ██    ██ ███████ ███████ █████  ',
  '██      ██  ██      ██    ██ ██      ██   ██ ██  ██ ',
  '██      ██   ██████   ██████  ██      ██   ██ ██   ██'
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envFlag(name: string): boolean {
  const value = process.env[name];
  return value === '1' || value === 'true' || value === 'TRUE';
}

function getStream(opts: SplashOptions): Stream {
  return opts.stream ?? process.stdout;
}

function getColumns(opts: SplashOptions): number {
  return opts.columns ?? getStream(opts).columns ?? 80;
}

function colorsEnabled(): boolean {
  return process.env.NO_COLOR === undefined;
}

function color(text: string, tone: 'panel' | 'label' | 'word' | 'icon' | 'highlight'): string {
  if (!colorsEnabled()) {
    return text;
  }
  if (tone === 'panel') {
    return chalk.gray(text);
  }
  if (tone === 'label') {
    return chalk.cyanBright(text);
  }
  if (tone === 'word') {
    return chalk.cyan(text);
  }
  if (tone === 'icon') {
    return chalk.magentaBright(text);
  }
  return chalk.whiteBright(text);
}

function stripAnsi(input: string): string {
  return input.replace(/\x1B\[[0-9;]*m/g, '');
}

function padRight(input: string, width: number): string {
  if (input.length >= width) {
    return input;
  }
  return input + ' '.repeat(width - input.length);
}

function lineMax(lines: string[]): number {
  return lines.reduce((max, line) => Math.max(max, line.length), 0);
}

function makePanel(columns: number): string[] {
  const maxInner = Math.max(26, Math.min(PANEL_MAX_WIDTH - 2, columns - 2));
  const content = [
    `PicoPak v${VERSION}`,
    'Package Manager for Raspberry Pi Pico SDK',
    '',
    'Run picopak help for commands',
    'Use --banner to show animation',
    'Use PICO_PAK_REDUCED_MOTION=1 to disable animation'
  ];

  const innerWidth = Math.min(maxInner, lineMax(content));
  const top = `╭${'─'.repeat(innerWidth + 2)}╮`;
  const bottom = `╰${'─'.repeat(innerWidth + 2)}╯`;
  const body = content.map((line) => `│ ${padRight(line, innerWidth)} │`);
  return [top, ...body, bottom];
}

function makeCompact(columns: number): string[] {
  const width = Math.max(30, Math.min(columns - 2, 56));
  const title = padRight(`PicoPak v${VERSION}`, width);
  const hint = padRight('picopak help | --banner | reduced motion', width);
  return [`┌${'─'.repeat(width)}┐`, `│${title}│`, `│${hint}│`, `└${'─'.repeat(width)}┘`];
}

type SplashModel = {
  lines: string[];
  artStart: number;
};

function buildSplashModel(columns: number): SplashModel {
  if (columns < COMPACT_BREAKPOINT) {
    return {
      lines: makeCompact(columns),
      artStart: 4
    };
  }

  const panel = makePanel(columns);
  const artLines: string[] = [];
  for (let i = 0; i < WORDMARK.length; i += 1) {
    const mascot = i < MASCOT.length ? MASCOT[i] : '     ';
    artLines.push(`${mascot}  ${WORDMARK[i]}`);
  }

  return {
    lines: [...panel, '', ...artLines],
    artStart: panel.length + 1
  };
}

function writeLines(stream: Stream, lines: string[]): void {
  for (let i = 0; i < lines.length; i += 1) {
    stream.write('\x1b[0G\x1b[2K');
    stream.write(lines[i]);
    if (i < lines.length - 1) {
      stream.write('\n');
    }
  }
}

function clearLines(stream: Stream, lineCount: number): void {
  for (let i = 0; i < lineCount; i += 1) {
    stream.write('\x1b[0G\x1b[2K');
    if (i < lineCount - 1) {
      stream.write('\n');
    }
  }
}

function renderStaticLines(model: SplashModel): string[] {
  return model.lines.map((line, index) => {
    if (index < model.artStart) {
      if (line.includes('PicoPak v')) {
        return color(line, 'label');
      }
      return color(line, 'panel');
    }

    return line
      .split('')
      .map((ch, x) => {
        if (ch === ' ') {
          return ch;
        }
        return x < 7 ? color(ch, 'icon') : color(ch, 'word');
      })
      .join('');
  });
}

function renderAnimatedLines(model: SplashModel, frame: number): string[] {
  const columns = lineMax(model.lines);
  const bandStart = Math.floor((frame / (FRAME_COUNT - 1)) * (columns + SHEEN_WIDTH)) - SHEEN_WIDTH;
  const bandEnd = bandStart + SHEEN_WIDTH;

  return model.lines.map((line, rowIndex) => {
    if (rowIndex < model.artStart) {
      if (line.includes('PicoPak v')) {
        return color(line, 'label');
      }
      return color(line, 'panel');
    }

    return line
      .split('')
      .map((ch, x) => {
        if (ch === ' ') {
          return ch;
        }
        if (x >= bandStart && x <= bandEnd) {
          return color(ch, 'highlight');
        }
        return x < 7 ? color(ch, 'icon') : color(ch, 'word');
      })
      .join('');
  });
}

function debugNoClear(): boolean {
  return envFlag('PICO_PAK_DEBUG_BANNER');
}

export function supportsAnimation(opts: SplashOptions = {}): boolean {
  const stream = getStream(opts);
  return stream.isTTY === true;
}

export function shouldAnimate(opts: SplashOptions = {}): boolean {
  if (opts.banner !== true) {
    return false;
  }
  if (!supportsAnimation(opts)) {
    return false;
  }
  if (process.env.CI === 'true') {
    return false;
  }
  if (process.env.NO_COLOR !== undefined) {
    return false;
  }
  if (process.env.TERM === 'dumb') {
    return false;
  }
  if (envFlag('PICO_PAK_REDUCED_MOTION')) {
    return false;
  }
  return true;
}

export function renderSplashStatic(opts: SplashOptions = {}): number {
  const stream = getStream(opts);
  const model = buildSplashModel(getColumns(opts));
  const lines = renderStaticLines(model);
  stream.write(`${lines.join('\n')}\n`);
  return lines.length;
}

export async function playSplashAnimated(opts: SplashOptions = {}): Promise<number> {
  if (!shouldAnimate(opts)) {
    return renderSplashStatic(opts);
  }

  const stream = getStream(opts);
  const model = buildSplashModel(getColumns(opts));
  const lineCount = model.lines.length;
  const keepVisible = debugNoClear();

  stream.write('\x1b[?25l');
  stream.write('\x1b[s');

  try {
    writeLines(stream, Array.from({ length: lineCount }, () => ''));

    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const frameLines = renderAnimatedLines(model, frame);
      stream.write(`\x1b[${lineCount - 1}A\x1b[0G`);
      writeLines(stream, frameLines);
      await sleep(FRAME_DELAY_MS);
    }

    await sleep(FINAL_HOLD_MS);

    if (keepVisible) {
      const finalLines = renderAnimatedLines(model, FRAME_COUNT - 1).map((line) => stripAnsi(line));
      stream.write(`\x1b[${lineCount - 1}A\x1b[0G`);
      writeLines(stream, finalLines);
      stream.write('\n');
      return lineCount;
    }

    stream.write(`\x1b[${lineCount - 1}A\x1b[0G`);
    clearLines(stream, lineCount);
    stream.write('\x1b[u');
    return 0;
  } finally {
    stream.write('\x1b[?25h');
  }
}

export function renderVersionDetails(): void {
  console.log(color('Package Format: .picopak v1.0', 'label'));
  console.log(color('Supported Platforms: RP2040, RP2350', 'panel'));
  console.log(color('Repository: https://github.com/StandBackBurrito/PicoPak', 'panel'));
}

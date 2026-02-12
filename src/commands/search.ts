import chalk from 'chalk';
import { getIndexUrls, queryRemoteIndex } from '../utils/index-service';

interface SearchOptions {
  indexUrl?: string;
}

export async function searchCommand(query: string, options: SearchOptions = {}): Promise<void> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    console.log(chalk.red('❌ Error: search query cannot be empty'));
    return;
  }

  try {
    const matches = await queryRemoteIndex(trimmedQuery, options.indexUrl);

    if (matches.length === 0) {
      console.log(chalk.yellow(`No packages found for "${trimmedQuery}".`));
      return;
    }

    console.log(chalk.cyan(`Search results (${matches.length}):`));
    for (const match of matches.slice(0, 20)) {
      const version = match.version ? ` v${match.version}` : '';
      const description = match.description ? ` - ${match.description}` : '';
      console.log(chalk.white(`- ${match.name}${chalk.gray(version)}${chalk.gray(description)}`));
    }

    if (matches.length > 20) {
      console.log(chalk.gray(`...and ${matches.length - 20} more`));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const [endpoint] = getIndexUrls(options.indexUrl);
    console.log(chalk.red(`❌ Failed to query ${endpoint}: ${message}`));
  }
}

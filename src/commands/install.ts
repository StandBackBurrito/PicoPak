import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import extract from 'extract-zip';

interface InstallOptions {
  projectDir?: string;
  list?: boolean;
}

interface PackageMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  platforms: string[];
}

export async function installCommand(packageFile: string, options: InstallOptions): Promise<void> {
  // Validate package file
  if (!fs.existsSync(packageFile)) {
    console.log(chalk.red('❌ Error: Package file not found:'), packageFile);
    console.log();
    console.log(chalk.yellow('Usage: picopak install <package.picopak> [options]'));
    console.log(chalk.gray('Example: picopak install FastLED-3.10.3-rp2040.picopak'));
    process.exit(1);
  }
  
  if (!packageFile.endsWith('.picopak')) {
    console.log(chalk.red('❌ Error: Invalid package file (must be .picopak)'));
    process.exit(1);
  }
  
  const tempDir = path.join(process.env.TEMP || '/tmp', `picopak_${Date.now()}`);
  
  try {
    // Extract package
    const spinner = ora('Extracting package...').start();
    await extract(packageFile, { dir: tempDir });
    spinner.succeed('Package extracted');
    
    // Load metadata
    const metadataFile = path.join(tempDir, 'picopak.json');
    if (!fs.existsSync(metadataFile)) {
      console.log(chalk.red('❌ Error: Invalid package - picopak.json not found'));
      process.exit(1);
    }
    
    const metadata: PackageMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
    
    console.log();
    console.log(chalk.cyan('Package Information:'));
    console.log(chalk.cyan('==================='));
    console.log(chalk.white(`Name:        ${metadata.name}`));
    console.log(chalk.white(`Version:     ${metadata.version}`));
    console.log(chalk.white(`Description: ${metadata.description}`));
    console.log(chalk.white(`License:     ${metadata.license}`));
    console.log(chalk.white(`Platforms:   ${metadata.platforms.join(', ')}`));
    console.log();
    
    // List mode
    if (options.list) {
      console.log(chalk.cyan('Package Contents:'));
      const files = getAllFiles(tempDir);
      files.forEach(file => {
        const relativePath = path.relative(tempDir, file);
        console.log(chalk.gray(`  ${relativePath}`));
      });
      return;
    }
    
    // Install mode
    const projectDir = options.projectDir || process.cwd();
    
    if (!fs.existsSync(projectDir)) {
      console.log(chalk.red(`❌ Error: Project directory does not exist: ${projectDir}`));
      process.exit(1);
    }
    
    // Check for CMakeLists.txt
    const cmakeListsPath = path.join(projectDir, 'CMakeLists.txt');
    if (!fs.existsSync(cmakeListsPath)) {
      console.log(chalk.yellow('⚠ Warning: CMakeLists.txt not found in project directory'));
      console.log(chalk.gray('Continuing installation anyway...'));
      console.log();
    }
    
    // Create libs directory
    const libsDir = path.join(projectDir, 'libs');
    if (!fs.existsSync(libsDir)) {
      fs.mkdirSync(libsDir, { recursive: true });
      console.log(chalk.yellow('Created libs directory'));
    }
    
    // Target directory
    const targetLibDir = path.join(libsDir, metadata.name);
    
    // Check if already installed
    if (fs.existsSync(targetLibDir)) {
      console.log(chalk.yellow(`\n${metadata.name} is already installed`));
      // In a real implementation, you'd prompt here
      // For now, we'll just overwrite
      fs.rmSync(targetLibDir, { recursive: true, force: true });
      console.log(chalk.yellow('Removed existing installation\n'));
    }
    
    // Copy to project
    console.log(chalk.cyan(`Installing ${metadata.name} to: ${targetLibDir}`));
    copyDirectory(tempDir, targetLibDir);
    
    // Verify installation
    const installedCMake = path.join(targetLibDir, 'cmake', `${metadata.name}.cmake`);
    if (fs.existsSync(installedCMake)) {
      console.log();
      console.log(chalk.green('✓ Installation successful!'));
      
      // Show integration instructions
      console.log();
      console.log(chalk.cyan('='.repeat(70)));
      console.log(chalk.cyan('Integration Instructions'));
      console.log(chalk.cyan('='.repeat(70)));
      console.log();
      console.log(chalk.white('Add to your CMakeLists.txt (after pico_sdk_init()):'));
      console.log();
      console.log(chalk.green(`    include(\${CMAKE_SOURCE_DIR}/libs/${metadata.name}/cmake/${metadata.name}.cmake)`));
      console.log();
      console.log(chalk.green(`    target_link_libraries(your_project_name`));
      console.log(chalk.green(`        ${metadata.name}`));
      console.log(chalk.green(`        # ... other libraries`));
      console.log(chalk.green(`    )`));
      console.log();
      console.log(chalk.white('In your C++ code:'));
      console.log();
      console.log(chalk.green(`    #include <${metadata.name}.h>`));
      console.log();
      console.log(chalk.cyan('='.repeat(70)));
      console.log(chalk.gray(`Documentation: ${metadata.description}`));
      console.log(chalk.gray(`Installed version: ${metadata.version}`));
      console.log();
      console.log(chalk.green('✓ Ready to build!'));
    } else {
      console.log(chalk.red('❌ Installation verification failed'));
      process.exit(1);
    }
    
  } finally {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

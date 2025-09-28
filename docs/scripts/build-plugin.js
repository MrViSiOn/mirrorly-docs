#!/usr/bin/env node

/**
 * WordPress Plugin Build and Package Script
 * Creates a distributable .zip file for WordPress.org submission
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

// Configuration
const config = {
  pluginDir: 'wordpress-plugin/mirrorly',
  buildDir: 'wordpress-plugin/build',
  distDir: 'dist',
  pluginName: 'mirrorly',
  excludePatterns: [
    'node_modules/**',
    'src/**',
    'tests/**',
    'webpack.config.js',
    'package.json',
    'package-lock.json',
    '.git/**',
    '.gitignore',
    '.DS_Store',
    'Thumbs.db',
    '*.log',
    '*.tmp',
    '.env*',
    'phpunit.xml',
    'composer.json',
    'composer.lock',
    'vendor/bin/**',
    'vendor/*/tests/**',
    'vendor/*/test/**',
    'vendor/*/*/tests/**',
    'vendor/*/*/test/**'
  ]
};

class PluginBuilder {
  constructor() {
    this.version = this.getVersionFromPlugin();
    this.buildTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  /**
   * Extract version from main plugin file
   */
  getVersionFromPlugin() {
    try {
      const pluginFile = path.join(config.pluginDir, 'mirrorly.php');
      const content = fs.readFileSync(pluginFile, 'utf8');
      const versionMatch = content.match(/Version:\s*([^\n\r]*)/);
      return versionMatch ? versionMatch[1].trim() : '1.0.0';
    } catch (error) {
      console.warn('Could not extract version from plugin file, using 1.0.0');
      return '1.0.0';
    }
  }

  /**
   * Log with timestamp
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };

    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  /**
   * Create necessary directories
   */
  createDirectories() {
    this.log('Creating build directories...');

    const dirs = [
      config.buildDir,
      config.distDir,
      path.join(config.buildDir, config.pluginName)
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Clean previous builds
   */
  cleanBuild() {
    this.log('Cleaning previous builds...');

    const buildPath = path.join(config.buildDir, config.pluginName);
    if (fs.existsSync(buildPath)) {
      fs.rmSync(buildPath, { recursive: true, force: true });
      this.log('Previous build cleaned');
    }
  }

  /**
   * Copy plugin files to build directory
   */
  copyPluginFiles() {
    this.log('Copying plugin files...');

    const sourcePath = config.pluginDir;
    const targetPath = path.join(config.buildDir, config.pluginName);

    this.copyDirectory(sourcePath, targetPath);
    this.log('Plugin files copied successfully');
  }

  /**
   * Recursively copy directory with exclusions
   */
  copyDirectory(source, target) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const items = fs.readdirSync(source);

    items.forEach(item => {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const relativePath = path.relative(config.pluginDir, sourcePath);

      // Check if item should be excluded
      if (this.shouldExclude(relativePath)) {
        return;
      }

      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath);
      } else {
        fs.copyFileSync(sourcePath, targetPath);
      }
    });
  }

  /**
   * Check if file/directory should be excluded
   */
  shouldExclude(relativePath) {
    return config.excludePatterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(relativePath) || regex.test(relativePath + '/');
    });
  }

  /**
   * Build assets (CSS/JS)
   */
  buildAssets() {
    this.log('Building assets...');

    try {
      // Check if webpack config exists
      const webpackConfig = path.join(config.pluginDir, 'webpack.config.js');
      if (fs.existsSync(webpackConfig)) {
        this.log('Running webpack build...');
        execSync('npm run build', {
          cwd: config.pluginDir,
          stdio: 'inherit'
        });
      }

      // Minify CSS files
      this.minifyAssets();

      this.log('Assets built successfully', 'success');
    } catch (error) {
      this.log(`Asset build failed: ${error.message}`, 'warning');
      // Continue without failing the entire build
    }
  }

  /**
   * Minify CSS and JS assets
   */
  minifyAssets() {
    const assetsPath = path.join(config.buildDir, config.pluginName, 'assets');

    if (!fs.existsSync(assetsPath)) {
      return;
    }

    // Minify CSS files
    this.minifyFiles(path.join(assetsPath, 'css'), '.css');

    // Minify JS files
    this.minifyFiles(path.join(assetsPath, 'js'), '.js');
  }

  /**
   * Minify files in directory
   */
  minifyFiles(directory, extension) {
    if (!fs.existsSync(directory)) {
      return;
    }

    const files = fs.readdirSync(directory);

    files.forEach(file => {
      if (path.extname(file) === extension && !file.includes('.min.')) {
        const filePath = path.join(directory, file);
        const content = fs.readFileSync(filePath, 'utf8');

        let minified;
        if (extension === '.css') {
          minified = this.minifyCSS(content);
        } else if (extension === '.js') {
          minified = this.minifyJS(content);
        }

        if (minified) {
          fs.writeFileSync(filePath, minified);
          this.log(`Minified: ${file}`);
        }
      }
    });
  }

  /**
   * Simple CSS minification
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove last semicolon in blocks
      .replace(/\s*{\s*/g, '{') // Clean braces
      .replace(/}\s*/g, '}')
      .replace(/;\s*/g, ';')
      .replace(/,\s*/g, ',')
      .replace(/:\s*/g, ':')
      .trim();
  }

  /**
   * Simple JS minification (basic)
   */
  minifyJS(js) {
    return js
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Clean up
      .trim();
  }

  /**
   * Update version numbers in files
   */
  updateVersions() {
    this.log(`Updating version to ${this.version}...`);

    const buildPath = path.join(config.buildDir, config.pluginName);

    // Update main plugin file
    this.updateVersionInFile(
      path.join(buildPath, 'mirrorly.php'),
      /Version:\s*([^\n\r]*)/,
      `Version: ${this.version}`
    );

    // Update readme.txt if exists
    const readmePath = path.join(buildPath, 'readme.txt');
    if (fs.existsSync(readmePath)) {
      this.updateVersionInFile(
        readmePath,
        /Stable tag:\s*([^\n\r]*)/,
        `Stable tag: ${this.version}`
      );
    }

    this.log('Version numbers updated', 'success');
  }

  /**
   * Update version in specific file
   */
  updateVersionInFile(filePath, pattern, replacement) {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(pattern, replacement);
    fs.writeFileSync(filePath, updatedContent);
  }

  /**
   * Validate plugin structure
   */
  validatePlugin() {
    this.log('Validating plugin structure...');

    const buildPath = path.join(config.buildDir, config.pluginName);
    const requiredFiles = [
      'mirrorly.php',
      'readme.txt'
    ];

    const requiredDirs = [
      'includes',
      'assets'
    ];

    let isValid = true;

    // Check required files
    requiredFiles.forEach(file => {
      const filePath = path.join(buildPath, file);
      if (!fs.existsSync(filePath)) {
        this.log(`Missing required file: ${file}`, 'error');
        isValid = false;
      }
    });

    // Check required directories
    requiredDirs.forEach(dir => {
      const dirPath = path.join(buildPath, dir);
      if (!fs.existsSync(dirPath)) {
        this.log(`Missing required directory: ${dir}`, 'warning');
      }
    });

    if (isValid) {
      this.log('Plugin structure validation passed', 'success');
    } else {
      throw new Error('Plugin structure validation failed');
    }
  }

  /**
   * Create ZIP archive
   */
  async createZip() {
    this.log('Creating ZIP archive...');

    const zipName = `${config.pluginName}-${this.version}.zip`;
    const zipPath = path.join(config.distDir, zipName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        this.log(`ZIP created: ${zipName} (${sizeInMB} MB)`, 'success');
        resolve(zipPath);
      });

      archive.on('error', (err) => {
        this.log(`ZIP creation failed: ${err.message}`, 'error');
        reject(err);
      });

      archive.pipe(output);

      // Add plugin directory to ZIP
      const buildPath = path.join(config.buildDir, config.pluginName);
      archive.directory(buildPath, config.pluginName);

      archive.finalize();
    });
  }

  /**
   * Generate checksums
   */
  generateChecksums(zipPath) {
    this.log('Generating checksums...');

    const crypto = require('crypto');
    const content = fs.readFileSync(zipPath);

    const checksums = {
      md5: crypto.createHash('md5').update(content).digest('hex'),
      sha1: crypto.createHash('sha1').update(content).digest('hex'),
      sha256: crypto.createHash('sha256').update(content).digest('hex')
    };

    const checksumFile = zipPath.replace('.zip', '.checksums.txt');
    const checksumContent = Object.entries(checksums)
      .map(([algo, hash]) => `${algo.toUpperCase()}: ${hash}`)
      .join('\n');

    fs.writeFileSync(checksumFile, checksumContent);
    this.log(`Checksums saved to: ${path.basename(checksumFile)}`, 'success');

    return checksums;
  }

  /**
   * Create build info file
   */
  createBuildInfo(zipPath, checksums) {
    const buildInfo = {
      version: this.version,
      buildDate: new Date().toISOString(),
      buildTimestamp: this.buildTimestamp,
      zipFile: path.basename(zipPath),
      checksums: checksums,
      nodeVersion: process.version,
      platform: process.platform
    };

    const buildInfoPath = path.join(config.distDir, `${config.pluginName}-${this.version}.build-info.json`);
    fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

    this.log(`Build info saved to: ${path.basename(buildInfoPath)}`, 'success');
  }

  /**
   * Main build process
   */
  async build() {
    try {
      this.log('Starting WordPress plugin build process...', 'info');
      this.log(`Plugin: ${config.pluginName}`, 'info');
      this.log(`Version: ${this.version}`, 'info');

      this.createDirectories();
      this.cleanBuild();
      this.copyPluginFiles();
      this.buildAssets();
      this.updateVersions();
      this.validatePlugin();

      const zipPath = await this.createZip();
      const checksums = this.generateChecksums(zipPath);
      this.createBuildInfo(zipPath, checksums);

      this.log('Build process completed successfully!', 'success');
      this.log(`Distribution file: ${path.basename(zipPath)}`, 'success');

      return {
        success: true,
        version: this.version,
        zipPath: zipPath,
        checksums: checksums
      };

    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI execution
if (require.main === module) {
  const builder = new PluginBuilder();

  builder.build()
    .then((result) => {
      console.log('\n✅ Build completed successfully!');
      console.log(`📦 Package: ${path.basename(result.zipPath)}`);
      console.log(`🏷️  Version: ${result.version}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Build failed:', error.message);
      process.exit(1);
    });
}

module.exports = PluginBuilder;
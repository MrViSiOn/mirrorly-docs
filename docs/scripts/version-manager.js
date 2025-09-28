#!/usr/bin/env node

/**
 * Coordinated Version Management System
 * Manages version synchronization between API and WordPress plugin
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionManager {
  constructor() {
    this.rootDir = process.cwd();
    this.apiDir = path.join(this.rootDir, 'api');
    this.pluginDir = path.join(this.rootDir, 'wordpress-plugin', 'mirrorly');

    this.currentVersions = this.getCurrentVersions();
  }

  /**
   * Log with colors
   */
  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };

    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  /**
   * Get current versions from all components
   */
  getCurrentVersions() {
    const versions = {};

    // Get API version from package.json
    try {
      const apiPackage = JSON.parse(fs.readFileSync(path.join(this.apiDir, 'package.json'), 'utf8'));
      versions.api = apiPackage.version;
    } catch (error) {
      this.log('Warning: Could not read API version', 'warning');
      versions.api = '0.0.0';
    }

    // Get plugin version from main PHP file
    try {
      const pluginFile = fs.readFileSync(path.join(this.pluginDir, 'mirrorly.php'), 'utf8');
      const versionMatch = pluginFile.match(/Version:\s*([^\n\r]*)/);
      versions.plugin = versionMatch ? versionMatch[1].trim() : '0.0.0';
    } catch (error) {
      this.log('Warning: Could not read plugin version', 'warning');
      versions.plugin = '0.0.0';
    }

    // Get root package version
    try {
      const rootPackage = JSON.parse(fs.readFileSync(path.join(this.rootDir, 'package.json'), 'utf8'));
      versions.root = rootPackage.version;
    } catch (error) {
      this.log('Warning: Could not read root version', 'warning');
      versions.root = '0.0.0';
    }

    return versions;
  }

  /**
   * Parse semantic version
   */
  parseVersion(version) {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
    if (!match) {
      throw new Error(`Invalid version format: ${version}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
      prerelease: match[4] || null,
      original: version
    };
  }

  /**
   * Increment version based on type
   */
  incrementVersion(version, type) {
    const parsed = this.parseVersion(version);

    switch (type) {
      case 'major':
        parsed.major++;
        parsed.minor = 0;
        parsed.patch = 0;
        break;
      case 'minor':
        parsed.minor++;
        parsed.patch = 0;
        break;
      case 'patch':
        parsed.patch++;
        break;
      default:
        throw new Error(`Invalid increment type: ${type}`);
    }

    parsed.prerelease = null; // Remove prerelease on increment
    return `${parsed.major}.${parsed.minor}.${parsed.patch}`;
  }

  /**
   * Update API version
   */
  updateApiVersion(newVersion) {
    const packagePath = path.join(this.apiDir, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    packageData.version = newVersion;

    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
    this.log(`✓ Updated API version to ${newVersion}`, 'success');
  }

  /**
   * Update plugin version
   */
  updatePluginVersion(newVersion) {
    // Update main plugin file
    const pluginPath = path.join(this.pluginDir, 'mirrorly.php');
    let content = fs.readFileSync(pluginPath, 'utf8');

    // Update Version header
    content = content.replace(
      /Version:\s*([^\n\r]*)/,
      `Version: ${newVersion}`
    );

    // Update version constant if exists
    content = content.replace(
      /define\s*\(\s*['"]MIRRORLY_VERSION['"],\s*['"]([^'"]*)['"]\s*\)/,
      `define('MIRRORLY_VERSION', '${newVersion}')`
    );

    fs.writeFileSync(pluginPath, content);

    // Update readme.txt if exists
    const readmePath = path.join(this.pluginDir, 'readme.txt');
    if (fs.existsSync(readmePath)) {
      let readmeContent = fs.readFileSync(readmePath, 'utf8');
      readmeContent = readmeContent.replace(
        /Stable tag:\s*([^\n\r]*)/,
        `Stable tag: ${newVersion}`
      );
      fs.writeFileSync(readmePath, readmeContent);
    }

    this.log(`✓ Updated plugin version to ${newVersion}`, 'success');
  }

  /**
   * Update root package version
   */
  updateRootVersion(newVersion) {
    const packagePath = path.join(this.rootDir, 'package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    packageData.version = newVersion;

    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
    this.log(`✓ Updated root version to ${newVersion}`, 'success');
  }

  /**
   * Create version compatibility matrix
   */
  createCompatibilityMatrix(version) {
    const matrix = {
      version: version,
      compatibility: {
        api: {
          minVersion: version,
          maxVersion: version
        },
        plugin: {
          minVersion: version,
          maxVersion: version
        }
      },
      releaseDate: new Date().toISOString(),
      changelog: {
        added: [],
        changed: [],
        deprecated: [],
        removed: [],
        fixed: [],
        security: []
      }
    };

    const matrixPath = path.join(this.rootDir, 'docs', 'compatibility-matrix.json');

    // Ensure docs directory exists
    const docsDir = path.dirname(matrixPath);
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    // Read existing matrix or create new
    let existingMatrix = { versions: [] };
    if (fs.existsSync(matrixPath)) {
      existingMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
    }

    // Add new version
    existingMatrix.versions = existingMatrix.versions || [];
    existingMatrix.versions.unshift(matrix); // Add to beginning

    // Keep only last 10 versions
    existingMatrix.versions = existingMatrix.versions.slice(0, 10);

    fs.writeFileSync(matrixPath, JSON.stringify(existingMatrix, null, 2));
    this.log(`✓ Updated compatibility matrix`, 'success');
  }

  /**
   * Update changelog
   */
  updateChangelog(version, changes) {
    const changelogPath = path.join(this.rootDir, 'CHANGELOG.md');
    const date = new Date().toISOString().split('T')[0];

    let changelog = '';
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf8');
    } else {
      changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
    }

    const newEntry = `## [${version}] - ${date}\n\n`;

    // Insert new entry after the header
    const lines = changelog.split('\n');
    const headerEndIndex = lines.findIndex(line => line.startsWith('## '));

    if (headerEndIndex === -1) {
      changelog += newEntry;
    } else {
      lines.splice(headerEndIndex, 0, newEntry);
      changelog = lines.join('\n');
    }

    fs.writeFileSync(changelogPath, changelog);
    this.log(`✓ Updated changelog for version ${version}`, 'success');
  }

  /**
   * Create git tag
   */
  createGitTag(version, message) {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });

      // Create annotated tag
      execSync(`git tag -a v${version} -m "${message}"`, { stdio: 'inherit' });
      this.log(`✓ Created git tag v${version}`, 'success');

      return true;
    } catch (error) {
      this.log('Warning: Could not create git tag (not in git repo or git not available)', 'warning');
      return false;
    }
  }

  /**
   * Validate version consistency
   */
  validateVersions() {
    const versions = this.getCurrentVersions();
    const uniqueVersions = new Set(Object.values(versions));

    if (uniqueVersions.size > 1) {
      this.log('Warning: Version mismatch detected!', 'warning');
      Object.entries(versions).forEach(([component, version]) => {
        this.log(`  ${component}: ${version}`, 'info');
      });
      return false;
    }

    this.log('✓ All versions are synchronized', 'success');
    return true;
  }

  /**
   * Bump version across all components
   */
  bump(type, options = {}) {
    this.log(`Bumping ${type} version...`, 'info');

    // Get current version (use API version as reference)
    const currentVersion = this.currentVersions.api;
    const newVersion = this.incrementVersion(currentVersion, type);

    this.log(`Version: ${currentVersion} → ${newVersion}`, 'info');

    // Update all components
    this.updateApiVersion(newVersion);
    this.updatePluginVersion(newVersion);
    this.updateRootVersion(newVersion);

    // Update compatibility matrix
    this.createCompatibilityMatrix(newVersion);

    // Update changelog if requested
    if (options.changelog !== false) {
      this.updateChangelog(newVersion, options.changes || {});
    }

    // Create git tag if requested
    if (options.tag !== false) {
      const tagMessage = options.tagMessage || `Release version ${newVersion}`;
      this.createGitTag(newVersion, tagMessage);
    }

    this.log(`✅ Successfully bumped to version ${newVersion}`, 'success');
    return newVersion;
  }

  /**
   * Set specific version
   */
  setVersion(version, options = {}) {
    // Validate version format
    this.parseVersion(version);

    this.log(`Setting version to ${version}...`, 'info');

    // Update all components
    this.updateApiVersion(version);
    this.updatePluginVersion(version);
    this.updateRootVersion(version);

    // Update compatibility matrix
    this.createCompatibilityMatrix(version);

    // Update changelog if requested
    if (options.changelog !== false) {
      this.updateChangelog(version, options.changes || {});
    }

    // Create git tag if requested
    if (options.tag !== false) {
      const tagMessage = options.tagMessage || `Release version ${version}`;
      this.createGitTag(version, tagMessage);
    }

    this.log(`✅ Successfully set version to ${version}`, 'success');
    return version;
  }

  /**
   * Show current status
   */
  status() {
    this.log('Current version status:', 'info');

    Object.entries(this.currentVersions).forEach(([component, version]) => {
      this.log(`  ${component.padEnd(8)}: ${version}`, 'info');
    });

    const isConsistent = this.validateVersions();

    if (!isConsistent) {
      this.log('\nTo synchronize versions, run:', 'info');
      this.log('  npm run version:sync', 'info');
    }

    return this.currentVersions;
  }

  /**
   * Synchronize all versions to the highest one
   */
  sync() {
    const versions = Object.values(this.currentVersions);
    const highestVersion = versions.reduce((highest, current) => {
      const h = this.parseVersion(highest);
      const c = this.parseVersion(current);

      if (c.major > h.major) return current;
      if (c.major === h.major && c.minor > h.minor) return current;
      if (c.major === h.major && c.minor === h.minor && c.patch > h.patch) return current;

      return highest;
    });

    this.log(`Synchronizing all versions to ${highestVersion}...`, 'info');

    this.updateApiVersion(highestVersion);
    this.updatePluginVersion(highestVersion);
    this.updateRootVersion(highestVersion);

    this.log(`✅ All versions synchronized to ${highestVersion}`, 'success');
    return highestVersion;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const versionManager = new VersionManager();

  try {
    switch (command) {
      case 'bump':
        const type = args[1] || 'patch';
        const options = {
          tag: !args.includes('--no-tag'),
          changelog: !args.includes('--no-changelog')
        };
        versionManager.bump(type, options);
        break;

      case 'set':
        const version = args[1];
        if (!version) {
          console.error('Error: Version required for set command');
          process.exit(1);
        }
        const setOptions = {
          tag: !args.includes('--no-tag'),
          changelog: !args.includes('--no-changelog')
        };
        versionManager.setVersion(version, setOptions);
        break;

      case 'status':
        versionManager.status();
        break;

      case 'sync':
        versionManager.sync();
        break;

      case 'validate':
        const isValid = versionManager.validateVersions();
        process.exit(isValid ? 0 : 1);
        break;

      default:
        console.log('Usage: version-manager.js <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  bump [major|minor|patch]  Increment version (default: patch)');
        console.log('  set <version>             Set specific version');
        console.log('  status                    Show current version status');
        console.log('  sync                      Synchronize all versions');
        console.log('  validate                  Check version consistency');
        console.log('');
        console.log('Options:');
        console.log('  --no-tag                  Skip git tag creation');
        console.log('  --no-changelog            Skip changelog update');
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = VersionManager;
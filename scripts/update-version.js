#!/usr/bin/env node

/**
 * Update version across all services
 * Usage: node scripts/update-version.js [major|minor|patch|<version>]
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '../VERSION');
const SERVICES = [
  { name: 'frontend', path: 'frontend/package.json' },
  { name: 'backend', path: 'backend/package.json' },
  { name: 'ai-estimation-service', path: 'ai-estimation-service/package.json' },
];

function readVersion() {
  try {
    return fs.readFileSync(VERSION_FILE, 'utf-8').trim();
  } catch (error) {
    console.error('❌ VERSION file not found');
    process.exit(1);
  }
}

function writeVersion(version) {
  fs.writeFileSync(VERSION_FILE, version + '\n');
  console.log(`✅ Updated VERSION file to ${version}`);
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error('Invalid version format. Use MAJOR.MINOR.PATCH (e.g., 1.2.3)');
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function incrementVersion(currentVersion, type) {
  const parsed = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      return `${parsed.major + 1}.0.0`;
    case 'minor':
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case 'patch':
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    default:
      return type; // Assume it's a specific version string
  }
}

function updatePackageJson(servicePath, version) {
  const fullPath = path.join(__dirname, '..', servicePath);

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const pkg = JSON.parse(content);
    pkg.version = version;
    fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n');
    return true;
  } catch (error) {
    console.error(`⚠️  Failed to update ${servicePath}: ${error.message}`);
    return false;
  }
}

function generateVersionInfo(version) {
  const date = new Date().toISOString();
  const content = `// Auto-generated version info - DO NOT EDIT MANUALLY
export const VERSION_INFO = {
  version: '${version}',
  buildDate: '${date}',
  buildTimestamp: ${Date.now()},
} as const;
`;

  return content;
}

function updateFrontendVersion(version) {
  const versionFilePath = path.join(__dirname, '../frontend/src/app/core/version.ts');
  const content = generateVersionInfo(version);
  fs.writeFileSync(versionFilePath, content);
  console.log(`✅ Updated frontend version.ts`);
}

function updateBackendVersion(version) {
  const versionFilePath = path.join(__dirname, '../backend/src/version.ts');
  const content = generateVersionInfo(version);
  fs.writeFileSync(versionFilePath, content);
  console.log(`✅ Updated backend version.ts`);
}

function updateAIServiceVersion(version) {
  const versionFilePath = path.join(__dirname, '../ai-estimation-service/src/version.ts');
  const content = generateVersionInfo(version);
  fs.writeFileSync(versionFilePath, content);
  console.log(`✅ Updated AI service version.ts`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'show') {
    const currentVersion = readVersion();
    console.log(`📦 Current version: ${currentVersion}`);
    console.log('\nUsage: node scripts/update-version.js [major|minor|patch|<version>]');
    console.log('  major  - Increment major version (breaking changes)');
    console.log('  minor  - Increment minor version (new features)');
    console.log('  patch  - Increment patch version (bug fixes)');
    console.log('  <version> - Set specific version (e.g., 1.2.3)');
    return;
  }

  const currentVersion = readVersion();
  const updateType = args[0];

  let newVersion;
  try {
    if (['major', 'minor', 'patch'].includes(updateType)) {
      newVersion = incrementVersion(currentVersion, updateType);
    } else {
      // Validate custom version format
      parseVersion(updateType);
      newVersion = updateType;
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  console.log(`\n🚀 Updating version: ${currentVersion} → ${newVersion}\n`);

  // Update VERSION file
  writeVersion(newVersion);

  // Update all package.json files
  let allSuccess = true;
  SERVICES.forEach(service => {
    const success = updatePackageJson(service.path, newVersion);
    if (success) {
      console.log(`✅ Updated ${service.name} package.json`);
    } else {
      allSuccess = false;
    }
  });

  // Update version.ts files
  try {
    updateFrontendVersion(newVersion);
    updateBackendVersion(newVersion);
    updateAIServiceVersion(newVersion);
  } catch (error) {
    console.error(`⚠️  Error updating version.ts files: ${error.message}`);
    allSuccess = false;
  }

  if (allSuccess) {
    console.log(`\n✨ Version updated successfully to ${newVersion}`);
    console.log('\nNext steps:');
    console.log(`1. Update CHANGELOG.md with changes for v${newVersion}`);
    console.log(`2. git add VERSION */package.json */src/version.ts CHANGELOG.md`);
    console.log(`3. git commit -m "chore: bump version to ${newVersion}"`);
    console.log(`4. git tag v${newVersion}`);
    console.log(`5. git push --tags`);
  } else {
    console.error('\n⚠️  Some updates failed. Please check the errors above.');
    process.exit(1);
  }
}

main();

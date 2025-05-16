/*
ALWAYS CHECK RESULTS BEFORE MERGE!

# This script updates a package.json file by selecting a stable version of a specified package
# and checking for compatibility with other dependencies.
# It uses the npm registry to fetch package metadata and semver for version comparison.
# It also uses inquirer for user prompts and fs for file operations.
# The script can be run with different flags to customize its behavior:
# - --latest: Automatically selects the latest stable version of the main package.
# - --check-incompatibilities: Checks all dependencies for compatibility with the selected version.
# - --autoupdate: Automatically updates all incompatible dependencies to the latest compatible version.
#

Usage:
# node dependencyUpdater.js <package-name> [--latest] [--check-incompatibilities] [--autoupdate]
#

Example:

node dependencyUpdater.js react
# Displays a list of stable React versions (excluding alpha, beta, canary, experimental)
# Selected version is saved without caret (e.g., "18.2.0")
# For other dependencies:
# - if compatible → logs ✅ and leaves unchanged
# - if incompatible → logs ⚠️ and offers compatible version selection

node dependencyUpdater.js react --latest
# Automatically picks the latest stable React version
# Saves it with caret in package.json (e.g., "^19.1.0")
# For other dependencies:
# - if compatible → logs ✅ and leaves unchanged
# - if incompatible → logs ⚠️ and offers compatible version selection

node dependencyUpdater.js react --autoupdate
# Automatically picks latest stable React version (or selected without --latest)
# Updates all incompatible dependencies to the latest compatible version
# - No prompts (fully automatic)
# - Saves exact versions without caret (e.g., "18.2.0")

node dependencyUpdater.js react --check-incompatibilities
# Selects React version (or latest with --latest)
# Checks all dependencies:
# - incompatible ones → logs ⚠️ and offers compatible versions
# - compatible ones → logs ✅ and leaves unchanged
*/

const fs = require('fs');
const path = require('path');
const https = require('https');
const semver = require('semver');
const inquirer = require('inquirer');

const args = process.argv.slice(2);
const useLatest = args.includes('--latest');
const showIncompatible = args.includes('--check-incompatibilities');
const autoUpdate = args.includes('--autoupdate');
const mainPkgName = args.find(arg => !arg.startsWith('--'));

if (!mainPkgName) {
  console.error('❌ Please provide a package name, e.g.: node dependencyUpdater.js react');
  process.exit(1);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('❌ Failed to parse JSON from npm registry'));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function getAllDependencies(packageJson) {
  return {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };
}

async function run() {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ package.json not found in current directory.');
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  console.log(`🔍 Fetching versions for ${mainPkgName}...`);
  const metadata = await fetchJson(`https://registry.npmjs.org/${mainPkgName}`);
  const allVersions = Object.keys(metadata.versions)
    .filter(v => semver.valid(v) && semver.prerelease(v) === null)
    .reverse();

  if (allVersions.length === 0) {
    console.error('❌ No stable versions found.');
    return;
  }

  let selectedMainVersion = useLatest ? allVersions[0] : null;

  if (!useLatest) {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'version',
        message: `Select a stable version for ${mainPkgName}:`,
        choices: allVersions.slice(0, 50),
      },
    ]);
    selectedMainVersion = answer.version;
  }

  console.log(`📦 Updating ${mainPkgName} to ${useLatest ? '^' : ''}${selectedMainVersion}...`);

  if (packageJson.dependencies?.[mainPkgName]) {
    packageJson.dependencies[mainPkgName] = useLatest ? `^${selectedMainVersion}` : selectedMainVersion;
  } else if (packageJson.devDependencies?.[mainPkgName]) {
    packageJson.devDependencies[mainPkgName] = useLatest ? `^${selectedMainVersion}` : selectedMainVersion;
  } else {
    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.dependencies[mainPkgName] = useLatest ? `^${selectedMainVersion}` : selectedMainVersion;
  }

  const allDeps = await getAllDependencies(packageJson);

  for (const dep of Object.keys(allDeps)) {
    if (dep === mainPkgName) continue;

    try {
      const depMeta = await fetchJson(`https://registry.npmjs.org/${dep}`);
      const installedRange = allDeps[dep];
      const versions = Object.keys(depMeta.versions)
        .filter(v => semver.valid(v) && semver.prerelease(v) === null)
        .reverse();

      let alreadyCompatible = false;
      for (const version of versions) {
        const peer = depMeta.versions[version].peerDependencies || {};
        if (!peer[mainPkgName] || semver.satisfies(selectedMainVersion, peer[mainPkgName])) {
          if (semver.satisfies(version, installedRange)) {
            alreadyCompatible = true;
          }
          break;
        }
      }

      if (alreadyCompatible) {
        console.log(`✅ ${dep} (${installedRange}) is compatible with ${mainPkgName}@${selectedMainVersion}`);
        continue;
      }

      const compatibleVersions = versions.filter(version => {
        const peer = depMeta.versions[version].peerDependencies || {};
        return !peer[mainPkgName] || semver.satisfies(selectedMainVersion, peer[mainPkgName]);
      });

      if (compatibleVersions.length > 0) {
        console.warn(`⚠️  ${dep} (${installedRange}) is NOT compatible with ${mainPkgName}@${selectedMainVersion}`);

        const selectedCompatible = autoUpdate
          ? compatibleVersions[0]
          : (
            await inquirer.prompt([
              {
                type: 'list',
                name: 'version',
                message: `Select compatible stable version for ${dep} (with ${mainPkgName}@${selectedMainVersion}):`,
                choices: compatibleVersions.slice(0, 20),
              },
            ])
          ).version;

        console.log(`🔁 ${dep} ➜ ${selectedCompatible}`);

        if (packageJson.dependencies?.[dep]) {
          packageJson.dependencies[dep] = selectedCompatible;
        } else if (packageJson.devDependencies?.[dep]) {
          packageJson.devDependencies[dep] = selectedCompatible;
        }
      } else if (showIncompatible) {
        console.warn(`❌ No compatible version found for ${dep} with ${mainPkgName}@${selectedMainVersion}`);
      }

    } catch (err) {
      console.warn(`⚠️  Failed to check ${dep}: ${err.message}`);
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json updated. Run `npm install` to apply changes.');
}

run();

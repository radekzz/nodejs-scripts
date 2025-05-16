const fs = require('fs');
const path = require('path');

// Get package name from arguments
const target = process.argv[2];

if (!target) {
  console.error('❌ Enter the package name as a parameter. For example:');
  console.error('   node find-dependents.js typescript');
  process.exit(1);
}

const nodeModulesPath = path.resolve(__dirname, 'node_modules');

function checkDependency(pkgJson, pkgName) {
  return (
    (pkgJson.dependencies && pkgJson.dependencies[pkgName]) ||
    (pkgJson.devDependencies && pkgJson.devDependencies[pkgName]) ||
    (pkgJson.peerDependencies && pkgJson.peerDependencies[pkgName])
  );
}

function scanNodeModules(dir) {
  const results = [];

  for (const item of fs.readdirSync(dir)) {
    if (item.startsWith('.')) continue;
    let pkgPath;

    if (item.startsWith('@')) {
      const scopedPath = path.join(dir, item);
      for (const subItem of fs.readdirSync(scopedPath)) {
        pkgPath = path.join(scopedPath, subItem, 'package.json');
        if (fs.existsSync(pkgPath)) {
          const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          if (checkDependency(pkgJson, target)) {
            results.push(`${item}/${subItem}`);
          }
        }
      }
    } else {
      pkgPath = path.join(dir, item, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (checkDependency(pkgJson, target)) {
          results.push(item);
        }
      }
    }
  }

  return results;
}

const results = scanNodeModules(nodeModulesPath);
console.log(`\n📦 Packages dependent on "${target}":`);
results.length
  ? results.forEach(pkg => console.log(`- ${pkg}`))
  : console.log('No packages found.');

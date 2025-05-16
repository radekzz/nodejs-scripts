const fs = require('fs');
const path = require('path');

// 1. Get package name from argument
const target = process.argv[2];

if (!target) {
  console.error('❌ Zadej název balíčku jako parametr. Např:');
  console.error('   node list-dependencies.js react-native');
  process.exit(1);
}

// 2. Path to node_modules/<target>/package.json
let packagePath;

if (target.startsWith('@')) {
  const [scope, name] = target.split('/');
  packagePath = path.join(__dirname, 'node_modules', scope, name, 'package.json');
} else {
  packagePath = path.join(__dirname, 'node_modules', target, 'package.json');
}

if (!fs.existsSync(packagePath)) {
  console.error(`❌ Package "${target}" was not found in node_modules.`);
  process.exit(1);
}

const pkgJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// 3. Výpis všech typů závislostí
function printDependencies(deps, title) {
  if (deps && Object.keys(deps).length > 0) {
    console.log(`\n🔹 ${title}:`);
    Object.entries(deps).forEach(([dep, version]) => {
      console.log(`- ${dep}@${version}`);
    });
  }
}

console.log(`📦 Package dependencies "${target}":`);
printDependencies(pkgJson.dependencies, 'Dependencies');
printDependencies(pkgJson.devDependencies, 'DevDependencies');
printDependencies(pkgJson.peerDependencies, 'PeerDependencies');

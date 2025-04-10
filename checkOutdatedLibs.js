// Run in terminal: node checkOutdatedLibs.js

const { spawn } = require('child_process');

(async () => {
  const chalk = (await import('chalk')).default;

  const yarnOutdated = spawn('yarn', ['outdated', '--json']);

  let output = '';

  yarnOutdated.stdout.on('data', (data) => {
    output += data.toString();
  });

  yarnOutdated.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  yarnOutdated.on('close', (code) => {
    // Check if the process exited with a non-zero code
    if (code !== 0 && code !== 1) {
      console.error(`yarn outdated process exited with unexpected code ${code}`);
      return;
    }

    try {
      // Split the output by new lines and parse each JSON line
      const lines = output.split('\n').filter((line) => line.trim() !== '');

      lines.forEach((line) => {
        const parsedLine = JSON.parse(line);
        if (parsedLine.type === 'table') {
          const packages = parsedLine.data.body;

          // Separate packages by version difference
          const veryMajorUpdates = []; // 5 or more major versions
          const majorUpdates = []; // 2-4 major versions
          const minorUpdates = []; // 1 major version
          const otherUpdates = []; // No major version change

          packages.forEach((pkg) => {
            const currentVersion = pkg[1];
            const latestVersion = pkg[3];

            const currentMajor = parseInt(currentVersion.split('.')[0], 10);
            const latestMajor = parseInt(latestVersion.split('.')[0], 10);
            const versionDifference = latestMajor - currentMajor;

            if (versionDifference >= 5) {
              veryMajorUpdates.push({ name: pkg[0], currentVersion, latestVersion, versionDifference });
            } else if (versionDifference >= 2) {
              majorUpdates.push({ name: pkg[0], currentVersion, latestVersion, versionDifference });
            } else if (versionDifference === 1) {
              minorUpdates.push({ name: pkg[0], currentVersion, latestVersion });
            } else {
              otherUpdates.push({ name: pkg[0], currentVersion, latestVersion });
            }
          });

          // Output very major updates first (5 or more versions)
          if (veryMajorUpdates.length > 0) {
            console.log(chalk.bgRed.white.bold('CRITICAL Major version updates (5 or more versions):'));
            veryMajorUpdates.forEach((pkg) => {
              console.log(
                chalk.red(
                  `⚠️  ${chalk.bold(pkg.name)}: ${pkg.currentVersion} -> ${pkg.latestVersion} (Difference: ${
                    pkg.versionDifference
                  } major versions)`
                )
              );
            });
          }

          // Output major updates (2-4 versions)
          if (majorUpdates.length > 0) {
            console.log(chalk.red.bold('\nMajor version updates (2 to 4 versions):'));
            majorUpdates.forEach((pkg) => {
              console.log(
                chalk.red(
                  `⚠️  ${chalk.bold(pkg.name)}: ${pkg.currentVersion} -> ${pkg.latestVersion} (Difference: ${
                    pkg.versionDifference
                  } major versions)`
                )
              );
            });
          }

          // Output minor updates (1 version)
          if (minorUpdates.length > 0) {
            console.log(chalk.yellow.bold('\nMinor version updates (1 version difference):'));
            minorUpdates.forEach((pkg) => {
              console.log(chalk.yellow(`${chalk.bold(pkg.name)}: ${pkg.currentVersion} -> ${pkg.latestVersion}`));
            });
          }

          // Output other updates (no major version change)
          if (otherUpdates.length > 0) {
            console.log(chalk.bold('\nOther updates (no major version changes):'));
            otherUpdates.forEach((pkg) => {
              console.log(`${chalk.bold(pkg.name)}: ${pkg.currentVersion} -> ${pkg.latestVersion}`);
            });
          }

          if (
            veryMajorUpdates.length === 0 &&
            majorUpdates.length === 0 &&
            minorUpdates.length === 0 &&
            otherUpdates.length === 0
          ) {
            console.log('No major version updates found.');
          }
        }
      });
    } catch (err) {
      console.error(`Error parsing yarn outdated output: ${err.message}`);
    }
  });
})();

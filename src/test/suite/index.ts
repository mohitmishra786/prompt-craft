import * as path from 'path';
import * as glob from 'glob';

// Workaround for Mocha import issues in TS/VS Code
const Mocha = require('mocha');

export function run(): Promise<void> {
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'tdd',
		color: true
	});

	const testsRoot = path.resolve(__dirname, '..');

	return new Promise((resolve, reject) => {
		// Compatible with glob v10+ promise API
		glob.glob('**/**.test.js', { cwd: testsRoot }).then((files: string[]) => {
			// Add files to the test suite
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run((failures: number) => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error(err);
				reject(err);
			}
		}).catch((err: any) => {
			reject(err);
		});
	});
}


import fs from 'node:fs';
import util from 'node:util';
import path from 'node:path';
import * as spawn from 'node:child_process';

import * as spawnExpect from './spawn-expect.js';
import * as format from '../utils/functions/formatOutput.js';

import { generatePdfs } from '../utils/functions/generatePdfs.js'
import { certVer } from "../utils/functions/certVer.js";
import { comparePdfsInFolders } from '../compare-all-in-two-folders.js';

////// CWD Logic //////

const args = process.argv;

// The directory inside which we're running the script
var currentDir = "";
currentDir = path.resolve(process.cwd(), args[1]);
currentDir = path.normalize(currentDir);
currentDir = path.dirname(currentDir);

////// Variables //////

const ALLOWED_DIR = process.env.HOME + '/.qz';
const ALLOWED = ALLOWED_DIR + '/allowed.dat';
const TMP_KEY = path.resolve(currentDir, "..", "pkey.txt");
const TMP_CERT = path.resolve(currentDir, "..", "cert.txt");

if ( fs.existsSync(TMP_KEY) ) fs.renameSync(TMP_KEY, TMP_KEY + ".old");
if ( fs.existsSync(TMP_CERT) ) fs.renameSync(TMP_CERT, TMP_CERT + ".old");

////// Static Functions //////

/**
 * Isolate fingerprinnt, lowercase, strip delims
 * @param {string} stdout - The output string from the openssl command.
 * @returns {string} The stripped and formatted fingerprint.
 */
function stripFingerprint(stdout) {
	return stdout.split('=')[1].replace(/:/g, '').trim().toLowerCase();
}

/**
 * Convert fingerprint to allowed.dat format
 * @param {string} fingerprint - The certificate fingerprint.
 * @returns {string} The formatted line for the allowed.dat file.
 */
function allowedList(fingerprint) {
	const from = '2000-01-01 00:00:00';
	const to = '2099-01-01 00:00:00';
	// Using util.format is fine in MJS/Node.js, but template literals could also be used here.
	return util.format("%s\tvoid\tvoid\t%s\t%s\ttrue\n", fingerprint, from, to);
}

////// Parameters //////

const certParams = {
	cmd: 'openssl',
	opts: ['req', '-x509', '-newkey', 'rsa:2048', '-keyout', TMP_KEY, '-out', TMP_CERT, '-days', '1', '-nodes', '-subj', '/C=vo/ST=void/L=void/O=void/OU=void/CN=void'],
	desc: "Generate certificate, private key"
};

const fingerParams = {
	cmd: "openssl",
	opts: ['x509','-fingerprint', '-in', TMP_CERT, '-noout'],
	desc: "Write fingerprint to allowed.dat"
};

const trayParams = {
	cmd: '/opt/qz-tray/qz-tray',
	opts: [],
	env: {
		QZ_OPTS: `-DtrustedRootCert=${TMP_CERT}`
	},
	desc: "Start Tray",
	expect: ' started on port'
};


////// Test Logic //////

const Obj = function() {

	const _obj = {

		certPromise: function() {
			return new Promise(function(resolve, reject) {
				// Using spawnSync from the imported 'child_process' namespace
				const out = spawn.spawnSync(certParams.cmd, certParams.opts);
				if (!out.status) {
					format.pass(certParams.desc);
					return resolve();
				}
				format.fail(certParams.desc);
				reject(out.stderr ? out.stderr.toString() : "Unknown error generating cert");
			});
		},


		fingerPromise: function() {

			return new Promise(function(resolve, reject) {

				const out = spawn.spawnSync(fingerParams.cmd, fingerParams.opts);

				if (!out.status) {

					const fingerprint = stripFingerprint(out.stdout.toString());

					// Actions hasn't run Tray before, other than "--version"
					// This ensures that directory exists
					// recursive:true is ensuring the directory can already exist, for local tests
					fs.mkdirSync(ALLOWED_DIR, { recursive: true });
					fs.appendFileSync(ALLOWED, allowedList(fingerprint));

					format.pass(fingerParams.desc);
					return resolve();

				}

				format.fail(fingerParams.desc);
				reject(out.stderr ? out.stderr.toString() : "Unknown error generating fingerprint");

			});

		},

		// Using spawnExpect from the imported namespace
		trayPromise: function() {
			return spawnExpect.spawnExpect(trayParams.cmd, trayParams.opts, trayParams.expect);
		},

		kill: function() { spawnExpect.kill(); }
	};

	return _obj;

};

// If this were intended to be a reusable module, we'd use 'export default Obj;'
// But since the original script immediately executes, we follow that pattern.
const TestRunner = new Obj();

/**
 * Main function to run the QZ Tray integration test sequence.
 */
async function runTest() {

	try {

		format.divider("STARTING QZ TRAY INTEGRATION TEST");

		await TestRunner.certPromise();
		await TestRunner.fingerPromise();

		format.info("\nAttempting to start QZ Tray (Waiting 60 seconds for 'started on port')...");
		await TestRunner.trayPromise();

		certVer();

		format.info("\nAttempting to make the latest prints...");
		await generatePdfs(path.resolve(currentDir, "..", "latest"));

		format.info("\nAttempting to compare the baseline and latest prints...");
		const compRes = await comparePdfsInFolders(
			path.resolve(currentDir, "..", "baseline"),
			path.resolve(currentDir, "..", "latest")
		);

		if ( compRes === 1 ) throw new Error("Comparison failure");

		format.divider("TEST SUCCESSFUL");

	}

	catch (error) {
		format.fail("TEST FAILED");
		console.error(error.stack || error.toString());
		process.exit(1);
	}

	finally {
		format.info("\nAttempting to kill the QZ Tray process and script...");
		// TestRunner.kill(); // This genuinely doesn't work for me
		process.exit(0);
	}
}

// Execute the test runner immediately
runTest();


import { promises as fs } from "fs";
import { existsSync } from "fs";
import path from "path";

import { pdfComp } from "./utils/functions/pdfComp.js"

/**
 * Traverses the folder recursively and stores all the file paths into `result`
 *
 * @async
 *
 * @param {string} dir - The directory we're traversing
 * @param {string[]} result - The array we're pushing all the found files to
 */
async function traverse(dir, result = []) {

	const files = await fs.readdir(dir);

	for (const file of files) {
		const fPath = path.resolve(dir, file);
		const stat = await fs.stat(fPath);
		if (stat.isDirectory()) {
			await traverse(fPath, result);
		} else {
			result.push(fPath);
		}
	}

}

/**
 * Compares PDF and prints the result.
 * Prints either "All OK" or "Not OK".
 *
 * @async
 *
 * @param {string} baseline - The baseline PDFs (folder)
 * @param {string} latest - The latest printed PDFs (folder)
 */
export async function comparePdfsInFolders(baseline, latest) {

	if (!(existsSync(baseline))) {
		console.error(`${baseline} (baseline) does not exist.`);
		return 1;
	}

	if (!(existsSync(latest))) {
		console.error(`${latest} (latest) does not exist.`);
		return 1;
	}

	var waserr = false;
	var errarr = []

	var baselineFiles = []; await traverse(baseline, baselineFiles);
	var latestFiles = []; await traverse(latest, latestFiles);

	for (const latestFile of latestFiles) {

		// Added specifically because I got ".DS_Store" when generating stuff and it got very annoying lol
		const ext = path.extname(latestFile);

		const latestResolve = path.resolve(latest);
		const latestRelative = path.relative(latestResolve, latestFile);

		const baselineResolve = path.resolve(baseline);
		const baselineCraftedPath = path.join(baselineResolve, latestRelative);

		if ( ext.toLowerCase() != ".pdf" ) {
			console.log(`Skipping ${latestFile}`);
			errarr.push( [ latestRelative, "Not a PDF file"] );
			console.log("");
			continue;
		}

		try { await fs.stat(baselineCraftedPath); }
		catch {
			console.log(`File ${baselineCraftedPath} doesn't exist`);
			console.log("");
			waserr = true;
			errarr.push( [ latestRelative, "Corresponding file doesn't exist"] );
			continue;
		}

		console.log("Comparing:");
		console.log(`  ${latestFile}`);
		console.log(`  ${baselineCraftedPath}`);

		try {

			const pdfCompRes = await pdfComp(latestFile, baselineCraftedPath);

			if ( pdfCompRes === false ) {
				console.log(`  Error: Content doesn't match`);
				waserr = true;
				errarr.push( [ latestRelative, "Failed PDF comparison" ] );
			}
			else {
				console.log(`  Success`);
			}

		}

		catch (err) {
			console.log(`  Error: ${err.message}`);
			waserr = true;
			errarr.push( [ latestRelative, err.message ] );
		}

		console.log("");

	}

	console.log( waserr ? "Not OK" : "All OK" );

	if (errarr.length > 0) {
		console.table(
			errarr.map(([file, message]) => ({ File: file, Error: message }))
		);
		return 1;
	}

	return 0;

}

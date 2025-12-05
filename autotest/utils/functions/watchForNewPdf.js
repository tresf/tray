
import chokidar from "chokidar";
import path from "path";
import fs from "fs/promises";

/**
 * Wait until the given file is no longer locked (i.e. can be opened for reading).
 *
 * Node adopted the POSIX error codes: {@link https://en.wikipedia.org/wiki/Errno.h}
 */
async function waitForFileReady(filePath, retries = 50, delay = 500) {

	const tempPath = filePath + ".readycheck";

	for (let i = 0; i < retries; i++) {

		try {
			// const fh = await fs.open(filePath, "r"); await fh.close();
			await fs.rename(filePath, tempPath);
			await fs.rename(tempPath, filePath);
			return;
		}

		catch (err) {
			// Sleep if the file is still busy
			if (err.code === "EBUSY") { await new Promise((r) => setTimeout(r, delay)); }
			else { throw err; }
		}

	}

	throw new Error(`File ${filePath} remained locked after ${retries * delay}ms`);

}

/**
 * Uses {@link https://github.com/paulmillr/chokidar}
 *
 * @param {string} dir - The directory where we're listening for the new PDF
 * @param {number} timeout [25000] - Timeout period in miliseconds. If the PDF is not found, the watcher bails
 *
 * @returns {Promise<string>} The path to the PDF that's found
 */
export function watchForNewPdf(dir, timeout = 25000) {
	return new Promise((resolve, reject) => {
		const watcher = chokidar.watch(dir, {
			ignoreInitial: true,
			depth: 0,
			// https://github.com/paulmillr/chokidar?tab=readme-ov-file#performance
			// stabilityThreshold: For how long must a file remain the same size before the watcher responds
			// pollInterval: How often the file is "asked" for his size
			awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 10 },
		});

		const timer = setTimeout(() => {
			watcher.close();
			reject(new Error("Timeout: No new PDF detected on " + dir));
		}, timeout);

		watcher.on("add", async (filePath) => {

			if (path.extname(filePath).toLowerCase() !== ".pdf") return;

			clearTimeout(timer);
			watcher.close();

			try {
				await waitForFileReady(filePath);
				resolve(filePath);
			} catch (err) {
				reject(err);
			}
		});
	});
}


import { promises as fs } from 'fs';
import path from 'path';

const lvl1 = [ "linux_cupspdf", "macos_pdfwriter", "windows_pdfcreator" ]
const lvl2 = [ "pdf", "img", "html" ]
const lvl3 = [ "vector", "raster" ]

/**
 * Generates the empty PDF directory tree.
 *
 * @async
 *
 * @param {string} baseFolder - The root folder in which the directory tree is made
 *
 * @throws {Error} If <code>fs.mkdir</code> fails for any reason. <p/>
 *
 * @note <code>fs.mkdir</code> doesn't fail if a folder exists.
 */
export async function createDirectoryTree(baseFolder) {

	let directoriesToCreate = [];

	directoriesToCreate.push(baseFolder);

	lvl1.forEach(l1 => {
		directoriesToCreate.push(path.join(baseFolder, l1));
		lvl2.forEach(l2 => {
			directoriesToCreate.push(path.join(baseFolder, l1, l2));
			lvl3.forEach(l3 => {
				directoriesToCreate.push(path.join(baseFolder, l1, l2, l3));
			})
		})
	});

	for (const dirPath of directoriesToCreate) {
		await fs.mkdir(dirPath, { recursive: true });
	}

}

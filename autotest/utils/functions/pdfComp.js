
import { rgbaComp } from "./rgbaComp.js";
import { pdf2rgba } from "./pdf2rgba.js";

// TODO: Promise<boolean> or boolean?

/**
 * Compares two PDFs by RGBA buffers.
 * Uses {@link pdf2rgba} and {@link rgbaComp}.
 *
 * @async
 *
 * @param {string} path1 - The path to one PDF we're comparing
 * @param {string} path2 - The path to the other PDF we're comparing
 *
 * @return {Promise<boolean>} true if the PDFs are identical, false otherwise
 */
export async function pdfComp( path1, path2, makeDiff = false ) {
	const img1 = await pdf2rgba(path1);
	const img2 = await pdf2rgba(path2);
	return rgbaComp(img1, img2, makeDiff);
}

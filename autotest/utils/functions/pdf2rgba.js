
import { PNG } from "pngjs";
import { fromPath } from "pdf2pic";

const options = {
	density: 72,
	format: "png",
	preserveAspectRatio: true,
	quality: 100
};

/**
 * Converts the first page of a PDF file to an RGBA pixel buffer.
 *
 * The returned object contains `data`,
 * a `Uint8Array` with the format `[ R,G,B,A, R,G,B,A, R,G,B,A, ... ]`
 * and with a size of `width * height * 4` bytes.
 *
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<{data: Uint8Array, width: number, height: number}>}
 */
export async function pdf2rgba(pdfPath) {

	const convert = fromPath(pdfPath, options);
	// TODO: How to specify 'gm' module?  Test on Windows, Linux
	convert.setGMClass(false);

	// TODO: Change '1' to '-1' when we add multi-page support
	let result = await convert(1, { responseType: "buffer" });
	result = result.buffer;

	if(result.length <= 0) {
	throw new Error("Buffer is empty!");
	}

	const png = PNG.sync.read(result);

	return {
		data: png.data,
		width: png.width,
		height: png.height,
	};

}
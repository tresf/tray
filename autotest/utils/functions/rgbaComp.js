
import pixelmatch from "pixelmatch";

// If we need the diff image:
import { PNG } from "pngjs";
import fs from "fs";

/**
 * Compares two RGBA buffers.
 *
 * Uses {@link https://github.com/mapbox/pixelmatch}.
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} img1 - You get this from {@link pdf2rgba}
 * @param {{data: Uint8ClampedArray, width: number, height: number}} img2 - You get this from {@link pdf2rgba}
 * @param {boolean} makeDiff [false] - A flag to generate a diff image titled "diff.png"
 *
 * @return {boolean} true if the buffers are identical, false otherwise
 */
export function rgbaComp( img1, img2, makeDiff = false ) {

	// Pixelmatch doesn't check this, so it's up to us
	if (img1.width !== img2.width || img1.height !== img2.height) {
		throw new Error(`Images have different dimensions (${img1.width}x${img1.height} and ${img2.width}x${img2.height})`);
	}

	// RGBA buffer, four bytes per pixel
	const diffBuffer = new Uint8ClampedArray(img1.width * img1.height * 4);

	// We know the return value based on:
	// https://github.com/mapbox/pixelmatch/blob/main/index.js#L100
	const numDiffPixels = pixelmatch(
		img1.data,
		img2.data,
		diffBuffer,
		img1.width,
		img1.height,
		{ threshold: 0.1 }
	);

	// If we want the output diff as a PNG:
	if (makeDiff) {
		const {width, height} = img1;
		const diff = new PNG({width, height});
		diff.data = diffBuffer;
		fs.writeFileSync('diff.png', PNG.sync.write(diff));
	}

	return numDiffPixels === 0;

}

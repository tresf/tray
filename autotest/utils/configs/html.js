
import { calculateOutPath } from "../functions/calculateOutPath.js"

// Sizes
// TODO: This repeats across files FOR NOW
const us_letter = { size: { width: 8.5, height: 11 }, units: "in" };
const a4 = { size: { width: 210, height: 297 }, units: "mm" };

// Common amongst all config items
const usual = us_letter;

const outPath = calculateOutPath();

const configsHtml = [

	{
		name: "HTML: Vector, base",
		options: {
			...usual
		},
		outputPath: [outPath, "html", "vector", "basic.pdf"],
	},

	{
		name: "HTML: Raster, base",
		options: {
			...usual,
			rasterize: true
		},
		outputPath: [outPath, "html", "raster", "basic.pdf"],
	},

	// Skipping vector and rotation: https://github.com/qzind/tray/issues/529
	/*
	{
		name: "HTML: Vector, rotated 45 degrees",
		options: {
			...usual,
			rotation: 45
		},
		outputPath: [outPath, "html", "vector", "rot45.pdf"],
	},
	*/

	{
		name: "HTML: Raster, rotated 45 degrees",
		options: {
			...usual,
			rasterize: true,
			rotation: 45
		},
		outputPath: [outPath, "html", "raster", "rot45.pdf"],
	},

	{
		name: "HTML: Vector, orientation:reverse-landscape",
		options: {
			...usual,
			orientation: "reverse-landscape"
		},
		outputPath: [outPath, "html", "vector", "orient_revland.pdf"],
	},

	{
		name: "HTML: Raster, orientation:reverse-landscape",
		options: {
			...usual,
			rasterize: true,
			orientation: "reverse-landscape"
		},
		outputPath: [outPath, "html", "raster", "orient_revland.pdf"],
	},

	{
		name: "HTML: Vector, orientation:landscape",
		options: {
			...usual,
			orientation: "landscape"
		},
		outputPath: [outPath, "html", "vector", "orient_land.pdf"],
	},

	{
		name: "HTML: Raster, orientation:landscape",
		options: {
			...usual,
			rasterize: true,
			orientation: "landscape"
		},
		outputPath: [outPath, "html", "raster", "orient_land.pdf"],
	},

	{
		name: "HTML: Vector, uniform margin",
		options: {
			...usual,
			margins: 2
		},
		outputPath: [outPath, "html", "vector", "margin_all.pdf"],
	},

	{
		name: "HTML: Raster, uniform margin",
		options: {
			...usual,
			rasterize: true,
			margins: 2
		},
		outputPath: [outPath, "html", "raster", "margin_all.pdf"],
	},

	{
		name: "HTML: Vector, top and left margin",
		options: {
			...usual,
			margins: { top: 2, left: 2 }
		},
		outputPath: [outPath, "html", "vector", "margin_top_left.pdf"],
	},

	{
		name: "HTML: Raster, top and left margin",
		options: {
			...usual,
			rasterize: true,
			margins: { top: 2, left: 2 }
		},
		outputPath: [outPath, "html", "raster", "margin_top_left.pdf"],
	},

	{
		name: "HTML: Vector, size (A4)",
		options: {
			...a4
		},
		outputPath: [outPath, "html", "vector", "size_a4.pdf"],
	},

	{
		name: "HTML: Raster, size (A4)",
		options: {
			...a4,
			rasterize: true
		},
		outputPath: [outPath, "html", "raster", "size_a4.pdf"],
	},

];

export { configsHtml };


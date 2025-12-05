
import { calculateOutPath } from "../functions/calculateOutPath.js"

// Sizes
const us_letter = { size: { width: 8.5, height: 11 }, units: "in" };
const a4 = { size: { width: 210, height: 297 }, units: "mm" };

// Common amongst all items
const usual = us_letter;

const outPath = calculateOutPath();

const configsPdf = [

	{
		name: "PDF: Vector, base",
		options: {
			...usual
		},
		outputPath: [outPath, "pdf", "vector", "basic.pdf"],
	},

	{
		name: "PDF: Raster, base",
		options: {
			...usual,
			rasterize: true
		},
		outputPath: [outPath, "pdf", "raster", "basic.pdf"],
	},

	{
		name: "PDF: Vector, rotated 45 degrees",
		options: {
			...usual,
			rotation: 45
		},
		outputPath: [outPath, "pdf", "vector", "rot45.pdf"],
	},

	{
		name: "PDF: Raster, rotated 45 degrees",
		options: {
			...usual,
			rasterize: true,
			rotation: 45
		},
		outputPath: [outPath, "pdf", "raster", "rot45.pdf"],
	},

	{
		name: "PDF: Vector, orientation:reverse-landscape",
		options: {
			...usual,
			orientation: "reverse-landscape"
		},
		outputPath: [outPath, "pdf", "vector", "orient_revland.pdf"],
	},

	{
		name: "PDF: Raster, orientation:reverse-landscape",
		options: {
			...usual,
			rasterize: true,
			orientation: "reverse-landscape"
		},
		outputPath: [outPath, "pdf", "raster", "orient_revland.pdf"],
	},

	{
		name: "PDF: Vector, orientation:landscape",
		options: {
			...usual,
			orientation: "landscape"
		},
		outputPath: [outPath, "pdf", "vector", "orient_land.pdf"],
	},

	{
		name: "PDF: Raster, orientation:landscape",
		options: {
			...usual,
			rasterize: true,
			orientation: "landscape"
		},
		outputPath: [outPath, "pdf", "raster", "orient_land.pdf"],
	},

	{
		name: "PDF: Vector, uniform margin",
		options: {
			...usual,
			margins: 2
		},
		outputPath: [outPath, "pdf", "vector", "margin_all.pdf"],
	},

	{
		name: "PDF: Raster, uniform margin",
		options: {
			...usual,
			rasterize: true,
			margins: 2
		},
		outputPath: [outPath, "pdf", "raster", "margin_all.pdf"],
	},

	{
		name: "PDF: Vector, top and left margin",
		options: {
			...usual,
			margins: { top: 2, left: 2 }
		},
		outputPath: [outPath, "pdf", "vector", "margin_top_left.pdf"],
	},

	{
		name: "PDF: Raster, top and left margin",
		options: {
			...usual,
			rasterize: true,
			margins: { top: 2, left: 2 }
		},
		outputPath: [outPath, "pdf", "raster", "margin_top_left.pdf"],
	},

	{
		name: "PDF: Vector, size (A4)",
		options: {
			...a4
		},
		outputPath: [outPath, "pdf", "vector", "size_a4.pdf"],
	},

	{
		name: "PDF: Raster, size (A4)",
		options: {
			...a4,
			rasterize: true
		},
		outputPath: [outPath, "pdf", "raster", "size_a4.pdf"],
	},

];

export { configsPdf };


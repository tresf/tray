
import { generatePdfs } from "./utils/functions/generatePdfs.js";
import assert from "node:assert";
import path from "node:path";

// CLI args
const args = process.argv;

// Call it as "node generate-baseline-pdfs.js" or similar
assert(args[0].includes("node"));
assert(args[1].includes("generate-baseline-pdfs"));

let dirpdf;

if ( args.length < 3 ) {
	console.warn("Folder to generate PDFs in hasn't been passed. Using \"baseline\"");
	dirpdf = "baseline";
}
else {
	dirpdf = args[2];
}

dirpdf = path.resolve(process.cwd(), dirpdf);
dirpdf = path.normalize(dirpdf);

await generatePdfs(dirpdf);
process.exit(0);


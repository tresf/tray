
import qz from "../../../js/qz-tray.js";

/**
 * Truncates the number down to the desired number of decimal places
 *
 * @param { number } number - The number to truncate
 * @param { number } decimalPlaces - The number of decimal places
 *
 * @returns { number } Truncated number
 */
function truncate( number, decimalPlaces ) {
	return Math.trunc( number * Math.pow(10, decimalPlaces) ) / Math.pow(10, decimalPlaces);
}

/**
 * Standalone script to list all page sizes of the requested printer.
 *
 * @example
 * node utils/standalone/getAllSizes.js | grep "letter"
 */
( async () => {

	await qz.websocket.connect();

	const data = await qz.printers.details();

	// NOTE:
	// "includes" returns the first item that satisfies the condition
	// maybe "filter" is more fitting
	//
	// TODO: "pdf" or general solution? Maybe this can be moved to a function?
	const pdfPrinter = data.find( (p) => p.name.toLowerCase().includes("pdf") );
	if (!pdfPrinter) {
		console.error("No PDF printer found");
		await qz.websocket.disconnect();
		process.exit(1);
	}

	pdfPrinter.sizes.forEach( (s) => {
		console.log( `${s.name} (in) : w=${truncate(s.in.width, 2)}, h=${truncate(s.in.height, 2)}` );
		console.log( `${s.name} (mm) : w=${truncate(s.mm.width, 2)}, h=${truncate(s.mm.height, 2)}` );
	} );

	await qz.websocket.disconnect();

	process.exit(0);

} )();



import os from "os";
import path from "path";

// OS username
const username = os.userInfo().username;

/**
 * Calculates the absolute path where the PDF printer
 * outputs generated PDF files, based on the current operating system.
 *
 * <p/>
 *
 * For each OS, the output location is:
 *
 * <ul>
 *   <li> Linux (CUPS-PDF): <code>/home/{username}/PDF</code> (this is set in <code>/etc/cups/cups-pdf.conf</code>) </li>
 *   <li> MacOS (PDFWriter): <code>/private/var/spool/pdfwriter/{username}</code> </li>
 *   <li> Windows: <code>C:\Users\{username}\PDF</code> (this is set in PDFCreator) </li>
 * </ul>
 *
 * @returns {string} Absolute path where the PDF printer saves generated files.
 *
 * @throws {Error} If the OS is unsupported.
 *
 * @note This function relies on {@link os.userInfo} to resolve the username.
 */
export function calculatePdfPrintPath() {
	switch ( os.platform() ) {
		case "win32": return path.join("C:", "Users", username, "PDF");
		case "linux": return path.join("/", "home", username, "PDF");
		case "darwin": return path.join("/", "private", "var", "spool", "pdfwriter", username);
		default: throw new Error(`ERROR (calculatePdfPrintPath): Unsupported OS (${os.platform()})`);
	}
}

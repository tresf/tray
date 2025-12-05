
import os from "os";

/**
 * Returns the subfolder name for storing generated PDFs based on the current OS.
 *
 * <p/>
 *
 * <ul>
 *   <li> <code>linux_cupspdf</code> </li>
 *   <li> <code>macos_pdfwriter</code> </li>
 *   <li> <code>windows_pdfcreator</code> </li>
 * </ul>
 *
 * @note The reason for this difference in export location is because different PDF printers print different files (Thanks, CUPS!)
 *
 * @returns {string} The relative folder name where PDF assets should be stored.
 *
 * @throws {Error} If the OS is unsupported.
 */

export function calculateOutPath() {
	switch (os.platform()) {
		case "win32":  return "windows_pdfcreator";
		case "linux":  return "linux_cupspdf";
		case "darwin": return "macos_pdfwriter";
		default: throw new Error(`ERROR (calculateOutPath): Unsupported OS (${os.platform()})`);
	}
}

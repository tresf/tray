import 'colors';

/**
 * Logs a status message with color coding (pass, warn, fail).
 * @param {string} type - The status type ("pass", "warn", or "fail").
 * @param {string} msg - The message to log.
 */
const status = function(type, msg) {
	let coloredType;
	switch(type) {
		case "fail" : coloredType = type.red.bold; break;
		case "warn" : coloredType = type.yellow.bold; break;
		default: coloredType = type.green.bold;
	}
	console.log("  [%s] %s", coloredType, msg);
};

export function info(msg) {
	console.log(msg.white.bold);
};

export function pass(msg) {
	return status("pass", msg);
};

export function warn(msg) {
	return status("warn", msg);
};

export function fail(err) {

	if (typeof err == 'object') {
		status("fail", err.message);
		console.error(err);
	}

	else {
		status("fail", err);
	}

	return 1;

};

export const pad = function(s, len) {
	while (s.length < len) { s += " "; }
	return s;
};

export const divider = function(msg) {
	console.log("\n================================================\n".cyan.bold);
	if (msg) console.log(msg.white.bold);
};

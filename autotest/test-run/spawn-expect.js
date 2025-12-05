import util from 'node:util';
import * as spawn from 'node:child_process';

const err = function(cmd, out) {
  return util.format("Failure running %s\n\n%s\n^^^^^^^^\n", cmd, out);
};

// --- Module-Scoped State Variables ---
// These variables replace the properties on the '_obj' instance and are accessible
// to both exported functions, making them the "singleton" state.
let currentStderr = '';
let currentProcess = null;

// --- Exported Methods ---

/**
 * Method to kill the currently spawned process.
 */
export const kill = function() {
  if (currentProcess) {
	currentProcess.kill();
  }
};

/**
 * Spawns a command and waits for a specific string in stdout before resolving.
 * @param {string} cmd - The command to execute.
 * @param {string[]} args - Arguments for the command.
 * @param {string} waitFor - The string to wait for in stdout.
 * @param {number} [timeout] - Optional timeout in milliseconds (defaults to 60000ms).
 */
export const spawnExpect = function(cmd, args, waitFor, timeout) {
  // Clear state for the new run
  currentStderr = '';
  currentProcess = null; // Clear old reference before new spawn

  return new Promise(function(resolve, reject) {
	let resolved = false;

	// Set up the timeout to reject the promise
	const timer = setTimeout(() => {
	  if (!resolved) {
		// Attempt to kill the process on timeout
		try {
		  if (currentProcess) currentProcess.kill();
		} catch (e) {
		  // Ignore kill error if process is already gone
		}
		reject(new Error(`Timeout (${timeout || 60000}ms) waiting for: "${waitFor}". Stderr: ${currentStderr}`));
	  }
	}, timeout ? timeout : 60000);

	// Save process reference to module-scoped variable
	currentProcess = spawn.spawn(cmd, args);

	currentProcess.stdout.on('data', (data) => {
	  const dataStr = data.toString();
	  if (dataStr.includes(waitFor)) {
		if (!resolved) {
		  resolved = true;
		  clearTimeout(timer);
		  resolve();
		}
	  }
	});

	currentProcess.stderr.on('data', (data) => {
	  currentStderr += data.toString();
	});

	currentProcess.on('close', (code) => {
	  // Only reject on non-zero exit code if we haven't already resolved
	  if (!resolved && code !== 0) {
		clearTimeout(timer);
		reject(new Error(err(cmd, currentStderr)));
	  }
	});

	// Handle errors during spawn (e.g., command not found)
	currentProcess.on('error', (err) => {
	  if (!resolved) {
		resolved = true;
		clearTimeout(timer);
		reject(err);
	  }
	});
  });
};
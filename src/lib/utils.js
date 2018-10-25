let constants = require('../constants');

/*
 Public API.
 */
exports.reverseBytes = reverseBytes;
exports.enforceLength = enforceLength;
exports.convertElapsedToNanoseconds = convertElapsedToNanoseconds;
exports.convertElapsedToSeconds = convertElapsedToSeconds;

/*
 Implementation.
 */

function reverseBytes(hex) {
	let parts = [];
	for (let i = 0; i < hex.length; i += 2) {
		parts.push(hex.substr(i, 2));
	}
	return parts.reverse().join('');
}

function enforceLength(length, hex) {
	hex = String(hex || '');
	if (hex.length > length) {
		return hex.slice(-1 * length);
	}
	for (let i = hex.length; i < length; i++) {
		hex = '0' + hex;
	}
	return hex;
}

function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * constants.NANOSECONDS_IN_A_SECOND + elapsed[1];
}

function convertElapsedToSeconds(elapsed) {
	return convertElapsedToNanoseconds(elapsed) / constants.NANOSECONDS_IN_A_SECOND;
}

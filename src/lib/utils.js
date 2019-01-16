let constants = require('../constants');

/*
 Public API.
 */
exports.convertElapsedToNanoseconds = convertElapsedToNanoseconds;
exports.convertElapsedToSeconds = convertElapsedToSeconds;

/*
 Implementation.
 */

function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * constants.NANOSECONDS_IN_A_SECOND + elapsed[1];
}

function convertElapsedToSeconds(elapsed) {
	return convertElapsedToNanoseconds(elapsed) / constants.NANOSECONDS_IN_A_SECOND;
}

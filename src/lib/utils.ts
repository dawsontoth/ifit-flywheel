import * as constants from '../constants';

export function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * constants.NANOSECONDS_IN_A_SECOND + elapsed[1];
}

export function convertElapsedToSeconds(elapsed) {
	return convertElapsedToNanoseconds(elapsed) / constants.NANOSECONDS_IN_A_SECOND;
}

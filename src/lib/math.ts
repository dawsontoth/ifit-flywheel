import * as constants from '../constants';

export function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * constants.NANOSECONDS_IN_A_SECOND + elapsed[1];
}

export function convertElapsedToSeconds(elapsed) {
	return convertElapsedToNanoseconds(elapsed) / constants.NANOSECONDS_IN_A_SECOND;
}

export function average(data) {
	return sum(data) / data.length;
}

export function sum(data) {
	return data.reduce((sum, value) => sum + value, 0);
}

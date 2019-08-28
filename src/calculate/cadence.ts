import * as constants from '../constants';
import { findHighs } from './findHighs';

export function calculateRawCadence(elapsedTime, passes) {
	let slowTriggerPasses = passes.length && findHighs(passes, constants.HIGHS_TOLERANCE_MIN_PERCENT, constants.HIGHS_TOLERANCE_MAX_PERCENT);
	let slowWheelPasses = slowTriggerPasses ? slowTriggerPasses / constants.OCCURRENCES_ON_THE_WHEEL : 0;
	let elapsedSeconds = elapsedTime / (constants.USE_HR_TIME ? constants.NANOSECONDS_IN_A_SECOND : constants.MILLISECONDS_IN_A_SECOND);
	return slowWheelPasses
		? slowWheelPasses / elapsedSeconds * 60
		: 0;
}

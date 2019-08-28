import * as constants from '../constants';
import { findHighs } from './findHighs';

export function calculateRawCadence(elapsedTime, passes, minPercent, maxPercent) {
	let slowTriggerPasses = passes.length && findHighs(passes, minPercent, maxPercent);
	let slowWheelPasses = slowTriggerPasses ? slowTriggerPasses / constants.OCCURRENCES_ON_THE_WHEEL : 0;
	let elapsedSeconds = elapsedTime / (constants.USE_HR_TIME ? constants.NANOSECONDS_IN_A_SECOND : constants.MILLISECONDS_IN_A_SECOND);
	return slowWheelPasses
		? slowWheelPasses / elapsedSeconds * 60
		: 0;
}

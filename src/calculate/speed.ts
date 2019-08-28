import * as constants from '../constants';

export function calculateRawSpeed(elapsedTime, triggerCounter): { speed: number, rotationsPerSecond: number } {
	const fullRotations = triggerCounter < 1 ? 0 : (triggerCounter / constants.OCCURRENCES_ON_THE_WHEEL);
	const totalSeconds = elapsedTime === 0 ? 0 : (elapsedTime / (constants.USE_HR_TIME ? constants.NANOSECONDS_IN_A_SECOND : constants.MILLISECONDS_IN_A_SECOND));
	const rotationsPerSecond = fullRotations < 1 ? 0 : (fullRotations / totalSeconds);
	return {
		speed: fullRotations < 1 ? 0 : (rotationsPerSecond / constants.readKnownRPS() * constants.KNOWN_MPH),
		rotationsPerSecond,
	};
}

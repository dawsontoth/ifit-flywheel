let fs = require('fs'),
	constants = require('./constants'),
	ipc = require('./lib/ipc'),
	utils = require('./lib/utils'),
	findHighs = require('./calculate/findHighs'),
	outliers = require('./calculate/outliers');

/*
 Debugging.
 */
let writeDebugLines = true,
	waitFor = 10,
	measureFor = 0,
	measureCounter = 0,
	computeAverageForRatio = null; // Set to null to turn off, [] to turn on.

/*
 State.
 */
let lastSpeed = 0,
	significantSpeedShiftDetected = false,
	passes = [],
	maxSampleTime = Math.max(constants.SPEED_SAMPLE_PERIOD, constants.CADENCE_SAMPLE_PERIOD),
	smoothFor = 3,
	smoothStore = {},
	lastPassedAt = 0;

/*
 Initialization.
 */
ipc.received = receivedData;
ipc.boot(ipc.keys.calculate);
updateCalculations();
setInterval(updateCalculations, constants.UPDATE_EVERY_MILLISECONDS);
require('death')(cleanUp);

/*
 Implementation.
 */

function receivedData(data) {
	lastPassedAt = data.passedAt;
	passes.unshift(data.elapsedTime);
}

function updateCalculations() {
	let timeSinceLastPass = lastPassedAt
		? constants.USE_HR_TIME
			? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
			: (Date.now() - lastPassedAt)
		: Number.MAX_SAFE_INTEGER,
		sampledTime = 0,
		trimTo = -1,
		speedCalculated = false,
		cadenceCalculated = false;

	if (timeSinceLastPass > constants.SPEED_SAMPLE_PERIOD) {
		calculateAndWriteSpeed(0, 0);
		speedCalculated = true;
	}
	if (timeSinceLastPass > constants.CADENCE_SAMPLE_PERIOD) {
		calculateAndWriteCadence(0, []);
		cadenceCalculated = true;
	}
	if (passes.length === 0 || timeSinceLastPass > maxSampleTime) {
		return;
	}
	for (let i = 0; i < passes.length; i++) {
		sampledTime += passes[i];
		if (!speedCalculated) {
			if (sampledTime > constants.SPEED_SAMPLE_PERIOD) {
				speedCalculated = true;
				calculateAndWriteSpeed(sampledTime, i + 1);
			}
		}
		if (sampledTime > maxSampleTime) {
			trimTo = i;
		}
		if (!cadenceCalculated) {
			if (sampledTime > constants.CADENCE_SAMPLE_PERIOD) {
				cadenceCalculated = true;
				calculateAndWriteCadence(sampledTime, passes.slice(0, trimTo));
			}
		}
		if (sampledTime > maxSampleTime) {
			break;
		}
	}

	if (trimTo >= 0) {
		passes = passes.slice(0, trimTo);
	}
}

function calculateAndWriteSpeed(elapsedTime, triggerCounter) {
	let fullRotations = triggerCounter < 1 ? 0 : (triggerCounter / constants.OCCURRENCES_ON_THE_WHEEL),
		totalSeconds = elapsedTime === 0 ? 0 : (elapsedTime / (constants.USE_HR_TIME ? constants.NANOSECONDS_IN_A_SECOND : constants.MILLISECONDS_IN_A_SECOND)),
		rotationsPerSecond = fullRotations < 1 ? 0 : (fullRotations / totalSeconds),
		beltMilesPerHour = fullRotations < 1 ? 0 : (rotationsPerSecond / constants.RPS_RATIO);

	// let beltWithoutSmooth = beltMilesPerHour;
	beltMilesPerHour = smooth('speed', beltMilesPerHour < constants.MIN_SPEED || beltMilesPerHour > constants.MAX_SPEED ? 0 : beltMilesPerHour);
	significantSpeedShiftDetected = Math.abs(lastSpeed - beltMilesPerHour) >= constants.SIGNIFICANT_SPEED_SHIFT_THRESHOLD;
	lastSpeed = beltMilesPerHour;
	ipc.send(ipc.keys.bluetooth, { speed: beltMilesPerHour });

	if (writeDebugLines) {
		// console.log('~~~~~~~~~~~');
		// console.log('Trigger Count:', triggerCounter);
		// console.log('RPS:', rotationsPerSecond);
		if (computeAverageForRatio) {
			if (rotationsPerSecond) {
				computeAverageForRatio.push(rotationsPerSecond);
			}
			if (computeAverageForRatio.length && computeAverageForRatio.length % 30 === 0) {
				console.log(
					'30 Second Average for Ratio:',
					computeAverageForRatio.reduce((a, b) => a + b, 0) / computeAverageForRatio.length
				);
				computeAverageForRatio = [];
			}
		}
		// console.log('Belt Raw:', beltWithoutSmooth + ' MPH');
		// console.log('Belt Smoothed:', beltMilesPerHour + ' MPH');
	}
}

function calculateAndWriteCadence(elapsedTime, passes) {
	if (significantSpeedShiftDetected) {
		if (writeDebugLines) {
			// console.log('Speed shift detected -- temporarily disabling cadence calculations.');
		}
		return;
	}
	let slowTriggerPasses = passes.length && findHighs(passes, constants.HIGHS_TOLERANCE_MIN_PERCENT, constants.HIGHS_TOLERANCE_MAX_PERCENT),
		slowWheelPasses = slowTriggerPasses ? slowTriggerPasses / constants.OCCURRENCES_ON_THE_WHEEL : 0,
		elapsedSeconds = elapsedTime / (constants.USE_HR_TIME ? constants.NANOSECONDS_IN_A_SECOND : constants.MILLISECONDS_IN_A_SECOND),
		rawCadence = slowWheelPasses
			? slowWheelPasses / elapsedSeconds * 60
			: 0,
		cadence = (rawCadence < constants.MIN_CADENCE || rawCadence > constants.MAX_CADENCE)
			? 0
			: Math.round(rawCadence);

	cadence = smooth('cadence', lastSpeed < constants.MIN_SPEED ? 0 : cadence);

	ipc.send(ipc.keys.bluetooth, { cadence: cadence });

	// if (writeDebugLines) {
	// 	console.log('~~~~~~~~~~~');
	// 	console.log('Raw Cadence:', rawCadence);
	// 	console.log('Cadence:', cadence);
	// }
	if (measureFor >= 0 && --waitFor <= 0 && --measureFor >= 0) {
		fs.writeFile('../data/cadence-passes-' + (measureCounter++) + '.json', JSON.stringify(passes), 'UTF-8', noop);
		console.log('measuring ' + measureCounter);
	}
}

function smooth(key, val) {
	if (!smoothFor) {
		return val;
	}
	if (!smoothStore[key]) {
		smoothStore[key] = [];
	}
	smoothStore[key].push(val);
	if (smoothStore[key].length > smoothFor) {
		smoothStore[key].shift();
	}
	return smoothStore[key].reduce((a, b) => a + b, 0) / smoothStore[key].length;
}

function noop(err) {
	if (err) {
		console.error(err);
	}
}

function cleanUp() {
	try {
		ipc.stop();
	}
	catch (err) {
		console.error(err);
	}
	process.exit(0);
}

const
	fs = require('fs'),
	findHighs = require('./lib/findHighs'),
	outliers = require('./lib/outliers'),
	utils = require('./lib/utils'),
	ipc = require('./lib/ipc'),
	GPIO = require('onoff').Gpio;

/*
 Constants.
 */
const NANOSECONDS_IN_A_SECOND = 1e9;
const MILLISECONDS_IN_A_SECOND = 1e3;

/*
 Configuration.
 */
const INPUT_PIN = 27; // 4 = physical pin 7, 17 is 2 below it, at physical pin 11
// https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/#prettyPhoto/0/
const MIN_SPEED = 0.8;
const MAX_SPEED = 16;
const MIN_CADENCE = 90;
const MAX_CADENCE = 230;
const USE_HR_TIME = true;
const UPDATE_EVERY_MILLISECONDS = 1e3;
const SPEED_SAMPLE_PERIOD = 5 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
const CADENCE_SAMPLE_PERIOD = 12 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
const RPS_RATIO = 33.00991828685567 / 6;
const OCCURRENCES_ON_THE_WHEEL = 1;
const HIGHS_TOLERANCE_MIN_PERCENT = 0.02;
const HIGHS_TOLERANCE_MAX_PERCENT = 0.09;
const SIGNIFICANT_SPEED_SHIFT_THRESHOLD = 0.2;
const PASS_AVERAGE_PERIOD = 6;
const PASS_AVERAGE_MAX = 3;
const PASS_AVERAGE_TOLERANCE = 0.15;

/*
 Debugging.
 */
let writeDebugLines = true;
let waitFor = 10;
let measureFor = 0;
let measureCounter = 0;
let computeAverageForRatio = null; // Set to null to turn off, [] to turn on.

/*
 State.
 */
let trigger = new GPIO(INPUT_PIN, 'in', 'rising');
let lastSpeed = 0;
let significantSpeedShiftDetected = false;
let passes = [];
let maxSampleTime = Math.max(SPEED_SAMPLE_PERIOD, CADENCE_SAMPLE_PERIOD);
let smoothFor = 3;
let smoothStore = {};
ipc.boot(ipc.keys.speed);
let lastPassedAt = 0;
let passesAveraged = 0;

/*
 Initialization.
 */
updateCalculations();
setInterval(updateCalculations, UPDATE_EVERY_MILLISECONDS);
trigger.watch(triggerPassed);
// setTimeout(dumpPasses, 12e3);
require('death')(cleanUp);

/*
 Implementation.
 */

function triggerPassed(err) {
	if (err) {
		console.error(err);
		// TODO: Do something with the error.
		return;
	}
	if (lastPassedAt) {
		let elapsedTime = USE_HR_TIME
			? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
			: Date.now() - lastPassedAt;
		if (passes.length > PASS_AVERAGE_PERIOD) {
			let recentPassesAverage = passes.slice(0, PASS_AVERAGE_PERIOD).reduce((a, b) => a + b, 0) / PASS_AVERAGE_PERIOD,
				deltaAverage = Math.abs(recentPassesAverage - elapsedTime),
				percentDeviation = deltaAverage / recentPassesAverage;
			if (percentDeviation > PASS_AVERAGE_TOLERANCE && passesAveraged < PASS_AVERAGE_MAX) {
				// console.log('Deviant pass detected, smoothing:', elapsedTime, recentPassesAverage, percentDeviation);
				elapsedTime = recentPassesAverage;
				passesAveraged += 1;
			}
			else {
				passesAveraged = Math.max(passesAveraged - 1, 0);
			}
		}
		passes.unshift(elapsedTime);
	}
	lastPassedAt = USE_HR_TIME
		? process.hrtime()
		: Date.now();
}

function updateCalculations() {
	let timeSinceLastPass = lastPassedAt
		? USE_HR_TIME
			? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
			: (Date.now() - lastPassedAt)
		: Number.MAX_SAFE_INTEGER,
		sampledTime = 0,
		trimTo = -1,
		speedCalculated = false,
		cadenceCalculated = false;

	if (timeSinceLastPass > SPEED_SAMPLE_PERIOD) {
		calculateAndWriteSpeed(0, 0);
		speedCalculated = true;
	}
	if (timeSinceLastPass > CADENCE_SAMPLE_PERIOD) {
		calculateAndWriteCadence(0, []);
		cadenceCalculated = true;
	}
	if (passes.length === 0 || timeSinceLastPass > maxSampleTime) {
		return;
	}
	for (let i = 0; i < passes.length; i++) {
		sampledTime += passes[i];
		if (!speedCalculated) {
			if (sampledTime > SPEED_SAMPLE_PERIOD) {
				speedCalculated = true;
				calculateAndWriteSpeed(sampledTime, i + 1);
			}
		}
		if (sampledTime > maxSampleTime) {
			trimTo = i;
		}
		if (!cadenceCalculated) {
			if (sampledTime > CADENCE_SAMPLE_PERIOD) {
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

function dumpPasses() {
	let copyPasses = passes.slice();
	fs.writeFile('./data/raw-passes-1.json', JSON.stringify(copyPasses), 'UTF-8', err => {
		if (err) {
			console.error(err);
		}
		else {
			console.log('Passes written to ./data/raw-passes-1.json');
		}
	});
}

function calculateAndWriteSpeed(elapsedTime, triggerCounter) {
	let fullRotations = triggerCounter < 1 ? 0 : (triggerCounter / OCCURRENCES_ON_THE_WHEEL),
		totalSeconds = elapsedTime === 0 ? 0 : (elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND)),
		rotationsPerSecond = fullRotations < 1 ? 0 : (fullRotations / totalSeconds),
		beltMilesPerHour = fullRotations < 1 ? 0 : (rotationsPerSecond / RPS_RATIO)
	;

	// let beltWithoutSmooth = beltMilesPerHour;
	beltMilesPerHour = smooth('speed', beltMilesPerHour < MIN_SPEED || beltMilesPerHour > MAX_SPEED ? 0 : beltMilesPerHour);
	significantSpeedShiftDetected = Math.abs(lastSpeed - beltMilesPerHour) >= SIGNIFICANT_SPEED_SHIFT_THRESHOLD;
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
	let slowTriggerPasses = passes.length && findHighs(passes, HIGHS_TOLERANCE_MIN_PERCENT, HIGHS_TOLERANCE_MAX_PERCENT),
		slowWheelPasses = slowTriggerPasses ? slowTriggerPasses / OCCURRENCES_ON_THE_WHEEL : 0,
		elapsedSeconds = elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
		rawCadence = slowWheelPasses
			? slowWheelPasses / elapsedSeconds * 60
			: 0,
		cadence = (rawCadence < MIN_CADENCE || rawCadence > MAX_CADENCE)
			? 0
			: Math.round(rawCadence);

	cadence = smooth('cadence', lastSpeed < MIN_SPEED ? 0 : cadence);

	ipc.send(ipc.keys.bluetooth, { cadence: cadence });

	// if (writeDebugLines) {
	// 	console.log('~~~~~~~~~~~');
	// 	console.log('Raw Cadence:', rawCadence);
	// 	console.log('Cadence:', cadence);
	// }
	if (measureFor >= 0 && --waitFor <= 0 && --measureFor >= 0) {
		fs.writeFile('./data/cadence-passes-' + (measureCounter++) + '.json', JSON.stringify(outliers.filter(passes)), 'UTF-8', noop);
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
		trigger.unexport();
	}
	catch (err) {
		console.error(err);
	}
	process.exit(0);
}

const
	fs = require('fs'),
	findHighs = require('./lib/findHighs'),
	outliers = require('./lib/outliers'),
	utils = require('./lib/utils'),
	GPIO = require('onoff').Gpio;

/*
 Constants.
 */
const NANOSECONDS_IN_A_SECOND = 1e9;
const MILLISECONDS_IN_A_SECOND = 1e3;
const INCHES_IN_A_MILE = 63360;

/*
 Configuration.
 */
const INPUT_PIN = 4;
const MIN_SPEED = 0.8;
const MAX_SPEED = 16;
const MIN_CADENCE = 90;
const MAX_CADENCE = 230;
const USE_HR_TIME = true;
const UPDATE_EVERY_MILLISECONDS = 1000;
const SPEED_SAMPLE_PERIOD = 5 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
const CADENCE_SAMPLE_PERIOD = 12 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
const WHEEL_DIAMETER_IN_INCHES = 4.5;
const WHEEL_RATIO = 13.155755104410094 / 3;
const MAGNETS_ON_THE_WHEEL = 2;
const HIGHS_TOLERANCE_MIN_PERCENT = 0.05;
const HIGHS_TOLERANCE_MAX_PERCENT = 0.08;
const SIGNIFICANT_SPEED_SHIFT_THRESHOLD = 0.2;

/*
 Debugging.
 */
let writeDebugLines = true;
let waitFor = 10;
let measureFor = 0;
let measureCounter = 0;

/*
 State.
 */
let magnet = new GPIO(INPUT_PIN, 'in', 'rising');
let lastPassedAt = USE_HR_TIME
	? process.hrtime()
	: Date.now();
let lastSpeed = 0;
let significantSpeedShiftDetected = false;
let passes = [];
let maxSampleTime = Math.max(SPEED_SAMPLE_PERIOD, CADENCE_SAMPLE_PERIOD);
let wheelCircumferenceInMiles = Math.PI * WHEEL_DIAMETER_IN_INCHES / INCHES_IN_A_MILE;
let smoothFor = 3;
let smoothStore = {};
let lastValue = -1;

/*
 Initialization.
 */
updateCalculations();
setInterval(updateCalculations, UPDATE_EVERY_MILLISECONDS);
magnet.watch(magnetPassed);
require('death')(cleanUp);

/*
 Implementation.
 */

function magnetPassed(err, value) {
	if (err) {
		console.error(err);
		// TODO: Do something with the error.
		return;
	}
	if (value !== lastValue) {
		// All good!
		lastValue = value;
		// Only fire on the falling edge.
		if (value) {
			return;
		}
	}
	else {
		// console.log('Double value detected... probable miss.', value, lastValue);
	}
	passes.unshift(USE_HR_TIME
		? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
		: Date.now() - lastPassedAt);
	lastPassedAt = USE_HR_TIME
		? process.hrtime()
		: Date.now();
}

function updateCalculations() {
	let timeSinceLastPass = USE_HR_TIME
		? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
		: (Date.now() - lastPassedAt),
		sampledTime = 0,
		trimTo = -1,
		magnetPassesForSpeed = 0,
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
				calculateAndWriteSpeed(sampledTime, magnetPassesForSpeed);
			}
			else {
				magnetPassesForSpeed += 1;
			}
		}
		if (!cadenceCalculated) {
			if (sampledTime > CADENCE_SAMPLE_PERIOD) {
				cadenceCalculated = true;
				calculateAndWriteCadence(sampledTime, passes.slice(0, trimTo));
			}
		}
		if (sampledTime > maxSampleTime) {
			trimTo = i;
			break;
		}
	}

	if (trimTo >= 0) {
		passes = passes.slice(0, trimTo);
	}
}

function calculateAndWriteSpeed(elapsedTime, magnetCounter) {
	let fullRotations = magnetCounter < 1 ? 0 : magnetCounter / MAGNETS_ON_THE_WHEEL,
		totalSeconds = elapsedTime === 0 ? 0 : elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
		rotationsPerSecond = fullRotations < 1 ? 0 : fullRotations / totalSeconds,
		rotationsPerMinute = rotationsPerSecond * 60,
		rotationsPerHour = rotationsPerMinute * 60,
		wheelMilesPerHour = rotationsPerHour * wheelCircumferenceInMiles,
		beltMilesPerHour = wheelMilesPerHour < 0.1 ? 0 : wheelMilesPerHour / WHEEL_RATIO
	;

	let beltWithoutSmooth = beltMilesPerHour;
	if (beltMilesPerHour < MIN_SPEED || beltMilesPerHour > MAX_SPEED) {
		beltMilesPerHour = 0;
	}
	else {
		beltMilesPerHour = smooth('speed', beltMilesPerHour);
	}
	significantSpeedShiftDetected = Math.abs(lastSpeed - beltMilesPerHour) >= SIGNIFICANT_SPEED_SHIFT_THRESHOLD;
	lastSpeed = beltMilesPerHour;
	fs.writeFile('./currentSpeed.txt', beltMilesPerHour, 'UTF-8', noop);

	if (writeDebugLines) {
		// console.log('~~~~~~~~~~~');
		// console.log('Magnet Count:', magnetCounter);
		// console.log('RPM:', rotationsPerMinute);
		// console.log('Wheel:', wheelMilesPerHour + ' MPH');
		// console.log('Belt Raw:', beltWithoutSmooth + ' MPH');
		console.log('Belt Smoothed:', beltMilesPerHour + ' MPH');
	}
}

function calculateAndWriteCadence(elapsedTime, passes) {
	if (significantSpeedShiftDetected) {
		if (writeDebugLines) {
			console.log('Speed shift detected -- temporarily disabling cadence calculations.');
		}
		return;
	}
	let slowMagnetPasses = passes.length && findHighs(passes, HIGHS_TOLERANCE_MIN_PERCENT, HIGHS_TOLERANCE_MAX_PERCENT),
		slowWheelPasses = slowMagnetPasses ? slowMagnetPasses / MAGNETS_ON_THE_WHEEL : 0,
		elapsedSeconds = elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
		rawCadence = slowWheelPasses
			? slowWheelPasses / elapsedSeconds * 60
			: 0,
		cadence = (rawCadence < MIN_CADENCE || rawCadence > MAX_CADENCE)
			? 0
			: Math.round(rawCadence);

	if (lastSpeed < MIN_SPEED) {
		cadence = 0;
	}
	else {
		cadence = smooth('cadence', cadence);
	}

	fs.writeFile('./currentCadence.txt', cadence, 'UTF-8', noop);

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
		magnet.unexport();
	}
	catch (err) {
		// Oh well!
	}
	process.exit(0);
}

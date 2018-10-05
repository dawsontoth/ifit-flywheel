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
const INCHES_IN_A_MILE = 63360;

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
const UPDATE_EVERY_MILLISECONDS = 1000;
const SPEED_SAMPLE_PERIOD = 5 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
const CADENCE_SAMPLE_PERIOD = 12 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
const WHEEL_DIAMETER_IN_INCHES = 4.5;
const WHEEL_RATIO = 25.42709471760993 / 5.8;
const OCCURRENCES_ON_THE_WHEEL = 1;
const HIGHS_TOLERANCE_MIN_PERCENT = 0.02;
const HIGHS_TOLERANCE_MAX_PERCENT = 0.09;
const SIGNIFICANT_SPEED_SHIFT_THRESHOLD = 0.2;

/*
 Debugging.
 */
let writeDebugLines = true;
let waitFor = 10;
let measureFor = 0;
let measureCounter = 0;
let computeAverage = [];

/*
 State.
 */
let trigger = new GPIO(INPUT_PIN, 'in', 'rising');
let lastPassedAt = USE_HR_TIME
	? process.hrtime()
	: Date.now();
let lastSpeed = 0;
let significantSpeedShiftDetected = false;
let passes = [];
let maxSampleTime = Math.max(SPEED_SAMPLE_PERIOD, CADENCE_SAMPLE_PERIOD);
let wheelCircumferenceInMiles = Math.PI * WHEEL_DIAMETER_IN_INCHES / INCHES_IN_A_MILE;
let smoothFor = 0;
let smoothStore = {};
let lastValue = -1;
ipc.boot(ipc.keys.speed);


/*
 Initialization.
 */
updateCalculations();
setInterval(updateCalculations, UPDATE_EVERY_MILLISECONDS);
trigger.watch(triggerPassed);
require('death')(cleanUp);

/*
 Implementation.
 */

function triggerPassed(err, value) {
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
		triggerPassesForSpeed = 0,
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
				calculateAndWriteSpeed(sampledTime, triggerPassesForSpeed);
			}
			else {
				triggerPassesForSpeed += 1;
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

function calculateAndWriteSpeed(elapsedTime, triggerCounter) {
	let fullRotations = triggerCounter < 1 ? 0 : triggerCounter / OCCURRENCES_ON_THE_WHEEL,
		totalSeconds = elapsedTime === 0 ? 0 : elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
		rotationsPerSecond = fullRotations < 1 ? 0 : fullRotations / totalSeconds,
		rotationsPerMinute = rotationsPerSecond * 60,
		rotationsPerHour = rotationsPerMinute * 60,
		wheelMilesPerHour = rotationsPerHour * wheelCircumferenceInMiles,
		beltMilesPerHour = wheelMilesPerHour < 0.1 ? 0 : wheelMilesPerHour / WHEEL_RATIO
	;

	// let beltWithoutSmooth = beltMilesPerHour;
	beltMilesPerHour = beltMilesPerHour < MIN_SPEED || beltMilesPerHour > MAX_SPEED ? 0 : beltMilesPerHour;
	if (smoothFor > 0) {
		beltMilesPerHour = smooth('speed', beltMilesPerHour);
	}
	significantSpeedShiftDetected = Math.abs(lastSpeed - beltMilesPerHour) >= SIGNIFICANT_SPEED_SHIFT_THRESHOLD;
	lastSpeed = beltMilesPerHour;
	ipc.send(ipc.keys.bluetooth, { speed: beltMilesPerHour });

	if (writeDebugLines) {
		// console.log('~~~~~~~~~~~');
		// console.log('Trigger Count:', triggerCounter);
		// console.log('RPM:', rotationsPerMinute);
		// console.log('Wheel:', wheelMilesPerHour + ' MPH');
		if (computeAverage) {
			computeAverage.push(wheelMilesPerHour);
			if (computeAverage.length % 60 === 0) {
				let filtered = outliers.filter(computeAverage);
				console.log(
					'60 Second Filtered Average Wheel Speed:',
					filtered.reduce((a, b) => a + b, 0) / filtered.length
				);
				computeAverage = [];
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

	cadence = lastSpeed < MIN_SPEED ? 0 : cadence;
	if (smoothFor > 0) {
		cadence = smooth('cadence', cadence);
	}

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

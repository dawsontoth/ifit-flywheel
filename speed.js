let fs = require('fs'),
	GPIO = require('onoff').Gpio,
	findHighs = require('./lib/findHighs'),
	outliers = require('./lib/outliers');

/*
 Constants.
 */
let NANOSECONDS_IN_A_SECOND = 1e9;
let MILLISECONDS_IN_A_SECOND = 1e3;
let INCHES_IN_A_MILE = 63360;

/*
 Configuration.
 */

let USE_HR_TIME = true;
let INPUT_PIN = 4;
let MINIMUM_SPEED = 0.8;
let UPDATE_EVERY_MILLISECONDS = 1000;
let SPEED_SAMPLE_PERIOD = 5 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
let CADENCE_SAMPLE_PERIOD = 10 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
let WHEEL_DIAMETER_IN_INCHES = 4.5;
let WHEEL_RATIO = 18.139186148152856 / 4.0;
let MAGNETS_ON_THE_WHEEL = 1;

/*
 Debugging.
 */
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
let passes = [];
let maxSample = Math.max(SPEED_SAMPLE_PERIOD, CADENCE_SAMPLE_PERIOD);
let WHEEL_CIRCUMFERENCE_IN_MILES = Math.PI * WHEEL_DIAMETER_IN_INCHES / INCHES_IN_A_MILE;

/*
 Initialization.
 */

updateCalculations();
setInterval(updateCalculations, UPDATE_EVERY_MILLISECONDS);
magnet.watch((err, value) => {
	if (err) {
		console.error(err);
		// TODO: Do something with the error.
	}
	else {
		passes.unshift(USE_HR_TIME
			? convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
			: Date.now() - lastPassedAt);
		lastPassedAt = USE_HR_TIME
			? process.hrtime()
			: Date.now();
	}
});

require('death')(() => {
	try {
		magnet.unexport();
	}
	catch (err) {
		// Oh well!
	}
	process.exit(0);
});

/*
 Utility methods.
 */

function updateCalculations() {
	let currentPass = USE_HR_TIME
		? convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
		: Date.now() - lastPassedAt,
		totalTime = currentPass,
		trimTo = -1,
		magnetPassesForSpeed = 0,
		speedCalculated = false,
		cadenceCalculated = false;

	if (passes.length === 0) {
		calculateAndWriteSpeed(totalTime, 0);
		calculateAndWriteCadence(totalTime, []);
		return;
	}
	for (let i = 0; i < passes.length; i++) {
		totalTime += passes[i];
		if (!speedCalculated) {
			if (totalTime > SPEED_SAMPLE_PERIOD) {
				speedCalculated = true;
				calculateAndWriteSpeed(totalTime, magnetPassesForSpeed);
			}
			else {
				magnetPassesForSpeed += 1;
			}
		}
		if (!cadenceCalculated) {
			if (totalTime > CADENCE_SAMPLE_PERIOD) {
				cadenceCalculated = true;
				calculateAndWriteCadence(totalTime, passes.slice(0, trimTo));
			}
		}
		if (totalTime > maxSample) {
			trimTo = i;
			break;
		}
	}

	if (trimTo >= 0) {
		passes = passes.slice(0, trimTo);
	}
}

function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * NANOSECONDS_IN_A_SECOND + elapsed[1];
}

function calculateAndWriteSpeed(elapsedTime, magnetCounter) {
	let fullRotations = magnetCounter / MAGNETS_ON_THE_WHEEL,
		totalSeconds = elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
		rotationsPerSecond = fullRotations / totalSeconds,
		rotationsPerMinute = rotationsPerSecond * 60,
		rotationsPerHour = rotationsPerMinute * 60,
		wheelMilesPerHour = rotationsPerHour * WHEEL_CIRCUMFERENCE_IN_MILES,
		beltMilesPerHour = wheelMilesPerHour / WHEEL_RATIO
	;

	if (beltMilesPerHour < MINIMUM_SPEED) {
		beltMilesPerHour = 0;
	}

	console.log('~~~~~~~~~~~');
	console.log('Magnet Count:', magnetCounter);
	console.log('RPM:', rotationsPerMinute);
	console.log('Wheel:', wheelMilesPerHour + ' MPH');
	console.log('Belt:', beltMilesPerHour + ' MPH');
	fs.writeFileSync('./currentSpeed.txt', beltMilesPerHour, 'UTF-8');
}

function calculateAndWriteCadence(elapsedTime, passes) {
	let highs = passes.length && findHighs(passes),
		rawCadence = highs
			? highs / (elapsedTime / (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND)) * 60
			: 0,
		cadence = rawCadence < 90 || rawCadence > 230 ? 0 : Math.round(rawCadence);

	console.log('~~~~~~~~~~~');
	console.log('Raw Cadence:', rawCadence);
	console.log('Cadence:', cadence);

	if (measureFor >= 0 && --waitFor <= 0 && --measureFor >= 0) {
		fs.writeFileSync('./data/cadence-passes-' + (measureCounter++) + '.json', JSON.stringify(outliers.filter(passes)), 'UTF-8');
		console.log('measuring ' + measureCounter);
	}
	fs.writeFileSync('./currentCadence.txt', cadence, 'UTF-8');
}

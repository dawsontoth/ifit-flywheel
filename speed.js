let fs = require('fs'),
	rpio = require('rpio'),
	findHighs = require('./lib/findHighs'),
	statistics = require('./lib/statistics'),
	outliers = require('./lib/outliers');

/*
 Configuration.
 */

const INPUT_PIN = 11; // 4 = physical pin 7, 17 is 2 below it, at physical pin 11
// https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/#prettyPhoto/0/
// TODO: Play with buffer length for cadence accuracy vs speed timeliness.
let BUFFER_LENGTH = 2e7;
let MEASUREMENT_INTERVAL = 4000;

let WHEEL_DIAMETER_IN_INCHES = 4.5;
let WHEEL_RATIO = 30.214295278723423 / 6.0;
let AVERAGE_SIZE = 3;
let MINIMUM_SPEED = 0.8;

let NANOSECONDS_IN_A_SECOND = 1e9;
let INCHES_IN_A_MILE = 63360;
let WHEEL_CIRCUMFERENCE_IN_MILES = Math.PI * WHEEL_DIAMETER_IN_INCHES / INCHES_IN_A_MILE;

// let lastSpeeds = [];
let lastCadences = [];
// let fileCounter = 0;

runOnPi();

// runSimulation();

function runOnPi() {

	/*
	 Initialization.
	 */
	let buffer = new Buffer(BUFFER_LENGTH);
	rpio.open(INPUT_PIN, rpio.INPUT);

	/*
	 Sample.
	 */


	function runSimulation() {
		let buffer = fs.readFileSync('./buffer-4-14363869422.data'),
			totalNanoseconds = 14363869422 / 10,
			parsed = convertToCounters(buffer);
		for (let i = 0; i < 10; i++) {
			calculateAndWriteResults(totalNanoseconds, parsed);
		}
	}

	setInterval(
		() => {

			// Read from the buffer, and accurately track how much time we spend reading from it.
			let start = process.hrtime();
			rpio.readbuf(INPUT_PIN, buffer);
			let elapsed = process.hrtime(start),
				totalNanoseconds = elapsed[0] * NANOSECONDS_IN_A_SECOND + elapsed[1];

			// fs.writeFileSync('./buffer-' + (++fileCounter) + '-' + totalNanoseconds + '.data', buffer);
			calculateAndWriteResults(totalNanoseconds, convertToCounters(buffer));
		},
		MEASUREMENT_INTERVAL
	);
}

function convertToCounters(buffer) {
	// Now let's analyze the data for a... bit! Ha ha.
	let counters = [],
		lastState = null;
	for (let i = 0; i < BUFFER_LENGTH; i++) {
		let currentState = buffer[i];
		if (currentState !== lastState) {
			counters.push(0);
			lastState = currentState;
		}
		counters[counters.length - 1] += currentState ? 1 : -1;
	}
	// Now I have an array of how long it spent on, then off, then on, then ...
	return counters;
}

function calculateAndWriteResults(totalNanoseconds, counters) {
	let
		// onOutliers = outliers.calculate(counters.filter(c => c > 0)),
		// offOutliers = outliers.calculate(counters.filter(c => c < 0)),
		// firstChangedToOnIndex = counters.findIndex((count, index) => index > 0 && count > onOutliers.min && count < onOutliers.max),
		// lastChangedToOffIndex = counters.lastIndexOf(counters.slice().reverse().find((count, index) => index > 0 && count > offOutliers.min && count < offOutliers.max)),
		firstChangedToOnIndex = counters.findIndex((count, index) => index > 0 && count > 0),
		lastChangedToOffIndex = counters.lastIndexOf(counters.slice().reverse().find((count, index) => index > 0 && count > 0)),
		usableCounters = counters.slice(firstChangedToOnIndex, lastChangedToOffIndex),
		usableIterations = counters.reduce((total, current) => total + current, 0),
		magnetCounter = usableCounters.filter(c => c > 0).length,
		usableBufferPercentage = usableIterations / BUFFER_LENGTH,
		usableTotalNanoseconds = usableBufferPercentage * totalNanoseconds,
		usableTotalSeconds = usableTotalNanoseconds / NANOSECONDS_IN_A_SECOND,
		// There are 2 magnets. We trigger each time they come and go.
		fullRotations = magnetCounter / 2,
		rotationsPerSecond = fullRotations / usableTotalSeconds,
		rotationsPerMinute = rotationsPerSecond * 60,
		rotationsPerHour = rotationsPerMinute * 60,
		wheelMilesPerHour = rotationsPerHour * WHEEL_CIRCUMFERENCE_IN_MILES,
		beltMilesPerHour = wheelMilesPerHour / WHEEL_RATIO,
		highs = findHighs(counters),
		cadence = highs
			? cleanCadence(highs / (totalNanoseconds / NANOSECONDS_IN_A_SECOND) * 60)
			: 0;

	if (beltMilesPerHour < MINIMUM_SPEED) {
		beltMilesPerHour = 0;
	}

	lastCadences.push(cadence);
	if (lastCadences.length > AVERAGE_SIZE) {
		lastCadences.shift();
	}
	// lastSpeeds.push(beltMilesPerHour);
	// if (lastSpeeds.length > AVERAGE_SIZE) {
	// 	lastSpeeds.shift();
	// }
	console.log('~~~~~~~~~~~');
	// console.log('Trimmed Buffer %:', usableBufferPercentage * 100);
	// console.log('Trimmed Seconds:', usableTotalSeconds);
	// console.log('Magnet Count:', magnetCounter);
	console.log('Magnets per Second:', magnetCounter / usableTotalSeconds);
	// console.log('RPM:', rotationsPerMinute);
	console.log('Wheel:', wheelMilesPerHour + ' MPH');
	console.log('Belt:', beltMilesPerHour + ' MPH');
	// console.log('Avg Belt:', statistics.average(lastSpeeds) + ' MPH');
	console.log('Cadence:', cadence);
	// console.log('Avg Cadence:', statistics.average(lastCadences));

	// if (--waitFor <= 0 && --measureFor >= 0) {
	// 	fs.writeFileSync('./data/' + measurePrefix + '-' + (measureCounter++) + '.json', JSON.stringify(counters), 'UTF-8');
	// 	console.log('measuring ' + measureCounter);
	// }
	// fs.writeFileSync('./currentSpeed.txt', avg(lastSpeeds), 'UTF-8');
	// fs.writeFileSync('./currentCadence.txt', avg(lastCadences), 'UTF-8');
	fs.writeFileSync('./currentSpeed.txt', beltMilesPerHour, 'UTF-8');
	// fs.writeFileSync('./currentCadence.txt', cadence, 'UTF-8');
}

function cleanCadence(val) {
	if (val < 90) {
		return 0;
	}
	if (val > 220) {
		return 0;
	}
	return Math.round(val);
}
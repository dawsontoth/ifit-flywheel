let fs = require('fs');

(function() {
	/*
	 Configuration.
	 */

	let INPUT_PIN = 7;
	let BUFFER_LENGTH = 1e7; // 1e8 goes for about 14 seconds, 100mb... too big?
	let NANOSECONDS_IN_A_SECOND = 1e9;
	let WHEEL_DIAMETER_IN_INCHES = 4.5;
	let INCHES_IN_A_MILE = 63360;
	let WHEEL_CIRCUMFERENCE_IN_MILES = Math.PI * WHEEL_DIAMETER_IN_INCHES / INCHES_IN_A_MILE;
	let WHEEL_RATIO = 27.896592409566857 / 6;
	// TODO: Tweak the measurement interval.
	let MEASUREMENT_INTERVAL = 1000;

	runOnPi();

	// runSimulation();

	function runOnPi() {

		/*
		 Initialization.
		 */
		let rpio = require('rpio');
		let buffer = new Buffer(BUFFER_LENGTH);
		rpio.open(INPUT_PIN, rpio.INPUT);

		/*
		 Sample.
		 */
		// let fileCounter = 0;
		setInterval(
			() => {

				// Read from the buffer, and accurately track how much time we spend reading from it.
				let start = process.hrtime();
				rpio.readbuf(INPUT_PIN, buffer);
				let elapsed = process.hrtime(start),
					totalNanoseconds = elapsed[0] * NANOSECONDS_IN_A_SECOND + elapsed[1];

				// TODO: Get a measurement of this, with me on the belt. Run for a minute and count cadence.
				// fs.writeFileSync('./buffer-' + (++fileCounter) + '-' + totalNanoseconds + '.data', buffer);
				logAnalysis(totalNanoseconds, convertToCounters(buffer));
			},
			MEASUREMENT_INTERVAL
		);
	}

	function runSimulation() {
		let buffer = fs.readFileSync('../buffer-4-14363869422.data'),
			totalNanoseconds = 14363869422 / 10,
			parsed = convertToCounters(buffer);
		logAnalysis(totalNanoseconds, parsed);
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

	function logAnalysis(totalNanoseconds, counters) {
		let firstChangedToOnIndex = counters.findIndex((count, index) => index > 0 && count > 0),
			lastChangedToOffIndex = counters.lastIndexOf(counters.slice().reverse().find((count, index) => index > 0 && count < 0)),
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
			beltMilesPerHour = wheelMilesPerHour / WHEEL_RATIO;
		console.log('~~~~~~~~~~~');
		console.log('Trimmed Buffer %:', usableBufferPercentage * 100);
		console.log('Trimmed Seconds:', usableTotalSeconds);
		console.log('Magnet Count:', magnetCounter);
		console.log('RPM:', rotationsPerMinute);
		console.log('Wheel:', wheelMilesPerHour + ' MPH');
		console.log('Belt:', beltMilesPerHour + ' MPH');
		// TODO: Apply some smoothing over a short period of time? Like a 10 second average, perhaps.
		fs.writeFileSync('./currentSpeed.txt', beltMilesPerHour, 'UTF-8');
		// TODO: Calculate cadence based on fluctuations in the readings.
		fs.writeFileSync('./currentCadence.txt', beltMilesPerHour > 0.5 ? 172 : 0, 'UTF-8');
	}
})();

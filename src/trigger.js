let fs = require('fs'),
	GPIO = require('onoff').Gpio,
	constants = require('./constants'),
	utils = require('./lib/utils'),
	ipc = require('./lib/ipc');

/*
 State.
 */
let trigger = new GPIO(constants.INPUT_PIN, 'in', 'rising'),
	passHistory = [],
	lastPassedAt = 0,
	passesAveraged = 0,
	rawHistoryForDump = [],
	shouldDump = false,
	ignoreFirstDump = true;

/*
 Initialization.
 */
ipc.boot(ipc.keys.trigger);
trigger.watch(triggerPassed);
require('death')(cleanUp);
shouldDump && setInterval(dumpPasses, 60 * 1000);

/*
 Implementation.
 */

function triggerPassed(err) {
	if (err) {
		console.error(err);
		// TODO: Do something with the error.
		return;
	}
	let passedAt = constants.USE_HR_TIME
		? process.hrtime()
		: Date.now();
	if (lastPassedAt) {
		let elapsedTime = constants.USE_HR_TIME
			? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
			: Date.now() - lastPassedAt;
		shouldDump && rawHistoryForDump.push(elapsedTime);
		if (passHistory.length > constants.PASS_AVERAGE_PERIOD) {
			let recentPassesAverage = passHistory.slice(0, constants.PASS_AVERAGE_PERIOD).reduce((a, b) => a + b, 0) / constants.PASS_AVERAGE_PERIOD,
				deltaAverage = Math.abs(recentPassesAverage - elapsedTime),
				percentDeviation = deltaAverage / recentPassesAverage;
			if (percentDeviation > constants.PASS_AVERAGE_TOLERANCE && passesAveraged < constants.PASS_AVERAGE_MAX) {
				// console.log('Deviant pass detected, smoothing:', elapsedTime, recentPassesAverage, percentDeviation);
				elapsedTime = recentPassesAverage;
				passesAveraged += 1;
			}
			else {
				passesAveraged = Math.max(passesAveraged - 1, 0);
			}
			passHistory.pop();
		}
		passHistory.unshift(elapsedTime);
		ipc.send(ipc.keys.calculate, { passedAt: passedAt, elapsedTime: elapsedTime });
	}
	lastPassedAt = passedAt;
}

function dumpPasses() {
	if (ignoreFirstDump) {
		ignoreFirstDump = false;
		return;
	}
	fs.writeFile('../dump/' + new Date().toLocaleString() + '.json', JSON.stringify(rawHistoryForDump), 'UTF-8', err => {
		if (err) {
			console.error(err);
		}
	});
	rawHistoryForDump = [];
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

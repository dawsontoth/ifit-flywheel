import death from 'death';
import fs from 'fs';
import { Gpio as GPIO } from 'onoff';
import * as constants from './constants';
import * as ipc from './lib/ipc';
import * as utils from './lib/math';

/*
 State.
 */
let trigger = new GPIO(constants.INPUT_PIN, 'in', 'rising'),
	passHistory: number[] = [],
	lastPassedAt: any = 0,
	passesAveraged = 0,
	rawHistoryForDump: number[] = [],
	shouldDump = false,
	ignoreFirstDump = true;

/*
 Initialization.
 */
ipc.boot(ipc.keys.trigger);
trigger.watch(triggerPassed);
death(cleanUp);
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
	let passedAt = process.hrtime();
	if (lastPassedAt) {
		let elapsedTime = utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt));
		shouldDump && rawHistoryForDump.push(elapsedTime);
		if (passHistory.length > constants.PASS_AVERAGE_PERIOD) {
			let recentPassesAverage = passHistory.slice(0, constants.PASS_AVERAGE_PERIOD).reduce((a, b) => a + b, 0) / constants.PASS_AVERAGE_PERIOD,
				deltaAverage = Math.abs(recentPassesAverage - elapsedTime),
				percentDeviation = deltaAverage / recentPassesAverage;
			if (percentDeviation > constants.PASS_AVERAGE_TOLERANCE && passesAveraged < constants.PASS_AVERAGE_MAX) {
				// console.log('Deviant pass detected, smoothing:', elapsedTime, recentPassesAverage, percentDeviation);
				elapsedTime = recentPassesAverage;
				passesAveraged += 1;
			} else {
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
	} catch (err) {
		console.error(err);
	}
	process.exit(0);
}

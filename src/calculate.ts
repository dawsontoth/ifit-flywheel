import { calculateRawCadence } from './calculate/cadence';
import { calculateRawSpeed } from './calculate/speed';
import * as constants from './constants';
import * as ipc from './lib/ipc';
import * as utils from './lib/math';
import { average } from './lib/math';
import * as web from './web';

/*
 State.
 */
let lastSpeed = 0,
	cadenceFrozen = false,
	cadenceFrozenHandle: null | any = null,
	passes: number[] = [],
	maxSampleTime = Math.max(constants.SPEED_SAMPLE_PERIOD, constants.CADENCE_SAMPLE_PERIOD),
	smoothFor = 3,
	smoothStore = {},
	lastPassedAt: any = 0;

/*
 Debugging.
 */
let writeDebugLines = false,
	computeAverageForRatio: number[] = [];
web.payload.Passes = passes;
web.payload.RotationsAvg = constants.readKnownRPS();

/*
 Initialization.
 */
ipc.setReceived(receivedData);
ipc.boot(ipc.keys.calculate);
updateCalculations();
setInterval(updateCalculations, constants.UPDATE_INTERVAL_TIMEOUT);
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
		? utils.convertElapsedToNanoseconds(process.hrtime(lastPassedAt))
		: Number.MAX_SAFE_INTEGER,
		sampledTime = 0,
		trimAfter = -1,
		speedCalculated = false,
		cadenceCalculated = false;

	if (timeSinceLastPass > constants.MAX_DELAY_FOR_ZERO) {
		calculateSpeed(0, 0);
		calculateCadence(0, []);
		speedCalculated = true;
		cadenceCalculated = true;
		return;
	}
	if (passes.length === 0 || timeSinceLastPass > maxSampleTime) {
		return;
	}
	let smoothedPasses = smoothArray(passes, 0.85);
	if (web) {
		web.payload.Passes = smoothedPasses;
	}
	for (let i = 0; i < smoothedPasses.length; i++) {
		sampledTime += smoothedPasses[i];
		if (!speedCalculated) {
			if (sampledTime > constants.SPEED_SAMPLE_PERIOD) {
				speedCalculated = true;
				calculateSpeed(sampledTime, i + 1);
			}
		}
		if (sampledTime > maxSampleTime) {
			trimAfter = i;
		}
		if (!cadenceCalculated) {
			if (sampledTime > constants.CADENCE_SAMPLE_PERIOD) {
				cadenceCalculated = true;
				calculateCadence(sampledTime, smoothedPasses.slice(0, trimAfter));
			}
		}
		if (sampledTime > maxSampleTime) {
			break;
		}
	}

	if (trimAfter >= 0) {
		passes.splice(trimAfter, passes.length - trimAfter);
	}
}

function calculateSpeed(elapsedTime, triggerCounter) {
	const { speed: beltWithoutSmooth, rotationsPerSecond } = calculateRawSpeed(elapsedTime, triggerCounter);
	const beltMilesPerHour = smoothValue('speed', beltWithoutSmooth < constants.MIN_SPEED || beltWithoutSmooth > constants.MAX_SPEED ? 0 : beltWithoutSmooth);
	lastSpeed = beltMilesPerHour;
	if (Math.abs(lastSpeed - beltMilesPerHour) >= constants.SIGNIFICANT_SPEED_SHIFT_THRESHOLD) {
		cadenceFrozen = true;
		if (cadenceFrozenHandle) {
			clearTimeout(cadenceFrozenHandle);
		}
		cadenceFrozenHandle = setTimeout(() => {
			cadenceFrozenHandle = null;
			cadenceFrozen = false;
		}, constants.FREEZE_CADENCE_TIMEOUT);
	}
	if (web) {
		web.payload.Rotations = rotationsPerSecond;
		web.payload.SpeedRaw = beltWithoutSmooth;
		web.payload.Speed = beltMilesPerHour;
	}
	ipc.send(ipc.keys.ifit, { speed: beltMilesPerHour });

	if (rotationsPerSecond) {
		computeAverageForRatio.push(rotationsPerSecond);
	}
	if (computeAverageForRatio.length && computeAverageForRatio.length % 30 === 0) {
		web.payload.RotationsAvg = computeAverageForRatio.reduce((a, b) => a + b, 0) / computeAverageForRatio.length;
		computeAverageForRatio = [];
	}
	if (writeDebugLines) {
		console.log('~~~~~~~~~~~');
		console.log('Trigger Count:', triggerCounter);
		console.log('RPS:', rotationsPerSecond);
		console.log('Belt Raw:', beltWithoutSmooth + ' MPH');
		console.log('Belt Smoothed:', beltMilesPerHour + ' MPH');
	}
}

function calculateCadence(elapsedTime, passes) {
	if (cadenceFrozen) {
		if (writeDebugLines) {
			console.log('Speed shift detected -- temporarily disabling cadence calculations.');
		}
		return;
	}
	const rawCadence = calculateRawCadence(elapsedTime, passes, constants.HIGHS_TOLERANCE_MIN_PERCENT, constants.HIGHS_TOLERANCE_MAX_PERCENT);
	let cadence = (rawCadence < constants.MIN_CADENCE || rawCadence > constants.MAX_CADENCE)
		? 0
		: Math.round(rawCadence);
	cadence = smoothValue('cadence', lastSpeed < constants.MIN_SPEED ? 0 : cadence);
	if (web) {
		web.payload.CadenceRaw = rawCadence;
		web.payload.Cadence = cadence;
	}
	ipc.send(ipc.keys.ifit, { cadence: cadence });
}

function smoothValue(key, val) {
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

function smoothArray(values, alpha) {
	let weighted = average(values) * alpha;
	return values.map((curr, i) => {
		let prev = i > 0 ? values[i - 1] : values[values.length - 1],
			next = i < values.length - 1 ? values[i + 1] : values[0];
		return Number(average([weighted, prev, curr, next]).toFixed(2));
	});
}

function cleanUp() {
	try {
		ipc.stop();
	} catch (err) {
		console.error(err);
	}
	process.exit(0);
}

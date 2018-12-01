#!/usr/bin/env node
let constants = require('./constants');

process.env['BLENO_DEVICE_NAME'] = constants.NAME;

let bleno = require('bleno'),
	utils = require('./lib/utils'),
	ipc = require('./lib/ipc'),
	rscService = new (require('./bluetooth/rsc/service'))(),
	rscCalculator = require('./bluetooth/rsc/calculator'),
	treadmillService = new (require('./bluetooth/treadmill/service'))(),
	treadmillCalculator = require('./bluetooth/treadmill/calculator');

/*
 State.
 */
let updateFPS = 5,
	lastTrackedAt,
	elevationGainMeters = 0,
	elevationLossMeters = 0,
	idleSecondsCount = 0,
	current = {
		mph: 0,
		incline: 0,
		cadence: 0
	},
	// current = {
	// 	mph: 9,
	// 	incline: 3,
	// 	cadence: 172
	// },
	ramps = {
		mph: 0,
		incline: 0,
		cadence: 0
	},
	services = [
		rscService,
		treadmillService
	],
	serviceUUIDs = services.map(s => s.uuid);

/*
 Initialization.
 */
bleno.on('stateChange', stateChanged);
bleno.on('advertisingStart', advertisingStarted);
ipc.received = receivedData;
ipc.boot(ipc.keys.bluetooth);
setInterval(calculateGainAndLoss, constants.UPDATE_INTERVAL_TIMEOUT);
setInterval(emitUpdates, constants.UPDATE_INTERVAL_TIMEOUT / updateFPS);

function stateChanged(state) {
	if (state === 'poweredOn') {
		bleno.startAdvertising(constants.NAME, serviceUUIDs);
	}
	else {
		bleno.stopAdvertising();
	}
}

function advertisingStarted(error) {
	if (error) {
		console.error(error);
		return;
	}
	bleno.setServices(services);
}

function receivedData(data) {
	if (data.speed !== undefined) {
		current.mph = data.speed;
	}
	if (data.cadence !== undefined) {
		current.cadence = data.cadence;
	}
	if (data.incline !== undefined) {
		current.incline = data.incline;
	}
}

function calculateGainAndLoss() {
	if (lastTrackedAt && current.mph > 0 && Math.abs(current.incline) > 0) {
		let seconds = utils.convertElapsedToSeconds(process.hrtime(lastTrackedAt)),
			elevationDelta = (current.incline / 100)
				* (current.mph / constants.SECONDS_PER_HOUR * seconds)
				* constants.METERS_PER_MILE;
		if (elevationDelta > 0) {
			elevationGainMeters += elevationDelta;
		}
		else if (elevationDelta < 0) {
			elevationLossMeters -= elevationDelta;
		}
	}
	else if (current.mph <= 0) {
		idleSecondsCount += 1;
		if (idleSecondsCount >= constants.IDLE_AFTER_SECONDS) {
			elevationGainMeters = 0;
			elevationLossMeters = 0;
			idleSecondsCount = 0;
		}
	}
	lastTrackedAt = process.hrtime();
}

function emitUpdates() {
	let mph = rampCurrentValue('mph'),
		cadence = rampCurrentValue('cadence'),
		incline = rampCurrentValue('incline');
	if (rscService.measurement.updateValueCallback) {
		rscService.measurement.updateValueCallback(rscCalculator.calculateBuffer({
			mph,
			cadence
		}));
	}
	if (treadmillService.measurement.updateValueCallback) {
		treadmillService.measurement.updateValueCallback(treadmillCalculator.calculateBuffer({
			mph,
			incline,
			elevation: {
				gain: elevationGainMeters,
				loss: elevationLossMeters
			}
		}));
	}
}

function rampCurrentValue(key) {
	let currentValue = current[key],
		rampedValue = ramps[key],
		delta = currentValue - rampedValue,
		step = 0.2 / updateFPS;
	// Are we within one step of the new value?
	if (Math.abs(delta) <= step) {
		ramps[key] = current[key];
	}
	else {
		ramps[key] += delta * 0.2;
	}
	return ramps[key];
}

require('death')(() => {
	try {
		ipc.stop();
		bleno.disconnect();
	}
	catch (err) {
		console.error(err);
	}
	process.exit(0);
});
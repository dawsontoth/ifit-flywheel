#!/usr/bin/env node
let constants = require('./constants');

process.env['BLENO_DEVICE_NAME'] = constants.NAME;

let bleno = require('bleno'),
	_ = require('lodash'),
	utils = require('./lib/utils'),
	ipc = require('./lib/ipc'),
	rscService = new (require('./bluetooth/rsc/service'))(),
	rscCalculator = require('./bluetooth/rsc/calculator'),
	treadmillService = new (require('./bluetooth/treadmill/treadmillService'))(),
	treadmillCalculator = require('./bluetooth/treadmill/treadmillCalculator'),
	environmentalSensingService = new (require('./bluetooth/environmental/service'))(),
	environmentalSensingCalculator = require('./bluetooth/environmental/calculator');

/*
 State.
 */
let baseElevationMeters = 100,
	updateFPS = 30,
	lastTrackedAt = process.hrtime(),
	elevationGainMeters = 0,
	elevationLossMeters = 0,
	current = {
		mph: 0,
		incline: 5,
		cadence: 0
	},
	ramps = {
		mph: 0,
		incline: 5,
		cadence: 0
	},
	services = [
		// environmentalSensingService,
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
setInterval(calculateGainAndLoss, constants.UPDATE_EVERY_MILLISECONDS);
setInterval(emitUpdates, constants.UPDATE_EVERY_MILLISECONDS / updateFPS);

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
	if (current.mph > 0 && Math.abs(current.incline) > 0) {
		let metersTraveled = current.incline
			/ constants.SECONDS_PER_HOUR
			* constants.METERS_PER_MILE
			* utils.convertElapsedToSeconds(process.hrtime(lastTrackedAt));
		lastTrackedAt = process.hrtime();
		let elevationDelta = metersTraveled * current.incline / 100;
		if (elevationDelta > 0) {
			elevationGainMeters += elevationDelta;
		}
		else if (elevationDelta < 0) {
			elevationLossMeters -= elevationDelta;
		}
	}
}

function emitUpdates() {
	if (rscService.measurement.updateValueCallback) {
		rscService.measurement.updateValueCallback(Buffer.from(rscCalculator.calculateHex({
			mph: rampCurrentValue('mph'),
			// miles: 3.1,
			cadence: rampCurrentValue('cadence')
		}), 'hex'));
	}
	if (treadmillService.measurement.updateValueCallback) {
		treadmillService.measurement.updateValueCallback(Buffer.from(treadmillCalculator.calculateHex({
			mph: rampCurrentValue('mph'),
			incline: rampCurrentValue('incline'),
			elevation: {
				gain: elevationGainMeters,
				loss: elevationLossMeters
			}
		}), 'hex'));
	}
	let elevationValue = Buffer.from(environmentalSensingCalculator.calculateHex({
		elevation: baseElevationMeters + elevationGainMeters + elevationLossMeters
	}), 'hex');
	environmentalSensingService.measurement.value = elevationValue;
	if (environmentalSensingService.measurement.updateValueCallback) {
		environmentalSensingService.measurement.updateValueCallback(elevationValue);
	}
}

function rampCurrentValue(key) {
	//                 6mph
	let currentValue = current[key],
		//            4mph
		rampedValue = ramps[key],
		//      +2mph
		delta = currentValue - rampedValue,
		step = 0.2 / updateFPS;
	// Are we within one step of the new value?
	if (Math.abs(delta) <= step) {
		ramps[key] = current[key];
	}
	else {
		ramps[key] += step * (delta > 0 ? 1 : -1);
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
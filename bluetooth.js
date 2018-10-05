#!/usr/bin/env node

process.env['BLENO_DEVICE_NAME'] = 'Truthmill';

let bleno = require('bleno'),
	_ = require('lodash'),
	utils = require('./lib/utils'),
	ipc = require('./lib/ipc');

let rscService = new (require('./lib/rscService'))(),
	treadmillService = new (require('./lib/treadmillService'))(),
	environmentalSensingService = new (require('./lib/environmentalSensingService'))(),
	rscCalculator = require('./lib/rscCalculator'),
	treadmillCalculator = require('./lib/treadmillCalculator'),
	environmentalSensingCalculator = require('./lib/environmentalSensingCalculator');

let metersPerMile = 1609.344,
	secondsPerHour = 3600;

// These are in meters, by the way.
let baseElevation = 100,
	updateFPS = 30,
	lastTrackedAt = process.hrtime(),
	elevationGain = 0,
	elevationLoss = 0,
	current = {
		mph: 0,
		incline: 0,
		cadence: 0
	},
	ramps = {
		mph: 0,
		incline: 0,
		cadence: 0
	};

setInterval(calculateGainAndLoss, 1000);
setInterval(emitUpdates, 1000 / updateFPS);
bleno.on('stateChange', stateChanged);
bleno.on('advertisingStart', advertisingStarted);
ipc.received = receivedData;
ipc.boot(ipc.keys.bluetooth);

function stateChanged(state) {
	console.log('on -> stateChange: ' + state);

	if (state === 'poweredOn') {
		bleno.startAdvertising('Truthmill', [
			environmentalSensingService.uuid,
			rscService.uuid,
			treadmillService.uuid
		]);
	}
	else {
		bleno.stopAdvertising();
	}
}

function advertisingStarted(error) {
	console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

	if (!error) {
		bleno.setServices([
			environmentalSensingService,
			rscService,
			treadmillService
		]);
	}
}

function receivedData(data) {
	if (data.speed !== undefined) {
		current.mph = data.speed;
	}
	if (data.cadence !== undefined) {
		current.cadence = data.cadence;
	}
}

function calculateGainAndLoss() {
	if (current.mph > 0 && Math.abs(current.incline) > 0) {
		let metersTraveled = current.incline
			/ secondsPerHour
			* metersPerMile
			* utils.convertElapsedToSeconds(process.hrtime(lastTrackedAt));
		lastTrackedAt = process.hrtime();
		let elevationDelta = metersTraveled * current.incline / 100;
		if (elevationDelta > 0) {
			elevationGain += elevationDelta;
		}
		else if (elevationDelta < 0) {
			elevationLoss -= elevationDelta;
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
				gain: elevationGain,
				loss: elevationLoss
			}
		}), 'hex'));
	}
	let elevationValue = Buffer.from(environmentalSensingCalculator.calculateHex({
		elevation: baseElevation + elevationGain + elevationLoss
	}), 'hex');
	environmentalSensingService.measurement.value = elevationValue;
	if (environmentalSensingService.measurement.updateValueCallback) {
		console.log('update value callback for environmental sensing!');
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
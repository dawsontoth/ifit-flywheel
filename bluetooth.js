#!/usr/bin/env node

process.env['BLENO_DEVICE_NAME'] = 'Dawson Treadmill';

let bleno = require('bleno'),
	fs = require('fs');

let rscService = new (require('./lib/rscService'))(),
	treadmillService = new (require('./lib/treadmillService'))(),
	environmentalSensingService = new (require('./lib/environmentalSensingService'))(),
	rscCalculator = require('./lib/rscCalculator'),
	treadmillCalculator = require('./lib/treadmillCalculator'),
	environmentalSensingCalculator = require('./lib/environmentalSensingCalculator');

bleno.on('stateChange', function(state) {
	console.log('on -> stateChange: ' + state);

	if (state === 'poweredOn') {
		bleno.startAdvertising('Treadmill', [
			environmentalSensingService.uuid,
			rscService.uuid,
			treadmillService.uuid
		]);
	}
	else {
		bleno.stopAdvertising();
	}
});

bleno.on('advertisingStart', function(error) {
	console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

	if (!error) {
		bleno.setServices([
			environmentalSensingService,
			rscService,
			treadmillService
		]);
	}
});

let metersPerMile = 1609.344;
let secondsPerHour = 3600;

// These are in meters, by the way.
let baseElevation = 100,
	elevationGain = 0,
	elevationLoss = 0;

setInterval(() => {
	let mph = parseFloat(fs.readFileSync('./currentSpeed.txt', 'UTF-8')),
		incline = parseFloat(fs.readFileSync('./currentIncline.txt', 'UTF-8'));
	if (mph >= 0.1 && Math.abs(incline) >= 0.1) {
		// TODO: Measure the precise amount of time passed. It's _about_ 1 second, but not exact.
		let metersPerSecond = mph / secondsPerHour * metersPerMile;
		let elevationDelta = metersPerSecond * incline / 100;
		if (elevationDelta > 0) {
			elevationGain += elevationDelta;
		}
		else if (elevationDelta < 0) {
			elevationLoss -= elevationDelta;
		}
		// mph * incline = elevation gain or loss?
	}
	if (rscService.measurement.updateValueCallback) {
		rscService.measurement.updateValueCallback(Buffer.from(rscCalculator.calculateHex({
			mph: mph,
			// miles: 3.1,
			cadence: parseInt(fs.readFileSync('./currentCadence.txt', 'UTF-8'), 10)
		}), 'hex'));
	}
	if (treadmillService.measurement.updateValueCallback) {
		treadmillService.measurement.updateValueCallback(Buffer.from(treadmillCalculator.calculateHex({
			mph: mph,
			incline: incline,
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
}, 1000);


require('death')(() => {
	try {
		bleno.disconnect();
	}
	catch (err) {
		// Oh well!
	}
	process.exit(0);
});
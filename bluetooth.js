#!/usr/bin/env node

process.env['BLENO_DEVICE_NAME'] = 'Treadmill';

let bleno = require('bleno'),
	utils = require('./lib/utils'),
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
		bleno.startAdvertising('Truthmill', [
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
	lastTrackedAt = process.hrtime(),
	elevationGain = 0,
	elevationLoss = 0;

async function readFile(url) {
	return new Promise((resolve, reject) => {
		fs.readFile(url, 'UTF-8', (err, contents) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(contents);
			}
		});
	});
}

setInterval(async () => {
	let mph = parseFloat(await readFile('./currentSpeed.txt')),
		incline = parseFloat(await readFile('./currentIncline.txt')),
		cadence = parseInt(await readFile('./currentCadence.txt'), 10);
	if (mph > 0 && Math.abs(incline) > 0) {
		let metersTraveled = mph
			/ secondsPerHour
			* metersPerMile
			* utils.convertElapsedToSeconds(process.hrtime(lastTrackedAt));
		lastTrackedAt = process.hrtime();
		let elevationDelta = metersTraveled * incline / 100;
		if (elevationDelta > 0) {
			elevationGain += elevationDelta;
		}
		else if (elevationDelta < 0) {
			elevationLoss -= elevationDelta;
		}
	}
	if (rscService.measurement.updateValueCallback) {
		rscService.measurement.updateValueCallback(Buffer.from(rscCalculator.calculateHex({
			mph: mph,
			// miles: 3.1,
			cadence: cadence
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
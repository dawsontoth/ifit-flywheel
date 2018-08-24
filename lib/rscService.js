let fs = require('fs'),
	util = require('util'),
	bleno = require('bleno');

let rscCalculator = require('./rscCalculator');

let RSCMeasurementCharacteristic = require('./rscMeasurementCharacteristic');
let RSCFeatureCharacteristic = require('./rscFeatureCharacteristic');

let RSCService = function() {
	this.measurement = new RSCMeasurementCharacteristic();

	RSCService.super_.call(this, {
		name: 'Treadmill',
		uuid: '1814',
		characteristics: [
			this.measurement,
			new RSCFeatureCharacteristic()
		]
	});

	setInterval(() => {
		if (this.measurement.updateValueCallback) {
			let rawSpeed = fs.readFileSync('./currentSpeed.txt', 'UTF-8'),
				rawCadence = fs.readFileSync('./currentCadence.txt', 'UTF-8'),
				data = Buffer.from(rscCalculator.calculateHex({
					mph: parseFloat(rawSpeed),
					// miles: 3.1,
					cadence: parseInt(rawCadence, 10)
				}), 'hex');
			this.measurement.updateValueCallback(data);
		}
	}, 1000);
};
util.inherits(RSCService, bleno.PrimaryService);

module.exports = RSCService;
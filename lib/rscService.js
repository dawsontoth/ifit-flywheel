let util = require('util'),
	bleno = require('bleno');

let RSCService = function() {
	this.measurement = new (require('./rscMeasurementCharacteristic'))();

	RSCService.super_.call(this, {
		name: 'Truthmill',
		uuid: '1814',
		characteristics: [
			this.measurement,
			new (require('./rscFeatureCharacteristic'))()
		]
	});
};
util.inherits(RSCService, bleno.PrimaryService);

module.exports = RSCService;
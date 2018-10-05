let util = require('util'),
	bleno = require('bleno');

let TreadmillService = function() {
	this.measurement = new (require('./treadmillDataCharacteristic'))();

	TreadmillService.super_.call(this, {
		name: 'Truthmill',
		uuid: '1826',
		characteristics: [
			this.measurement,
			new (require('./treadmillFeatureCharacteristic'))()
		]
	});
};
util.inherits(TreadmillService, bleno.PrimaryService);

module.exports = TreadmillService;
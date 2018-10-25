let util = require('util'),
	bleno = require('bleno'),
	constants = require('../../constants');

function TreadmillService() {
	this.measurement = new (require('./treadmillDataCharacteristic'))();

	TreadmillService.super_.call(this, {
		name: constants.NAME,
		uuid: '1826',
		characteristics: [
			this.measurement,
			new (require('./treadmillFeatureCharacteristic'))()
		]
	});
}

util.inherits(TreadmillService, bleno.PrimaryService);

module.exports = TreadmillService;
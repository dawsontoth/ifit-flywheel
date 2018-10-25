let util = require('util'),
	bleno = require('bleno');

function EnvironmentalSensingService() {
	this.measurement = new (require('./elevationCharacteristic'))();

	EnvironmentalSensingService.super_.call(this, {
		name: 'EnvironmentalSensing',
		uuid: '181A',
		characteristics: [
			this.measurement
		]
	});
}

util.inherits(EnvironmentalSensingService, bleno.PrimaryService);

module.exports = EnvironmentalSensingService;
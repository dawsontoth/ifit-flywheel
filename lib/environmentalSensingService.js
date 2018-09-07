let util = require('util'),
	bleno = require('bleno');

let EnvironmentalSensingService = function() {
	this.measurement = new (require('./environmentalSensingElevationCharacteristic'))();

	EnvironmentalSensingService.super_.call(this, {
		name: 'EnvironmentalSensing',
		uuid: '181A',
		characteristics: [
			this.measurement
		]
	});
};
util.inherits(EnvironmentalSensingService, bleno.PrimaryService);

module.exports = EnvironmentalSensingService;
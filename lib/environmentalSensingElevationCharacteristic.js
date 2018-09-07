let util = require('util'),
	bleno = require('bleno');

let EnvironmentalSensingElevationCharacteristic = function() {
	EnvironmentalSensingElevationCharacteristic.super_.call(this, {
		uuid: '2A6C',
		properties: ['read', 'notify'],
		value: null,
		descriptors: []
	});
};
util.inherits(EnvironmentalSensingElevationCharacteristic, bleno.Characteristic);

module.exports = EnvironmentalSensingElevationCharacteristic;
let util = require('util'),
	bleno = require('bleno');

let RSCMeasurementCharacteristic = function() {
	RSCMeasurementCharacteristic.super_.call(this, {
		uuid: '2A53',
		properties: ['notify'],
		value: null,
		descriptors: []
	});
};
util.inherits(RSCMeasurementCharacteristic, bleno.Characteristic);

module.exports = RSCMeasurementCharacteristic;
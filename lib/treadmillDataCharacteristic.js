let util = require('util'),
	bleno = require('bleno');

let TreadmillDataCharacteristic = function() {
	TreadmillDataCharacteristic.super_.call(this, {
		uuid: '2ACD',
		properties: ['notify'],
		value: null,
		descriptors: []
	});
};
util.inherits(TreadmillDataCharacteristic, bleno.Characteristic);

module.exports = TreadmillDataCharacteristic;
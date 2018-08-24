let util = require('util'),
	bleno = require('bleno');

// 16-bit feature flags
let feature = Buffer.from('0000000000000000', 'binary');

let RSCFeatureCharacteristic = function() {
	RSCFeatureCharacteristic.super_.call(this, {
		uuid: '2A54',
		properties: ['read'],
		value: feature,
		descriptors: []
	});
};
util.inherits(RSCFeatureCharacteristic, bleno.Characteristic);

RSCFeatureCharacteristic.prototype.onReadRequest = function(offset, callback) {
	console.log('read feature characteristic');
	let result = this.RESULT_SUCCESS,
		data = feature;
	if (offset > data.length) {
		result = this.RESULT_INVALID_OFFSET;
		data = null;
	}
	callback(result, data);
};

module.exports = RSCFeatureCharacteristic;
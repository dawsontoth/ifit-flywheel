#!/usr/bin/env node

process.env['BLENO_DEVICE_NAME'] = 'Dawson Treadmill';

let bleno = require('bleno');
(function() {

	// TODO: Try treadmill service, instead. See what Zwift makes of it!
	// https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.characteristic.treadmill_data.xml

	let RSCService = require('./lib/rscService');
	let rscService = new RSCService();

	bleno.on('stateChange', function(state) {
		console.log('on -> stateChange: ' + state);

		if (state === 'poweredOn') {
			bleno.startAdvertising('Treadmill', [rscService.uuid]);
		}
		else {
			bleno.stopAdvertising();
		}
	});

	bleno.on('advertisingStart', function(error) {
		console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));

		if (!error) {
			bleno.setServices([
				rscService
			]);
		}
	});
})();

require('death')(() => {
	bleno.disconnect();
	process.exit(0);
});
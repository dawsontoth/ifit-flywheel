let convertBase = require('../../lib/convertBase'),
	utils = require('../../lib/utils');

let metersPerMile = 1609.344;
let secondsPerHour = 3600;
let secondsPerMinute = 60;

exports.calculateHex = calculateHex;

// debugHex(
// 	calculateHex({
// 		mph: 6,
// 		cadence: 172
// 	})
// );

function calculateHex(args) {
	let metersPerSecond = args.mph / secondsPerHour * metersPerMile,
		metersPerMinute = metersPerSecond * secondsPerMinute,
		metersPerSecondRounded = Math.round(metersPerSecond * 256),
		reportDistance = args.miles !== undefined && args.miles !== null,
		meters = reportDistance ? args.miles * metersPerMile : 0,
		metersRounded = Math.round(meters * 10),
		stepsPerMinute = Math.round(args.cadence),
		metersPerStep = metersPerMinute / stepsPerMinute,
		metersPerStepRounded = Math.round(metersPerStep * 100),
		strideLengthBit = '1',
		totalDistanceBit = reportDistance ? '1' : '0',
		runningBit = args.mph >= 5 ? '1' : '0';
	// flags
	//      speed
	//              cadence
	//                   stride length
	//                           distance
	// 01   23 45   67   89 01   23 45 67 89
	// 07 - b5,06 - a0 - 00,00 - 3e,2a,00,00
	return utils.enforceLength(2, convertBase.bin2hex('00000' + strideLengthBit + totalDistanceBit + runningBit))
		+ utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(metersPerSecondRounded)))
		+ utils.enforceLength(2, convertBase.dec2hex(stepsPerMinute))
		+ utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(metersPerStepRounded)))
		+ utils.reverseBytes(utils.enforceLength(8, convertBase.dec2hex(metersRounded)));
}

function debugHex(hex) {
	let flags = convertBase.hex2bin(hex.substr(0, 2)),
		metersPerSecond = convertBase.hex2dec(utils.reverseBytes(hex.substr(2, 4))) / 256,
		milesPerHour = metersPerSecond / metersPerMile * 3600,
		cadence = convertBase.hex2dec(hex.substr(6, 2)),
		strideMeters = convertBase.hex2dec(utils.reverseBytes(hex.substr(8, 4))) / 100,
		meters = convertBase.hex2dec(utils.reverseBytes(hex.substr(12, 8))) / 10;
	console.log(
		hex
		+ ' | flags: ' + flags
		+ ' | cadence: ' + cadence
		+ ' | m/s: ' + metersPerSecond
		+ ' | mph: ' + milesPerHour
		+ ' | stride m: ' + strideMeters
		+ ' | distance meters: ' + meters
	);
}
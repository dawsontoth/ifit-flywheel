let convertBase = require('./convertBase');

let metersPerMile = 1609.344;

exports.calculateHex = calculateHex;

// debugHex(
// 	calculateHex({
// 		mph: 6,
// 		// miles: 3.1,
// 		cadence: 172
// 	})
// );

function calculateHex(args) {
	let metersPerSecond = args.mph / 3600 * metersPerMile,
		metersPerMinute = metersPerSecond * 60,
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
	return enforceLength(2, convertBase.bin2hex('00000' + strideLengthBit + totalDistanceBit + runningBit))
		+ reverseBytes(enforceLength(4, convertBase.dec2hex(metersPerSecondRounded)))
		+ enforceLength(2, convertBase.dec2hex(stepsPerMinute))
		+ reverseBytes(enforceLength(4, convertBase.dec2hex(metersPerStepRounded)))
		+ reverseBytes(enforceLength(8, convertBase.dec2hex(metersRounded)));
}

function reverseBytes(hex) {
	let parts = [];
	for (let i = 0; i < hex.length; i += 2) {
		parts.push(hex.substr(i, 2));
	}
	return parts.reverse().join('');
}

function enforceLength(length, hex) {
	hex = String(hex || '');
	// Overflow.
	if (hex.length > length) {
		return hex.slice(-1 * length);
	}
	for (let i = hex.length; i < length; i++) {
		hex = '0' + hex;
	}
	return hex;
}

function debugHex(hex) {
	let flags = convertBase.hex2bin(hex.substr(0, 2)),
		metersPerSecond = convertBase.hex2dec(reverseBytes(hex.substr(2, 4))) / 256,
		milesPerHour = metersPerSecond / metersPerMile * 3600,
		cadence = convertBase.hex2dec(hex.substr(6, 2)),
		strideMeters = convertBase.hex2dec(reverseBytes(hex.substr(8, 4))) / 100,
		meters = convertBase.hex2dec(reverseBytes(hex.substr(12, 8))) / 10;
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
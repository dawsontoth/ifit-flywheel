let convertBase = require('../../lib/convertBase'),
	utils = require('../../lib/utils');

let metersPerMile = 1609.344;
let metersPerKilometer = 1000;
let secondsPerHour = 3600;
let secondsPerMinute = 60;

exports.calculateHex = calculateHex;

function calculateHex(args) {
	let mph = args.mph,
		incline = args.incline,
		elevationGain = args.elevation && args.elevation.gain || 0,
		elevationLoss = args.elevation && args.elevation.loss || 0;

	let metersPerSecond = mph / secondsPerHour * metersPerMile,
		kilometersPerHour = metersPerSecond / metersPerKilometer * secondsPerHour,
		kilometersPerHourRounded = Math.round(kilometersPerHour * 100),
		kilometersPerMinute = metersPerSecond * metersPerKilometer * secondsPerMinute,
		kilometersPerMinuteRounded = Math.round(kilometersPerMinute * 10),
		inclineRounded = Math.round(incline * 10),
		degrees = Math.atan(incline / 100) * 180 / Math.PI,
		degreesRounded = Math.round(degrees * 10),
		elevationGainRounded = Math.round(elevationGain * 10),
		elevationLossRounded = Math.round(elevationLoss * 10);

	// Bits, in order:
	//    0. More Data
	//    1. Average Speed Present
	//    2. Total Distance Present
	//    3. Inclination and Ramp Angle Setting Present
	//    4. Elevation Gain Present
	//    5. Instantaneous Pace Present
	//    6. Average Pace Present
	//    7. Expended Energy Present
	//    8. Heart Rate Present
	//    9. Metabolic Equivalent Present
	//   10. Elapsed Time Present
	//   11. Remaining Time Present
	//   12. Force on Belt and Power Output Present
	//   13-15. Reserved for Future Use
	//                                                       0123456789012345
	return utils.enforceLength(4, convertBase.bin2hex('1001110000000000'))
		// instantaneous speed
		+ utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(kilometersPerHourRounded)))
		// average speed
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		// total distance
		// + utils.reverseBytes(utils.enforceLength(6, convertBase.dec2hex(0)))
		// inclination
		+ utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(inclineRounded)))
		// ramp angle setting
		+ utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(degreesRounded)))
		// positive elevation gain
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(elevationGainRounded)))
		// negative elevation gain
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(elevationLossRounded)))
		// instantaneous pace
		// + utils.reverseBytes(utils.enforceLength(2, convertBase.dec2hex(kilometersPerMinuteRounded)))
		// average pace
		// + utils.reverseBytes(utils.enforceLength(2, convertBase.dec2hex(0)))
		// total energy
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		// energy per hour
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		// energy per minute
		// + utils.reverseBytes(utils.enforceLength(2, convertBase.dec2hex(0)))
		// heart rate
		// + utils.reverseBytes(utils.enforceLength(2, convertBase.dec2hex(0)))
		// metabolic equivalent
		// + utils.reverseBytes(utils.enforceLength(2, convertBase.dec2hex(0)))
		// elapsed time
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		// remaining time
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		// force on belt
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		// power output
		// + utils.reverseBytes(utils.enforceLength(4, convertBase.dec2hex(0)))
		;
}

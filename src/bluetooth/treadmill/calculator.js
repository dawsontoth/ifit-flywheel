let utils = require('../../lib/utils'),
	convert = require('../../lib/convertBase');

let metersPerMile = 1609.344;
let metersPerKilometer = 1000;
let secondsPerHour = 3600;
let secondsPerMinute = 60;

exports.calculateBuffer = calculateBuffer;

// console.log((calculateBuffer({
// 	mph: 6,
// 	incline: 3,
// 	elevation: {
// 		gain: 200,
// 		loss: 100
// 	}
// }).toString('hex')));

function calculateBuffer(args) {
	let mph = args.mph,
		incline = args.incline,
		elevationGain = args.elevation && args.elevation.gain || 0,
		elevationLoss = args.elevation && args.elevation.loss || 0;

	let metersPerSecond = mph ? mph / secondsPerHour * metersPerMile : 0,
		kilometersPerHour = metersPerSecond ? metersPerSecond / metersPerKilometer * secondsPerHour : 0,
		kilometersPerHourRounded = Math.round(kilometersPerHour * 100),
		kilometersPerMinute = metersPerSecond ? metersPerSecond / metersPerKilometer * secondsPerMinute : 0,
		kilometersPerMinuteRounded = Math.round(kilometersPerMinute * 10),
		inclineRounded = Math.round(incline * 10),
		degrees = incline ? (Math.atan(incline / 100) * 180 / Math.PI) : 0,
		degreesRounded = Math.round(degrees * 10),
		elevationGainRounded = Math.round(elevationGain * 10),
		elevationLossRounded = Math.round(elevationLoss * 10),
		flags = {
			InstantaneousSpeed: false,
			AverageSpeedPresent: false,
			TotalDistancePresent: false,
			InclinationAndRampAngleSettingPresent: true,
			ElevationGainPresent: false,
			InstantaneousPacePresent: false,
			AveragePacePresent: false,
			ExpendedEnergyPresent: false,
			HeartRatePresent: false,
			MetabolicEquivalentPresent: false,
			ElapsedTimePresent: false,
			RemainingTimePresent: false,
			ForceOnBeltAndPowerOutputPresent: false,
			ReservedForFutureUse1: false,
			ReservedForFutureUse2: false,
			ReservedForFutureUse3: false
		};

	return utils
		.bufferHelper()
		.write(16, utils.convertFlags(flags))
		.write(16, kilometersPerHourRounded)
		.write(16, inclineRounded, true)
		.write(16, degreesRounded, true)
		// .write(16, elevationGainRounded)
		// .write(16, elevationLossRounded)
		.finish();
}

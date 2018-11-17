let fs = require('fs'),
	path = require('path'),
	ref = path.resolve(__dirname, '..', 'constants.json'),
	store = fs.existsSync(ref) ? JSON.parse(fs.readFileSync(ref, 'UTF-8')) : {};

let USE_HR_TIME = true;

let NANOSECONDS_IN_A_SECOND = 1e9;
let MILLISECONDS_IN_A_SECOND = 1e3;
let BASE_RPS = 33.00991828685567;
module.exports = {

	NAME: 'ProForm Pro 9000',
	IFIT_IP: '192.168.1.241',

	BASE_RPS: BASE_RPS,
	get KNOWN_RPS() {
		return read('KNOWN_RPS', BASE_RPS);
	},
	set KNOWN_RPS(val) {
		write('KNOWN_RPS', BASE_RPS, val);
	},
	KNOWN_MPH: 6,

	INPUT_PIN: 27, // 4: physical pin 7, 17 is 2 below it, at physical pin 11
	// https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/#prettyPhoto/0/
	OCCURRENCES_ON_THE_WHEEL: 1,
	USE_HR_TIME: USE_HR_TIME,
	PASS_AVERAGE_PERIOD: 10,
	PASS_AVERAGE_MAX: 10,
	PASS_AVERAGE_TOLERANCE: 0.1,

	MIN_SPEED: 0.8,
	MAX_SPEED: 16,
	MIN_CADENCE: 90,
	MAX_CADENCE: 230,

	METERS_PER_MILE: 1609.344,

	SECONDS_PER_HOUR: 3600,
	NANOSECONDS_IN_A_SECOND: NANOSECONDS_IN_A_SECOND,
	MILLISECONDS_IN_A_SECOND: MILLISECONDS_IN_A_SECOND,

	UPDATE_INTERVAL_TIMEOUT: 1e3,
	MAX_DELAY_FOR_ZERO: 3 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
	SPEED_SAMPLE_PERIOD: 5 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
	CADENCE_SAMPLE_PERIOD: 12 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND),
	HIGHS_TOLERANCE_MIN_PERCENT: 0.02,
	HIGHS_TOLERANCE_MAX_PERCENT: 0.09,
	SIGNIFICANT_SPEED_SHIFT_THRESHOLD: 0.2
};

function read(key, def) {
	if (store[key] === undefined) {
		return def;
	}
	return store[key];
}

function write(key, def, val) {
	if (store[key] === val) {
		return;
	}
	if (def === val) {
		delete store[key];
	}
	else {
		store[key] = val;
	}
	fs.writeFile(ref, JSON.stringify(store, null, '\t'), 'UTF-8', noop);
}

function noop(err) {
	if (err) {
		console.error(err);
	}
}
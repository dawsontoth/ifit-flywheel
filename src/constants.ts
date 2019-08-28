import fs from 'fs';
import path from 'path';

let ref = path.resolve(__dirname, '..', 'constants.json'),
	store = fs.existsSync(ref) ? JSON.parse(fs.readFileSync(ref, 'UTF-8')) : {};

export const BASE_RPS = 33.00991828685567;
export const KNOWN_MPH = 6;
export const INPUT_PIN = 21;
// https=//www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/#prettyPhoto/0/
export const OCCURRENCES_ON_THE_WHEEL = 1;
export const USE_HR_TIME = true;
export const PASS_AVERAGE_PERIOD = 10;
export const PASS_AVERAGE_MAX = 10;
export const PASS_AVERAGE_TOLERANCE = 0.1;
export const MIN_SPEED = 0.8;
export const MAX_SPEED = 16;
export const MIN_CADENCE = 90;
export const MAX_CADENCE = 230;
export const NANOSECONDS_IN_A_SECOND = 1e9;
export const MILLISECONDS_IN_A_SECOND = 1e3;

export const UPDATE_INTERVAL_TIMEOUT = 1e3;
export const MAX_DELAY_FOR_ZERO = 3 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
export const SPEED_SAMPLE_PERIOD = 5 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
export const CADENCE_SAMPLE_PERIOD = 12 * (USE_HR_TIME ? NANOSECONDS_IN_A_SECOND : MILLISECONDS_IN_A_SECOND);
export const FREEZE_CADENCE_TIMEOUT = 13e3;
export const SIGNIFICANT_SPEED_SHIFT_THRESHOLD = 0.1;
export const HIGHS_TOLERANCE_MIN_PERCENT = 0.02;
export const HIGHS_TOLERANCE_MAX_PERCENT = 0.09;

export function readKnownRPS() {
	return read('KNOWN_RPS', BASE_RPS);
}

export function setKnownRPS(val) {
	write('KNOWN_RPS', BASE_RPS, val);
}

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
	} else {
		store[key] = val;
	}
	fs.writeFile(ref, JSON.stringify(store, null, '\t'), 'UTF-8', noop);
}

function noop(err) {
	if (err) {
		console.error(err);
	}
}
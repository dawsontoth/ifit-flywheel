exports.NAME = 'Truthmill';

// Known ratio: x rotations when running at y miles per hour.
exports.RPS_RATIO = 33.00991828685567 / 6;
exports.OCCURRENCES_ON_THE_WHEEL = 1;

exports.INPUT_PIN = 27; // 4 = physical pin 7, 17 is 2 below it, at physical pin 11
// https://www.raspberrypi-spy.co.uk/2012/06/simple-guide-to-the-rpi-gpio-header-and-pins/#prettyPhoto/0/
exports.USE_HR_TIME = true;
exports.PASS_AVERAGE_PERIOD = 10;
exports.PASS_AVERAGE_MAX = 10;
exports.PASS_AVERAGE_TOLERANCE = 0.1;

exports.MIN_SPEED = 0.8;
exports.MAX_SPEED = 16;
exports.MIN_CADENCE = 90;
exports.MAX_CADENCE = 230;

exports.METERS_PER_MILE = 1609.344;

exports.SECONDS_PER_HOUR = 3600;
exports.NANOSECONDS_IN_A_SECOND = 1e9;
exports.MILLISECONDS_IN_A_SECOND = 1e3;

exports.UPDATE_EVERY_MILLISECONDS = 1e3;
exports.SPEED_SAMPLE_PERIOD = 5 * (exports.USE_HR_TIME ? exports.NANOSECONDS_IN_A_SECOND : exports.MILLISECONDS_IN_A_SECOND);
exports.CADENCE_SAMPLE_PERIOD = 12 * (exports.USE_HR_TIME ? exports.NANOSECONDS_IN_A_SECOND : exports.MILLISECONDS_IN_A_SECOND);
exports.HIGHS_TOLERANCE_MIN_PERCENT = 0.02;
exports.HIGHS_TOLERANCE_MAX_PERCENT = 0.09;
exports.SIGNIFICANT_SPEED_SHIFT_THRESHOLD = 0.2;
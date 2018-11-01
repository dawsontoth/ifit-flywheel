let outliers = require('./outliers'),
	web = require('../lib/web');

module.exports = function findHighs(on, toleranceMin, toleranceMax) {
	// console.time('filtering');
	// on = outliers.filter(on);
	// console.timeEnd('filtering');

	let avg = average(on),
		max = Math.max(...on),
		diff = max - avg,
		delta = diff / avg,
		highsFound = 0,
		foundSignificantChange = diff && avg && (
			delta >= toleranceMin
			&& delta <= toleranceMax
		);
	web.payload.CadenceDelta = delta;
	// console.log('Cadence Delta', delta);

	if (foundSignificantChange) {
		let isHigh = false,
			lowCount = 0,
			highCount = 0,
			countToSwitch = 3;
		on.forEach(value => {
			if (isHigh) {
				if (value <= avg) {
					lowCount += 1;
				}
				if (lowCount > countToSwitch) {
					isHigh = false;
					lowCount = 0;
				}
			}
			else {
				if (value > avg) {
					highCount += 1;
				}
				if (highCount > countToSwitch) {
					isHigh = true;
					highCount = 0;
					highsFound += 1;
				}
			}
		});
	}
	return highsFound;
};

function average(list) {
	return list.reduce((a, b) => a + b, 0) / list.length;
}

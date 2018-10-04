let outliers = require('./outliers'),
	statistics = require('./statistics');

module.exports = function findHighs(on, toleranceMin, toleranceMax) {
	on = outliers.filter(on);

	let average = statistics.average(on),
		maximum = Math.max(...on),
		diff = maximum - average,
		delta = diff / average,
		highsFound = 0,
		foundSignificantChange = diff && average && (
			delta >= toleranceMin
			&& delta <= toleranceMax
		);
	// console.log('Cadence Delta', delta);

	if (foundSignificantChange) {
		let isHigh = false,
			lowCount = 0,
			highCount = 0,
			countToSwitch = 3;
		on.forEach(value => {
			if (isHigh) {
				if (value <= average) {
					lowCount += 1;
				}
				if (lowCount > countToSwitch) {
					isHigh = false;
					lowCount = 0;
				}
			}
			else {
				if (value > average) {
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

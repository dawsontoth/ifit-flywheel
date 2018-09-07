let outliers = require('./outliers'),
	statistics = require('./statistics');

module.exports = function findHighs(on, tolerance) {
	on = outliers.filter(on);
	let average = statistics.average(on),
		maximum = Math.max(...on),
		diff = maximum - average,
		highsFound = 0,
		foundSignificantChange = diff / average > tolerance;

	if (foundSignificantChange) {
		let isHigh = false,
			lowCount = 0,
			highCount = 0,
			countToSwitch = 2;
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
	return foundSignificantChange ? highsFound : 0;
};

// console.log(
// 	module.exports(require('../data/cadence-passes-on-0.json')),
// 	module.exports(require('../data/cadence-passes-0.json'))
// );
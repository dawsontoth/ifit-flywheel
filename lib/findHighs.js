let outliers = require('./outliers'),
	statistics = require('./statistics');

module.exports = function findHighs(on) {
	on = outliers.filter(clean(on).filter(f => f > 0));
	let average = statistics.average(on),
		maximum = Math.max(...on),
		diff = maximum - average,
		highsFound = 0,
		foundSignificantChange = diff / average > 0.01;
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

function clean(counters) {
	let firstChangedToOnIndex = counters.findIndex((count, index) => index > 0 && count > 0),
		lastChangedToOffIndex = counters.lastIndexOf(counters.slice().reverse().find((count, index) => index > 0 && count < 0))
	return counters.slice(firstChangedToOnIndex + 7, lastChangedToOffIndex - 7);
}

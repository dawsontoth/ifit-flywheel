module.exports = function findHighs(on) {
	on = filterOutliers(clean(on).filter(f => f > 0));
	let average = avg(on),
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
}

function clean(counters) {
	let firstChangedToOnIndex = counters.findIndex((count, index) => index > 0 && count > 0),
		lastChangedToOffIndex = counters.lastIndexOf(counters.slice().reverse().find((count, index) => index > 0 && count < 0))
	return counters.slice(firstChangedToOnIndex + 7, lastChangedToOffIndex - 7);
}

function avg(v) {
	return v.reduce((a, b) => a + b, 0) / v.length;
}

function filterOutliers(someArray) {

	if (someArray.length < 4) {
		return someArray;
	}

	let values, q1, q3, iqr, maxValue, minValue;

	values = someArray.slice().sort((a, b) => a - b);//copy array fast and sort

	if ((values.length / 4) % 1 === 0) {//find quartiles
		q1 = 1 / 2 * (values[(values.length / 4)] + values[(values.length / 4) + 1]);
		q3 = 1 / 2 * (values[(values.length * (3 / 4))] + values[(values.length * (3 / 4)) + 1]);
	} else {
		q1 = values[Math.floor(values.length / 4 + 1)];
		q3 = values[Math.ceil(values.length * (3 / 4) + 1)];
	}

	iqr = q3 - q1;
	maxValue = q3 + iqr * 1.5;
	minValue = q1 - iqr * 1.5;

	return someArray.filter(x => (x >= minValue) && (x <= maxValue));
}

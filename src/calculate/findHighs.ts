import * as web from '../web';

export function findHighs(on, toleranceMin, toleranceMax) {
	let avg = average(on),
		max = Math.max(...on),
		diff = max - avg,
		delta = diff / avg,
		highsFound = 0,
		foundSignificantChange = diff && avg && (
			delta >= toleranceMin
			&& delta <= toleranceMax
		);
	web.payload.CadenceDelta = Math.round(delta * 1000) / 100;

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
			} else {
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
}

export function average(list) {
	return list.reduce((a, b) => a + b, 0) / list.length;
}

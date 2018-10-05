let fs = require('fs');

let allWiths = [],
	allWithouts = [];
for (let i = 0; i < 1; i++) {
	let cadWith = JSON.parse(fs.readFileSync('./cadence-passes-' + i + '.json', 'UTF-8'));
	allWiths.push(...clean(cadWith));
	let cadWithout = JSON.parse(fs.readFileSync('./cadence-passes-without-' + i + '.json', 'UTF-8'));
	allWithouts.push(...clean(cadWithout));
}

function clean(counters) {
	let firstChangedToOnIndex = counters.findIndex((count, index) => index > 0 && count > 0),
		lastChangedToOffIndex = counters.lastIndexOf(counters.slice().reverse().find((count, index) => index > 0 && count < 0))
	return counters.slice(firstChangedToOnIndex + 7, lastChangedToOffIndex - 7);
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

// fs.writeFileSync('all-with.json', JSON.stringify(allWiths));
// fs.writeFileSync('all-without.json', JSON.stringify(allWithouts));

let allWithsOn = filterOutliers(allWiths.filter(f => f > 0));
let allWithoutsOn = filterOutliers(allWithouts.filter(f => f > 0));
let min = Math.min(allWithsOn.length, allWithoutsOn.length);

fs.writeFileSync('all-with-on.json', JSON.stringify(allWithsOn.slice(0, min)));
fs.writeFileSync('all-without-on.json', JSON.stringify(allWithoutsOn.slice(0, min)));

// let allWithsOff = allWiths.filter(f => f < 0);
// let allWithoutsOff = allWithouts.filter(f => f < 0);

// function sum(arr) {
// 	return arr.reduce((total, current) => total + current, 0);
// }

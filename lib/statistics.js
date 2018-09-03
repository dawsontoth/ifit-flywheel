exports.average = average;

function average(v) {
	return v.reduce((a, b) => a + b, 0) / v.length;
}

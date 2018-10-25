exports.average = average;

function average(list) {
	return list.reduce((a, b) => a + b, 0) / list.length;
}

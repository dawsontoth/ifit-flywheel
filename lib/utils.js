exports.reverseBytes = reverseBytes;
exports.enforceLength = enforceLength;

function reverseBytes(hex) {
	let parts = [];
	for (let i = 0; i < hex.length; i += 2) {
		parts.push(hex.substr(i, 2));
	}
	return parts.reverse().join('');
}

function enforceLength(length, hex) {
	hex = String(hex || '');
	// Overflow.
	if (hex.length > length) {
		return hex.slice(-1 * length);
	}
	for (let i = hex.length; i < length; i++) {
		hex = '0' + hex;
	}
	return hex;
}

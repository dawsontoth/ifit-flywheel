let constants = require('../constants');

/*
 Public API.
 */
exports.reverseBytes = reverseBytes;
exports.enforceLength = enforceLength;
exports.convertElapsedToNanoseconds = convertElapsedToNanoseconds;
exports.convertElapsedToSeconds = convertElapsedToSeconds;
exports.bufferHelper = bufferHelper;
exports.convertFlags = convertFlags;

/*
 Implementation.
 */

function reverseBytes(hex) {
	let parts = [];
	for (let i = 0; i < hex.length; i += 2) {
		parts.push(hex.substr(i, 2));
	}
	return parts.reverse().join('');
}

function enforceLength(length, hex) {
	hex = String(hex || '');
	if (hex.length > length) {
		return hex.slice(-1 * length);
	}
	for (let i = hex.length; i < length; i++) {
		hex = '0' + hex;
	}
	return hex;
}

function convertElapsedToNanoseconds(elapsed) {
	return elapsed[0] * constants.NANOSECONDS_IN_A_SECOND + elapsed[1];
}

function convertElapsedToSeconds(elapsed) {
	return convertElapsedToNanoseconds(elapsed) / constants.NANOSECONDS_IN_A_SECOND;
}

function bufferHelper() {
	let parts = [],
		at = 0,
		self = {
			write: (size, data, signed, bigEndian) => {
				parts.push([at, size, data, signed, bigEndian]);
				at += size / 8;
				return self;
			},
			finish: () => {
				let buffer = Buffer.alloc(at);
				parts.forEach(part => {
					let [at, size, data, signed, bigEndian] = part;
					try {
						if (signed) {
							if (bigEndian) {
								buffer.writeIntBE(data, at, size / 8);
							}
							else {
								buffer.writeIntLE(data, at, size / 8);
							}
						}
						else {
							if (bigEndian) {
								buffer.writeUIntBE(data, at, size / 8);
							}
							else {
								buffer.writeUIntLE(data, at, size / 8);
							}
						}
					}
					catch (err) {
						console.error(part);
						console.error(parts);
						console.error(err);
					}
				});
				return buffer;
			}
		};
	return self;
}

function convertFlags(flags) {
	return require('./convertBase')
		.bin2dec(
			Object
				.values(flags)
				.map(v => v ? '1' : '0')
				.reverse()
				.join('')
		);
}
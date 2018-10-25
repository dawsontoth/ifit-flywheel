let convertBase = require('../../lib/convertBase'),
	utils = require('../../lib/utils');

exports.calculateHex = calculateHex;

function calculateHex(args) {
	let elevation = args.elevation;

	let elevationRounded = Math.round(elevation * 100);

	return utils.enforceLength(6, convertBase.bin2hex(elevationRounded));
}

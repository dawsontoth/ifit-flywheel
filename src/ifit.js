let WebSocket = require('websocket'),
	constants = require('./constants'),
	ipc = require('./lib/ipc'),
	web = require('./lib/web');

/*
 State.
 */
let speed = 0,
	cadence = 0,
	incline = 0,
	connected = false;
web.payload.RotationsAvg = constants.KNOWN_RPS;
web.payload.Speed = 0;
web.payload.SpeedRaw = 0;

/*
 Initialization.
 */
let client = new (WebSocket.client)();
ipc.boot(ipc.keys.ifit);
require('death')(cleanUp);
setInterval(ensureConnected, 5e3);
ensureConnected();

/*
 Implementation.
 */

client.on('connectFailed', function(error) {
	connected = false;
	console.log('Connect Error: ' + error.toString());
});

client.on('connect', connection => {
	connected = true;
	connection.on('message', message => {
		let parsed = safeParse(message.utf8Data || message.data),
			changeDetected = false;
		if (parsed.values) {
			parsed = parsed.values;
		}
		if (parsed['MPH'] !== undefined) {
			speed = parsed['MPH'];
			web.payload.SpeedRaw = speed;
			web.payload.RotationsAvg = speed < 0.1 ? constants.BASE_RPS : (speed / constants.KNOWN_MPH * constants.BASE_RPS);
			speed = speed < 0.1 ? 0 : (speed / constants.KNOWN_RPS * constants.BASE_RPS);
			// speed = speed < 0.1 ? 0 : (speed + 0.2);
			web.payload.Speed = speed;
			changeDetected = true;
			cadence = speed > 0.1 ? 180 : 0;
		}
		if (parsed['Actual Incline'] !== undefined) {
			incline = parsed['Actual Incline'];
			changeDetected = true;
		}
		// console.log(parsed);
		// console.log(speed, incline);
		if (changeDetected) {
			ipc.send(ipc.keys.bluetooth, { speed: speed, cadence: cadence, incline: incline });
		}
	});
	connection.on('error', error => console.log('Connection Error: ' + error.toString()));
	connection.on('close', () => {
		connected = false;
		console.log('Connection Closed');
	});
});

function ensureConnected() {
	if (!connected) {
		client.connect(`ws://${constants.IFIT_IP}/control`);
	}
}

function safeParse(string) {
	try {
		return JSON.parse(string);
	}
	catch (err) {
		return null;
	}
}

function cleanUp() {
	try {
		ipc.stop();
	}
	catch (err) {
		console.error(err);
	}
	process.exit(0);
}

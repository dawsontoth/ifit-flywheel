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
		let parsed = safeParse(message.utf8Data || message.data);
		if (parsed.values) {
			parsed = parsed.values;
		}
		if (parsed['MPH'] !== undefined) {
			speed = parsed['MPH'];
		}
		if (parsed['Actual Incline'] !== undefined) {
			incline = parsed['Actual Incline'];
		}
		// console.log(parsed);
		// console.log(speed, incline);
		// TODO: Report heart rate, too?
		// TODO: Any way to calculate cadence with iFit?
		cadence = speed ? 180 : 0;
		web.payload.RotationsAvg = speed === 0 ? 0 : (speed / constants.KNOWN_MPH * constants.KNOWN_RPS);
		web.payload.SpeedRaw = speed;
		let adjustedSpeed = speed === 0 ? 0 : (speed / constants.KNOWN_RPS * constants.BASE_RPS);
		web.payload.Speed = adjustedSpeed;
		ipc.send(ipc.keys.bluetooth, { speed: adjustedSpeed, cadence: cadence, incline: incline });
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

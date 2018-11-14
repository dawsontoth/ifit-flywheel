let WebSocket = require('websocket'),
	constants = require('./constants'),
	ipc = require('./lib/ipc'),
	web = require('./lib/web');

/*
 State.
 */
let speed = 0,
	cadence = 0,
	incline = 0;
web.payload.RotationsAvg = constants.KNOWN_RPS;
web.payload.Speed = 0;
web.payload.SpeedRaw = 0;

/*
 Initialization.
 */
let client = new (WebSocket.client)();
ipc.boot(ipc.keys.ifit);
require('death')(cleanUp);

/*
 Implementation.
 */

client.on('connectFailed', function(error) {
	console.log('Connect Error: ' + error.toString());
});

client.on('connect', connection => {
	connection.on('message', message => {
		// TODO: Parse speed from message body.
		// Might be: MPH? Chest Pulse? Actual Incline?
		if (typeof message.data === 'string') {
			console.log(`Received string data: '${message.data}'`);
			let parsed = JSON.parse(message.data);
			if (parsed['MPH'] !== undefined) {
				speed = parsed['MPH'];
			}
			if (parsed['Actual Incline'] !== undefined) {
				incline = parsed['Actual Incline'];
			}
			// TODO: Report heart rate, too.
			// TODO: Any way to calculate cadence with iFit?
			cadence = speed ? 180 : 0;
		}
		else if (message.type === 'utf8') {
			console.log(`Received UTF-8 data: '${message.utf8Data}'`);
		}
		else {
			console.log(`Received message of some sort:`);
			console.log(message);
		}
		web.payload.RotationsAvg = speed === 0 ? 0 : (speed / constants.KNOWN_MPH * constants.KNOWN_RPS);
		web.payload.SpeedRaw = speed;
		let adjustedSpeed = speed === 0 ? 0 : (speed / constants.KNOWN_RPS * constants.BASE_RPS);
		web.payload.Speed = adjustedSpeed;
		ipc.send(ipc.keys.bluetooth, { speed: adjustedSpeed, cadence: cadence, incline: incline });
	});
	connection.on('error', error => console.log('Connection Error: ' + error.toString()));
	connection.on('close', () => console.log('Connection Closed'));
});

// TODO: Replace with port of the treadmill.
// TODO: Can I scan for the treadmill?
client.connect(`ws://${constants.IFIT_IP}/`, 'control');

function cleanUp() {
	try {
		ipc.stop();
	}
	catch (err) {
		console.error(err);
	}
	process.exit(0);
}

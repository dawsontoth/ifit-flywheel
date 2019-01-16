let ipc = require('./lib/ipc'),
	WebSocketServer = require('websocket').server,
	http = require('http');

/*
 State.
 */
let wsServer,
	httpServer,
	latest = {
		Cadence: '0',
		MPH: '0'
	};

/*
 Initialization.
 */
ipc.received = receivedData;
ipc.boot(ipc.keys.ifit);
httpServer = http.createServer(respondToHTTP);
httpServer.listen(8080, serverListening);
wsServer = new WebSocketServer({
	httpServer: httpServer,
	autoAcceptConnections: true
});
wsServer.on('connect', onConnect);
require('death')(cleanUp);

/*
 Implementation.
 */

function receivedData(data) {
	for (let key in data) {
		if (data.hasOwnProperty(key)) {
			switch (key) {
				case 'cadence':
					latest['Cadence'] = String(data[key]);
					break;
				case 'speed':
					latest['MPH'] = String(data[key]);
					break;
			}
		}
	}
	wsServer.broadcastUTF(JSON.stringify(latest));
}

function serverListening() {
	console.log('IFit-Emulator: listening on port 8080');
}

function respondToHTTP(request, response) {
	// console.log('IFit-Emulator: Received request for ' + request.url);
	response.writeHead(404);
	response.end();
}

function onConnect(connection) {
	connection.sendUTF(JSON.stringify(latest));
	connection.on('message', onMessage);
	connection.on('close', onClose);

	function onMessage(message) {
		// We ignore messages, since we can't currently control the treadmill.
		// if (message.type === 'utf8') {
		// 	connection.sendUTF(message.utf8Data);
		// }
	}

	function onClose() {
		// console.log((new Date()) + ': Peer ' + connection.remoteAddress + ' disconnected.');
	}
}

function cleanUp() {
	try {
		ipc.stop();
		wsServer.shutDown();
	}
	catch (err) {
		console.error(err);
	}
	process.exit(0);
}
let ipc = require('node-ipc');

let ports = {
	trigger: 8001,
	calculate: 8002,
	ifit: 8003,
	bluetooth: 8004
};

exports.keys = {
	trigger: 'trigger',
	calculate: 'calculate',
	ifit: 'ifit',
	bluetooth: 'bluetooth'
};

exports.received = function noop(data) {
};

exports.boot = function(key) {
	ipc.config.id = key;
	ipc.config.silent = true;
	ipc.config.logDepth = 1;
	ipc.config.retry = 1500;

	ipc.serveNet(
		ports[key],
		'udp4',
		() => {
			exports.connected = true;
			ipc.server.on(
				'message',
				data => {
					exports.received(JSON.parse(data.message));
				}
			);
		}
	);

	ipc.server.start();
};

exports.send = function(toKey, data) {
	if (!exports.connected) {
		return;
	}
	ipc.server.emit(
		{
			address: '127.0.0.1',
			port: ports[toKey]
		},
		'message',
		{
			from: ipc.config.id,
			message: JSON.stringify(data)
		}
	);
};

exports.stop = function() {
	try {
		exports.connected = false;
		ipc.server.stop();
	}
	catch (err) {
		console.error(err);
	}
};
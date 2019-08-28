import ipc from 'node-ipc';

export let connected = false;
export let received = noop;
export const ports = {
	trigger: 8001,
	calculate: 8002,
	ifit: 8003,
};

export function setReceived(callback) {
	received = callback;
}

export const keys = {
	trigger: 'trigger',
	calculate: 'calculate',
	ifit: 'ifit',
};

export function boot(key) {
	ipc.config.id = key;
	ipc.config.silent = true;
	ipc.config.logDepth = 1;
	ipc.config.retry = 1500;

	ipc.serveNet(
		ports[key],
		'udp4',
		() => {
			connected = true;
			ipc.server.on(
				'message',
				data => {
					received(JSON.parse(data.message));
				},
			);
		},
	);

	ipc.server.start();
}

export function send(toKey, data) {
	if (!connected) {
		return;
	}
	ipc.server.emit(
		{
			address: '127.0.0.1',
			port: ports[toKey],
		},
		'message',
		{
			from: ipc.config.id,
			message: JSON.stringify(data),
		},
	);
}

export function stop() {
	try {
		connected = false;
		ipc.server.stop();
	} catch (err) {
		console.error(err);
	}
}

function noop(data) {
}

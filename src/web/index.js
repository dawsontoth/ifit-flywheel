let http = require('http'),
	url = require('url'),
	fs = require('fs'),
	path = require('path');

let constants = require('../constants');

exports.payload = {};
exports.ipc = null;

let baseDirectory = __dirname,
	port = 1337,
	staticFiles = {};

fs.readdirSync(baseDirectory)
	.filter(f =>
		f
		&& f[0] !== '.'
		&& (f.endsWith('.css')
		|| f.endsWith('.html'))
	)
	.forEach(f => {
		staticFiles['/' + (f.endsWith('.html') ? f.substr(0, f.lastIndexOf('.')) : f)] = '/' + f;
	});

http
	.createServer((request, response) => {
		try {
			let requestUrl = url.parse(request.url),
				fsPath = path.normalize(requestUrl.pathname);
			switch (fsPath) {
				// Root
				case '/':
					fsPath = '/stats.html';
					break;
				// API
				case '/payload.json':
					response.writeHead(200);
					response.write(JSON.stringify(exports.payload));
					response.end();
					return;
				case '/set':
					let body = [];
					request
						.on('data', (chunk) => {
							body.push(chunk);
						})
						.on('end', () => {
							body = Buffer.concat(body).toString();
							let ipc = exports.ipc,
								parts = body.split('=');
							if (ipc && ['Incline', 'Speed', 'Cadence'].indexOf(parts[0]) >= 0) {
								ipc.send(ipc.keys.bluetooth, { [parts[0].toLowerCase()]: parseFloat(parts[1]) });
							}
							response.writeHead(200);
							response.write('Set!');
							response.end();
						});
					return;
				case '/save-rotations':
					constants.KNOWN_RPS = exports.payload.RotationsAvg;
					response.writeHead(200);
					response.write('Saved!');
					response.end();
					return;
				default:
					if (staticFiles[fsPath]) {
						fsPath = staticFiles[fsPath];
					}
					else {
						response.writeHead(404);
						response.write('Not found!');
						response.end();
						return;
					}
			}
			let fileStream = fs.createReadStream(baseDirectory + fsPath);
			fileStream.on('open', () => {
				return response.writeHead(200);
			});
			fileStream.on('error', e => {
				response.writeHead(404);
				response.end();
			});
			fileStream.pipe(response);
		}
		catch (e) {
			response.writeHead(500);
			response.end();
			console.log(e.stack);
		}
	})
	.listen(port);

console.log('http://localhost:' + port);

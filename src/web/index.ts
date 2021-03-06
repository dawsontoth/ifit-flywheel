import fs from 'fs';
import http from 'http';
import path from 'path';
import url from 'url';
import * as constants from '../constants';

export let payload: any = {};

let baseDirectory = path.resolve(path.join(__dirname, '../../src/web')),
	port = 1338,
	staticFiles = {};

fs.readdirSync(baseDirectory)
	.filter(f =>
		f
		&& f[0] !== '.'
		&& (f.endsWith('.css')
		|| f.endsWith('.html')),
	)
	.forEach(f => {
		staticFiles['/' + (f.endsWith('.html') ? f.substr(0, f.lastIndexOf('.')) : f)] = '/' + f;
	});

http
	.createServer((request, response) => {
		try {
			if (!request.url) {
				response.writeHead(500);
				response.end();
				return;
			}
			let requestUrl = url.parse(request.url);
			if (!requestUrl.pathname) {
				response.writeHead(500);
				response.end();
				return;
			}
			let fsPath = path.normalize(requestUrl.pathname);
			switch (fsPath) {
				// Root
				case '/':
					fsPath = '/stats.html';
					break;
				// API
				case '/payload.json':
					response.writeHead(200);
					response.write(JSON.stringify(payload));
					response.end();
					return;
				case '/save-rotations':
					constants.setKnownRPS(payload.RotationsAvg);
					response.writeHead(200);
					response.write('Saved!');
					response.end();
					return;
				default:
					if (staticFiles[fsPath]) {
						fsPath = staticFiles[fsPath];
					} else {
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
		} catch (e) {
			response.writeHead(500);
			response.end();
			console.log(e.stack);
		}
	})
	.listen(port);

console.log('http://localhost:' + port);

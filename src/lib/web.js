let http = require('http'),
	url = require('url'),
	fs = require('fs'),
	path = require('path');

exports.payload = {};

let baseDirectory = __dirname,
	port = 1337;

http
	.createServer((request, response) => {
		try {
			let requestUrl = url.parse(request.url),
				fsPath = path.normalize(requestUrl.pathname);
			switch (fsPath) {
				case '/':
					fsPath = '/web.html';
					break;
				case '/payload.json':
					response.writeHead(200);
					response.write(JSON.stringify(exports.payload));
					response.end();
					return;
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

module.exports = {
	apps: [
		{
			name: 'Trigger',
			script: 'src/trigger.js',
			autorestart: true,
			watch: false
		},
		{
			name: 'Calculate',
			script: 'src/calculate.js',
			autorestart: true,
			watch: false
		},
		{
			name: 'Bluetooth',
			script: 'src/bluetooth.js',
			autorestart: true,
			watch: false
		}
	]
};

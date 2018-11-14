module.exports = {
	apps: [
		{
			name: 'iFit',
			script: 'src/ifit.js',
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

module.exports = {
	apps: [
		{
			name: 'Trigger',
			script: 'out/trigger.js',
			autorestart: true,
			watch: false
		},
		{
			name: 'Calculate',
			script: 'out/calculate.js',
			autorestart: true,
			watch: false
		},
		{
			name: 'iFit Emulator',
			script: 'out/ifit.js',
			autorestart: true,
			watch: false
		}
	]
};

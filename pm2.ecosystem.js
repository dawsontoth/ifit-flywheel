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
			name: 'iFit Emulator',
			script: 'src/ifit.js',
			autorestart: true,
			watch: false
		}
	]
};

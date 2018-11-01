rsync -av -e ssh \
	--exclude='node_modules'\
	--exclude='constants.json'\
	*\
	pi@raspberrypi.local:~/Hall/

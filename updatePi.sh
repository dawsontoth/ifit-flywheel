rsync -av -e ssh \
	--exclude='node_modules'\
	--exclude='currentCadence.txt'\
	--exclude='currentIncline.txt'\
	--exclude='currentSpeed.txt'\
	* pi@raspberrypi.local:~/Hall/

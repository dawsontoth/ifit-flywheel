## Prerequisites

- Ensure you went through the standard setup process for the Raspberry Pi, installing Raspbian (the OS) creating a name for your Raspberry Pi, and setting a password.


## To install the treadmill app on your Raspberry Pi:

- Edit the updatePi.sh file in the root of this repo and rename "raspberrypi" with the name of your Raspberry Pi, e.g. "justinpi".
- Open the Terminal app on OSX or Start > Run > "cmd" on Windows 10. Cd over to the directory containing the treadmill app code.
- Type "./updatePi.sh" and hit Enter.
- If it prompts for your Raspberry Pi password, type it in and hit Enter. It may ask for it twice.
- It should now copy over the treadmill app code from your computer to the Raspberry Pi.


## Ssh into your Raspberry Pi:

- Open the Terminal app on OSX or Start > Run > "cmd" on Windows 10.
- Type "ssh pi@{pi name}.local" and hit Enter, replacing "{pi name}" with the name of your Raspberry Pi.
- If it asks if you want to continue, type "yes" and hit Enter.
- If it prompts for your Raspberry Pi password, type it in and hit Enter.
- You should now be tunneled in to your Raspberry Pi and have a command prompt like "pi@{pi name}:~ $".
- Type "pm2 list" and hit enter.
- Type "pm2 restart all" and hit enter. This will restart the NodeJs scripts, to ensure the new updated code is used.


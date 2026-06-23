import subprocess
import time

print("Starting Robin...")

# Bridge
bridge = subprocess.Popen(
    ["python", "bridge_server.py"]
)

time.sleep(2)

# Wake Listener
wake = subprocess.Popen(
    ["python", "robin_wake_listener.py"]
)

time.sleep(2)

# React UI
ui = subprocess.Popen(
    ["npm", "run", "dev"],
    shell=True
)

print("Robin fully started.")

bridge.wait()
wake.wait()
ui.wait()
export function connectRobinBridge(
  startRecording: () => Promise<void>,
  stopRecording: () => void
) {
  const ws = new WebSocket("ws://localhost:8765");

  ws.onopen = () => {
    console.log("Robin Bridge Connected");
  };

  ws.onmessage = async (event) => {
    const msg = event.data;

    console.log("BRIDGE RECEIVED:", msg);

    if (msg === "ROBIN_START") {
      console.log("START COMMAND");
      await startRecording();
    }

    if (msg === "ROBIN_STOP") {
      console.log("STOP COMMAND");
      stopRecording();
    }
  };

  ws.onclose = () => {
    console.log("Bridge Disconnected");

    setTimeout(() => {
      connectRobinBridge(
        startRecording,
        stopRecording
      );
    }, 2000);
  };
}
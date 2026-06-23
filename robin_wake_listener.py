import asyncio
import websockets
import sounddevice as sd
import numpy as np
from faster_whisper import WhisperModel
from scipy.io.wavfile import write

# ==========================
# CONFIG
# ==========================

WAKE_PHRASES = [
    "hey robin",
    "hello robin",
    "hi robin"
]

SILENCE_THRESHOLD = 30
SILENCE_SECONDS = 5

SAMPLE_RATE = 16000

# ==========================
# LOAD WHISPER
# ==========================

print("Loading Whisper Tiny...")

model = WhisperModel(
    "tiny",
    device="cpu",
    compute_type="int8"
)

print("Wake Listener Ready")

# ==========================
# RECORD AUDIO
# ==========================

def record_audio(filename, seconds=3):

    audio = sd.rec(
        int(seconds * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16"
    )

    sd.wait()

    write(
        filename,
        SAMPLE_RATE,
        audio
    )

# ==========================
# TRANSCRIBE
# ==========================

def listen(seconds=3):

    record_audio(
        "wake.wav",
        seconds
    )

    segments, _ = model.transcribe(
        "wake.wav",
        language="en",
        beam_size=1
    )

    text = " ".join(
        seg.text for seg in segments
    ).lower().strip()

    return text

# ==========================
# SILENCE DETECTION
# ==========================

def get_volume():

    audio = sd.rec(
        int(0.5 * SAMPLE_RATE),
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="int16"
    )

    sd.wait()

    return np.max(
        np.abs(audio)
    )

# ==========================
# WEBSOCKET
# ==========================

async def send_command(cmd):

    ws = await websockets.connect(
        "ws://localhost:8765"
    )

    await ws.send(cmd)

    await ws.close()

# ==========================
# CONVERSATION SESSION
# ==========================

async def start_session():

    print("\nStarting Robin...\n")

    await send_command(
        "ROBIN_START"
    )

    silent_count = 0

    while True:

        volume = get_volume()

        print(
            "Volume:",
            int(volume)
        )

        if volume > SILENCE_THRESHOLD:

            silent_count = 0

        else:

            silent_count += 1

        # 10 x 0.5 sec = 5 sec

        if silent_count >= 10:

            print(
                "\nStopping Robin...\n"
            )

            await send_command(
                "ROBIN_STOP"
            )

            break

# ==========================
# WAKE LOOP
# ==========================

async def main():

    while True:

        print(
            "\nWaiting for wake word..."
        )

        text = listen(3)

        if text:

            print(
                "Heard:",
                text
            )

        if any(
            phrase in text
            for phrase in WAKE_PHRASES
        ):

            print(
                "\nWAKE WORD DETECTED\n"
            )

            await start_session()

asyncio.run(main())

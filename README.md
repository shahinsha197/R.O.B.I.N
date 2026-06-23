# R.O.B.I.N (AI Voice Assistant)

A personal AI voice assistant built with:

* React + TanStack Router
* n8n AI workflows
* Faster-Whisper Speech-to-Text
* ElevenLabs Text-to-Speech
* WebSocket Bridge
* Wake Word Detection
* Animated Orb Interface

Robin can be activated using voice commands, process requests through n8n, remember user information, and respond using natural speech.

---

# Features

* Wake Word Activation ("Hey Robin")
* Voice Conversations
* ElevenLabs Natural Voice
* n8n AI Agent Backend
* Long-Term Memory Support
* Animated Orb UI
* WebSocket Communication
* Faster-Whisper Speech Recognition
* Extensible Multi-Agent Architecture

---

# Requirements

## Software

* Python 3.12+ (recommended)
* Node.js 20+
* npm
* n8n
* Git

---

# Installation

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/R.O.B.I.N.git

cd R.O.B.I.N
```

---

## 2. Install Frontend Dependencies

```bash
npm install
```

---

## 3. Install Python Dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Or manually:

```bash
pip install faster-whisper
pip install sounddevice
pip install scipy
pip install requests
pip install python-dotenv
pip install elevenlabs
pip install websockets
```

---

# Environment Variables

Create a file named:

```text
.env
```

Copy contents from:

```text
.env.example
```

Example:

```env
ELEVENLABS_API_KEY=YOUR_KEY

ELEVENLABS_VOICE_ID_PRIMARY=VOICE_ID
ELEVENLABS_VOICE_ID_SECONDARY=VOICE_ID

N8N_URL=http://localhost:5678/webhook/robin
```

---

# Setting Up ElevenLabs

1. Create an account on ElevenLabs.
2. Generate an API Key.
3. Select a voice.
4. Copy the Voice ID.
5. Add them to `.env`.

Example:

```env
ELEVENLABS_API_KEY=xxxxxxxx

ELEVENLABS_VOICE_ID_PRIMARY=xxxxxxxx
ELEVENLABS_VOICE_ID_SECONDARY=xxxxxxxx
```

---

# Setting Up n8n

## Install n8n

```bash
npm install -g n8n
```

Start n8n:

```bash
n8n start
```

Open:

```text
http://localhost:5678
```

---

# Importing Robin Workflow

The repository includes:

```text
Robin N8N.json
```

To import:

1. Open n8n.
2. Click "Import from File".
3. Select:

```text
Robin N8N.json
```

4. Save workflow.
5. Activate workflow.

---

# Configure n8n Webhook

Open the imported workflow.

Locate the Webhook node.

Ensure the webhook path is:

```text
robin
```

The final URL should be:

```text
http://localhost:5678/webhook/robin
```

Update your `.env`:

```env
N8N_URL=http://localhost:5678/webhook/robin
```

---

# Starting Robin

## Terminal 1 - WebSocket Bridge

```bash
python bridge_server.py
```

Expected:

```text
Bridge Ready
```

---

## Terminal 2 - Frontend

```bash
npm run dev
```

Expected:

```text
Local: http://localhost:8080
```

Open the URL in your browser.

---

## Terminal 3 - Wake Listener

```bash
python robin_wake_listener.py
```

Expected:

```text
Loading Whisper Tiny...

Wake Listener Ready
```

---

# Using Robin

Say:

```text
Hey Robin
```

Robin will:

1. Detect wake word.
2. Activate the orb.
3. Start listening.
4. Send requests through n8n.
5. Generate a response.
6. Speak using ElevenLabs.

Robin automatically returns to sleep after several seconds of silence.

---

# Project Structure

```text
R.O.B.I.N
│
├── src/
├── public/
│
├── bridge_server.py
├── robin_wake_listener.py
├── start_robin.py
│
├── .env.example
├── requirements.txt
├── package.json
│
├── robin_workflow.json
│
└── README.md
```

---

# Security Notes

Never upload:

```text
.env
.env.local
```

Never expose:

```text
ELEVENLABS_API_KEY
VOICE IDS
DATABASE PASSWORDS
API TOKENS
```

Only upload:

```text
.env.example
```

---

# Future Roadmap

* Multi-Agent Architecture
* Better Memory System
* Desktop Application
* Smart Home Integration
* Local LLM Support
* Calendar & Email Integration
* Plugin System
* Vision Support
* Autonomous Task Execution

---

# License

MIT License

Created by Shahinsha CK
R.O.B.I.N - AI Voice Assistant

```
```

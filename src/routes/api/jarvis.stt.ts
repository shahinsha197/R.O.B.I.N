import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/jarvis/stt")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log(
          "ELEVENLABS:",
          process.env.ELEVENLABS_API_KEY?.slice(0, 10)
        );
        
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "ElevenLabs not connected" }, { status: 500 });
        }


        const incoming = await request.formData();
        const audio = incoming.get("audio");
        if (!(audio instanceof Blob)) {
          return Response.json({ error: "Missing audio" }, { status: 400 });
        }

        const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB
        if (audio.size > MAX_AUDIO_BYTES) {
          return Response.json({ error: "Audio too large" }, { status: 413 });
        }


        const fd = new FormData();
        fd.append("file", audio, "audio.webm");
        fd.append("model_id", "scribe_v2");
        fd.append("tag_audio_events", "false");
        fd.append("diarize", "false");

        const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": apiKey },
          body: fd,
        });

        if (!res.ok) {
          const err = await res.text();
          return Response.json({ error: err || "STT failed" }, { status: 500 });
        }

        const json = (await res.json()) as { text?: string };
        return Response.json({ text: json.text ?? "" });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Try these in order. Library voices require a paid ElevenLabs plan;
// if they 402, we transparently fall back to a built-in voice.
const VOICE_CANDIDATES = [
  "mHX7OoPk2G45VMAuinIt", // user-requested library voice #1
  "XJ2fW4ybq7HouelYYGcL", // user-requested library voice #2
  "pFZP5JQG7iQjIQuC4Bku", // Lily — built-in young female (free plan)
];

const schema = z.object({ text: z.string().min(1).max(5000) });

export const Route = createFileRoute("/api/jarvis/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log(
          "ELEVENLABS:",
          process.env.ELEVENLABS_API_KEY?.slice(0, 10)
        );
        
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response("ElevenLabs not connected", { status: 500 });
        }


        const body = await request.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return new Response("Invalid input", { status: 400 });
        }

        const callTTS = (voiceId: string) =>
          fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
            {
              method: "POST",
              headers: {
                "xi-api-key": apiKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: parsed.data.text,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                  stability: 0.5,
                  similarity_boost: 0.75,
                  style: 0.3,
                  use_speaker_boost: true,
                },
              }),
            },
          );

        let res = await callTTS(VOICE_CANDIDATES[0]);
        for (let i = 1; i < VOICE_CANDIDATES.length && res.status === 402; i++) {
          const detail = await res.text();
          console.warn(`Voice ${VOICE_CANDIDATES[i - 1]} unavailable, trying next:`, detail);
          res = await callTTS(VOICE_CANDIDATES[i]);
        }

        if (!res.ok || !res.body) {
          const err = await res.text();
          console.error("ElevenLabs TTS error", res.status, err);
          return new Response(err || "TTS failed", {
            status: res.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg" },
        });
      },
    },
  },
});

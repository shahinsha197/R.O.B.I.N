import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const fallbackReply =
  "I can hear you, but my automation workflow did not return a reply yet.";

export const Route = createFileRoute("/api/jarvis/n8n")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        
        try {
          const { text } = (await request.json()) as { text?: string };
          if (!text || typeof text !== "string" || text.length > 5000) {
            return json({ error: "Invalid text" }, 400);
          }


          const url =
            process.env.N8N_WEBHOOK_URL ?? "http://localhost:5678/webhook/robin";

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });

          const raw = await res.text();
          if (!res.ok) {
            console.error("n8n webhook error", res.status, raw.slice(0, 500));
            return json({ reply: fallbackReply, fallback: true });
          }

          let reply = "";
          try {
            const data = JSON.parse(raw) as Record<string, unknown>;
            reply =
              (data.reply as string) ??
              (data.text as string) ??
              (data.output as string) ??
              (data.message as string) ??
              "";
          } catch {
            reply = raw;
          }

          if (!reply) {
            console.warn("n8n webhook returned no reply body");
            return json({ reply: fallbackReply, fallback: true });
          }

          return json({ reply });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          console.error("Could not reach n8n webhook", msg);
          return json({ reply: fallbackReply, fallback: true });
        }
      },
    },
  },
});


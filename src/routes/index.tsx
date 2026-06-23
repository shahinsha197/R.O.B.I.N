import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { connectRobinBridge } from "../lib/robinBridge";


export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ROBIN — Voice AI Interface" },
      { name: "description", content: "Talk to ROBIN. A dynamic voice-reactive AI interface." },
    ],
  }),
  component: RobinPage,
});

async function authHeader(): Promise<Record<string, string>> {
  return {};
}

type Status = "idle" | "recording" | "transcribing" | "thinking" | "speaking";

const STATUS_LABEL: Record<Status, string> = {
  idle: "Tap your orb to speak",
  recording: "Listening…",
  transcribing: "Transcribing",
  thinking: "Thinking",
  speaking: "Responding",
};
function RobinPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [userStream, setUserStream] = useState<MediaStream | null>(null);
  const [aiAudioEl, setAiAudioEl] = useState<HTMLAudioElement | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const speak = async (text: string) => {
    setStatus("speaking");
    const res = await fetch("/api/jarvis/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("TTS failed");

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.crossOrigin = "anonymous";
    setAiAudioEl(audio);
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
    setAiAudioEl(null);
    setStatus("idle");
  };

  const handleAudio = useCallback(async (blob: Blob) => {
    try {
      setStatus("transcribing");
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      const sttRes = await fetch("/api/jarvis/stt", { method: "POST", body: fd, headers: await authHeader() });
      if (!sttRes.ok) throw new Error("Transcription failed");
      const { text } = (await sttRes.json()) as { text: string };
      const transcript = text.trim();
      if (!transcript) {
        setStatus("idle");
        setError("I didn't catch that.");
        return;
      }

      setStatus("thinking");
      let reply = "";
      try {
        const n8nRes = await fetch("/api/jarvis/n8n", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body: JSON.stringify({ text: transcript }),
        });
        const contentType = n8nRes.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? ((await n8nRes.json()) as { reply?: string; error?: string })
          : { error: await n8nRes.text() };
        if (!n8nRes.ok) throw new Error(data.error ?? `n8n proxy ${n8nRes.status}`);
        reply = data.reply ?? "";
        if (!reply) throw new Error("Empty reply from n8n");
      } catch (e) {
        setStatus("idle");
        setError(e instanceof Error ? e.message : "Failed to reach n8n webhook");
        return;
      }


      await speak(reply);
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, []);


  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setUserStream(stream);
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setUserStream(null);
        if (blob.size > 0) void handleAudio(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setStatus("recording");
    } catch {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };
  useEffect(() => {
      import("../lib/robinBridge").then(({ connectRobinBridge }) => {
        connectRobinBridge(
          startRecording,
          stopRecording
        );
      });
    }, []);

  const toggleUserOrb = () => {
    if (status === "recording") stopRecording();
    else if (status === "idle") void startRecording();
  };

  useEffect(() => {
  const handleMessage = async (event: MessageEvent) => {
    console.log("EVENT:", event.data);

    if (event.data === "ROBIN_START") {
      console.log("TRYING START");

      try {
        await startRecording();
        console.log("STARTED");
      } catch (err) {
        console.error("START FAILED", err);
      }
    }

    if (event.data === "ROBIN_STOP") {
      console.log("TRYING STOP");

      try {
        stopRecording();
        console.log("STOPPED");
      } catch (err) {
        console.error("STOP FAILED", err);
      }
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}, [status]);

  useEffect(() => {
    (window as any).robinStartListening = async () => {
      if (status === "idle") {
        await startRecording();
      }
    };
    (window as any).robinStopListening = () => {
      if (status === "recording") {
        stopRecording();
      }
    };
    return () => {
      delete (window as any).robinStartListening;
      delete (window as any).robinStopListening;
    };
  }, [status]);

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-25" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 45%, oklch(0.6 0.25 340 / 0.22), transparent 45%), radial-gradient(circle at 75% 55%, oklch(0.6 0.2 230 / 0.22), transparent 45%)",
        }}
      />

      {/* Brand mark */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-3">
          <span className="relative h-1.5 w-1.5">
            <span
              className="absolute inset-0 rounded-full bg-robin"
              style={{ animation: "robin-blink 1.6s ease-in-out infinite" }}
            />
          </span>
          <span className="font-mono text-[11px] tracking-[0.5em] text-muted-foreground">ROBIN</span>
        </div>
        <div/>
      </div>


      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        <div className="grid w-full max-w-5xl grid-cols-2 items-center gap-2 sm:gap-12">
          <OrbStage
            label="ROBIN"
            theme="user"
            audioEl={aiAudioEl}
            active={status === "speaking"}
          />
          <OrbStage
            label="YOU"
            theme="ai"
            stream={userStream}
            active={status === "recording"}
            interactive
            onClick={toggleUserOrb}
            disabled={status !== "idle" && status !== "recording"}
          />
        </div>

        <div className="mt-10 flex h-6 flex-col items-center gap-2">
          {error ? (
            <span className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1 font-mono text-[11px] text-destructive">
              {error}
            </span>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
              {STATUS_LABEL[status]}
            </span>
          )}
        </div>
      </main>

    </div>
  );
}

/* ------------------------------- Orb Stage ------------------------------- */

function OrbStage({
  label,
  theme,
  stream,
  audioEl,
  active,
  interactive,
  onClick,
  disabled,
}: {
  label: string;
  theme: "ai" | "user";
  stream?: MediaStream | null;
  audioEl?: HTMLAudioElement | null;
  active: boolean;
  interactive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const accent = theme === "ai" ? "oklch(0.78 0.18 215)" : "oklch(0.72 0.22 340)";
  return (
    <div className="flex flex-col items-center gap-4">
      <ParticleOrb
        theme={theme}
        stream={stream ?? null}
        audioEl={audioEl ?? null}
        active={active}
        interactive={interactive}
        onClick={onClick}
        disabled={disabled}
      />
      <div className="flex items-center gap-2">
        <span
          className="h-1 w-1 rounded-full transition-shadow"
          style={{
            background: accent,
            boxShadow: active ? `0 0 12px ${accent}` : "none",
          }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.45em] text-muted-foreground">
          {label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------ Particle Orb ----------------------------- */

type Theme = "ai" | "user";

const THEMES: Record<Theme, { colors: [number, number, number][]; halo: string; core: string; glow: [number, number, number] }> = {
  ai: {
    // cyan → azure → violet → magenta accent
    colors: [
      [120, 255, 240],
      [80, 200, 255],
      [120, 130, 255],
      [200, 110, 255],
      [255, 120, 220],
    ],
    halo: "oklch(0.72 0.22 230 / 0.55)",
    core: "oklch(0.9 0.18 215)",
    glow: [140, 220, 255],
  },
  user: {
    // hot pink → magenta → violet → amber accent
    colors: [
      [255, 120, 200],
      [255, 80, 140],
      [220, 90, 255],
      [140, 110, 255],
      [255, 200, 120],
    ],
    halo: "oklch(0.72 0.27 340 / 0.55)",
    core: "oklch(0.88 0.24 340)",
    glow: [255, 140, 210],
  },
};

function ParticleOrb({
  theme,
  stream,
  audioEl,
  active,
  interactive,
  onClick,
  disabled,
}: {
  theme: Theme;
  stream: MediaStream | null;
  audioEl: HTMLAudioElement | null;
  active: boolean;
  interactive?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    let cancelled = false;
    const setup = async () => {
      try {
        sourceRef.current?.disconnect();
      } catch {/* noop */}
      sourceRef.current = null;
      analyserRef.current = null;

      if (!stream && !audioEl) return;

      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      if (cancelled) return;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.78;

      if (stream) {
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        sourceRef.current = src;
      } else if (audioEl) {
        try {
          const src = ctx.createMediaElementSource(audioEl);
          src.connect(analyser);
          src.connect(ctx.destination);
          sourceRef.current = src;
        } catch {/* already connected */}
      }
      analyserRef.current = analyser;
    };
    void setup();
    return () => {
      cancelled = true;
    };
  }, [stream, audioEl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Fibonacci sphere distribution
    const COUNT = 1200;
    const particles: { x: number; y: number; z: number; c: number; seed: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      const x = Math.cos(t) * r;
      const z = Math.sin(t) * r;
      particles.push({
        x,
        y,
        z,
        c: i % THEMES[theme].colors.length,
        seed: Math.random() * 6.283,
      });
    }

    const palette = THEMES[theme].colors;
    const freqs = new Uint8Array(256);
    let raf = 0;
    let rot = theme === "ai" ? 0 : Math.PI;
    let smoothLevel = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.22;

      let level = 0;
      const analyser = analyserRef.current;
      if (analyser) {
        analyser.getByteFrequencyData(freqs);
        let sum = 0;
        for (let i = 0; i < freqs.length; i++) sum += freqs[i];
        level = sum / freqs.length / 255;
      }
      smoothLevel += (level - smoothLevel) * 0.18;

      const t = performance.now() / 1000;
      const ambient = active ? 0 : 0.05 + Math.sin(t * 1.3) * 0.025;
      const energy = Math.min(1, smoothLevel * 2.4) + ambient;

      // Transparent fade — wipes previous frame without darkening background
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, w, h);

      rot += 0.002 + energy * 0.012;
      const cosY = Math.cos(rot);
      const sinY = Math.sin(rot);
      const tiltX = Math.sin(t * 0.25) * 0.3;
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);

      // Soft single-hue glow
      const coreR = baseR * (1.1 + energy * 0.25);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      const [gr, gg, gb] = THEMES[theme].glow;
      const a = 0.18 + energy * 0.22;
      grad.addColorStop(0, `rgba(${gr},${gg},${gb},${a})`);
      grad.addColorStop(0.5, `rgba(${gr},${gg},${gb},${a * 0.35})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";

      const FREQ_LEN = freqs.length;
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y1 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const bin = analyser ? freqs[i % FREQ_LEN] / 255 : 0;
        const noise =
          Math.sin(p.x * 5 + t * 1.7 + p.seed) * 0.5 +
          Math.cos(p.y * 4 - t * 1.1 + p.seed) * 0.5;
        const disp =
          1 +
          energy * 0.3 +
          bin * 0.25 * (active ? 1 : 0.2) +
          noise * 0.02;

        const X = x1 * disp;
        const Y = y1 * disp;
        const Z = z2 * disp;

        const persp = 1.6 / (1.6 - Z * 0.55);
        const sx = cx + X * baseR * persp;
        const sy = cy + Y * baseR * persp;

        const depth = (Z + 1) / 2;
        const size = Math.max(0.1, (0.45 + depth * 1.0) * dpr);
        const alpha = Math.max(0, Math.min(1, 0.25 + depth * 0.55));

        const [r, g, b] = palette[p.c];
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [theme, active]);

  const themeTokens = THEMES[theme];

  const inner = (
    <div className="relative aspect-square w-full max-w-[340px]">
      {/* halo */}
      <div
        className="pointer-events-none absolute inset-[-10%] rounded-full blur-3xl transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${themeTokens.halo}, transparent 65%)`,
          opacity: active ? 1 : 0.55,
        }}
      />
      <canvas ref={canvasRef} className="relative h-full w-full" />
    </div>
  );

  if (!interactive) return inner;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group relative w-full max-w-[340px] rounded-full transition-transform duration-300 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-robin disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={active ? "Stop recording" : "Start recording"}
    >
      {inner}
    </button>
  );
}

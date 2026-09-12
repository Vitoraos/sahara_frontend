"use client";

import { useEffect, useRef } from "react";
import { useMachine } from "@xstate/react";
import { Mic, MicOff, OctagonX, PhoneOff, Play } from "lucide-react";
import { conversationMachine } from "@/lib/conversation-machine";
import { isPlaying, micLevel } from "@/lib/audio";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConversationStatus } from "@/types/voice";

const STATUS_COPY: Record<ConversationStatus, string> = {
  idle: "Ready to start",
  requesting_permission: "Requesting microphone…",
  permission_denied: "Microphone blocked",
  ready: "Connecting…",
  listening: "Listening — speak now",
  processing: "Processing…",
  agent_responding: "Sahara is responding",
  completed: "Consultation ended",
  error: "Something went wrong",
};

function stateToStatus(s: string): ConversationStatus {
  if (s.startsWith("active.")) return s.slice(7) as ConversationStatus;
  return s as ConversationStatus;
}

function LevelBars({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const draw = () => {
      const c = ref.current;
      if (c) {
        const g = c.getContext("2d");
        if (g) {
          const lvl = micLevel() ?? (isPlaying() ? 0.4 : 0.05);
          const w = c.width;
          const h = c.height;
          g.clearRect(0, 0, w, h);
          const n = 24;
          for (let i = 0; i < n; i++) {
            const v = Math.max(0.08, lvl * (0.4 + 0.6 * Math.abs(Math.sin(i * 1.7 + Date.now() / 300))));
            const bh = v * h;
            g.fillStyle = "currentColor";
            g.fillRect((w / n) * i + 1, (h - bh) / 2, w / n - 2, bh);
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return (
    <canvas
      ref={ref}
      width={192}
      height={36}
      aria-hidden
      className={active ? "text-primary" : "text-muted-foreground opacity-40"}
    />
  );
}

export function VoiceConsole({ patientId }: { patientId?: string | null }) {
  const [state, send] = useMachine(conversationMachine);
  const status = stateToStatus(
    typeof state.value === "string" ? state.value : (Object.keys(state.value)[0] ?? "idle"),
  );
  const activeLeaf =
    typeof state.value === "object" && "active" in state.value
      ? String((state.value as Record<string, unknown>).active)
      : null;
  const live = activeLeaf ?? (typeof state.value === "string" ? state.value : "idle");
  const { messages, partialUser, audioPlaying, urgency, triageSummary, danger, notice, error } = state.context;

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length, partialUser]);

  const inCall = live !== "idle" && live !== "completed" && live !== "error" && live !== "permission_denied";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-28 pt-6 sm:px-6">
      <div aria-live="polite" className="flex items-center gap-2">
        <span
          aria-hidden
          className={`inline-block size-2.5 rounded-full ${
            live === "listening" ? "bg-emerald-600" : audioPlaying ? "bg-sky-600" : "bg-muted-foreground/40"
          }`}
        />
        <p className="text-sm font-medium">{STATUS_COPY[status] ?? live}</p>
        {urgency && <Badge variant={urgency === "RED" ? "destructive" : "secondary"}>Triage: {urgency}</Badge>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sahara voice consultation</CardTitle>
          <CardDescription>Speak naturally. Sahara transcribes live and replies with voice.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <LevelBars active={live === "listening" || audioPlaying} />
          {!inCall ? (
            <Button size="lg" onClick={() => send({ type: "START", patientId: patientId ?? null })}>
              <Play /> Start consultation
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {live === "listening" && (
                <Button onClick={() => send({ type: "STOP_UTTERANCE" })}>
                  <Mic /> Done speaking
                </Button>
              )}
              {live === "agent_responding" && (
                <Button variant="secondary" onClick={() => send({ type: "INTERRUPT" })}>
                  <OctagonX /> Interrupt
                </Button>
              )}
              {(live === "listening" || live === "processing") && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MicOff className="size-3.5" /> Mic live — audio streams to Sahara
                </span>
              )}
              <Button variant="outline" onClick={() => send({ type: "END" })}>
                <PhoneOff /> End
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {notice && (
        <Alert>
          <AlertTitle>Notice</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {error}
            <Button size="sm" variant="outline" onClick={() => send({ type: "RETRY" })}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {live === "permission_denied" && (
        <Alert variant="destructive">
          <AlertTitle>Microphone blocked</AlertTitle>
          <AlertDescription>
            Allow microphone access in your browser site settings, then{" "}
            <Button size="sm" variant="outline" onClick={() => send({ type: "RETRY" })}>
              retry
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3" role="log" aria-label="Consultation transcript">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-lg border p-3 text-sm leading-relaxed ${
              m.role === "user" ? "border-border bg-muted/40" : "border-border bg-card"
            }`}
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {m.role === "user" ? "You" : "Sahara"}
              {!m.final && " · speaking…"}
            </p>
            <p className="whitespace-pre-wrap">{m.text}</p>
          </div>
        ))}
        {partialUser && (
          <div className="rounded-lg border border-dashed p-3 text-sm leading-relaxed opacity-80">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">You · listening…</p>
            <p className="whitespace-pre-wrap">{partialUser}</p>
          </div>
        )}
        {live === "processing" && <p className="text-sm text-muted-foreground">Processing your message…</p>}
        <div ref={endRef} />
      </div>

      {triageSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Preliminary assessment</CardTitle>
            <CardDescription>
              Generated by Sahara from what you said — not a diagnosis. A clinician reviews it.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{triageSummary}</p>
            {danger && <p className="mt-2 font-medium text-destructive">Danger signs detected — seek urgent care.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

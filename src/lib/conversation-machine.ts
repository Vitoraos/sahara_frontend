import { assign, fromCallback, sendTo, setup } from "xstate";
import { playTtsChunk, startCapture, stopPlayback, type CaptureHandle } from "./audio";
import type { ClientMsg, ServerMsg } from "@/types/voice";

// ponytail: browsers cannot set Authorization headers on WebSocket
// handshakes, but the backend only reads that header. Dev works via
// ?patient_id= (ALLOW_DEV_UNAUTHENTICATED=true); production needs a
// one-line backend change to also accept ?token=.

export interface ChannelInput {
  url: string;
  patientId: string | null;
  token: string | null;
}

type ToChannel =
  | { type: "SEND_COMMIT" }
  | { type: "SEND_INTERRUPT" }
  | { type: "CLOSE" };

export interface Ctx {
  messages: import("@/types/voice").ChatMessage[];
  partialUser: string;
  audioChunks: number;
  audioPlaying: boolean;
  urgency: "RED" | "AMBER" | "GREEN" | null;
  triageSummary: string | null;
  danger: boolean;
  notice: string | null;
  error: string | null;
  patientId: string | null;
}

export type Ev =
  | { type: "START"; patientId?: string | null }
  | { type: "MIC_GRANTED" }
  | { type: "MIC_DENIED"; message: string }
  | { type: "WS_OPEN" }
  | { type: "WS_MSG"; msg: ServerMsg }
  | { type: "STOP_UTTERANCE" }
  | { type: "INTERRUPT" }
  | { type: "END" }
  | { type: "FATAL"; code: string }
  | { type: "RETRY" }
  | { type: "RESET" };

type MsgOf<T extends ServerMsg["message_type"]> = Extract<ServerMsg, { message_type: T }>;
type WsMsgEv<T extends ServerMsg["message_type"]> = { type: "WS_MSG"; msg: MsgOf<T> };

const msgIs = <T extends ServerMsg["message_type"]>(ev: Ev, t: T): ev is WsMsgEv<T> =>
  ev.type === "WS_MSG" && ev.msg.message_type === t;

function parseMsg(data: unknown): ServerMsg | null {
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  return typeof m.message_type === "string" ? (m as unknown as ServerMsg) : null;
}

const channel = fromCallback<Ev, ChannelInput>(({ sendBack, receive, input }) => {
  let ws: WebSocket | null = null;
  let mic: CaptureHandle | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;
  let ack = 0;
  let dead = false;

  const bye = () => {
    dead = true;
    if (ping) clearInterval(ping);
    mic?.stop();
    mic = null;
    stopPlayback();
    try {
      ws?.close();
    } catch {
      /* already closed */
    }
    ws = null;
  };

  receive((raw) => {
    const e = raw as unknown as ToChannel;
    if (e.type === "SEND_COMMIT") ws?.send(JSON.stringify({ message_type: "COMMIT" } satisfies ClientMsg));
    if (e.type === "SEND_INTERRUPT") {
      ws?.send(JSON.stringify({ message_type: "INTERRUPT" } satisfies ClientMsg));
      stopPlayback();
      sendBack({ type: "WS_MSG", msg: { message_type: "TTS_AUDIO_END" } } satisfies Ev);
    }
    if (e.type === "CLOSE") bye();
  });

  (async () => {
    try {
      mic = await startCapture((b64) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ack++;
        ws.send(JSON.stringify({ message_type: "INPUT_AUDIO_CHUNK", audio_base_64: b64, ack_id: ack } satisfies ClientMsg));
      });
      if (dead) return mic.stop();
      sendBack({ type: "MIC_GRANTED" } satisfies Ev);
    } catch (err) {
      sendBack({
        type: "MIC_DENIED",
        message: err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was denied."
          : "Microphone unavailable.",
      } satisfies Ev);
      bye();
      return;
    }
    // ponytail: ?token= is ignored by the backend until WS_AUTH_FIX.md
    // lands; ?patient_id= is the dev fallback. Header auth is impossible
    // from browsers, so query params are the only carrier.
    const params = new URLSearchParams();
    if (input.patientId) params.set("patient_id", input.patientId);
    else if (input.token) params.set("token", input.token);
    const query = params.size ? `?${params.toString()}` : "";
    const url = `${input.url}${query}`;
    ws = new WebSocket(url);
    ws.onopen = () => {
      if (dead) return bye();
      sendBack({ type: "WS_OPEN" } satisfies Ev);
      ping = setInterval(() => {
        try {
          ws?.send(JSON.stringify({ message_type: "PING" } satisfies ClientMsg));
        } catch {
          /* will surface on close */
        }
      }, 25000);
    };
    ws.onmessage = (e) => {
      let msg: ServerMsg | null = null;
      try {
        msg = parseMsg(typeof e.data === "string" ? JSON.parse(e.data) : null);
      } catch {
        msg = null;
      }
      if (!msg) return; // malformed backend event: ignore, stay alive
      if (msg.message_type === "TTS_AUDIO_CHUNK") playTtsChunk(msg.audio_base_64);
      if (msg.message_type === "TTS_AUDIO_END") stopPlayback();
      sendBack({ type: "WS_MSG", msg } satisfies Ev);
    };
    ws.onclose = () => {
      if (!dead) sendBack({ type: "FATAL", code: "Connection closed." } satisfies Ev);
    };
    ws.onerror = () => ws?.close();
  })();

  return bye;
});

export const FRIENDLY_ERROR: Record<string, string> = {
  PATIENT_AUTH_REQUIRED: "Sign in required, or set NEXT_PUBLIC_DEV_PATIENT_ID for local dev.",
  VOICE_PROVIDER_NOT_CONFIGURED: "Voice provider not configured on the backend.",
  PIPELINE_FAILURE_ESCALATE: "The voice pipeline failed. Please try again or contact the clinic.",
};

const resetCtx = {
  error: () => null,
  notice: () => null,
  messages: () => [],
  partialUser: () => "",
  audioChunks: () => 0,
  audioPlaying: () => false,
  urgency: () => null,
  triageSummary: () => null,
  danger: () => false,
};

export const conversationMachine = setup({
  types: {} as { context: Ctx; events: Ev },
  actors: { channel },
  guards: {
    isPartial: ({ event }) => msgIs(event, "PARTIAL_TRANSCRIPT"),
    isCommitted: ({ event }) => msgIs(event, "COMMITTED_TRANSCRIPT"),
    isTriage: ({ event }) => msgIs(event, "TRIAGE_UPDATE"),
    isAudioChunk: ({ event }) => msgIs(event, "TTS_AUDIO_CHUNK"),
    isAudioEnd: ({ event }) => msgIs(event, "TTS_AUDIO_END"),
    isSessionEnded: ({ event }) => msgIs(event, "SESSION_ENDED"),
    isInputError: ({ event }) => msgIs(event, "INPUT_ERROR"),
    isFatalMsg: ({ event }) => msgIs(event, "ERROR"),
  },
}).createMachine({
  id: "sahara-conversation",
  context: {
    messages: [],
    partialUser: "",
    audioChunks: 0,
    audioPlaying: false,
    urgency: null,
    triageSummary: null,
    danger: false,
    notice: null,
    error: null,
    patientId: null,
  },
  initial: "idle",
  states: {
    idle: {
      on: {
        START: {
          target: "active.requesting_permission",
          actions: assign({
            ...resetCtx,
            patientId: ({ event }) => event.patientId ?? process.env.NEXT_PUBLIC_DEV_PATIENT_ID ?? null,
          }),
        },
      },
    },
    active: {
      invoke: {
        id: "channel",
        src: "channel",
        input: ({ context }): ChannelInput => {
          let token: string | null = null;
          try {
            token = localStorage.getItem("sahara_token");
          } catch {
            /* SSR / private mode */
          }
          return {
            url: `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"}/api/conversations/ws`,
            patientId: context.patientId,
            token,
          };
        },
      },
      initial: "requesting_permission",
      states: {
        requesting_permission: {
          on: {
            MIC_GRANTED: "ready",
            MIC_DENIED: {
              target: "#sahara-conversation.permission_denied",
              actions: assign({ error: ({ event }) => event.message }),
            },
            FATAL: {
              target: "#sahara-conversation.error",
              actions: assign({ error: ({ event }) => event.code }),
            },
          },
        },
        ready: {
          on: {
            WS_OPEN: "listening",
            FATAL: {
              target: "#sahara-conversation.error",
              actions: assign({ error: ({ event }) => event.code }),
            },
          },
        },
        listening: {
          on: {
            WS_MSG: [
              {
                guard: "isPartial",
                actions: assign({
                  partialUser: ({ event, context }) =>
                    msgIs(event, "PARTIAL_TRANSCRIPT") ? event.msg.transcript : context.partialUser,
                }),
              },
              {
                guard: "isCommitted",
                target: "processing",
                actions: assign({
                  messages: ({ context, event }) =>
                    msgIs(event, "COMMITTED_TRANSCRIPT") && event.msg.transcript.trim()
                      ? [...context.messages, { role: "user", text: event.msg.transcript, final: true }]
                      : context.messages,
                  partialUser: () => "",
                  notice: () => null,
                }),
              },
              { guard: "isSessionEnded", target: "#sahara-conversation.completed" },
              {
                guard: "isInputError",
                actions: assign({
                  notice: ({ event, context }) =>
                    msgIs(event, "INPUT_ERROR") ? `Audio not accepted (${event.msg.code}). Keep speaking.` : context.notice,
                }),
              },
              {
                guard: "isFatalMsg",
                target: "#sahara-conversation.error",
                actions: assign({
                  error: ({ event, context }) =>
                    msgIs(event, "ERROR") ? (FRIENDLY_ERROR[event.msg.code] ?? event.msg.code) : context.error,
                }),
              },
            ],
            STOP_UTTERANCE: { actions: sendTo("channel", { type: "SEND_COMMIT" }) },
            FATAL: {
              target: "#sahara-conversation.error",
              actions: assign({ error: ({ event }) => event.code }),
            },
          },
        },
        processing: {
          on: {
            WS_MSG: [
              {
                guard: "isTriage",
                target: "agent_responding",
                actions: assign({
                  messages: ({ context, event }) =>
                    msgIs(event, "TRIAGE_UPDATE")
                      ? [
                          ...context.messages,
                          { role: "agent", text: event.msg.response_text, final: false, urgency: event.msg.urgency_tier },
                        ]
                      : context.messages,
                  urgency: ({ event, context }) => (msgIs(event, "TRIAGE_UPDATE") ? event.msg.urgency_tier : context.urgency),
                  triageSummary: ({ event, context }) =>
                    msgIs(event, "TRIAGE_UPDATE") ? event.msg.triage_summary : context.triageSummary,
                  danger: ({ event, context }) =>
                    msgIs(event, "TRIAGE_UPDATE") ? event.msg.danger_sign_fired : context.danger,
                  audioChunks: () => 0,
                  audioPlaying: () => true,
                }),
              },
              { guard: "isSessionEnded", target: "#sahara-conversation.completed" },
              {
                guard: "isFatalMsg",
                target: "#sahara-conversation.error",
                actions: assign({
                  error: ({ event, context }) =>
                    msgIs(event, "ERROR") ? (FRIENDLY_ERROR[event.msg.code] ?? event.msg.code) : context.error,
                }),
              },
            ],
            INTERRUPT: {
              target: "listening",
              actions: [sendTo("channel", { type: "SEND_INTERRUPT" }), assign({ audioPlaying: () => false })],
            },
            FATAL: {
              target: "#sahara-conversation.error",
              actions: assign({ error: ({ event }) => event.code }),
            },
          },
        },
        agent_responding: {
          on: {
            WS_MSG: [
              {
                guard: "isAudioChunk",
                actions: assign({ audioChunks: ({ context }) => context.audioChunks + 1, audioPlaying: () => true }),
              },
              {
                guard: "isAudioEnd",
                target: "listening",
                actions: assign({
                  audioPlaying: () => false,
                  messages: ({ context }) =>
                    context.messages.map((m, i) => (i === context.messages.length - 1 ? { ...m, final: true } : m)),
                }),
              },
              // ponytail: backend sends one TRIAGE_UPDATE per turn; a repeat
              // before audio end extends the same agent message.
              {
                guard: "isTriage",
                actions: assign({
                  messages: ({ context, event }) => {
                    if (!msgIs(event, "TRIAGE_UPDATE")) return context.messages;
                    const last = context.messages[context.messages.length - 1];
                    if (last?.role === "agent" && !last.final) {
                      return context.messages.map((m, i) =>
                        i === context.messages.length - 1
                          ? { ...m, text: `${m.text}\n${event.msg.response_text}`, urgency: event.msg.urgency_tier }
                          : m,
                      );
                    }
                    return [
                      ...context.messages,
                      { role: "agent", text: event.msg.response_text, final: false, urgency: event.msg.urgency_tier },
                    ];
                  },
                  urgency: ({ event, context }) => (msgIs(event, "TRIAGE_UPDATE") ? event.msg.urgency_tier : context.urgency),
                  triageSummary: ({ event, context }) =>
                    msgIs(event, "TRIAGE_UPDATE") ? event.msg.triage_summary : context.triageSummary,
                  danger: ({ event, context }) =>
                    msgIs(event, "TRIAGE_UPDATE") ? event.msg.danger_sign_fired : context.danger,
                }),
              },
              { guard: "isSessionEnded", target: "#sahara-conversation.completed" },
              {
                guard: "isFatalMsg",
                target: "#sahara-conversation.error",
                actions: assign({
                  error: ({ event, context }) =>
                    msgIs(event, "ERROR") ? (FRIENDLY_ERROR[event.msg.code] ?? event.msg.code) : context.error,
                }),
              },
            ],
            INTERRUPT: {
              target: "listening",
              actions: [
                sendTo("channel", { type: "SEND_INTERRUPT" }),
                assign({
                  audioPlaying: () => false,
                  messages: ({ context }) =>
                    context.messages.map((m, i) => (i === context.messages.length - 1 ? { ...m, final: true } : m)),
                }),
              ],
            },
            FATAL: {
              target: "#sahara-conversation.error",
              actions: assign({ error: ({ event }) => event.code }),
            },
          },
        },
      },
      on: {
        END: "completed",
      },
    },
    permission_denied: {
      on: {
        RETRY: "idle",
        RESET: { target: "idle", actions: assign({ error: () => null }) },
      },
    },
    completed: {
      on: {
        START: {
          target: "active.requesting_permission",
          actions: assign({
            ...resetCtx,
            patientId: ({ event }) => event.patientId ?? process.env.NEXT_PUBLIC_DEV_PATIENT_ID ?? null,
          }),
        },
        RESET: { target: "idle", actions: assign({ error: () => null }) },
      },
    },
    error: {
      on: {
        RETRY: "idle",
        RESET: { target: "idle", actions: assign({ error: () => null }) },
      },
    },
  },
});

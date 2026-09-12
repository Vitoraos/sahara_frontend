// Real backend protocol: WS /api/conversations/ws (see backend
// app/routes/conversation.py + pipeline/pipecat_frame_pipeline.py).
// No invented endpoints, no fake streaming.

export type ClientMsg =
  | { message_type: "INPUT_AUDIO_CHUNK"; audio_base_64: string; ack_id: number }
  | { message_type: "COMMIT" }
  | { message_type: "INTERRUPT" }
  | { message_type: "PING" };

export type ServerMsg =
  | { message_type: "SESSION_CREATED" }
  | { message_type: "PARTIAL_TRANSCRIPT"; transcript: string }
  | { message_type: "COMMITTED_TRANSCRIPT"; transcript: string }
  | {
      message_type: "TRIAGE_UPDATE";
      state: string;
      response_text: string;
      danger_sign_fired: boolean;
      danger_phrases: string[];
      urgency_tier: "RED" | "AMBER" | "GREEN" | null;
      triage_summary: string | null;
    }
  | { message_type: "TTS_AUDIO_CHUNK"; audio_base_64: string; audio_format: string }
  | { message_type: "TTS_AUDIO_END" }
  | { message_type: "SESSION_ENDED" }
  | { message_type: "PONG" }
  | { message_type: "INPUT_ERROR"; code: string }
  | { message_type: "ERROR"; code: string; escalate?: boolean };

export interface ChatMessage {
  role: "user" | "agent";
  text: string;
  final: boolean;
  urgency?: "RED" | "AMBER" | "GREEN" | null;
}

export type ConversationStatus =
  | "idle"
  | "requesting_permission"
  | "permission_denied"
  | "ready"
  | "listening"
  | "processing"
  | "agent_responding"
  | "completed"
  | "error";

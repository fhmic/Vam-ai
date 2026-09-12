import "server-only";

/**
 * Stage 2.3 — Groq Integration.
 *
 * Thin wrapper over Groq's OpenAI-compatible REST API
 * (https://api.groq.com/openai/v1/chat/completions). No SDK dependency —
 * the surface used here (chat completions, streaming, JSON response
 * format) is small enough that a direct fetch is simpler to reason
 * about and keeps one fewer dependency's version drift to track.
 *
 * IMPORTANT — not live-tested: api.groq.com is not reachable from the
 * environment this was built in, so this client's HTTP behavior is
 * implemented against Groq's documented API shape but has not been
 * exercised against a real completion. Verify the model name(s) in your
 * environment variables are current Groq-hosted models before relying
 * on this in any environment — model availability changes over time.
 */

const GROQ_API_BASE = "https://api.groq.com/openai/v1";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function requireApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return key;
}

/**
 * Streaming chat completion. Returns the raw Response so the caller
 * (the /api/chat Route Handler) can forward the stream directly to the
 * client rather than buffering the full completion server-side first.
 */
export async function streamChatCompletion(params: {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      stream: true,
    }),
    signal: params.signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`Groq chat completion failed: ${response.status} ${text}`);
  }

  return response;
}

/**
 * Non-streaming call constrained to JSON output, used for utility
 * tasks that need a parseable structured result rather than a
 * user-facing stream: memory extraction (Stage 2.4). Uses a smaller/
 * faster model (GROQ_MODEL_UTILITY) since these are internal calls,
 * not user-facing latency, per the Phase 1 blueprint's model-selection
 * strategy (Section 8.5).
 */
export async function completeJson<T>(params: {
  model: string;
  messages: GroqMessage[];
}): Promise<T> {
  const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Groq JSON completion failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Groq JSON completion returned no content");
  }

  return JSON.parse(content) as T;
}

/** Speech-to-text via Groq's Whisper-compatible endpoint. */
export async function transcribeAudio(params: {
  model: string;
  audio: Blob;
  filename: string;
}): Promise<{ text: string }> {
  const form = new FormData();
  form.append("model", params.model);
  form.append("file", params.audio, params.filename);

  const response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireApiKey()}` },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Groq transcription failed: ${response.status} ${text}`);
  }

  return response.json();
}

/**
 * Text-to-speech via Groq's speech endpoint. Returns raw audio bytes
 * (format determined by `responseFormat`, e.g. "mp3" / "wav") for the
 * caller to stream back to the client.
 */
export async function synthesizeSpeech(params: {
  model: string;
  voice: string;
  input: string;
  responseFormat?: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  const response = await fetch(`${GROQ_API_BASE}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      voice: params.voice,
      input: params.input,
      response_format: params.responseFormat ?? "mp3",
      speed: params.speed ?? 1.0,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Groq speech synthesis failed: ${response.status} ${text}`);
  }

  return response.arrayBuffer();
}

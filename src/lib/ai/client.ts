import "server-only";

/**
 * Provider migration (Groq -> Gemini).
 *
 * Thin wrapper over the Gemini API. Two surfaces are used deliberately:
 *
 *  - Gemini's OpenAI-compatibility endpoint
 *    (https://generativelanguage.googleapis.com/v1beta/openai) for chat
 *    completions and JSON-mode completions. This is what makes the
 *    migration a provider swap rather than a rewrite: it speaks the
 *    same `data: {"choices":[{"delta":{"content":"..."}}]}` SSE shape
 *    Groq did, so /api/chat's stream-teeing, readGroqSseText-style
 *    parsing (now readAiSseText, see src/lib/chat/persist-reply.ts),
 *    and the client-side SSE parser in mentor-chat.tsx all needed zero
 *    changes.
 *  - Gemini's native `generateContent` endpoint for audio in (speech-
 *    to-text) and audio out (text-to-speech), since neither has an
 *    OpenAI-compatible equivalent — Gemini has no separate STT
 *    endpoint (audio is just another input part) and TTS is a
 *    generateContent call with an audio response modality rather than
 *    a `/audio/speech`-shaped endpoint.
 *
 * IMPORTANT — not live-tested: this sandbox has no network access to
 * generativelanguage.googleapis.com, so — exactly like the Groq client
 * this replaces — every function below is implemented against Gemini's
 * documented API shape but has not been exercised against a real
 * response. Before relying on this in any environment:
 *
 *   1. Verify GEMINI_MODEL_CHAT / GEMINI_MODEL_UTILITY / GEMINI_MODEL_STT
 *      / GEMINI_MODEL_TTS in your env are current, available Gemini
 *      model ids — Google's model catalog moves fast and deprecates on
 *      a published schedule (see https://ai.google.dev/gemini-api/docs/models
 *      and https://ai.google.dev/gemini-api/docs/deprecations). As of
 *      this writing the Gemini 2.5 family (including its TTS preview
 *      models) is scheduled to shut down 16 Oct 2026 — confirm you're
 *      not deploying against a model that's about to disappear.
 *   2. Run one real end-to-end chat turn against a real GEMINI_API_KEY
 *      before trusting the SSE-parsing logic in mentor-chat.tsx and
 *      readAiSseText() in persist-reply.ts.
 *   3. Run one real transcribeAudio() and one real synthesizeSpeech()
 *      call — the inline-audio-part request shape and the PCM-to-WAV
 *      wrapping in synthesizeSpeech() are both implemented from Gemini's
 *      documented shape, not a verified live response.
 */

const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_NATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** @deprecated Kept as an alias during the Groq -> Gemini migration; use GroqMessage's replacement, AiMessage, in new code. */
export type AiMessage = GroqMessage;

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return key;
}

/**
 * Streaming chat completion via Gemini's OpenAI-compatible endpoint.
 * Returns the raw Response so the caller (the /api/chat Route Handler)
 * can forward the stream directly to the client rather than buffering
 * the full completion server-side first. The response body is
 * byte-for-byte the same OpenAI-style SSE shape Groq returned.
 */
export async function streamChatCompletion(params: {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  signal?: AbortSignal;
}): Promise<Response> {
  const response = await fetch(`${GEMINI_OPENAI_BASE}/chat/completions`, {
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
    throw new Error(`Gemini chat completion failed: ${response.status} ${text}`);
  }

  return response;
}

/**
 * Non-streaming call constrained to JSON output, used for utility
 * tasks that need a parseable structured result rather than a
 * user-facing stream: memory extraction/consolidation, action-plan
 * generation, assessment scoring. Uses a smaller/faster model
 * (GEMINI_MODEL_UTILITY) since these are internal calls, not
 * user-facing latency.
 */
export async function completeJson<T>(params: {
  model: string;
  messages: GroqMessage[];
}): Promise<T> {
  const response = await fetch(`${GEMINI_OPENAI_BASE}/chat/completions`, {
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
    throw new Error(`Gemini JSON completion failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Gemini JSON completion returned no content");
  }

  return JSON.parse(content) as T;
}

/**
 * Speech-to-text. Gemini has no dedicated transcription endpoint —
 * audio is passed as an inline data part on an ordinary generateContent
 * call, alongside a text part instructing verbatim transcription.
 * `params.model` should be a Gemini model with audio-input support
 * (any current Gemini 2.5+ model qualifies); GEMINI_MODEL_STT can point
 * at the same model as GEMINI_MODEL_UTILITY if you don't want a
 * separate one configured.
 */
export async function transcribeAudio(params: {
  model: string;
  audio: Blob;
  filename: string;
}): Promise<{ text: string }> {
  const bytes = new Uint8Array(await params.audio.arrayBuffer());
  const base64Audio = bytesToBase64(bytes);
  const mimeType = params.audio.type || "audio/webm";

  const response = await fetch(
    `${GEMINI_NATIVE_BASE}/models/${params.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": requireApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Transcribe this audio verbatim. Return only the transcribed words, with no preamble, commentary, or formatting.",
              },
              { inline_data: { mime_type: mimeType, data: base64Audio } },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini transcription failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini transcription returned no text");
  }

  return { text: text.trim() };
}

/**
 * Text-to-speech via Gemini's native audio-output modality. Gemini's
 * TTS returns raw PCM (signed 16-bit little-endian, mono, 24kHz) as
 * base64 — not a directly playable container format — so this wraps it
 * in a minimal WAV header before returning, since the /api/voice/tts
 * route hands the result straight to the browser's <audio> element via
 * a Blob, which needs a real container to know how to decode the
 * bytes. `responseFormat`/`speed` are accepted for call-site
 * compatibility with the old Groq signature but are currently no-ops:
 * Gemini's TTS API does not expose an output-format choice (WAV is
 * effectively the only sane choice for raw PCM) or a speed parameter
 * outside of natural-language style prompting (see buildSpeechPrompt
 * below) — revisit if voice speed becomes a product requirement.
 */
export async function synthesizeSpeech(params: {
  model: string;
  voice: string;
  input: string;
  responseFormat?: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  const response = await fetch(
    `${GEMINI_NATIVE_BASE}/models/${params.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": requireApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: params.input }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: params.voice } },
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Gemini speech synthesis failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const base64Pcm: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Pcm) {
    throw new Error("Gemini speech synthesis returned no audio");
  }

  const pcmBytes = base64ToBytes(base64Pcm);
  return pcmToWav(pcmBytes, { channels: 1, sampleRate: 24000, bitsPerSample: 16 });
}

// ─── Encoding helpers ────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return Buffer.from(binary, "binary").toString("base64");
}

function base64ToBytes(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}

/**
 * Wraps raw PCM samples in a standard 44-byte WAV (RIFF/WAVE) header.
 * No dependency needed — the format is small and fixed enough that
 * hand-writing it is simpler than pulling in a package for one struct.
 * Exported (only) for tests/unit/wav-encoding.test.ts — not part of
 * this module's intended public surface, which is the four functions
 * above.
 */
export function pcmToWav(
  pcmBytes: Uint8Array,
  format: { channels: number; sampleRate: number; bitsPerSample: number },
): ArrayBuffer {
  const { channels, sampleRate, bitsPerSample } = format;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmBytes.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer, 44).set(pcmBytes);
  return buffer;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Stage 6 — sentence-level streaming TTS.
 *
 * Pure function: given the full text received so far and how much of
 * it has already been sent to TTS, returns any newly-completed
 * sentences plus the updated "already sent" boundary. Called after
 * every SSE delta in mentor-chat.tsx so the mentor can start speaking
 * a sentence while the model is still generating the next one, instead
 * of waiting for the entire reply — this is the main lever for making
 * push-to-talk-based voice feel closer to real-time duplex without a
 * genuine streaming-audio protocol underneath.
 *
 * Deliberately conservative: only splits on '.', '!', '?' followed by
 * whitespace or end-of-string, and requires at least a few characters
 * before the punctuation (so "Dr." or "3.5" mid-sentence don't
 * trigger a false split as often — not perfect, sentence boundary
 * detection never fully is, but good enough that TTS chunks read as
 * complete thoughts almost always).
 */
export interface SentenceChunkerState {
  sentSentences: string[];
  pendingBuffer: string;
}

export const initialChunkerState: SentenceChunkerState = { sentSentences: [], pendingBuffer: "" };

const SENTENCE_BOUNDARY = /([.!?])(\s+|$)/;
const MIN_SENTENCE_LENGTH = 12;

export function extractCompletedSentences(
  fullTextSoFar: string,
  state: SentenceChunkerState,
): { newSentences: string[]; nextState: SentenceChunkerState } {
  const alreadyProcessedLength = state.sentSentences.join("").length + state.pendingBuffer.length;
  const unseenText = fullTextSoFar.slice(alreadyProcessedLength);
  let buffer = state.pendingBuffer + unseenText;

  const newSentences: string[] = [];

  for (;;) {
    const match = buffer.match(SENTENCE_BOUNDARY);
    if (!match || match.index === undefined) break;

    const candidateEnd = match.index + match[1]!.length;
    const candidate = buffer.slice(0, candidateEnd).trim();

    if (candidate.length < MIN_SENTENCE_LENGTH) {
      // Too short to confidently be a real sentence boundary (e.g. "Dr.")
      // — keep accumulating rather than splitting here.
      break;
    }

    newSentences.push(candidate);
    buffer = buffer.slice(match.index + match[0].length);
  }

  return {
    newSentences,
    nextState: {
      sentSentences: [...state.sentSentences, ...newSentences],
      pendingBuffer: buffer,
    },
  };
}

/** Call once the stream is fully done to flush any trailing partial sentence. */
export function flushRemainingBuffer(state: SentenceChunkerState): string | null {
  const trimmed = state.pendingBuffer.trim();
  return trimmed.length > 0 ? trimmed : null;
}

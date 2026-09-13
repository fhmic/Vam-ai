import { describe, expect, it } from "vitest";
import { pcmToWav } from "@/lib/ai/client";

/**
 * Gemini migration — Gemini TTS returns raw PCM (signed 16-bit LE, mono, 24kHz),
 * not a directly playable container, so synthesizeSpeech() wraps it in
 * a minimal WAV header before handing it to /api/voice/tts's caller.
 * These tests pin down the 44-byte RIFF/WAVE header's byte layout
 * against the format, since a single wrong offset or endianness slip
 * here would produce audio that silently fails to decode in the
 * browser rather than throwing anywhere in the request path.
 */
describe("pcmToWav", () => {
  const format = { channels: 1, sampleRate: 24000, bitsPerSample: 16 };

  it("produces a buffer exactly 44 bytes longer than the input PCM", () => {
    const pcm = new Uint8Array(1000).fill(1);
    const wav = pcmToWav(pcm, format);
    expect(wav.byteLength).toBe(pcm.length + 44);
  });

  it("writes the RIFF/WAVE/fmt/data chunk ids at their fixed offsets", () => {
    const pcm = new Uint8Array(10);
    const wav = pcmToWav(pcm, format);
    const bytes = new Uint8Array(wav);
    const ascii = (offset: number, len: number) =>
      String.fromCharCode(...bytes.subarray(offset, offset + len));

    expect(ascii(0, 4)).toBe("RIFF");
    expect(ascii(8, 4)).toBe("WAVE");
    expect(ascii(12, 4)).toBe("fmt ");
    expect(ascii(36, 4)).toBe("data");
  });

  it("encodes sample rate, channel count, and bit depth as little-endian fields", () => {
    const pcm = new Uint8Array(10);
    const wav = pcmToWav(pcm, format);
    const view = new DataView(wav);

    expect(view.getUint16(20, true)).toBe(1); // PCM format tag
    expect(view.getUint16(22, true)).toBe(format.channels);
    expect(view.getUint32(24, true)).toBe(format.sampleRate);
    expect(view.getUint16(34, true)).toBe(format.bitsPerSample);
  });

  it("derives byteRate and blockAlign correctly for mono 16-bit 24kHz audio", () => {
    const pcm = new Uint8Array(10);
    const wav = pcmToWav(pcm, format);
    const view = new DataView(wav);

    const expectedBlockAlign = (format.channels * format.bitsPerSample) / 8; // 2
    const expectedByteRate = format.sampleRate * expectedBlockAlign; // 48000

    expect(view.getUint16(32, true)).toBe(expectedBlockAlign);
    expect(view.getUint32(28, true)).toBe(expectedByteRate);
  });

  it("preserves the PCM sample bytes unmodified after the header", () => {
    const pcm = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const wav = pcmToWav(pcm, format);
    const bytes = new Uint8Array(wav);

    expect(Array.from(bytes.subarray(44))).toEqual(Array.from(pcm));
  });

  it("sets the RIFF and data chunk sizes to match the PCM length", () => {
    const pcm = new Uint8Array(2048);
    const wav = pcmToWav(pcm, format);
    const view = new DataView(wav);

    expect(view.getUint32(4, true)).toBe(36 + pcm.length); // RIFF chunk size
    expect(view.getUint32(40, true)).toBe(pcm.length); // data chunk size
  });
});

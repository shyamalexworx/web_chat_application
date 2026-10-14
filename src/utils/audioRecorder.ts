/**
 * Audio Recording and Synthesis Utility for WhatsApp-style Voice Notes
 * Supports:
 * - Real MediaRecorder browser audio capture
 * - Web Audio procedural voice memo synthesizer fallback (for environments without mic permission)
 * - Standard 16-bit PCM WAV encoding
 */

// Procedurally generates a realistic speech-like audio note WAV blob
export function generateProceduralVoiceNote(durationSeconds: number = 3): { blob: Blob; url: string; duration: number } {
  const sampleRate = 44100;
  const numChannels = 1;
  const totalSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buffer);

  // WAV Header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + totalSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM Chunk size
  view.setUint16(20, 1, true);  // Audio format 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true); // Byte rate
  view.setUint16(32, numChannels * 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, totalSamples * 2, true);

  // Synthesize pleasant, speech-modulated vocal chord acoustic harmonics
  let offset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    // Harmonic formant synthesis
    const fundamental = 220 + 40 * Math.sin(2 * Math.PI * 1.5 * t);
    const formant1 = 500 + 100 * Math.cos(2 * Math.PI * 3 * t);
    const envelope = Math.sin(Math.PI * (i / totalSamples)); // Smooth fade in and out
    const speechCadence = 0.5 + 0.5 * Math.sin(2 * Math.PI * 4 * t) * Math.sin(2 * Math.PI * 1.2 * t);

    const s1 = Math.sin(2 * Math.PI * fundamental * t);
    const s2 = 0.5 * Math.sin(2 * Math.PI * fundamental * 2 * t);
    const s3 = 0.25 * Math.sin(2 * Math.PI * formant1 * t);

    const sample = (s1 + s2 + s3) * 0.35 * envelope * speechCadence;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  return { blob, url, duration: durationSeconds };
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private startTime: number = 0;

  public async start(): Promise<boolean> {
    this.audioChunks = [];
    this.startTime = Date.now();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : 'audio/webm';

        this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        this.mediaRecorder.start(100);
        return true;
      } catch (err) {
        console.warn('Microphone permission not granted or unavailable, using voice synthesis engine:', err);
        this.stream = null;
        this.mediaRecorder = null;
        return false;
      }
    }
    return false;
  }

  public async stop(): Promise<{ blob: Blob; url: string; duration: number }> {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      return new Promise((resolve) => {
        this.mediaRecorder!.onstop = () => {
          const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
          const blob = new Blob(this.audioChunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          if (this.stream) {
            this.stream.getTracks().forEach((track) => track.stop());
            this.stream = null;
          }
          resolve({ blob, url, duration: elapsedSeconds });
        };
        this.mediaRecorder!.stop();
      });
    }

    // Fallback procedural voice note generator with audible playback
    return generateProceduralVoiceNote(Math.max(1, Math.min(elapsedSeconds, 300)));
  }

  public cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.audioChunks = [];
  }
}

export const globalVoiceRecorder = new VoiceRecorder();


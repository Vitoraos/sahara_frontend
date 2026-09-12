// Minimal Web Audio layer: 16kHz PCM16 mic capture + streaming TTS playback.
// ponytail: ScriptProcessorNode (deprecated) instead of AudioWorklet to stay
// one file; upgrade to AudioWorklet if capture glitches under load.

export interface CaptureHandle {
  stop: () => void;
  level: () => number;
}

function audioCtor(): typeof AudioContext {
  const w = window as unknown as {
    AudioContext: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext!;
}

function f32ToPcm16(samples: Float32Array): Uint8Array {
  const out = new Uint8Array(samples.length * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return out;
}

export function u8ToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function b64ToU8(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

let activeAnalyser: AnalyserNode | null = null;
const levelBuf = new Uint8Array(1024);

// Last microphone level (0..1) for visualization. Null when idle.
export function micLevel(): number | null {
  if (!activeAnalyser) return null;
  activeAnalyser.getByteTimeDomainData(levelBuf);
  let sum = 0;
  for (let i = 0; i < levelBuf.length; i++) {
    const v = (levelBuf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / levelBuf.length) * 3);
}

export async function startCapture(
  onPcm: (b64: string) => void,
): Promise<CaptureHandle> {
  const AC = audioCtor();
  const ctx = new AC({ sampleRate: 16000 });
  sharedCtx = ctx;
  // Resume synchronously within the user's click gesture chain where possible.
  if (ctx.state === "suspended") await ctx.resume();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true },
  });
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  src.connect(analyser);

  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const ratio = ctx.sampleRate / 16000;
  let pending = new Uint8Array(0);
  let carry = 0; // fractional resample position
  proc.onaudioprocess = (ev) => {
    const input = ev.inputBuffer.getChannelData(0);
    // ponytail: naive linear resample; exact only when ratio is 1, close
    // enough for voice otherwise. Upgrade path: OfflineAudioContext render.
    let frames: Float32Array;
    if (ratio === 1) {
      frames = input;
    } else {
      const len = Math.floor(input.length / ratio);
      frames = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        const pos = i * ratio + carry;
        const i0 = Math.floor(pos);
        const frac = pos - i0;
        const a = input[Math.min(i0, input.length - 1)];
        const b = input[Math.min(i0 + 1, input.length - 1)];
        frames[i] = a + (b - a) * frac;
      }
      carry = (carry + input.length / ratio) % 1;
    }
    const pcm = f32ToPcm16(frames);
    const merged = new Uint8Array(pending.length + pcm.length);
    merged.set(pending);
    merged.set(pcm, pending.length);
    pending = merged;
    // Backend accepts 1024..32768 bytes per INPUT_AUDIO_CHUNK.
    while (pending.length >= 4096) {
      onPcm(u8ToB64(pending.subarray(0, 4096)));
      pending = pending.subarray(4096);
    }
  };
  src.connect(proc);
  // Mute local feedback: processor output -> zero gain -> destination.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  proc.connect(mute);
  mute.connect(ctx.destination);

  activeAnalyser = analyser;
  const timeData = new Uint8Array(analyser.fftSize);
  return {
    stop: () => {
      if (activeAnalyser === analyser) activeAnalyser = null;
      try {
        src.disconnect();
        proc.disconnect();
        mute.disconnect();
        analyser.disconnect();
      } catch {
        /* already torn down */
      }
      stream.getTracks().forEach((t) => t.stop());
      stopPlayback();
      void ctx.close();
      if (sharedCtx === ctx) sharedCtx = null;
      pending = new Uint8Array(0);
    },
    level: () => {
      analyser.getByteTimeDomainData(timeData);
      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const v = (timeData[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / timeData.length) * 3);
    },
  };
}

// --- Streaming TTS playback (shares the capture context when available) ---
// One context only: it is created inside the user's Start-gesture chain so
// the browser autoplay policy lets it play later without another gesture.

let sharedCtx: AudioContext | null = null;
let chain: Promise<void> = Promise.resolve();
let epoch = 0;
let currentSource: AudioBufferSourceNode | null = null;
let playing = false;

export function isPlaying(): boolean {
  return playing;
}

export function playTtsChunk(audioBase64: string): void {
  if (typeof window === "undefined") return;
  const myEpoch = epoch;
  chain = chain.then(async () => {
    if (myEpoch !== epoch) return;
    sharedCtx ??= new (audioCtor())();
    const ctx = sharedCtx;
    if (ctx.state === "suspended") await ctx.resume();
    const bytes = b64ToU8(audioBase64);
    const buf = await ctx.decodeAudioData(bytes.buffer as ArrayBuffer);
    if (myEpoch !== epoch) return;
    await new Promise<void>((resolve) => {
      if (myEpoch !== epoch) return resolve();
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      currentSource = src;
      playing = true;
      src.onended = () => {
        if (currentSource === src) currentSource = null;
        resolve();
      };
      src.start();
    });
  }).then(
    () => {
      if (myEpoch === epoch && !currentSource) playing = false;
    },
    () => {
      if (myEpoch === epoch) playing = false;
    },
  );
}

export function stopPlayback(): void {
  epoch++;
  chain = Promise.resolve();
  try {
    currentSource?.stop();
  } catch {
    /* already stopped */
  }
  currentSource = null;
  playing = false;
}

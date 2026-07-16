/** 将浏览器录音（多为 webm/ogg）转成方舟支持的 WAV */

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.getChannelData(0);
  // 多声道时简单混成单声道
  let mono = samples;
  if (buffer.numberOfChannels > 1) {
    const len = buffer.length;
    const mixed = new Float32Array(len);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const ch = buffer.getChannelData(c);
      for (let i = 0; i < len; i++) mixed[i] += ch[i] / buffer.numberOfChannels;
    }
    mono = mixed;
  }

  const dataLength = mono.length * 2;
  const ab = new ArrayBuffer(44 + dataLength);
  const view = new DataView(ab);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([ab], { type: 'audio/wav' });
}

const NEED_CONVERT = /webm|ogg|opus|matroska/i;

export function audioNeedsWavConvert(file: File | Blob): boolean {
  const type = file.type || '';
  const name = file instanceof File ? file.name : '';
  return NEED_CONVERT.test(type) || NEED_CONVERT.test(name);
}

/** 解码任意浏览器可播音频并导出为 WAV File */
export async function blobToWavFile(blob: Blob, filename = `voice-${Date.now()}.wav`): Promise<File> {
  const ctx = new AudioContext();
  try {
    const ab = await blob.arrayBuffer();
    const decoded = await ctx.decodeAudioData(ab.slice(0));
    const wav = encodeWav(decoded);
    return new File([wav], filename, { type: 'audio/wav' });
  } finally {
    await ctx.close().catch(() => undefined);
  }
}

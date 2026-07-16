import { existsSync, readFileSync, statSync } from 'fs';
import { extname, join, basename } from 'path';

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const AUDIO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  mpeg: 'audio/mpeg',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
};

const VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
};

function uploadFilename(url: string): string | undefined {
  const match = url.match(/\/uploads\/([^/?#]+)/i);
  return match?.[1];
}

export function toAbsoluteUploadUrl(relativeUrl: string, publicBase: string): string {
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  const base = publicBase.replace(/\/$/, '');
  const path = relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`;
  return `${base}${path}`;
}

export function resolveLocalUploadPath(
  url: string | undefined,
  cwd: string,
): { filePath: string; filename: string; mime: string; size: number } | undefined {
  if (!url) return undefined;
  const filename = uploadFilename(url);
  if (!filename) return undefined;
  const filePath = join(cwd, 'uploads', filename);
  if (!existsSync(filePath)) return undefined;
  const ext = extname(filename).toLowerCase().replace('.', '') || 'bin';
  const mime =
    IMAGE_MIME[ext] ?? AUDIO_MIME[ext] ?? VIDEO_MIME[ext] ?? 'application/octet-stream';
  return { filePath, filename, mime, size: statSync(filePath).size };
}

/** 本地 uploads 读成 data URL（图片/音视频） */
export function resolveUploadDataUrl(
  url: string | undefined,
  cwd: string,
): { dataUrl: string; kind: 'image' | 'audio' | 'video'; mime: string } | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:')) {
    const mime = url.slice(5, url.indexOf(';'));
    if (mime.startsWith('image/')) return { dataUrl: url, kind: 'image', mime };
    if (mime.startsWith('audio/')) return { dataUrl: url, kind: 'audio', mime };
    if (mime.startsWith('video/')) return { dataUrl: url, kind: 'video', mime };
    return undefined;
  }

  const local = resolveLocalUploadPath(url, cwd);
  if (!local) {
    if (/^https?:\/\//i.test(url)) {
      const lower = url.toLowerCase();
      if (/\.(mp3|wav|webm|ogg|m4a)(\?|$)/.test(lower)) {
        return { dataUrl: url, kind: 'audio', mime: 'audio/mpeg' };
      }
      if (/\.(mp4|mov|webm)(\?|$)/.test(lower)) {
        return { dataUrl: url, kind: 'video', mime: 'video/mp4' };
      }
      return { dataUrl: url, kind: 'image', mime: 'image/jpeg' };
    }
    return undefined;
  }

  const buf = readFileSync(local.filePath);
  const dataUrl = `data:${local.mime};base64,${buf.toString('base64')}`;
  if (local.mime.startsWith('image/')) return { dataUrl, kind: 'image', mime: local.mime };
  if (local.mime.startsWith('audio/')) return { dataUrl, kind: 'audio', mime: local.mime };
  if (local.mime.startsWith('video/')) return { dataUrl, kind: 'video', mime: local.mime };
  return undefined;
}

export function audioFormatFromDataUrl(dataUrl: string): string {
  if (dataUrl.includes('audio/wav')) return 'wav';
  if (dataUrl.includes('audio/webm')) return 'webm';
  if (dataUrl.includes('audio/ogg')) return 'ogg';
  if (dataUrl.includes('audio/mp4') || dataUrl.includes('audio/m4a')) return 'mp4';
  return 'mp3';
}

export function audioBase64FromDataUrl(dataUrl: string): string {
  const idx = dataUrl.indexOf('base64,');
  return idx >= 0 ? dataUrl.slice(idx + 7) : dataUrl;
}

export function guessFilename(url: string, fallback = 'upload.bin') {
  const name = uploadFilename(url);
  if (name) return name;
  try {
    return basename(new URL(url).pathname) || fallback;
  } catch {
    return fallback;
  }
}

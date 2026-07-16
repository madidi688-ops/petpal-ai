import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const MAX_BYTES: Record<string, number> = {
  image: 5 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

function mediaKind(mime: string): 'image' | 'audio' | 'video' | null {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          let ext = extname(file.originalname).toLowerCase();
          if (!ext) {
            if (file.mimetype.includes('webm')) ext = '.webm';
            else if (file.mimetype.includes('wav')) ext = '.wav';
            else if (file.mimetype.includes('mpeg') || file.mimetype.includes('mp3'))
              ext = '.mp3';
            else if (file.mimetype.includes('mp4') && file.mimetype.startsWith('audio'))
              ext = '.m4a';
            else if (file.mimetype.includes('quicktime')) ext = '.mov';
            else if (file.mimetype.includes('mp4')) ext = '.mp4';
            else ext = '.bin';
          }
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        // 部分浏览器录音可能给出空 mime 或 codecs 后缀
        const mime = (file.mimetype || '').split(';')[0].trim();
        const ok =
          ALLOWED.has(mime) ||
          mime === 'audio/webm' ||
          mime.startsWith('audio/') ||
          mime.startsWith('video/') ||
          mime.startsWith('image/');
        if (!ok) {
          return cb(
            new BadRequestException({
              error: 'VALIDATION_ERROR',
              message: 'Allowed: image / short video (mp4/mov/webm) / audio (mp3/wav/webm)',
            }) as unknown as Error,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'file is required',
      });
    }
    const mime = (file.mimetype || '').split(';')[0].trim();
    const kind = mediaKind(mime) ?? 'audio';
    const limit = MAX_BYTES[kind] ?? MAX_BYTES.audio;
    if (file.size > limit) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: `File too large for ${kind} (max ${Math.round(limit / 1024 / 1024)}MB)`,
      });
    }
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      mimeType: mime || file.mimetype,
      kind,
      size: file.size,
    };
  }
}

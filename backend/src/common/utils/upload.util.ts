import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, resolve } from 'path';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES = 5;

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.msi', '.sh', '.ps1', '.vbs', '.jar', '.scr'];

export const resolveUploadDir = (): string => resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads');

/** Multer reads file names as latin1; convert so names like "रिपोर्ट.pdf" survive. */
export const decodeFileName = (name: string): string => Buffer.from(name, 'latin1').toString('utf8');

export const ticketUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      const dir = resolveUploadDir();
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (BLOCKED_EXTENSIONS.includes(extname(file.originalname).toLowerCase())) {
      cb(new BadRequestException(`${file.originalname} is a program file and cannot be attached`), false);
      return;
    }
    cb(null, true);
  },
};

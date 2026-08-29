import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();

const uploadsDir = path.join(process.cwd(), 'uploads');
let storage: any;

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  // Use disk storage if filesystem is available
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.bin';
      cb(null, `${randomUUID()}${ext}`);
    },
  });
} catch (err) {
  // Fallback to memory storage in serverless environments
  console.warn('Filesystem not available, using memory storage:', err);
  storage = multer.memoryStorage();
}

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new AppError(400, 'Only image files allowed'));
      return;
    }
    cb(null, true);
  },
});

const audioUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed =
      file.mimetype.startsWith('audio/') ||
      file.mimetype === 'video/webm' ||
      file.mimetype === 'application/octet-stream';
    if (!allowed) {
      cb(new AppError(400, 'Only audio files allowed'));
      return;
    }
    cb(null, true);
  },
});

function buildFileUrl(req: Request, filename: string): string {
  const host = req.get('host') ?? `localhost:${config.port}`;
  return `${req.protocol}://${host}/uploads/${filename}`;
}

router.post('/', authenticate, imageUpload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No file uploaded');
    }

    res.status(201).json({
      success: true,
      data: { url: buildFileUrl(req, req.file.filename), filename: req.file.filename },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/audio', authenticate, audioUpload.single('file'), (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError(400, 'No audio file uploaded');
    }

    res.status(201).json({
      success: true,
      data: { url: buildFileUrl(req, req.file.filename), filename: req.file.filename },
    });
  } catch (error) {
    next(error);
  }
});

// Error handling middleware for multer and file operation errors
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
  if (err.code === 'ENOENT' || err.code === 'EACCES') {
    return res.status(507).json({
      success: false,
      message: 'File storage unavailable. File uploads are not supported in this environment.',
    });
  }
  throw err;
});

export default router;

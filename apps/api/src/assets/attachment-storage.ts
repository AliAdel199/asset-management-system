import { randomBytes } from 'node:crypto';
import { extname, join } from 'node:path';
import { diskStorage } from 'multer';

export const attachmentUploadDir = join(
  process.cwd(),
  'uploads',
  'attachments',
);

export const attachmentMulterOptions = {
  storage: diskStorage({
    destination: attachmentUploadDir,
    filename: (_request, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${randomBytes(6).toString('hex')}`;
      callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
};

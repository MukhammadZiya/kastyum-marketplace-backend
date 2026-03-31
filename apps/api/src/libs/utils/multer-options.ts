import { memoryStorage } from 'multer';

export const multerOptions = {
    storage: memoryStorage(),
};

import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';

export const multerOptions = {
    storage: diskStorage({
        destination: './uploads/members',
        filename: (req, file, cb) => {
            const extension = file.originalname.split('.').pop();
            const fileName = `${uuidv4()}.${extension}`;
            cb(null, fileName);
        },
    }),
};

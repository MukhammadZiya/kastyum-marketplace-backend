import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ShapeService {
    private readonly uploadPath = 'uploads/members';

    constructor() {
        if (!fs.existsSync(this.uploadPath)) {
            fs.mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async processImage(file: Express.Multer.File): Promise<string> {
        const fileName = `${uuidv4()}.webp`;
        const fullPath = path.join(this.uploadPath, fileName);

        await sharp(file.buffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toFile(fullPath);

        return `${this.uploadPath}/${fileName}`;
    }

    removeImage(imagePath: string): void {
        if (imagePath && fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
}

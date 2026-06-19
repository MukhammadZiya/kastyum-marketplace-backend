import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ShapeService {

    constructor() {
        if (!fs.existsSync('uploads')) {
            fs.mkdirSync('uploads', { recursive: true });
        }
    }
    async processImage(file: Express.Multer.File, folder: string = 'members'): Promise<string> {
        const uploadPath = `uploads/${folder}`;
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        const fileName = `${randomUUID()}.webp`;
        const fullPath = path.join(uploadPath, fileName);

        await sharp(file.buffer)
            .resize(800, 800, {
                fit: 'inside',
                withoutEnlargement: true,
            })
            .webp({ quality: 80 })
            .toFile(fullPath);

        return `${uploadPath}/${fileName}`;
    }

    removeImage(imagePath: string): void {
        if (!imagePath) return;
        // Guard against path traversal: only allow deletion inside the uploads/ directory
        const normalized = path.normalize(imagePath);
        if (!normalized.startsWith('uploads/') && !normalized.startsWith('uploads\\')) return;
        if (fs.existsSync(normalized)) {
            fs.unlinkSync(normalized);
        }
    }
}

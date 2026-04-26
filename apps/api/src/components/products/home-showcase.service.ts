import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HomeShowcase } from './schemas/home-showcase.schema';
import { UpdateHomeShowcaseDto, HomeShowcaseSlotInputDto } from './dto/update-home-showcase.dto';
import { ProductsService } from './products.service';
import { ShapeService } from '../../libs/services/shape.service';
import { ProductStatus } from './schemas/product.schema';
import { Message } from '../../libs/enums/common.enum';

const DOC_KEY = 'default';
const MAX_SHOWCASE_SLOTS = 8;

export type HomeShowcaseAdminView = {
    newArrivals: { productId: string; customImage: string | null }[];
    mostPurchased: { productId: string; customImage: string | null }[];
};

@Injectable()
export class HomeShowcaseService {
    constructor(
        @InjectModel(HomeShowcase.name) private readonly showcaseModel: Model<HomeShowcase>,
        private readonly productsService: ProductsService,
        private readonly shapeService: ShapeService,
    ) { }

    private async getOrCreateDoc(): Promise<HomeShowcase> {
        let doc = await this.showcaseModel.findOne({ key: DOC_KEY }).exec();
        if (!doc) {
            doc = await this.showcaseModel.create({
                key: DOC_KEY,
                newArrivals: [],
                mostPurchased: [],
            });
        }
        return doc;
    }

    private normalizeSlots(slots: HomeShowcaseSlotInputDto[]) {
        const list = Array.isArray(slots) ? slots.slice(0, 8) : [];
        return list
            .filter((s) => s?.productId && Types.ObjectId.isValid(s.productId))
            .map((s) => ({
                productId: new Types.ObjectId(s.productId),
                customImage:
                    s.customImage === null || s.customImage === ''
                        ? undefined
                        : s.customImage,
            }));
    }

    async getAdminConfig(): Promise<HomeShowcaseAdminView> {
        const doc = await this.getOrCreateDoc();
        return {
            newArrivals: (doc.newArrivals ?? []).map((s) => ({
                productId: s.productId.toString(),
                customImage: s.customImage ?? null,
            })),
            mostPurchased: (doc.mostPurchased ?? []).map((s) => ({
                productId: s.productId.toString(),
                customImage: s.customImage ?? null,
            })),
        };
    }

    private releaseUnusedCustomImages(
        prev: { customImage?: string }[],
        next: { customImage?: string }[],
    ) {
        const keep = new Set(
            next.map((s) => s.customImage).filter((p): p is string => Boolean(p)),
        );
        for (const s of prev) {
            if (s.customImage && !keep.has(s.customImage)) {
                this.shapeService.removeImage(s.customImage);
            }
        }
    }

    /**
     * After admin creates a product: optionally append it to home showcase sections
     * (end of list, no custom image). Skips if already present or section is full.
     */
    async appendProductToShowcaseSections(
        productId: string,
        opts: { newArrivals?: boolean; mostPurchased?: boolean },
    ): Promise<void> {
        if (!opts.newArrivals && !opts.mostPurchased) return;
        if (!Types.ObjectId.isValid(productId)) return;

        const pid = new Types.ObjectId(productId);
        const doc = await this.getOrCreateDoc();
        let changed = false;

        if (opts.newArrivals) {
            const list = doc.newArrivals ?? [];
            if (
                !list.some((s) => s.productId.toString() === productId) &&
                list.length < MAX_SHOWCASE_SLOTS
            ) {
                list.push({ productId: pid } as any);
                changed = true;
            }
        }
        if (opts.mostPurchased) {
            const list = doc.mostPurchased ?? [];
            if (
                !list.some((s) => s.productId.toString() === productId) &&
                list.length < MAX_SHOWCASE_SLOTS
            ) {
                list.push({ productId: pid } as any);
                changed = true;
            }
        }

        if (changed) {
            await doc.save();
        }
    }

    async updateConfig(dto: UpdateHomeShowcaseDto): Promise<HomeShowcaseAdminView> {
        const doc = await this.getOrCreateDoc();
        const nextNew = this.normalizeSlots(dto.newArrivals ?? []);
        const nextMost = this.normalizeSlots(dto.mostPurchased ?? []);
        this.releaseUnusedCustomImages(doc.newArrivals ?? [], nextNew);
        this.releaseUnusedCustomImages(doc.mostPurchased ?? [], nextMost);
        doc.newArrivals = nextNew as any;
        doc.mostPurchased = nextMost as any;
        await doc.save();
        return this.getAdminConfig();
    }

    async uploadSlotImage(
        section: 'newArrivals' | 'mostPurchased',
        index: number,
        file: Express.Multer.File | undefined,
    ): Promise<{ path: string }> {
        if (!file?.buffer?.length) {
            throw new BadRequestException(Message.PROVIDE_PRODUCT_IMAGE);
        }
        if (index < 0 || index > 7 || !Number.isInteger(index)) {
            throw new BadRequestException('Invalid slot position.');
        }
        const doc = await this.getOrCreateDoc();
        const arr = section === 'newArrivals' ? doc.newArrivals : doc.mostPurchased;
        if (index >= arr.length) {
            throw new BadRequestException(
                'This row is not on the server yet. Pick products in the table, click Save at the bottom, then upload the image.',
            );
        }
        const slot = arr[index];
        if (!slot?.productId) {
            throw new BadRequestException(
                'Choose a product for this row, save the list, then upload an image.',
            );
        }
        if (slot.customImage) {
            this.shapeService.removeImage(slot.customImage);
        }
        slot.customImage = await this.shapeService.processImage(file, 'home');
        await doc.save();
        return { path: slot.customImage };
    }

    async getStorefrontPayload(): Promise<{
        newArrivals: { product: any; customImage: string | null }[];
        mostPurchased: { product: any; customImage: string | null }[];
    }> {
        const doc = await this.getOrCreateDoc();
        const resolve = async (slots: typeof doc.newArrivals) => {
            const out: { product: any; customImage: string | null }[] = [];
            for (const s of slots ?? []) {
                try {
                    const product = await this.productsService.findOne(s.productId.toString());
                    if (product.status === ProductStatus.DELETE) {
                        continue;
                    }
                    out.push({
                        product,
                        customImage: s.customImage ?? null,
                    });
                } catch (e) {
                    if (e instanceof NotFoundException) {
                        continue;
                    }
                    throw e;
                }
            }
            return out;
        };
        return {
            newArrivals: await resolve(doc.newArrivals),
            mostPurchased: await resolve(doc.mostPurchased),
        };
    }
}

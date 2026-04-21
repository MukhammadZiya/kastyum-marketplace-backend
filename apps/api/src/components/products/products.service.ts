import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatus } from '../orders/schemas/order.schema';
import { Product, ProductStatus } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsInquiryDto } from './dto/products-inquiry.dto';
import { Message } from '../../libs/enums/common.enum';

type VariantStockDoc = {
    sizeId?: Types.ObjectId;
    colorId?: Types.ObjectId;
    quantity: number;
};

@Injectable()
export class ProductsService {
    constructor(@InjectModel(Product.name) private productModel: Model<Product>) { }

    /**
     * When the product has sizes and/or colors, `variantStock` must list every combination with quantities.
     * Otherwise a single `stockCount` is used (legacy).
     */
    private resolveInventory(dto: CreateProductDto): {
        variantStock: VariantStockDoc[];
        stockCount: number;
        inStock: boolean;
    } {
        const sizeIds = [...new Set((dto.sizes ?? []).filter((x) => Types.ObjectId.isValid(x)))];
        const colorIds = [...new Set((dto.colors ?? []).filter((x) => Types.ObjectId.isValid(x)))];
        const hasS = sizeIds.length > 0;
        const hasC = colorIds.length > 0;

        if (!hasS && !hasC) {
            const q = Math.max(0, Math.floor(Number(dto.stockCount)) || 0);
            return { variantStock: [], stockCount: q, inStock: q > 0 };
        }

        const raw = dto.variantStock;
        if (!raw || !Array.isArray(raw) || raw.length === 0) {
            throw new BadRequestException(
                'variantStock is required when the product has sizes or colors (one quantity per size, or per size×color).',
            );
        }

        type Exp = { key: string; sizeId?: Types.ObjectId; colorId?: Types.ObjectId };
        const expected: Exp[] = [];
        if (hasS && hasC) {
            for (const s of sizeIds) {
                for (const c of colorIds) {
                    expected.push({
                        key: `${s}:${c}`,
                        sizeId: new Types.ObjectId(s),
                        colorId: new Types.ObjectId(c),
                    });
                }
            }
        } else if (hasS) {
            for (const s of sizeIds) {
                expected.push({ key: `${s}:`, sizeId: new Types.ObjectId(s) });
            }
        } else {
            for (const c of colorIds) {
                expected.push({ key: `:${c}`, colorId: new Types.ObjectId(c) });
            }
        }

        const byKey = new Map<string, number>();
        for (const row of raw) {
            const s = row.sizeId?.trim();
            const c = row.colorId?.trim();
            const key = `${s ?? ''}:${c ?? ''}`;
            const qty = Math.floor(Number(row.quantity));
            if (Number.isNaN(qty) || qty < 0) {
                throw new BadRequestException('Each variant quantity must be a non-negative integer.');
            }
            if (!expected.some((e) => e.key === key)) {
                throw new BadRequestException('variantStock contains an entry that does not match selected sizes/colors.');
            }
            if (byKey.has(key)) {
                throw new BadRequestException('Duplicate variantStock row.');
            }
            byKey.set(key, qty);
        }

        if (byKey.size !== expected.length) {
            throw new BadRequestException(
                'Provide exactly one quantity for each size (and each size×color combination when colors are selected).',
            );
        }

        const variantStock: VariantStockDoc[] = expected.map((e) => ({
            sizeId: e.sizeId,
            colorId: e.colorId,
            quantity: byKey.get(e.key)!,
        }));

        const stockCount = variantStock.reduce((a, v) => a + v.quantity, 0);
        return { variantStock, stockCount, inStock: stockCount > 0 };
    }

    async create(sellerId: string, createProductDto: CreateProductDto): Promise<Product> {
        const inv = this.resolveInventory(createProductDto);
        const { variantStock: _vs, stockCount: _sc, ...rest } = createProductDto as CreateProductDto & {
            variantStock?: unknown;
        };
        const createdProduct = new this.productModel({
            ...rest,
            sellerId,
            variantStock: inv.variantStock,
            stockCount: inv.stockCount,
            inStock: inv.inStock,
        });
        return createdProduct.save();
    }

    async findAll(query: ProductsInquiryDto): Promise<{ list: Product[], total: number }> {
        const { page, limit, brand, material, fit, color, size, minPrice, maxPrice } = query;
        const match: any = { status: ProductStatus.ACTIVE };

        if (brand) match.brand = new Types.ObjectId(brand);
        if (material) match.material = new Types.ObjectId(material);
        if (fit) match.fit = new Types.ObjectId(fit);
        if (color) match.colors = { $in: [new Types.ObjectId(color)] };
        if (size) match.sizes = { $in: [new Types.ObjectId(size)] };
        if (minPrice || maxPrice) {
            match.price = {};
            if (minPrice) match.price.$gte = Number(minPrice);
            if (maxPrice) match.price.$lte = Number(maxPrice);
        }

        const aggregateResult = await this.productModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'members',
                                localField: 'sellerId',
                                foreignField: '_id',
                                as: 'sellerId',
                            },
                        },
                        { $unwind: { path: '$sellerId', preserveNullAndEmptyArrays: true } },
                        { $project: { 'sellerId.password': 0 } },
                        {
                            $lookup: {
                                from: 'colors',
                                localField: 'colors',
                                foreignField: '_id',
                                as: 'colors',
                            },
                        },
                        {
                            $lookup: {
                                from: 'sizes',
                                localField: 'sizes',
                                foreignField: '_id',
                                as: 'sizes',
                            },
                        },
                        {
                            $lookup: {
                                from: 'brands',
                                localField: 'brand',
                                foreignField: '_id',
                                as: 'brand',
                            },
                        },
                        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'materials',
                                localField: 'material',
                                foreignField: '_id',
                                as: 'material',
                            },
                        },
                        { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'fits',
                                localField: 'fit',
                                foreignField: '_id',
                                as: 'fit',
                            },
                        },
                        { $unwind: { path: '$fit', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'styles',
                                localField: 'style',
                                foreignField: '_id',
                                as: 'style',
                            },
                        },
                        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]).exec();

        const list = aggregateResult[0].list;
        const total = aggregateResult[0].total[0]?.count || 0;

        return { list, total };
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productModel.findOne({ _id: id, status: { $ne: ProductStatus.DELETE } })
            .populate('colors sizes brand material fit style sellerId', '-password')
            .exec();
        if (!product) throw new NotFoundException(Message.NO_DATA_FOUND);
        return product;
    }

    async update(id: string, updateData: Partial<CreateProductDto>, sellerId: string): Promise<Product> {
        const product = await this.productModel.findOneAndUpdate(
            { _id: id, sellerId },
            updateData,
            { new: true }
        ).exec();
        if (!product) throw new NotFoundException(Message.UPDATE_FAILED);
        return product;
    }

    async findSellerProducts(sellerId: string, query: ProductsInquiryDto): Promise<{ list: Product[], total: number }> {
        const { page, limit } = query;
        const sellerOid = new Types.ObjectId(sellerId);
        const match: any = {
            sellerId: sellerOid,
            status: { $ne: ProductStatus.DELETE }
        };

        const aggregateResult = await this.productModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: 'colors',
                                localField: 'colors',
                                foreignField: '_id',
                                as: 'colors',
                            },
                        },
                        {
                            $lookup: {
                                from: 'sizes',
                                localField: 'sizes',
                                foreignField: '_id',
                                as: 'sizes',
                            },
                        },
                        {
                            $lookup: {
                                from: 'brands',
                                localField: 'brand',
                                foreignField: '_id',
                                as: 'brand',
                            },
                        },
                        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'materials',
                                localField: 'material',
                                foreignField: '_id',
                                as: 'material',
                            },
                        },
                        { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'fits',
                                localField: 'fit',
                                foreignField: '_id',
                                as: 'fit',
                            },
                        },
                        { $unwind: { path: '$fit', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'styles',
                                localField: 'style',
                                foreignField: '_id',
                                as: 'style',
                            },
                        },
                        { $unwind: { path: '$style', preserveNullAndEmptyArrays: true } },
                        {
                            $lookup: {
                                from: 'orders',
                                let: { productId: '$_id', sid: sellerOid },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ['$sellerId', '$$sid'] },
                                                    { $ne: ['$status', OrderStatus.CANCELLED] },
                                                ],
                                            },
                                        },
                                    },
                                    { $unwind: '$items' },
                                    {
                                        $match: {
                                            $expr: { $eq: ['$items.productId', '$$productId'] },
                                        },
                                    },
                                    {
                                        $group: {
                                            _id: null,
                                            sold: { $sum: '$items.quantity' },
                                        },
                                    },
                                ],
                                as: '_soldAgg',
                            },
                        },
                        {
                            $addFields: {
                                soldCount: {
                                    $ifNull: [{ $arrayElemAt: ['$_soldAgg.sold', 0] }, 0],
                                },
                            },
                        },
                        { $project: { _soldAgg: 0 } },
                    ],
                    total: [
                        { $count: 'count' }
                    ]
                }
            }
        ]).exec();

        const list = aggregateResult[0].list;
        const total = aggregateResult[0].total[0]?.count || 0;

        return { list, total };
    }

    async getProductsByAdmin(query: ProductsInquiryDto): Promise<{ list: Product[], total: number }> {
        const { page, limit, brand, material, fit, color, size, minPrice, maxPrice } = query;
        const match: any = {}; // Admin sees everything

        if (brand) match.brand = new Types.ObjectId(brand);
        if (material) match.material = new Types.ObjectId(material);
        if (fit) match.fit = new Types.ObjectId(fit);
        if (color) match.colors = { $in: [new Types.ObjectId(color)] };
        if (size) match.sizes = { $in: [new Types.ObjectId(size)] };
        if (minPrice || maxPrice) {
            match.price = {};
            if (minPrice) match.price.$gte = Number(minPrice);
            if (maxPrice) match.price.$lte = Number(maxPrice);
        }

        const aggregateResult = await this.productModel.aggregate([
            { $match: match },
            {
                $facet: {
                    list: [
                        { $sort: { createdAt: -1 } },
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        { $lookup: { from: 'members', localField: 'sellerId', foreignField: '_id', as: 'sellerId' } },
                        { $unwind: { path: '$sellerId', preserveNullAndEmptyArrays: true } },
                        { $project: { 'sellerId.password': 0 } },
                        { $lookup: { from: 'colors', localField: 'colors', foreignField: '_id', as: 'colors' } },
                        { $lookup: { from: 'sizes', localField: 'sizes', foreignField: '_id', as: 'sizes' } },
                        { $lookup: { from: 'brands', localField: 'brand', foreignField: '_id', as: 'brand' } },
                        { $unwind: { path: '$brand', preserveNullAndEmptyArrays: true } },
                    ],
                    total: [{ $count: 'count' }]
                }
            }
        ]).exec();

        const list = aggregateResult[0].list;
        const total = aggregateResult[0].total[0]?.count || 0;
        return { list, total };
    }

    async updateProductByAdmin(id: string, updateData: Partial<CreateProductDto>): Promise<Product> {
        const product = await this.productModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
        if (!product) throw new NotFoundException(Message.UPDATE_FAILED);
        return product;
    }

    async deleteProductByAdmin(id: string): Promise<void> {
        const product = await this.productModel.findById(id).exec();
        if (!product) throw new NotFoundException(Message.NO_DATA_FOUND);

        if (product.status === ProductStatus.DELETE) {
            await this.productModel.deleteOne({ _id: id }).exec();
        } else {
            // As per user request: "lekiin u DELETEda bolmasa birinchi uni DELETE statusga change qiladi"
            product.status = ProductStatus.DELETE;
            await product.save();
        }
    }

    async remove(id: string, memberId: string, type: string): Promise<void> {
        if (type === 'ADMIN') {
            return this.deleteProductByAdmin(id);
        } else {
            const product = await this.productModel.findOneAndUpdate(
                { _id: id, sellerId: memberId },
                { status: ProductStatus.DELETE },
                { new: true }
            ).exec();
            if (!product) throw new NotFoundException(Message.REMOVE_FAILED);
        }
    }
}

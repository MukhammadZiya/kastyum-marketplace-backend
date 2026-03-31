import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductStatus } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsInquiryDto } from './dto/products-inquiry.dto';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class ProductsService {
    constructor(@InjectModel(Product.name) private productModel: Model<Product>) { }

    async create(sellerId: string, createProductDto: CreateProductDto): Promise<Product> {
        const inStock = createProductDto.stockCount > 0;
        const createdProduct = new this.productModel({
            ...createProductDto,
            sellerId,
            inStock,
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
        const match: any = {
            sellerId: new Types.ObjectId(sellerId),
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

    async removeProductByAdmin(id: string): Promise<void> {
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
            return this.removeProductByAdmin(id);
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

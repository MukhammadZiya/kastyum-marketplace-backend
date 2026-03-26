import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
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

    async findAll(query: any): Promise<Product[]> {
        const filter: any = {};
        if (query.brand) filter.brand = query.brand;
        if (query.material) filter.material = query.material;
        if (query.fit) filter.fit = query.fit;
        if (query.color) filter.colors = { $in: [query.color] };
        if (query.size) filter.sizes = { $in: [query.size] };
        if (query.minPrice || query.maxPrice) {
            filter.price = {};
            if (query.minPrice) filter.price.$gte = Number(query.minPrice);
            if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
        }

        return this.productModel.find(filter)
            .populate('colors sizes brand material fit sellerId', '-password')
            .exec();
    }

    async findOne(id: string): Promise<Product> {
        const product = await this.productModel.findById(id)
            .populate('colors sizes brand material fit sellerId', '-password')
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

    async remove(id: string, memberId: string, type: string): Promise<void> {
        const filter: any = { _id: id };
        if (type !== 'ADMIN') {
            filter.sellerId = memberId;
        }
        const result = await this.productModel.deleteOne(filter).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException(Message.REMOVE_FAILED);
        }
    }
}

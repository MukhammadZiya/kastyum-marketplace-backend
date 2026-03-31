import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Color, Size, Brand, Material, Fit, Style } from './schemas/attributes.schema';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class AttributesService {
    constructor(
        @InjectModel(Color.name) private colorModel: Model<Color>,
        @InjectModel(Size.name) private sizeModel: Model<Size>,
        @InjectModel(Brand.name) private brandModel: Model<Brand>,
        @InjectModel(Material.name) private materialModel: Model<Material>,
        @InjectModel(Fit.name) private fitModel: Model<Fit>,
        @InjectModel(Style.name) private styleModel: Model<Style>,
    ) { }

    getModel(type: string): Model<any> {
        switch (type.toLowerCase()) {
            case 'color': return this.colorModel;
            case 'size': return this.sizeModel;
            case 'brand': return this.brandModel;
            case 'material': return this.materialModel;
            case 'fit': return this.fitModel;
            case 'style': return this.styleModel;
            default: throw new NotFoundException(Message.ATTRIBUTE_TYPE_NOT_FOUND);
        }
    }

    async findAllAttributes() {
        const [colors, sizes, brands, materials, fits, styles] = await Promise.all([
            this.colorModel.find().exec(),
            this.sizeModel.find().exec(),
            this.brandModel.find().exec(),
            this.materialModel.find().exec(),
            this.fitModel.find().exec(),
            this.styleModel.find().exec(),
        ]);

        return {
            color: colors,
            size: sizes,
            brand: brands,
            material: materials,
            fit: fits,
            style: styles,
        };
    }

    async findAll(type: string) {
        return this.getModel(type).find().exec();
    }

    async create(type: string, data: any) {
        try {
            const model = this.getModel(type);
            const created = new model(data);
            return await created.save();
        } catch (err: any) {
            throw new BadRequestException(Message.CREATE_FAILED);
        }
    }

    async remove(type: string, id: string) {
        return this.getModel(type).findByIdAndDelete(id).exec();
    }
}

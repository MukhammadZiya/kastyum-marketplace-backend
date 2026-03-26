import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Color, Size, Brand, Material, Fit } from './schemas/attributes.schema';

@Injectable()
export class AttributesService {
    constructor(
        @InjectModel(Color.name) private colorModel: Model<Color>,
        @InjectModel(Size.name) private sizeModel: Model<Size>,
        @InjectModel(Brand.name) private brandModel: Model<Brand>,
        @InjectModel(Material.name) private materialModel: Model<Material>,
        @InjectModel(Fit.name) private fitModel: Model<Fit>,
    ) { }

    getModel(type: string): Model<any> {
        switch (type.toLowerCase()) {
            case 'color': return this.colorModel;
            case 'size': return this.sizeModel;
            case 'brand': return this.brandModel;
            case 'material': return this.materialModel;
            case 'fit': return this.fitModel;
            default: throw new NotFoundException('Attribute type topilmadi');
        }
    }

    async findAll(type: string) {
        return this.getModel(type).find().exec();
    }

    async create(type: string, data: any) {
        const model = this.getModel(type);
        const created = new model(data);
        return created.save();
    }

    async remove(type: string, id: string) {
        return this.getModel(type).findByIdAndDelete(id).exec();
    }
}

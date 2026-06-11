import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
    Color, ColorSchema,
    Size, SizeSchema,
    Brand, BrandSchema,
    Material, MaterialSchema,
    Style, StyleSchema
} from './schemas/attributes.schema';
import { AttributesService } from './attributes.service';
import { AttributesController } from './attributes.controller';
import { AttributesAdminController } from './attributes.admin.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Color.name, schema: ColorSchema },
            { name: Size.name, schema: SizeSchema },
            { name: Brand.name, schema: BrandSchema },
            { name: Material.name, schema: MaterialSchema },
            { name: Style.name, schema: StyleSchema },
        ]),
    ],
    providers: [AttributesService],
    controllers: [AttributesController, AttributesAdminController],
    exports: [AttributesService, MongooseModule],
})
export class AttributesModule { }

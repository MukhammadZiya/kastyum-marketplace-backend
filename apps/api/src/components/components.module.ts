import { Module } from '@nestjs/common';
import { AttributesModule } from './attributes/attributes.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { MemberModule } from './member/member.module';

@Module({
    imports: [
        AuthModule,
        MemberModule,
        AttributesModule,
        ProductsModule,
        OrdersModule,
    ],
})
export class ComponentsModule { }

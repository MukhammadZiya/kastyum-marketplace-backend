import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { MemberAdminController } from './member.admin.controller';
import { Member, MemberSchema } from './schemas/member.schema';
import { ShapeService } from '../../libs/services/shape.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }])],
    providers: [MemberService, ShapeService],
    controllers: [MemberController, MemberAdminController],
    exports: [MemberService]
})
export class MemberModule { }

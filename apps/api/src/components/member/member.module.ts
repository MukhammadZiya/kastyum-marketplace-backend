import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { Member, MemberSchema } from './schemas/member.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }])],
    providers: [MemberService],
    controllers: [MemberController],
    exports: [MemberService]
})
export class MemberModule { }

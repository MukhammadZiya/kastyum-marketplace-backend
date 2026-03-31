import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MemberType } from '../../components/member/schemas/member.schema';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Message } from '../enums/common.enum';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<MemberType[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredRoles) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        if (!requiredRoles.includes(user.type)) {
            throw new ForbiddenException(Message.ONLY_SPECIFIC_ROLES_ALLOWED);
        }
        return true;
    }
}

import { SetMetadata } from '@nestjs/common';
import { MemberType } from '../../components/member/schemas/member.schema';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: MemberType[]) => SetMetadata(ROLES_KEY, roles);

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

const ROLE_HIERARCHY: Record<string, number> = {
  'super_admin': 4,
  'admin': 3,
  'marketing': 3, // Same level as admin for landing pages, integrations, marketing accounts
  'manager': 2,
  'sales': 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const userRoleLevel = ROLE_HIERARCHY[user.role] || 0;
    return requiredRoles.some((role) => userRoleLevel >= ROLE_HIERARCHY[role]);
  }
}

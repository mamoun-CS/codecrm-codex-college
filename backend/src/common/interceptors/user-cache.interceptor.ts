import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';

@Injectable()
export class UserScopedCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: Cache,
    reflector: Reflector,
  ) {
    super(cacheManager, reflector);
  }

  protected trackBy(context: ExecutionContext): string | undefined {
    const cacheKey = super.trackBy(context);
    if (!cacheKey) {
      return undefined;
    }

    const request = context.switchToHttp().getRequest();
    const userSegment = request?.user?.id ? `user:${request.user.id}` : 'anonymous';

    return `${userSegment}:${cacheKey}`;
  }
}

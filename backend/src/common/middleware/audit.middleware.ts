import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const originalSend = res.send;
    let responseBody: any = null;

    // Capture response body
    res.send = function (body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log after response is sent
    res.on('finish', async () => {
      try {
        await this.logActivity(req, res, responseBody);
      } catch (error) {
        console.error('Audit logging error:', error);
      }
    });

    next();
  }

  private async logActivity(req: Request, res: Response, responseBody: any) {
    // Skip logging for GET requests and certain paths
    if (req.method === 'GET' ||
        req.path.includes('/analytics') ||
        req.path.includes('/health') ||
        req.path === '/') {
      return;
    }

    // Extract user from request (set by JWT strategy)
    const user = (req as any).user;
    if (!user) return;

    // Determine entity and action
    const { entity, entityId, action } = this.extractEntityInfo(req);

    if (!entity || entityId === null) return;

    // Create diff for changes
    const diff = this.createDiff(req, responseBody);

    const auditLog = this.auditLogRepository.create({
      actor_user_id: user.id,
      entity,
      entity_id: entityId,
      action,
      diff_json: diff,
      at: new Date(),
    });

    await this.auditLogRepository.save(auditLog);
  }

  private extractEntityInfo(req: Request): { entity: string; entityId: number | null; action: string } {
    const pathParts = req.path.split('/').filter(p => p);
    const method = req.method;

    // Leads endpoints
    if (pathParts[0] === 'leads') {
      if (method === 'POST' && pathParts.length === 1) {
        return { entity: 'lead', entityId: null, action: 'create' };
      }
      if (method === 'PATCH' && pathParts.length === 2) {
        return { entity: 'lead', entityId: parseInt(pathParts[1]), action: 'update' };
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        return { entity: 'lead', entityId: parseInt(pathParts[1]), action: 'delete' };
      }
    }

    // Users endpoints
    if (pathParts[0] === 'users') {
      if (method === 'PUT' && pathParts[2] === 'role') {
        return { entity: 'user', entityId: parseInt(pathParts[1]), action: 'change_role' };
      }
      if (method === 'DELETE' && pathParts.length === 2) {
        return { entity: 'user', entityId: parseInt(pathParts[1]), action: 'delete' };
      }
    }

    // Auth endpoints
    if (pathParts[0] === 'auth' && pathParts[1] === 'register') {
      return { entity: 'user', entityId: null, action: 'register' };
    }

    return { entity: '', entityId: null, action: '' };
  }

  private createDiff(req: Request, responseBody: any): any {
    const method = req.method;

    if (method === 'POST') {
      // For creation, log the input data
      return {
        before: null,
        after: req.body,
        response: this.parseResponseBody(responseBody)
      };
    }

    if (method === 'PATCH' || method === 'PUT') {
      // For updates, we can't easily get the before state without additional queries
      // In a real implementation, you'd want to fetch the before state
      return {
        before: null, // Would need to be populated by the service
        after: req.body,
        response: this.parseResponseBody(responseBody)
      };
    }

    if (method === 'DELETE') {
      return {
        before: null, // Would need to be populated by the service
        after: null,
        deleted: true
      };
    }

    return {};
  }

  private parseResponseBody(body: any): any {
    try {
      if (typeof body === 'string') {
        return JSON.parse(body);
      }
      return body;
    } catch {
      return { raw: body };
    }
  }
}

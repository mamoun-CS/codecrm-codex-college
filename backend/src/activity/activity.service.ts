import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async getActivityFeed(currentUser: any, limit: number = 50): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .orderBy('audit.at', 'DESC')
      .limit(limit);

    // Apply role-based filtering
    if (currentUser.role === UserRole.ADMIN) {
      // Admin sees all activities
      return query.getMany();
    }

    if (currentUser.role === UserRole.MANAGER) {
      // Manager sees activities from their team members and their own activities
      query.andWhere(
        `(audit.actor_user_id = :userId OR audit.actor_user_id IN (
          SELECT id FROM users WHERE team_id = :teamId
        ))`,
        { userId: currentUser.id, teamId: currentUser.team_id }
      );
      return query.getMany();
    }

    if (currentUser.role === UserRole.SALES || currentUser.role === UserRole.SALES) {
      // Sales and Marketing see only their own activities
      query.andWhere('audit.actor_user_id = :userId', { userId: currentUser.id });
      return query.getMany();
    }

    return [];
  }

  async getRecentActivities(currentUser: any, hours: number = 24): Promise<AuditLog[]> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const query = this.auditLogRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .where('audit.at >= :since', { since })
      .orderBy('audit.at', 'DESC');

    // Apply role-based filtering
    if (currentUser.role === UserRole.ADMIN) {
      return query.getMany();
    }

    if (currentUser.role === UserRole.MANAGER) {
      query.andWhere(
        `(audit.actor_user_id = :userId OR audit.actor_user_id IN (
          SELECT id FROM users WHERE team_id = :teamId
        ))`,
        { userId: currentUser.id, teamId: currentUser.team_id }
      );
      return query.getMany();
    }

    if (currentUser.role === UserRole.SALES || currentUser.role === UserRole.SALES) {
      query.andWhere('audit.actor_user_id = :userId', { userId: currentUser.id });
      return query.getMany();
    }

    return [];
  }

  async getActivitiesByEntity(currentUser: any, entity: string, entityId?: number): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actor', 'actor')
      .where('audit.entity = :entity', { entity })
      .orderBy('audit.at', 'DESC');

    if (entityId) {
      query.andWhere('audit.entity_id = :entityId', { entityId });
    }

    // Apply role-based filtering
    if (currentUser.role === UserRole.ADMIN) {
      return query.getMany();
    }

    if (currentUser.role === UserRole.MANAGER) {
      query.andWhere(
        `(audit.actor_user_id = :userId OR audit.actor_user_id IN (
          SELECT id FROM users WHERE team_id = :teamId
        ))`,
        { userId: currentUser.id, teamId: currentUser.team_id }
      );
      return query.getMany();
    }

    if (currentUser.role === UserRole.SALES || currentUser.role === UserRole.SALES) {
      query.andWhere('audit.actor_user_id = :userId', { userId: currentUser.id });
      return query.getMany();
    }

    return [];
  }

  formatActivityMessage(activity: AuditLog): string {
    const actorName = activity.actor?.name || 'Unknown User';
    const entity = activity.entity;
    const action = activity.action;

    switch (action) {
      case 'create':
        return `${actorName} created a new ${entity}`;
      case 'update':
        return `${actorName} updated ${entity} #${activity.entity_id}`;
      case 'delete':
        return `${actorName} deleted ${entity} #${activity.entity_id}`;
      case 'change_role':
        return `${actorName} changed role for user #${activity.entity_id}`;
      case 'register':
        return `${actorName} registered a new account`;
      case 'take_ownership':
        return `${actorName} took ownership of lead #${activity.entity_id}`;
      default:
        return `${actorName} performed ${action} on ${entity} #${activity.entity_id}`;
    }
  }
}

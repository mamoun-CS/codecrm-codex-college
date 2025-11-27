/*import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}*/
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  id: number;
  name: string;
  team_id: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default-secret',
    });

    // console.log('🔐 [JwtStrategy] Constructor initialized');
  }

  async validate(payload: JwtPayload) {
    // console.log('🔐 [JwtStrategy] validate() called with payload:', JSON.stringify(payload, null, 2));

    // Check if we have complete user info in the token
    if (payload.id && payload.name && payload.team_id !== undefined) {
      // console.log('✅ [JwtStrategy] Using complete payload from token');
      const user = {
        id: payload.id,
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        team_id: payload.team_id
      };
      // console.log('👤 [JwtStrategy] Returning user from token:', user);
      return user;
    }

    // Fallback: Fetch user from database
    // console.log('🔍 [JwtStrategy] Fetching user from database for id:', payload.sub);
    try {
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['team']
      });

      if (!user) {
        // console.log('❌ [JwtStrategy] User not found in database');
        throw new Error('User not found');
      }

      // console.log('✅ [JwtStrategy] User found in database:', {
      //   id: user.id,
      //   name: user.name,
      //   role: user.role,
      //   team_id: user.team_id
      // });

      const result = {
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        team_id: user.team_id
      };

      // console.log('👤 [JwtStrategy] Returning user from database:', result);
      return result;
    } catch (error) {
      // console.log('❌ [JwtStrategy] Database error:', error.message);
      throw error;
    }
  }
}

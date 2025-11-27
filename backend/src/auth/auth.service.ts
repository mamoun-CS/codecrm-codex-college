import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto';
import { RealtimeGateway } from '../events/realtime.gateway';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.MANAGER]: 2,
  [UserRole.SALES]: 1,
  [UserRole.MARKETING]: 1,
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private realtimeGateway: RealtimeGateway,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['team'] });
    if (user && (await bcrypt.compare(password, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      permissions: user.permissions || []
    };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto, currentUser?: any) {
    // Check if email exists
    const existingUser = await this.userRepository.findOne({ where: { email: registerDto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // Check role hierarchy if current user is creating
    if (currentUser) {
      const currentRoleLevel = ROLE_HIERARCHY[currentUser.role];
      const newRoleLevel = ROLE_HIERARCHY[registerDto.role];
      if (currentRoleLevel <= newRoleLevel) {
        throw new BadRequestException('Cannot create user with equal or higher privilege');
      }

      // Country assignment rules
      if (currentUser.role === UserRole.MANAGER) {
        // Managers must have a country assigned
        if (!currentUser.country) {
          throw new BadRequestException('Manager account must have a country assigned before creating users');
        }

        // Country is required when creating users as a manager
        if (!registerDto.country) {
          // Auto-assign manager's country to new user
          registerDto.country = currentUser.country;
        } else {
          // Ensure the country matches the manager's country
          if (registerDto.country !== currentUser.country) {
            throw new BadRequestException(`Cannot create users for countries other than your assigned country (${currentUser.country})`);
          }
        }

        // Auto-assign team_id from manager if not provided
        if (!registerDto.team_id && currentUser.team_id) {
          registerDto.team_id = currentUser.team_id;
        }
      } else if (currentUser.role === UserRole.ADMIN) {
        // Admins must specify a country when creating users
        if (!registerDto.country) {
          throw new BadRequestException('Country is required when creating users');
        }
      }
    } else {
      // For self-registration (if allowed), country is required
      if (!registerDto.country) {
        throw new BadRequestException('Country is required');
      }
    }

    const hashedPassword = await this.hashPassword(registerDto.password);
    const user = this.userRepository.create({
      ...registerDto,
      password_hash: hashedPassword,
    });
    await this.userRepository.save(user);
    const { password_hash, ...result } = user;

    // Broadcast real-time user creation event
    this.realtimeGateway.server.emit('user:created', {
      id: result.id,
      name: result.name,
      email: result.email,
      role: result.role,
      team_id: result.team_id,
      active: result.active,
      team: result.team ? { id: result.team.id, name: result.team.name } : undefined
    });

    return result;
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}

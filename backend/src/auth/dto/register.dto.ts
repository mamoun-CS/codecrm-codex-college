import { IsEmail, IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class RegisterDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  team_id?: number;

  @IsOptional()
  @IsString()
  country?: string;
}

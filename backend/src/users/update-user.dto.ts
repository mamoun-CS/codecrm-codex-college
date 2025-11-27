import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  team_id?: number;

  @IsOptional()
  active?: boolean;
}

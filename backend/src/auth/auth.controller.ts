/*import { Controller, Request, Post, UseGuards, Body, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Request() req, @Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto, req.user);
  }

  
}*/
import { Controller, Request, Post, Get, UseGuards, Body, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Request() req, @Body(ValidationPipe) registerDto: RegisterDto) {
    return this.authService.register(registerDto, req.user);
  }

  @Get('debug-jwt')
  @UseGuards(AuthGuard('jwt'))
  debugJwt(@Request() req) {
    console.log('🔍 [DebugJWT] Complete request user:', req.user);
    console.log('🔍 [DebugJWT] Request headers authorization:', req.headers.authorization ? 'Present' : 'Missing');
    
    return {
      message: 'JWT Debug Information',
      user: req.user,
      tokenInfo: {
        hasId: !!req.user?.id,
        hasName: !!req.user?.name,
        hasTeamId: req.user?.team_id !== undefined,
        hasRole: !!req.user?.role
      }
    };
  }
}

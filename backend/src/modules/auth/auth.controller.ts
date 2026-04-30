import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService, RequestContext } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import {
  ThrottleLogin,
  ThrottleRegister,
  ThrottlePasswordReset,
} from '../security/throttle.decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private extractContext(req: Request): RequestContext {
    return {
      ip: (req.ip || req.socket?.remoteAddress || 'unknown'),
      userAgent: req.headers['user-agent'],
    };
  }

  @Post('register')
  @ThrottleRegister()
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto, this.extractContext(req));
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Req() req: Request) {
    if (!token) {
      return { message: 'Token mancante' };
    }
    return this.authService.verifyEmail(token, this.extractContext(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ThrottleLogin()
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, this.extractContext(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ThrottlePasswordReset()
  async resendVerification(@Body() dto: ResendVerificationDto, @Req() req: Request) {
    return this.authService.resendVerification(dto, this.extractContext(req));
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ThrottlePasswordReset()
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto, this.extractContext(req));
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ThrottlePasswordReset()
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto, this.extractContext(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.logout(dto.refreshToken, this.extractContext(req));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      matricola: user.matricola,
      email: user.email,
      role: user.role.name,
      isVerified: user.isVerified,
    };
  }

  // Example protected admin-only route
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async adminOnly() {
    return { message: 'Accesso admin confermato' };
  }

  // Public endpoint: check if SSO is enabled (for frontend login page)
  @Get('sso-available')
  ssoAvailable() {
    const enabled = this.configService.get<boolean>('sso.enabled', false);
    return { ssoEnabled: enabled };
  }
}

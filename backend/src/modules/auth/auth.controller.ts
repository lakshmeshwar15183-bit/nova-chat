import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor/two-factor.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResendOtpDto,
  ResetPasswordDto,
  TwoFactorCodeDto,
  VerifyOtpDto,
  VerifyTwoFactorLoginDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokens: TokensService,
    private readonly twoFactor: TwoFactorService,
    private readonly config: ConfigService,
  ) {}

  private meta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.config.get('app.env') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, this.meta(req));
    // A 2FA-protected account returns a challenge instead of tokens.
    if ('requiresTwoFactor' in result) return result;
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('2fa/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.completeTwoFactorLogin(
      dto.challengeToken,
      dto.code,
      this.meta(req),
    );
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('2fa/status')
  twoFactorStatus(@CurrentUser('id') userId: string) {
    return this.twoFactor.status(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/setup')
  twoFactorSetup(@CurrentUser('id') userId: string, @CurrentUser('email') email: string) {
    return this.twoFactor.setup(userId, email);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/enable')
  twoFactorEnable(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactor.enable(userId, dto.code);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/disable')
  twoFactorDisable(@CurrentUser('id') userId: string, @Body() dto: TwoFactorCodeDto) {
    return this.twoFactor.disable(userId, dto.code);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken || (req.cookies?.['refresh_token'] as string);
    const result = await this.authService.refresh(token, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.['refresh_token'] as string;
    res.clearCookie('refresh_token', { path: '/api/auth' });
    return this.authService.logout(userId, token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@CurrentUser('id') userId: string) {
    return this.tokens.listSessions(userId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  revokeSession(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tokens.revokeSession(userId, id);
  }

  // ---- Google OAuth --------------------------------------------------------

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleAuth() {
    // Passport redirects to Google.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(req.user as any, this.meta(req));
    this.setRefreshCookie(res, result.refreshToken);
    const frontend = this.config.get<string>('app.frontendUrl');
    res.redirect(`${frontend}/auth/callback?token=${result.accessToken}`);
  }
}

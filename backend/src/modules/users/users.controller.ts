import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { SearchUsersDto, UpdatePrivacyDto, UpdateProfileDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get('search')
  search(@Query() dto: SearchUsersDto, @CurrentUser('id') userId: string) {
    return this.usersService.search(dto.q, userId);
  }

  @Patch('me/profile')
  updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/privacy')
  updatePrivacy(@CurrentUser('id') userId: string, @Body() dto: UpdatePrivacyDto) {
    return this.usersService.updatePrivacy(userId, dto);
  }

  @Get(':id')
  getUser(@Param('id') id: string, @CurrentUser('id') viewerId: string) {
    return this.usersService.getById(id, viewerId);
  }
}

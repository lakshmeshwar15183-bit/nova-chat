import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ContactsService } from './contacts.service';
import { AddContactDto, BlockUserDto } from './dto';

@ApiTags('contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.contactsService.list(userId);
  }

  @Get('blocked')
  blocked(@CurrentUser('id') userId: string) {
    return this.contactsService.listBlocked(userId);
  }

  @Post()
  add(@CurrentUser('id') userId: string, @Body() dto: AddContactDto) {
    return this.contactsService.add(userId, dto);
  }

  @Post('block')
  block(@CurrentUser('id') userId: string, @Body() dto: BlockUserDto) {
    return this.contactsService.block(userId, dto.targetId);
  }

  @Post('unblock')
  unblock(@CurrentUser('id') userId: string, @Body() dto: BlockUserDto) {
    return this.contactsService.unblock(userId, dto.targetId);
  }

  @Delete(':targetId')
  remove(@CurrentUser('id') userId: string, @Param('targetId') targetId: string) {
    return this.contactsService.remove(userId, targetId);
  }
}

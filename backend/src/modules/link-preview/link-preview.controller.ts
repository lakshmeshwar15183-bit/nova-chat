import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LinkPreviewService } from './link-preview.service';

class PreviewQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}

@ApiTags('link-preview')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('link-preview')
export class LinkPreviewController {
  constructor(private readonly linkPreviewService: LinkPreviewService) {}

  @Get()
  preview(@Query() query: PreviewQueryDto) {
    return this.linkPreviewService.preview(query.url);
  }
}

import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TagsService, CreateTagDto } from './tags.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

@ApiTags('Tags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@Request() req: any) { return this.tagsService.findAll(req.user.id); }

  @Post()
  create(@Request() req: any, @Body() dto: CreateTagDto) {
    return this.tagsService.create(req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.tagsService.remove(req.user.id, id);
  }

  @Post('trades/:tradeId/:tagId')
  addToTrade(@Request() req: any, @Param('tradeId') tradeId: string, @Param('tagId') tagId: string) {
    return this.tagsService.addToTrade(req.user.id, tradeId, tagId);
  }

  @Delete('trades/:tradeId/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFromTrade(@Request() req: any, @Param('tradeId') tradeId: string, @Param('tagId') tagId: string) {
    return this.tagsService.removeFromTrade(req.user.id, tradeId, tagId);
  }
}

@Module({
  imports: [PrismaModule],
  providers: [TagsService],
  controllers: [TagsController],
  exports: [TagsService],
})
export class TagsModule {}

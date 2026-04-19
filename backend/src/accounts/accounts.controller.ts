import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService, CreateAccountDto, UpdateAccountDto } from './accounts.service';

@ApiTags('Accounts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts for current user' })
  findAll(@Request() req: any) {
    return this.accountsService.findAll(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new broker account' })
  create(@Request() req: any, @Body() dto: CreateAccountDto) {
    return this.accountsService.create(req.user.id, dto);
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(req.user.id, id, dto);
  }

  @Post(':id/regen-key')
  @ApiOperation({ summary: 'Regenerate MT4/MT5 API key' })
  regenKey(@Request() req: any, @Param('id') id: string) {
    return this.accountsService.regenApiKey(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.accountsService.remove(req.user.id, id);
  }
}

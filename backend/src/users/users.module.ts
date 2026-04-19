import { Controller, Get, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() timezone?: string;
}

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  me(@Request() req: any) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, timezone: true, createdAt: true },
    });
  }

  @Patch('me')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: req.user.id },
      data: dto,
      select: { id: true, email: true, name: true, timezone: true },
    });
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
})
export class UsersModule {}

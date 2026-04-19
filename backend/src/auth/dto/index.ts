// ============================================================
// auth/dto/register.dto.ts
// ============================================================
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'trader@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}

// ============================================================
// auth/dto/login.dto.ts
// ============================================================
export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}

// ============================================================
// auth/dto/refresh.dto.ts
// ============================================================
export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

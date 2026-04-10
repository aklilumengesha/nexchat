import { IsString, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator'

export class CreateRoomDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean
}

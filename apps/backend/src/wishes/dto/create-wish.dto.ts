import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateWishDto {
  @ApiPropertyOptional({ description: "可省略；若传入会被服务端忽略并回写默认图标 🎁" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  icon?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  title!: string;

  @ApiProperty({ enum: [1, 2, 3] })
  @IsIn([1, 2, 3])
  rarity!: number;
}

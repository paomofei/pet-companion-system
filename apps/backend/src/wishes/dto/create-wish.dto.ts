import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class CreateWishDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  icon!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  title!: string;

  @ApiProperty({ enum: [1, 2, 3] })
  @IsIn([1, 2, 3])
  rarity!: number;
}

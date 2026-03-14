import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

export class InitUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  nickname!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  petName!: string;

  @ApiProperty({ enum: [0, 1] })
  @IsIn([0, 1])
  onboardingOption!: number;
}

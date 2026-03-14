import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateGoalDto {
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
}

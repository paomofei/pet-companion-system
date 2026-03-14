import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  title!: string;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  rewardEnergy!: number;

  @ApiProperty({ nullable: true, required: false })
  @Transform(({ value }) => (value === undefined ? undefined : value === null ? null : Number(value)))
  @IsOptional()
  @IsInt()
  goalId?: number | null;

  @ApiProperty({ enum: [0, 1, 2, 3] })
  @Transform(({ value }) => Number(value))
  @IsIn([0, 1, 2, 3])
  repeatType!: number;

  @ApiProperty({ format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate!: string;
}

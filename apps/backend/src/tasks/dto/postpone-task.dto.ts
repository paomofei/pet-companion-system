import { ApiProperty } from "@nestjs/swagger";
import { Matches } from "class-validator";

export class PostponeTaskDto {
  @ApiProperty({ format: "date" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate!: string;
}

import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

import { CreateTaskDto } from "./create-task.dto";

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty({ enum: ["this", "future"], required: false })
  @IsOptional()
  @IsIn(["this", "future"])
  scope?: "this" | "future";
}

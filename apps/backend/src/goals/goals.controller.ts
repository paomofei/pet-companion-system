import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { GoalsService } from "./goals.service";

@ApiTags("goals")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("goals")
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  list(@CurrentUserId() userId: number) {
    return this.goalsService.listGoals(userId);
  }

  @Post()
  create(@CurrentUserId() userId: number, @Body() dto: CreateGoalDto) {
    return this.goalsService.createGoal(userId, dto);
  }

  @Put(":id")
  update(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) goalId: number,
    @Body() dto: UpdateGoalDto
  ) {
    return this.goalsService.updateGoal(userId, goalId, dto);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) goalId: number) {
    return this.goalsService.deleteGoal(userId, goalId);
  }
}

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { CreateTaskDto } from "./dto/create-task.dto";
import { PostponeTaskDto } from "./dto/postpone-task.dto";
import { TasksQueryDto } from "./dto/tasks-query.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksService } from "./tasks.service";

@ApiTags("tasks")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@CurrentUserId() userId: number, @Query() query: TasksQueryDto) {
    return this.tasksService.getTasksByDate(userId, query.date);
  }

  @Post()
  create(@CurrentUserId() userId: number, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(userId, dto);
  }

  @Put(":id")
  update(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskDto
  ) {
    return this.tasksService.updateTask(userId, taskId, dto);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) taskId: number) {
    return this.tasksService.deleteTask(userId, taskId);
  }

  @Post(":id/check")
  check(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) taskId: number) {
    return this.tasksService.checkTask(userId, taskId);
  }

  @Post(":id/uncheck")
  uncheck(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) taskId: number) {
    return this.tasksService.uncheckTask(userId, taskId);
  }

  @Post(":id/postpone")
  postpone(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) taskId: number,
    @Body() dto: PostponeTaskDto
  ) {
    return this.tasksService.postponeTask(userId, taskId, dto);
  }

  @Get("overdue")
  overdue(@CurrentUserId() userId: number) {
    return this.tasksService.getOverdueTasks(userId);
  }
}

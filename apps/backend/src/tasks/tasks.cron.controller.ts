import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";

import { CronSecretGuard } from "../common/auth/cron-secret.guard";
import { SkipDeviceId } from "../common/auth/skip-device-id.decorator";
import { TasksScheduler } from "./tasks.scheduler";

@ApiExcludeController()
@Controller("internal/cron/tasks")
export class TasksCronController {
  constructor(private readonly tasksScheduler: TasksScheduler) {}

  @SkipDeviceId()
  @UseGuards(CronSecretGuard)
  @Get("generate-recurring")
  generateRecurringTasks() {
    return this.tasksScheduler.generateRecurringTasks();
  }

  @SkipDeviceId()
  @UseGuards(CronSecretGuard)
  @Get("mark-overdue")
  markOverdueTasks() {
    return this.tasksScheduler.markOverdueTasks();
  }
}

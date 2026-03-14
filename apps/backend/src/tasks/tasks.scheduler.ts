import { Injectable } from "@nestjs/common";

import { addDays, matchesRepeatType, todayDateString } from "../common/utils/date.util";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TasksScheduler {
  constructor(private readonly prisma: PrismaService) {}

  async generateRecurringTasks(targetDate = todayDateString()) {
    let createdCount = 0;
    const templates = await this.prisma.taskTemplate.findMany({
      where: {
        isActive: true
      },
      orderBy: { id: "asc" }
    });

    for (const template of templates) {
      if (!matchesRepeatType(targetDate, template.repeatType)) {
        continue;
      }

      const existingTask = await this.prisma.task.findFirst({
        where: {
          templateId: template.id,
          targetDate,
          deletedAt: null
        },
        select: { id: true }
      });

      if (existingTask) {
        continue;
      }

      await this.prisma.task.create({
        data: {
          userId: template.userId,
          goalId: template.goalId,
          title: template.title,
          rewardEnergy: template.rewardEnergy,
          repeatType: template.repeatType,
          templateId: template.id,
          targetDate
        }
      });

      createdCount += 1;
    }

    return {
      targetDate,
      createdCount
    };
  }

  async markOverdueTasks(targetDate = addDays(todayDateString(), -1)) {
    const result = await this.prisma.task.updateMany({
      where: {
        targetDate,
        status: 0,
        deletedAt: null
      },
      data: {
        status: 2
      }
    });

    return {
      targetDate,
      updatedCount: result.count
    };
  }
}

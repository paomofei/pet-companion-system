import { Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";

import { BadgeEngineService } from "../badges/badge-engine.service";
import { ERROR_CODES } from "../common/constants/error-codes";
import { AppException } from "../common/exceptions/app.exception";
import { ContentPolicyService } from "../common/services/content-policy.service";
import { addDays, todayDateString } from "../common/utils/date.util";
import { GoalsService } from "../goals/goals.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateTaskDto } from "./dto/create-task.dto";
import type { PostponeTaskDto } from "./dto/postpone-task.dto";
import type { UpdateTaskDto } from "./dto/update-task.dto";

type PrismaTx = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentPolicy: ContentPolicyService,
    private readonly goalsService: GoalsService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async getTasksByDate(userId: number, date: string) {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        targetDate: date,
        deletedAt: null
      },
      include: {
        goal: true
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      date,
      pending: tasks.filter((task: { status: number }) => task.status !== 1).map((task) => this.toTaskListItem(task)),
      completed: tasks.filter((task: { status: number }) => task.status === 1).map((task) => this.toTaskListItem(task))
    };
  }

  async createTask(userId: number, dto: CreateTaskDto) {
    const title = this.contentPolicy.normalizeText(dto.title, "任务标题", 50);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const goalId = dto.goalId ?? null;
      if (goalId !== null) {
        const goal = await tx.goal.findFirst({
          where: { id: goalId, userId, deletedAt: null }
        });
        if (!goal) {
          throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
        }
      }

      let templateId: number | null = null;
      if (dto.repeatType > 0) {
        const template = await tx.taskTemplate.create({
          data: {
            userId,
            goalId,
            title,
            rewardEnergy: dto.rewardEnergy,
            repeatType: dto.repeatType
          }
        });
        templateId = template.id;
      }

      const task = await tx.task.create({
        data: {
          userId,
          goalId,
          title,
          rewardEnergy: dto.rewardEnergy,
          repeatType: dto.repeatType,
          targetDate: dto.targetDate,
          templateId
        }
      });

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        rewardEnergy: task.rewardEnergy,
        repeatType: task.repeatType,
        targetDate: task.targetDate,
        goalId: task.goalId,
        templateId
      };
    });
  }

  async updateTask(userId: number, taskId: number, dto: UpdateTaskDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const task = await tx.task.findFirst({
        where: {
          id: taskId,
          userId,
          deletedAt: null
        }
      });

      if (!task) {
        throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
      }

      const goalId = dto.goalId !== undefined ? dto.goalId : task.goalId;
      if (goalId !== null) {
        const goal = await tx.goal.findFirst({
          where: { id: goalId, userId, deletedAt: null }
        });
        if (!goal) {
          throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
        }
      }

      const updateData = {
        title: dto.title ? this.contentPolicy.normalizeText(dto.title, "任务标题", 50) : task.title,
        rewardEnergy: dto.rewardEnergy ?? task.rewardEnergy,
        goalId
      };

      if (dto.scope === "future" && task.templateId) {
        await tx.taskTemplate.update({
          where: { id: task.templateId },
          data: {
            title: updateData.title,
            rewardEnergy: updateData.rewardEnergy,
            goalId
          }
        });

        await tx.task.updateMany({
          where: {
            userId,
            templateId: task.templateId,
            deletedAt: null,
            targetDate: { gte: task.targetDate },
            status: { not: 1 }
          },
          data: updateData
        });
      } else {
        await tx.task.update({
          where: { id: task.id },
          data: updateData
        });
      }

      const updated = await tx.task.findUniqueOrThrow({
        where: { id: task.id }
      });

      return {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        rewardEnergy: updated.rewardEnergy,
        repeatType: updated.repeatType,
        targetDate: updated.targetDate,
        goalId: updated.goalId,
        templateId: updated.templateId
      };
    });
  }

  async deleteTask(userId: number, taskId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null
      }
    });

    if (!task) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: { deletedAt: new Date() }
    });

    return {
      id: task.id,
      deleted: true
    };
  }

  async checkTask(userId: number, taskId: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const task = await tx.task.findFirst({
        where: {
          id: taskId,
          userId,
          deletedAt: null
        }
      });

      if (!task) {
        throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
      }
      if (task.status !== 0) {
        throw new AppException(ERROR_CODES.STATE_CONFLICT, "状态冲突");
      }

      const beforeGoalProgress =
        task.goalId !== null ? await this.goalsService.getGoalProgressTx(tx, userId, task.goalId) : null;

      await tx.task.update({
        where: { id: task.id },
        data: {
          status: 1,
          completedAt: new Date()
        }
      });

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const streaks = await this.recalculateStreaksTx(tx, userId);
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          energyBalance: { increment: task.rewardEnergy },
          totalTasksDone: { increment: 1 },
          totalEnergyEarned: { increment: task.rewardEnergy },
          currentStreak: streaks.currentStreak,
          maxStreak: Math.max(user.maxStreak, streaks.maxStreak)
        }
      });

      await tx.energyLog.create({
        data: {
          userId,
          actionType: "task_check",
          amount: task.rewardEnergy,
          balanceAfter: updatedUser.energyBalance,
          refId: task.id
        }
      });

      const goalProgress =
        task.goalId !== null ? await this.goalsService.getGoalProgressTx(tx, userId, task.goalId) : null;
      const justCompleted =
        !!goalProgress &&
        goalProgress.total > 0 &&
        goalProgress.percentage === 100 &&
        (!!beforeGoalProgress && beforeGoalProgress.percentage < 100);

      await this.badgeEngine.syncBadgesForUser(tx, userId);

      return {
        taskId: task.id,
        rewardEnergy: task.rewardEnergy,
        energyBalance: updatedUser.energyBalance,
        currentStreak: updatedUser.currentStreak,
        ...(goalProgress
          ? {
              goalProgress: {
                ...goalProgress,
                justCompleted
              }
            }
          : {})
      };
    });
  }

  async uncheckTask(userId: number, taskId: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const task = await tx.task.findFirst({
        where: {
          id: taskId,
          userId,
          deletedAt: null
        }
      });

      if (!task) {
        throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
      }
      if (task.status !== 1) {
        throw new AppException(ERROR_CODES.STATE_CONFLICT, "状态冲突");
      }

      await tx.task.update({
        where: { id: task.id },
        data: {
          status: 0,
          completedAt: null
        }
      });

      const currentUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const energyDeducted = Math.min(currentUser.energyBalance, task.rewardEnergy);
      const streaks = await this.recalculateStreaksTx(tx, userId);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          energyBalance: currentUser.energyBalance - energyDeducted,
          totalTasksDone: Math.max(currentUser.totalTasksDone - 1, 0),
          totalEnergyEarned: Math.max(currentUser.totalEnergyEarned - task.rewardEnergy, 0),
          currentStreak: streaks.currentStreak,
          maxStreak: streaks.maxStreak
        }
      });

      await tx.energyLog.create({
        data: {
          userId,
          actionType: "task_uncheck",
          amount: -energyDeducted,
          balanceAfter: updatedUser.energyBalance,
          refId: task.id
        }
      });

      const goalProgress =
        task.goalId !== null ? await this.goalsService.getGoalProgressTx(tx, userId, task.goalId) : null;

      await this.badgeEngine.syncBadgesForUser(tx, userId);

      return {
        taskId: task.id,
        energyDeducted,
        energyBalance: updatedUser.energyBalance,
        currentStreak: updatedUser.currentStreak,
        ...(goalProgress ? { goalProgress } : {})
      };
    });
  }

  async postponeTask(userId: number, taskId: number, dto: PostponeTaskDto) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        userId,
        deletedAt: null
      }
    });

    if (!task) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
    }

    const newTask = await this.prisma.task.create({
      data: {
        userId,
        goalId: task.goalId,
        title: task.title,
        rewardEnergy: task.rewardEnergy,
        repeatType: task.repeatType,
        targetDate: dto.targetDate,
        templateId: task.templateId,
        isDelayedCopy: true
      }
    });

    return {
      originalTaskId: task.id,
      newTask: {
        id: newTask.id,
        title: newTask.title,
        targetDate: newTask.targetDate,
        isDelayedCopy: newTask.isDelayedCopy
      }
    };
  }

  async getOverdueTasks(userId: number) {
    const date = addDays(todayDateString(), -1);
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        targetDate: date,
        deletedAt: null,
        status: { not: 1 }
      },
      orderBy: { createdAt: "asc" }
    });

    return {
      date,
      tasks: tasks.map((task: { id: number; title: string; rewardEnergy: number }) => ({
        id: task.id,
        title: task.title,
        rewardEnergy: task.rewardEnergy
      }))
    };
  }

  private toTaskListItem(task: {
    id: number;
    title: string;
    status: number;
    rewardEnergy: number;
    repeatType: number;
    completedAt: Date | null;
    goalId: number | null;
    goal?: { icon: string; title: string } | null;
    isDelayedCopy: boolean;
  }) {
    return {
      id: task.id,
      title: task.title,
      status: task.status,
      rewardEnergy: task.rewardEnergy,
      repeatType: task.repeatType,
      ...(task.completedAt ? { completedAt: task.completedAt.toISOString() } : {}),
      goalId: task.goalId,
      goalIcon: task.goal?.icon ?? "🎯",
      goalTitle: task.goal?.title ?? "",
      isDelayedCopy: task.isDelayedCopy
    };
  }

  private async recalculateStreaksTx(prisma: PrismaTx, userId: number) {
    const completedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 1,
        deletedAt: null
      },
      select: {
        targetDate: true
      },
      orderBy: { targetDate: "asc" }
    });

    const uniqueDates = [...new Set(completedTasks.map((task: { targetDate: string }) => task.targetDate))];
    if (uniqueDates.length === 0) {
      return {
        currentStreak: 0,
        maxStreak: 0
      };
    }

    let maxStreak = 1;
    let currentRun = 1;
    for (let index = 1; index < uniqueDates.length; index += 1) {
      const previous = uniqueDates[index - 1];
      const current = uniqueDates[index];
      if (!previous || !current) {
        continue;
      }
      if (addDays(previous, 1) === current) {
        currentRun += 1;
        maxStreak = Math.max(maxStreak, currentRun);
      } else {
        currentRun = 1;
      }
    }

    let currentStreak = 0;
    let cursor = todayDateString();
    const dateSet = new Set(uniqueDates);
    while (dateSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }

    return {
      currentStreak,
      maxStreak
    };
  }
}

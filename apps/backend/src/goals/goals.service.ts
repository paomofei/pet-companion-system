import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { BadgeEngineService } from "../badges/badge-engine.service";
import { ERROR_CODES } from "../common/constants/error-codes";
import { AppException } from "../common/exceptions/app.exception";
import { ContentPolicyService } from "../common/services/content-policy.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateGoalDto } from "./dto/create-goal.dto";
import type { UpdateGoalDto } from "./dto/update-goal.dto";

type PrismaTx = Prisma.TransactionClient | PrismaService;

@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentPolicy: ContentPolicyService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async listGoals(userId: number) {
    const goals = await this.prisma.goal.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: { createdAt: "asc" }
    });
    const progressMap = await this.getProgressMap(this.prisma, userId);

    return goals.map((goal: { id: number; icon: string; title: string }) => ({
      id: goal.id,
      icon: goal.icon,
      title: goal.title,
      ...progressMap.get(goal.id)!
    }));
  }

  async createGoal(userId: number, dto: CreateGoalDto) {
    const icon = this.contentPolicy.normalizeText(dto.icon, "图标", 10);
    const title = this.contentPolicy.normalizeText(dto.title, "目标标题", 20);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const goal = await tx.goal.create({
        data: {
          userId,
          icon,
          title
        }
      });

      await this.badgeEngine.syncBadgesForUser(tx, userId);

      return {
        id: goal.id,
        icon: goal.icon,
        title: goal.title,
        completed: 0,
        total: 0,
        percentage: 0
      };
    });
  }

  async updateGoal(userId: number, goalId: number, dto: UpdateGoalDto) {
    const goal = await this.prisma.goal.findFirst({
      where: {
        id: goalId,
        userId,
        deletedAt: null
      }
    });

    if (!goal) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
    }

    const updatedGoal = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        icon: dto.icon ? this.contentPolicy.normalizeText(dto.icon, "图标", 10) : goal.icon,
        title: dto.title ? this.contentPolicy.normalizeText(dto.title, "目标标题", 20) : goal.title
      }
    });

    const progress = await this.getGoalProgressTx(this.prisma, userId, goalId);

    return {
      id: updatedGoal.id,
      icon: updatedGoal.icon,
      title: updatedGoal.title,
      completed: progress.completed,
      total: progress.total,
      percentage: progress.percentage
    };
  }

  async deleteGoal(userId: number, goalId: number) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const goal = await tx.goal.findFirst({
        where: {
          id: goalId,
          userId,
          deletedAt: null
        }
      });

      if (!goal) {
        throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
      }

      const unboundTaskCount = await tx.task.count({
        where: {
          userId,
          goalId,
          deletedAt: null
        }
      });

      await tx.task.updateMany({
        where: {
          userId,
          goalId,
          deletedAt: null
        },
        data: {
          goalId: null
        }
      });

      await tx.taskTemplate.updateMany({
        where: {
          userId,
          goalId
        },
        data: {
          goalId: null
        }
      });

      await tx.goal.update({
        where: { id: goalId },
        data: {
          deletedAt: new Date()
        }
      });

      return {
        id: goalId,
        deleted: true,
        unboundTaskCount
      };
    });
  }

  async getGoalProgressTx(prisma: PrismaTx, userId: number, goalId: number) {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        goalId,
        deletedAt: null
      },
      select: {
        status: true
      }
    });

    const total = tasks.length;
    const completed = tasks.filter((task: { status: number }) => task.status === 1).length;

    return {
      goalId,
      completed,
      total,
      percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
    };
  }

  private async getProgressMap(prisma: PrismaTx, userId: number) {
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        deletedAt: null
      },
      select: { id: true }
    });

    const progressMap = new Map<number, { completed: number; total: number; percentage: number }>();
    for (const goal of goals) {
      const progress = await this.getGoalProgressTx(prisma, userId, goal.id);
      progressMap.set(goal.id, {
        completed: progress.completed,
        total: progress.total,
        percentage: progress.percentage
      });
    }
    return progressMap;
  }
}

import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { BadgeEngineService } from "./badge-engine.service";

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async list(userId: number) {
    await this.badgeEngine.syncBadgesForUser(this.prisma, userId);

    const [user, pet, goals, tasks, drawnWishes, badges, userBadges] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.pet.findUnique({ where: { userId } }),
      this.prisma.goal.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.task.findMany({ where: { userId, deletedAt: null } }),
      this.prisma.wish.count({ where: { userId, status: 1, deletedAt: null } }),
      this.prisma.badge.findMany({ orderBy: { id: "asc" } }),
      this.prisma.userBadge.findMany({
        where: { userId },
        orderBy: { badgeId: "asc" }
      })
    ]);

    const unlockedMap = new Map<number, Date>(userBadges.map((badge) => [badge.badgeId, badge.unlockedAt]));
    const completedGoalCount = goals.filter((goal: { id: number }) => {
      const goalTasks = tasks.filter((task: { goalId: number | null; status: number }) => task.goalId === goal.id);
      return goalTasks.length > 0 && goalTasks.every((task: { status: number }) => task.status === 1);
    }).length;

    return badges.map((badge: { id: number; code: string; name: string; icon: string; category: string; threshold: number }) => {
      const unlockedAt = unlockedMap.get(badge.id);
      const progress = this.badgeEngine.computeProgress(badge, {
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        totalTasksDone: user.totalTasksDone,
        petLevel: pet?.level ?? 1,
        goalsCount: goals.length,
        completedGoalCount,
        drawnWishes
      });

      return {
        id: badge.id,
        code: badge.code,
        name: badge.name,
        icon: badge.icon,
        category: badge.category,
        threshold: badge.threshold,
        unlocked: Boolean(unlockedAt),
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        progress
      };
    });
  }
}

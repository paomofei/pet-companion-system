import { Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient | PrismaClient;

@Injectable()
export class BadgeEngineService {
  async syncBadgesForUser(prisma: PrismaTx, userId: number) {
    const [user, pet, goals, tasks, drawnWishes, badges] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.pet.findUnique({ where: { userId } }),
      prisma.goal.findMany({ where: { userId, deletedAt: null } }),
      prisma.task.findMany({ where: { userId, deletedAt: null } }),
      prisma.wish.count({ where: { userId, status: 1, deletedAt: null } }),
      prisma.badge.findMany({ orderBy: { id: "asc" } })
    ]);

    const completedGoalCount = goals.filter((goal: { id: number }) => {
      const goalTasks = tasks.filter((task: { goalId: number | null; status: number }) => task.goalId === goal.id);
      return goalTasks.length > 0 && goalTasks.every((task: { status: number }) => task.status === 1);
    }).length;

    for (const badge of badges) {
      const progress = this.computeProgress(badge, {
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        totalTasksDone: user.totalTasksDone,
        petLevel: pet?.level ?? 1,
        goalsCount: goals.length,
        completedGoalCount,
        drawnWishes
      });

      if (progress < badge.threshold) {
        continue;
      }

      await prisma.userBadge.upsert({
        where: {
          userId_badgeId: {
            userId,
            badgeId: badge.id
          }
        },
        create: {
          userId,
          badgeId: badge.id
        },
        update: {}
      });
    }
  }

  computeProgress(
    badge: { code: string },
    metrics: {
      currentStreak: number;
      maxStreak: number;
      totalTasksDone: number;
      petLevel: number;
      goalsCount: number;
      completedGoalCount: number;
      drawnWishes: number;
    }
  ): number {
    switch (badge.code) {
      case "first_task":
      case "tasks_50":
      case "tasks_100":
        return metrics.totalTasksDone;
      case "streak_7":
      case "streak_21":
      case "streak_30":
        return metrics.maxStreak;
      case "pet_lv5":
      case "pet_lv10":
        return metrics.petLevel;
      case "first_goal":
        return metrics.goalsCount;
      case "goal_complete":
        return metrics.completedGoalCount;
      case "first_draw":
        return metrics.drawnWishes;
      default:
        return 0;
    }
  }
}

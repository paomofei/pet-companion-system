import { Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient | PrismaClient;
type BadgeMetrics = {
  maxStreak: number;
  totalTasksDone: number;
  goalsCount: number;
  completedGoalCount: number;
  drawnWishes: number;
  interactionCount: number;
  maxDailyCompletedTasks: number;
  bestWeeklyCompletionRate: number;
  maxCompletedTasksPerGoal: number;
};

@Injectable()
export class BadgeEngineService {
  async syncBadgesForUser(prisma: PrismaTx, userId: number) {
    const [metrics, badges] = await Promise.all([
      this.buildMetrics(prisma, userId),
      prisma.badge.findMany({ orderBy: { id: "asc" } })
    ]);

    for (const badge of badges) {
      const progress = this.computeProgress(badge, metrics);

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

  async buildMetrics(prisma: PrismaTx, userId: number): Promise<BadgeMetrics> {
    const [user, goals, tasks, drawnWishes, interactionCount] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.goal.findMany({ where: { userId, deletedAt: null } }),
      prisma.task.findMany({ where: { userId, deletedAt: null } }),
      prisma.wish.count({ where: { userId, status: 1, deletedAt: null } }),
      prisma.interactionLog.count({ where: { userId } })
    ]);

    const completedGoalCount = goals.filter((goal: { id: number }) => {
      const goalTasks = tasks.filter((task: { goalId: number | null; status: number }) => task.goalId === goal.id);
      return goalTasks.length > 0 && goalTasks.every((task: { status: number }) => task.status === 1);
    }).length;

    const completedTasks = tasks.filter((task: { status: number }) => task.status === 1);
    const dailyCounts = new Map<string, number>();
    const weeklyStats = new Map<string, { completed: number; total: number }>();
    const goalCompletedCounts = new Map<number, number>();

    for (const task of tasks) {
      const weekKey = toWeekKey(task.targetDate);
      const currentWeek = weeklyStats.get(weekKey) ?? { completed: 0, total: 0 };
      currentWeek.total += 1;
      if (task.status === 1) {
        currentWeek.completed += 1;
      }
      weeklyStats.set(weekKey, currentWeek);
    }

    for (const task of completedTasks) {
      dailyCounts.set(task.targetDate, (dailyCounts.get(task.targetDate) ?? 0) + 1);

      if (task.goalId !== null) {
        goalCompletedCounts.set(task.goalId, (goalCompletedCounts.get(task.goalId) ?? 0) + 1);
      }
    }

    const bestWeeklyCompletionRate = [...weeklyStats.values()].reduce((best, current) => {
      if (current.total === 0) {
        return best;
      }
      return Math.max(best, Math.round((current.completed / current.total) * 100));
    }, 0);

    return {
      maxStreak: user.maxStreak,
      totalTasksDone: user.totalTasksDone,
      goalsCount: goals.length,
      completedGoalCount,
      drawnWishes,
      interactionCount,
      maxDailyCompletedTasks: Math.max(0, ...dailyCounts.values()),
      bestWeeklyCompletionRate,
      maxCompletedTasksPerGoal: Math.max(0, ...goalCompletedCounts.values())
    };
  }

  computeProgress(badge: { code: string }, metrics: BadgeMetrics): number {
    switch (badge.code) {
      case "first_task":
        return metrics.totalTasksDone;
      case "day_tasks_3":
        return metrics.maxDailyCompletedTasks;
      case "streak_3":
      case "streak_7":
        return metrics.maxStreak;
      case "week_completion_80":
        return metrics.bestWeeklyCompletionRate;
      case "first_goal":
      case "goals_parallel_3":
        return metrics.goalsCount;
      case "goal_complete":
        return metrics.completedGoalCount;
      case "goal_tasks_5":
        return metrics.maxCompletedTasksPerGoal;
      case "first_interact":
      case "interact_10":
        return metrics.interactionCount;
      case "first_draw":
        return metrics.drawnWishes;
      default:
        return 0;
    }
  }
}

function toWeekKey(dateString: string): string {
  const date = new Date(`${dateString}T12:00:00+08:00`);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

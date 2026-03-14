import { BadgesService } from "../src/badges/badges.service";

describe("BadgesService", () => {
  it("列表返回 description 字段", async () => {
    const prisma = {
      badge: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            code: "first_task",
            name: "初出茅庐",
            description: "第一次完成任务",
            icon: "⭐",
            category: "任务习惯",
            threshold: 1
          }
        ])
      },
      userBadge: {
        findMany: jest.fn().mockResolvedValue([
          {
            badgeId: 1,
            unlockedAt: new Date("2026-03-14T08:00:00Z")
          }
        ])
      }
    };
    const badgeEngine = {
      syncBadgesForUser: jest.fn().mockResolvedValue(undefined),
      buildMetrics: jest.fn().mockResolvedValue({
        maxStreak: 3,
        totalTasksDone: 1,
        goalsCount: 0,
        completedGoalCount: 0,
        drawnWishes: 0,
        interactionCount: 0,
        maxDailyCompletedTasks: 1,
        bestWeeklyCompletionRate: 20,
        maxCompletedTasksPerGoal: 0
      }),
      computeProgress: jest.fn().mockReturnValue(1)
    };

    const service = new BadgesService(prisma as never, badgeEngine as never);

    await expect(service.list(1)).resolves.toEqual([
      {
        id: 1,
        code: "first_task",
        name: "初出茅庐",
        description: "第一次完成任务",
        icon: "⭐",
        category: "任务习惯",
        threshold: 1,
        unlocked: true,
        unlockedAt: "2026-03-14T08:00:00.000Z",
        progress: 1
      }
    ]);
  });
});

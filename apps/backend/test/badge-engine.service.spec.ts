import { BadgeEngineService } from "../src/badges/badge-engine.service";

describe("BadgeEngineService", () => {
  it("按首版 12 枚勋章规则计算新增进度指标", async () => {
    const service = new BadgeEngineService();
    const prisma = {
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1,
          maxStreak: 7,
          totalTasksDone: 6
        })
      },
      goal: {
        findMany: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }])
      },
      task: {
        findMany: jest.fn().mockResolvedValue([
          { goalId: 1, targetDate: "2026-03-09", status: 1 },
          { goalId: 1, targetDate: "2026-03-09", status: 1 },
          { goalId: 2, targetDate: "2026-03-09", status: 1 },
          { goalId: 1, targetDate: "2026-03-10", status: 1 },
          { goalId: 1, targetDate: "2026-03-11", status: 1 },
          { goalId: 1, targetDate: "2026-03-12", status: 1 },
          { goalId: 2, targetDate: "2026-03-13", status: 0 }
        ])
      },
      wish: {
        count: jest.fn().mockResolvedValue(1)
      },
      interactionLog: {
        count: jest.fn().mockResolvedValue(10)
      }
    };

    const metrics = await service.buildMetrics(prisma as never, 1);

    expect(metrics).toEqual({
      maxStreak: 7,
      totalTasksDone: 6,
      goalsCount: 3,
      completedGoalCount: 1,
      drawnWishes: 1,
      interactionCount: 10,
      maxDailyCompletedTasks: 3,
      bestWeeklyCompletionRate: 86,
      maxCompletedTasksPerGoal: 5
    });
    expect(service.computeProgress({ code: "day_tasks_3" }, metrics)).toBe(3);
    expect(service.computeProgress({ code: "week_completion_80" }, metrics)).toBe(86);
    expect(service.computeProgress({ code: "goal_tasks_5" }, metrics)).toBe(5);
    expect(service.computeProgress({ code: "goals_parallel_3" }, metrics)).toBe(3);
    expect(service.computeProgress({ code: "interact_10" }, metrics)).toBe(10);
  });
});

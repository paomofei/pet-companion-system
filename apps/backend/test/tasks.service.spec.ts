import { ERROR_CODES } from "../src/common/constants/error-codes";
import { TasksService } from "../src/tasks/tasks.service";

describe("TasksService", () => {
  it("打卡完成后返回最新能量、连续打卡和目标达成状态", async () => {
    const today = "2026-03-13";
    const tx = {
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          userId: 1,
          goalId: 1,
          status: 0,
          rewardEnergy: 20
        }),
        update: jest.fn().mockResolvedValue(undefined),
        findMany: jest.fn().mockResolvedValue([{ targetDate: today }])
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1,
          maxStreak: 0
        }),
        update: jest.fn().mockResolvedValue({
          id: 1,
          energyBalance: 140,
          currentStreak: 1
        })
      },
      energyLog: {
        create: jest.fn().mockResolvedValue(undefined)
      }
    };

    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };
    const contentPolicy = {
      normalizeText: jest.fn()
    };
    const goalsService = {
      getGoalProgressTx: jest
        .fn()
        .mockResolvedValueOnce({ goalId: 1, completed: 15, total: 30, percentage: 50 })
        .mockResolvedValueOnce({ goalId: 1, completed: 30, total: 30, percentage: 100 })
    };
    const badgeEngine = {
      syncBadgesForUser: jest.fn().mockResolvedValue(undefined)
    };

    const service = new TasksService(
      prisma as never,
      contentPolicy as never,
      goalsService as never,
      badgeEngine as never
    );

    const result = await service.checkTask(1, 5);

    expect(result).toEqual({
      taskId: 5,
      rewardEnergy: 20,
      energyBalance: 140,
      currentStreak: 1,
      goalProgress: {
        goalId: 1,
        completed: 30,
        total: 30,
        percentage: 100,
        justCompleted: true
      }
    });
  });

  it("重复打卡已完成任务时返回状态冲突", async () => {
    const tx = {
      task: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          userId: 1,
          status: 1
        })
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };
    const service = new TasksService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { getGoalProgressTx: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.checkTask(1, 5)).rejects.toMatchObject({
      code: ERROR_CODES.STATE_CONFLICT
    });
  });
});

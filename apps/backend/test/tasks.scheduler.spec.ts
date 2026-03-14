import { matchesRepeatType } from "../src/common/utils/date.util";
import { TasksScheduler } from "../src/tasks/tasks.scheduler";

describe("matchesRepeatType", () => {
  it("每天任务每天都生成", () => {
    expect(matchesRepeatType("2026-03-14", 1)).toBe(true);
    expect(matchesRepeatType("2026-03-15", 1)).toBe(true);
  });

  it("工作日任务只在周一到周五生成", () => {
    expect(matchesRepeatType("2026-03-13", 2)).toBe(true);
    expect(matchesRepeatType("2026-03-14", 2)).toBe(false);
    expect(matchesRepeatType("2026-03-15", 2)).toBe(false);
  });

  it("周末任务只在周六和周日生成", () => {
    expect(matchesRepeatType("2026-03-13", 3)).toBe(false);
    expect(matchesRepeatType("2026-03-14", 3)).toBe(true);
    expect(matchesRepeatType("2026-03-15", 3)).toBe(true);
  });
});

describe("TasksScheduler", () => {
  it("只为符合规则且未生成的模板创建任务", async () => {
    const prisma = {
      taskTemplate: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            userId: 1,
            goalId: 1,
            title: "每日任务",
            rewardEnergy: 10,
            repeatType: 1
          },
          {
            id: 2,
            userId: 1,
            goalId: 1,
            title: "工作日任务",
            rewardEnergy: 20,
            repeatType: 2
          }
        ])
      },
      task: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 99 }),
        create: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn()
      }
    };

    const scheduler = new TasksScheduler(prisma as never);

    await expect(scheduler.generateRecurringTasks("2026-03-14")).resolves.toEqual({
      targetDate: "2026-03-14",
      createdCount: 1
    });
    expect(prisma.task.create).toHaveBeenCalledTimes(1);
  });

  it("过期标记返回更新数量", async () => {
    const prisma = {
      taskTemplate: {
        findMany: jest.fn()
      },
      task: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 3 })
      }
    };

    const scheduler = new TasksScheduler(prisma as never);

    await expect(scheduler.markOverdueTasks("2026-03-12")).resolves.toEqual({
      targetDate: "2026-03-12",
      updatedCount: 3
    });
  });
});

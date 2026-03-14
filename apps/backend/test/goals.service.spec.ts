import { GoalsService } from "../src/goals/goals.service";

describe("GoalsService", () => {
  it("创建目标时忽略入参 icon 并回写默认 🎯", async () => {
    const tx = {
      goal: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          icon: "🎯",
          title: "期末冲刺"
        })
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };

    const service = new GoalsService(
      prisma as never,
      {
        normalizeText: jest.fn().mockImplementation((value: string) => value.trim())
      } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.createGoal(1, { icon: "🚀", title: " 期末冲刺 " })).resolves.toEqual({
      id: 1,
      icon: "🎯",
      title: "期末冲刺",
      completed: 0,
      total: 0,
      percentage: 0
    });

    expect(tx.goal.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        icon: "🎯",
        title: "期末冲刺"
      }
    });
  });

  it("编辑目标时忽略入参 icon 并回写默认 🎯", async () => {
    const prisma = {
      goal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 7,
          userId: 1,
          icon: "📚",
          title: "旧目标",
          deletedAt: null
        }),
        update: jest.fn().mockResolvedValue({
          id: 7,
          icon: "🎯",
          title: "新目标"
        })
      },
      task: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const service = new GoalsService(
      prisma as never,
      {
        normalizeText: jest.fn().mockImplementation((value: string) => value.trim())
      } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.updateGoal(1, 7, { icon: "🎲", title: " 新目标 " })).resolves.toEqual({
      id: 7,
      icon: "🎯",
      title: "新目标",
      completed: 0,
      total: 0,
      percentage: 0
    });

    expect(prisma.goal.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        icon: "🎯",
        title: "新目标"
      }
    });
  });
});

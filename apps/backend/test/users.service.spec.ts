import { UsersService } from "../src/users/users.service";

describe("UsersService", () => {
  it("首次初始化时按 device_id 创建并绑定用户", async () => {
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 1,
          deviceId: "device-1",
          nickname: "小明",
          energyBalance: 0,
          onboardingOption: 1
        })
      },
      pet: {
        create: jest.fn().mockResolvedValue(undefined),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 2,
          userId: 1,
          name: "汤圆",
          level: 1,
          currentXp: 0,
          maxXp: 100,
          appearance: "cat_default",
          pendingDraw: false
        })
      },
      goal: {
        count: jest.fn()
      },
      task: {
        count: jest.fn()
      },
      taskTemplate: {
        create: jest.fn()
      }
    };
    const prisma = {
      user: {
        findFirst: jest.fn()
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };

    const service = new UsersService(
      prisma as never,
      {
        normalizeText: jest
          .fn()
          .mockImplementation((value: string) => value.trim())
      } as never,
      { syncBadgesForUser: jest.fn().mockResolvedValue(undefined) } as never
    );

    await expect(
      service.init(" device-1 ", {
        nickname: "小明",
        petName: "汤圆",
        onboardingOption: 1
      })
    ).resolves.toMatchObject({
      userId: 1,
      nickname: "小明",
      pendingDraw: false
    });

    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        deviceId: "device-1",
        nickname: "小明",
        onboardingOption: 1
      }
    });
  });

  it("同一 device_id 重复初始化时直接返回已绑定用户，不重复创建", async () => {
    const existingUser = {
      id: 3,
      deviceId: "device-3",
      nickname: "旧昵称",
      energyBalance: 80,
      onboardingOption: 0,
      pet: {
        id: 4,
        userId: 3,
        name: "旧宠物",
        level: 2,
        currentXp: 10,
        maxXp: 100,
        appearance: "cat_default",
        pendingDraw: true
      }
    };
    const tx = {
      user: {
        findFirst: jest.fn().mockResolvedValue(existingUser),
        create: jest.fn()
      },
      pet: {
        findUniqueOrThrow: jest.fn(),
        create: jest.fn()
      },
      goal: {
        count: jest.fn()
      },
      task: {
        count: jest.fn()
      },
      taskTemplate: {
        create: jest.fn()
      }
    };
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(existingUser)
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };

    const service = new UsersService(
      prisma as never,
      {
        normalizeText: jest
          .fn()
          .mockImplementation((value: string) => value.trim())
      } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(
      service.init("device-3", {
        nickname: "新昵称",
        petName: "新宠物",
        onboardingOption: 0
      })
    ).resolves.toEqual({
      userId: 3,
      nickname: "旧昵称",
      pet: {
        id: 4,
        name: "旧宠物",
        level: 2,
        currentXp: 10,
        maxXp: 100,
        appearance: "cat_default"
      },
      energyBalance: 80,
      pendingDraw: true,
      defaultGoals: [],
      defaultTasks: []
    });

    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.pet.create).not.toHaveBeenCalled();
  });

  it("按 device_id 查询当前用户", async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 9 })
      }
    };

    const service = new UsersService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.findCurrentUserByDeviceId(" device-9 ")).resolves.toEqual({ id: 9 });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        deviceId: "device-9",
        deletedAt: null
      },
      orderBy: { id: "asc" }
    });
  });
});

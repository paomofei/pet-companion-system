import { ERROR_CODES } from "../src/common/constants/error-codes";
import { WishesService } from "../src/wishes/wishes.service";

describe("WishesService", () => {
  it("创建心愿时忽略入参 icon 并回写默认 🎁", async () => {
    const prisma = {
      wish: {
        create: jest.fn().mockResolvedValue({
          id: 3,
          icon: "🎁",
          title: "去公园",
          weight: 20,
          status: 0
        })
      }
    };

    const service = new WishesService(
      prisma as never,
      {
        normalizeText: jest.fn().mockImplementation((value: string) => value.trim())
      } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.create(1, { icon: "🚀", title: " 去公园 ", rarity: 2 })).resolves.toEqual({
      id: 3,
      icon: "🎁",
      title: "去公园",
      weight: 20,
      rarity: 2,
      status: 0
    });

    expect(prisma.wish.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        icon: "🎁",
        title: "去公园",
        weight: 20
      }
    });
  });

  it("编辑心愿时忽略入参 icon 并回写默认 🎁", async () => {
    const prisma = {
      wish: {
        findFirst: jest.fn().mockResolvedValue({
          id: 5,
          userId: 1,
          icon: "🍔",
          title: "旧愿望",
          weight: 50,
          status: 0,
          deletedAt: null
        }),
        update: jest.fn().mockResolvedValue({
          id: 5,
          icon: "🎁",
          title: "新愿望",
          weight: 5,
          status: 0
        })
      }
    };

    const service = new WishesService(
      prisma as never,
      {
        normalizeText: jest.fn().mockImplementation((value: string) => value.trim())
      } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.update(1, 5, { icon: "🎲", title: " 新愿望 ", rarity: 3 })).resolves.toEqual({
      id: 5,
      icon: "🎁",
      title: "新愿望",
      weight: 5,
      rarity: 3,
      status: 0
    });

    expect(prisma.wish.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: {
        icon: "🎁",
        title: "新愿望",
        weight: 5
      }
    });
  });

  it("删除待抽取心愿时执行软删除", async () => {
    const prisma = {
      wish: {
        findFirst: jest.fn().mockResolvedValue({
          id: 8,
          userId: 1,
          status: 0,
          deletedAt: null
        }),
        update: jest.fn().mockResolvedValue(undefined)
      }
    };

    const service = new WishesService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.delete(1, 8)).resolves.toEqual({
      id: 8,
      deleted: true
    });
    expect(prisma.wish.update).toHaveBeenCalledTimes(1);
    const [updatePayload] = prisma.wish.update.mock.calls[0] as [
      {
        where: { id: number };
        data: { deletedAt: Date };
      }
    ];
    expect(updatePayload.where).toEqual({ id: 8 });
    expect(updatePayload.data.deletedAt).toBeInstanceOf(Date);
  });

  it("删除已抽取或不存在的心愿时返回 40002", async () => {
    const prisma = {
      wish: {
        findFirst: jest.fn().mockResolvedValue(null)
      }
    };

    const service = new WishesService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.delete(1, 8)).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_NOT_FOUND
    });
  });

  it("没有待抽奖机会时返回 40005", async () => {
    const tx = {
      wishDrawRequest: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      pet: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1,
          pendingDraw: false
        })
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };

    const service = new WishesService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.draw(1, { clientRequestId: "draw-1" })).rejects.toMatchObject({
      code: ERROR_CODES.NO_PENDING_DRAW
    });
  });

  it("奖池为空时返回 40006", async () => {
    const tx = {
      pet: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1,
          pendingDraw: true
        })
      },
      wishDrawRequest: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      wish: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };

    const service = new WishesService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.draw(1, { clientRequestId: "draw-2" })).rejects.toMatchObject({
      code: ERROR_CODES.WISH_POOL_EMPTY
    });
  });

  it("同一个 clientRequestId 重试时返回第一次抽奖结果", async () => {
    const tx = {
      wishDrawRequest: {
        findUnique: jest.fn().mockResolvedValue({
          poolRemaining: 2,
          wish: {
            id: 2,
            icon: "🍔",
            title: "吃一次麦当劳",
            weight: 20,
            drawnAt: new Date("2026-03-12T15:30:00Z")
          }
        })
      }
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };

    const service = new WishesService(
      prisma as never,
      { normalizeText: jest.fn() } as never,
      { syncBadgesForUser: jest.fn() } as never
    );

    await expect(service.draw(1, { clientRequestId: "draw-3" })).resolves.toMatchObject({
      drawnWish: {
        id: 2,
        icon: "🎁",
        title: "吃一次麦当劳",
        rarity: 2
      },
      pendingDraw: false,
      poolRemaining: 2
    });
  });
});

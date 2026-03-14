import { PetsService } from "../src/pets/pets.service";

describe("PetsService", () => {
  it("升级时保留 XP 余数并点亮 pendingDraw", async () => {
    const tx = {
      item: {
        findUnique: jest.fn().mockResolvedValue({
          id: 4,
          costEnergy: 50,
          gainXp: 15
        })
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1,
          energyBalance: 80
        }),
        update: jest.fn().mockResolvedValue({
          id: 1,
          energyBalance: 30
        })
      },
      energyLog: {
        create: jest.fn().mockResolvedValue(undefined)
      },
      pet: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 1,
          level: 3,
          currentXp: 88,
          maxXp: 100,
          pendingDraw: false
        }),
        update: jest.fn().mockResolvedValue({
          id: 1,
          level: 4,
          currentXp: 3,
          maxXp: 100,
          pendingDraw: true
        })
      },
      interactionLog: {
        create: jest.fn().mockResolvedValue(undefined)
      }
    };

    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    };
    const badgeEngine = {
      syncBadgesForUser: jest.fn().mockResolvedValue(undefined)
    };

    const service = new PetsService(prisma as never, badgeEngine as never);
    const result = await service.interact(1, { itemId: 4 });

    expect(result).toEqual({
      energyBalance: 30,
      pet: {
        level: 4,
        currentXp: 3,
        maxXp: 100
      },
      interaction: {
        energyCost: 50,
        xpGained: 15
      },
      leveledUp: true,
      pendingDraw: true
    });
  });
});

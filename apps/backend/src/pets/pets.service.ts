import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { BadgeEngineService } from "../badges/badge-engine.service";
import { ERROR_CODES } from "../common/constants/error-codes";
import { AppException } from "../common/exceptions/app.exception";
import { PrismaService } from "../prisma/prisma.service";
import type { InteractDto } from "./dto/interact.dto";

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async getStatus(userId: number) {
    const pet = await this.prisma.pet.findUniqueOrThrow({
      where: { userId }
    });

    return {
      id: pet.id,
      name: pet.name,
      level: pet.level,
      currentXp: pet.currentXp,
      maxXp: pet.maxXp,
      appearance: pet.appearance,
      pendingDraw: pet.pendingDraw
    };
  }

  async interact(userId: number, dto: InteractDto) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const item = await tx.item.findUnique({
        where: { id: dto.itemId }
      });
      if (!item) {
        throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.energyBalance < item.costEnergy) {
        throw new AppException(ERROR_CODES.ENERGY_NOT_ENOUGH, "能量不足");
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          energyBalance: { decrement: item.costEnergy }
        }
      });

      await tx.energyLog.create({
        data: {
          userId,
          actionType: "pet_interact",
          amount: -item.costEnergy,
          balanceAfter: updatedUser.energyBalance,
          refId: item.id
        }
      });

      const pet = await tx.pet.findUniqueOrThrow({
        where: { userId }
      });

      const totalXp = pet.currentXp + item.gainXp;
      const leveledUp = totalXp >= pet.maxXp;
      const newLevel = leveledUp ? pet.level + 1 : pet.level;
      const newXp = leveledUp ? totalXp % pet.maxXp : totalXp;
      const pendingDraw = leveledUp ? true : pet.pendingDraw;

      const updatedPet = await tx.pet.update({
        where: { id: pet.id },
        data: {
          level: newLevel,
          currentXp: newXp,
          pendingDraw
        }
      });

      await tx.interactionLog.create({
        data: {
          userId,
          petId: pet.id,
          itemId: item.id,
          energyCost: item.costEnergy,
          xpGained: item.gainXp
        }
      });

      await this.badgeEngine.syncBadgesForUser(tx, userId);

      return {
        energyBalance: updatedUser.energyBalance,
        pet: {
          level: updatedPet.level,
          currentXp: updatedPet.currentXp,
          maxXp: updatedPet.maxXp
        },
        interaction: {
          energyCost: item.costEnergy,
          xpGained: item.gainXp
        },
        leveledUp,
        pendingDraw: updatedPet.pendingDraw
      };
    });
  }
}

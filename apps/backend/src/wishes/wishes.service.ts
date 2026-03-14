import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { BadgeEngineService } from "../badges/badge-engine.service";
import { ERROR_CODES } from "../common/constants/error-codes";
import { AppException } from "../common/exceptions/app.exception";
import { ContentPolicyService } from "../common/services/content-policy.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateWishDto } from "./dto/create-wish.dto";
import type { DrawWishDto } from "./dto/draw-wish.dto";
import type { UpdateWishDto } from "./dto/update-wish.dto";

const RARITY_WEIGHT_MAP: Record<number, number> = {
  1: 50,
  2: 20,
  3: 5
};

@Injectable()
export class WishesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentPolicy: ContentPolicyService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async list(userId: number) {
    const wishes = await this.prisma.wish.findMany({
      where: {
        userId,
        status: 0,
        deletedAt: null
      },
      orderBy: { createdAt: "asc" }
    });

    return wishes.map((wish: { id: number; icon: string; title: string; weight: number; status: number }) => this.toWishItem(wish));
  }

  async create(userId: number, dto: CreateWishDto) {
    const icon = this.contentPolicy.normalizeText(dto.icon, "心愿图标", 10);
    const title = this.contentPolicy.normalizeText(dto.title, "心愿标题", 20);

    const wish = await this.prisma.wish.create({
      data: {
        userId,
        icon,
        title,
        weight: RARITY_WEIGHT_MAP[dto.rarity]
      }
    });

    return this.toWishItem(wish);
  }

  async update(userId: number, wishId: number, dto: UpdateWishDto) {
    const wish = await this.prisma.wish.findFirst({
      where: {
        id: wishId,
        userId,
        status: 0,
        deletedAt: null
      }
    });

    if (!wish) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
    }

    const updated = await this.prisma.wish.update({
      where: { id: wish.id },
      data: {
        icon: dto.icon ? this.contentPolicy.normalizeText(dto.icon, "心愿图标", 10) : wish.icon,
        title: dto.title ? this.contentPolicy.normalizeText(dto.title, "心愿标题", 20) : wish.title,
        weight: dto.rarity ? RARITY_WEIGHT_MAP[dto.rarity] : wish.weight
      }
    });

    return this.toWishItem(updated);
  }

  async delete(userId: number, wishId: number) {
    const wish = await this.prisma.wish.findFirst({
      where: {
        id: wishId,
        userId,
        status: 0,
        deletedAt: null
      }
    });

    if (!wish) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "资源不存在");
    }

    await this.prisma.wish.update({
      where: { id: wish.id },
      data: {
        deletedAt: new Date()
      }
    });

    return {
      id: wish.id,
      deleted: true
    };
  }

  async draw(userId: number, dto: DrawWishDto) {
    const clientRequestId = dto.clientRequestId.trim();

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const existingRequest = await tx.wishDrawRequest.findUnique({
          where: {
            userId_clientRequestId: {
              userId,
              clientRequestId
            }
          },
          include: {
            wish: true
          }
        });

        if (existingRequest) {
          return this.toDrawResponse(existingRequest.wish, existingRequest.poolRemaining);
        }

        const pet = await tx.pet.findUniqueOrThrow({ where: { userId } });
        if (!pet.pendingDraw) {
          const completedRequest = await tx.wishDrawRequest.findUnique({
            where: {
              userId_clientRequestId: {
                userId,
                clientRequestId
              }
            },
            include: {
              wish: true
            }
          });

          if (completedRequest) {
            return this.toDrawResponse(completedRequest.wish, completedRequest.poolRemaining);
          }

          throw new AppException(ERROR_CODES.NO_PENDING_DRAW, "无可用抽奖次数");
        }

        const pool = await tx.wish.findMany({
          where: {
            userId,
            status: 0,
            deletedAt: null
          },
          orderBy: { createdAt: "asc" }
        });

        if (pool.length === 0) {
          throw new AppException(ERROR_CODES.WISH_POOL_EMPTY, "奖池为空，先许几个愿望吧");
        }

        const totalWeight = pool.reduce((sum: number, wish: { weight: number }) => sum + wish.weight, 0);
        let random = Math.random() * totalWeight;
        const firstWish = pool[0];
        if (!firstWish) {
          throw new AppException(ERROR_CODES.WISH_POOL_EMPTY, "奖池为空，先许几个愿望吧");
        }
        let hit = firstWish;

        for (const wish of pool) {
          random -= wish.weight;
          if (random < 0) {
            hit = wish;
            break;
          }
        }

        const drawnAt = new Date();
        const updatedWish = await tx.wish.update({
          where: { id: hit.id },
          data: {
            status: 1,
            drawnAt
          }
        });

        await tx.pet.update({
          where: { id: pet.id },
          data: {
            pendingDraw: false
          }
        });

        const poolRemaining = pool.length - 1;
        await tx.wishDrawRequest.create({
          data: {
            userId,
            clientRequestId,
            wishId: updatedWish.id,
            poolRemaining
          }
        });

        await this.badgeEngine.syncBadgesForUser(tx, userId);

        return this.toDrawResponse(updatedWish, poolRemaining);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const existingRequest = await this.prisma.wishDrawRequest.findUnique({
          where: {
            userId_clientRequestId: {
              userId,
              clientRequestId
            }
          },
          include: {
            wish: true
          }
        });

        if (existingRequest) {
          return this.toDrawResponse(existingRequest.wish, existingRequest.poolRemaining);
        }
      }

      throw error;
    }
  }

  async history(userId: number) {
    const history = await this.prisma.wish.findMany({
      where: {
        userId,
        status: 1,
        deletedAt: null
      },
      orderBy: { drawnAt: "desc" }
    });

    return history.map((wish: { id: number; icon: string; title: string; weight: number; drawnAt: Date | null }) => ({
      id: wish.id,
      icon: wish.icon,
      title: wish.title,
      rarity: this.toRarity(wish.weight),
      drawnAt: wish.drawnAt?.toISOString() ?? new Date().toISOString()
    }));
  }

  private toDrawResponse(
    wish: { id: number; icon: string; title: string; weight: number; drawnAt: Date | null },
    poolRemaining: number
  ) {
    return {
      drawnWish: {
        id: wish.id,
        icon: wish.icon,
        title: wish.title,
        rarity: this.toRarity(wish.weight),
        drawnAt: wish.drawnAt?.toISOString() ?? new Date().toISOString()
      },
      pendingDraw: false,
      poolRemaining
    };
  }

  private toWishItem(wish: { id: number; icon: string; title: string; weight: number; status: number }) {
    return {
      id: wish.id,
      icon: wish.icon,
      title: wish.title,
      weight: wish.weight,
      rarity: this.toRarity(wish.weight),
      status: wish.status
    };
  }

  private toRarity(weight: number) {
    if (weight >= 50) {
      return 1;
    }
    if (weight >= 20) {
      return 2;
    }
    return 3;
  }
}

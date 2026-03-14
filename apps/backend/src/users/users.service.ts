import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { BadgeEngineService } from "../badges/badge-engine.service";
import { DEFAULT_GOAL_ICON } from "../common/constants/default-icons";
import { ContentPolicyService } from "../common/services/content-policy.service";
import { todayDateString } from "../common/utils/date.util";
import { PrismaService } from "../prisma/prisma.service";
import type { InitUserDto } from "./dto/init-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentPolicy: ContentPolicyService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async findCurrentUserByDeviceId(deviceId: string) {
    return this.prisma.user.findFirst({
      where: {
        deviceId: deviceId.trim(),
        deletedAt: null
      },
      orderBy: { id: "asc" }
    });
  }

  async init(deviceId: string, dto: InitUserDto) {
    const normalizedDeviceId = deviceId.trim();
    const nickname = this.contentPolicy.normalizeText(dto.nickname, "昵称", 10);
    const petName = this.contentPolicy.normalizeText(dto.petName, "宠物昵称", 10);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingUser = await tx.user.findFirst({
        where: {
          deviceId: normalizedDeviceId,
          deletedAt: null
        },
        include: { pet: true }
      });

      if (existingUser) {
        const pet = existingUser.pet ?? (await tx.pet.findUniqueOrThrow({ where: { userId: existingUser.id } }));

        return this.toInitResponse(existingUser, pet, dto.onboardingOption === 0 ? [] : undefined, []);
      }

      const user = await tx.user.create({
        data: {
          deviceId: normalizedDeviceId,
          nickname,
          onboardingOption: dto.onboardingOption
        }
      });
      await tx.pet.create({
        data: {
          userId: user.id,
          name: petName
        }
      });

      let defaultGoal:
        | {
            id: number;
            icon: string;
            title: string;
          }
        | undefined;
      let defaultTasks: Array<{ id: number; title: string; rewardEnergy: number }> = [];

      if (dto.onboardingOption === 0) {
        const hasActiveData =
          (await tx.goal.count({ where: { userId: user.id, deletedAt: null } })) > 0 ||
          (await tx.task.count({ where: { userId: user.id, deletedAt: null } })) > 0;

        if (!hasActiveData) {
          const goal = await tx.goal.create({
            data: {
              userId: user.id,
              icon: DEFAULT_GOAL_ICON,
              title: "每日好习惯"
            }
          });

          const defaultTaskSeeds = [
            { title: "早起喝一杯水", rewardEnergy: 10 },
            { title: "阅读课外书20分钟", rewardEnergy: 20 },
            { title: "整理书桌", rewardEnergy: 10 }
          ];

          const createdTasks: Array<{ id: number; title: string; rewardEnergy: number }> = [];

          for (const seed of defaultTaskSeeds) {
            const template = await tx.taskTemplate.create({
              data: {
                userId: user.id,
                goalId: goal.id,
                title: seed.title,
                rewardEnergy: seed.rewardEnergy,
                repeatType: 1
              }
            });

            const task = await tx.task.create({
              data: {
                userId: user.id,
                goalId: goal.id,
                title: seed.title,
                rewardEnergy: seed.rewardEnergy,
                repeatType: 1,
                targetDate: todayDateString(),
                templateId: template.id
              }
            });

            createdTasks.push({
              id: task.id,
              title: task.title,
              rewardEnergy: task.rewardEnergy
            });
          }

          defaultGoal = {
            id: goal.id,
            icon: goal.icon,
            title: goal.title
          };
          defaultTasks = createdTasks;
        }
      }

      await this.badgeEngine.syncBadgesForUser(tx, user.id);

      const pet = await tx.pet.findUniqueOrThrow({
        where: { userId: user.id }
      });

      return this.toInitResponse(
        user,
        pet,
        dto.onboardingOption === 0 ? (defaultGoal ? [defaultGoal] : []) : undefined,
        defaultTasks
      );
    });
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { pet: true }
    });

    return {
      userId: user.id,
      nickname: user.nickname,
      energyBalance: user.energyBalance,
      pendingDraw: user.pet?.pendingDraw ?? false,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      totalEnergyEarned: user.totalEnergyEarned,
      totalTasksDone: user.totalTasksDone,
      pet: {
        id: user.pet!.id,
        name: user.pet!.name,
        level: user.pet!.level,
        currentXp: user.pet!.currentXp,
        maxXp: user.pet!.maxXp,
        appearance: user.pet!.appearance
      }
    };
  }

  private toInitResponse(
    user: {
      id: number;
      nickname: string;
      energyBalance: number;
    },
    pet: {
      id: number;
      name: string;
      level: number;
      currentXp: number;
      maxXp: number;
      appearance: string;
      pendingDraw: boolean;
    },
    defaultGoals?: Array<{ id: number; icon: string; title: string }>,
    defaultTasks: Array<{ id: number; title: string; rewardEnergy: number }> = []
  ) {
    return {
      userId: user.id,
      nickname: user.nickname,
      pet: {
        id: pet.id,
        name: pet.name,
        level: pet.level,
        currentXp: pet.currentXp,
        maxXp: pet.maxXp,
        appearance: pet.appearance
      },
      energyBalance: user.energyBalance,
      pendingDraw: pet.pendingDraw,
      ...(defaultGoals
        ? {
            defaultGoals,
            defaultTasks
          }
        : {})
    };
  }
}

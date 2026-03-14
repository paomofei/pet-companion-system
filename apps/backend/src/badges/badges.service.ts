import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { BadgeEngineService } from "./badge-engine.service";

@Injectable()
export class BadgesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badgeEngine: BadgeEngineService
  ) {}

  async list(userId: number) {
    await this.badgeEngine.syncBadgesForUser(this.prisma, userId);

    const [metrics, badges, userBadges] = await Promise.all([
      this.badgeEngine.buildMetrics(this.prisma, userId),
      this.prisma.badge.findMany({ orderBy: { id: "asc" } }),
      this.prisma.userBadge.findMany({
        where: { userId },
        orderBy: { badgeId: "asc" }
      })
    ]);

    const unlockedMap = new Map<number, Date>(userBadges.map((badge) => [badge.badgeId, badge.unlockedAt]));

    return badges.map((badge: { id: number; code: string; name: string; description: string; icon: string; category: string; threshold: number }) => {
      const unlockedAt = unlockedMap.get(badge.id);
      const progress = this.badgeEngine.computeProgress(badge, metrics);

      return {
        id: badge.id,
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category,
        threshold: badge.threshold,
        unlocked: Boolean(unlockedAt),
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
        progress
      };
    });
  }
}

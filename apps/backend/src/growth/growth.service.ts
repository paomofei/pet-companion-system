import { Injectable } from "@nestjs/common";

import { toDateString, weekdayLabel } from "../common/utils/date.util";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(userId: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId }
    });

    return {
      currentStreak: user.currentStreak,
      totalEnergyEarned: user.totalEnergyEarned,
      totalTasksDone: user.totalTasksDone
    };
  }

  async weekly(userId: number) {
    const tasks = await this.prisma.task.findMany({
      where: {
        userId,
        deletedAt: null
      },
      select: {
        targetDate: true,
        status: true
      }
    });

    const today = new Date();
    const result: Array<{ date: string; label: string; completed: number; missed: number }> = [];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const current = new Date(today);
      current.setDate(today.getDate() - offset);
      const date = toDateString(current);
      const completed = tasks.filter((task: { targetDate: string; status: number }) => task.targetDate === date && task.status === 1).length;
      const missed = tasks.filter((task: { targetDate: string; status: number }) => task.targetDate === date && task.status === 2).length;
      result.push({
        date,
        label: weekdayLabel(date),
        completed,
        missed
      });
    }
    return result;
  }
}

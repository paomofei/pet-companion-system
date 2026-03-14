import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@prisma/client";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool)
});

async function main() {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.interactionLog.deleteMany();
    await tx.energyLog.deleteMany();
    await tx.userBadge.deleteMany();
    await tx.badge.deleteMany();
    await tx.item.deleteMany();

    await tx.item.createMany({
      data: [
        { name: "小饼干", icon: "🍪", costEnergy: 10, gainXp: 2, sortOrder: 1 },
        { name: "鲜水果", icon: "🍎", costEnergy: 20, gainXp: 5, sortOrder: 2 },
        { name: "玩球", icon: "🎾", costEnergy: 30, gainXp: 8, sortOrder: 3 },
        { name: "大肉肉", icon: "🍖", costEnergy: 50, gainXp: 15, sortOrder: 4 },
        { name: "飞盘", icon: "🥏", costEnergy: 80, gainXp: 25, sortOrder: 5 }
      ]
    });

    await tx.badge.createMany({
      data: [
        { code: "first_task", name: "初出茅庐", description: "第一次完成任务", icon: "⭐", category: "任务习惯", threshold: 1 },
        { code: "day_tasks_3", name: "今日满满", description: "单日完成3个任务", icon: "✅", category: "任务习惯", threshold: 3 },
        { code: "streak_3", name: "坚持起步", description: "连续完成3天", icon: "🌱", category: "任务习惯", threshold: 3 },
        { code: "streak_7", name: "坚持一周", description: "连续完成7天", icon: "🔥", category: "任务习惯", threshold: 7 },
        { code: "week_completion_80", name: "本周小明星", description: "单周完成率达到80%", icon: "🌟", category: "任务习惯", threshold: 80 },
        { code: "first_goal", name: "目标制定者", description: "第一次创建目标", icon: "🎯", category: "目标成长", threshold: 1 },
        { code: "goal_complete", name: "目标达成者", description: "第一个目标完成", icon: "🏅", category: "目标成长", threshold: 1 },
        { code: "goal_tasks_5", name: "目标推进中", description: "单个目标下累计完成5个任务", icon: "📈", category: "目标成长", threshold: 5 },
        { code: "goals_parallel_3", name: "多线并进", description: "同时推进3个目标", icon: "🧭", category: "目标成长", threshold: 3 },
        { code: "first_interact", name: "小手碰碰", description: "第一次与宠物互动", icon: "🐾", category: "宠物互动", threshold: 1 },
        { code: "interact_10", name: "陪伴达人", description: "累计互动10次", icon: "🎾", category: "宠物互动", threshold: 10 },
        { code: "first_draw", name: "幸运开箱", description: "第一次幸运抽奖", icon: "🎰", category: "宠物互动", threshold: 1 }
      ]
    });
  });
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
    await prisma.$disconnect();
    await pool.end();
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

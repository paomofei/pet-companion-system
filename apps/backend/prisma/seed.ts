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
        { code: "first_task", name: "初出茅庐", description: "完成第 1 个任务", icon: "⭐", category: "坚持", threshold: 1 },
        { code: "streak_7", name: "坚持一周", description: "连续打卡 7 天", icon: "🔥", category: "坚持", threshold: 7 },
        { code: "streak_21", name: "持之以恒", description: "连续打卡 21 天", icon: "💪", category: "坚持", threshold: 21 },
        { code: "streak_30", name: "习惯大师", description: "连续打卡 30 天", icon: "🏆", category: "坚持", threshold: 30 },
        { code: "tasks_50", name: "勤劳小蜜蜂", description: "累计完成 50 个任务", icon: "🐝", category: "学霸", threshold: 50 },
        { code: "tasks_100", name: "百战百胜", description: "累计完成 100 个任务", icon: "💯", category: "学霸", threshold: 100 },
        { code: "pet_lv5", name: "宠物铲屎官", description: "宠物升到 5 级", icon: "🐾", category: "宠物", threshold: 5 },
        { code: "pet_lv10", name: "最佳饲养员", description: "宠物升到 10 级", icon: "👑", category: "宠物", threshold: 10 },
        { code: "first_goal", name: "目标制定者", description: "创建第 1 个目标", icon: "🎯", category: "规划", threshold: 1 },
        { code: "goal_complete", name: "目标达成者", description: "达成第 1 个目标", icon: "🏅", category: "规划", threshold: 1 },
        { code: "first_draw", name: "许愿新手", description: "完成第 1 次抽奖", icon: "🎰", category: "许愿", threshold: 1 }
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

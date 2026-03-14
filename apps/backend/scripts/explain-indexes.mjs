import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://pet_sys:pet_sys@127.0.0.1:5432/pet_sys?schema=public";

const pool = new Pool({
  connectionString: databaseUrl
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool)
});

const checks = [
  {
    name: "tasks by date",
    expectedIndex: "tasks_user_id_target_date_status_idx",
    sql: `
      EXPLAIN
      SELECT *
      FROM tasks
      WHERE user_id = 1
        AND target_date = '2026-03-13'
        AND deleted_at IS NULL
      ORDER BY created_at ASC
    `
  },
  {
    name: "growth weekly source",
    expectedIndex: "tasks_user_id_target_date_status_idx",
    sql: `
      EXPLAIN
      SELECT target_date, status
      FROM tasks
      WHERE user_id = 1
        AND deleted_at IS NULL
    `
  },
  {
    name: "pending wishes",
    expectedIndex: "wishes_user_id_status_deleted_at_idx",
    sql: `
      EXPLAIN
      SELECT *
      FROM wishes
      WHERE user_id = 1
        AND status = 0
        AND deleted_at IS NULL
      ORDER BY created_at ASC
    `
  },
  {
    name: "draw idempotency",
    expectedIndex: "wish_draw_requests_user_id_client_request_id_key",
    sql: `
      EXPLAIN
      SELECT *
      FROM wish_draw_requests
      WHERE user_id = 1
        AND client_request_id = 'draw-1'
    `
  }
];

async function main() {
  await prisma.$executeRawUnsafe("SET enable_seqscan = off");

  for (const check of checks) {
    const rows = await prisma.$queryRawUnsafe(check.sql);
    const plan = rows.map((row) => row["QUERY PLAN"]).join("\n");

    if (!plan.includes(check.expectedIndex)) {
      throw new Error(
        `index not used for ${check.name}: expected ${check.expectedIndex}\n${plan}`
      );
    }

    console.log(`[explain] ${check.name}: ${check.expectedIndex}`);
  }
}

main()
  .catch((error) => {
    console.error("[explain] failed");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

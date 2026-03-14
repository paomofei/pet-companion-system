-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."users" (
    "id" SERIAL NOT NULL,
    "nickname" VARCHAR(20) NOT NULL,
    "energy_balance" INTEGER NOT NULL DEFAULT 0,
    "onboarding_option" INTEGER NOT NULL DEFAULT 0,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "max_streak" INTEGER NOT NULL DEFAULT 0,
    "total_energy_earned" INTEGER NOT NULL DEFAULT 0,
    "total_tasks_done" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "current_xp" INTEGER NOT NULL DEFAULT 0,
    "max_xp" INTEGER NOT NULL DEFAULT 100,
    "appearance" VARCHAR(50) NOT NULL DEFAULT 'cat_default',
    "pending_draw" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."goals" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "icon" VARCHAR(10) NOT NULL DEFAULT '🎯',
    "title" VARCHAR(20) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "goal_id" INTEGER,
    "title" VARCHAR(50) NOT NULL,
    "target_date" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "reward_energy" INTEGER NOT NULL DEFAULT 10,
    "repeat_type" INTEGER NOT NULL DEFAULT 0,
    "template_id" INTEGER,
    "is_delayed_copy" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_templates" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "goal_id" INTEGER,
    "title" VARCHAR(50) NOT NULL,
    "reward_energy" INTEGER NOT NULL DEFAULT 10,
    "repeat_type" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."energy_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action_type" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "ref_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."items" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "icon" VARCHAR(10) NOT NULL,
    "cost_energy" INTEGER NOT NULL,
    "gain_xp" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."interaction_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "pet_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "energy_cost" INTEGER NOT NULL,
    "xp_gained" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wishes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "icon" VARCHAR(10) NOT NULL DEFAULT '🎁',
    "title" VARCHAR(20) NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "status" INTEGER NOT NULL DEFAULT 0,
    "drawn_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wish_draw_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "client_request_id" VARCHAR(64) NOT NULL,
    "wish_id" INTEGER NOT NULL,
    "pool_remaining" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wish_draw_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."badges" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(20) NOT NULL,
    "description" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(10) NOT NULL,
    "category" VARCHAR(20) NOT NULL,
    "threshold" INTEGER NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_badges" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pets_user_id_key" ON "public"."pets"("user_id");

-- CreateIndex
CREATE INDEX "goals_user_id_deleted_at_idx" ON "public"."goals"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "tasks_user_id_target_date_status_idx" ON "public"."tasks"("user_id", "target_date", "status");

-- CreateIndex
CREATE INDEX "tasks_goal_id_status_idx" ON "public"."tasks"("goal_id", "status");

-- CreateIndex
CREATE INDEX "tasks_template_id_target_date_idx" ON "public"."tasks"("template_id", "target_date");

-- CreateIndex
CREATE INDEX "task_templates_user_id_is_active_idx" ON "public"."task_templates"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "energy_logs_user_id_created_at_idx" ON "public"."energy_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "interaction_logs_user_id_created_at_idx" ON "public"."interaction_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wishes_user_id_status_deleted_at_idx" ON "public"."wishes"("user_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "wishes_user_id_drawn_at_idx" ON "public"."wishes"("user_id", "drawn_at" DESC);

-- CreateIndex
CREATE INDEX "wish_draw_requests_user_id_created_at_idx" ON "public"."wish_draw_requests"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wish_draw_requests_user_id_client_request_id_key" ON "public"."wish_draw_requests"("user_id", "client_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_code_key" ON "public"."badges"("code");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "public"."user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "public"."user_badges"("user_id", "badge_id");

-- AddForeignKey
ALTER TABLE "public"."pets" ADD CONSTRAINT "pets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_templates" ADD CONSTRAINT "task_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_templates" ADD CONSTRAINT "task_templates_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."energy_logs" ADD CONSTRAINT "energy_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."interaction_logs" ADD CONSTRAINT "interaction_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."interaction_logs" ADD CONSTRAINT "interaction_logs_pet_id_fkey" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."interaction_logs" ADD CONSTRAINT "interaction_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wishes" ADD CONSTRAINT "wishes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wish_draw_requests" ADD CONSTRAINT "wish_draw_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wish_draw_requests" ADD CONSTRAINT "wish_draw_requests_wish_id_fkey" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


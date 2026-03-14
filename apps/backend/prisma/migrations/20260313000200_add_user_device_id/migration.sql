ALTER TABLE "public"."users"
ADD COLUMN "device_id" VARCHAR(64);

UPDATE "public"."users"
SET "device_id" = CONCAT('legacy-device-', "id")
WHERE "device_id" IS NULL;

ALTER TABLE "public"."users"
ALTER COLUMN "device_id" SET NOT NULL;

CREATE UNIQUE INDEX "users_device_id_key" ON "public"."users"("device_id");

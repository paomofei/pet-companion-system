import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";

import { BadgesController } from "./badges/badges.controller";
import { BadgesService } from "./badges/badges.service";
import { BadgeEngineService } from "./badges/badge-engine.service";
import { CronSecretGuard } from "./common/auth/cron-secret.guard";
import { DeviceIdGuard } from "./common/auth/device-id.guard";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { ContentPolicyService } from "./common/services/content-policy.service";
import { GoalsController } from "./goals/goals.controller";
import { GoalsService } from "./goals/goals.service";
import { GrowthController } from "./growth/growth.controller";
import { GrowthService } from "./growth/growth.service";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { ItemsController } from "./items/items.controller";
import { ItemsService } from "./items/items.service";
import { PetsController } from "./pets/pets.controller";
import { PetsService } from "./pets/pets.service";
import { PrismaModule } from "./prisma/prisma.module";
import { TasksController } from "./tasks/tasks.controller";
import { TasksCronController } from "./tasks/tasks.cron.controller";
import { TasksScheduler } from "./tasks/tasks.scheduler";
import { TasksService } from "./tasks/tasks.service";
import { UsersController } from "./users/users.controller";
import { UsersService } from "./users/users.service";
import { WishesController } from "./wishes/wishes.controller";
import { WishesService } from "./wishes/wishes.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule
  ],
  controllers: [
    UsersController,
    PetsController,
    TasksController,
    TasksCronController,
    GoalsController,
    WishesController,
    GrowthController,
    HealthController,
    BadgesController,
    ItemsController
  ],
  providers: [
    ContentPolicyService,
    UsersService,
    GoalsService,
    TasksService,
    TasksScheduler,
    CronSecretGuard,
    PetsService,
    WishesService,
    GrowthService,
    HealthService,
    BadgesService,
    BadgeEngineService,
    ItemsService,
    {
      provide: APP_GUARD,
      useClass: DeviceIdGuard
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    }
  ]
})
export class AppModule {}

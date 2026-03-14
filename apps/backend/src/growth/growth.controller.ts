import { Controller, Get } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { GrowthService } from "./growth.service";

@ApiTags("growth")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("growth")
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get("stats")
  stats(@CurrentUserId() userId: number) {
    return this.growthService.stats(userId);
  }

  @Get("weekly")
  weekly(@CurrentUserId() userId: number) {
    return this.growthService.weekly(userId);
  }
}

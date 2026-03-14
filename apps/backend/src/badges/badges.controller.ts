import { Controller, Get } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { BadgesService } from "./badges.service";

@ApiTags("badges")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("badges")
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  list(@CurrentUserId() userId: number) {
    return this.badgesService.list(userId);
  }
}

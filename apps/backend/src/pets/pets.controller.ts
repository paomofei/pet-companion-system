import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { InteractDto } from "./dto/interact.dto";
import { PetsService } from "./pets.service";

@ApiTags("pets")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("pets")
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Get("status")
  status(@CurrentUserId() userId: number) {
    return this.petsService.getStatus(userId);
  }

  @Post("interact")
  interact(@CurrentUserId() userId: number, @Body() dto: InteractDto) {
    return this.petsService.interact(userId, dto);
  }
}

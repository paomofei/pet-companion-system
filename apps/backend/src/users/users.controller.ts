import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { Public } from "../common/auth/public.decorator";
import { InitUserDto } from "./dto/init-user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post("init")
  init(@Headers("x-device-id") deviceId: string, @Body() dto: InitUserDto) {
    return this.usersService.init(deviceId, dto);
  }

  @Get("me")
  getMe(@CurrentUserId() userId: number) {
    return this.usersService.getMe(userId);
  }
}

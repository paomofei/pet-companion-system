import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { ERROR_CODES } from "../constants/error-codes";
import { AppException } from "../exceptions/app.exception";
import { UsersService } from "../../users/users.service";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { SKIP_DEVICE_ID_KEY } from "./skip-device-id.decorator";

type DeviceAwareRequest = Request & {
  deviceId?: string;
  user?: {
    id: number;
  };
};

@Injectable()
export class DeviceIdGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipDeviceId = this.reflector.getAllAndOverride<boolean>(SKIP_DEVICE_ID_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (skipDeviceId) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context.switchToHttp().getRequest<DeviceAwareRequest>();
    const headerValue = request.headers["x-device-id"];
    const deviceId = typeof headerValue === "string" ? headerValue.trim() : headerValue?.[0]?.trim();
    if (!deviceId) {
      throw new AppException(ERROR_CODES.PARAM_INVALID, "参数校验失败");
    }

    request.deviceId = deviceId;

    if (isPublic) {
      return true;
    }

    const user = await this.usersService.findCurrentUserByDeviceId(deviceId);
    if (!user) {
      throw new AppException(ERROR_CODES.RESOURCE_NOT_FOUND, "用户未初始化");
    }

    request.user = { id: user.id };
    return true;
  }
}

import { CanActivate, ExecutionContext, HttpStatus, Injectable } from "@nestjs/common";
import type { Request } from "express";

import { ERROR_CODES } from "../constants/error-codes";
import { AppException } from "../exceptions/app.exception";

@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret) {
      throw new AppException(ERROR_CODES.INTERNAL_ERROR, "服务器错误", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization?.trim();

    if (authorization !== `Bearer ${secret}`) {
      throw new AppException(ERROR_CODES.PARAM_INVALID, "参数校验失败", HttpStatus.UNAUTHORIZED);
    }

    return true;
  }
}

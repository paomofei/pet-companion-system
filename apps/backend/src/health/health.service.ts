import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { ERROR_CODES } from "../common/constants/error-codes";
import { AppException } from "../common/exceptions/app.exception";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check() {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
    } catch {
      throw new AppException(
        ERROR_CODES.INTERNAL_ERROR,
        "服务器错误",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }

    return {
      status: "ok",
      database: "up",
      timestamp: new Date().toISOString()
    };
  }
}

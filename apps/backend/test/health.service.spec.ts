import { ERROR_CODES } from "../src/common/constants/error-codes";
import { HealthService } from "../src/health/health.service";

describe("HealthService", () => {
  it("数据库可用时返回健康状态", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }])
    };

    const service = new HealthService(prisma as never);

    await expect(service.check()).resolves.toMatchObject({
      status: "ok",
      database: "up"
    });
  });

  it("数据库不可用时返回统一错误", async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error("db down"))
    };

    const service = new HealthService(prisma as never);

    await expect(service.check()).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR
    });
  });
});

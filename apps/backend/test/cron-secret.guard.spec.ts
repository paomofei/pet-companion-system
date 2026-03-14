import type { ExecutionContext } from "@nestjs/common";

import { CronSecretGuard } from "../src/common/auth/cron-secret.guard";
import { ERROR_CODES } from "../src/common/constants/error-codes";

function createExecutionContext(authorization?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {
          authorization
        }
      })
    })
  } as ExecutionContext;
}

describe("CronSecretGuard", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
      return;
    }

    process.env.CRON_SECRET = originalSecret;
  });

  it("Authorization 匹配时放行", () => {
    process.env.CRON_SECRET = "secret-token";

    const guard = new CronSecretGuard();

    expect(guard.canActivate(createExecutionContext("Bearer secret-token"))).toBe(true);
  });

  it("Authorization 不匹配时拒绝", () => {
    process.env.CRON_SECRET = "secret-token";

    const guard = new CronSecretGuard();

    try {
      guard.canActivate(createExecutionContext("Bearer wrong-token"));
      throw new Error("expected guard to throw");
    } catch (error) {
      expect(error).toMatchObject({
        code: ERROR_CODES.PARAM_INVALID
      });
    }
  });
});

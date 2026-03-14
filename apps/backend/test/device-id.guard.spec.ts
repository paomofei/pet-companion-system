import type { ExecutionContext } from "@nestjs/common";

import { DeviceIdGuard } from "../src/common/auth/device-id.guard";
import { ERROR_CODES } from "../src/common/constants/error-codes";
import { IS_PUBLIC_KEY } from "../src/common/auth/public.decorator";
import { SKIP_DEVICE_ID_KEY } from "../src/common/auth/skip-device-id.decorator";

function createExecutionContext(headers: Record<string, string | string[] | undefined> = {}) {
  const request = { headers };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}

describe("DeviceIdGuard", () => {
  it("SkipDeviceId 标记时允许匿名访问", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((metadataKey: string) => metadataKey === SKIP_DEVICE_ID_KEY)
    };
    const usersService = {
      findCurrentUserByDeviceId: jest.fn()
    };

    const guard = new DeviceIdGuard(reflector as never, usersService as never);

    await expect(guard.canActivate(createExecutionContext())).resolves.toBe(true);
    expect(usersService.findCurrentUserByDeviceId).not.toHaveBeenCalled();
  });

  it("Public 路由仍要求 X-Device-Id", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((metadataKey: string) => metadataKey === IS_PUBLIC_KEY)
    };
    const usersService = {
      findCurrentUserByDeviceId: jest.fn()
    };

    const guard = new DeviceIdGuard(reflector as never, usersService as never);

    await expect(guard.canActivate(createExecutionContext())).rejects.toMatchObject({
      code: ERROR_CODES.PARAM_INVALID
    });
  });

  it("未绑定用户时返回 40002 用户未初始化", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false)
    };
    const usersService = {
      findCurrentUserByDeviceId: jest.fn().mockResolvedValue(null)
    };

    const guard = new DeviceIdGuard(reflector as never, usersService as never);

    await expect(
      guard.canActivate(createExecutionContext({ "x-device-id": "device-1" }))
    ).rejects.toMatchObject({
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: "用户未初始化"
    });
  });

  it("已绑定用户时写入 request.user 并放行", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false)
    };
    const usersService = {
      findCurrentUserByDeviceId: jest.fn().mockResolvedValue({ id: 7 })
    };
    const request = { headers: { "x-device-id": "device-7" } };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request
      })
    } as unknown as ExecutionContext;

    const guard = new DeviceIdGuard(reflector as never, usersService as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toMatchObject({
      deviceId: "device-7",
      user: { id: 7 }
    });
  });
});

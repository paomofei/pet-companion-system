import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<Express.Request>();
  return request.user!.id;
});

import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

type AuthenticatedRequest = Request & {
  user?: {
    id: number;
  };
};

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user!.id;
});

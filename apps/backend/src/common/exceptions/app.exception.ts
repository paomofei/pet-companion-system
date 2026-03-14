import { HttpException, HttpStatus } from "@nestjs/common";

import type { AppErrorCode } from "../constants/error-codes";

export class AppException extends HttpException {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    super(
      {
        code,
        message,
        data: null
      },
      status
    );
  }
}

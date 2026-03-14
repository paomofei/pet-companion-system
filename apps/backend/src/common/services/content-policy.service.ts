import { Injectable } from "@nestjs/common";

import { ERROR_CODES } from "../constants/error-codes";
import { AppException } from "../exceptions/app.exception";

@Injectable()
export class ContentPolicyService {
  private readonly sensitiveWords = (process.env.SENSITIVE_WORDS ?? "")
    .split(",")
    .map((word) => word.trim())
    .filter(Boolean);

  normalizeText(value: string, field: string, maxLength: number): string {
    const normalized = value.trim();
    if (!normalized || normalized.length > maxLength) {
      throw new AppException(ERROR_CODES.PARAM_INVALID, "参数校验失败");
    }
    if (/[<>]/.test(normalized) || /script/i.test(normalized)) {
      throw new AppException(ERROR_CODES.PARAM_INVALID, `${field}包含非法字符`);
    }
    if (this.sensitiveWords.some((word) => normalized.includes(word))) {
      throw new AppException(ERROR_CODES.SENSITIVE_WORD, "敏感词命中");
    }
    return normalized;
  }
}

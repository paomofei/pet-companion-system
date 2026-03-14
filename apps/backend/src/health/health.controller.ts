import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { SkipDeviceId } from "../common/auth/skip-device-id.decorator";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @SkipDeviceId()
  @Get()
  check() {
    return this.healthService.check();
  }
}

import { SetMetadata } from "@nestjs/common";

export const SKIP_DEVICE_ID_KEY = "skipDeviceId";
export const SkipDeviceId = () => SetMetadata(SKIP_DEVICE_ID_KEY, true);

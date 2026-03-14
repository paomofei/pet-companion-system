declare namespace Express {
  interface Request {
    deviceId?: string;
    user?: {
      id: number;
    };
  }
}

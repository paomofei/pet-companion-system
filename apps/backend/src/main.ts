import "reflect-metadata";

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { LogLevel } from "@nestjs/common";

import { AppModule } from "./app.module";
import { AppException } from "./common/exceptions/app.exception";

const SUPPORTED_LOG_LEVELS: LogLevel[] = ["log", "error", "warn", "debug", "verbose", "fatal"];

function parseLogLevels(levels: string | undefined): LogLevel[] {
  const parsedLevels =
    levels
      ?.split(",")
      .map((level) => level.trim())
      .filter((level): level is LogLevel => SUPPORTED_LOG_LEVELS.includes(level as LogLevel)) ?? [];

  return parsedLevels.length > 0 ? parsedLevels : ["log", "warn", "error"];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: parseLogLevels(process.env.LOG_LEVELS)
  });

  app.setGlobalPrefix("api");
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: () => new AppException(40001, "参数校验失败")
    })
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Pet Sys API")
    .setDescription("Pet companion backend API")
    .setVersion("0.1.0")
    .addApiKey(
      {
        type: "apiKey",
        in: "header",
        name: "X-Device-Id"
      },
      "X-Device-Id"
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);

  const appUrl = await app.getUrl();
  Logger.log(`API listening on ${appUrl}/api`, "Bootstrap");
  Logger.log(`Swagger available at ${appUrl}/docs`, "Bootstrap");
}

void bootstrap();

import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { CurrentUserId } from "../common/auth/current-user.decorator";
import { CreateWishDto } from "./dto/create-wish.dto";
import { DrawWishDto } from "./dto/draw-wish.dto";
import { UpdateWishDto } from "./dto/update-wish.dto";
import { WishesService } from "./wishes.service";

@ApiTags("wishes")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("wishes")
export class WishesController {
  constructor(private readonly wishesService: WishesService) {}

  @Get()
  list(@CurrentUserId() userId: number) {
    return this.wishesService.list(userId);
  }

  @Post()
  create(@CurrentUserId() userId: number, @Body() dto: CreateWishDto) {
    return this.wishesService.create(userId, dto);
  }

  @Put(":id")
  update(
    @CurrentUserId() userId: number,
    @Param("id", ParseIntPipe) wishId: number,
    @Body() dto: UpdateWishDto
  ) {
    return this.wishesService.update(userId, wishId, dto);
  }

  @Delete(":id")
  remove(@CurrentUserId() userId: number, @Param("id", ParseIntPipe) wishId: number) {
    return this.wishesService.delete(userId, wishId);
  }

  @Post("draw")
  draw(@CurrentUserId() userId: number, @Body() dto: DrawWishDto) {
    return this.wishesService.draw(userId, dto);
  }

  @Get("history")
  history(@CurrentUserId() userId: number) {
    return this.wishesService.history(userId);
  }
}

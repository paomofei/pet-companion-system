import { Controller, Get } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";

import { ItemsService } from "./items.service";

@ApiTags("items")
@ApiHeader({ name: "X-Device-Id", required: true })
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  list() {
    return this.itemsService.listItems();
  }
}

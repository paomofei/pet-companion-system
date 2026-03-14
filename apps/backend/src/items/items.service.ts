import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async listItems() {
    const items = await this.prisma.item.findMany({
      orderBy: { sortOrder: "asc" }
    });

    return items.map((item: { id: number; name: string; icon: string; costEnergy: number; gainXp: number; sortOrder: number }) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      costEnergy: item.costEnergy,
      gainXp: item.gainXp,
      sortOrder: item.sortOrder
    }));
  }
}

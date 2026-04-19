import { PrismaService } from '../prisma/prisma.service';
export declare class CreateTagDto {
    name: string;
    color?: string;
}
export declare class TagsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        color: string;
    }[]>;
    create(userId: string, dto: CreateTagDto): import(".prisma/client").Prisma.Prisma__TagClient<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        color: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(userId: string, id: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    addToTrade(userId: string, tradeId: string, tagId: string): Promise<{
        tradeId: string;
        tagId: string;
    }>;
    removeFromTrade(userId: string, tradeId: string, tagId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    private assertTradeOwner;
}

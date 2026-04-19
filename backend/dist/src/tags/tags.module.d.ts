import { TagsService, CreateTagDto } from './tags.service';
export declare class TagsController {
    private readonly tagsService;
    constructor(tagsService: TagsService);
    findAll(req: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        color: string;
    }[]>;
    create(req: any, dto: CreateTagDto): import(".prisma/client").Prisma.Prisma__TagClient<{
        id: string;
        name: string;
        createdAt: Date;
        userId: string;
        color: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    remove(req: any, id: string): import(".prisma/client").Prisma.PrismaPromise<import(".prisma/client").Prisma.BatchPayload>;
    addToTrade(req: any, tradeId: string, tagId: string): Promise<{
        tradeId: string;
        tagId: string;
    }>;
    removeFromTrade(req: any, tradeId: string, tagId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
export declare class TagsModule {
}

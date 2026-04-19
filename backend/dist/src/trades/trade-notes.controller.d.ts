import { PrismaService } from '../prisma/prisma.service';
declare class CreateNoteDto {
    content: string;
    emotion?: string;
}
export declare class TradeNotesController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(req: any, tradeId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        emotion: import(".prisma/client").$Enums.Emotion | null;
        tradeId: string;
    }[]>;
    create(req: any, tradeId: string, dto: CreateNoteDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        emotion: import(".prisma/client").$Enums.Emotion | null;
        tradeId: string;
    }>;
    remove(req: any, tradeId: string, noteId: string): Promise<void>;
    private assertOwner;
}
export {};

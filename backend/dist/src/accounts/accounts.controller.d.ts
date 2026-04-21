import { AccountsService, CreateAccountDto, UpdateAccountDto } from './accounts.service';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    findAll(req: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
    }[]>;
    create(req: any, dto: CreateAccountDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    update(req: any, id: string, dto: UpdateAccountDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    regenKey(req: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    remove(req: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
}

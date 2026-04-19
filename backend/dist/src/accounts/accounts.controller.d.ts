import { AccountsService, CreateAccountDto, UpdateAccountDto } from './accounts.service';
export declare class AccountsController {
    private readonly accountsService;
    constructor(accountsService: AccountsService);
    findAll(req: any): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
        userId: string;
    }[]>;
    create(req: any, dto: CreateAccountDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
        userId: string;
    }>;
    update(req: any, id: string, dto: UpdateAccountDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
        userId: string;
    }>;
    regenKey(req: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
        userId: string;
    }>;
    remove(req: any, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: import("@prisma/client/runtime/library").Decimal;
        isActive: boolean;
        apiKey: string | null;
        userId: string;
    }>;
}

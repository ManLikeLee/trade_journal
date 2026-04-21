import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
export declare class CreateAccountDto {
    name: string;
    broker: string;
    accountNumber?: string;
    currency?: string;
    initialBalance?: number;
}
export declare class UpdateAccountDto {
    name?: string;
    broker?: string;
    accountNumber?: string;
}
export declare class AccountsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(userId: string): import(".prisma/client").Prisma.PrismaPromise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: Decimal;
        isActive: boolean;
        apiKey: string | null;
    }[]>;
    create(userId: string, dto: CreateAccountDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    update(userId: string, id: string, dto: UpdateAccountDto): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    regenApiKey(userId: string, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    remove(userId: string, id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        broker: string;
        accountNumber: string | null;
        currency: string;
        initialBalance: Decimal;
        isActive: boolean;
        apiKey: string | null;
    }>;
    private assertOwner;
}

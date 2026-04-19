import { PrismaService } from '../prisma/prisma.service';
declare class UpdateProfileDto {
    name?: string;
    timezone?: string;
}
export declare class UsersController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    me(req: any): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        name: string | null;
        timezone: string;
        createdAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    updateProfile(req: any, dto: UpdateProfileDto): import(".prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        name: string | null;
        timezone: string;
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
}
export declare class UsersModule {
}
export {};

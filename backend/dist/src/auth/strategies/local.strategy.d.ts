import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
declare const LocalStrategy_base: new (...args: any[]) => Strategy;
export declare class LocalStrategy extends LocalStrategy_base {
    private readonly authService;
    constructor(authService: AuthService);
    validate(email: string, password: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string | null;
        avatarUrl: string | null;
        timezone: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};

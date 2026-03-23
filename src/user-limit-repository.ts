import { UserLimit } from './user-limit';

export interface UserLimitRepository {
    findById(userLimitId: string): Promise<UserLimit | null>;
    save(userLimit: UserLimit): Promise<void>;
    getAll(): Promise<UserLimit[]>;
}
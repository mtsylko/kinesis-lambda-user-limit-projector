import { UserLimit } from './user-limit';
import { UserLimitRepository } from './user-limit-repository';

export class InMemoryUserLimitRepository implements UserLimitRepository {
    private readonly storage = new Map<string, UserLimit>();

    async findById(userLimitId: string): Promise<UserLimit | null> {
        return this.storage.get(userLimitId) ?? null;
    }

    async save(userLimit: UserLimit): Promise<void> {
        this.storage.set(userLimit.userLimitId, userLimit);
    }

    async getAll(): Promise<UserLimit[]> {
        return Array.from(this.storage.values());
    }
}
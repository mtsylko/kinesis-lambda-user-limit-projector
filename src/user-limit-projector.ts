import { UserLimit } from './user-limit';
import { UserLimitRepository } from './user-limit-repository';
import {
  SupportedEvent,
  UserLimitCreatedEvent,
  UserLimitProgressChangedEvent,
  UserLimitResetEvent,
} from './event-types';
import { addDecimalStrings } from './helpers';

export class UserLimitProjector {
  constructor(private readonly repository: UserLimitRepository) {}

  async apply(event: SupportedEvent): Promise<void> {
    switch (event.type) {
      case 'USER_LIMIT_CREATED':
        await this.handleCreated(event);
        return;
      case 'USER_LIMIT_PROGRESS_CHANGED':
        await this.handleProgressChanged(event);
        return;
      case 'USER_LIMIT_RESET':
        await this.handleReset(event);
        return;
      default:
        return;
    }
  }

  private async handleCreated(event: UserLimitCreatedEvent): Promise<void> {
    const limit: UserLimit = {
      activeFrom: event.payload.activeFrom,
      brandId: event.payload.brandId,
      currencyCode: event.payload.currencyCode,
      nextResetTime: event.payload.nextResetTime,
      period: event.payload.period,
      progress: '0',
      status: event.payload.status,
      type: event.payload.type,
      userId: event.payload.userId,
      userLimitId: event.payload.userLimitId,
      value: event.payload.value,
      createdAt: event.createdAt,
    };

    await this.repository.save(limit);
  }

  private async handleProgressChanged(event: UserLimitProgressChangedEvent): Promise<void> {
    const existing = await this.repository.findById(event.payload.userLimitId);

    if (!existing) {
      return;
    }

    const progress = addDecimalStrings(event.payload.previousProgress, event.payload.amount);

    await this.repository.save({
      ...existing,
      progress,
      nextResetTime: event.payload.nextResetTime ?? existing.nextResetTime,
    });
  }

  private async handleReset(event: UserLimitResetEvent): Promise<void> {
    const existing = await this.repository.findById(event.payload.userLimitId);

    if (!existing) {
      return;
    }

    await this.repository.save({
      ...existing,
      progress: '0',
      nextResetTime: event.payload.nextResetTime ?? existing.nextResetTime,
    });
  }
}

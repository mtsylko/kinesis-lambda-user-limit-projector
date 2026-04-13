import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryUserLimitRepository } from '../src/in-memory-user-limit-repository';
import { UserLimitProjector } from '../src/user-limit-projector';
import { UserLimitCreatedEvent } from '../src/event-types';
import { LimitPeriod, LimitStatus, LimitType } from '../src/user-limit';

function buildCreatedEvent(
  overrides: Partial<UserLimitCreatedEvent['payload']> = {},
): UserLimitCreatedEvent {
  return {
    eventId: 'event-1',
    type: 'USER_LIMIT_CREATED',
    createdAt: 1000,
    sequenceNumber: 1,
    payload: {
      activeFrom: 900,
      brandId: 'brand-1',
      currencyCode: 'EUR',
      nextResetTime: 2000,
      period: LimitPeriod.DAY,
      status: LimitStatus.ACTIVE,
      type: LimitType.DEPOSIT,
      userId: 'user-1',
      userLimitId: 'limit-1',
      value: '100.00',
      ...overrides,
    },
  };
}

test('creates UserLimit with expected fields on USER_LIMIT_CREATED', async () => {
  const repository = new InMemoryUserLimitRepository();
  const projector = new UserLimitProjector(repository);

  await projector.apply(buildCreatedEvent());
  const saved = await repository.findById('limit-1');

  assert.ok(saved);
  assert.equal(saved.createdAt, 1000);
  assert.equal(saved.progress, '0');
  assert.equal(saved.value, '100.00');
  assert.equal(saved.userId, 'user-1');
});

test('changes progress on USER_LIMIT_PROGRESS_CHANGED', async () => {
  const repository = new InMemoryUserLimitRepository();
  const projector = new UserLimitProjector(repository);

  await projector.apply(buildCreatedEvent());
  await projector.apply({
    eventId: 'event-2',
    type: 'USER_LIMIT_PROGRESS_CHANGED',
    createdAt: 1100,
    sequenceNumber: 2,
    payload: {
      amount: '0.20',
      brandId: 'brand-1',
      currencyCode: 'EUR',
      previousProgress: '0.10',
      remainingAmount: '99.70',
      userId: 'user-1',
      userLimitId: 'limit-1',
      nextResetTime: 2100,
    },
  });

  const saved = await repository.findById('limit-1');
  assert.ok(saved);
  assert.equal(saved.progress, '0.3');
  assert.equal(saved.nextResetTime, 2100);
});

test('resets progress on USER_LIMIT_RESET', async () => {
  const repository = new InMemoryUserLimitRepository();
  const projector = new UserLimitProjector(repository);

  await projector.apply(buildCreatedEvent());
  await projector.apply({
    eventId: 'event-2',
    type: 'USER_LIMIT_PROGRESS_CHANGED',
    createdAt: 1100,
    sequenceNumber: 2,
    payload: {
      amount: '25',
      brandId: 'brand-1',
      currencyCode: 'EUR',
      previousProgress: '0',
      remainingAmount: '75',
      userId: 'user-1',
      userLimitId: 'limit-1',
      nextResetTime: 2100,
    },
  });
  await projector.apply({
    eventId: 'event-3',
    type: 'USER_LIMIT_RESET',
    createdAt: 1200,
    sequenceNumber: 3,
    payload: {
      brandId: 'brand-1',
      currencyCode: 'EUR',
      period: LimitPeriod.DAY,
      resetAmount: '25',
      resetPercentage: '25.00',
      type: LimitType.DEPOSIT,
      unusedAmount: '75',
      userId: 'user-1',
      userLimitId: 'limit-1',
      nextResetTime: 3000,
    },
  });

  const saved = await repository.findById('limit-1');
  assert.ok(saved);
  assert.equal(saved.progress, '0');
  assert.equal(saved.nextResetTime, 3000);
});

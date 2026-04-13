import test from 'node:test';
import assert from 'node:assert/strict';

import { createHandler } from '../src/handler';
import { InMemoryUserLimitRepository } from '../src/in-memory-user-limit-repository';
import { UserLimitProjector } from '../src/user-limit-projector';

type FakeProjector = Pick<UserLimitProjector, 'apply'>;

function encodeRecord(payload: string, sequenceNumber: number) {
  return {
    kinesis: {
      data: Buffer.from(payload, 'utf-8').toString('base64'),
      sequenceNumber: String(sequenceNumber),
    },
  };
}

test('skips invalid JSON record and still processes valid records', async () => {
  const appliedEvents: unknown[] = [];
  const fakeProjector: FakeProjector = {
    apply: async (event) => {
      appliedEvents.push(event);
    },
  };

  const warnCalls: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnCalls.push(args);

  try {
    const handler = createHandler(fakeProjector as UserLimitProjector);
    await handler(
      {
        Records: [
          encodeRecord('{invalid json', 1),
          encodeRecord(
            JSON.stringify({
              eventId: 'event-1',
              createdAt: 1000,
              sequenceNumber: 2,
              type: 'USER_LIMIT_CREATED',
              payload: {
                activeFrom: 900,
                brandId: 'brand-1',
                currencyCode: 'EUR',
                period: 'DAY',
                status: 'ACTIVE',
                type: 'DEPOSIT',
                userId: 'user-1',
                userLimitId: 'limit-1',
                value: '100',
              },
            }),
            2,
          ),
        ],
      } as never,
      {} as never,
      () => undefined,
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(appliedEvents.length, 1);
  assert.equal((appliedEvents[0] as { type: string }).type, 'USER_LIMIT_CREATED');
  assert.equal(warnCalls.length, 1);
});

test('ignores unsupported event types', async () => {
  const fakeProjector: FakeProjector = {
    apply: async () => {
      throw new Error('Should not be called for unsupported event type');
    },
  };

  const handler = createHandler(fakeProjector as UserLimitProjector);
  await handler(
    {
      Records: [
        encodeRecord(
          JSON.stringify({
            eventId: 'event-1',
            createdAt: 1000,
            sequenceNumber: 1,
            type: 'LIMIT_USER_CREATED',
            payload: {},
          }),
          1,
        ),
      ],
    } as never,
    {} as never,
    () => undefined,
  );
});

test('skips malformed supported payloads and continues', async () => {
  const appliedEvents: unknown[] = [];
  const fakeProjector: FakeProjector = {
    apply: async (event) => {
      appliedEvents.push(event);
    },
  };

  const warnCalls: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnCalls.push(args);

  try {
    const handler = createHandler(fakeProjector as UserLimitProjector);
    await handler(
      {
        Records: [
          encodeRecord(
            JSON.stringify({
              eventId: 'event-1',
              createdAt: 1000,
              sequenceNumber: 1,
              type: 'USER_LIMIT_CREATED',
              payload: {
                activeFrom: 900,
                brandId: 'brand-1',
                currencyCode: 'EUR',
                period: 'DAY',
                status: 'ACTIVE',
                type: 'DEPOSIT',
                userId: 'user-1',
                value: '100',
              },
            }),
            1,
          ),
          encodeRecord(
            JSON.stringify({
              eventId: 'event-2',
              createdAt: 1001,
              sequenceNumber: 2,
              type: 'USER_LIMIT_CREATED',
              payload: {
                activeFrom: 901,
                brandId: 'brand-1',
                currencyCode: 'EUR',
                period: 'DAY',
                status: 'ACTIVE',
                type: 'DEPOSIT',
                userId: 'user-1',
                userLimitId: 'limit-2',
                value: '100',
              },
            }),
            2,
          ),
        ],
      } as never,
      {} as never,
      () => undefined,
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(appliedEvents.length, 1);
  assert.equal((appliedEvents[0] as { eventId: string }).eventId, 'event-2');
  assert.equal(warnCalls.length, 1);
});

test('continues with next record when supported event payload is invalid', async () => {
  const repository = new InMemoryUserLimitRepository();
  const projector = new UserLimitProjector(repository);

  const warnCalls: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnCalls.push(args);

  try {
    const handler = createHandler(projector);
    await handler(
      {
        Records: [
          encodeRecord(
            JSON.stringify({
              eventId: 'event-1',
              createdAt: 1000,
              sequenceNumber: 1,
              type: 'USER_LIMIT_CREATED',
              payload: {
                activeFrom: 900,
                brandId: 'brand-1',
                currencyCode: 'EUR',
                period: 'DAY',
                status: 'ACTIVE',
                type: 'DEPOSIT',
                userId: 'user-1',
                userLimitId: 'limit-1',
                value: '100',
              },
            }),
            1,
          ),
          encodeRecord(
            JSON.stringify({
              eventId: 'event-2',
              createdAt: 1001,
              sequenceNumber: 2,
              type: 'USER_LIMIT_PROGRESS_CHANGED',
              payload: {
                amount: '10',
                brandId: 'brand-1',
                currencyCode: 'EUR',
                previousProgress: 'BAD_DECIMAL',
                remainingAmount: '90',
                userId: 'user-1',
                userLimitId: 'limit-1',
                nextResetTime: 2100,
              },
            }),
            2,
          ),
          encodeRecord(
            JSON.stringify({
              eventId: 'event-3',
              createdAt: 1002,
              sequenceNumber: 3,
              type: 'USER_LIMIT_CREATED',
              payload: {
                activeFrom: 901,
                brandId: 'brand-1',
                currencyCode: 'EUR',
                period: 'DAY',
                status: 'ACTIVE',
                type: 'DEPOSIT',
                userId: 'user-1',
                userLimitId: 'limit-2',
                value: '100',
              },
            }),
            3,
          ),
        ],
      } as never,
      {} as never,
      () => undefined,
    );
  } finally {
    console.warn = originalWarn;
  }

  const firstLimit = await repository.findById('limit-1');
  const secondLimit = await repository.findById('limit-2');

  assert.ok(firstLimit);
  assert.equal(firstLimit.progress, '0');
  assert.ok(secondLimit);
  assert.equal(warnCalls.length, 1);
});

test('rethrows non-format errors to allow retries', async () => {
  const fakeProjector: FakeProjector = {
    apply: async () => {
      throw new Error('Temporary DynamoDB outage');
    },
  };

  const handler = createHandler(fakeProjector as UserLimitProjector);

  await assert.rejects(
    async () =>
      handler(
        {
          Records: [
            encodeRecord(
              JSON.stringify({
                eventId: 'event-1',
                createdAt: 1000,
                sequenceNumber: 1,
                type: 'USER_LIMIT_CREATED',
                payload: {
                  activeFrom: 900,
                  brandId: 'brand-1',
                  currencyCode: 'EUR',
                  period: 'DAY',
                  status: 'ACTIVE',
                  type: 'DEPOSIT',
                  userId: 'user-1',
                  userLimitId: 'limit-1',
                  value: '100',
                },
              }),
              1,
            ),
          ],
        } as never,
        {} as never,
        () => undefined,
      ),
    /Temporary DynamoDB outage/,
  );
});

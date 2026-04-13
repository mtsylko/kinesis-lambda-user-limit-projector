import { z } from 'zod';
import { SupportedEvent } from './event-types';
import { InvalidEventError } from './invalid-event-error';
import { LimitPeriod, LimitStatus, LimitType } from './user-limit';

const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^([+-])?(\d+)(?:\.(\d+))?$/, 'Invalid decimal value');

const baseEventSchema = z.object({
  eventId: z.string().min(1),
  createdAt: z.number(),
  sequenceNumber: z.number().int(),
});

const createdEventSchema = baseEventSchema.extend({
  type: z.literal('USER_LIMIT_CREATED'),
  payload: z.object({
    activeFrom: z.number(),
    brandId: z.string().min(1),
    currencyCode: z.string().min(1),
    nextResetTime: z.number().optional(),
    period: z.enum(LimitPeriod),
    status: z.enum(LimitStatus),
    type: z.enum(LimitType),
    userId: z.string().min(1),
    userLimitId: z.string().min(1),
    value: decimalStringSchema,
  }),
});

const progressChangedEventSchema = baseEventSchema.extend({
  type: z.literal('USER_LIMIT_PROGRESS_CHANGED'),
  payload: z.object({
    amount: decimalStringSchema,
    brandId: z.string().min(1),
    currencyCode: z.string().min(1),
    nextResetTime: z.number().optional(),
    previousProgress: decimalStringSchema,
    remainingAmount: decimalStringSchema,
    userId: z.string().min(1),
    userLimitId: z.string().min(1),
  }),
});

const resetEventSchema = baseEventSchema.extend({
  type: z.literal('USER_LIMIT_RESET'),
  payload: z.object({
    brandId: z.string().min(1),
    currencyCode: z.string().min(1),
    nextResetTime: z.number().optional(),
    period: z.enum(LimitPeriod),
    resetAmount: decimalStringSchema,
    resetPercentage: decimalStringSchema,
    type: z.enum(LimitType),
    unusedAmount: decimalStringSchema,
    userId: z.string().min(1),
    userLimitId: z.string().min(1),
  }),
});

const supportedEventSchema = z.discriminatedUnion('type', [
  createdEventSchema,
  progressChangedEventSchema,
  resetEventSchema,
]);

export function parseSupportedEvent(value: unknown): SupportedEvent {
  const result = supportedEventSchema.safeParse(value);

  if (result.success) {
    return result.data as SupportedEvent;
  }

  const issue = result.error.issues[0];
  const path = issue?.path.length ? issue.path.join('.') : 'event';
  const message = issue ? `${path}: ${issue.message}` : 'Unsupported event payload format';
  throw new InvalidEventError(message);
}

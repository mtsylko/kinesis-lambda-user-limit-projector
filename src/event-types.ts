import { LimitPeriod, LimitStatus, LimitType } from './user-limit';

export type EventType = 'USER_LIMIT_CREATED' | 'USER_LIMIT_PROGRESS_CHANGED' | 'USER_LIMIT_RESET';

export interface BaseEvent<TType, TPayload> {
  eventId: string;
  type: TType;
  createdAt: number;
  sequenceNumber: number;
  payload: TPayload;
}

export interface UserLimitCreatedPayload {
  activeFrom: number;
  brandId: string;
  currencyCode: string;
  nextResetTime?: number;
  period: LimitPeriod;
  status: LimitStatus;
  type: LimitType;
  userId: string;
  userLimitId: string;
  value: string;
}

export interface UserLimitProgressChangedPayload {
  amount: string;
  brandId: string;
  currencyCode: string;
  nextResetTime?: number;
  previousProgress: string;
  remainingAmount: string;
  userId: string;
  userLimitId: string;
}

export interface UserLimitResetPayload {
  brandId: string;
  currencyCode: string;
  nextResetTime?: number;
  period: LimitPeriod;
  resetAmount: string;
  resetPercentage: string;
  type: LimitType;
  unusedAmount: string;
  userId: string;
  userLimitId: string;
}

export type UserLimitCreatedEvent = BaseEvent<'USER_LIMIT_CREATED', UserLimitCreatedPayload>;
export type UserLimitProgressChangedEvent = BaseEvent<
  'USER_LIMIT_PROGRESS_CHANGED',
  UserLimitProgressChangedPayload
>;
export type UserLimitResetEvent = BaseEvent<'USER_LIMIT_RESET', UserLimitResetPayload>;

export type SupportedEvent =
  | UserLimitCreatedEvent
  | UserLimitProgressChangedEvent
  | UserLimitResetEvent;

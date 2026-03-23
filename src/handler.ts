import { KinesisStreamEvent, KinesisStreamHandler } from 'aws-lambda';
import { loadAppConfig } from './app-config';
import { createUserLimitRepository } from './user-limit-repository-factory';
import { UserLimitProjector } from './user-limit-projector';
import { SupportedEvent } from './event-types';
import { parseSupportedEvent } from './event-validator';
import { isInvalidEventError } from './invalid-event-error';

const SUPPORTED_EVENT_TYPES = new Set([
    'USER_LIMIT_CREATED',
    'USER_LIMIT_PROGRESS_CHANGED',
    'USER_LIMIT_RESET',
]);

function isSupportedEventType(type: unknown): type is SupportedEvent['type'] {
    return typeof type === 'string' && SUPPORTED_EVENT_TYPES.has(type);
}

export function createHandler(projectorInstance: UserLimitProjector): KinesisStreamHandler {
    return async (event: KinesisStreamEvent) => {
        for (const record of event.Records) {
            let parsed: { type?: unknown };

            try {
                const raw = Buffer.from(record.kinesis.data, 'base64').toString('utf-8');
                parsed = JSON.parse(raw) as { type?: unknown };
            } catch (error) {
                console.warn('Skipping invalid Kinesis record payload', {
                    sequenceNumber: record.kinesis.sequenceNumber,
                    error: error instanceof Error ? error.message : String(error),
                });
                continue;
            }

            if (!isSupportedEventType(parsed.type)) {
                continue;
            }

            try {
                const eventToApply = parseSupportedEvent(parsed);
                await projectorInstance.apply(eventToApply);
            } catch (error) {
                if (!isInvalidEventError(error)) {
                    throw error;
                }

                console.warn('Skipping failed supported event', {
                    sequenceNumber: record.kinesis.sequenceNumber,
                    eventType: parsed.type,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    };
}

const appConfig = loadAppConfig();
const repository = createUserLimitRepository(appConfig);
const projector = new UserLimitProjector(repository);

export const handler: KinesisStreamHandler = createHandler(projector);

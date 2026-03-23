export class InvalidEventError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidEventError';
    }
}

export function isInvalidEventError(error: unknown): error is InvalidEventError {
    return error instanceof InvalidEventError
        || (error instanceof Error && error.name === 'InvalidEventError');
}

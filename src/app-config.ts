export type AppStage = 'local' | 'dev';
export type UserLimitRepositoryType = 'in-memory' | 'dynamodb';

export interface AppConfig {
    stage: AppStage;
    repositoryType: UserLimitRepositoryType;
    awsRegion?: string;
    dynamoTableName?: string;
}

function parseStage(value: string | undefined): AppStage {
    if (value === 'local' || value === 'dev') {
        return value;
    }

    if (!value) {
        return 'local';
    }

    throw new Error(`Invalid APP_STAGE value: ${value}`);
}

function parseRepositoryType(value: string | undefined, stage: AppStage): UserLimitRepositoryType {
    if (!value) {
        return stage === 'local' ? 'in-memory' : 'dynamodb';
    }

    if (value === 'in-memory' || value === 'dynamodb') {
        return value;
    }

    throw new Error(`Invalid USER_LIMIT_REPOSITORY value: ${value}`);
}

export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const stage = parseStage(env.APP_STAGE);
    const repositoryType = parseRepositoryType(env.USER_LIMIT_REPOSITORY, stage);

    const config: AppConfig = {
        stage,
        repositoryType,
        awsRegion: env.REGION,
        dynamoTableName: env.DYNAMODB_TABLE_NAME,
    };

    if (repositoryType === 'dynamodb' && !config.dynamoTableName) {
        throw new Error('DYNAMODB_TABLE_NAME is required when USER_LIMIT_REPOSITORY=dynamodb');
    }

    return config;
}

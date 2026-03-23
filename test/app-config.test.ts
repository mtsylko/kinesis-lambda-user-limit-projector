import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAppConfig } from '../src/app-config';

test('uses local in-memory profile by default', () => {
    const config = loadAppConfig({});

    assert.equal(config.stage, 'local');
    assert.equal(config.repositoryType, 'in-memory');
});

test('requires DynamoDB table for dynamodb repository', () => {
    assert.throws(
        () =>
            loadAppConfig({
                APP_STAGE: 'dev',
                USER_LIMIT_REPOSITORY: 'dynamodb',
                REGION: 'eu-central-1',
            }),
        /DYNAMODB_TABLE_NAME is required/,
    );
});

test('builds valid dynamodb config for dev', () => {
    const config = loadAppConfig({
        APP_STAGE: 'dev',
        USER_LIMIT_REPOSITORY: 'dynamodb',
        REGION: 'eu-central-1',
        DYNAMODB_TABLE_NAME: 'user-limits-dev',
    });

    assert.equal(config.stage, 'dev');
    assert.equal(config.repositoryType, 'dynamodb');
    assert.equal(config.dynamoTableName, 'user-limits-dev');
});

test('rejects prod stage', () => {
    assert.throws(
        () => loadAppConfig({ APP_STAGE: 'prod' }),
        /Invalid APP_STAGE value: prod/,
    );
});

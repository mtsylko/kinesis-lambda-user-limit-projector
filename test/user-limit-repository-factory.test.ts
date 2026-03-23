import test from 'node:test';
import assert from 'node:assert/strict';

import { createUserLimitRepository } from '../src/user-limit-repository-factory';

test('creates in-memory repository', () => {
    const repository = createUserLimitRepository({
        stage: 'local',
        repositoryType: 'in-memory',
    });

    assert.equal(repository.constructor.name, 'InMemoryUserLimitRepository');
});

test('creates dynamodb repository', () => {
    const repository = createUserLimitRepository({
        stage: 'dev',
        repositoryType: 'dynamodb',
        awsRegion: 'eu-central-1',
        dynamoTableName: 'user-limits-dev',
    });

    assert.equal(repository.constructor.name, 'DynamoUserLimitRepository');
});

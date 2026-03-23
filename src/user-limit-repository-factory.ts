import { AppConfig } from './app-config';
import { DynamoUserLimitRepository } from './dynamo-user-limit-repository';
import { InMemoryUserLimitRepository } from './in-memory-user-limit-repository';
import { UserLimitRepository } from './user-limit-repository';

export function createUserLimitRepository(config: AppConfig): UserLimitRepository {
  if (config.repositoryType === 'in-memory') {
    return new InMemoryUserLimitRepository();
  }

  if (config.repositoryType === 'dynamodb') {
    return new DynamoUserLimitRepository(config.dynamoTableName!, config.awsRegion);
  }

  throw new Error(`Unsupported repository type: ${config.repositoryType}`);
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { UserLimit } from './user-limit';
import { UserLimitRepository } from './user-limit-repository';

export class DynamoUserLimitRepository implements UserLimitRepository {
    private readonly documentClient: DynamoDBDocumentClient;

    constructor(
        private readonly tableName: string,
        region?: string,
    ) {
        const dynamoClient = new DynamoDBClient({ region });
        this.documentClient = DynamoDBDocumentClient.from(dynamoClient, {
            marshallOptions: {
                removeUndefinedValues: true,
            },
        });
    }

    async findById(userLimitId: string): Promise<UserLimit | null> {
        const response = await this.documentClient.send(new GetCommand({
            TableName: this.tableName,
            Key: {
                userLimitId,
            },
        }));

        if (!response.Item) {
            return null;
        }

        return response.Item as UserLimit;
    }

    async save(userLimit: UserLimit): Promise<void> {
        await this.documentClient.send(new PutCommand({
            TableName: this.tableName,
            Item: userLimit,
        }));
    }

    async getAll(): Promise<UserLimit[]> {
        const response = await this.documentClient.send(new ScanCommand({
            TableName: this.tableName,
        }));

        return (response.Items ?? []) as UserLimit[];
    }
}

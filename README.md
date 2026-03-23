# kinesis_test_task

AWS Lambda projector for user-limit events from Kinesis.

## Prerequisites

- Node.js 20+
- npm
- AWS CLI v2 (for deployment)
- AWS account with permissions for Lambda, IAM, DynamoDB, CloudWatch Logs, and Kinesis

## Run locally

Install dependencies:

```bash
npm ci
```

Build:

```bash
npm run build
```

Run tests:

```bash
npm test
```

Invoke locally with an in-memory repository and a default sample event:

```bash
npm run invoke:local
```

По умолчанию используется файл:
- `scripts/local-events.json`

Invoke locally with your own event file:

```bash
npm run invoke:local -- ./events/my-event.json
```

`my-event.json` can be:
- A single event payload object
- An array of event payload objects
- A full Kinesis event object with `Records`

The local runner is in:
- `scripts/invoke-local.js`

## Runtime config (Lambda environment variables)

The app reads config from environment variables:

- `APP_STAGE`: `local` | `dev`
- `USER_LIMIT_REPOSITORY`: `in-memory` | `dynamodb`
- `REGION`: AWS region (for DynamoDB client)
- `DYNAMODB_TABLE_NAME`: required when `USER_LIMIT_REPOSITORY=dynamodb`

Typical AWS setup:

- `APP_STAGE=dev`
- `USER_LIMIT_REPOSITORY=dynamodb`
- `REGION=<your-region>`
- `DYNAMODB_TABLE_NAME=<your-table-name>`

## Assemble Lambda package

Build a clean deployable ZIP (`lambda.zip`) without dev dependencies:

```bash
rm -rf build/lambda
mkdir -p build/lambda

cp package.json package-lock.json build/lambda/
cp -R dist build/lambda/

cd build/lambda
npm ci --omit=dev
zip -r ../../lambda.zip .
cd ../..
```

## Deploy on AWS (CLI)

Set shell variables:

```bash
export AWS_REGION=eu-central-1
export FUNCTION_NAME=user-limit-projector
export TABLE_NAME=user-limits-dev
export STREAM_ARN=arn:aws:kinesis:eu-central-1:123456789012:stream/user-limit-events
export ROLE_NAME=user-limit-projector-role
```

### 1. Create DynamoDB table

```bash
aws dynamodb create-table \
  --region "$AWS_REGION" \
  --table-name "$TABLE_NAME" \
  --attribute-definitions AttributeName=userLimitId,AttributeType=S \
  --key-schema AttributeName=userLimitId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### 2. Create IAM role for Lambda

Trust policy:

```bash
cat > trust-policy.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON
```

Create role and attach basic logging permissions:

```bash
aws iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

Inline policy for DynamoDB access:

```bash
cat > dynamodb-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:Scan"],
      "Resource": "arn:aws:dynamodb:${AWS_REGION}:$(aws sts get-caller-identity --query Account --output text):table/${TABLE_NAME}"
    }
  ]
}
JSON

aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name user-limit-projector-dynamodb \
  --policy-document file://dynamodb-policy.json
```

Get role ARN:

```bash
export ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
```

Wait a short time (about 10-30 seconds) for IAM propagation before creating Lambda.

### 3. Create Lambda function

```bash
aws lambda create-function \
  --region "$AWS_REGION" \
  --function-name "$FUNCTION_NAME" \
  --runtime nodejs20.x \
  --handler dist/src/handler.handler \
  --role "$ROLE_ARN" \
  --zip-file fileb://lambda.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={APP_STAGE=dev,USER_LIMIT_REPOSITORY=dynamodb,REGION=${AWS_REGION},DYNAMODB_TABLE_NAME=${TABLE_NAME}}"
```

### 4. Connect Kinesis stream to Lambda

```bash
aws lambda create-event-source-mapping \
  --region "$AWS_REGION" \
  --function-name "$FUNCTION_NAME" \
  --event-source-arn "$STREAM_ARN" \
  --starting-position LATEST \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 1
```

## Update an existing deployment

After code changes:

```bash
npm run build
# rebuild lambda.zip (see "Assemble Lambda package")
aws lambda update-function-code \
  --region "$AWS_REGION" \
  --function-name "$FUNCTION_NAME" \
  --zip-file fileb://lambda.zip
```

If config changed:

```bash
aws lambda update-function-configuration \
  --region "$AWS_REGION" \
  --function-name "$FUNCTION_NAME" \
  --environment "Variables={APP_STAGE=dev,USER_LIMIT_REPOSITORY=dynamodb,REGION=${AWS_REGION},DYNAMODB_TABLE_NAME=${TABLE_NAME}}"
```

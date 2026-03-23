const fs = require('node:fs');
const path = require('node:path');

const {
  InMemoryUserLimitRepository,
} = require('../dist/src/in-memory-user-limit-repository');
const { UserLimitProjector } = require('../dist/src/user-limit-projector');
const { createHandler } = require('../dist/src/handler');
const DEFAULT_EVENTS_FILE = path.resolve(__dirname, './local-events.json');

function toKinesisEvent(payloads) {
  return {
    Records: payloads.map((payload, index) => ({
      kinesis: {
        data: Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64'),
        sequenceNumber: String(index + 1),
      },
    })),
  };
}

function loadInputEvent() {
  const filePath = process.argv[2] ?? DEFAULT_EVENTS_FILE;

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (parsed && Array.isArray(parsed.Records)) {
    return parsed;
  }

  if (Array.isArray(parsed)) {
    return toKinesisEvent(parsed);
  }

  return toKinesisEvent([parsed]);
}

async function main() {
  const repository = new InMemoryUserLimitRepository();
  const projector = new UserLimitProjector(repository);
  const handler = createHandler(projector);

  const event = loadInputEvent();
  const response = await handler(event, {}, () => undefined);
  const items = await repository.getAll();

  console.log('Handler response:');
  console.log(JSON.stringify(response ?? {}, null, 2));
  console.log('Stored limits:');
  console.log(JSON.stringify(items, null, 2));
}

main().catch((error) => {
  console.error('Local invocation failed:', error);
  process.exit(1);
});

1. I liked this task because it is close to real-world backend work. What was missing for full production confidence were several explicit assumptions: duplicate events, out-of-order delivery, and the exact expected state after full replay.

2. If `UserLimit` data should be queried by frontend/API, I would choose DynamoDB.
Reason: it is a strong fit for AWS Lambda + Kinesis, provides low-latency reads, and scales operationally well.

What was implemented in this task:
- repository abstraction and a DynamoDB repository implementation
- event validation for supported events (Zod)
- invalid-event classification to prevent poison-pill behavior from malformed events

What is still needed for production:
- finalize key design for access patterns (for example, `PK = USER#{userId}`, `SK = LIMIT#{brandId}#{type}#{period}` + GSIs if needed)
- idempotency strategy (duplicate event handling)
- infrastructure/IAM and deployment hardening
- replay/backfill process for historical events
- monitoring/alerts for retries, skipped invalid events, and DLQ

3. For frontend access, I would use API Gateway + Lambda.

Proposed API:
- `GET /v1/users/{userId}/limits`

Optional query params:
- `brandId`
- `status`
- `type`
- `period`
- `limit`
- `cursor`

Response:
- `items` (list of `UserLimit`)
- `nextCursor` (pagination token)

4. The current solution is reusable as a projection template, but not yet fully generic.

Current separation is good:
- handler for stream decoding/filtering
- projector for domain rules
- repository for persistence

Because of this, reusing the approach for another event stream is straightforward. In practice, event schemas, mapping rules, and repository details are usually the only parts that need to change.

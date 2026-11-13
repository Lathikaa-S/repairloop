# Database demonstrations

Use an isolated project database. Run migrations and seed first. Tiny tables may use sequential scans even with correct indexes because scanning a few rows is cheaper; do not claim an index is used unless the actual plan says so.

## PostgreSQL relations and normalization

```sql
-- View normalized booking data through joins without copying profile/service fields.
SELECT b.id, u.name AS customer, s.name AS service, b.status, b."amountPaise"
FROM "Booking" b
JOIN "User" u ON u.id = b."userId"
JOIN "Service" s ON s.id = b."serviceId"
ORDER BY b."createdAt" DESC;

-- Inspect the actual reminder-query plan; its predicate matches the compound index.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM "Booking"
WHERE status = 'READY' AND "updatedAt" < NOW() - INTERVAL '24 hours'
LIMIT 100;

-- Read all database-defined indexes rather than assuming the ORM created them.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Inspect exactly-once event evidence for payments.
SELECT "bookingId", COUNT(*) FROM "BookingEvent"
WHERE kind = 'PAYMENT'
GROUP BY "bookingId";
```

The SQL adapter's report uses a LEFT JOIN to keep services with zero bookings, a cancellation filter on the join, GROUP BY service, and ORDER BY booking count. `amountPaise` avoids floating-point money. Query parameters use Prisma's tagged SQL syntax; raw string interpolation is never used for values.

## MongoDB documents and aggregation

In mongosh, select your project database, then:

```javascript
// Bounded metadata is embedded; authorId references a PostgreSQL user.
db.articles.findOne({}, {title: 1, tags: 1, authorId: 1, revision: 1});

// Inspect index definitions and the query's execution statistics.
db.articles.getIndexes();
db.articles.find({tags: 'safety'}).sort({updatedAt: -1}).explain('executionStats');

// Every tag becomes a pipeline row, then rows are grouped and ordered.
db.articles.aggregate([
  {$unwind: '$tags'},
  {$group: {_id: '$tags', articles: {$sum: 1}}},
  {$sort: {articles: -1, _id: 1}}
]);
```

If an article has two tags, it contributes to two groups. Explain why counting after unwind is a count of tag memberships, not necessarily unique articles across all groups. Compare with the report's `Usage` grouping. A missing embedding is not a zero vector; the retrieval code excludes empty vectors and mismatched embedding models.

## Redis cache-aside

Request `/api/services` twice and inspect the `X-Cache` header. After TTL expiry the next request misses and refills from PostgreSQL. The cache contains only the public catalog. OAuth state uses a separate key prefix and a ten-minute expiry.

The integration test uses a unique one-second key to prove actual Redis expiry without waiting for the catalog's 60-second TTL. Demo mode's Map is not Redis evidence.

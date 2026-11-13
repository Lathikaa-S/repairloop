import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
const rows = JSON.parse(
  await readFile(new URL("../docs/concepts.json", import.meta.url)),
);
assert.equal(rows.length, 63);
assert.equal(rows.filter((r) => r.mandatory).length, 25);
assert.equal(new Set(rows.map((r) => r.id)).size, 63);
for (const row of rows) {
  assert.ok(row.demo && row.question && row.status);
  for (const file of row.files)
    await access(new URL(`../${file}`, import.meta.url));
}
console.log(
  "All 63 concepts mapped; 25 mandatory; evidence paths exist. This checks the map, not semantic completeness or awarded marks.",
);

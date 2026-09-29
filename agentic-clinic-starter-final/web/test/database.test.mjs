import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

test("the test process connects only to the dedicated PostgreSQL test database", async () => {
  const url = process.env.DATABASE_URL;
  assert.ok(url, "DATABASE_URL is required for database tests");
  assert.match(url, /localhost:5433\/clinic_test(?:$|[?])/);

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    const result = await pool.query("SELECT current_database() AS database");
    assert.equal(result.rows[0].database, "clinic_test");
  } finally {
    await pool.end();
  }
});

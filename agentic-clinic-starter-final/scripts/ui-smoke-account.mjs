import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { auth, authPool } from '../web/lib/auth.ts';

assert.equal(new URL(process.env.DATABASE_URL).pathname, '/clinic_test', 'Use only the TEST database.');
const path = new URL('../.local/ui-smoke-account.json', import.meta.url);
try {
  if (process.argv[2] === 'create') {
    const email = `synthetic-ui-${randomBytes(10).toString('hex')}@example.invalid`;
    const password = randomBytes(24).toString('base64url');
    const user = await auth.api.createUser({ body: { email, password, name: 'Synthetic UI Admin', role: 'admin' } });
    await authPool.query('UPDATE "user" SET "podId"=$1 WHERE id=$2', ['a', user.user.id]);
    await writeFile(path, JSON.stringify({ id: user.user.id, email, password }), { flag: 'wx' });
    process.stdout.write(`Synthetic TEST UI account: ${email} ${password}\n`);
  } else if (process.argv[2] === 'delete') {
    const saved = JSON.parse(await readFile(path, 'utf8'));
    await authPool.query('DELETE FROM "user" WHERE id=$1', [saved.id]);
    await unlink(path);
    process.stdout.write('Synthetic TEST UI account removed.\n');
  } else throw new Error('Choose create or delete.');
} finally { await authPool.end(); }

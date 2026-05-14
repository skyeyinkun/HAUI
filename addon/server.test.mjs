import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

process.env.NODE_ENV = 'test';

const { app, getSafeBackupFile } = await import('./server.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe('HAUI Add-on API', () => {
  it('returns a narrow system status payload', async () => {
    const response = await fetch(`${baseUrl}/api/system/status`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.product, 'HAUI');
    assert.equal(typeof payload.version, 'string');
    assert.equal(payload.host, 'home-assistant-addon');
    assert.equal(Object.prototype.hasOwnProperty.call(payload, 'HAUI_LICENSE_PUBLIC_KEY'), false);
  });

  it('keeps server backup restore behind HAUI authorization', async () => {
    const response = await fetch(`${baseUrl}/api/backup/restore-server`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'haui-backup-test.json' }),
    });

    assert.equal(response.status, 402);
    const payload = await response.json();
    assert.match(payload.error, /授权/);
  });

  it('blocks HA API proxy before activation', async () => {
    const response = await fetch(`${baseUrl}/ha-api/api/states`);
    assert.equal(response.status, 402);

    const payload = await response.json();
    assert.equal(payload.error, '系统未授权');
    assert.equal(typeof payload.machineCode, 'string');
  });
});

describe('backup file safety', () => {
  it('rejects traversal and non-json backup names', () => {
    assert.equal(getSafeBackupFile('../haui-backup.json'), null);
    assert.equal(getSafeBackupFile('nested/haui-backup.json'), null);
    assert.equal(getSafeBackupFile('haui-backup.txt'), null);
  });
});

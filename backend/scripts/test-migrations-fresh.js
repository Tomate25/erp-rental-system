const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const schema = `test_migrations_${Date.now()}`;
  if (!/^test_migrations_\d+$/.test(schema)) {
    throw new Error('Unsafe temporary schema name');
  }

  const admin = new Client({ connectionString: process.env.DATABASE_URL });
  await admin.connect();

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const testUrl = new URL(process.env.DATABASE_URL);
    testUrl.searchParams.set('schema', schema);

    const prismaCli = require.resolve('prisma/build/index.js');
    const backendDir = path.resolve(__dirname, '..');
    const expectedMigrations = fs
      .readdirSync(path.join(backendDir, 'prisma', 'migrations'), {
        withFileTypes: true,
      })
      .filter((entry) => entry.isDirectory()).length;
    const commandPath = `${path.join(backendDir, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`;
    const result = spawnSync(
      process.execPath,
      [prismaCli, 'migrate', 'deploy'],
      {
        cwd: backendDir,
        env: {
          ...process.env,
          PATH: commandPath,
          DATABASE_URL: testUrl.toString(),
        },
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );

    if (result.status !== 0) {
      throw new Error(
        result.error?.message ||
          result.stderr ||
          result.stdout ||
          `Fresh migration failed with status ${result.status}`,
      );
    }

    const seed = spawnSync(process.execPath, [prismaCli, 'db', 'seed'], {
      cwd: backendDir,
      env: {
        ...process.env,
        PATH: commandPath,
        DATABASE_URL: testUrl.toString(),
        ADMIN_INITIAL_PASSWORD: 'temporary-migration-test-password',
      },
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if (seed.status !== 0) {
      throw new Error(
        seed.error?.message ||
          seed.stderr ||
          seed.stdout ||
          'Fresh schema seed failed',
      );
    }

    const applied = await admin.query(
      `SELECT COUNT(*)::int AS count FROM "${schema}"."_prisma_migrations" WHERE finished_at IS NOT NULL`,
    );
    if (applied.rows[0].count !== expectedMigrations) {
      throw new Error(
        `Expected ${expectedMigrations} applied migrations, got ${applied.rows[0].count}`,
      );
    }

    const diff = spawnSync(
      process.execPath,
      [
        prismaCli,
        'migrate',
        'diff',
        '--from-config-datasource',
        '--to-schema',
        'prisma/schema.prisma',
        '--script',
        '--exit-code',
      ],
      {
        cwd: backendDir,
        env: {
          ...process.env,
          PATH: commandPath,
          DATABASE_URL: testUrl.toString(),
        },
        encoding: 'utf8',
        stdio: 'pipe',
      },
    );
    if (diff.status !== 0) {
      const details = [diff.error?.message, diff.stderr, diff.stdout]
        .filter((value) => value && value.trim())
        .join('\n');
      throw new Error(
        details || `Fresh schema contains drift (status ${diff.status})`,
      );
    }

    console.log(
      `Fresh-schema migration and seed test passed (${expectedMigrations}/${expectedMigrations} migrations, zero drift).`,
    );
  } finally {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

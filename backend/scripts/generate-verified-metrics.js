const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const backendDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(backendDir, '..');
const vaultDir =
  process.env.BISMARK_OBSIDIAN_VAULT ||
  'C:\\Users\\abdia\\OneDrive\\Desktop\\BismarkObsi\\BismarkObsi';
const resultFile = path.join(backendDir, '.metrics-jest.json');

const jest = spawnSync(
  process.execPath,
  [
    require.resolve('jest/bin/jest'),
    '--runInBand',
    '--json',
    `--outputFile=${resultFile}`,
  ],
  { cwd: backendDir, encoding: 'utf8', stdio: 'inherit' },
);
if (jest.status !== 0) process.exit(jest.status || 1);

const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
fs.rmSync(resultFile, { force: true });
const coveragePath = path.join(backendDir, 'coverage', 'coverage-final.json');
let coverage = null;
if (fs.existsSync(coveragePath)) {
  const report = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const totals = {
    statements: [0, 0],
    branches: [0, 0],
    functions: [0, 0],
    lines: [0, 0],
  };
  for (const file of Object.values(report)) {
    const statementHits = Object.values(file.s);
    const functionHits = Object.values(file.f);
    const branchHits = Object.values(file.b).flat();
    const lineHits = new Map();
    for (const [id, hits] of Object.entries(file.s)) {
      const line = file.statementMap[id].start.line;
      lineHits.set(line, (lineHits.get(line) || 0) + hits);
    }
    for (const [key, hits] of [
      ['statements', statementHits],
      ['branches', branchHits],
      ['functions', functionHits],
      ['lines', [...lineHits.values()]],
    ]) {
      totals[key][0] += hits.filter((hit) => hit > 0).length;
      totals[key][1] += hits.length;
    }
  }
  coverage = Object.fromEntries(
    Object.entries(totals).map(([key, [covered, total]]) => [
      key,
      total ? Math.floor((covered / total) * 10000) / 100 : 100,
    ]),
  );
}
const migrations = fs
  .readdirSync(path.join(backendDir, 'prisma', 'migrations'), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isDirectory()).length;
const git = spawnSync('git', ['status', '--short'], {
  cwd: repoDir,
  encoding: 'utf8',
});
const timestamp = new Date().toISOString();
const lines = [
  '---',
  'tipo: metricas_verificadas',
  `generado_en: ${timestamp}`,
  'generador: backend/scripts/generate-verified-metrics.js',
  '---',
  '',
  '# Métricas verificadas',
  '',
  `- Backend Jest: **${result.numPassedTests}/${result.numTotalTests} pruebas**, ${result.numPassedTestSuites}/${result.numTotalTestSuites} suites.`,
  `- Migraciones Prisma presentes: **${migrations}**.`,
  coverage
    ? `- Cobertura global: statements **${coverage.statements}%**, branches **${coverage.branches}%**, functions **${coverage.functions}%**, lines **${coverage.lines}%**.`
    : '- Cobertura global: ejecutar `npm run test:cov` antes de regenerar.',
  `- Árbol Git: **${git.stdout.trim() ? 'con cambios sin confirmar' : 'limpio'}**.`,
  '',
  '> Generado desde resultados locales; no contiene credenciales ni variables de entorno.',
  '',
].join('\n');

fs.writeFileSync(path.join(vaultDir, '06_METRICAS_VERIFICADAS.md'), lines);
console.log(
  `Métricas escritas en ${path.join(vaultDir, '06_METRICAS_VERIFICADAS.md')}`,
);

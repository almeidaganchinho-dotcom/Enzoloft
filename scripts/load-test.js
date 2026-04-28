const autocannon = require('autocannon');

const cliArgs = process.argv.slice(2);
const isSmokeMode = cliArgs.includes('--smoke');

const baseUrl = process.env.LOAD_TEST_BASE_URL || 'https://enzoloft.pt';
const connections = Number(process.env.LOAD_TEST_CONNECTIONS || (isSmokeMode ? 3 : 10));
const duration = Number(process.env.LOAD_TEST_DURATION || (isSmokeMode ? 8 : 20));
const pipelining = Number(process.env.LOAD_TEST_PIPELINING || 1);
const timeout = Number(process.env.LOAD_TEST_TIMEOUT || 15);
const warmupSeconds = Number(process.env.LOAD_TEST_WARMUP || (isSmokeMode ? 2 : 5));
const softFail = process.env.LOAD_TEST_SOFT_FAIL === '1' || isSmokeMode;

const productionHosts = new Set([
  'enzoloft.pt',
  'www.enzoloft.pt',
  'enzoloft-51508.web.app',
]);

const resolveHostname = (urlValue) => {
  try {
    return new URL(urlValue).hostname.toLowerCase();
  } catch {
    return '';
  }
};

const targetHostname = resolveHostname(baseUrl);
const isProductionTarget = productionHosts.has(targetHostname);
const allowProductionLoadTest = process.env.ALLOW_PROD_LOAD_TEST === '1';

if (isProductionTarget && !allowProductionLoadTest) {
  console.error('⛔ Load test bloqueado para produção.');
  console.error(`Host alvo: ${targetHostname}`);
  console.error('Para permitir explicitamente, execute com ALLOW_PROD_LOAD_TEST=1.');
  process.exit(1);
}

const scenarios = [
  {
    name: 'Homepage',
    path: '/',
    method: 'GET',
    expectedStatusCode: 200,
  },
  {
    name: 'Admin Login Page',
    path: '/admin/login',
    method: 'GET',
    expectedStatusCode: 200,
  },
  {
    name: 'Admin Dashboard Page',
    path: '/admin/dashboard',
    method: 'GET',
    expectedStatusCode: 200,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runScenario = (scenario) =>
  new Promise((resolve, reject) => {
    const targetUrl = `${baseUrl.replace(/\/$/, '')}${scenario.path}`;
    console.log(`\n▶ Running: ${scenario.name} (${targetUrl})`);

    const instance = autocannon(
      {
        url: targetUrl,
        method: scenario.method,
        connections,
        duration,
        pipelining,
        timeout,
        headers: {
          'User-Agent': 'EnzoLoft-LoadTest/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({ scenario, result });
      }
    );

    autocannon.track(instance, {
      renderProgressBar: true,
      renderResultsTable: true,
      renderLatencyTable: true,
    });
  });

const evaluateResult = ({ scenario, result }) => {
  const p95 =
    result.latency?.p95 ||
    result.latency?.['95'] ||
    result.latency?.p97_5 ||
    result.latency?.['97.5'] ||
    result.latency?.average ||
    0;
  const errorCount = result.errors || 0;
  const timeoutCount = result.timeouts || 0;
  const non2xx = result.non2xx || 0;
  const requestsPerSec = result.requests?.average || 0;
  const throughputMb = result.throughput?.average || 0;

  const failures = [];

  if (non2xx > 0) {
    failures.push(`non2xx=${non2xx}`);
  }

  if (errorCount > 0) {
    failures.push(`errors=${errorCount}`);
  }

  if (timeoutCount > 0) {
    failures.push(`timeouts=${timeoutCount}`);
  }

  if (p95 > 1200) {
    failures.push(`latency_p95=${p95}ms (>1200ms)`);
  }

  console.log(`\nSummary: ${scenario.name}`);
  console.log(`- req/s avg: ${requestsPerSec.toFixed(2)}`);
  console.log(`- throughput avg: ${(throughputMb / 1024 / 1024).toFixed(2)} MB/s`);
  console.log(`- latency p95: ${p95} ms`);
  console.log(`- errors: ${errorCount}, timeouts: ${timeoutCount}, non2xx: ${non2xx}`);

  return {
    scenario: scenario.name,
    ok: failures.length === 0,
    failures,
  };
};

const run = async () => {
  console.log('EnzoLoft Load Test');
  console.log(`- mode: ${isSmokeMode ? 'smoke' : 'standard'}`);
  console.log(`- base URL: ${baseUrl}`);
  console.log(`- connections: ${connections}`);
  console.log(`- duration per scenario: ${duration}s`);
  console.log(`- warmup: ${warmupSeconds}s`);

  if (warmupSeconds > 0) {
    console.log('\n⏳ Warmup...');
    await sleep(warmupSeconds * 1000);
  }

  const evaluations = [];

  for (const scenario of scenarios) {
    const payload = await runScenario(scenario);
    const evaluation = evaluateResult(payload);
    evaluations.push(evaluation);
  }

  const failed = evaluations.filter((entry) => !entry.ok);
  if (failed.length === 0) {
    console.log('\n✅ Load test finished successfully.');
    return;
  }

  console.log('\n❌ Load test detected failures:');
  failed.forEach((entry) => {
    console.log(`- ${entry.scenario}: ${entry.failures.join(', ')}`);
  });

  if (softFail) {
    console.log('\n⚠ SOFT_FAIL active, exiting with success code.');
    return;
  }

  process.exitCode = 1;
};

run().catch((error) => {
  console.error('Load test failed to execute:', error);
  process.exitCode = 1;
});

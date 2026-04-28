# Testes de Carga (Load Testing)

Este projeto usa `autocannon` para testar carga HTTP do frontend publicado.

## Comandos

- Smoke (seguro):

```bash
npm run loadtest:smoke
```

- Carga normal:

```bash
npm run loadtest
```

## Variáveis úteis

- `LOAD_TEST_BASE_URL` (default: `https://enzoloft.pt`)
- `LOAD_TEST_CONNECTIONS` (default: `10`)
- `LOAD_TEST_DURATION` em segundos por cenário (default: `20`)
- `LOAD_TEST_PIPELINING` (default: `1`)
- `LOAD_TEST_TIMEOUT` em segundos (default: `15`)
- `LOAD_TEST_WARMUP` em segundos (default: `5`)
- `LOAD_TEST_SOFT_FAIL=1` para não falhar o processo em thresholds
- `ALLOW_PROD_LOAD_TEST=1` para permitir testes contra produção (`enzoloft.pt`, `www.enzoloft.pt`, `enzoloft-51508.web.app`)

Exemplo:

```bash
LOAD_TEST_BASE_URL=https://enzoloft.pt LOAD_TEST_CONNECTIONS=20 LOAD_TEST_DURATION=30 npm run loadtest
```

## Cenários atuais

1. `GET /`
2. `GET /admin/login`
3. `GET /admin/dashboard`

## Boas práticas

- Começar por `loadtest:smoke`.
- Por segurança, testes em produção estão bloqueados por defeito.
- Evitar carga alta em horários de pico.
- Se for testar produção com maior carga, aumentar gradualmente (10 -> 20 -> 40 conexões).
- Monitorizar erros, timeouts e latência `p95`.

## Nota de segurança

Sem `ALLOW_PROD_LOAD_TEST=1`, o script falha automaticamente quando o host alvo é produção.

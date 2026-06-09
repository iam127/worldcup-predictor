# k6 Load & Stress Testing

## Instalar k6

```powershell
winget install k6 --source winget
```

O con Chocolatey:
```powershell
choco install k6
```

## Correr load test (50 VUs × 2 min)

```powershell
k6 run k6/load-test.js
```

Contra otro host:
```powershell
k6 run -e BASE_URL=http://staging.example.com k6/load-test.js
```

## Correr stress test (3 escenarios: 100 → 500 → 1000 VUs)

```powershell
k6 run k6/stress-test.js
```

## Enviar resultados a Grafana (vía InfluxDB)

Asegúrate de que los servicios de monitoreo estén corriendo:
```powershell
docker compose up -d influxdb grafana prometheus
```

Luego:
```powershell
k6 run --out influxdb=http://localhost:8086/k6 k6/stress-test.js
```

## Ver resultados en Grafana

1. Abre http://localhost:3001
2. Usuario: `admin` / Contraseña: `admin123`
3. Importa el dashboard de k6: ID **2587** (k6 Load Testing Results)
4. Selecciona datasource `InfluxDB-k6`

## Ver métricas del backend en Prometheus

- Prometheus UI: http://localhost:9090
- Métricas raw: http://localhost/api/metrics
- Grafana dashboards: http://localhost:3001

## Escenarios de stress-test.js

| Escenario      | Inicio | VUs  | Duración |
|----------------|--------|------|----------|
| `carga_normal` | 0s     | 100  | 2 min    |
| `pico_carga`   | 3m     | 500  | 2 min    |
| `stress`       | 6m     | 1000 | 4 min    |

Duración total: ~10 minutos.

## Umbrales (thresholds)

- `p(95) < 2000ms` — El 95% de los requests debe responder en menos de 2 s
- `http_req_failed < 5%` — Menos del 5% de fallos HTTP
- `errors < 10%` — Menos del 10% de checks fallidos

"""
FinGuard - API Latency & Throughput Benchmark Suite
Measures actual response latencies (mean, median/p50, p95, p99) against running Spring Boot REST API:
  - GET /api/dashboard/summary
  - GET /api/alerts
  - GET /api/alerts/{id}
  - GET /api/customers/{id}
  - GET /api/customers/{id}/explanation
  - GET /api/batches
Outputs results/api_latency_benchmark.csv and results/api_latency_benchmark.json.
"""

import os
import sys
import time
import json
import statistics
import urllib.request
import urllib.error

BASE_URL = "http://localhost:8080"
RESULTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "results"))


def test_endpoint(url, iterations=30):
    latencies = []
    status_codes = []

    for _ in range(iterations):
        start = time.perf_counter()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "FinGuard-Benchmark"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                latencies.append(elapsed_ms)
                status_codes.append(resp.getcode())
        except urllib.error.HTTPError as e:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            latencies.append(elapsed_ms)
            status_codes.append(e.code)
        except Exception as e:
            print(f"[!] Error calling {url}: {e}")
            break

    if not latencies:
        return None

    sorted_lats = sorted(latencies)
    n = len(sorted_lats)
    mean_lat = statistics.mean(sorted_lats)
    median_lat = statistics.median(sorted_lats)
    p95_idx = int(0.95 * n) - 1 if int(0.95 * n) > 0 else 0
    p95_lat = sorted_lats[p95_idx]
    p99_idx = int(0.99 * n) - 1 if int(0.99 * n) > 0 else 0
    p99_lat = sorted_lats[p99_idx]
    success_rate = (status_codes.count(200) / len(status_codes)) * 100.0

    return {
        "requests": n,
        "mean_ms": round(mean_lat, 2),
        "median_ms": round(median_lat, 2),
        "p95_ms": round(p95_lat, 2),
        "p99_ms": round(p99_lat, 2),
        "success_rate": round(success_rate, 1)
    }


def run_benchmark():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print("=" * 85)
    print("          FINGUARD REST API LATENCY BENCHMARK (LIVE EXECUTION)")
    print("=" * 85)

    # First fetch sample alert and customer ID
    sample_alert_id = "ALT_BATCH-2026-0002_3000213"
    sample_cust_id = "CUST_0025"

    try:
        req = urllib.request.Request(f"{BASE_URL}/api/alerts?size=1")
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if data.get("content") and len(data["content"]) > 0:
                sample_alert_id = data["content"][0]["alertId"]
                sample_cust_id = data["content"][0]["customerId"]
    except Exception as e:
        print(f"[!] Warning fetching sample ids: {e}")

    endpoints = [
        ("GET /api/dashboard/summary", f"{BASE_URL}/api/dashboard/summary"),
        ("GET /api/dashboard/risk-distribution", f"{BASE_URL}/api/dashboard/risk-distribution"),
        ("GET /api/dashboard/risk-trend", f"{BASE_URL}/api/dashboard/risk-trend"),
        ("GET /api/alerts (page=0, size=20)", f"{BASE_URL}/api/alerts?page=0&size=20"),
        (f"GET /api/alerts/{{id}}", f"{BASE_URL}/api/alerts/{sample_alert_id}"),
        (f"GET /api/customers/{{id}}", f"{BASE_URL}/api/customers/{sample_cust_id}"),
        (f"GET /api/customers/{{id}}/explanation", f"{BASE_URL}/api/customers/{sample_cust_id}/explanation"),
        ("GET /api/batches", f"{BASE_URL}/api/batches")
    ]

    results = []
    print(f"{'Endpoint':<36} | {'Reqs':<5} | {'Mean (ms)':<10} | {'p50 (ms)':<10} | {'p95 (ms)':<10} | {'p99 (ms)':<10}")
    print("-" * 85)

    for name, url in endpoints:
        bench = test_endpoint(url, iterations=25)
        if bench:
            bench["endpoint"] = name
            results.append(bench)
            print(f"{name:<36} | {bench['requests']:<5} | {bench['mean_ms']:<10.2f} | {bench['median_ms']:<10.2f} | {bench['p95_ms']:<10.2f} | {bench['p99_ms']:<10.2f}")
        else:
            print(f"{name:<36} | FAILED")

    print("=" * 85 + "\n")

    # Save to CSV and JSON
    import pandas as pd
    df = pd.DataFrame(results)
    csv_path = os.path.join(RESULTS_DIR, "api_latency_benchmark.csv")
    json_path = os.path.join(RESULTS_DIR, "api_latency_benchmark.json")

    df[["endpoint", "requests", "mean_ms", "median_ms", "p95_ms", "p99_ms", "success_rate"]].to_csv(csv_path, index=False)
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"[+] Benchmark exported to:\n    - {csv_path}\n    - {json_path}")


if __name__ == "__main__":
    run_benchmark()

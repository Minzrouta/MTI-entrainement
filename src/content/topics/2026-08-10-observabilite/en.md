---
title: "Observability: logs, metrics & traces"
date: "2026-08-10"
category: "DevOps"
level: "Intermédiaire"
summary: "The three pillars, Prometheus, OpenTelemetry, SLOs: knowing how to explain debugging a production system — the question that separates those who have deployed from those who have only coded."
---

## The essentials

**Monitoring** answers questions **known in advance**: "is CPU above 80%?", "is the service responding?". You define thresholds, display dashboards, alert. **Observability** goes further: it's the ability to answer questions you **hadn't anticipated** — "why are premium users' requests on this endpoint slow since the 2pm deploy?" — from the data the system emits (its *outputs*), without redeploying hand-instrumented code.

The distinction comes from the world of distributed systems: with a monolith, you SSH into the server and read the logs. With 15 services behind a load balancer, a request crosses 6 services — knowing *that* it's slow (monitoring) doesn't tell you *where or why* (observability).

In an internship interview, this topic makes the difference because it reveals whether the candidate has actually **operated** an application, not just written code: anyone who has hunted a production bug through 2 requests/second of unstructured logs immediately understands why all of this exists.

## How it works

Observability rests on **three complementary pillars**:

**Logs** — discrete, timestamped events: "this request failed with this error". The modern rule: **structured JSON logs** (`{"level":"error","route":"/checkout","user_id":42,"duration_ms":870}`) rather than free text — you can then filter, aggregate, and search by field. Essential: a **correlation identifier** (request ID, trace ID) propagated from service to service, to reconstruct a request's journey through the logs of the whole stack.

**Metrics** — numeric values **aggregated** over time: counters, gauges, histograms. Cheap to store, perfect for dashboards and alerts. Two classic reading grids: **RED** for services (Rate: requests/s, Errors: error rate, Duration: latency — in p50/p95/p99 percentiles, never averages) and **USE** for resources (Utilization, Saturation, Errors). A metric says *there is* a problem, rarely *which one*.

**Traces** — the journey of an **individual request** through the services. A trace is a tree of **spans**: each span represents one operation (HTTP call, SQL query) with a start, a duration, attributes and a parent. The magic is called **context propagation**: the trace ID and parent span ID travel in HTTP headers (the W3C `traceparent` standard) from service to service, allowing the full tree to be reconstructed — and letting you see at a glance that out of 800 ms of latency, 600 sit in a SQL query in service C.

The typical stack a candidate should be able to cite: **Prometheus** (metrics, *pull* model: it scrapes a `/metrics` endpoint, with its PromQL query language) + **Grafana** (dashboards); **Loki** or the **ELK** stack (Elasticsearch/Logstash/Kibana) for logs; **Jaeger** or **Tempo** for traces. And above it all: **OpenTelemetry (OTel)**, the CNCF's **vendor-neutral** standard unifying instrumentation — per-language SDKs, often auto-instrumentation, a **Collector** that receives, transforms and exports to the backend of your choice. Instrument once, switch backends without touching the code: that's the key argument.

## Key concepts to master

- **Correlation across pillars**: the real power comes from the link — a metric alert (rising p99) → the slow traces of that period → the logs of the failing spans, tied together by the trace ID. The three pillars in isolation are three silos; correlated, they're a diagnostic tool.
- **Cardinality and cost**: every combination of a metric's label values creates a distinct time series. A `user_id` label on a counter = potentially millions of series = Prometheus memory blowing up (cardinality explosion). Rule: labels with **bounded** values (status code, endpoint, region); unique identifiers belong in logs and traces, not metrics. Same logic on the cost side: verbose logs are billed per GB ingested, hence trace sampling in production.
- **SLI/SLO**: an **SLI** is a measurement of what users experience (e.g. "proportion of requests served under 300 ms"), an **SLO** is the target you commit to on it (e.g. 99.9% over 30 days). The resulting error budget arbitrates between reliability and deployment velocity.
- **Alert on symptoms, not causes**: you alert on what users suffer (error rate, latency — the SLIs), not on possible causes (high CPU, memory at 90%). A CPU at 95% with happy users doesn't deserve to wake anyone up; a 5% error rate does, whatever the cause. Causes get consulted in dashboards *after* the symptom alert fires.

## In an interview

**"What's the difference between monitoring and observability?"** — Monitoring checks conditions known in advance (thresholds, predefined dashboards); observability lets you interrogate the system about unanticipated problems, thanks to rich data (structured logs, traces, metrics) the system emits. A line that lands: monitoring tells you *that* it's broken, observability lets you understand *why*.

**"Explain the three pillars."** — Logs: discrete events, rich in context, expensive in volume. Metrics: numeric aggregates, cheap, perfect for alerting, poor in context. Traces: a request's journey across services, broken into spans. Close on correlation via trace ID: that's what turns three tools into one system.

**"How would you debug an API that suddenly got slow in production?"** — RED dashboard: p99 latency is up — on which endpoint, since when, correlated with a deploy? Traces of the slow requests: which span carries the latency (SQL? external call? the service itself?). Logs correlated by trace ID for the detail. A structured metrics → traces → logs answer = a candidate who understands the system.

**"What is OpenTelemetry and why did it become the standard?"** — A CNCF project standardizing the generation and export of the three signals: per-language API/SDK, context propagation, the Collector. Vendor-neutral: instrument once and export to Jaeger, Prometheus, Datadog or anything else — no lock-in through instrumentation. It has become the common foundation of the whole ecosystem.

**"Why look at p99 rather than average latency?"** — The average hides the distribution: 99 requests at 50 ms + 1 at 5 s = a decent average, a disastrous experience for 1% of users — often the most active ones (more requests = more chances of hitting the tail). Percentiles describe what users actually experience.

## Pitfalls & misconceptions

- **Logging without context**: a `console.log("error")` with no request ID, no user ID, no structured field is unreadable at 100 req/s. Structured logging + correlation, otherwise it's noise.
- **Alert fatigue**: alerts that scream constantly (thresholds too tight, alerts on causes) end up ignored — and the day it's serious, nobody looks. Every alert must be **actionable**; an alert you acknowledge without acting on should be deleted or reworked.
- **Dashboards nobody looks at**: piling up 40 dashboards is not observability. A few symptom-oriented views (RED per service) consulted during incidents beat a decorative wall of screens.
- **Cardinality explosion**: putting `user_id` or a UUID as a Prometheus label blows up memory. Unique identifiers → logs and traces.
- **"We'll add observability later"**: instrumenting after the incident is too late. OTel auto-instrumentation makes the initial cost low — the excuse no longer holds.
- **Tracing 100% in production**: the volume costs a lot for marginal value; you sample (head/tail sampling) while always keeping errored and slowest traces.

## Going further

- [OpenTelemetry documentation](https://opentelemetry.io/docs/) — start with [Concepts](https://opentelemetry.io/docs/concepts/), then instrument a small app with auto-instrumentation
- [Prometheus — Overview](https://prometheus.io/docs/introduction/overview/) and the [label best practices](https://prometheus.io/docs/practices/naming/) (the page that prevents cardinality explosion)
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/): the founding chapter on symptoms vs causes and the golden signals
- [Grafana — Get started](https://grafana.com/docs/grafana/latest/getting-started/): spin up Prometheus + Grafana locally with Docker Compose and hook up an instrumented app — the ideal hands-on exercise before an interview

# Session Coach Rollout & Observability Checklist

1. **Telemetry coverage**
   - `/api/chatbot/stream` and `/api/chatbot/analyze` both emit `~/lib/logger` events with `{ mode, sessionId, analysisType?, durationMs, success, errorCode?, metadata? }`.
   - `mutateMisalignmentStatus` emits `{ sessionId, misalignmentId, oldStatus, newStatus, userId?, at }` for every transition (`open`, `acknowledged`, `dismissed`).
2. **Dashboards & alerts (staging first, prod second)**
   - Add panels for:
     - `/api/chatbot/stream`: p50/p95 latency + error rate.
     - `/api/chatbot/analyze`: latency + error rate split by `analysisType`.
     - Misalignment status changes: count by `newStatus`.
     - Session Coach usage: total conversations tagged by `mode`.
   - Extend the existing HTTP 5xx + high latency alerts to cover the new endpoints (no separate telemetry pipeline).
3. **Lead time requirement**
   - Allocate **two business days** before enabling `SESSION_COACH_ENABLED` in production:
     - **Day 1:** land/verify staging dashboards + alerts; smoke-test logger payloads end-to-end.
     - **Day 2:** copy the same panels/alerts to prod, confirm signal quality, and secure approval from the current `viewer.loader`/`~/lib/logger` owner.
   - Do not flip the prod feature flag without explicit sign-off from that owner.
4. **Runtime validation**
   - In staging, exercise: summary/commit pop-outs, misalignment banner actions, and timeline badge clicks. Confirm that remediation metadata reaches `/api/chatbot/stream` and that banner/timeline dismissals update status immediately.
   - Capture screenshots of the new dashboards + alert rules as part of the rollout memo.

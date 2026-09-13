# E2E — جهازان متزامنان

## Preconditions
- Firebase Authentication: Email/Password enabled.
- Two test users exist; each has a server-side custom claim `role` (`staff` or `supervisor`).
- The same Firebase config is configured in both browser sessions.
- Realtime Database or Firestore rules from this repository are deployed.
- No production customer data is used.

## Parallel scenario
1. Browser A signs in as staff/counter A.
2. Browser B signs in as staff/counter B.
3. A issues ticket for service S.
4. B immediately issues another ticket for service S.
5. A and B press **Call Next** concurrently.
6. Verify each ticket is called once and assigned to a different counter.
7. A transfers its active ticket to service T.
8. B completes its active ticket.
9. Refresh both browsers and verify identical queue state.
10. Sign out one browser and verify its cloud writes are rejected by rules.
11. Sign in a viewer and verify reads succeed but queue writes are rejected.

## Pass criteria
- No duplicate ticket IDs/codes.
- No ticket is simultaneously `waiting` and `serving`.
- No ticket is served by two counters.
- Transfer produces exactly one transfer history entry.
- Completion is persisted after refresh.
- Viewer cannot mutate queue state.
- An unauthenticated browser cannot read/write the protected queue path.

## Current environment limitation
This repository can run static/concurrency tests locally, but a true two-browser Firebase E2E run requires a configured Firebase project and browser automation/runtime. Do not mark this scenario PASS until it is executed against a real Firebase instance.

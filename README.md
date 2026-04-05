# GateGuard: Entry Gate Management and Security System

<p align="center">
  <img src="Final_IITGN_Logo_symmetric.png" alt="IITGN Symmetric Logo" width="260" />
</p>

A production style campus gate operations platform built for IIT Gandhinagar coursework.

GateGuard combines identity, access control, visit tracking, occupancy monitoring, auditability, and performance instrumentation in one coherent system. The project is designed to feel operationally real, not just academically correct.

![Node](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=flat&logo=postgresql&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=0B1020)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat&logo=vite&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat&logo=jsonwebtokens&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat&logo=tailwindcss&logoColor=white)

Course context:
- CS432 Databases
- IIT Gandhinagar
- Semester II, 2025-26
- Assignment 2 (Module A + Module B) and Assignment 3 (Module A + Module B)

## Deliverables Index

**Assignment 2**
- Module A report notebook: [assignment-2/Module_A/report.ipynb](assignment-2/Module_A/report.ipynb)
- Module B optimization report: [assignment-2/Module_B/GateGuard_Assignment2_ModuleB.pdf](assignment-2/Module_B/GateGuard_Assignment2_ModuleB.pdf)
- Module A demo video: [Watch on Google Drive](https://drive.google.com/file/d/1M1kOq_RaadSPwgeEWFKPklp_ofboC86h/view?usp=sharing)
- Module B demo video: [Watch on Google Drive](https://drive.google.com/file/d/1ZYdkB-B-roHZbspme7DJIoVP3XuJP0oG/view?usp=sharing)

**Assignment 3**
- Module A transaction engine: [assignment-3/Module_A/test_transactions.ipynb](assignment-3/Module_A/test_transactions.ipynb)
- Module B stress test suite: [assignment-3/Module_B/stress_tests/](assignment-3/Module_B/stress_tests/)
- Full report (PDF): [assignment-3/GateGuard_Assignment3_Report.pdf](assignment-3/GateGuard_Assignment3_Report.pdf)
- Assignment 3 demo video: [Watch on YouTube](https://youtu.be/oKl7505LjB8)

---

## 1) Why GateGuard Exists

Campus access data is usually fragmented across manual logs, ad hoc gate notes, and disconnected spreadsheets. That breaks traceability and slows security teams down when they need quick, reliable answers.

GateGuard solves this by centralizing:
- Member and vehicle registries
- Gate level occupancy
- Person and vehicle visit lifecycles
- Role based access and approvals
- Immutable audit trails
- Operational dashboards and quick actions

The guiding idea is simple: security data should be trustworthy, searchable, and immediately actionable.

---

## 2) System Snapshot

### Core capabilities

- Secure authentication with JWT access and refresh model
- Password reset using OTP and reset token pairing
- Account lockout policy with configurable thresholds
- Forced first login password change flow
- Role based authorization for Guard, Admin, and SuperAdmin
- Admin request and SuperAdmin approval workflow for user creation
- Complete CRUD flows for members, vehicles, and gates
- Live entry and exit operations for both person and vehicle visits
- Gate occupancy monitoring and emergency override controls
- Audit log persistence in both DB and file outputs
- Indexed query paths with EXPLAIN based benchmarking

### Technology stack

- Backend: Node.js, Express, PostgreSQL, JWT
- Frontend: React 18, Vite, Tailwind CSS, Framer Motion
- Tooling: nodemon, SQL scripts, health checks, smoke checks

---

## 3) Architecture Overview

~~~mermaid
flowchart LR
    U[Web Client] -->|HTTPS| V[Vite Frontend]
    V -->|/api proxy| A[Express API]

    A --> M1[Auth Middleware]
    A --> M2[RBAC Middleware]
    A --> M3[Validation Layer]
    A --> S[Service Layer]
    S --> D[(PostgreSQL)]
    S --> L[Audit File Logs]

    D --> T1[Member, Vehicle, Gate]
    D --> T2[PersonVisit, VehicleVisit, GateOccupancy]
    D --> T3[User, Role, RefreshToken, TokenBlacklist]
    D --> T4[PasswordResetToken, LoginHistory, UserCreationRequest]
~~~

### Request lifecycle

~~~mermaid
sequenceDiagram
    participant Client
    participant API
    participant Auth
    participant Service
    participant DB

    Client->>API: Request with access token
    API->>Auth: Verify token and blacklist check
    Auth-->>API: Auth context
    API->>Service: Execute business operation
    Service->>DB: Read or write transaction
    DB-->>Service: Result set
    Service-->>API: Normalized payload
    API-->>Client: JSON success or error response
~~~

---

## 4) Repository Layout

~~~text
IITGN-Databases-GateGuard/
|-- README.md
|-- assignment-1/
|   |-- database/
|   |-- diagrams/
|-- assignment-2/
|   |-- Module_A/
|   |-- Module_B/
|       |-- backend/
|       |   |-- server.js
|       |   |-- package.json
|       |   |-- .env.example
|       |   |-- scripts/
|       |   |-- sql/
|       |   |-- src/
|       |       |-- app.js
|       |       |-- config/
|       |       |-- middleware/
|       |       |-- controllers/
|       |       |-- services/
|       |       |-- models/
|       |       |-- routes/
|       |       |-- validators/
|       |       |-- utils/
|       |-- frontend/
|           |-- package.json
|           |-- vite.config.js
|           |-- tailwind.config.js
|           |-- src/
|               |-- App.jsx
|               |-- main.jsx
|               |-- router.jsx
|               |-- api/
|               |-- components/
|               |-- context/
|               |-- hooks/
|               |-- layouts/
|               |-- lib/
|               |-- pages/
|               |-- styles/
|-- assignment-3/
    |-- Module_A/
    |   |-- database/
    |   |   |-- wal.py             # Write-Ahead Log engine with fsync
    |   |   |-- transaction.py     # TransactionManager + LIFO Undo Stack
    |   |   |-- recovery.py        # Crash recovery via WAL REDO
    |   |   |-- consistency.py     # B+ Tree structural invariant checker
    |   |   |-- bplustree.py       # B+ Tree order-4 (from Assignment 2)
    |   |   |-- db_manager.py
    |   |   |-- table.py
    |   |-- logs/
    |   |   |-- test_log.jsonl     # Real WAL records written during tests
    |   |-- test_transactions.ipynb  # 5-cell ACID proof notebook
    |-- Module_B/
    |   |-- backend/               # Node.js + PostgreSQL API (from A2)
    |   |-- stress_tests/
    |       |-- race_condition_test.py      # 50-thread concurrent race test
    |       |-- failure_simulation_test.py  # 4 failure scenario tests
    |       |-- locust_gateguard.py         # Locust load test file
    |       |-- load_profile_runner.py
    |       |-- utils/
    |       |   |-- api_client.py
    |       |   |-- db_check.py
    |       |-- results/
    |           |-- race_results.json       # 50-thread raw results
    |           |-- failure_results.json    # all 4 passed: true
    |-- GateGuard_Assignment3_Report.pdf
    |-- GateGuard_Assignment3_Report.tex
    |-- screenshots/
~~~

---

## 5) Quick Start

### Prerequisites

- Node.js 18 or newer
- PostgreSQL 14 or newer
- Assignment 1 schema already available

### Step A: Prepare database

~~~bash
psql -U postgres -d gateguard -f assignment-1/database/schema.sql
~~~

### Step B: Backend setup

~~~bash
cd assignment-2/Module_B/backend
npm install
cp .env.example .env
npm run setup
psql -U postgres -d gateguard -f sql/auth_tables.sql
npm run seed-data
npm run seed
npm run dev
~~~

Expected startup:

~~~text
GateGuard API running on port 5000 (development)
Health check: http://localhost:5000/api/health
~~~

### Step C: Frontend setup

~~~bash
cd assignment-2/Module_B/frontend
npm install
npm run dev
~~~

Frontend URL:

~~~text
http://localhost:5173
~~~

Note: Vite proxies frontend API calls from /api to backend localhost:5000, so both services must run together.

---

## 6) Environment Configuration

Use backend .env with values similar to below.

~~~env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=gateguard
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_MAX_CONNECTIONS=20

JWT_SECRET=put-a-long-random-string-here
JWT_EXPIRES_IN=7d
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=GateGuard <your-email@gmail.com>

OTP_EXPIRES_MINUTES=15
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

AUDIT_LOG_PATH=logs/audit.log
~~~

Configuration intent:
- DB values connect backend to PostgreSQL
- JWT values define token signing and expiry
- SMTP values power OTP and account notifications
- Lockout values enforce brute force resistance
- Audit log path controls append-only log destination

---

## 7) Security Design

### Authentication model

- Access token expiry: 15 minutes
- Refresh token expiry: 7 days
- Access token checked on every protected request
- Refresh token rotated on refresh endpoint

### Silent refresh behavior

Frontend axios layer handles 401 recovery with a refresh queue. This prevents many concurrent failed requests from creating a refresh storm.

### Logout semantics

Logout is server enforced, not just client cleanup:
- Access token inserted into TokenBlacklist
- Active refresh token revoked
- Future token reuse rejected by middleware

### Lockout policy

- 5 consecutive failed login attempts
- 30 minute lockout window
- Auto reset after lockout expiry

### Password reset

3 step reset process:
1) Request OTP and receive reset token
2) Verify OTP using reset token pair
3) Submit new password with verified pair

This token plus OTP model provides stronger reset integrity than OTP only flows.

---

## 8) RBAC Matrix

| Capability | Guard | Admin | SuperAdmin |
|---|---:|---:|---:|
| View members, vehicles, gates, visits | Yes | Yes | Yes |
| Create or update members and vehicles | No | Yes | Yes |
| Delete members or vehicles | No | No | Yes |
| Gate occupancy update | No | Yes | Yes |
| Create users directly | No | No | Yes |
| Submit user creation request | No | Yes | Yes |
| Approve or reject requests | No | No | Yes |
| View audit logs | No | Yes | Yes |
| Delete visit records | No | No | Yes |

---

## 9) Data Model Overview

~~~mermaid
erDiagram
    Role ||--o{ User : defines
    User ||--o{ LoginHistory : generates
    User ||--o{ RefreshToken : owns
    User ||--o{ TokenBlacklist : revokes
    User ||--o{ UserCreationRequest : submits

    MemberType ||--o{ Member : categorizes
    Member ||--o{ Vehicle : owns

    Gate ||--|| GateOccupancy : tracks

    Member ||--o{ PersonVisit : enters
    Vehicle ||--o{ VehicleVisit : enters

    Gate ||--o{ PersonVisit : entryGate
    Gate ||--o{ PersonVisit : exitGate

    Gate ||--o{ VehicleVisit : entryGate
    Gate ||--o{ VehicleVisit : exitGate

    PasswordResetToken }o--|| User : resets
    AuditLog }o--|| User : actor
~~~

Key tables in Module B:
- Gate
- GateOccupancy
- Member
- MemberType
- Vehicle
- VehicleType
- PersonVisit
- VehicleVisit
- Role
- User
- AuditLog
- PasswordResetToken
- RefreshToken
- TokenBlacklist
- LoginHistory
- UserCreationRequest

---

## 10) API Domains

Base URL:

~~~text
http://localhost:5000/api
~~~

### Domain groups

- Auth: login, refresh, logout, me, password reset, password change
- Members: list, detail, types, CRUD
- Vehicles: list, detail, types, CRUD
- Gates: list, detail, CRUD, occupancy update
- Visits: person and vehicle entry or exit lifecycle, list, detail, delete
- Dashboard: stats, trend, recent activity
- Users and approvals: user management plus request workflow
- Audit: filterable audit access for elevated roles
- Health: API readiness and diagnostics

### Response envelope

Success example:

~~~json
{
  "success": true,
  "data": {}
}
~~~

Error example:

~~~json
{
  "success": false,
  "error": {
    "message": "Something went wrong",
    "fields": {}
  }
}
~~~

---

## 11) Performance and Indexing

Performance workflow is explicit and reproducible.

### Generate EXPLAIN benchmark report

~~~bash
cd assignment-2/Module_B/backend
npm run explain
~~~

Output file:

~~~text
assignment-2/Module_B/backend/sql/explain_results.json
~~~

### Load larger dataset for realistic timings

~~~bash
cd assignment-2/Module_B/backend
npm run seed-large
~~~

Existing index strategy includes:
- Member lookup indexes on name and email
- Vehicle lookup index on license plate
- Partial indexes for active visits
- Time sorting indexes for visit timelines
- Auth lookup index on username
- Audit filtering indexes on user, action, table, and timestamp

---

## 12) Verification and Operational Checks

### Health check

~~~bash
cd assignment-2/Module_B/backend
npm run health
~~~

Checks DB connectivity, table presence, user seed sanity, and index visibility.

### Auth smoke checks

~~~bash
cd assignment-2/Module_B/backend
node scripts/auth-smoke.js
~~~

Expected summary:

~~~text
SUMMARY: 12/12 checks passed
~~~

### Basic RBAC denial test

~~~bash
curl -X POST http://localhost:5000/api/members \
  -H "Authorization: Bearer <guard_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Denied Test","email":"denied@test.com","contactNumber":"9999999999","typeId":1,"age":25,"department":"CS"}'
~~~

Expected result: HTTP 403.

---

## 13) Common Gotchas

- PostgreSQL identifier casing can create subtle query bugs if aliases are inconsistent.
- Some response payloads expose mixed key casing from legacy schema edges.
- PersonVisit uses personid in DB level records.
- Vehicle schema stores licenseplate while UI commonly displays registration number alias.
- Gate status is not a base schema column and is represented operationally.
- SMTP failures do not block auth flows but should still be monitored in logs.

---

## 14) Frontend Experience Notes

The UI intentionally uses an operations center visual language:
- Glass cards and low noise hierarchy for density without clutter
- Live active visit views with duration and overstay cues
- Role aware quick actions and restricted controls
- Rich detail pages for entities and timelines
- Audit detail drawer with old versus new JSON context

The goal is not decorative animation. The goal is fast situational awareness under operational load.

---

## 15) Team Notes and Future Improvements

What worked well:
- Strong coupling between DB design and operational workflows
- Practical security controls beyond baseline JWT login
- Traceability through both audit table and file logs

What can be improved next:
- Standardize API response key casing across all endpoints
- Add CI based API integration tests
- Add migration based schema evolution workflow
- Add dashboards for lockout, OTP abuse, and refresh token anomalies

---

## 16) Submission Links

### Assignment 2

| Module | Video | Report |
|---|---|---|
| Module A (B+ Tree DBMS) | [Watch on Google Drive](https://drive.google.com/file/d/1M1kOq_RaadSPwgeEWFKPklp_ofboC86h/view?usp=sharing) | [report.ipynb](assignment-2/Module_A/report.ipynb) |
| Module B (API + RBAC + Indexing) | [Watch on Google Drive](https://drive.google.com/file/d/1ZYdkB-B-roHZbspme7DJIoVP3XuJP0oG/view?usp=sharing) | [GateGuard_Assignment2_ModuleB.pdf](assignment-2/Module_B/GateGuard_Assignment2_ModuleB.pdf) |

### Assignment 3

| Deliverable | Link |
|---|---|
| Demo Video | [Watch on YouTube](https://youtu.be/oKl7505LjB8) |
| Full Report (PDF) | [GateGuard_Assignment3_Report.pdf](assignment-3/GateGuard_Assignment3_Report.pdf) |
| Module A: ACID Transaction Notebook | [test_transactions.ipynb](assignment-3/Module_A/test_transactions.ipynb) |
| Module A: WAL Log (real output from notebook run) | [test_log.jsonl](assignment-3/Module_A/logs/test_log.jsonl) |
| Module B: Race Condition Test | [race_condition_test.py](assignment-3/Module_B/stress_tests/race_condition_test.py) |
| Module B: Failure Simulation Test | [failure_simulation_test.py](assignment-3/Module_B/stress_tests/failure_simulation_test.py) |
| Module B: Race Test Results | [race_results.json](assignment-3/Module_B/stress_tests/results/race_results.json) |
| Module B: Failure Test Results | [failure_results.json](assignment-3/Module_B/stress_tests/results/failure_results.json) |

---

## 17) Assignment 3 Technical Highlights

### What was built from scratch (Module A)

- **Write-Ahead Log (WAL):** Every operation is written to disk with `os.fsync()` before the B+ Tree is modified. Crash-safe by design.
- **TransactionManager:** Supports `BEGIN`, `COMMIT`, and `ROLLBACK` across multiple B+ Trees using a LIFO Undo Stack.
- **RecoveryManager:** On startup, scans the WAL log and replays committed transactions into memory. Uncommitted transactions are ignored.
- **ConsistencyChecker:** Verifies structural integrity of all 10 B+ Trees after every test run.
- **Multi-relation atomicity:** Proven across 3 tables (Member, PersonVisit, GateOccupancy) in a single transaction.

### What was stress tested (Module B)

- **Race condition fixed** in `personVisit.service.js` using `SELECT ... FOR UPDATE`.
- **50-thread concurrent test:** Exactly 1 entry created, 49 correctly rejected, zero data corruption.
- **4 failure scenarios:** All pass. Database unchanged in every error case.
- **Locust load test:** 50 concurrent users, ~28-30 RPS sustained, zero 5xx errors.

### Git branch strategy

| Branch | Purpose |
|---|---|
| `chore/a3-baseline` | Final merged baseline |
| `feat/a3-module-a-transactions` | WAL + Transaction + Recovery engine |
| `test/a3-module-a-notebook` | Jupyter notebook + WAL log output |
| `fix/a3-module-b-race-condition` | SELECT FOR UPDATE patch |
| `test/a3-module-b-harness` | All stress test scripts + results |
| `feat/a3-updated-requirements` | 3-table notebook update |

---

If you are reviewing this as a faculty or evaluator, start with sections 5, 7, 8, and 12 for Assignment 2 context, and section 17 for the Assignment 3 summary.

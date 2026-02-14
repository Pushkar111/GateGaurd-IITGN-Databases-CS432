# GateGuard — Diagram Flows (Corrected)

**Design Principle:** The Guard is the DECISION-MAKER. The system is a LOGGER.
The Guard manually verifies the person's ID card, approves entry, then logs it.
When a guard enters a license plate, the system finds or creates the vehicle record.
VehicleID=NULL in PersonVisit means the person came on foot.

---

## 1. SEQUENCE DIAGRAM — Exact Flow

### What it shows

How the system processes a single event over time — message by message, participant by participant.

### Real-world scenario at IIT Gandhinagar

A Guard (e.g. `guard1`, Role = Guard) is at Main Gate (GateID=1). A student arrives.

---

### SCENARIO A: Person Entry WITH Vehicle

**Example:** Student Arjun Mehta (MemberID=8) arrives at Main Gate in car GJ-06-KL-2468.

```
TIME FLOW (top → bottom):

1. Arjun shows his Student ID card to the Guard
   (Guard visually verifies — this is OUTSIDE the system)

2. Guard approves entry (human decision)

3. Guard enters Arjun's member ID into the terminal
      Guard → GateTerminal: enterMemberID(8)

4. Guard asks: "Vehicle?" — Arjun says: "Yes, GJ-06-KL-2468, PrivateCar"

5. Guard enters plate and selects vehicle type from dropdown
      Guard → GateTerminal: enterLicensePlate("GJ-06-KL-2468", "PrivateCar")

6. System looks up the plate
      GateTerminal → VehicleService: findOrCreateVehicle("GJ-06-KL-2468", "PrivateCar")
      VehicleService → Database: SELECT * FROM Vehicle WHERE LicensePlate='GJ-06-KL-2468'

7. Two possible outcomes:
   a) Plate EXISTS → Database returns vehicleID=6 → use it
   b) Plate NOT in DB → INSERT INTO Vehicle(LicensePlate='GJ-06-KL-2468', TypeID=1, OwnerID=NULL)
      → Database returns new vehicleID → use it
      (Vehicle auto-registered. OwnerID=NULL. Admin can link later.)

8. System creates PersonVisit
      GateTerminal → VisitService: createEntry(memberID=8, gateID=1, vehicleID=6)
      VisitService → Database: INSERT INTO PersonVisit(PersonID=8, EntryGateID=1, EntryTime=NOW(), VehicleID=6)
      Database → VisitService: visitID=26

9. System also creates VehicleVisit (self-message)
      VisitService → VisitService: createVehicleVisit(vehicleID=6, gateID=1)
      VisitService → Database: INSERT INTO VehicleVisit(VehicleID=6, EntryGateID=1, EntryTime=NOW())
      Database → VisitService: vehicleVisitID=21

10. System updates gate occupancy
      VisitService → OccupancyService: incrementOccupancy(gateID=1)
      OccupancyService → Database: UPDATE GateOccupancy SET OccupancyCount=OccupancyCount+1 WHERE GateID=1
      (Main Gate: 5 → 6)

11. Confirm to guard
      VisitService → GateTerminal: entryConfirmed(visitID=26)
      GateTerminal → Guard: "Entry Recorded"
```

**DB state after:** PersonVisit row with VehicleID=6, ExitGateID=NULL, ExitTime=NULL (active visit). GateOccupancy for Main Gate = 6. Vehicle row exists (found or created).

---

### SCENARIO B: Person Entry WITHOUT Vehicle (on foot)

**Example:** Student Ananya Krishnan (MemberID=13) walks to campus on foot.

```
1. Ananya shows Student ID → Guard verifies manually → approves

2. Guard enters member ID
      Guard → GateTerminal: enterMemberID(13)

3. No vehicle → Guard skips vehicle entry

4. System creates PersonVisit with VehicleID=NULL
      GateTerminal → VisitService: createEntry(memberID=13, gateID=1, vehicleID=NULL)
      VisitService → Database: INSERT INTO PersonVisit(PersonID=13, EntryGateID=1, EntryTime=NOW(), VehicleID=NULL)

5. No VehicleVisit created (no vehicle)

6. System updates occupancy
      VisitService → OccupancyService: incrementOccupancy(gateID=1)

7. Confirm
      GateTerminal → Guard: "Entry Recorded"
```

**VehicleID=NULL means only one thing:** person came on foot. Clear and unambiguous.

---

### SCENARIO C: Person Exit

**Example:** Arjun (who entered earlier, visitID=26) leaves through East Gate (GateID=2).

```
1. Guard enters member ID
      Guard → GateTerminal: enterMemberID(8)

2. System finds active visit
      GateTerminal → VisitService: recordExit(memberID=8, exitGateID=2)
      VisitService → Database: SELECT * FROM PersonVisit WHERE PersonID=8 AND ExitTime IS NULL
      Database → VisitService: activeVisitRecord (visitID=26, VehicleID=6)

3. System updates PersonVisit
      VisitService → Database: UPDATE PersonVisit SET ExitGateID=2, ExitTime=NOW() WHERE VisitID=26

4. Visit had a vehicle (VehicleID=6), so also update VehicleVisit
      VisitService → Database: UPDATE VehicleVisit SET ExitGateID=2, ExitTime=NOW()
                               WHERE VehicleID=6 AND ExitTime IS NULL

5. System decrements occupancy
      VisitService → OccupancyService: decrementOccupancy(exitGateID=2)
      OccupancyService → Database: UPDATE GateOccupancy SET OccupancyCount=OccupancyCount-1 WHERE GateID=2
      (East Gate: 3 → 2)

6. Confirm
      GateTerminal → Guard: "Exit Recorded"
```

**Constraints enforced:**
- ExitTime >= EntryTime (CHECK in schema)
- ExitGateID and ExitTime set together (chk_exitgate_if_exittime)
- Entry gate and exit gate can be different (separate FK columns)

---

## 2. USE CASE DIAGRAM — Exact Flow

### What it shows

WHO can do WHAT in the system. No time flow — just capabilities.

### Actors and their use cases

**GUARD** (guard1–guard5, Role = Guard):

```
Guard ─── Record Person Entry       (enter memberID + optional plate → create PersonVisit)
Guard ─── Record Person Exit        (enter memberID → update PersonVisit with exit)
Guard ─── Record Vehicle Entry      (enter plate + type → find/create Vehicle, create VehicleVisit)
Guard ─── Record Vehicle Exit       (update VehicleVisit with exit)
Guard ─── View Gate Occupancy       (read GateOccupancy)
Guard ─── Search Member             (lookup Member by ID/name/email)
Guard ─── Search Vehicle            (lookup Vehicle by plate)
Guard ─── View Visit History        (read PersonVisit / VehicleVisit logs)
```

**ADMIN** (admin1, admin2, Role = Admin):

```
Admin inherits ALL Guard use cases (generalization: Admin IS-A Guard)
  PLUS:
Admin ─── Manage Members            (CRUD on Member table)
Admin ─── Manage Vehicles           (CRUD on Vehicle table, link OwnerID)
Admin ─── Manage Gates              (CRUD on Gate table)
Admin ─── Manage Users              (CRUD on "User" table)
Admin ─── Manage Roles              (CRUD on Role table)
Admin ─── Generate Reports          (entry/exit reports, occupancy reports)
Admin ─── View System Statistics    (counts, trends)
```

**SYSTEM** (automated):

```
System ─── Update Gate Occupancy    (auto increment/decrement on entry/exit)
System ─── Find or Create Vehicle   (auto-register unknown plates when guard enters them)
System ─── Validate Visit Constraints (enforce ExitTime >= EntryTime, occupancyCount >= 0)
System ─── Log Audit Trail          (auto-fill CreatedAt, UpdatedAt timestamps)
```

### Key relationships

| Relationship | Type | Meaning |
|---|---|---|
| Guard ── Record Person Entry | Association | Guard can record entries |
| Record Person Entry <<include>> Update Gate Occupancy | Include | Every entry MUST update occupancy |
| Record Vehicle Entry <<extend>> Record Person Entry | Extend | Vehicle is OPTIONAL [vehicle is present] |
| Record Vehicle Entry <<include>> Find or Create Vehicle | Include | Every vehicle entry MUST find/create the vehicle |
| Admin ───▷ Guard | Generalization | Admin inherits all Guard use cases |

---

## 3. ACTIVITY DIAGRAM — Exact Flow

### What it shows

The process as a flowchart with decisions, parallel actions, and swimlanes.

### Entry Process

```
Guard               GateTerminal       System Services        Database
─────               ────────────       ───────────────        ────────
  │
  ● (start)
  │
  ▼
┌──────────────┐
│ Verify ID    │
│ Card         │
│ (Manual)     │    Note: Guard visually checks
└──────┬───────┘    Student ID / Aadhaar / DL.
       │            This is a human decision.
       ▼
┌──────────────┐
│ Approve      │
│ Entry        │    Note: Guard decides. System only logs.
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Enter        │
│ Member ID    │
└──────┬───────┘
       │
       ◇ Has Vehicle?
      / \
[No] /   \ [Yes]
    /     \
   │    ┌──┴──────────┐
   │    │ Enter Plate  │
   │    │ + Select     │
   │    │ Vehicle Type │    (dropdown: PrivateCar, Bike, Taxi, Truck, Bus)
   │    └──────┬───────┘
   │           │
   │           │          ┌─────────────────────┐
   │           ├─────────►│ Find or Create      │
   │           │          │ Vehicle             │
   │           │          └────────┬────────────┘
   │           │                   │
   │           │                   │         ┌──────────────────┐
   │           │                   ├────────►│ SELECT Vehicle   │
   │           │                   │         │ by plate         │
   │           │                   │         └────────┬─────────┘
   │           │                   │                  │
   │           │                   ◇ Plate in DB?
   │           │                  / \
   │           │           [Yes] /   \ [No]
   │           │                /     \
   │           │         Use existing  │
   │           │         VehicleID     │
   │           │              │   ┌────┴────────────────┐
   │           │              │   │ INSERT new Vehicle  │
   │           │              │   │ (plate, type,       │
   │           │              │   │  ownerID=NULL)      │
   │           │              │   └────────┬────────────┘
   │           │              │            │
   │           │              │   Use new VehicleID
   │           │              │            │
   ◇ ◄────────┴──────────────┴────────────┘
   │ (merge: on foot / existing vehicle / new vehicle)
   │
   ═══ FORK (parallel) ═══
   │         │          │
   ▼         ▼          ▼
┌──────┐ ┌──────┐ ┌───────────┐
│Create│ │Create│ │Increment  │
│Person│ │Vehic.│ │Gate       │
│Visit │ │Visit │ │Occupancy  │
│      │ │(if   │ │           │
│      │ │vehic)│ │           │
└──┬───┘ └──┬───┘ └───┬───────┘
   │         │          │         ┌─────────────────────────┐
   ├─────────┼──────────┼────────►│ INSERT / UPDATE DB      │
   │         │          │         └─────────────────────────┘
   ═══ JOIN ═══
       │
       ▼
 ┌───────────────┐
 │ Display       │
 │ "Entry        │
 │  Recorded"    │
 └───────┬───────┘
         │
   ┌─────┴──────┐
   │ Allow      │
   │ Entry      │
   └─────┬──────┘
         ◉ (end)
```

### Key decisions mapped to schema

| Decision node | Meaning |
|---|---|
| **Has Vehicle?** | [Yes] → enter plate + type, [No] → PersonVisit.VehicleID=NULL (on foot) |
| **Plate in DB?** | [Yes] → use existing VehicleID, [No] → INSERT new Vehicle, use new VehicleID |

No "Member Found?" decision — the guard already verified the person manually. The system doesn't gatekeep.

### Exit Process

```
● → Enter Member ID → Find Active Visit → FORK:
    ├─ Update PersonVisit (exitGateID, exitTime)
    ├─ Update VehicleVisit if vehicle present
    └─ Decrement GateOccupancy
  JOIN → Display "Exit Recorded" → ◉
```

---

## Summary: How the 3 Diagrams Relate

```
USE CASE DIAGRAM          SEQUENCE DIAGRAM           ACTIVITY DIAGRAM
─────────────────         ─────────────────          ─────────────────
WHO can do WHAT?    →     HOW does it happen?    →   WHAT is the process?
                          (message by message)        (flowchart with decisions)

"Guard can Record         Guard verifies ID card      ● Start
 Person Entry"            Guard enters memberID       → Verify ID (manual)
                          Guard enters plate+type     → Approve Entry
                          System find/create vehicle  → Enter memberID
                          System creates visits       → Has Vehicle? ◇
                          System updates occupancy    → Find/Create Vehicle
                                                      → Fork ═══
                                                      → Create records
                                                      → Join ═══
                                                      → Confirm ◉ End
```

All three diagrams describe the **same system** from **different angles**:
- The Guard makes the entry decision (manual ID check)
- The system logs the entry (PersonVisit, VehicleVisit, GateOccupancy)
- Unknown vehicle plates are auto-registered
- VehicleID=NULL = person on foot

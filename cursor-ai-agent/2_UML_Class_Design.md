# GateGuard Assignment-1: UML Class Design Planning

## 1. Overview

This document provides comprehensive planning for UML class diagrams for the GateGuard Entry Gate Management System. UML diagrams serve as the foundation for database schema design and must accurately represent all entities, relationships, and constraints.  

**Reference Standards**: Elmasri & Navathe Chapter 10 - UML Class Diagram conventions

---

## 2. UML Diagram Types Required

### 2.1 Primary Diagram: UML Class Diagram
- **Purpose**: Model static structure of the system
- **Focus**: Entities (classes), attributes, relationships, multiplicities
- **Standard**: UML 2.5 notation

### 2.2 Additional Recommended Diagrams

| Diagram Type | Purpose | Priority |
|--------------|---------|----------|
| **Sequence Diagram** | Entry/Exit workflow interactions | High |
| **Use Case Diagram** | Core functionalities visualization | Medium |
| **Activity Diagram** | Gate operation processes | Low |

**Note**: Assignment requires "as many UML diagrams as possible" - include all feasible diagrams.

---

## 3. Core Entity Classes

### 3.1 MemberType Class

```
Class: MemberType
Attributes:
  - typeID: int (PK, private)
  - typeName: string (NOT NULL, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (private)

Methods:
  + getTypeID(): int
  + getTypeName(): string
  + setTypeName(name: string): void
```

**Relationships**:
- 1:M association with Member (composition - MemberType owns Member instances)

### 3.2 Member Class

```
Class: Member
Attributes:
  - memberID: int (PK, private)
  - name: string (NOT NULL, private)
  - email: string (UNIQUE, NOT NULL, private)
  - contactNumber: string (NOT NULL, private)
  - image: blob/string (nullable, private)
  - age: int (nullable, private)
  - department: string (nullable, private)
  - typeID: int (FK → MemberType, NOT NULL, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (NOT NULL, private)

Methods:
  + getMemberID(): int
  + getName(): string
  + getEmail(): string
  + getContactNumber(): string
  + setTypeID(typeID: int): void
  + validateEmail(email: string): boolean
```

**Relationships**:
- M:1 association with MemberType (belongs to)
- 1:M association with PersonVisit (makes visits)
- 1:M association with Vehicle (owns vehicles, optional)

### 3.3 VehicleType Class

```
Class: VehicleType
Attributes:
  - typeID: int (PK, private)
  - typeName: string (NOT NULL, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (private)

Methods:
  + getTypeID(): int
  + getTypeName(): string
  + setTypeName(name: string): void
```

**Relationships**:
- 1:M association with Vehicle (composition)

### 3.4 Vehicle Class

```
Class: Vehicle
Attributes:
  - vehicleID: int (PK, private)
  - licensePlate: string (UNIQUE, NOT NULL, private)
  - typeID: int (FK → VehicleType, NOT NULL, private)
  - ownerID: int (FK → Member, nullable, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (NOT NULL, private)

Methods:
  + getVehicleID(): int
  + getLicensePlate(): string
  + setOwnerID(ownerID: int): void
  + validateLicensePlate(plate: string): boolean
```

**Relationships**:
- M:1 association with VehicleType (belongs to)
- M:1 association with Member (owned by, optional)
- 1:M association with PersonVisit (used in visits, optional)
- 1:M association with VehicleVisit (makes visits)

### 3.5 Gate Class

```
Class: Gate
Attributes:
  - gateID: int (PK, private)
  - name: string (NOT NULL, private)
  - location: string (NOT NULL, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (private)

Methods:
  + getGateID(): int
  + getName(): string
  + getLocation(): string
  + updateLocation(location: string): void
```

**Relationships**:
- 1:M association with PersonVisit (entry point)
- 1:M association with PersonVisit (exit point)
- 1:M association with VehicleVisit (entry point)
- 1:M association with VehicleVisit (exit point)
- 1:1 association with GateOccupancy (tracks occupancy)

### 3.6 GateOccupancy Class

```
Class: GateOccupancy
Attributes:
  - gateID: int (PK, FK → Gate, NOT NULL, private)
  - occupancyCount: int (NOT NULL, >= 0, private)
  - updatedAt: timestamp (NOT NULL, private)

Methods:
  + getGateID(): int
  + getOccupancyCount(): int
  + incrementOccupancy(): void
  + decrementOccupancy(): void
  + validateCount(): boolean
```

**Relationships**:
- 1:1 association with Gate (tracks)

### 3.7 Role Class

```
Class: Role
Attributes:
  - roleID: int (PK, private)
  - roleName: string (NOT NULL, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (private)

Methods:
  + getRoleID(): int
  + getRoleName(): string
  + setRoleName(name: string): void
```

**Relationships**:
- 1:M association with User (assigned to)

### 3.8 User Class

```
Class: User
Attributes:
  - userID: int (PK, private)
  - username: string (UNIQUE, NOT NULL, private)
  - passwordHash: string (NOT NULL, private)
  - roleID: int (FK → Role, NOT NULL, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (NOT NULL, private)

Methods:
  + getUserID(): int
  + getUsername(): string
  + authenticate(password: string): boolean
  + setPasswordHash(hash: string): void
  + hasPermission(permission: string): boolean
```

**Relationships**:
- M:1 association with Role (has role)

### 3.9 PersonVisit Class

```
Class: PersonVisit
Attributes:
  - visitID: int (PK, private)
  - personID: int (FK → Member, NOT NULL, private)
  - entryGateID: int (FK → Gate, NOT NULL, private)
  - entryTime: timestamp (NOT NULL, private)
  - exitGateID: int (FK → Gate, nullable, private)
  - exitTime: timestamp (nullable, private)
  - vehicleID: int (FK → Vehicle, nullable, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (private)

Methods:
  + getVisitID(): int
  + getPersonID(): int
  + getEntryTime(): timestamp
  + setExitTime(time: timestamp): void
  + validateExitTime(): boolean  // ExitTime >= EntryTime
  + isActive(): boolean  // ExitTime IS NULL
```

**Relationships**:
- M:1 association with Member (made by)
- M:1 association with Gate (entered through)
- M:1 association with Gate (exited through)
- M:1 association with Vehicle (used vehicle, optional)

### 3.10 VehicleVisit Class

```
Class: VehicleVisit
Attributes:
  - visitID: int (PK, private)
  - vehicleID: int (FK → Vehicle, NOT NULL, private)
  - entryGateID: int (FK → Gate, NOT NULL, private)
  - entryTime: timestamp (NOT NULL, private)
  - exitGateID: int (FK → Gate, nullable, private)
  - exitTime: timestamp (nullable, private)
  - createdAt: timestamp (NOT NULL, private)
  - updatedAt: timestamp (private)

Methods:
  + getVisitID(): int
  + getVehicleID(): int
  + getEntryTime(): timestamp
  + setExitTime(time: timestamp): void
  + validateExitTime(): boolean  // ExitTime >= EntryTime
  + isActive(): boolean  // ExitTime IS NULL
```

**Relationships**:
- M:1 association with Vehicle (made by)
- M:1 association with Gate (entered through)
- M:1 association with Gate (exited through)

---

## 4. Relationship Mapping

### 4.1 Association Types

| Relationship | Type | Multiplicity | Notes |
|--------------|------|--------------|-------|
| MemberType → Member | Composition | 1:M | MemberType owns Member instances |
| Member → PersonVisit | Association | 1:M | Member makes multiple visits |
| Member → Vehicle | Association | 1:M (0..M) | Optional ownership |
| VehicleType → Vehicle | Composition | 1:M | VehicleType owns Vehicle instances |
| Vehicle → PersonVisit | Association | 1:M (0..M) | Optional vehicle in person visit |
| Vehicle → VehicleVisit | Association | 1:M | Vehicle makes multiple visits |
| Gate → PersonVisit | Association | 1:M (Entry) | Gate as entry point |
| Gate → PersonVisit | Association | 1:M (Exit) | Gate as exit point |
| Gate → VehicleVisit | Association | 1:M (Entry) | Gate as entry point |
| Gate → VehicleVisit | Association | 1:M (Exit) | Gate as exit point |
| Gate → GateOccupancy | Composition | 1:1 | Gate owns occupancy record |
| Role → User | Association | 1:M | Role assigned to multiple users |
| User → Role | Association | M:1 | User has one role |

### 4.2 Multiplicity Notation

- **1**: Exactly one
- **M** or **\***: Many (zero or more)
- **0..1**: Zero or one (optional)
- **1..M**: One or more
- **0..M**: Zero or more (optional many)

---

## 5. UML Class Diagram Structure

### 5.1 Diagram Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    GateGuard System                         │
│                  UML Class Diagram                          │
└─────────────────────────────────────────────────────────────┘

[MemberType] ──1──<──M── [Member]
                              │
                              ├──1──<──M── [PersonVisit]
                              │
                              └──1──<──0..M── [Vehicle]

[VehicleType] ──1──<──M── [Vehicle]
                              │
                              ├──1──<──0..M── [PersonVisit]
                              │
                              └──1──<──M── [VehicleVisit]

[Gate] ──1──<──M── [PersonVisit] (Entry)
[Gate] ──1──<──M── [PersonVisit] (Exit)
[Gate] ──1──<──M── [VehicleVisit] (Entry)
[Gate] ──1──<──M── [VehicleVisit] (Exit)
[Gate] ──1──1── [GateOccupancy]

[Role] ──1──<──M── [User]
```

### 5.2 Class Visibility

- **Private (-)**: Internal attributes and methods
- **Public (+)**: Accessor methods and public operations
- **Protected (#)**: Not used in this design

---

## 6. Constraints in UML

### 6.1 Constraint Annotations

Add constraints as notes or stereotypes:

```
{constraint: ExitTime >= EntryTime OR ExitTime IS NULL}
PersonVisit

{constraint: OccupancyCount >= 0}
GateOccupancy

{unique}
Vehicle::licensePlate

{unique}
User::username

{unique}
Member::email
```

### 6.2 Stereotypes

- `<<PK>>`: Primary Key
- `<<FK>>`: Foreign Key
- `<<UNIQUE>>`: Unique constraint
- `<<NOT NULL>>`: Required attribute

---

## 7. Additional UML Diagrams

### 7.1 Sequence Diagram: Entry Process

**Actors**: Guard (User), System, Database

**Flow**:
1. Guard scans Member ID / License Plate
2. System validates Member/Vehicle
3. System creates PersonVisit/VehicleVisit record
4. System updates GateOccupancy
5. System returns confirmation

### 7.2 Use Case Diagram

**Actors**: Guard, Admin, System

**Use Cases**:
- Record Entry
- Record Exit
- View Occupancy
- Manage Members
- Manage Vehicles
- Generate Reports
- Manage Users

### 7.3 Activity Diagram: Entry/Exit Workflow

**Activities**:
- Validate credentials
- Check authorization
- Create visit record
- Update occupancy
- Log transaction

---

## 8. UML Notation Standards

### 8.1 Class Box Format

```
┌─────────────────────┐
│   ClassName         │
├─────────────────────┤
│ - attribute: type   │
│ + method(): return  │
└─────────────────────┘
```

### 8.2 Relationship Arrows

- **Association**: Simple line with arrow
- **Composition**: Filled diamond on owner side
- **Aggregation**: Empty diamond on owner side
- **Generalization**: Hollow triangle arrow

### 8.3 Multiplicity Labels

Place on relationship ends:
- `1` on one side
- `*` or `M` on many side
- `0..1` for optional
- `1..*` for required many

---

## 9. Mapping UML to Database Schema

### 9.1 Class → Table Mapping

| UML Class | Database Table | Notes |
|-----------|----------------|-------|
| MemberType | MemberType | Direct mapping |
| Member | Member | Direct mapping |
| VehicleType | VehicleType | Direct mapping |
| Vehicle | Vehicle | Direct mapping |
| Gate | Gate | Direct mapping |
| GateOccupancy | GateOccupancy | Direct mapping |
| Role | Role | Direct mapping |
| User | User | Direct mapping |
| PersonVisit | PersonVisit | Direct mapping |
| VehicleVisit | VehicleVisit | Direct mapping |

### 9.2 Attribute → Column Mapping

- UML attributes map directly to table columns
- Data types: int → INTEGER, string → VARCHAR, timestamp → TIMESTAMP, blob → BLOB
- Visibility (private) → column access control in database

### 9.3 Relationship → Foreign Key Mapping

- UML 1:M association → Foreign Key in "many" side table
- UML M:1 association → Foreign Key in "many" side table
- UML 1:1 association → Foreign Key in either table (choose based on ownership)

---

## 10. Validation Checklist

### 10.1 UML Class Diagram Completeness

- [ ] All 10 entity classes represented
- [ ] All attributes listed with data types
- [ ] Primary keys identified (PK annotation)
- [ ] Foreign keys identified (FK annotation)
- [ ] All relationships drawn with correct multiplicities
- [ ] Constraints documented (UNIQUE, NOT NULL, CHECK)
- [ ] Standard UML notation followed
- [ ] Diagram is readable and well-organized

### 10.2 Relationship Accuracy

- [ ] MemberType 1:M Member ✓
- [ ] Member 1:M PersonVisit ✓
- [ ] Member 0..M Vehicle ✓
- [ ] VehicleType 1:M Vehicle ✓
- [ ] Vehicle 0..M PersonVisit ✓
- [ ] Vehicle 1:M VehicleVisit ✓
- [ ] Gate 1:M PersonVisit (Entry) ✓
- [ ] Gate 1:M PersonVisit (Exit) ✓
- [ ] Gate 1:M VehicleVisit (Entry) ✓
- [ ] Gate 1:M VehicleVisit (Exit) ✓
- [ ] Gate 1:1 GateOccupancy ✓
- [ ] Role 1:M User ✓

---

## 11. Gemini Prompts for UML Diagrams

### 11.1 UML Class Diagram - Comprehensive Prompt

```
Create a comprehensive UML Class Diagram for the GateGuard Entry Gate Management System following UML 2.5 standards and Elmasri & Navathe Chapter 10 conventions.

SYSTEM CONTEXT:
- System Name: GateGuard
- Purpose: Entry/Exit Management for IIT Gandhinagar Campus
- Database: PostgreSQL (relational)

CLASSES TO INCLUDE (10 total):

1. MEMBERTYPE
   Attributes:
     - typeID: int (PK, private)
     - typeName: string (NOT NULL, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (private)
   Methods: getTypeID(), getTypeName(), setTypeName()
   Relationships: 1:M composition with Member

2. MEMBER
   Attributes:
     - memberID: int (PK, private)
     - name: string (NOT NULL, private)
     - email: string (UNIQUE, NOT NULL, private)
     - contactNumber: string (NOT NULL, private)
     - image: blob (nullable, private)
     - age: int (nullable, private)
     - department: string (nullable, private)
     - typeID: int (FK → MemberType, NOT NULL, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (NOT NULL, private)
   Methods: getMemberID(), getName(), getEmail(), validateEmail()
   Relationships: M:1 with MemberType, 1:M with PersonVisit, 1:M with Vehicle (optional)

3. VEHICLETYPE
   Attributes:
     - typeID: int (PK, private)
     - typeName: string (NOT NULL, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (private)
   Methods: getTypeID(), getTypeName(), setTypeName()
   Relationships: 1:M composition with Vehicle

4. VEHICLE
   Attributes:
     - vehicleID: int (PK, private)
     - licensePlate: string (UNIQUE, NOT NULL, private)
     - typeID: int (FK → VehicleType, NOT NULL, private)
     - ownerID: int (FK → Member, nullable, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (NOT NULL, private)
   Methods: getVehicleID(), getLicensePlate(), validateLicensePlate()
   Relationships: M:1 with VehicleType, M:1 with Member (optional), 1:M with PersonVisit (optional), 1:M with VehicleVisit

5. GATE
   Attributes:
     - gateID: int (PK, private)
     - name: string (NOT NULL, private)
     - location: string (NOT NULL, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (private)
   Methods: getGateID(), getName(), getLocation()
   Relationships: 1:M with PersonVisit (entry), 1:M with PersonVisit (exit), 1:M with VehicleVisit (entry), 1:M with VehicleVisit (exit), 1:1 with GateOccupancy

6. GATEOCCUPANCY
   Attributes:
     - gateID: int (PK, FK → Gate, NOT NULL, private)
     - occupancyCount: int (NOT NULL, >= 0, private)
     - updatedAt: timestamp (NOT NULL, private)
   Methods: getOccupancyCount(), incrementOccupancy(), decrementOccupancy()
   Relationships: 1:1 composition with Gate

7. ROLE
   Attributes:
     - roleID: int (PK, private)
     - roleName: string (NOT NULL, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (private)
   Methods: getRoleID(), getRoleName()
   Relationships: 1:M with User

8. USER
   Attributes:
     - userID: int (PK, private)
     - username: string (UNIQUE, NOT NULL, private)
     - passwordHash: string (NOT NULL, private)
     - roleID: int (FK → Role, NOT NULL, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (NOT NULL, private)
   Methods: getUserID(), getUsername(), authenticate()
   Relationships: M:1 with Role

9. PERSONVISIT
   Attributes:
     - visitID: int (PK, private)
     - personID: int (FK → Member, NOT NULL, private)
     - entryGateID: int (FK → Gate, NOT NULL, private)
     - entryTime: timestamp (NOT NULL, private)
     - exitGateID: int (FK → Gate, nullable, private)
     - exitTime: timestamp (nullable, private)
     - vehicleID: int (FK → Vehicle, nullable, private)
     - createdAt: timestamp (NOT NULL, private)
     - updatedAt: timestamp (private)
   Methods: getVisitID(), validateExitTime(), isActive()
   Constraints: ExitTime >= EntryTime OR ExitTime IS NULL
   Relationships: M:1 with Member, M:1 with Gate (entry), M:1 with Gate (exit), M:1 with Vehicle (optional)

10. VEHICLEVISIT
    Attributes:
      - visitID: int (PK, private)
      - vehicleID: int (FK → Vehicle, NOT NULL, private)
      - entryGateID: int (FK → Gate, NOT NULL, private)
      - entryTime: timestamp (NOT NULL, private)
      - exitGateID: int (FK → Gate, nullable, private)
      - exitTime: timestamp (nullable, private)
      - createdAt: timestamp (NOT NULL, private)
      - updatedAt: timestamp (private)
    Methods: getVisitID(), validateExitTime(), isActive()
    Constraints: ExitTime >= EntryTime OR ExitTime IS NULL
    Relationships: M:1 with Vehicle, M:1 with Gate (entry), M:1 with Gate (exit)

RELATIONSHIP SPECIFICATIONS:
- Use composition (filled diamond) for: MemberType→Member, VehicleType→Vehicle, Gate→GateOccupancy
- Use association (simple line) for all other relationships
- Show multiplicities: 1, M, 0..1, 0..M as appropriate
- Label relationships clearly (e.g., "owns", "makes", "entered_through")

CONSTRAINTS TO ANNOTATE:
- {unique} on Vehicle.licensePlate, User.username, Member.email
- {NOT NULL} on all required attributes
- {constraint: ExitTime >= EntryTime} on PersonVisit and VehicleVisit
- {constraint: OccupancyCount >= 0} on GateOccupancy

OUTPUT REQUIREMENTS:
- Use standard UML class diagram notation
- Show visibility: - (private), + (public)
- Mark PK with <<PK>> stereotype
- Mark FK with <<FK>> stereotype
- Use clear, readable layout
- Follow Elmasri & Navathe Chapter 10 conventions
- Ensure all relationships are bidirectional with proper multiplicities

Generate a professional, publication-ready UML class diagram.
```

### 11.2 UML Sequence Diagram — Entry/Exit Workflow

#### How to Use This Prompt

> Paste the prompt below into any AI tool (ChatGPT, Gemini, Claude, Draw.io Generate, PlantUML assistant, etc.).  
> It is self-contained: the AI does not need anything else to produce a complete, correct, presentation-grade sequence diagram.

```
You are a Senior UML Architect. Generate a publication-grade UML 2.5 Sequence
Diagram for the GateGuard campus Entry & Exit Management System (IIT Gandhinagar).

IMPORTANT DESIGN PRINCIPLE:
The Guard is the DECISION-MAKER. The Guard manually verifies the person's ID card
(Student ID, Aadhaar, Driving Licence) visually, approves entry, then logs it.
The system is a LOGGER — it records what the Guard tells it. The system does NOT
decide who can enter. There is no "Access Denied" from the system.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PARTICIPANTS (left → right, in exact order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Participant       | Stereotype     | Role                              |
|---|-------------------|----------------|-----------------------------------|
| 1 | Guard             | <<actor>>      | Security personnel at the gate    |
| 2 | GateTerminal      | <<boundary>>   | UI / data entry interface at gate |
| 3 | VehicleService    | <<control>>    | Finds or creates vehicle records  |
| 4 | VisitService      | <<control>>    | Creates and manages visit records |
| 5 | OccupancyService  | <<control>>    | Tracks real-time gate occupancy   |
| 6 | Database          | <<entity>>     | PostgreSQL persistent store       |

Draw every participant with a vertical dashed LIFELINE.
Place ACTIVATION BARS (thin rectangles) on each lifeline for
the duration that participant is actively processing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. SCENARIO 1 — "Person Entry WITH Vehicle"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add a note over Guard at the start:
  "Guard manually verifies person's ID card (Student ID / Aadhaar / DL).
   This happens OUTSIDE the system. Guard approves, then logs entry."

Draw the following messages in order (number every arrow):

 1. Guard → GateTerminal       : enterMemberID(memberID)            [synchronous]
     Add note: "Guard already approved entry based on visual ID check. Now logging."
 2. Guard → GateTerminal       : enterLicensePlate(plate, vehicleType) [synchronous]
     Add note: "Guard enters plate and selects vehicle type from dropdown
               (PrivateCar, Bike, Taxi, Truck, Bus)"
 3. GateTerminal → VehicleService : findOrCreateVehicle(plate, vehicleType) [synchronous]
 4. VehicleService → Database  : SELECT * FROM Vehicle WHERE LicensePlate=? [synchronous]
 5. Database → VehicleService  : result                             [reply]

     ALT FRAGMENT — [plate exists] / [plate not in DB]:
       [plate exists]:
         VehicleService uses existing vehicleID
       [plate not in DB]:
         6. VehicleService → Database : INSERT INTO Vehicle(LicensePlate, TypeID, OwnerID=NULL) [synchronous]
         7. Database → VehicleService : new vehicleID              [reply]
         Add note: "Vehicle auto-registered. Guard selected the type. OwnerID=NULL (Admin can link later)."

 8. VehicleService → GateTerminal : vehicleID                      [reply]
 9. GateTerminal → VisitService : createEntry(memberID, gateID, vehicleID) [synchronous]
10. VisitService → Database    : INSERT INTO PersonVisit(PersonID, EntryGateID, EntryTime=NOW(), VehicleID) [synchronous]
11. Database → VisitService    : visitID                            [reply]
12. VisitService → VisitService : createVehicleVisit(vehicleID, gateID) [self-message]
     Add note: "Self-message: also logs the vehicle's entry separately"
13. VisitService → Database    : INSERT INTO VehicleVisit(VehicleID, EntryGateID, EntryTime=NOW()) [synchronous]
14. Database → VisitService    : vehicleVisitID                     [reply]
15. VisitService → OccupancyService : incrementOccupancy(gateID)    [synchronous]
16. OccupancyService → Database : UPDATE GateOccupancy SET count=count+1 WHERE GateID=? [synchronous]
17. Database → OccupancyService : OK                                [reply]
18. OccupancyService → VisitService : occupancyUpdated              [reply]
19. VisitService → GateTerminal : entryConfirmed(visitID)           [reply]
20. GateTerminal → Guard       : displaySuccess("Entry Recorded")   [reply]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. SCENARIO 2 — "Person Entry on Foot (no vehicle)"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show as a separate interaction block:

Add note: "Person has no vehicle. Guard skips vehicle entry."

 1. Guard → GateTerminal       : enterMemberID(memberID)            [synchronous]
 2. GateTerminal → VisitService : createEntry(memberID, gateID, vehicleID=NULL) [synchronous]
 3. VisitService → Database    : INSERT INTO PersonVisit(PersonID, EntryGateID, EntryTime=NOW(), VehicleID=NULL) [synchronous]
 4. Database → VisitService    : visitID                            [reply]
     Add note: "VehicleID=NULL means person came on foot. No VehicleVisit created."
 5. VisitService → OccupancyService : incrementOccupancy(gateID)    [synchronous]
 6. OccupancyService → Database : UPDATE GateOccupancy SET count=count+1 [synchronous]
 7. Database → OccupancyService : OK                                [reply]
 8. OccupancyService → VisitService : occupancyUpdated              [reply]
 9. VisitService → GateTerminal : entryConfirmed(visitID)           [reply]
10. GateTerminal → Guard       : displaySuccess("Entry Recorded")   [reply]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. SCENARIO 3 — "Person Exit"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Show as a separate interaction block:

 1. Guard → GateTerminal       : enterMemberID(memberID)
 2. GateTerminal → VisitService : recordExit(memberID, exitGateID)
 3. VisitService → Database    : SELECT * FROM PersonVisit WHERE PersonID=? AND ExitTime IS NULL
 4. Database → VisitService    : activeVisitRecord
 5. VisitService → Database    : UPDATE PersonVisit SET ExitGateID=?, ExitTime=NOW()
 6. Database → VisitService    : updated

     OPT FRAGMENT — [visit had vehicle, VehicleID IS NOT NULL]:
       7. VisitService → Database : UPDATE VehicleVisit SET ExitGateID=?, ExitTime=NOW() WHERE VehicleID=? AND ExitTime IS NULL
       8. Database → VisitService : updated

 9. VisitService → OccupancyService : decrementOccupancy(exitGateID)
10. OccupancyService → Database : UPDATE GateOccupancy SET count=count-1
11. Database → OccupancyService : OK
12. OccupancyService → VisitService : occupancyUpdated
13. VisitService → GateTerminal : exitConfirmed
14. GateTerminal → Guard       : displaySuccess("Exit Recorded")

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. NOTATIONS CHECKLIST (must appear in the diagram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Notation            | Where to use                                        |
|---------------------|-----------------------------------------------------|
| Actor (stick figure)| Guard                                               |
| Lifeline (dashed)   | Every participant, top to bottom                    |
| Activation bar      | On each lifeline during processing                  |
| Synchronous msg     | Solid arrow with filled arrowhead (→)               |
| Reply / return msg  | Dashed arrow with open arrowhead (- - →)            |
| Self-message        | VisitService calls itself (createVehicleVisit)      |
| Alt fragment        | Plate exists vs plate not in DB (find-or-create)    |
| Opt fragment        | VehicleVisit update on exit (only if vehicle)       |
| Guard condition     | [plate exists], [plate not in DB], [has vehicle]    |
| Note                | Annotate design decisions and business rules        |
| Destroy (X)        | NOT used here (no object destruction)               |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. VISUAL & STYLING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Title: "GateGuard — Entry & Exit Sequence Diagram"
- Subtitle: "IIT Gandhinagar Campus Management System"
- Participant boxes with UML stereotypes (<<actor>>, <<boundary>>, <<control>>, <<entity>>)
- Color-code participants:
    Actor: light blue (#E3F2FD)
    Boundary: light green (#E8F5E9)
    Controller: light purple (#F3E5F5)
    Entity: light orange (#FFF3E0)
- Number every message arrow (1, 2, 3...)
- All arrows must have clear labels (method name + parameters)
- Key notes to include:
    "Guard decides entry — system only logs"
    "Unknown plate → auto-register new vehicle"
    "VehicleID=NULL → person on foot"
    "Self-message: creates VehicleVisit record"
- Keep spacing even, readable at A4 landscape
- Follow UML 2.5 standard strictly
```

### 11.3 UML Use Case Diagram

#### How to Use This Prompt

> Paste the prompt below into any AI tool (ChatGPT, Gemini, Claude, Draw.io Generate, PlantUML assistant, etc.).  
> It is self-contained: the AI does not need anything else to produce a complete, correct, presentation-grade use case diagram.

```
You are a Senior UML Architect. Generate a publication-grade UML 2.5 Use Case
Diagram for the GateGuard campus Entry & Exit Management System (IIT Gandhinagar).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ACTORS (draw as stick figures, positioned outside the system boundary)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Actor   | Type      | Position | Description                               |
|---|---------|-----------|----------|-------------------------------------------|
| 1 | Guard   | Primary   | LEFT     | Security personnel who operates the gate  |
| 2 | Admin   | Primary   | LEFT     | System administrator who manages data     |
| 3 | System  | Secondary | RIGHT    | Automated background processes            |

Actors on the LEFT interact directly with the system.
System actor on the RIGHT represents automated/triggered behavior.

GENERALIZATION between actors:
- Admin ---▷ Guard (Admin inherits all Guard capabilities;
  Admin IS-A Guard with extra privileges)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. SYSTEM BOUNDARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Draw a large rectangle labeled:
    "GateGuard — Entry & Exit Management System"
All use case ovals go INSIDE this rectangle.
All actors go OUTSIDE this rectangle.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. USE CASES (draw each as an oval with the name centered inside)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Organize the use cases into logical groups inside the boundary:

GROUP A — Gate Operations (top area):
  UC1.  Record Person Entry
  UC2.  Record Person Exit
  UC3.  Record Vehicle Entry
  UC4.  Record Vehicle Exit
  UC5.  View Gate Occupancy

GROUP B — Search & Lookup (middle-left area):
  UC6.  Search Member
  UC7.  Search Vehicle
  UC8.  View Visit History

GROUP C — Administration (middle-right area):
  UC9.  Manage Members (CRUD)
  UC10. Manage Vehicles (CRUD)
  UC11. Manage Gates (CRUD)
  UC12. Manage Users (CRUD)
  UC13. Manage Roles (CRUD)

GROUP D — Reporting (bottom-left area):
  UC14. Generate Entry/Exit Report
  UC15. Generate Occupancy Report
  UC16. View System Statistics

GROUP E — System Automation (bottom-right area):
  UC17. Update Gate Occupancy
  UC18. Validate Visit Constraints
  UC19. Log Audit Trail

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. RELATIONSHIPS (draw with correct UML arrows and labels)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ASSOCIATION (solid line, actor ── use case):
  Guard ── UC1 (Record Person Entry)
  Guard ── UC2 (Record Person Exit)
  Guard ── UC3 (Record Vehicle Entry)
  Guard ── UC4 (Record Vehicle Exit)
  Guard ── UC5 (View Gate Occupancy)
  Guard ── UC6 (Search Member)
  Guard ── UC7 (Search Vehicle)
  Guard ── UC8 (View Visit History)
  Admin ── UC9  (Manage Members)
  Admin ── UC10 (Manage Vehicles)
  Admin ── UC11 (Manage Gates)
  Admin ── UC12 (Manage Users)
  Admin ── UC13 (Manage Roles)
  Admin ── UC14 (Generate Entry/Exit Report)
  Admin ── UC15 (Generate Occupancy Report)
  Admin ── UC16 (View System Statistics)

INCLUDE (dashed arrow with <<include>> label, base ──▷ included):
  UC1 ──<<include>>──▷ UC6  (Record Person Entry includes Search Member)
  UC2 ──<<include>>──▷ UC6  (Record Person Exit includes Search Member)
  UC3 ──<<include>>──▷ UC7  (Record Vehicle Entry includes Search Vehicle)
  UC4 ──<<include>>──▷ UC7  (Record Vehicle Exit includes Search Vehicle)
  UC1 ──<<include>>──▷ UC17 (Record Person Entry includes Update Gate Occupancy)
  UC2 ──<<include>>──▷ UC17 (Record Person Exit includes Update Gate Occupancy)
  UC3 ──<<include>>──▷ UC17 (Record Vehicle Entry includes Update Gate Occupancy)
  UC4 ──<<include>>──▷ UC17 (Record Vehicle Exit includes Update Gate Occupancy)

EXTEND (dashed arrow with <<extend>> label, extension ──▷ base):
  UC3 ──<<extend>>──▷ UC1  (Record Vehicle Entry extends Record Person Entry;
                             condition: [vehicle is present])
  UC4 ──<<extend>>──▷ UC2  (Record Vehicle Exit extends Record Person Exit;
                             condition: [vehicle is present])

GENERALIZATION (solid arrow with hollow triangle):
  Admin ───▷ Guard (Admin inherits Guard's use cases)

SYSTEM ACTOR ASSOCIATIONS:
  System ── UC17 (Update Gate Occupancy)
  System ── UC18 (Validate Visit Constraints)
  System ── UC19 (Log Audit Trail)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. NOTATIONS CHECKLIST (must appear in the diagram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Notation                  | Where to use                                     |
|---------------------------|--------------------------------------------------|
| Actor (stick figure)      | Guard, Admin, System                             |
| Use Case (oval)           | All 19 use cases                                 |
| System Boundary (box)     | "GateGuard" rectangle around all use cases       |
| Association (solid line)  | Actor ── Use Case connections                    |
| <<include>> (dashed arrow)| Mandatory sub-behaviors (search, occupancy)      |
| <<extend>> (dashed arrow) | Optional extensions (vehicle entry/exit)         |
| Generalization (triangle) | Admin inherits from Guard                        |
| Condition / Guard         | [vehicle is present] on extend arrows            |
| Grouping                  | Visual clusters for Gate Ops, Admin, etc.        |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. VISUAL & STYLING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Title at top: "GateGuard — Use Case Diagram"
- Subtitle: "IIT Gandhinagar Campus Management System"
- Actors: color-coded stick figures
    Guard: blue
    Admin: green
    System: orange
- Use case ovals: white fill with thin border; group background tints:
    Gate Operations: light blue tint
    Search & Lookup: light green tint
    Administration: light purple tint
    Reporting: light yellow tint
    System Automation: light orange tint
- All <<include>> arrows: dashed with open arrowhead, label centered on line
- All <<extend>> arrows: dashed with open arrowhead, label + [condition] centered
- Generalization arrow: solid line with hollow triangle arrowhead
- Layout: actors on LEFT and RIGHT; use cases organized in clear visual groups
- No line crossings wherever possible
- The diagram should be readable at A4 landscape print size
- Follow UML 2.5 standard strictly
```

### 11.4 UML Activity Diagram — Entry/Exit Workflow

#### How to Use This Prompt

> Paste the prompt below into any AI tool (ChatGPT, Gemini, Claude, Draw.io Generate, PlantUML assistant, etc.).  
> It is self-contained: the AI does not need anything else to produce a complete, correct, presentation-grade activity diagram.

```
You are a Senior UML Architect. Generate a publication-grade UML 2.5 Activity
Diagram for the GateGuard campus Entry & Exit Management System (IIT Gandhinagar).

IMPORTANT DESIGN PRINCIPLE:
The Guard is the DECISION-MAKER. The Guard manually verifies the person's ID card
visually, approves entry, then logs it into the system. The system is a LOGGER —
it records what the Guard tells it. There is no "Access Denied" from the system.
When a guard enters a license plate that doesn't exist in the DB, the system
auto-creates the vehicle record (guard selects vehicle type from dropdown).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SWIMLANES (vertical partitions, left → right)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Swimlane         | Represents                            | Color        |
|---|------------------|---------------------------------------|--------------|
| 1 | Guard            | Human security personnel at gate      | Light Blue   |
| 2 | GateTerminal     | UI / data entry interface at gate     | Light Green  |
| 3 | System Services  | Backend business logic layer          | Light Purple |
| 4 | Database         | PostgreSQL persistent data store      | Light Orange |

Each swimlane is a vertical column. Activities are placed in the
swimlane of the responsible component.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ENTRY PROCESS FLOW (top → bottom)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INITIAL STATE: Filled black circle (●) at the top of the Guard swimlane.

Step-by-step flow:

[Guard swimlane]
  A1. ● → "Verify Person's ID Card (Manual)"        (action, rounded rectangle)
      Add note: "Guard visually checks Student ID / Aadhaar / DL.
                 This is a human decision, outside the system."

  A2. → "Approve Entry"                              (action)
      Add note: "Guard decides to allow entry. System does NOT decide."

  A3. → "Enter Member ID into Terminal"              (action)

[Guard swimlane]
  D1. → ◇ DECISION NODE: [Has Vehicle?]
        ├─ [No]  → skip to MERGE (no vehicle processing, person on foot)
        └─ [Yes] → continue ↓

[Guard swimlane]
  A4. → "Enter License Plate + Select Vehicle Type"  (action)
      Add note: "Guard types plate and picks type from dropdown:
                 PrivateCar, Bike, Taxi, Truck, Bus"

[GateTerminal swimlane]
  A5. → "Send plate + type to System"                (action)

[System Services swimlane]
  A6. → "Find or Create Vehicle"                     (action)

[Database swimlane]
  A7. → "SELECT Vehicle by plate"                    (action)

[System Services swimlane]
  D2. → ◇ DECISION NODE: [Plate exists in DB?]
        ├─ [Yes] → "Use existing VehicleID"          (action) → to MERGE
        └─ [No]  → continue ↓

[Database swimlane]
  A8. → "INSERT new Vehicle (plate, type, owner=NULL)" (action)
      Add note: "Vehicle auto-registered. OwnerID=NULL.
                 Admin can link owner later."

[System Services swimlane]
  A9. → "Use new VehicleID"                          (action)

── MERGE NODE (◇) ── all paths join here (on foot / existing vehicle / new vehicle) ──

[System Services swimlane]
  ══ FORK (thick horizontal bar) ══
    ├─ PARALLEL PATH 1:
    │   A10. → "Create PersonVisit Record"           (action)
    │   A11. → "INSERT INTO PersonVisit"             (in Database lane)
    │         (PersonID, EntryGateID, EntryTime=NOW(), VehicleID or NULL)
    │
    ├─ PARALLEL PATH 2 (only if has vehicle):
    │   A12. → "Create VehicleVisit Record"          (action)
    │   A13. → "INSERT INTO VehicleVisit"            (in Database lane)
    │         (VehicleID, EntryGateID, EntryTime=NOW())
    │
    └─ PARALLEL PATH 3:
        A14. → "Increment Gate Occupancy"            (action)
        A15. → "UPDATE GateOccupancy count+1"        (in Database lane)
  ══ JOIN (thick horizontal bar) ══

[GateTerminal swimlane]
  A16. → "Display Entry Confirmation"                (action)

[Guard swimlane]
  A17. → "Allow Person to Enter"                     (action)

FINAL STATE: ◉ (circled dot) at the bottom of the Guard swimlane.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. EXIT PROCESS FLOW (separate section below, or as a second page)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INITIAL STATE: ●

[Guard swimlane]
  B1. ● → "Enter Member ID for Exit"                 (action)

[GateTerminal swimlane]
  B2. → "Send exit request to System"                 (action)

[System Services swimlane]
  B3. → "Find Active PersonVisit"                     (action)

[Database swimlane]
  B4. → "SELECT PersonVisit WHERE PersonID=? AND ExitTime IS NULL"

[System Services swimlane]
  ══ FORK ══
    ├─ PATH 1: "Update PersonVisit (set exitGateID, exitTime=NOW())" → DB UPDATE
    ├─ PATH 2 (opt, if VehicleID IS NOT NULL):
    │         "Update VehicleVisit (set exitGateID, exitTime=NOW())" → DB UPDATE
    └─ PATH 3: "Decrement Gate Occupancy (count-1)" → DB UPDATE
  ══ JOIN ══

[GateTerminal swimlane]
  B5. → "Display Exit Confirmation"

[Guard swimlane]
  B6. → "Allow Person to Exit"

FINAL STATE: ◉

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. NOTATIONS CHECKLIST (every one must appear in the diagram)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Notation              | Symbol                | Where used                         |
|-----------------------|-----------------------|------------------------------------|
| Initial State         | ● (filled circle)     | Start of Entry flow, Exit flow     |
| Final State           | ◉ (circled dot)       | End of each flow                   |
| Action / Activity     | Rounded rectangle     | Every processing step              |
| Control Flow          | Arrow (→)             | Between every pair of nodes        |
| Decision Node         | ◇ (diamond)           | Has Vehicle?, Plate exists?        |
| Guard Condition       | [Yes] / [No]          | On every branch leaving a decision |
| Fork                  | Thick horizontal bar  | Before parallel visit+occupancy    |
| Join                  | Thick horizontal bar  | After parallel paths complete      |
| Merge                 | ◇ (diamond)           | Where all vehicle paths rejoin     |
| Swimlanes             | Vertical partitions   | Guard, GateTerminal, System, DB    |
| Note / Annotation     | Folded-corner box     | Design decisions, business rules   |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. VISUAL & STYLING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Title: "GateGuard — Entry & Exit Activity Diagram"
- Subtitle: "IIT Gandhinagar Campus Management System"
- Swimlane headers: bold, each with background tint:
    Guard: #E3F2FD (light blue)
    GateTerminal: #E8F5E9 (light green)
    System Services: #F3E5F5 (light purple)
    Database: #FFF3E0 (light orange)
- Action boxes: white fill, rounded corners, thin dark border
- Decision diamonds: white fill, thin dark border
- Fork/Join bars: thick (3-4px) solid black horizontal bars
- All arrows: solid black with filled arrowhead
- Guard conditions in square brackets: [Yes], [No], etc.
- Key notes to include:
    Near A1: "Guard verifies ID manually — human decision"
    Near A2: "Guard decides entry — system only logs"
    Near D2: "Unknown plate → auto-register as new vehicle"
    Near A8: "OwnerID=NULL — Admin links later"
    Near Fork: "Parallel execution for performance"
- VehicleID=NULL in PersonVisit clearly means "person on foot"
- Keep flow strictly top-to-bottom within each swimlane
- No line crossings wherever possible
- Readable at A4 landscape print size
- Follow UML 2.5 standard strictly
```

### 11.5 UML Activity Diagram (LaTeX Version) — Entry/Exit Workflow

#### How to Use This Prompt

> Paste the prompt below into any AI tool (ChatGPT, Gemini, Claude, etc.) to generate **LaTeX source code** for a publication-grade Activity Diagram.  
> The output will be compilable LaTeX code using TikZ and pgf-uml packages.

```
You are a Senior UML Architect and LaTeX expert. Generate publication-grade LaTeX code
for a UML 2.5 Activity Diagram for the GateGuard campus Entry & Exit Management System
(IIT Gandhinagar).

IMPORTANT DESIGN PRINCIPLE:
The Guard is the DECISION-MAKER. The Guard manually verifies the person's ID card
visually, approves entry, then logs it into the system. The system is a LOGGER —
it records what the Guard tells it. There is no "Access Denied" from the system.
When a guard enters a license plate that doesn't exist in the DB, the system
auto-creates the vehicle record (guard selects vehicle type from dropdown).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT: LaTeX CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate COMPLETE LaTeX source code including:

1. Document class: \documentclass[tikz,border=10pt]{standalone}
2. Required packages:
   - \usepackage{tikz}
   - \usepackage{tikz-uml}
   - \usetikzlibrary{shapes.geometric, arrows.meta, positioning, fit, backgrounds, calc}
3. Color definitions for swimlanes:
   - \definecolor{guardblue}{HTML}{E3F2FD}
   - \definecolor{terminalgreen}{HTML}{E8F5E9}
   - \definecolor{systempurple}{HTML}{F3E5F5}
   - \definecolor{dborange}{HTML}{FFF3E0}
4. TikZ styles for UML elements:
   - action (rounded rectangle, white fill, black border)
   - decision (diamond, white fill, black border)
   - initial/final states (filled/circled circles)
   - fork/join bars (thick horizontal/vertical bars)
   - swimlane (colored background rectangles)
   - note (folded corner shape, yellow fill)
   - arrow styles with labels

The output must be a COMPLETE .tex file ready to compile with:
   pdflatex filename.tex

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. SWIMLANES (vertical partitions, left → right)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create 4 vertical swimlanes using TikZ \node commands with fit library:

| # | Swimlane         | Represents                            | Background Color  |
|---|------------------|---------------------------------------|-------------------|
| 1 | Guard            | Human security personnel at gate      | guardblue         |
| 2 | GateTerminal     | UI / data entry interface at gate     | terminalgreen     |
| 3 | System Services  | Backend business logic layer          | systempurple      |
| 4 | Database         | PostgreSQL persistent data store      | dborange          |

Each swimlane should be:
- Width: ~4cm per swimlane
- Positioned left-to-right with 0.5cm spacing
- Labeled at the top with bold text
- Background drawn using \begin{scope}[on background layer]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ENTRY PROCESS FLOW (top → bottom in LaTeX coordinates)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INITIAL STATE: \node[initial] (start) at (Guard swimlane coordinate) {};

Step-by-step LaTeX nodes and edges:

[Guard swimlane — all nodes positioned in column 1]
  A1. \node[action] (verify) [below=of start] {Verify Person's ID Card\\(Manual)};
      \node[note, right=1cm of verify] {...Guard visually checks Student ID...};
      \draw[arrow] (start) -- (verify);

  A2. \node[action] (approve) [below=of verify] {Approve Entry};
      \node[note, right=1cm of approve] {...Guard decides to allow entry...};
      \draw[arrow] (verify) -- (approve);

  A3. \node[action] (enterid) [below=of approve] {Enter Member ID\\into Terminal};
      \draw[arrow] (approve) -- (enterid);

  D1. \node[decision] (hasvehicle) [below=of enterid] {Has\\Vehicle?};
      \draw[arrow] (enterid) -- (hasvehicle);
      
      % [No] branch → skip to merge
      \draw[arrow] (hasvehicle) -- node[right] {[No]} ++(3,0) |- (merge);
      
      % [Yes] branch → continue
      \draw[arrow] (hasvehicle) -- node[right] {[Yes]} (enterplate);

  A4. \node[action] (enterplate) [below=of hasvehicle] {Enter License Plate\\+ Select Vehicle Type};
      \node[note, right=1cm of enterplate] {...Guard types plate and picks type...};

[GateTerminal swimlane — column 2]
  A5. \node[action] (sendplate) [right=of enterplate, in column 2] {Send plate + type\\to System};
      \draw[arrow] (enterplate) -- (sendplate);

[System Services swimlane — column 3]
  A6. \node[action] (findcreate) [right=of sendplate, in column 3] {Find or Create\\Vehicle};
      \draw[arrow] (sendplate) -- (findcreate);

[Database swimlane — column 4]
  A7. \node[action] (selectveh) [right=of findcreate, in column 4] {SELECT Vehicle\\by plate};
      \draw[arrow] (findcreate) -- (selectveh);

[System Services swimlane]
  D2. \node[decision] (plateexists) [below=of selectveh, back in column 3] {Plate exists\\in DB?};
      \draw[arrow] (selectveh) -- (plateexists);
      
      % [Yes] branch
      \node[action] (useexisting) [left=of plateexists] {Use existing\\VehicleID};
      \draw[arrow] (plateexists) -- node[above] {[Yes]} (useexisting);
      \draw[arrow] (useexisting) |- (merge);
      
      % [No] branch
      \draw[arrow] (plateexists) -- node[right] {[No]} (insertveh);

[Database swimlane]
  A8. \node[action] (insertveh) [below=of plateexists, in column 4] {INSERT new Vehicle\\(plate, type, owner=NULL)};
      \node[note, right=1cm of insertveh] {...OwnerID=NULL. Admin links later...};

[System Services swimlane]
  A9. \node[action] (usenew) [below=of insertveh, in column 3] {Use new\\VehicleID};
      \draw[arrow] (insertveh) -- (usenew);
      \draw[arrow] (usenew) -- (merge);

── MERGE NODE ──
  \node[merge] (merge) [below=of usenew] {};
  % Merge receives 3 paths: [No vehicle], [existing vehicle], [new vehicle]

── FORK (thick horizontal bar) ──
  \draw[fork] (merge coordinate) ++(0,-1) coordinate (forkbar) -- ++(12,0);
  \node[above=0.2cm of forkbar] {FORK — Parallel Execution};
  \node[note] near forkbar {...3 parallel paths for performance...};

── PARALLEL PATH 1: PersonVisit ──
  [System Services → Database]
  A10. \node[action] (createperson) [below=of forkbar, column 3] {Create PersonVisit\\Record};
  A11. \node[action] (insertperson) [below=of createperson, column 4] {INSERT INTO PersonVisit\\(PersonID, EntryGateID,\\EntryTime=NOW(), VehicleID)};
       \draw[connect forkbar to createperson] ...;
       \draw[arrow] (createperson) -- (insertperson);
       \draw[connect insertperson to joinbar] ...;

── PARALLEL PATH 2: VehicleVisit (conditional) ──
  \node[decision] (hasvehcheck) [below=of forkbar, column 3, shifted] {Has\\Vehicle?};
  % [Yes] → create VehicleVisit
  A12. \node[action] (createvehicle) [below=of hasvehcheck] {Create VehicleVisit\\Record};
  A13. \node[action] (insertvehicle) [below=of createvehicle, column 4] {INSERT INTO VehicleVisit\\(VehicleID, EntryGateID,\\EntryTime=NOW())};
  % [No] → skip directly to join

── PARALLEL PATH 3: Gate Occupancy ──
  A14. \node[action] (incoccupancy) [below=of forkbar, column 3, shifted] {Increment Gate\\Occupancy};
  A15. \node[action] (updateocc) [below=of incoccupancy, column 4] {UPDATE GateOccupancy\\count+1};

── JOIN (thick horizontal bar) ──
  \draw[join] (joinbar coordinate) -- ++(12,0);
  \node[below=0.2cm of joinbar] {JOIN — Synchronization Point};

[GateTerminal swimlane]
  A16. \node[action] (confirm) [below=of joinbar, column 2] {Display Entry\\Confirmation};

[Guard swimlane]
  A17. \node[action] (allowentry) [below=of confirm, column 1] {Allow Person\\to Enter};
       \draw[arrow] (confirm) -- (allowentry);

FINAL STATE: \node[final] (end) [below=of allowentry] {};

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. EXIT PROCESS FLOW (separate \begin{tikzpicture} or positioned below)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create second tikzpicture environment or position at y-offset for exit flow:

INITIAL STATE: \node[initial] (exitstart) {};

[Guard → GateTerminal → System → Database sequence]
  B1. Enter Member ID for Exit
  B2. Send exit request to System
  B3. Find Active PersonVisit
  B4. SELECT PersonVisit WHERE PersonID=? AND ExitTime IS NULL

── FORK for Exit Updates ──
  PATH 1: Update PersonVisit (set exitGateID, exitTime=NOW())
  PATH 2 (opt): Update VehicleVisit if VehicleID IS NOT NULL
  PATH 3: Decrement Gate Occupancy (count-1)
── JOIN ──

  B5. Display Exit Confirmation
  B6. Allow Person to Exit

FINAL STATE: \node[final] (exitend) {};

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. LaTeX TIKZ STYLE DEFINITIONS REQUIRED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Include these in the preamble:

\tikzset{
  action/.style={
    rectangle, rounded corners=3mm, draw=black, very thick, 
    fill=white, text width=3cm, align=center, minimum height=1.2cm,
    font=\small\sffamily
  },
  decision/.style={
    diamond, draw=black, very thick, fill=white, 
    text width=2cm, align=center, aspect=2,
    font=\small\sffamily
  },
  initial/.style={circle, draw=black, fill=black, minimum size=8pt},
  final/.style={
    circle, draw=black, very thick, minimum size=12pt,
    path picture={
      \draw[fill=black] (path picture bounding box.center) circle (5pt);
    }
  },
  merge/.style={diamond, draw=black, very thick, fill=white, minimum size=8pt},
  fork/.style={line width=3pt, draw=black},
  join/.style={line width=3pt, draw=black},
  arrow/.style={-{Stealth[length=3mm]}, very thick, draw=black},
  note/.style={
    rectangle, draw=orange!80!black, fill=yellow!20, 
    text width=3cm, align=left, font=\scriptsize\itshape,
    append after command={
      (\tikzlastnode.north east) edge[draw=orange!80!black] 
      ([xshift=-3mm]\tikzlastnode.north east |- \tikzlastnode.north)
    }
  },
  swimlane/.style={
    rectangle, draw=gray!50, very thick, fill=#1, 
    minimum width=4cm, align=center, font=\bfseries\sffamily
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. COMPLETE LaTeX DOCUMENT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your output must be a complete LaTeX file following this structure:

\documentclass[tikz,border=10pt]{standalone}
\usepackage{tikz}
\usepackage{tikz-uml}
\usetikzlibrary{shapes.geometric, arrows.meta, positioning, fit, backgrounds, calc}

% Color definitions
\definecolor{guardblue}{HTML}{E3F2FD}
\definecolor{terminalgreen}{HTML}{E8F5E9}
\definecolor{systempurple}{HTML}{F3E5F5}
\definecolor{dborange}{HTML}{FFF3E0}

% TikZ styles
\tikzset{
  % ... (all styles from section 4)
}

\begin{document}

% Title
\begin{tikzpicture}[node distance=1.5cm and 2cm]

  % Title nodes
  \node[font=\Large\bfseries\sffamily] (title) {GateGuard — Entry \& Exit Activity Diagram};
  \node[below=0.2cm of title, font=\small\itshape] {IIT Gandhinagar Campus Management System};

  % Entry Process Flow
  % ... (all nodes and edges from section 2)
  
  % Swimlane backgrounds (drawn last with on background layer)
  \begin{scope}[on background layer]
    \node[swimlane=guardblue, fit=(all guard nodes), label=above:Guard] {};
    \node[swimlane=terminalgreen, fit=(all terminal nodes), label=above:GateTerminal] {};
    \node[swimlane=systempurple, fit=(all system nodes), label=above:System Services] {};
    \node[swimlane=dborange, fit=(all db nodes), label=above:Database] {};
  \end{scope}

\end{tikzpicture}

% Exit Process Flow (separate tikzpicture or positioned in same)
\begin{tikzpicture}[node distance=1.5cm and 2cm]
  % ... (all nodes and edges from section 3)
\end{tikzpicture}

\end{document}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. COMPILATION INSTRUCTIONS (add as LaTeX comment at top)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

% GateGuard Activity Diagram - LaTeX Source
% Compile with: pdflatex gateguard_activity.tex
% Required packages: tikz, tikz-uml, and standard TikZ libraries
% Output: Standalone PDF suitable for inclusion in reports or printing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. QUALITY CHECKLIST FOR LaTeX OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The generated LaTeX code MUST:
- [ ] Compile without errors using pdflatex
- [ ] Use proper TikZ coordinate system (y increases upward, so use `below=` for flow)
- [ ] Include all 4 swimlanes with colored backgrounds
- [ ] Show initial state (●), final state (◉), actions, decisions, fork/join
- [ ] Label all decision branches with [Yes]/[No] guard conditions
- [ ] Include notes at key decision points
- [ ] Use proper UML 2.5 notation for all elements
- [ ] Position elements to avoid line crossings
- [ ] Use consistent spacing (node distance=1.5cm and 2cm)
- [ ] Generate readable output at A4 landscape size
- [ ] Include title and subtitle
- [ ] Follow LaTeX best practices (proper indentation, comments)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPORTANT NOTES FOR LaTeX GENERATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Use `\node[above/below/left/right=of othernode]` for relative positioning
2. For cross-swimlane arrows, calculate coordinates or use `(node1) -| (node2)`
3. Fork/join bars span multiple swimlanes: `\draw[fork] (x1,y) -- (x2,y);`
4. Notes use folded-corner style with tikz append after command
5. Merge nodes are small diamonds where multiple paths converge
6. Use `fit` library to create swimlane backgrounds around node groups
7. Draw backgrounds last using `\begin{scope}[on background layer]`
8. Keep all text within \sffamily font for professional appearance
9. Use very thick lines for visibility in printed output
10. Add proper spacing between sections (Entry vs Exit flows)

Generate the COMPLETE LaTeX source code now. Ensure every node, edge, and
style is properly defined. The output should be copy-paste ready for compilation.
```

---
USE CASE DIAGRAM          SEQUENCE DIAGRAM           ACTIVITY DIAGRAM
─────────────────         ─────────────────          ─────────────────
WHO can do WHAT?    →     HOW does it happen?    →   WHAT is the process?
                          (message by message)        (flowchart with decisions)

"Guard can Record         Guard→Terminal→Service      ● Start
 Person Entry"            →Database→back              → Scan ID
                          (22 numbered messages)       → Validate ◇
                                                      → Fork ═══
                                                      → Create records
                                                      → Join ═══
                                                      → Confirm ◉ End
---

---

### 11.6 ER Diagram — Complete Database Schema Visualization

#### How to Use This Prompt

> Paste the prompt below into any AI tool (ChatGPT, Gemini, Claude, Draw.io Generate, or any ER modeling tool).  
> This prompt is comprehensive and self-contained, designed to produce a publication-grade ER diagram following **Elmasri & Navathe Chapter 7** and **Silberschatz, Korth, Sudarshan Chapter 6** conventions.

```
You are a Senior Database Architect specializing in Entity-Relationship (ER) modeling.
Generate a publication-grade ER Diagram for the GateGuard Entry & Exit Management
System at IIT Gandhinagar following textbook-standard ER notation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN PHILOSOPHY (CRITICAL CONTEXT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The Guard is the DECISION-MAKER who:
  • Manually verifies person identity (Student ID, Aadhaar, Driving License)
  • Approves or denies entry based on visual inspection
  • Logs approved entries into the system

The system is a LOGGING & TRACKING TOOL — it does NOT make access decisions.
There is NO "authentication" or "access control" logic in the database.

KEY BUSINESS RULES:
  ✓ Every Person entering campus must be a registered Member (pre-existing record)
  ✓ Vehicles can be pre-registered OR auto-registered on-the-fly at entry
  ✓ A Person can enter WITH or WITHOUT a vehicle
  ✓ Exit must reference the same Person's active entry (ExitTime updates the visit)
  ✓ GateOccupancy tracks real-time count (increments on entry, decrements on exit)
  ✓ All visits are logged separately: PersonVisit AND VehicleVisit (if vehicle present)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ER NOTATION STANDARDS (Strictly Follow)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTITIES:
  • Rectangle: Strong entity
  • Double rectangle: Weak entity (if any)

ATTRIBUTES:
  • Oval: Simple attribute
  • Oval with underline: Primary Key (PK) attribute
  • Dashed oval: Derived attribute (if any)
  • Double oval: Multivalued attribute (if any)
  • Composite: Nest ovals for composite attributes (if any)

RELATIONSHIPS:
  • Diamond: Relationship set
  • Double diamond: Identifying relationship (weak entity) (if any)

CARDINALITY & PARTICIPATION:
  • 1:1 — One-to-One
  • 1:N — One-to-Many
  • N:M — Many-to-Many
  • Single line: Partial participation (optional)
  • Double line: Total participation (mandatory)

CONSTRAINTS:
  • Write constraints as annotations: {ExitTime ≥ EntryTime OR NULL}
  • Mark UNIQUE attributes: {UNIQUE} next to attribute
  • Mark NOT NULL: bold or thicker line to entity

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. ENTITIES (10 Total — All Strong Entities)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Draw each as a RECTANGLE with entity name centered inside.
List attributes connected by lines from the entity box.

┌────────────────────────────────────────────────────────────┐
│ ENTITY 1: MemberType                                       │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • TypeID (PK, underlined) — INTEGER                      │
│   • TypeName {UNIQUE} — VARCHAR(50)                        │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {TypeName IN ('Resident', 'Student', 'Visitor')}         │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 2: Member                                           │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • MemberID (PK, underlined) — INTEGER                    │
│   • Name — VARCHAR(100)                                    │
│   • Email {UNIQUE} — VARCHAR(255)                          │
│   • ContactNumber — VARCHAR(20)                            │
│   • Image — BYTEA (binary image data)                      │
│   • Age — INTEGER                                          │
│   • Department — VARCHAR(100)                              │
│   • TypeID (FK → MemberType) — INTEGER                     │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {Email LIKE '%@%.%'}                                     │
│   {Age > 0 AND Age < 150}                                  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 3: VehicleType                                      │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • TypeID (PK, underlined) — INTEGER                      │
│   • TypeName {UNIQUE} — VARCHAR(50)                        │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {TypeName IN ('PrivateCar','Taxi','Bike','Truck','Bus')}│
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 4: Vehicle                                          │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • VehicleID (PK, underlined) — INTEGER                   │
│   • LicensePlate {UNIQUE} — VARCHAR(20)                    │
│   • TypeID (FK → VehicleType) — INTEGER                    │
│   • OwnerID (FK → Member, NULLABLE) — INTEGER              │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {LicensePlate LENGTH >= 5}                               │
│                                                            │
│ Note: OwnerID can be NULL (unregistered vehicle,           │
│       Guard enters plate, Admin assigns owner later)       │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 5: Gate                                             │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • GateID (PK, underlined) — INTEGER                      │
│   • Name — VARCHAR(100)                                    │
│   • Location — VARCHAR(255)                                │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 6: GateOccupancy                                    │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • GateID (PK & FK → Gate, underlined) — INTEGER          │
│   • OccupancyCount — INTEGER                               │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {OccupancyCount >= 0}                                    │
│                                                            │
│ Note: 1:1 relationship with Gate (one occupancy per gate)  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 7: Role                                             │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • RoleID (PK, underlined) — INTEGER                      │
│   • RoleName {UNIQUE} — VARCHAR(50)                        │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {RoleName IN ('Guard', 'Admin', 'SuperAdmin')}           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 8: User                                             │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • UserID (PK, underlined) — INTEGER                      │
│   • Username {UNIQUE} — VARCHAR(50)                        │
│   • PasswordHash — VARCHAR(255)                            │
│   • RoleID (FK → Role) — INTEGER                           │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {Username LENGTH >= 3}                                   │
│   {PasswordHash LENGTH >= 32}                              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 9: PersonVisit                                      │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • VisitID (PK, underlined) — INTEGER                     │
│   • PersonID (FK → Member) — INTEGER                       │
│   • EntryGateID (FK → Gate) — INTEGER                      │
│   • EntryTime — TIMESTAMP                                  │
│   • ExitGateID (FK → Gate, NULLABLE) — INTEGER             │
│   • ExitTime (NULLABLE) — TIMESTAMP                        │
│   • VehicleID (FK → Vehicle, NULLABLE) — INTEGER           │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {ExitTime IS NULL OR ExitTime >= EntryTime}              │
│   {ExitGateID IS NULL ⟺ ExitTime IS NULL}                │
│                                                            │
│ Note: VehicleID = NULL means person came on foot           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ENTITY 10: VehicleVisit                                    │
├────────────────────────────────────────────────────────────┤
│ Attributes:                                                │
│   • VisitID (PK, underlined) — INTEGER                     │
│   • VehicleID (FK → Vehicle) — INTEGER                     │
│   • EntryGateID (FK → Gate) — INTEGER                      │
│   • EntryTime — TIMESTAMP                                  │
│   • ExitGateID (FK → Gate, NULLABLE) — INTEGER             │
│   • ExitTime (NULLABLE) — TIMESTAMP                        │
│   • CreatedAt — TIMESTAMP                                  │
│   • UpdatedAt — TIMESTAMP                                  │
│                                                            │
│ Constraints:                                               │
│   {ExitTime IS NULL OR ExitTime >= EntryTime}              │
│   {ExitGateID IS NULL ⟺ ExitTime IS NULL}                │
└────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. RELATIONSHIPS (Draw each as a DIAMOND)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

R1: "categorizes" (MemberType ──── Member)
    • Cardinality: 1:N (One MemberType categorizes Many Members)
    • Participation: Total on Member side (every Member MUST have a Type)
    • Participation: Partial on MemberType side (a Type can exist without Members)
    • Draw: MemberType [1] ──categorizes── [N] Member
    • Member has FK: TypeID → MemberType.TypeID

R2: "owns" (Member ──── Vehicle)
    • Cardinality: 1:N (One Member can own Many Vehicles)
    • Participation: Partial on both sides (Member can have 0 vehicles; Vehicle can have no owner)
    • Draw: Member [1] ──owns── [0..N] Vehicle
    • Vehicle has FK: OwnerID → Member.MemberID (NULLABLE)

R3: "classifies" (VehicleType ──── Vehicle)
    • Cardinality: 1:N (One VehicleType classifies Many Vehicles)
    • Participation: Total on Vehicle side (every Vehicle MUST have a Type)
    • Participation: Partial on VehicleType side (a Type can exist without Vehicles)
    • Draw: VehicleType [1] ──classifies── [N] Vehicle
    • Vehicle has FK: TypeID → VehicleType.TypeID

R4: "makes_visit" (Member ──── PersonVisit)
    • Cardinality: 1:N (One Member makes Many PersonVisits over time)
    • Participation: Total on PersonVisit side (every visit MUST be by a Member)
    • Participation: Partial on Member side (a Member can have 0 visits)
    • Draw: Member [1] ──makes_visit── [N] PersonVisit
    • PersonVisit has FK: PersonID → Member.MemberID

R5: "used_in_visit" (Vehicle ──── PersonVisit)
    • Cardinality: 1:N (One Vehicle can be used in Many PersonVisits)
    • Participation: Partial on both sides (Person can visit without vehicle; Vehicle can be unused)
    • Draw: Vehicle [0..1] ──used_in── [0..N] PersonVisit
    • PersonVisit has FK: VehicleID → Vehicle.VehicleID (NULLABLE)

R6: "makes_vehicle_visit" (Vehicle ──── VehicleVisit)
    • Cardinality: 1:N (One Vehicle makes Many VehicleVisits)
    • Participation: Total on VehicleVisit side (every VehicleVisit MUST have a Vehicle)
    • Participation: Partial on Vehicle side (Vehicle can have 0 visits yet)
    • Draw: Vehicle [1] ──makes_vehicle_visit── [N] VehicleVisit
    • VehicleVisit has FK: VehicleID → Vehicle.VehicleID

R7: "entry_point_for_person" (Gate ──── PersonVisit)
    • Cardinality: 1:N (One Gate is entry point for Many PersonVisits)
    • Participation: Total on PersonVisit side (every visit MUST have entry gate)
    • Participation: Partial on Gate side (Gate can have 0 entries yet)
    • Draw: Gate [1] ──entry_point── [N] PersonVisit
    • PersonVisit has FK: EntryGateID → Gate.GateID
    • Label relationship clearly: "entered_through"

R8: "exit_point_for_person" (Gate ──── PersonVisit)
    • Cardinality: 1:N (One Gate is exit point for Many PersonVisits)
    • Participation: Partial on both sides (Person may not exit yet; Gate can have 0 exits)
    • Draw: Gate [0..1] ──exit_point── [0..N] PersonVisit
    • PersonVisit has FK: ExitGateID → Gate.GateID (NULLABLE)
    • Label relationship clearly: "exited_through"

R9: "entry_point_for_vehicle" (Gate ──── VehicleVisit)
    • Cardinality: 1:N (One Gate is entry point for Many VehicleVisits)
    • Participation: Total on VehicleVisit side (every visit MUST have entry gate)
    • Participation: Partial on Gate side (Gate can have 0 entries yet)
    • Draw: Gate [1] ──entry_point── [N] VehicleVisit
    • VehicleVisit has FK: EntryGateID → Gate.GateID
    • Label relationship clearly: "vehicle_entered_through"

R10: "exit_point_for_vehicle" (Gate ──── VehicleVisit)
    • Cardinality: 1:N (One Gate is exit point for Many VehicleVisits)
    • Participation: Partial on both sides (Vehicle may not exit yet; Gate can have 0 exits)
    • Draw: Gate [0..1] ──exit_point── [0..N] VehicleVisit
    • VehicleVisit has FK: ExitGateID → Gate.GateID (NULLABLE)
    • Label relationship clearly: "vehicle_exited_through"

R11: "tracks" (Gate ──── GateOccupancy)
    • Cardinality: 1:1 (One Gate has exactly One GateOccupancy record)
    • Participation: Total on both sides (every Gate MUST have occupancy; every occupancy MUST have a Gate)
    • Draw: Gate [1] ──tracks── [1] GateOccupancy
    • GateOccupancy has PK & FK: GateID → Gate.GateID
    • This is a STRONG 1:1 relationship

R12: "assigned_to" (Role ──── User)
    • Cardinality: 1:N (One Role is assigned to Many Users)
    • Participation: Total on User side (every User MUST have a Role)
    • Participation: Partial on Role side (a Role can exist without Users)
    • Draw: Role [1] ──assigned_to── [N] User
    • User has FK: RoleID → Role.RoleID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. SPECIAL MODELING NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TERNARY RELATIONSHIP? NO.
  While PersonVisit involves Person, Gate, and Vehicle, it is NOT a ternary.
  It is THREE binary relationships:
    Member → PersonVisit (1:N)
    Gate → PersonVisit (1:N, twice: entry & exit)
    Vehicle → PersonVisit (1:N, optional)

WEAK ENTITY? NO.
  All entities have their own primary keys (SERIAL auto-increment).
  GateOccupancy has GateID as PK, but it's also a FK (1:1 dependency).
  This is NOT a weak entity — it's a strong entity with a composite key relationship.

MULTIVALUED ATTRIBUTES? NO.
  All attributes are single-valued (normalized to 3NF).
  If expansion needed (e.g., multiple contact numbers), create a separate table.

DERIVED ATTRIBUTES? Optional Enhancement:
  You MAY show a derived attribute if useful:
    • "CurrentOccupancy" derived from COUNT of active visits at a Gate
    • Mark with dashed oval

COMPOSITE ATTRIBUTES? Optional Enhancement:
  You MAY decompose attributes if semantically richer:
    • Name → {FirstName, LastName}
    • Location → {Building, FloorNumber}
  But current schema uses simple attributes, so this is OPTIONAL.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. LAYOUT & VISUAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TITLE: "GateGuard — ER Diagram"
SUBTITLE: "IIT Gandhinagar Entry & Exit Management System"

ENTITY PLACEMENT (suggested logical grouping):
  TOP LEFT:        MemberType, Member
  TOP RIGHT:       VehicleType, Vehicle
  CENTER:          Gate, GateOccupancy
  BOTTOM LEFT:     Role, User
  BOTTOM CENTER:   PersonVisit
  BOTTOM RIGHT:    VehicleVisit

COLOR SCHEME (use subtle colors, not garish):
  • Master data entities (Types, Role): Light yellow (#FFFDE7)
  • Core entities (Member, Vehicle, Gate): Light blue (#E3F2FD)
  • Transactional entities (Visits, Occupancy): Light green (#E8F5E9)
  • System entities (User): Light purple (#F3E5F5)

RELATIONSHIPS:
  • Draw diamonds between entities
  • Label each relationship clearly
  • Show cardinality ratios: 1:1, 1:N, N:M
  • Use single/double lines for partial/total participation

CONSTRAINTS:
  • Add constraint annotations as notes
  • Use curly braces: {constraint description}
  • Place near relevant entities/relationships

LEGEND (include a small legend box):
  ┌─────────────────────────────────────┐
  │ LEGEND                              │
  ├─────────────────────────────────────┤
  │ Rectangle: Entity                   │
  │ Diamond: Relationship               │
  │ Oval: Attribute                     │
  │ Underlined: Primary Key             │
  │ ─────: Partial participation (0..N) │
  │ ═════: Total participation (1..N)   │
  │ 1:1, 1:N, N:M: Cardinality ratios   │
  └─────────────────────────────────────┘

SPACING:
  • Keep diagram readable at A3 landscape (or two A4 pages)
  • Ensure no overlapping relationships
  • Use orthogonal lines (horizontal/vertical) for clarity
  • Minimize line crossings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. VALIDATION CHECKLIST (for AI Tool)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalizing the diagram, verify:
  ✓ All 10 entities are present
  ✓ All primary keys are underlined
  ✓ All foreign keys are labeled as FK
  ✓ All 12 relationships are drawn with diamonds
  ✓ Cardinality ratios are correct (1:1, 1:N, N:M)
  ✓ Participation constraints are shown (single/double lines)
  ✓ UNIQUE constraints are marked
  ✓ NOT NULL attributes are indicated (bold or thick line)
  ✓ Logical constraints are annotated
  ✓ Gate has TWO relationships to PersonVisit (entry & exit)
  ✓ Gate has TWO relationships to VehicleVisit (entry & exit)
  ✓ GateOccupancy has 1:1 with Gate
  ✓ Vehicle.OwnerID is NULLABLE (partial participation with Member)
  ✓ PersonVisit.VehicleID is NULLABLE (person can come on foot)
  ✓ PersonVisit.ExitGateID/ExitTime are NULLABLE (visit may be active)
  ✓ VehicleVisit.ExitGateID/ExitTime are NULLABLE (visit may be active)
  ✓ No weak entities (all have independent primary keys)
  ✓ No ternary relationships (all are binary)
  ✓ Diagram is professional, clear, and publication-ready

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate the ER diagram in one of these formats (choose based on tool capability):
  1. **Draw.io XML** (preferred for import into draw.io)
  2. **PlantUML ER syntax** (for PlantUML rendering)
  3. **Mermaid ER syntax** (for Mermaid.js rendering)
  4. **SVG vector graphic** (for direct embedding)
  5. **PNG high-resolution image** (300 DPI minimum)

If generating code (PlantUML/Mermaid), also provide:
  • Clear comments for each entity block
  • Clear comments for each relationship
  • Instructions for rendering the diagram

BONUS: If the tool supports it, also generate:
  • A separate "simplified" ER diagram showing only entity names and relationships (no attributes) for quick overview
  • A "detailed" ER diagram with all attributes and constraints (as specified above)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. FINAL QUALITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This ER diagram MUST:
  ✓ Follow Elmasri & Navathe Chapter 7 notation standards
  ✓ Be 100% consistent with the SQL schema (schema.sql)
  ✓ Be 100% consistent with the UML Class Diagram (previously generated)
  ✓ Be suitable for academic submission (IIT Gandhinagar CS432 Assignment)
  ✓ Be clear enough for a database novice to understand
  ✓ Be detailed enough for a DBA to implement directly
  ✓ Look professional and publication-ready

Generate the ER diagram now.
```

---

#### Why This Prompt Is Optimal

This ER diagram prompt is designed to be **comprehensive, innovative, and professional** because:

1. **Pedagogical Clarity**: Follows textbook standards (Elmasri & Navathe Ch. 7) exactly as required by the assignment
2. **Complete Context**: Includes the design philosophy (Guard as decision-maker) to ensure semantic correctness
3. **Entity-by-Entity Specification**: Every entity's attributes, keys, and constraints are explicitly listed
4. **Relationship-by-Relationship Specification**: Every relationship's cardinality, participation, and FK mappings are detailed
5. **Visual Excellence**: Includes color scheme, layout suggestions, legend, and spacing guidelines
6. **Validation Built-In**: 20-point checklist ensures nothing is missed
7. **Multi-Format Support**: Works with Draw.io, PlantUML, Mermaid, or any ER tool
8. **Academic-Grade**: Meets all IIT Gandhinagar CS432 Assignment-1 Module B requirements
9. **Semantic Correctness**: Explains WHY certain design decisions (no weak entities, no ternary relationships)
10. **Professional Quality**: Suitable for submission, presentation, or publication

This prompt will produce an ER diagram that:
- Is visually stunning and easy to understand
- Accurately represents all 10 entities and 12 relationships
- Shows all constraints, keys, and cardinalities correctly
- Can be directly imported into documentation or presentations
- Demonstrates deep understanding of ER modeling principles

---

### 11.7 Interactive HTML ER Diagram — Professional Web-Based Visualization

#### How to Use This Prompt

> Paste the prompt below into any AI tool (ChatGPT, Gemini, Claude, or any code-generation assistant).  
> This prompt generates a **self-contained, interactive HTML file** with SVG-based ER diagram featuring zoom, pan, hover effects, and professional styling.

```
You are a Senior Full-Stack Developer and Database Architect. Generate a
publication-grade, interactive, self-contained HTML page featuring the
GateGuard Entry & Exit Management System ER Diagram with professional
SVG graphics, JavaScript interactivity, and modern UI/UX design.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SYSTEM CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: GateGuard Entry & Exit Management System
Institution: IIT Gandhinagar
Course: CS432 Track-1 Assignment-1 Module B
Database: PostgreSQL (10 tables, 12 relationships, 3NF normalized)

Design Philosophy:
- Guard is the DECISION-MAKER (manual verification, no auth in DB)
- System is a LOGGER (tracks entries/exits, occupancy, visits)
- Every person must be a pre-registered Member
- Vehicles can be pre-registered OR auto-registered on-the-fly
- Visits support active state (NULL exit fields until person/vehicle exits)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a SINGLE, SELF-CONTAINED HTML FILE with:

1. **HTML Structure**:
   - DOCTYPE html5
   - Responsive viewport meta tag
   - Professional title: "GateGuard ER Diagram — IIT Gandhinagar"
   - Header with project info and controls
   - Main SVG canvas for ER diagram
   - Sidebar with entity/relationship legend
   - Footer with metadata and credits

2. **SVG ER Diagram** (following Elmasri & Navathe Ch.7 notation):
   - 10 Entities as rectangles (rounded corners, gradient fills)
   - 12 Relationships as diamonds (color-coded)
   - Attributes as ovals connected to entities (primary keys underlined)
   - Cardinality labels (1:1, 1:N, 0..N) on relationship lines
   - Foreign key arrows with dashed lines
   - Color scheme:
     * Master Data (MemberType, VehicleType, Role): #FFFDE7 (light yellow)
     * Core Entities (Member, Vehicle, Gate): #E3F2FD (light blue)
     * Transactional (PersonVisit, VehicleVisit, GateOccupancy): #E8F5E9 (light green)
     * System (User): #F3E5F5 (light purple)

3. **Interactive Features** (JavaScript):
   - **Zoom**: Mouse wheel zoom (min 0.5x, max 3x)
   - **Pan**: Click-and-drag to pan the diagram
   - **Hover Effects**:
     * Entity hover: Highlight entity + all connected relationships
     * Relationship hover: Show tooltip with cardinality, participation, FK details
     * Attribute hover: Show data type, constraints (UNIQUE, NOT NULL, CHECK)
   - **Click Actions**:
     * Click entity: Toggle attribute visibility (expand/collapse)
     * Click relationship: Highlight both connected entities + show details panel
   - **Search**: Input box to search entities by name (auto-highlight)
   - **Reset View**: Button to reset zoom/pan to default
   - **Toggle Modes**:
     * Simplified view (entities + relationships only, no attributes)
     * Detailed view (all attributes visible)
     * Constraint view (show all CHECK constraints as annotations)

4. **Professional Styling** (CSS):
   - Modern, clean design with subtle shadows and gradients
   - Google Fonts: 'Inter' for UI, 'Fira Mono' for technical text
   - Entity boxes: Rounded corners (8px), subtle box-shadow, gradient background
   - Relationship diamonds: Solid fill, white border (2px), drop shadow
   - Attributes: Small ovals, light gray fill, dark text
   - Lines: Smooth SVG paths, arrowheads for directionality
   - Color palette: Professional, not garish (use CSS variables for easy customization)
   - Responsive layout: Works on desktop (1920px) and tablet (1024px)

5. **Legend & Documentation** (sidebar/panel):
   - **Entity Color Key**: Master/Core/Transactional/System with color swatches
   - **Notation Guide**:
     * Rectangle = Entity
     * Diamond = Relationship
     * Oval = Attribute
     * Underlined = Primary Key
     * Dashed line = Foreign Key
     * 1:1, 1:N, N:M = Cardinality
     * Single/double line = Partial/Total participation
   - **Entity List**: Clickable list of all 10 entities (clicking scrolls/highlights entity)
   - **Relationship List**: All 12 relationships with brief descriptions
   - **Constraint Summary**: All CHECK constraints, UNIQUE keys, NOT NULL fields

6. **Metadata Footer**:
   - Project: GateGuard Entry & Exit Management System
   - Institution: IIT Gandhinagar
   - Course: CS432 Track-1 Assignment-1
   - Generated: <current date>
   - Version: 1.0
   - Standards: Elmasri & Navathe Ch.7 (ER), Silberschatz Ch.6 (ER)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ENTITIES (10 Total) — FULL SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each entity, draw a RECTANGLE with:
- Entity name at top (bold, 16px)
- Horizontal line separator
- Attributes below (each in an oval connected by line):
  * Primary Key: UNDERLINED oval (e.g., TypeID)
  * Unique: Oval with {UK} annotation (e.g., Email {UK})
  * Foreign Key: Dashed line to parent entity (e.g., TypeID → MemberType)
  * Nullable: Light gray oval (e.g., Age, OwnerID)

ENTITY 1: MemberType (Master Data, #FFFDE7)
  Attributes:
    • TypeID (PK, underlined)
    • TypeName {UNIQUE}
    • CreatedAt
    • UpdatedAt
  Constraints: {TypeName IN ('Resident', 'Student', 'Visitor')}

ENTITY 2: Member (Core, #E3F2FD)
  Attributes:
    • MemberID (PK, underlined)
    • Name
    • Email {UNIQUE}
    • ContactNumber
    • Image (BYTEA)
    • Age (nullable)
    • Department
    • TypeID (FK → MemberType)
    • CreatedAt
    • UpdatedAt
  Constraints: {Email LIKE '%@%.%'}, {Age > 0 AND Age < 150}

ENTITY 3: VehicleType (Master Data, #FFFDE7)
  Attributes:
    • TypeID (PK, underlined)
    • TypeName {UNIQUE}
    • CreatedAt
    • UpdatedAt
  Constraints: {TypeName IN ('PrivateCar','Taxi','Bike','Truck','Bus')}

ENTITY 4: Vehicle (Core, #E3F2FD)
  Attributes:
    • VehicleID (PK, underlined)
    • LicensePlate {UNIQUE}
    • TypeID (FK → VehicleType)
    • OwnerID (FK → Member, nullable)
    • CreatedAt
    • UpdatedAt
  Constraints: {LicensePlate LENGTH >= 5}

ENTITY 5: Gate (Core, #E3F2FD)
  Attributes:
    • GateID (PK, underlined)
    • Name
    • Location
    • CreatedAt
    • UpdatedAt

ENTITY 6: GateOccupancy (Transactional, #E8F5E9)
  Attributes:
    • GateID (PK & FK → Gate, underlined)
    • OccupancyCount
    • UpdatedAt
  Constraints: {OccupancyCount >= 0}

ENTITY 7: Role (Master Data, #FFFDE7)
  Attributes:
    • RoleID (PK, underlined)
    • RoleName {UNIQUE}
    • CreatedAt
    • UpdatedAt
  Constraints: {RoleName IN ('Guard', 'Admin', 'SuperAdmin')}

ENTITY 8: User (System, #F3E5F5)
  Attributes:
    • UserID (PK, underlined)
    • Username {UNIQUE}
    • PasswordHash
    • RoleID (FK → Role)
    • CreatedAt
    • UpdatedAt
  Constraints: {Username LENGTH >= 3}, {PasswordHash LENGTH >= 32}

ENTITY 9: PersonVisit (Transactional, #E8F5E9)
  Attributes:
    • VisitID (PK, underlined)
    • PersonID (FK → Member)
    • EntryGateID (FK → Gate)
    • EntryTime
    • ExitGateID (FK → Gate, nullable)
    • ExitTime (nullable)
    • VehicleID (FK → Vehicle, nullable)
    • CreatedAt
    • UpdatedAt
  Constraints: {ExitTime >= EntryTime OR NULL}, {ExitGateID NULL ⟺ ExitTime NULL}

ENTITY 10: VehicleVisit (Transactional, #E8F5E9)
  Attributes:
    • VisitID (PK, underlined)
    • VehicleID (FK → Vehicle)
    • EntryGateID (FK → Gate)
    • EntryTime
    • ExitGateID (FK → Gate, nullable)
    • ExitTime (nullable)
    • CreatedAt
    • UpdatedAt
  Constraints: {ExitTime >= EntryTime OR NULL}, {ExitGateID NULL ⟺ ExitTime NULL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RELATIONSHIPS (12 Total) — FULL SPECIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each relationship, draw a DIAMOND with:
- Relationship name inside (e.g., "categorizes")
- Lines connecting to both entities
- Cardinality labels on each end (1, N, 0..1, 0..N)
- Participation: Single line = partial (0 or more), Double line = total (1 or more)

R1: MemberType ──── Member
  Name: "categorizes"
  Cardinality: 1:N (One MemberType categorizes Many Members)
  Participation: Total on Member (every Member MUST have a Type), Partial on MemberType
  FK: Member.TypeID → MemberType.TypeID

R2: Member ──── Vehicle
  Name: "owns"
  Cardinality: 1:N (One Member can own Many Vehicles)
  Participation: Partial on both (Member can have 0 vehicles; Vehicle can have no owner)
  FK: Vehicle.OwnerID → Member.MemberID (NULLABLE)

R3: VehicleType ──── Vehicle
  Name: "classifies"
  Cardinality: 1:N (One VehicleType classifies Many Vehicles)
  Participation: Total on Vehicle, Partial on VehicleType
  FK: Vehicle.TypeID → VehicleType.TypeID

R4: Member ──── PersonVisit
  Name: "makes_visit"
  Cardinality: 1:N (One Member makes Many PersonVisits)
  Participation: Total on PersonVisit, Partial on Member
  FK: PersonVisit.PersonID → Member.MemberID

R5: Vehicle ──── PersonVisit
  Name: "used_in_visit"
  Cardinality: 1:N (One Vehicle used in Many PersonVisits)
  Participation: Partial on both
  FK: PersonVisit.VehicleID → Vehicle.VehicleID (NULLABLE)

R6: Vehicle ──── VehicleVisit
  Name: "makes_vehicle_visit"
  Cardinality: 1:N (One Vehicle makes Many VehicleVisits)
  Participation: Total on VehicleVisit, Partial on Vehicle
  FK: VehicleVisit.VehicleID → Vehicle.VehicleID

R7: Gate ──── PersonVisit (entry)
  Name: "person_entered_through"
  Cardinality: 1:N (One Gate is entry point for Many PersonVisits)
  Participation: Total on PersonVisit, Partial on Gate
  FK: PersonVisit.EntryGateID → Gate.GateID

R8: Gate ──── PersonVisit (exit)
  Name: "person_exited_through"
  Cardinality: 1:N (One Gate is exit point for Many PersonVisits)
  Participation: Partial on both
  FK: PersonVisit.ExitGateID → Gate.GateID (NULLABLE)

R9: Gate ──── VehicleVisit (entry)
  Name: "vehicle_entered_through"
  Cardinality: 1:N (One Gate is entry point for Many VehicleVisits)
  Participation: Total on VehicleVisit, Partial on Gate
  FK: VehicleVisit.EntryGateID → Gate.GateID

R10: Gate ──── VehicleVisit (exit)
  Name: "vehicle_exited_through"
  Cardinality: 1:N (One Gate is exit point for Many VehicleVisits)
  Participation: Partial on both
  FK: VehicleVisit.ExitGateID → Gate.GateID (NULLABLE)

R11: Gate ──── GateOccupancy
  Name: "tracks"
  Cardinality: 1:1 (One Gate has exactly One GateOccupancy)
  Participation: Total on both
  FK: GateOccupancy.GateID → Gate.GateID (PK & FK)

R12: Role ──── User
  Name: "assigned_to"
  Cardinality: 1:N (One Role assigned to Many Users)
  Participation: Total on User, Partial on Role
  FK: User.RoleID → Role.RoleID

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SVG LAYOUT GUIDELINES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Canvas Size: 2400px width × 1800px height (allows zoom to 3x = 7200px × 5400px)

Suggested Entity Placement (x, y coordinates):
  TOP LEFT (Master Data):
    • MemberType: (200, 200)
    • VehicleType: (200, 500)
    • Role: (200, 800)
  
  TOP CENTER (Core Entities):
    • Member: (800, 300)
    • Vehicle: (800, 700)
    • Gate: (1400, 500)
  
  MIDDLE (Transactional):
    • GateOccupancy: (1400, 800)
    • PersonVisit: (1100, 1200)
    • VehicleVisit: (1100, 1500)
  
  BOTTOM LEFT (System):
    • User: (200, 1400)

Entity Box Dimensions: 220px width × auto height (depends on # of attributes)

Relationship Diamond Dimensions: 120px width × 80px height

Attribute Oval Dimensions: 120px width × 30px height

Use smooth SVG curves for relationship lines (no sharp angles).
Add arrowheads on all FK references (triangular SVG markers).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JAVASCRIPT INTERACTIVITY REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Implement the following interactive features:

1. **Zoom & Pan**:
   ```javascript
   let zoom = 1.0;
   let panX = 0, panY = 0;
   
   // Mouse wheel zoom (centered on cursor position)
   svgCanvas.addEventListener('wheel', (e) => {
     e.preventDefault();
     const delta = e.deltaY > 0 ? 0.9 : 1.1;
     zoom = Math.max(0.5, Math.min(3, zoom * delta));
     updateTransform();
   });
   
   // Click-and-drag pan
   let isDragging = false;
   let startX, startY;
   svgCanvas.addEventListener('mousedown', (e) => { isDragging = true; startX = e.clientX; startY = e.clientY; });
   svgCanvas.addEventListener('mousemove', (e) => {
     if (isDragging) {
       panX += (e.clientX - startX) / zoom;
       panY += (e.clientY - startY) / zoom;
       startX = e.clientX; startY = e.clientY;
       updateTransform();
     }
   });
   svgCanvas.addEventListener('mouseup', () => { isDragging = false; });
   
   function updateTransform() {
     svgCanvas.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
   }
   ```

2. **Entity Hover Effect**:
   - Highlight entity box (increase border thickness, glow shadow)
   - Highlight all connected relationships (change diamond color to bright orange)
   - Show tooltip with entity details (# of attributes, # of relationships)

3. **Relationship Hover Effect**:
   - Show tooltip with:
     * Relationship name
     * Cardinality (e.g., "1:N — One Member makes Many PersonVisits")
     * Participation (e.g., "Total on PersonVisit, Partial on Member")
     * Foreign Key (e.g., "PersonVisit.PersonID → Member.MemberID")

4. **Click Entity**:
   - Toggle attribute visibility (collapse all ovals to just show entity box, or expand to show all)
   - Add smooth CSS transition (0.3s ease-in-out)

5. **Click Relationship**:
   - Highlight both connected entities (border glow)
   - Open details panel in sidebar with:
     * Full relationship specification
     * Cardinality explanation
     * Example query (SQL JOIN)

6. **Search Functionality**:
   ```html
   <input type="text" id="entitySearch" placeholder="Search entities..." />
   ```
   - As user types, filter and highlight matching entities
   - Auto-pan to first match
   - Show count (e.g., "3 matches found")

7. **Toggle Buttons**:
   - [ ] Simplified View (hide all attributes, show only entity names + relationships)
   - [ ] Detailed View (show all attributes, default state)
   - [ ] Constraint View (add annotations for all CHECK constraints)
   - [ ] Reset View (reset zoom=1, pan=0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CSS STYLING REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use modern, professional CSS with:

```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Fira+Mono:wght@400;500&display=swap');

/* CSS Variables for easy customization */
:root {
  --color-master: #FFFDE7;
  --color-core: #E3F2FD;
  --color-transactional: #E8F5E9;
  --color-system: #F3E5F5;
  --color-primary: #1976D2;
  --color-secondary: #424242;
  --color-accent: #FF6F00;
  --font-ui: 'Inter', sans-serif;
  --font-tech: 'Fira Mono', monospace;
  --shadow-sm: 0 2px 4px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 8px rgba(0,0,0,0.15);
  --shadow-lg: 0 8px 16px rgba(0,0,0,0.2);
}

/* Entity Box */
.entity {
  fill: var(--color-core);
  stroke: var(--color-secondary);
  stroke-width: 2px;
  rx: 8px;
  filter: drop-shadow(var(--shadow-md));
  transition: all 0.3s ease;
}
.entity:hover {
  stroke-width: 4px;
  filter: drop-shadow(var(--shadow-lg));
}

/* Relationship Diamond */
.relationship {
  fill: var(--color-accent);
  stroke: white;
  stroke-width: 2px;
  filter: drop-shadow(var(--shadow-sm));
  transition: all 0.3s ease;
}
.relationship:hover {
  fill: #FF9100;
  filter: drop-shadow(var(--shadow-lg));
}

/* Attributes */
.attribute {
  fill: #F5F5F5;
  stroke: var(--color-secondary);
  stroke-width: 1px;
  font-family: var(--font-tech);
  font-size: 12px;
}
.attribute.pk {
  text-decoration: underline;
  font-weight: bold;
}

/* Lines and Arrows */
.fk-line {
  stroke: var(--color-secondary);
  stroke-width: 2px;
  stroke-dasharray: 5,5;
  marker-end: url(#arrowhead);
}
.rel-line {
  stroke: var(--color-secondary);
  stroke-width: 2px;
}

/* Tooltip */
.tooltip {
  position: absolute;
  background: rgba(0,0,0,0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: var(--font-ui);
  font-size: 14px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  max-width: 300px;
  z-index: 1000;
}
.tooltip.visible {
  opacity: 1;
}

/* Sidebar */
.sidebar {
  width: 320px;
  background: white;
  border-left: 1px solid #E0E0E0;
  padding: 24px;
  overflow-y: auto;
  font-family: var(--font-ui);
}
.sidebar h3 {
  color: var(--color-primary);
  font-size: 18px;
  margin-bottom: 12px;
}
.sidebar ul {
  list-style: none;
  padding: 0;
}
.sidebar li {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
}
.sidebar li:hover {
  background: var(--color-core);
}
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALIDATION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before finalizing the HTML file, verify:
  ✓ All 10 entities are rendered with correct colors
  ✓ All 12 relationships are drawn with diamonds
  ✓ All primary keys are underlined
  ✓ All foreign keys have dashed arrows pointing to parent entities
  ✓ All UNIQUE constraints are marked with {UK}
  ✓ All nullable attributes are indicated (lighter color)
  ✓ Cardinality labels (1:1, 1:N) are visible on all relationship lines
  ✓ Zoom works smoothly (mouse wheel)
  ✓ Pan works smoothly (click-and-drag)
  ✓ Hover effects work on all entities and relationships
  ✓ Tooltips show correct information
  ✓ Search box filters entities correctly
  ✓ Toggle buttons switch views correctly
  ✓ Reset button works
  ✓ Legend is complete and accurate
  ✓ Footer shows correct metadata
  ✓ Page is responsive (works at 1920px and 1024px width)
  ✓ All fonts load correctly (Google Fonts CDN)
  ✓ No JavaScript errors in console
  ✓ File is self-contained (no external dependencies except Google Fonts)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a SINGLE HTML FILE with the following structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GateGuard ER Diagram — IIT Gandhinagar</title>
  <style>
    /* All CSS here (use the styles specified above) */
  </style>
</head>
<body>
  <!-- Header -->
  <header>
    <h1>GateGuard — Entity-Relationship Diagram</h1>
    <p>IIT Gandhinagar Entry & Exit Management System | CS432 Assignment-1</p>
    <div class="controls">
      <input type="text" id="entitySearch" placeholder="Search entities...">
      <button id="simplifiedView">Simplified View</button>
      <button id="detailedView">Detailed View</button>
      <button id="constraintView">Constraint View</button>
      <button id="resetView">Reset View</button>
    </div>
  </header>

  <!-- Main Container -->
  <div class="container">
    <!-- SVG Canvas -->
    <div class="canvas-wrapper">
      <svg id="erDiagram" width="2400" height="1800" viewBox="0 0 2400 1800">
        <!-- Define arrow markers -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#424242" />
          </marker>
        </defs>
        
        <!-- Main SVG group (for zoom/pan transform) -->
        <g id="mainGroup" transform="translate(0, 0) scale(1)">
          <!-- All entities, relationships, attributes will be here -->
          <!-- ENTITY 1: MemberType -->
          <!-- ENTITY 2: Member -->
          <!-- ... -->
          <!-- RELATIONSHIP 1: categorizes -->
          <!-- RELATIONSHIP 2: owns -->
          <!-- ... -->
        </g>
      </svg>
    </div>

    <!-- Sidebar -->
    <aside class="sidebar">
      <h3>Entity Color Key</h3>
      <ul>
        <li><span class="color-swatch" style="background: #FFFDE7;"></span> Master Data</li>
        <li><span class="color-swatch" style="background: #E3F2FD;"></span> Core Entities</li>
        <li><span class="color-swatch" style="background: #E8F5E9;"></span> Transactional</li>
        <li><span class="color-swatch" style="background: #F3E5F5;"></span> System</li>
      </ul>

      <h3>Notation Guide</h3>
      <ul>
        <li>Rectangle = Entity</li>
        <li>Diamond = Relationship</li>
        <li>Oval = Attribute</li>
        <li>Underlined = Primary Key</li>
        <li>Dashed line = Foreign Key</li>
        <li>1:1, 1:N = Cardinality</li>
      </ul>

      <h3>Entities (10)</h3>
      <ul id="entityList">
        <!-- JavaScript will populate this -->
      </ul>

      <h3>Relationships (12)</h3>
      <ul id="relationshipList">
        <!-- JavaScript will populate this -->
      </ul>
    </aside>
  </div>

  <!-- Footer -->
  <footer>
    <p>GateGuard Entry & Exit Management System</p>
    <p>IIT Gandhinagar | CS432 Track-1 Assignment-1 | Generated: 2026-02-13</p>
    <p>Standards: Elmasri & Navathe Ch.7, Silberschatz Ch.6</p>
  </footer>

  <!-- Tooltip (hidden by default) -->
  <div id="tooltip" class="tooltip"></div>

  <script>
    /* All JavaScript here (implement zoom, pan, hover, click, search, toggle) */
  </script>
</body>
</html>
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL QUALITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This HTML ER diagram MUST:
  ✓ Be a single, self-contained HTML file (no external files except Google Fonts)
  ✓ Follow Elmasri & Navathe Chapter 7 ER notation standards
  ✓ Be 100% consistent with the SQL schema (schema.sql)
  ✓ Be 100% consistent with the UML Class Diagram
  ✓ Be visually stunning (professional gradients, shadows, modern UI)
  ✓ Be fully interactive (zoom, pan, hover, click, search)
  ✓ Be responsive (works on desktop and tablet)
  ✓ Have zero JavaScript errors
  ✓ Load instantly (no external dependencies except fonts)
  ✓ Be presentation-ready (suitable for projecting in class)
  ✓ Be submission-ready (meets all IIT Gandhinagar CS432 Assignment-1 requirements)

Generate the COMPLETE, SELF-CONTAINED HTML FILE now. Include all SVG entities,
relationships, attributes, and all JavaScript for interactivity. The file should
be ready to open in any modern browser (Chrome, Firefox, Edge, Safari).
```

---

#### Why This HTML ER Diagram Prompt Is Next-Level

This prompt produces a **professional, interactive, web-based ER diagram** that goes beyond static images:

**🎨 Visual Excellence**:
- Modern UI/UX with Google Fonts (Inter + Fira Mono)
- Professional color scheme (master/core/transactional/system)
- Subtle gradients, shadows, and smooth transitions
- Responsive design (works on desktop and tablet)

**🔧 Interactive Features**:
- **Zoom & Pan**: Smooth mouse wheel zoom (0.5x to 3x), click-and-drag pan
- **Hover Effects**: Entity highlights, relationship tooltips, attribute details
- **Click Actions**: Toggle attribute visibility, highlight relationships
- **Search**: Real-time entity search with auto-highlight
- **Toggle Modes**: Simplified/Detailed/Constraint views

**📊 Comprehensive Coverage**:
- All 10 entities with full attribute specifications
- All 12 relationships with cardinality, participation, FK mappings
- All constraints (CHECK, UNIQUE, NOT NULL) annotated
- Complete legend and notation guide
- Entity/relationship lists in sidebar

**💡 Educational Value**:
- Follows textbook standards (Elmasri & Navathe Ch.7)
- Shows FK arrows with clear directionality
- Includes constraint explanations
- Perfect for presentations and assignments

**🚀 Professional Quality**:
- Self-contained (single HTML file, no external dependencies)
- Production-ready code (clean, commented, maintainable)
- Zero-hassle deployment (just open in browser)
- Publication-grade output

**🎓 Academic Excellence**:
- Meets all IIT Gandhinagar CS432 Assignment-1 Module B requirements
- 100% consistent with SQL schema and UML diagrams
- Demonstrates advanced understanding of ER modeling
- Suitable for submission, presentation, or portfolio

This interactive HTML ER diagram is the **ULTIMATE** visualization for the GateGuard system — combining technical accuracy, visual appeal, and user experience in a single, impressive deliverable.

---

## 12. Next Steps

1. **Proceed to Database Schema Design** (`3_Database_Tables_and_Schema.md`)
2. **Validate UML-to-ER mapping** consistency
3. **Review relationship multiplicities** for accuracy
4. **Generate ER diagram** using the prompt in section 11.6 (static/PlantUML/Mermaid)
5. **Generate interactive HTML ER diagram** using the prompt in section 11.7 (web-based visualization)

---

**Document Version**: 2.2  
**Last Updated**: Assignment-1 Planning Phase  
**Status**: UML Class Design Planned + All Diagram Prompts Ready (Including ER Diagram + Interactive HTML ER Diagram)

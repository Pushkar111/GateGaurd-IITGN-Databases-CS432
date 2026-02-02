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

### 11.2 UML Sequence Diagram - Entry Workflow Prompt

```
Create a UML Sequence Diagram for the GateGuard Entry Process workflow.

ACTORS/PARTICIPANTS:
1. Guard (User actor)
2. GateGuard System (boundary)
3. MemberService (controller)
4. VisitService (controller)
5. GateOccupancyService (controller)
6. Database (entity)

SCENARIO: Person Entry with Vehicle

FLOW:
1. Guard scans Member ID card or enters Member ID manually
2. Guard scans Vehicle License Plate (optional)
3. System validates Member exists and is authorized
4. System validates Vehicle exists (if provided)
5. System creates PersonVisit record with EntryTime = NOW()
6. System creates VehicleVisit record (if vehicle provided)
7. System increments GateOccupancy for entry gate
8. System returns success confirmation to Guard
9. Guard receives confirmation and allows entry

ALTERNATIVE FLOWS:
- If Member not found: System returns error, Guard denies entry
- If Vehicle not found: System allows entry without vehicle link
- If GateOccupancy update fails: System logs error but allows entry

MESSAGES TO SHOW:
- scanMemberID() → validateMember() → createPersonVisit() → updateOccupancy() → confirmEntry()
- scanLicensePlate() → validateVehicle() → createVehicleVisit()

LIFELINES:
- Show activation boxes for each participant
- Show return messages (dashed arrows)
- Show error handling (alt frames)

OUTPUT REQUIREMENTS:
- Use standard UML sequence diagram notation
- Show all participants with lifelines
- Include activation boxes
- Show message arrows with labels
- Include alt frames for alternative flows
- Follow UML 2.5 standards

Generate a clear sequence diagram showing the complete entry workflow.
```

### 11.3 UML Use Case Diagram Prompt

```
Create a UML Use Case Diagram for the GateGuard Entry Gate Management System.

ACTORS:
1. Guard (primary actor)
2. Admin (primary actor)
3. System (secondary actor - for automated processes)

USE CASES:

GUARD USE CASES:
- Record Person Entry
- Record Person Exit
- Record Vehicle Entry
- Record Vehicle Exit
- View Current Occupancy
- Search Member Information
- Search Vehicle Information

ADMIN USE CASES:
- Manage Members (Create, Read, Update, Delete)
- Manage Vehicles (Create, Read, Update, Delete)
- Manage Gates (Create, Read, Update, Delete)
- Manage Users (Create, Read, Update, Delete)
- Manage Roles (Create, Read, Update, Delete)
- View Visit History
- Generate Reports
- View System Statistics

SYSTEM USE CASES:
- Update Gate Occupancy (automatic)
- Validate Visit Constraints (automatic)
- Send Notifications (automatic)

RELATIONSHIPS:
- Guard <<extends>> Record Person Entry (for vehicle association)
- Guard <<includes>> Validate Member (in all entry/exit cases)
- Admin <<extends>> Manage Members (for bulk operations)
- System <<includes>> Update Gate Occupancy (in all entry/exit cases)

OUTPUT REQUIREMENTS:
- Use standard UML use case diagram notation
- Show actors as stick figures
- Show use cases as ovals
- Use <<extends>> and <<includes>> relationships appropriately
- Group related use cases if needed
- Follow UML 2.5 standards

Generate a comprehensive use case diagram showing all system functionalities.
```

---

## 12. Next Steps

1. **Proceed to Database Schema Design** (`3_Database_Tables_and_Schema.md`)
2. **Validate UML-to-ER mapping** consistency
3. **Review relationship multiplicities** for accuracy
4. **Prepare ER diagram** based on UML class structure

---

**Document Version**: 1.0  
**Last Updated**: Assignment-1 Planning Phase  
**Status**: UML Class Design Planned ✅

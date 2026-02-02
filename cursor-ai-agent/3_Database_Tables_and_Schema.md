# GateGuard Assignment-1: Database Tables and Schema Planning

## 1. Overview

This document provides complete database schema planning for GateGuard Entry Gate Management System. The schema must comply with all Module A constraints: 10+ tables, PK/FK relationships, NOT NULL constraints, referential integrity, and logical constraints.

**Database System**: PostgreSQL  
**Normalization Level**: 3NF (Third Normal Form)  
**Reference Standards**: Elmasri & Navathe Chapter 7 (ER), Chapter 6 (Normalization)

---

## 2. Complete Table Definitions

### 2.1 MemberType Table

```sql
CREATE TABLE MemberType (
    TypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_membertype_name CHECK (TypeName IN ('Resident', 'Student', 'Visitor'))
);

-- Indexes
CREATE INDEX idx_membertype_name ON MemberType(TypeName);
```

**NOT NULL Columns**: TypeID, TypeName, CreatedAt ✅ (3 columns)

**Constraints**:
- PRIMARY KEY: TypeID
- UNIQUE: TypeName
- CHECK: TypeName must be one of predefined values
- NOT NULL: TypeID, TypeName, CreatedAt

**Sample Data**:
- (1, 'Resident', '2024-01-01 00:00:00', NULL)
- (2, 'Student', '2024-01-01 00:00:00', NULL)
- (3, 'Visitor', '2024-01-01 00:00:00', NULL)

---

### 2.2 Member Table

```sql
CREATE TABLE Member (
    MemberID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    ContactNumber VARCHAR(20) NOT NULL,
    Image BYTEA,  -- or VARCHAR(500) for image path
    Age INTEGER,
    Department VARCHAR(100),
    TypeID INTEGER NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_member_type FOREIGN KEY (TypeID) 
        REFERENCES MemberType(TypeID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_member_email CHECK (Email LIKE '%@%.%'),
    CONSTRAINT chk_member_age CHECK (Age IS NULL OR Age > 0 AND Age < 150)
);

-- Indexes
CREATE INDEX idx_member_type ON Member(TypeID);
CREATE INDEX idx_member_email ON Member(Email);
CREATE INDEX idx_member_name ON Member(Name);
```

**NOT NULL Columns**: MemberID, Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt ✅ (7 columns)

**Constraints**:
- PRIMARY KEY: MemberID
- FOREIGN KEY: TypeID → MemberType.TypeID
- UNIQUE: Email
- NOT NULL: MemberID, Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt
- CHECK: Email format, Age range

---

### 2.3 VehicleType Table

```sql
CREATE TABLE VehicleType (
    TypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vehicletype_name CHECK (TypeName IN ('PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus'))
);

-- Indexes
CREATE INDEX idx_vehicletype_name ON VehicleType(TypeName);
```

**NOT NULL Columns**: TypeID, TypeName, CreatedAt ✅ (3 columns)

**Constraints**:
- PRIMARY KEY: TypeID
- UNIQUE: TypeName
- CHECK: TypeName must be one of predefined values
- NOT NULL: TypeID, TypeName, CreatedAt

**Sample Data**:
- (1, 'PrivateCar', '2024-01-01 00:00:00', NULL)
- (2, 'Taxi', '2024-01-01 00:00:00', NULL)
- (3, 'Bike', '2024-01-01 00:00:00', NULL)
- (4, 'Truck', '2024-01-01 00:00:00', NULL)
- (5, 'Bus', '2024-01-01 00:00:00', NULL)

---

### 2.4 Vehicle Table

```sql
CREATE TABLE Vehicle (
    VehicleID SERIAL PRIMARY KEY,
    LicensePlate VARCHAR(20) NOT NULL UNIQUE,
    TypeID INTEGER NOT NULL,
    OwnerID INTEGER,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_type FOREIGN KEY (TypeID) 
        REFERENCES VehicleType(TypeID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_vehicle_owner FOREIGN KEY (OwnerID) 
        REFERENCES Member(MemberID) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_licenseplate_format CHECK (LENGTH(LicensePlate) >= 5)
);

-- Indexes
CREATE INDEX idx_vehicle_type ON Vehicle(TypeID);
CREATE INDEX idx_vehicle_owner ON Vehicle(OwnerID);
CREATE UNIQUE INDEX idx_vehicle_licenseplate ON Vehicle(LicensePlate);
```

**NOT NULL Columns**: VehicleID, LicensePlate, TypeID, CreatedAt, UpdatedAt ✅ (5 columns)

**Constraints**:
- PRIMARY KEY: VehicleID
- FOREIGN KEY: TypeID → VehicleType.TypeID
- FOREIGN KEY: OwnerID → Member.MemberID (nullable)
- UNIQUE: LicensePlate
- NOT NULL: VehicleID, LicensePlate, TypeID, CreatedAt, UpdatedAt
- CHECK: LicensePlate minimum length

---

### 2.5 Gate Table

```sql
CREATE TABLE Gate (
    GateID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Location VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_gate_name CHECK (LENGTH(Name) > 0)
);

-- Indexes
CREATE INDEX idx_gate_name ON Gate(Name);
CREATE INDEX idx_gate_location ON Gate(Location);
```

**NOT NULL Columns**: GateID, Name, Location, CreatedAt ✅ (4 columns)

**Constraints**:
- PRIMARY KEY: GateID
- NOT NULL: GateID, Name, Location, CreatedAt
- CHECK: Name must not be empty

**Sample Data**:
- (1, 'Main Gate', 'North Entrance', '2024-01-01 00:00:00', NULL)
- (2, 'East Gate', 'East Entrance', '2024-01-01 00:00:00', NULL)
- (3, 'West Gate', 'West Entrance', '2024-01-01 00:00:00', NULL)
- (4, 'South Gate', 'South Entrance', '2024-01-01 00:00:00', NULL)

---

### 2.6 GateOccupancy Table

```sql
CREATE TABLE GateOccupancy (
    GateID INTEGER PRIMARY KEY,
    OccupancyCount INTEGER NOT NULL DEFAULT 0,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_occupancy_gate FOREIGN KEY (GateID) 
        REFERENCES Gate(GateID) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_occupancy_count CHECK (OccupancyCount >= 0)
);

-- Indexes
CREATE INDEX idx_occupancy_count ON GateOccupancy(OccupancyCount);
```

**NOT NULL Columns**: GateID, OccupancyCount, UpdatedAt ✅ (3 columns)

**Constraints**:
- PRIMARY KEY: GateID (also FK)
- FOREIGN KEY: GateID → Gate.GateID
- NOT NULL: GateID, OccupancyCount, UpdatedAt
- CHECK: OccupancyCount >= 0
- DEFAULT: OccupancyCount = 0

**Note**: This table has a 1:1 relationship with Gate. GateID serves as both PK and FK.

---

### 2.7 Role Table

```sql
CREATE TABLE Role (
    RoleID SERIAL PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_role_name CHECK (RoleName IN ('Guard', 'Admin', 'SuperAdmin'))
);

-- Indexes
CREATE INDEX idx_role_name ON Role(RoleName);
```

**NOT NULL Columns**: RoleID, RoleName, CreatedAt ✅ (3 columns)

**Constraints**:
- PRIMARY KEY: RoleID
- UNIQUE: RoleName
- NOT NULL: RoleID, RoleName, CreatedAt
- CHECK: RoleName must be one of predefined values

**Sample Data**:
- (1, 'Guard', '2024-01-01 00:00:00', NULL)
- (2, 'Admin', '2024-01-01 00:00:00', NULL)
- (3, 'SuperAdmin', '2024-01-01 00:00:00', NULL)

---

### 2.8 User Table

```sql
CREATE TABLE User (
    UserID SERIAL PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    RoleID INTEGER NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (RoleID) 
        REFERENCES Role(RoleID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_username_length CHECK (LENGTH(Username) >= 3),
    CONSTRAINT chk_passwordhash_length CHECK (LENGTH(PasswordHash) >= 32)
);

-- Indexes
CREATE INDEX idx_user_role ON User(RoleID);
CREATE UNIQUE INDEX idx_user_username ON User(Username);
```

**NOT NULL Columns**: UserID, Username, PasswordHash, RoleID, CreatedAt, UpdatedAt ✅ (6 columns)

**Constraints**:
- PRIMARY KEY: UserID
- FOREIGN KEY: RoleID → Role.RoleID
- UNIQUE: Username
- NOT NULL: UserID, Username, PasswordHash, RoleID, CreatedAt, UpdatedAt
- CHECK: Username minimum length, PasswordHash minimum length

---

### 2.9 PersonVisit Table

```sql
CREATE TABLE PersonVisit (
    VisitID SERIAL PRIMARY KEY,
    PersonID INTEGER NOT NULL,
    EntryGateID INTEGER NOT NULL,
    EntryTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExitGateID INTEGER,
    ExitTime TIMESTAMP,
    VehicleID INTEGER,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_personvisit_person FOREIGN KEY (PersonID) 
        REFERENCES Member(MemberID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_personvisit_entrygate FOREIGN KEY (EntryGateID) 
        REFERENCES Gate(GateID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_personvisit_exitgate FOREIGN KEY (ExitGateID) 
        REFERENCES Gate(GateID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_personvisit_vehicle FOREIGN KEY (VehicleID) 
        REFERENCES Vehicle(VehicleID) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_exittime_after_entrytime CHECK (
        ExitTime IS NULL OR ExitTime >= EntryTime
    ),
    CONSTRAINT chk_exitgate_if_exittime CHECK (
        (ExitTime IS NULL AND ExitGateID IS NULL) OR 
        (ExitTime IS NOT NULL AND ExitGateID IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_personvisit_person ON PersonVisit(PersonID);
CREATE INDEX idx_personvisit_entrygate ON PersonVisit(EntryGateID);
CREATE INDEX idx_personvisit_exitgate ON PersonVisit(ExitGateID);
CREATE INDEX idx_personvisit_vehicle ON PersonVisit(VehicleID);
CREATE INDEX idx_personvisit_entrytime ON PersonVisit(EntryTime);
CREATE INDEX idx_personvisit_exittime ON PersonVisit(ExitTime);
CREATE INDEX idx_personvisit_active ON PersonVisit(PersonID, ExitTime) WHERE ExitTime IS NULL;
```

**NOT NULL Columns**: VisitID, PersonID, EntryGateID, EntryTime, CreatedAt ✅ (5 columns)

**Constraints**:
- PRIMARY KEY: VisitID
- FOREIGN KEY: PersonID → Member.MemberID
- FOREIGN KEY: EntryGateID → Gate.GateID
- FOREIGN KEY: ExitGateID → Gate.GateID (nullable)
- FOREIGN KEY: VehicleID → Vehicle.VehicleID (nullable)
- NOT NULL: VisitID, PersonID, EntryGateID, EntryTime, CreatedAt
- CHECK: ExitTime >= EntryTime (logical constraint)
- CHECK: ExitGateID must be set if ExitTime is set

---

### 2.10 VehicleVisit Table

```sql
CREATE TABLE VehicleVisit (
    VisitID SERIAL PRIMARY KEY,
    VehicleID INTEGER NOT NULL,
    EntryGateID INTEGER NOT NULL,
    EntryTime TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExitGateID INTEGER,
    ExitTime TIMESTAMP,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehiclevisit_vehicle FOREIGN KEY (VehicleID) 
        REFERENCES Vehicle(VehicleID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_vehiclevisit_entrygate FOREIGN KEY (EntryGateID) 
        REFERENCES Gate(GateID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_vehiclevisit_exitgate FOREIGN KEY (ExitGateID) 
        REFERENCES Gate(GateID) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_exittime_after_entrytime CHECK (
        ExitTime IS NULL OR ExitTime >= EntryTime
    ),
    CONSTRAINT chk_exitgate_if_exittime CHECK (
        (ExitTime IS NULL AND ExitGateID IS NULL) OR 
        (ExitTime IS NOT NULL AND ExitGateID IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_vehiclevisit_vehicle ON VehicleVisit(VehicleID);
CREATE INDEX idx_vehiclevisit_entrygate ON VehicleVisit(EntryGateID);
CREATE INDEX idx_vehiclevisit_exitgate ON VehicleVisit(ExitGateID);
CREATE INDEX idx_vehiclevisit_entrytime ON VehicleVisit(EntryTime);
CREATE INDEX idx_vehiclevisit_exittime ON VehicleVisit(ExitTime);
CREATE INDEX idx_vehiclevisit_active ON VehicleVisit(VehicleID, ExitTime) WHERE ExitTime IS NULL;
```

**NOT NULL Columns**: VisitID, VehicleID, EntryGateID, EntryTime, CreatedAt ✅ (5 columns)

**Constraints**:
- PRIMARY KEY: VisitID
- FOREIGN KEY: VehicleID → Vehicle.VehicleID
- FOREIGN KEY: EntryGateID → Gate.GateID
- FOREIGN KEY: ExitGateID → Gate.GateID (nullable)
- NOT NULL: VisitID, VehicleID, EntryGateID, EntryTime, CreatedAt
- CHECK: ExitTime >= EntryTime (logical constraint)
- CHECK: ExitGateID must be set if ExitTime is set

---

## 3. Foreign Key Relationships Summary

| Child Table | Foreign Key | Parent Table | ON DELETE | ON UPDATE | Nullable |
|-------------|-------------|--------------|-----------|-----------|----------|
| Member | TypeID | MemberType | RESTRICT | CASCADE | NO |
| Vehicle | TypeID | VehicleType | RESTRICT | CASCADE | NO |
| Vehicle | OwnerID | Member | SET NULL | CASCADE | YES |
| User | RoleID | Role | RESTRICT | CASCADE | NO |
| GateOccupancy | GateID | Gate | CASCADE | CASCADE | NO |
| PersonVisit | PersonID | Member | RESTRICT | CASCADE | NO |
| PersonVisit | EntryGateID | Gate | RESTRICT | CASCADE | NO |
| PersonVisit | ExitGateID | Gate | RESTRICT | CASCADE | YES |
| PersonVisit | VehicleID | Vehicle | SET NULL | CASCADE | YES |
| VehicleVisit | VehicleID | Vehicle | RESTRICT | CASCADE | NO |
| VehicleVisit | EntryGateID | Gate | RESTRICT | CASCADE | NO |
| VehicleVisit | ExitGateID | Gate | RESTRICT | CASCADE | YES |

**Total Foreign Keys**: 12 relationships

---

## 4. Constraint Summary

### 4.1 Primary Keys (10 tables)

All tables have SERIAL (auto-increment) primary keys:
- MemberType.TypeID
- Member.MemberID
- VehicleType.TypeID
- Vehicle.VehicleID
- Gate.GateID
- GateOccupancy.GateID
- Role.RoleID
- User.UserID
- PersonVisit.VisitID
- VehicleVisit.VisitID

### 4.2 Unique Constraints

- MemberType.TypeName
- Member.Email
- VehicleType.TypeName
- Vehicle.LicensePlate
- Role.RoleName
- User.Username

### 4.3 NOT NULL Constraints (Minimum 3 per Table)

| Table | NOT NULL Columns | Count |
|-------|------------------|-------|
| MemberType | TypeID, TypeName, CreatedAt | ✅ 3 |
| Member | MemberID, Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt | ✅ 7 |
| VehicleType | TypeID, TypeName, CreatedAt | ✅ 3 |
| Vehicle | VehicleID, LicensePlate, TypeID, CreatedAt, UpdatedAt | ✅ 5 |
| Gate | GateID, Name, Location, CreatedAt | ✅ 4 |
| GateOccupancy | GateID, OccupancyCount, UpdatedAt | ✅ 3 |
| Role | RoleID, RoleName, CreatedAt | ✅ 3 |
| User | UserID, Username, PasswordHash, RoleID, CreatedAt, UpdatedAt | ✅ 6 |
| PersonVisit | VisitID, PersonID, EntryGateID, EntryTime, CreatedAt | ✅ 5 |
| VehicleVisit | VisitID, VehicleID, EntryGateID, EntryTime, CreatedAt | ✅ 5 |

**Status**: ✅ All tables meet minimum 3 NOT NULL requirement

### 4.4 CHECK Constraints

| Table | Constraint | Purpose |
|-------|------------|---------|
| MemberType | TypeName IN ('Resident', 'Student', 'Visitor') | Valid type values |
| Member | Email LIKE '%@%.%' | Email format validation |
| Member | Age > 0 AND Age < 150 | Age range validation |
| VehicleType | TypeName IN ('PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus') | Valid vehicle types |
| Vehicle | LENGTH(LicensePlate) >= 5 | License plate format |
| Gate | LENGTH(Name) > 0 | Gate name validation |
| GateOccupancy | OccupancyCount >= 0 | Non-negative occupancy |
| Role | RoleName IN ('Guard', 'Admin', 'SuperAdmin') | Valid roles |
| User | LENGTH(Username) >= 3 | Username minimum length |
| User | LENGTH(PasswordHash) >= 32 | Password hash validation |
| PersonVisit | ExitTime >= EntryTime OR ExitTime IS NULL | Logical timing |
| PersonVisit | ExitGateID set if ExitTime set | Consistency |
| VehicleVisit | ExitTime >= EntryTime OR ExitTime IS NULL | Logical timing |
| VehicleVisit | ExitGateID set if ExitTime set | Consistency |

---

## 5. Normalization Analysis

### 5.1 First Normal Form (1NF)

✅ **Compliant**: All tables have atomic values, no repeating groups
- Each column contains single values
- No multi-valued attributes
- No composite attributes split across columns

### 5.2 Second Normal Form (2NF)

✅ **Compliant**: All non-key attributes fully dependent on primary key
- All tables have single-column primary keys
- No partial dependencies

### 5.3 Third Normal Form (3NF)

✅ **Compliant**: No transitive dependencies

**Examples of Normalization**:
- **MemberType** separate from Member (prevents repeating type names)
- **VehicleType** separate from Vehicle (prevents repeating type names)
- **Role** separate from User (prevents repeating role names)
- **Gate** separate from visit tables (prevents repeating gate details)

**No transitive dependencies found**: All attributes directly depend on primary key.

---

## 6. Index Planning

### 6.1 Primary Key Indexes (Automatic)

PostgreSQL automatically creates B-tree indexes on all PRIMARY KEY columns:
- MemberType.TypeID
- Member.MemberID
- VehicleType.TypeID
- Vehicle.VehicleID
- Gate.GateID
- GateOccupancy.GateID
- Role.RoleID
- User.UserID
- PersonVisit.VisitID
- VehicleVisit.VisitID

### 6.2 Foreign Key Indexes (Recommended)

Indexes on all foreign key columns for join performance:
- Member.TypeID
- Vehicle.TypeID
- Vehicle.OwnerID
- User.RoleID
- PersonVisit.PersonID
- PersonVisit.EntryGateID
- PersonVisit.ExitGateID
- PersonVisit.VehicleID
- VehicleVisit.VehicleID
- VehicleVisit.EntryGateID
- VehicleVisit.ExitGateID

### 6.3 Query Performance Indexes

Indexes for frequently queried columns:
- Member.Email (UNIQUE index)
- Member.Name (for search)
- Vehicle.LicensePlate (UNIQUE index)
- User.Username (UNIQUE index)
- PersonVisit.EntryTime, ExitTime (for temporal queries)
- VehicleVisit.EntryTime, ExitTime (for temporal queries)
- PersonVisit active visits (partial index: WHERE ExitTime IS NULL)
- VehicleVisit active visits (partial index: WHERE ExitTime IS NULL)

**Note**: B+ Tree implementation for Assignment 2 will build on these indexes.

---

## 7. Referential Integrity Rules

### 7.1 ON DELETE Actions

| Action | Usage | Tables |
|--------|-------|--------|
| **RESTRICT** | Prevent deletion if child records exist | MemberType, VehicleType, Role, Gate, Member (for PersonVisit), Vehicle (for VehicleVisit) |
| **SET NULL** | Set FK to NULL when parent deleted | Vehicle.OwnerID, PersonVisit.VehicleID |
| **CASCADE** | Delete child records when parent deleted | GateOccupancy (when Gate deleted) |

### 7.2 ON UPDATE Actions

All foreign keys use **CASCADE** to maintain referential integrity when parent PK changes.

---

## 8. Logical Constraints Documentation

### 8.1 Business Rules

1. **Exit Time Validation**: ExitTime must be >= EntryTime (or NULL for active visits)
2. **Exit Gate Consistency**: If ExitTime is set, ExitGateID must also be set
3. **Occupancy Count**: Must always be >= 0 (non-negative)
4. **Vehicle Ownership**: OwnerID can be NULL (for public vehicles like taxis)
5. **Active Visits**: ExitTime IS NULL indicates person/vehicle is still on campus
6. **Multi-gate Support**: EntryGateID and ExitGateID can be different (person enters Gate 1, exits Gate 2)

### 8.2 Data Integrity Rules

1. **Email Uniqueness**: Each member must have unique email address
2. **License Plate Uniqueness**: Each vehicle must have unique license plate
3. **Username Uniqueness**: Each user must have unique username
4. **Type Validation**: MemberType and VehicleType must use predefined values
5. **Role Validation**: Role must use predefined values

---

## 9. Table Creation Order

Due to foreign key dependencies, tables must be created in this order:

1. **MemberType** (no dependencies)
2. **VehicleType** (no dependencies)
3. **Role** (no dependencies)
4. **Gate** (no dependencies)
5. **Member** (depends on MemberType)
6. **Vehicle** (depends on VehicleType, Member)
7. **User** (depends on Role)
8. **GateOccupancy** (depends on Gate)
9. **PersonVisit** (depends on Member, Gate, Vehicle)
10. **VehicleVisit** (depends on Vehicle, Gate)

---

## 10. Schema Validation Checklist

### 10.1 Module A Requirements

- [x] 10+ tables created (10 tables)
- [x] Member table with required attributes (MemberID, Name, Image, Age, Email, Contact Number)
- [x] All tables have Primary Keys
- [x] All relationships use Foreign Keys (12 FK relationships)
- [x] Minimum 3 NOT NULL columns per table
- [x] Referential integrity enforced (ON DELETE/ON UPDATE)
- [x] Logical constraints implemented (CHECK constraints)
- [x] Unique constraints where required
- [x] Normalization to 3NF

### 10.2 Data Type Consistency

- [x] SERIAL for all primary keys
- [x] VARCHAR for text fields with appropriate lengths
- [x] INTEGER for numeric IDs and counts
- [x] TIMESTAMP for date/time fields
- [x] BYTEA for image storage (or VARCHAR for path)

---

## 11. Gemini Prompts for ER Diagrams

### 11.1 Comprehensive ER Diagram - Crow's Foot Notation

```
Create a comprehensive Entity-Relationship (ER) diagram for the GateGuard Entry Gate Management System using Crow's Foot notation as per Elmasri & Navathe Chapter 7 standards.

DATABASE CONTEXT:
- Database: PostgreSQL
- Notation: Crow's Foot (Chen's Crow's Foot style)
- Purpose: Visual representation of database schema for Assignment-1

ENTITIES (10 total):

1. MEMBERTYPE
   Attributes:
     - TypeID (PK, INTEGER, underlined)
     - TypeName (VARCHAR(50), NOT NULL, UNIQUE)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP)
   Sample Values: Resident, Student, Visitor

2. MEMBER
   Attributes:
     - MemberID (PK, INTEGER, underlined)
     - Name (VARCHAR(100), NOT NULL)
     - Email (VARCHAR(255), NOT NULL, UNIQUE)
     - ContactNumber (VARCHAR(20), NOT NULL)
     - Image (BYTEA, nullable)
     - Age (INTEGER, nullable)
     - Department (VARCHAR(100), nullable)
     - TypeID (FK → MemberType, INTEGER, NOT NULL)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP, NOT NULL)

3. VEHICLETYPE
   Attributes:
     - TypeID (PK, INTEGER, underlined)
     - TypeName (VARCHAR(50), NOT NULL, UNIQUE)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP)
   Sample Values: PrivateCar, Taxi, Bike, Truck, Bus

4. VEHICLE
   Attributes:
     - VehicleID (PK, INTEGER, underlined)
     - LicensePlate (VARCHAR(20), NOT NULL, UNIQUE)
     - TypeID (FK → VehicleType, INTEGER, NOT NULL)
     - OwnerID (FK → Member, INTEGER, nullable)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP, NOT NULL)

5. GATE
   Attributes:
     - GateID (PK, INTEGER, underlined)
     - Name (VARCHAR(100), NOT NULL)
     - Location (VARCHAR(255), NOT NULL)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP)

6. GATEOCCUPANCY
   Attributes:
     - GateID (PK, FK → Gate, INTEGER, underlined)
     - OccupancyCount (INTEGER, NOT NULL, >= 0)
     - UpdatedAt (TIMESTAMP, NOT NULL)

7. ROLE
   Attributes:
     - RoleID (PK, INTEGER, underlined)
     - RoleName (VARCHAR(50), NOT NULL, UNIQUE)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP)
   Sample Values: Guard, Admin, SuperAdmin

8. USER
   Attributes:
     - UserID (PK, INTEGER, underlined)
     - Username (VARCHAR(50), NOT NULL, UNIQUE)
     - PasswordHash (VARCHAR(255), NOT NULL)
     - RoleID (FK → Role, INTEGER, NOT NULL)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP, NOT NULL)

9. PERSONVISIT
   Attributes:
     - VisitID (PK, INTEGER, underlined)
     - PersonID (FK → Member, INTEGER, NOT NULL)
     - EntryGateID (FK → Gate, INTEGER, NOT NULL)
     - EntryTime (TIMESTAMP, NOT NULL)
     - ExitGateID (FK → Gate, INTEGER, nullable)
     - ExitTime (TIMESTAMP, nullable)
     - VehicleID (FK → Vehicle, INTEGER, nullable)
     - CreatedAt (TIMESTAMP, NOT NULL)
     - UpdatedAt (TIMESTAMP)
   Constraints: ExitTime >= EntryTime OR ExitTime IS NULL

10. VEHICLEVISIT
    Attributes:
      - VisitID (PK, INTEGER, underlined)
      - VehicleID (FK → Vehicle, INTEGER, NOT NULL)
      - EntryGateID (FK → Gate, INTEGER, NOT NULL)
      - EntryTime (TIMESTAMP, NOT NULL)
      - ExitGateID (FK → Gate, INTEGER, nullable)
      - ExitTime (TIMESTAMP, nullable)
      - CreatedAt (TIMESTAMP, NOT NULL)
      - UpdatedAt (TIMESTAMP)
    Constraints: ExitTime >= EntryTime OR ExitTime IS NULL

RELATIONSHIPS:

1. MemberType ──< categorizes >── Member
   Cardinality: 1:M (One MemberType has many Members)
   Participation: Total on Member side (Member must have TypeID)

2. Member ──< makes >── PersonVisit
   Cardinality: 1:M (One Member makes many PersonVisits)
   Participation: Total on PersonVisit side

3. Member ──< owns >── Vehicle
   Cardinality: 1:M (One Member can own many Vehicles)
   Participation: Partial on Vehicle side (OwnerID nullable)

4. VehicleType ──< categorizes >── Vehicle
   Cardinality: 1:M (One VehicleType has many Vehicles)
   Participation: Total on Vehicle side

5. Vehicle ──< used_in >── PersonVisit
   Cardinality: 1:M (One Vehicle can be used in many PersonVisits)
   Participation: Partial on PersonVisit side (VehicleID nullable)

6. Vehicle ──< makes >── VehicleVisit
   Cardinality: 1:M (One Vehicle makes many VehicleVisits)
   Participation: Total on VehicleVisit side

7. Gate ──< entry_point >── PersonVisit
   Cardinality: 1:M (One Gate is entry point for many PersonVisits)
   Participation: Total on PersonVisit side

8. Gate ──< exit_point >── PersonVisit
   Cardinality: 1:M (One Gate is exit point for many PersonVisits)
   Participation: Partial on PersonVisit side (ExitGateID nullable)

9. Gate ──< entry_point >── VehicleVisit
   Cardinality: 1:M (One Gate is entry point for many VehicleVisits)
   Participation: Total on VehicleVisit side

10. Gate ──< exit_point >── VehicleVisit
    Cardinality: 1:M (One Gate is exit point for many VehicleVisits)
    Participation: Partial on VehicleVisit side (ExitGateID nullable)

11. Gate ──< tracks >── GateOccupancy
    Cardinality: 1:1 (One Gate has one GateOccupancy record)
    Participation: Total on both sides

12. Role ──< assigned_to >── User
    Cardinality: 1:M (One Role assigned to many Users)
    Participation: Total on User side

CONSTRAINTS TO SHOW:
- Primary Keys: Underline all PK attributes
- Foreign Keys: Mark with (FK) notation
- UNIQUE: Mark with {U} or note
- NOT NULL: Mark with * or note
- CHECK: Annotate logical constraints (ExitTime >= EntryTime, OccupancyCount >= 0)

OUTPUT REQUIREMENTS:
- Use Crow's Foot notation (three-pronged fork for "many" side)
- Show entities as rectangles
- Show relationships as diamonds with descriptive names
- Underline primary keys
- Clearly mark foreign keys
- Show cardinality on relationship lines (1, M)
- Use appropriate line styles (solid for total participation, dashed for partial)
- Follow Elmasri & Navathe Chapter 7 conventions
- Ensure diagram is readable and professionally formatted

Generate a publication-ready ER diagram that accurately represents the complete database schema.
```

### 11.2 Detailed ER Diagram with All Constraints

```
Create a detailed Entity-Relationship diagram for GateGuard with explicit constraint annotations.

Include all entities, relationships, and constraints as specified in the comprehensive prompt above, plus:

ADDITIONAL ANNOTATIONS:
- Show CHECK constraints as notes near relevant attributes
- Indicate ON DELETE and ON UPDATE actions on relationship lines
- Mark nullable attributes clearly
- Show default values where applicable
- Include sample data ranges/values for type fields

CONSTRAINT DETAILS:
- MemberType.TypeName: CHECK IN ('Resident', 'Student', 'Visitor')
- Member.Email: UNIQUE, CHECK format validation
- Member.Age: CHECK range 0-150
- VehicleType.TypeName: CHECK IN ('PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus')
- Vehicle.LicensePlate: UNIQUE, CHECK length >= 5
- GateOccupancy.OccupancyCount: CHECK >= 0
- Role.RoleName: CHECK IN ('Guard', 'Admin', 'SuperAdmin')
- PersonVisit: CHECK ExitTime >= EntryTime OR ExitTime IS NULL
- VehicleVisit: CHECK ExitTime >= EntryTime OR ExitTime IS NULL

REFERENTIAL INTEGRITY:
- Show ON DELETE RESTRICT for most relationships
- Show ON DELETE SET NULL for Vehicle.OwnerID and PersonVisit.VehicleID
- Show ON DELETE CASCADE for GateOccupancy.GateID
- Show ON UPDATE CASCADE for all foreign keys

Generate a comprehensive ER diagram with all constraint details visible.
```

---

## 12. Next Steps

1. **Proceed to Test Data Planning** (`4_Test_Data_and_Integrity_Checks.md`)
2. **Validate schema** against all Module A requirements
3. **Prepare SQL dump** generation script
4. **Review constraint** implementations

---

**Document Version**: 1.0  
**Last Updated**: Assignment-1 Planning Phase  
**Status**: Database Schema Fully Planned ✅

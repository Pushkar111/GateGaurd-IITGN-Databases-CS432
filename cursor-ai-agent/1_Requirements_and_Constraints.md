# GateGuard Assignment-1: Requirements and Constraints Analysis

## 1. Project Overview

### 1.1 Problem Statement
GateGuard is an Entry Gate Management System designed for IIT Gandhinagar campus to address the following challenges:
- **Manual Process Issues**: Handwritten logs and verbal verification are slow and error-prone
- **Security Vulnerabilities**: Unauthorized visitors/vehicles can enter without proper tracking
- **Peak Hour Congestion**: Long queues form at gates, causing delays and missed entries
- **Lack of Real-time Visibility**: Authorities cannot monitor who is on premises or respond to emergencies effectively

### 1.2 Current Solutions Limitations
- Basic access cards and visitor registers provide limited functionality
- QR codes/RFID focus only on authentication, not integrated tracking
- No real-time occupancy monitoring or traffic analytics
- Fragmented visitor pre-registration systems cause gate delays

### 1.3 Project Scope (Assignment-1 Only)
This assignment focuses on:
- **Requirement Analysis**: Define system scope and functionality
- **UML Modelling**: Design system architecture using UML diagrams
- **Database Schema**: Develop normalized relational database schema
- **Conceptual Design**: Create ER diagrams and UML-to-ER mapping

**Note**: Application development, B+ Tree implementation, ACID testing, and Sharding are covered in subsequent assignments.

---

## 2. Module A: Database Design and Implementation Constraints

### 2.1 Mandatory Requirements

| Requirement | Specification | Status |
|------------|---------------|--------|
| **Member Table** | Must include MemberID (PK), Name, Image, Age, Email, Contact Number, and domain-relevant attributes | ⚠️ To Map |
| **Core Functionalities** | Minimum **5 core functionalities** must be supported | ✅ Identified |
| **Distinct Entities** | At least **5 distinct entities** required | ✅ 10 Entities |
| **Database Tables** | Minimum **10 tables** required | ✅ 10 Tables |
| **Primary Keys** | Each table must have PK or uniquely identifiable candidate key | ✅ All Defined |
| **Foreign Keys** | Relationships must use Foreign Keys | ✅ All Defined |
| **NOT NULL Columns** | Each table must have at least **3 NOT NULL columns** | ✅ Verified |
| **Unique Row Identification** | Every row must be uniquely identifiable | ✅ PK Ensures |
| **Referential Integrity** | Must satisfy referential integrity during UPDATE/DELETE | ✅ To Enforce |
| **Logical Constraints** | Domain-specific constraints (e.g., ExitTime >= EntryTime) | ✅ Defined |
| **Real-Life Data** | 10-20 rows per table with meaningful, realistic data | ⏳ To Generate |

### 2.2 Member Table Requirement Analysis

**Challenge**: System Design document uses "Person" table, but assignment requires "Member" table.

**Resolution Options**:
1. **Option A**: Rename Person → Member (recommended for assignment compliance)
2. **Option B**: Add separate Member table that references Person
3. **Option C**: Use Person table but ensure it has all Member attributes

**Recommended Approach**: **Option A** - Use "Member" as the primary entity name with attributes:
- MemberID (PK, INT, AUTO_INCREMENT)
- Name (VARCHAR, NOT NULL)
- Image (BLOB/VARCHAR for path, NULL allowed)
- Age (INT, NULL allowed)
- Email (VARCHAR, UNIQUE, NOT NULL)
- ContactNumber (VARCHAR, NOT NULL)
- TypeID (FK → MemberType, NOT NULL)
- Department (VARCHAR, NULL allowed)
- CreatedAt (TIMESTAMP, NOT NULL)
- UpdatedAt (TIMESTAMP, NOT NULL)

**Note**: This aligns with Person entity in System Design while meeting assignment requirements.

---

## 3. Core Functionalities (Minimum 5 Required)

### 3.1 Identified Functionalities

| # | Functionality | Description | Supporting Tables |
|---|--------------|-------------|-------------------|
| 1 | **Multi-gate Synchronization** | Track entry/exit across multiple campus gates with real-time updates | Gate, GateOccupancy, PersonVisit, VehicleVisit |
| 2 | **Visitor/Resident Tracking** | Distinguish and track different person types (Residents, Students, Visitors) | Member, MemberType, PersonVisit |
| 3 | **Vehicle/Person Synchronization** | Link vehicles with persons during entry/exit, support standalone vehicle tracking | Vehicle, VehicleType, PersonVisit, VehicleVisit |
| 4 | **Role-Based Access Control** | Manage guard and admin access with different permission levels | User, Role |
| 5 | **Real-time Occupancy Monitoring** | Calculate and maintain current occupancy count per gate | GateOccupancy, PersonVisit, VehicleVisit |
| 6 | **Entry/Exit Logging** | Record detailed timestamps and gate information for all movements | PersonVisit, VehicleVisit |
| 7 | **Vehicle Registration** | Register and manage vehicle information with owner linking | Vehicle, VehicleType, Member |

**Status**: ✅ **7 functionalities identified** (exceeds minimum requirement of 5)

---

## 4. Entity Analysis

### 4.1 Core Entities (10+ Tables)

| Entity | Primary Key | Key Attributes | Relationships |
|--------|-------------|----------------|---------------|
| **MemberType** | TypeID | TypeName (Resident, Student, Visitor) | 1:M with Member |
| **Member** | MemberID | Name, Email, ContactNumber, TypeID FK | M:1 with MemberType, 1:M with PersonVisit, 0:M with Vehicle |
| **VehicleType** | TypeID | TypeName (PrivateCar, Taxi, Bike) | 1:M with Vehicle |
| **Vehicle** | VehicleID | LicensePlate (UNIQUE), TypeID FK, OwnerID FK | M:1 with VehicleType, M:1 with Member, 1:M with PersonVisit, 1:M with VehicleVisit |
| **Gate** | GateID | Name, Location | 1:M with PersonVisit (Entry/Exit), 1:M with VehicleVisit (Entry/Exit), 1:1 with GateOccupancy |
| **GateOccupancy** | GateID (FK) | OccupancyCount (NOT NULL, >= 0) | 1:1 with Gate |
| **Role** | RoleID | RoleName (Guard, Admin) | 1:M with User |
| **User** | UserID | Username (UNIQUE), PasswordHash, RoleID FK | M:1 with Role |
| **PersonVisit** | VisitID | PersonID FK, EntryGateID FK, EntryTime, ExitGateID FK, ExitTime, VehicleID FK | M:1 with Member, M:1 with Gate (Entry), M:1 with Gate (Exit), M:1 with Vehicle |
| **VehicleVisit** | VisitID | VehicleID FK, EntryGateID FK, EntryTime, ExitGateID FK, ExitTime | M:1 with Vehicle, M:1 with Gate (Entry), M:1 with Gate (Exit) |

**Total Entities**: ✅ **10 tables** (meets minimum requirement)

---

## 5. Module B: Conceptual Design Requirements

### 5.1 UML Diagram Requirements

**Standards**: Follow Elmasri & Navathe Chapter 10 conventions

**Required UML Diagrams**:
1. **UML Class Diagram** (Primary)
   - Classes (entities) with attributes
   - Methods (if applicable)
   - Relationships (associations, generalizations, aggregations, compositions)
   - Multiplicity (1:1, 1:M, M:M)
   - Standard UML notation

2. **Additional UML Diagrams** (Recommended)
   - Sequence Diagram (for entry/exit workflows)
   - Use Case Diagram (for core functionalities)
   - Activity Diagram (for gate operations)

**Note**: "Present as many UML diagrams as possible for your project"

### 5.2 ER Diagram Requirements

**Standards**: 
- Elmasri & Navathe Chapter 7
- Silberschatz, Korth, Sudarshan Chapter 6
- Crow's Foot notation (as per System Design document)

**Required Elements**:
- Entities as rectangles
- Relationships as diamonds
- Primary Keys (underlined)
- Foreign Keys (clearly marked)
- Cardinality (1:1, 1:M, M:M)
- Attributes with data types
- Constraints (NOT NULL, UNIQUE, CHECK)

### 5.3 UML-to-ER Transition Requirements

Must provide explanation covering:
- UML classes → ER entities conversion
- UML associations → ER relationships conversion
- Key definitions (PK/FK) based on UML attributes
- Multiplicity adjustments (e.g., 1:M in UML → FK in ER)

---

## 6. Technical Stack Alignment

### 6.1 Target Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React (JSX, modular components) | User interface for guards/admins |
| **Backend** | Node.js + Express (RESTful APIs, MVC) | Business logic and API endpoints |
| **Database** | PostgreSQL | Relational database with FK integrity, B+Tree index support |

### 6.2 Database-Specific Considerations

**PostgreSQL Features to Leverage**:
- Foreign Key constraints with ON DELETE/ON UPDATE actions
- CHECK constraints for logical validations
- UNIQUE constraints for LicensePlate, Username
- B+Tree indexes (automatic on PK, manual on FK and frequently queried columns)
- Triggers for GateOccupancy updates (future implementation)

---

## 7. Constraint Specifications

### 7.1 Primary Key Constraints

All tables have single-column primary keys (auto-increment INT):
- MemberID, VehicleID, GateID, RoleID, UserID, VisitID (for both PersonVisit and VehicleVisit)
- TypeID (for MemberType and VehicleType)

### 7.2 Foreign Key Constraints

| Child Table | Foreign Key | References | Action on Delete | Action on Update |
|-------------|-------------|------------|------------------|------------------|
| Member | TypeID | MemberType.TypeID | RESTRICT | CASCADE |
| Vehicle | TypeID | VehicleType.TypeID | RESTRICT | CASCADE |
| Vehicle | OwnerID | Member.MemberID | SET NULL | CASCADE |
| User | RoleID | Role.RoleID | RESTRICT | CASCADE |
| PersonVisit | PersonID | Member.MemberID | RESTRICT | CASCADE |
| PersonVisit | EntryGateID | Gate.GateID | RESTRICT | CASCADE |
| PersonVisit | ExitGateID | Gate.GateID | RESTRICT | CASCADE |
| PersonVisit | VehicleID | Vehicle.VehicleID | SET NULL | CASCADE |
| VehicleVisit | VehicleID | Vehicle.VehicleID | RESTRICT | CASCADE |
| VehicleVisit | EntryGateID | Gate.GateID | RESTRICT | CASCADE |
| VehicleVisit | ExitGateID | Gate.GateID | RESTRICT | CASCADE |
| GateOccupancy | GateID | Gate.GateID | CASCADE | CASCADE |

### 7.3 NOT NULL Constraints (Minimum 3 per Table)

| Table | NOT NULL Columns | Count |
|-------|------------------|-------|
| MemberType | TypeID, TypeName | 2 → **Add CreatedAt** |
| Member | MemberID, Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt | ✅ 7 |
| VehicleType | TypeID, TypeName | 2 → **Add CreatedAt** |
| Vehicle | VehicleID, LicensePlate, TypeID, CreatedAt, UpdatedAt | ✅ 5 |
| Gate | GateID, Name, Location, CreatedAt | ✅ 4 |
| GateOccupancy | GateID, OccupancyCount, UpdatedAt | ✅ 3 |
| Role | RoleID, RoleName, CreatedAt | ✅ 3 |
| User | UserID, Username, PasswordHash, RoleID, CreatedAt, UpdatedAt | ✅ 6 |
| PersonVisit | VisitID, PersonID, EntryGateID, EntryTime, CreatedAt | ✅ 5 |
| VehicleVisit | VisitID, VehicleID, EntryGateID, EntryTime, CreatedAt | ✅ 5 |

**Action Required**: Add CreatedAt/UpdatedAt timestamps to MemberType and VehicleType to meet 3 NOT NULL requirement.

### 7.4 UNIQUE Constraints

- **Vehicle.LicensePlate**: UNIQUE NOT NULL (prevents duplicate vehicle registration)
- **User.Username**: UNIQUE NOT NULL (prevents duplicate user accounts)
- **Member.Email**: UNIQUE NOT NULL (prevents duplicate member emails)

### 7.5 CHECK Constraints

| Table | Constraint | Logic |
|-------|------------|-------|
| PersonVisit | ExitTime >= EntryTime OR ExitTime IS NULL | Logical timing validation |
| VehicleVisit | ExitTime >= EntryTime OR ExitTime IS NULL | Logical timing validation |
| GateOccupancy | OccupancyCount >= 0 | Non-negative occupancy |

### 7.6 Logical Constraints (Domain Rules)

1. **Exit Time Validation**: ExitTime must be later than EntryTime (or NULL if still inside)
2. **Occupancy Count**: Must be non-negative (>= 0)
3. **Gate Consistency**: EntryGateID and ExitGateID can be same or different (multi-gate support)
4. **Vehicle Ownership**: OwnerID can be NULL (for public vehicles like taxis)
5. **Visit Completion**: ExitGateID and ExitTime can be NULL (for active visits)

---

## 8. Normalization Analysis

### 8.1 Normal Form Compliance

**Target**: 3NF (Third Normal Form) or higher

**Analysis**:
- ✅ **1NF**: All tables have atomic values, no repeating groups
- ✅ **2NF**: All non-key attributes fully dependent on primary key
- ✅ **3NF**: No transitive dependencies (e.g., MemberType separate from Member)

**Normalization Examples**:
- **MemberType** table prevents repeating type names in Member table
- **VehicleType** table prevents repeating type names in Vehicle table
- **Role** table prevents repeating role names in User table
- **Gate** table prevents repeating gate details in visit tables

---

## 9. Evaluation Criteria Checklist

### 9.1 Module A Evaluation

- [ ] All 10+ tables created with proper structure
- [ ] Member table includes all required attributes (MemberID, Name, Image, Age, Email, Contact Number)
- [ ] All tables have Primary Keys
- [ ] All relationships use Foreign Keys
- [ ] Minimum 3 NOT NULL columns per table
- [ ] Referential integrity enforced (ON DELETE/ON UPDATE)
- [ ] Logical constraints implemented (CHECK constraints)
- [ ] 10-20 rows of realistic test data per table
- [ ] SQL dump file generated and validated

### 9.2 Module B Evaluation

- [ ] UML class diagram created with all entities
- [ ] UML diagrams follow standard notation (Elmasri & Navathe)
- [ ] ER diagram created with Crow's Foot notation
- [ ] Primary Keys underlined in ER diagram
- [ ] Foreign Keys clearly marked
- [ ] Relationships show correct cardinality (1:1, 1:M, M:M)
- [ ] UML-to-ER transition explanation provided
- [ ] Relationship justifications with examples
- [ ] Additional constraints documented
- [ ] Team member contributions clearly stated
- [ ] Single PDF report submitted

---

## 10. Risk Mitigation

### 10.1 Potential Issues

| Risk | Impact | Mitigation |
|------|--------|------------|
| Member table vs Person table naming | Medium | Use "Member" for assignment compliance, document mapping |
| Insufficient NOT NULL columns | High | Add CreatedAt/UpdatedAt timestamps to all tables |
| Missing logical constraints | Medium | Document all CHECK constraints explicitly |
| Incomplete test data | Medium | Create realistic scenarios covering all edge cases |
| UML/ER diagram misalignment | High | Ensure diagrams match SQL schema exactly |

---

## 11. Gemini Prompts for Requirements Analysis

### 11.1 UML Requirements Analysis Diagram Prompt

```
Create a comprehensive UML Requirements Analysis diagram for the GateGuard Entry Gate Management System based on the following specifications:

CONTEXT:
- System: GateGuard - Entry/Exit Management for IIT Gandhinagar Campus
- Purpose: Track persons (residents, students, visitors) and vehicles entering/exiting through multiple gates
- Key Requirements: Multi-gate synchronization, real-time occupancy, role-based access control

CORE ENTITIES TO MODEL:
1. Member (MemberID, Name, Email, ContactNumber, Image, Age, TypeID, Department)
2. MemberType (TypeID, TypeName) - Resident, Student, Visitor
3. Vehicle (VehicleID, LicensePlate, TypeID, OwnerID)
4. VehicleType (TypeID, TypeName) - PrivateCar, Taxi, Bike
5. Gate (GateID, Name, Location)
6. GateOccupancy (GateID, OccupancyCount)
7. Role (RoleID, RoleName) - Guard, Admin
8. User (UserID, Username, PasswordHash, RoleID)
9. PersonVisit (VisitID, PersonID, EntryGateID, EntryTime, ExitGateID, ExitTime, VehicleID)
10. VehicleVisit (VisitID, VehicleID, EntryGateID, EntryTime, ExitGateID, ExitTime)

RELATIONSHIPS TO SHOW:
- MemberType 1:M Member
- Member 1:M PersonVisit
- Member 0:M Vehicle (as Owner)
- VehicleType 1:M Vehicle
- Vehicle 1:M PersonVisit (optional)
- Vehicle 1:M VehicleVisit
- Gate 1:M PersonVisit (as EntryGate)
- Gate 1:M PersonVisit (as ExitGate)
- Gate 1:M VehicleVisit (as EntryGate)
- Gate 1:M VehicleVisit (as ExitGate)
- Gate 1:1 GateOccupancy
- Role 1:M User

CONSTRAINTS TO INDICATE:
- LicensePlate: UNIQUE
- Username: UNIQUE
- Email: UNIQUE
- ExitTime >= EntryTime (logical constraint)
- OccupancyCount >= 0 (logical constraint)

OUTPUT REQUIREMENTS:
- Use standard UML class diagram notation
- Show all attributes with data types
- Indicate primary keys (PK) and foreign keys (FK)
- Show multiplicities clearly (1, M, 0..1, 0..M)
- Use appropriate relationship types (association, composition, aggregation)
- Follow Elmasri & Navathe Chapter 10 conventions
- Include constraint annotations where applicable

Generate a clear, professional UML class diagram that can be used for database schema design.
```

### 11.2 ER Initial Entity Identification Prompt

```
Create an initial Entity-Relationship (ER) diagram for the GateGuard Entry Gate Management System to identify core entities and their relationships.

CONTEXT:
- Database System: PostgreSQL
- Notation: Crow's Foot (as per Elmasri & Navathe style)
- Purpose: Identify entities before detailed schema design

ENTITIES TO IDENTIFY:
1. Member (represents persons: residents, students, visitors)
2. MemberType (categorizes members)
3. Vehicle (tracks vehicles on campus)
4. VehicleType (categorizes vehicles)
5. Gate (physical entry/exit points)
6. GateOccupancy (real-time occupancy tracking)
7. Role (user roles: Guard, Admin)
8. User (system users: guards and admins)
9. PersonVisit (entry/exit records for persons)
10. VehicleVisit (entry/exit records for vehicles)

KEY ATTRIBUTES TO INCLUDE:
- Member: MemberID (PK), Name, Email, ContactNumber, TypeID (FK)
- Vehicle: VehicleID (PK), LicensePlate (UNIQUE), TypeID (FK), OwnerID (FK)
- Gate: GateID (PK), Name, Location
- PersonVisit: VisitID (PK), PersonID (FK), EntryGateID (FK), EntryTime, ExitGateID (FK), ExitTime
- VehicleVisit: VisitID (PK), VehicleID (FK), EntryGateID (FK), EntryTime, ExitGateID (FK), ExitTime

RELATIONSHIPS TO SHOW:
- MemberType → Member (1:M, "categorizes")
- Member → PersonVisit (1:M, "makes")
- Member → Vehicle (1:M, "owns", optional)
- VehicleType → Vehicle (1:M, "categorizes")
- Vehicle → PersonVisit (1:M, "used_in", optional)
- Vehicle → VehicleVisit (1:M, "makes")
- Gate → PersonVisit (1:M, "entry_point" and "exit_point")
- Gate → VehicleVisit (1:M, "entry_point" and "exit_point")
- Gate → GateOccupancy (1:1, "tracks")

OUTPUT REQUIREMENTS:
- Use Crow's Foot notation
- Show entities as rectangles
- Show relationships as diamonds with descriptive names
- Underline primary keys
- Mark foreign keys clearly
- Show cardinality (1, M) on relationship lines
- Use appropriate relationship types (one-to-one, one-to-many, many-to-many)
- Follow Elmasri & Navathe Chapter 7 conventions

Generate a clear ER diagram that serves as the foundation for detailed database schema design.
```

---

## 12. Next Steps

1. **Proceed to UML Class Design** (`2_UML_Class_Design.md`)
2. **Review entity relationships** and refine multiplicities
3. **Validate Member table** mapping against assignment requirements
4. **Prepare for database schema** design phase

---

**Document Version**: 1.0  
**Last Updated**: Assignment-1 Planning Phase  
**Status**: Requirements Extracted and Organized ✅

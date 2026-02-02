# GateGuard Assignment-1: Test Data and Integrity Checks Planning

## 1. Overview

This document provides comprehensive planning for test data generation and integrity validation for the GateGuard database. All tables must have 10-20 rows of meaningful, realistic data that reflects real-world campus scenarios.

**Requirement**: 10-20 rows per table with realistic, meaningful data  
**Validation**: All constraints must be tested (PK, FK, UNIQUE, NOT NULL, CHECK)  
**Coverage**: Edge cases, normal cases, and boundary conditions

---

## 2. Test Data Generation Strategy

### 2.1 Data Generation Principles

1. **Realistic Scenarios**: Data should reflect actual IIT Gandhinagar campus operations
2. **Referential Integrity**: All foreign keys must reference existing parent records
3. **Constraint Compliance**: All data must satisfy CHECK, UNIQUE, and NOT NULL constraints
4. **Temporal Consistency**: Entry/Exit times must be logical and sequential
5. **Edge Cases**: Include NULL values, boundary conditions, and special scenarios

### 2.2 Data Volume Planning

| Table | Minimum Rows | Target Rows | Rationale |
|-------|--------------|------------|-----------|
| MemberType | 3 | 3 | Fixed set of types |
| VehicleType | 5 | 5 | Fixed set of types |
| Role | 3 | 3 | Fixed set of roles |
| Gate | 4 | 4 | Campus gates |
| Member | 15 | 20 | Diverse member base |
| Vehicle | 12 | 18 | Various vehicles |
| User | 5 | 8 | Guards and admins |
| GateOccupancy | 4 | 4 | One per gate |
| PersonVisit | 15 | 25 | Visit history |
| VehicleVisit | 12 | 20 | Vehicle visit history |

**Total Rows**: ~105 rows across all tables

---

## 3. Test Data Specifications

### 3.1 MemberType Data (3 rows)

```sql
INSERT INTO MemberType (TypeID, TypeName, CreatedAt) VALUES
(1, 'Resident', '2024-01-01 00:00:00'),
(2, 'Student', '2024-01-01 00:00:00'),
(3, 'Visitor', '2024-01-01 00:00:00');
```

**Coverage**: All predefined types

---

### 3.2 Member Data (20 rows)

**Strategy**: Mix of Residents, Students, and Visitors with realistic Indian names and contact info

```sql
-- Residents (Professors, Staff) - 7 rows
INSERT INTO Member (MemberID, Name, Email, ContactNumber, Image, Age, Department, TypeID, CreatedAt, UpdatedAt) VALUES
(1, 'Dr. Rajesh Kumar', 'rajesh.kumar@iitgn.ac.in', '+91-9876543210', NULL, 45, 'Computer Science', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2, 'Prof. Priya Sharma', 'priya.sharma@iitgn.ac.in', '+91-9876543211', NULL, 42, 'Electrical Engineering', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(3, 'Dr. Amit Patel', 'amit.patel@iitgn.ac.in', '+91-9876543212', NULL, 38, 'Mechanical Engineering', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(4, 'Prof. Sneha Reddy', 'sneha.reddy@iitgn.ac.in', '+91-9876543213', NULL, 50, 'Chemistry', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(5, 'Dr. Vikram Singh', 'vikram.singh@iitgn.ac.in', '+91-9876543214', NULL, 47, 'Physics', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(6, 'Prof. Anjali Desai', 'anjali.desai@iitgn.ac.in', '+91-9876543215', NULL, 41, 'Mathematics', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(7, 'Dr. Manoj Joshi', 'manoj.joshi@iitgn.ac.in', '+91-9876543216', NULL, 44, 'Civil Engineering', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00');

-- Students - 8 rows
INSERT INTO Member (MemberID, Name, Email, ContactNumber, Image, Age, Department, TypeID, CreatedAt, UpdatedAt) VALUES
(8, 'Arjun Mehta', 'arjun.mehta@iitgn.ac.in', '+91-9876543217', NULL, 20, 'Computer Science', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(9, 'Kavya Nair', 'kavya.nair@iitgn.ac.in', '+91-9876543218', NULL, 21, 'Electrical Engineering', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(10, 'Rohan Gupta', 'rohan.gupta@iitgn.ac.in', '+91-9876543219', NULL, 22, 'Mechanical Engineering', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(11, 'Divya Iyer', 'divya.iyer@iitgn.ac.in', '+91-9876543220', NULL, 19, 'Chemistry', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(12, 'Siddharth Rao', 'siddharth.rao@iitgn.ac.in', '+91-9876543221', NULL, 20, 'Physics', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(13, 'Ananya Krishnan', 'ananya.krishnan@iitgn.ac.in', '+91-9876543222', NULL, 21, 'Mathematics', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(14, 'Varun Menon', 'varun.menon@iitgn.ac.in', '+91-9876543223', NULL, 22, 'Civil Engineering', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(15, 'Isha Agarwal', 'isha.agarwal@iitgn.ac.in', '+91-9876543224', NULL, 20, 'Computer Science', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00');

-- Visitors - 5 rows
INSERT INTO Member (MemberID, Name, Email, ContactNumber, Image, Age, Department, TypeID, CreatedAt, UpdatedAt) VALUES
(16, 'Ramesh Kumar', 'ramesh.kumar@gmail.com', '+91-9876543225', NULL, 35, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(17, 'Sunita Devi', 'sunita.devi@gmail.com', '+91-9876543226', NULL, 28, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(18, 'Mohammed Ali', 'mohammed.ali@gmail.com', '+91-9876543227', NULL, 40, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(19, 'Geeta Sharma', 'geeta.sharma@gmail.com', '+91-9876543228', NULL, 32, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(20, 'Pradeep Nair', 'pradeep.nair@gmail.com', '+91-9876543229', NULL, 45, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00');
```

**Coverage**:
- ✅ All three MemberTypes represented
- ✅ Realistic Indian names and email formats
- ✅ Valid contact numbers
- ✅ Age range 19-50
- ✅ Department variations
- ✅ NULL values for Image and Department (visitors)

---

### 3.3 VehicleType Data (5 rows)

```sql
INSERT INTO VehicleType (TypeID, TypeName, CreatedAt) VALUES
(1, 'PrivateCar', '2024-01-01 00:00:00'),
(2, 'Taxi', '2024-01-01 00:00:00'),
(3, 'Bike', '2024-01-01 00:00:00'),
(4, 'Truck', '2024-01-01 00:00:00'),
(5, 'Bus', '2024-01-01 00:00:00');
```

**Coverage**: All predefined vehicle types

---

### 3.4 Vehicle Data (18 rows)

**Strategy**: Mix of owned vehicles and public vehicles (taxis) with realistic Indian license plates

```sql
-- Private Cars (owned by Members) - 10 rows
INSERT INTO Vehicle (VehicleID, LicensePlate, TypeID, OwnerID, CreatedAt, UpdatedAt) VALUES
(1, 'GJ-06-AB-1234', 1, 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Dr. Rajesh Kumar
(2, 'GJ-06-CD-5678', 1, 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Prof. Priya Sharma
(3, 'GJ-06-EF-9012', 1, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Dr. Amit Patel
(4, 'GJ-06-GH-3456', 1, 4, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Prof. Sneha Reddy
(5, 'GJ-06-IJ-7890', 1, 5, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Dr. Vikram Singh
(6, 'GJ-06-KL-2468', 1, 8, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Arjun Mehta
(7, 'GJ-06-MN-1357', 1, 9, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Kavya Nair
(8, 'GJ-06-OP-9753', 1, 10, '2024-01-15 10:00:00', '2024-01-15 10:00:00'), -- Rohan Gupta
(9, 'GJ-06-QR-8642', 1, 12, '2024-01-15 10:00:00', '2024-01-15 10:00:00'), -- Siddharth Rao
(10, 'GJ-06-ST-7531', 1, 14, '2024-01-15 10:00:00', '2024-01-15 10:00:00'); -- Varun Menon

-- Bikes (owned by Members) - 5 rows
INSERT INTO Vehicle (VehicleID, LicensePlate, TypeID, OwnerID, CreatedAt, UpdatedAt) VALUES
(11, 'GJ-06-UV-6420', 3, 11, '2024-01-15 10:00:00', '2024-01-15 10:00:00'), -- Divya Iyer
(12, 'GJ-06-WX-5319', 3, 13, '2024-01-15 10:00:00', '2024-01-15 10:00:00'), -- Ananya Krishnan
(13, 'GJ-06-YZ-4208', 3, 15, '2024-01-15 10:00:00', '2024-01-15 10:00:00'), -- Isha Agarwal
(14, 'GJ-06-AA-3197', 3, 6, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),  -- Prof. Anjali Desai
(15, 'GJ-06-BB-2086', 3, 7, '2024-01-15 10:00:00', '2024-01-15 10:00:00');  -- Dr. Manoj Joshi

-- Taxis (no owner - OwnerID NULL) - 3 rows
INSERT INTO Vehicle (VehicleID, LicensePlate, TypeID, OwnerID, CreatedAt, UpdatedAt) VALUES
(16, 'GJ-06-CC-1975', 2, NULL, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(17, 'GJ-06-DD-0864', 2, NULL, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(18, 'GJ-06-EE-9753', 2, NULL, '2024-01-15 10:00:00', '2024-01-15 10:00:00');
```

**Coverage**:
- ✅ Realistic Gujarat license plates (GJ-06 format)
- ✅ Mix of vehicle types
- ✅ NULL OwnerID for taxis (public vehicles)
- ✅ Valid OwnerID references to existing Members

---

### 3.5 Gate Data (4 rows)

```sql
INSERT INTO Gate (GateID, Name, Location, CreatedAt) VALUES
(1, 'Main Gate', 'North Entrance, Near Admin Block', '2024-01-01 00:00:00'),
(2, 'East Gate', 'East Entrance, Near Hostels', '2024-01-01 00:00:00'),
(3, 'West Gate', 'West Entrance, Near Academic Block', '2024-01-01 00:00:00'),
(4, 'South Gate', 'South Entrance, Near Sports Complex', '2024-01-01 00:00:00');
```

**Coverage**: Four campus gates with realistic locations

---

### 3.6 GateOccupancy Data (4 rows)

```sql
INSERT INTO GateOccupancy (GateID, OccupancyCount, UpdatedAt) VALUES
(1, 5, '2024-01-20 14:30:00'),  -- Main Gate
(2, 3, '2024-01-20 14:30:00'),  -- East Gate
(3, 8, '2024-01-20 14:30:00'),  -- West Gate
(4, 2, '2024-01-20 14:30:00');  -- South Gate
```

**Coverage**: One record per gate with realistic occupancy counts

---

### 3.7 Role Data (3 rows)

```sql
INSERT INTO Role (RoleID, RoleName, CreatedAt) VALUES
(1, 'Guard', '2024-01-01 00:00:00'),
(2, 'Admin', '2024-01-01 00:00:00'),
(3, 'SuperAdmin', '2024-01-01 00:00:00');
```

**Coverage**: All predefined roles

---

### 3.8 User Data (8 rows)

```sql
INSERT INTO User (UserID, Username, PasswordHash, RoleID, CreatedAt, UpdatedAt) VALUES
(1, 'guard1', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(2, 'guard2', 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(3, 'guard3', 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(4, 'guard4', 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(5, 'admin1', 'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', 2, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(6, 'admin2', 'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1', 2, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(7, 'superadmin', 'g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2', 3, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(8, 'guard5', 'h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00');
```

**Coverage**:
- ✅ Multiple guards (RoleID = 1)
- ✅ Multiple admins (RoleID = 2)
- ✅ One superadmin (RoleID = 3)
- ✅ Unique usernames
- ✅ PasswordHash length >= 32 characters

---

### 3.9 PersonVisit Data (25 rows)

**Strategy**: Mix of completed visits (with exit) and active visits (no exit), various gates, with/without vehicles

```sql
-- Completed visits (with exit) - 15 rows
INSERT INTO PersonVisit (VisitID, PersonID, EntryGateID, EntryTime, ExitGateID, ExitTime, VehicleID, CreatedAt, UpdatedAt) VALUES
-- Same gate entry/exit
(1, 8, 1, '2024-01-16 08:00:00', 1, '2024-01-16 18:00:00', 6, '2024-01-16 08:00:00', '2024-01-16 18:00:00'),  -- Arjun, Main Gate, with car
(2, 9, 2, '2024-01-16 08:30:00', 2, '2024-01-16 17:30:00', 7, '2024-01-16 08:30:00', '2024-01-16 17:30:00'),  -- Kavya, East Gate, with car
(3, 10, 3, '2024-01-16 09:00:00', 3, '2024-01-16 17:00:00', 8, '2024-01-16 09:00:00', '2024-01-16 17:00:00'), -- Rohan, West Gate, with car
(4, 11, 2, '2024-01-16 09:15:00', 2, '2024-01-16 16:45:00', 11, '2024-01-16 09:15:00', '2024-01-16 16:45:00'), -- Divya, East Gate, with bike
(5, 12, 1, '2024-01-16 09:30:00', 1, '2024-01-16 18:30:00', 9, '2024-01-16 09:30:00', '2024-01-16 18:30:00'), -- Siddharth, Main Gate, with car

-- Different gate entry/exit (multi-gate)
(6, 1, 1, '2024-01-17 07:30:00', 3, '2024-01-17 19:00:00', 1, '2024-01-17 07:30:00', '2024-01-17 19:00:00'),  -- Dr. Rajesh, Main→West, with car
(7, 2, 2, '2024-01-17 08:00:00', 4, '2024-01-17 18:30:00', 2, '2024-01-17 08:00:00', '2024-01-17 18:30:00'),  -- Prof. Priya, East→South, with car
(8, 3, 3, '2024-01-17 08:15:00', 1, '2024-01-17 19:15:00', 3, '2024-01-17 08:15:00', '2024-01-17 19:15:00'), -- Dr. Amit, West→Main, with car

-- Without vehicle (on foot)
(9, 13, 1, '2024-01-17 10:00:00', 1, '2024-01-17 16:00:00', NULL, '2024-01-17 10:00:00', '2024-01-17 16:00:00'), -- Ananya, Main Gate, on foot
(10, 14, 2, '2024-01-17 10:30:00', 2, '2024-01-17 15:30:00', NULL, '2024-01-17 10:30:00', '2024-01-17 15:30:00'), -- Varun, East Gate, on foot
(11, 15, 3, '2024-01-17 11:00:00', 3, '2024-01-17 17:00:00', NULL, '2024-01-17 11:00:00', '2024-01-17 17:00:00'), -- Isha, West Gate, on foot

-- Visitors
(12, 16, 1, '2024-01-18 14:00:00', 1, '2024-01-18 16:00:00', NULL, '2024-01-18 14:00:00', '2024-01-18 16:00:00'), -- Ramesh, Main Gate, visitor
(13, 17, 2, '2024-01-18 14:30:00', 2, '2024-01-18 17:00:00', 16, '2024-01-18 14:30:00', '2024-01-18 17:00:00'), -- Sunita, East Gate, taxi
(14, 18, 3, '2024-01-18 15:00:00', 3, '2024-01-18 18:00:00', NULL, '2024-01-18 15:00:00', '2024-01-18 18:00:00'), -- Mohammed, West Gate, visitor
(15, 19, 4, '2024-01-18 15:30:00', 4, '2024-01-18 17:30:00', 17, '2024-01-18 15:30:00', '2024-01-18 17:30:00'); -- Geeta, South Gate, taxi

-- Active visits (no exit yet) - 10 rows
INSERT INTO PersonVisit (VisitID, PersonID, EntryGateID, EntryTime, ExitGateID, ExitTime, VehicleID, CreatedAt, UpdatedAt) VALUES
(16, 4, 1, '2024-01-20 08:00:00', NULL, NULL, 4, '2024-01-20 08:00:00', NULL),  -- Prof. Sneha, Main Gate, with car, still inside
(17, 5, 2, '2024-01-20 08:30:00', NULL, NULL, 5, '2024-01-20 08:30:00', NULL),  -- Dr. Vikram, East Gate, with car, still inside
(18, 6, 3, '2024-01-20 09:00:00', NULL, NULL, 14, '2024-01-20 09:00:00', NULL), -- Prof. Anjali, West Gate, with bike, still inside
(19, 7, 4, '2024-01-20 09:15:00', NULL, NULL, 15, '2024-01-20 09:15:00', NULL), -- Dr. Manoj, South Gate, with bike, still inside
(20, 8, 1, '2024-01-20 10:00:00', NULL, NULL, NULL, '2024-01-20 10:00:00', NULL), -- Arjun, Main Gate, on foot, still inside
(21, 9, 2, '2024-01-20 10:30:00', NULL, NULL, NULL, '2024-01-20 10:30:00', NULL), -- Kavya, East Gate, on foot, still inside
(22, 10, 3, '2024-01-20 11:00:00', NULL, NULL, NULL, '2024-01-20 11:00:00', NULL), -- Rohan, West Gate, on foot, still inside
(23, 11, 4, '2024-01-20 11:30:00', NULL, NULL, NULL, '2024-01-20 11:30:00', NULL), -- Divya, South Gate, on foot, still inside
(24, 20, 1, '2024-01-20 12:00:00', NULL, NULL, 18, '2024-01-20 12:00:00', NULL), -- Pradeep, Main Gate, taxi, still inside
(25, 16, 2, '2024-01-20 13:00:00', NULL, NULL, NULL, '2024-01-20 13:00:00', NULL); -- Ramesh, East Gate, visitor, still inside
```

**Coverage**:
- ✅ Completed visits (ExitTime set, ExitGateID set)
- ✅ Active visits (ExitTime NULL, ExitGateID NULL)
- ✅ Same gate entry/exit
- ✅ Different gate entry/exit (multi-gate)
- ✅ With vehicle (VehicleID set)
- ✅ Without vehicle (VehicleID NULL)
- ✅ All member types (Residents, Students, Visitors)
- ✅ All gates represented
- ✅ Temporal consistency (ExitTime >= EntryTime)

---

### 3.10 VehicleVisit Data (20 rows)

**Strategy**: Mix of completed and active visits, various vehicle types

```sql
-- Completed visits - 12 rows
INSERT INTO VehicleVisit (VisitID, VehicleID, EntryGateID, EntryTime, ExitGateID, ExitTime, CreatedAt, UpdatedAt) VALUES
-- Private cars
(1, 1, 1, '2024-01-17 07:30:00', 3, '2024-01-17 19:00:00', '2024-01-17 07:30:00', '2024-01-17 19:00:00'),  -- Dr. Rajesh's car, Main→West
(2, 2, 2, '2024-01-17 08:00:00', 4, '2024-01-17 18:30:00', '2024-01-17 08:00:00', '2024-01-17 18:30:00'),  -- Prof. Priya's car, East→South
(3, 3, 3, '2024-01-17 08:15:00', 1, '2024-01-17 19:15:00', '2024-01-17 08:15:00', '2024-01-17 19:15:00'), -- Dr. Amit's car, West→Main
(4, 6, 1, '2024-01-16 08:00:00', 1, '2024-01-16 18:00:00', '2024-01-16 08:00:00', '2024-01-16 18:00:00'),  -- Arjun's car, Main Gate
(5, 7, 2, '2024-01-16 08:30:00', 2, '2024-01-16 17:30:00', '2024-01-16 08:30:00', '2024-01-16 17:30:00'),  -- Kavya's car, East Gate
(6, 8, 3, '2024-01-16 09:00:00', 3, '2024-01-16 17:00:00', '2024-01-16 09:00:00', '2024-01-16 17:00:00'), -- Rohan's car, West Gate

-- Bikes
(7, 11, 2, '2024-01-16 09:15:00', 2, '2024-01-16 16:45:00', '2024-01-16 09:15:00', '2024-01-16 16:45:00'), -- Divya's bike, East Gate
(8, 12, 1, '2024-01-17 10:00:00', 1, '2024-01-17 16:00:00', '2024-01-17 10:00:00', '2024-01-17 16:00:00'), -- Ananya's bike, Main Gate
(9, 13, 3, '2024-01-17 11:00:00', 3, '2024-01-17 17:00:00', '2024-01-17 11:00:00', '2024-01-17 17:00:00'), -- Isha's bike, West Gate

-- Taxis
(10, 16, 2, '2024-01-18 14:30:00', 2, '2024-01-18 17:00:00', '2024-01-18 14:30:00', '2024-01-18 17:00:00'), -- Taxi, East Gate
(11, 17, 4, '2024-01-18 15:30:00', 4, '2024-01-18 17:30:00', '2024-01-18 15:30:00', '2024-01-18 17:30:00'), -- Taxi, South Gate
(12, 18, 1, '2024-01-19 10:00:00', 1, '2024-01-19 12:00:00', '2024-01-19 10:00:00', '2024-01-19 12:00:00'); -- Taxi, Main Gate

-- Active visits (no exit yet) - 8 rows
INSERT INTO VehicleVisit (VisitID, VehicleID, EntryGateID, EntryTime, ExitGateID, ExitTime, CreatedAt, UpdatedAt) VALUES
(13, 4, 1, '2024-01-20 08:00:00', NULL, NULL, '2024-01-20 08:00:00', NULL),  -- Prof. Sneha's car, Main Gate, still inside
(14, 5, 2, '2024-01-20 08:30:00', NULL, NULL, '2024-01-20 08:30:00', NULL),  -- Dr. Vikram's car, East Gate, still inside
(15, 9, 1, '2024-01-20 09:00:00', NULL, NULL, '2024-01-20 09:00:00', NULL),  -- Siddharth's car, Main Gate, still inside
(16, 10, 3, '2024-01-20 09:15:00', NULL, NULL, '2024-01-20 09:15:00', NULL), -- Varun's car, West Gate, still inside
(17, 14, 3, '2024-01-20 09:00:00', NULL, NULL, '2024-01-20 09:00:00', NULL), -- Prof. Anjali's bike, West Gate, still inside
(18, 15, 4, '2024-01-20 09:15:00', NULL, NULL, '2024-01-20 09:15:00', NULL), -- Dr. Manoj's bike, South Gate, still inside
(19, 16, 1, '2024-01-20 12:00:00', NULL, NULL, '2024-01-20 12:00:00', NULL), -- Taxi, Main Gate, still inside
(20, 17, 2, '2024-01-20 13:00:00', NULL, NULL, '2024-01-20 13:00:00', NULL); -- Taxi, East Gate, still inside
```

**Coverage**:
- ✅ Completed visits (ExitTime set)
- ✅ Active visits (ExitTime NULL)
- ✅ All vehicle types (PrivateCar, Bike, Taxi)
- ✅ Same gate entry/exit
- ✅ Different gate entry/exit
- ✅ Temporal consistency

---

## 4. Integrity Validation Tests

### 4.1 Primary Key Constraint Tests

```sql
-- Test: Duplicate PK insertion should fail
INSERT INTO Member (MemberID, Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt) 
VALUES (1, 'Test', 'test@test.com', '+91-9999999999', 1, NOW(), NOW());
-- Expected: ERROR - duplicate key value violates unique constraint

-- Test: NULL PK insertion should fail
INSERT INTO Member (MemberID, Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt) 
VALUES (NULL, 'Test', 'test@test.com', '+91-9999999999', 1, NOW(), NOW());
-- Expected: ERROR - null value in column "memberid" violates not-null constraint
```

---

### 4.2 Foreign Key Constraint Tests

```sql
-- Test: Invalid FK reference should fail
INSERT INTO Member (Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt) 
VALUES ('Test', 'test@test.com', '+91-9999999999', 999, NOW(), NOW());
-- Expected: ERROR - foreign key constraint violation (TypeID 999 doesn't exist)

-- Test: ON DELETE RESTRICT - Cannot delete parent with children
DELETE FROM MemberType WHERE TypeID = 1;
-- Expected: ERROR - update or delete on table "membertype" violates foreign key constraint

-- Test: ON DELETE SET NULL - Child FK set to NULL when parent deleted
DELETE FROM Member WHERE MemberID = 1;  -- Delete owner
SELECT OwnerID FROM Vehicle WHERE VehicleID = 1;
-- Expected: OwnerID should be NULL for vehicles owned by deleted member

-- Test: ON DELETE CASCADE - Child records deleted when parent deleted
DELETE FROM Gate WHERE GateID = 1;
SELECT * FROM GateOccupancy WHERE GateID = 1;
-- Expected: GateOccupancy record for GateID 1 should be deleted
```

---

### 4.3 UNIQUE Constraint Tests

```sql
-- Test: Duplicate Email should fail
INSERT INTO Member (Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt) 
VALUES ('Test', 'rajesh.kumar@iitgn.ac.in', '+91-9999999999', 1, NOW(), NOW());
-- Expected: ERROR - duplicate key value violates unique constraint "member_email_key"

-- Test: Duplicate LicensePlate should fail
INSERT INTO Vehicle (LicensePlate, TypeID, CreatedAt, UpdatedAt) 
VALUES ('GJ-06-AB-1234', 1, NOW(), NOW());
-- Expected: ERROR - duplicate key value violates unique constraint "vehicle_licenseplate_key"

-- Test: Duplicate Username should fail
INSERT INTO User (Username, PasswordHash, RoleID, CreatedAt, UpdatedAt) 
VALUES ('guard1', 'hash123456789012345678901234567890', 1, NOW(), NOW());
-- Expected: ERROR - duplicate key value violates unique constraint "user_username_key"
```

---

### 4.4 NOT NULL Constraint Tests

```sql
-- Test: NULL in NOT NULL column should fail
INSERT INTO Member (Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt) 
VALUES (NULL, 'test@test.com', '+91-9999999999', 1, NOW(), NOW());
-- Expected: ERROR - null value in column "name" violates not-null constraint

-- Test: NULL in NOT NULL FK should fail
INSERT INTO PersonVisit (PersonID, EntryGateID, EntryTime, CreatedAt) 
VALUES (NULL, 1, NOW(), NOW());
-- Expected: ERROR - null value in column "personid" violates not-null constraint
```

---

### 4.5 CHECK Constraint Tests

```sql
-- Test: ExitTime < EntryTime should fail
INSERT INTO PersonVisit (PersonID, EntryGateID, EntryTime, ExitGateID, ExitTime, CreatedAt) 
VALUES (1, 1, '2024-01-20 10:00:00', 1, '2024-01-20 09:00:00', NOW());
-- Expected: ERROR - new row violates check constraint "chk_exittime_after_entrytime"

-- Test: Negative OccupancyCount should fail
UPDATE GateOccupancy SET OccupancyCount = -1 WHERE GateID = 1;
-- Expected: ERROR - new row violates check constraint "chk_occupancy_count"

-- Test: Invalid MemberType should fail
INSERT INTO MemberType (TypeName, CreatedAt) VALUES ('InvalidType', NOW());
-- Expected: ERROR - new row violates check constraint "chk_membertype_name"

-- Test: Invalid Email format should fail
INSERT INTO Member (Name, Email, ContactNumber, TypeID, CreatedAt, UpdatedAt) 
VALUES ('Test', 'invalid-email', '+91-9999999999', 1, NOW(), NOW());
-- Expected: ERROR - new row violates check constraint "chk_member_email"
```

---

### 4.6 Logical Constraint Tests

```sql
-- Test: ExitGateID set but ExitTime NULL should fail
INSERT INTO PersonVisit (PersonID, EntryGateID, EntryTime, ExitGateID, ExitTime, CreatedAt) 
VALUES (1, 1, '2024-01-20 10:00:00', 2, NULL, NOW());
-- Expected: ERROR - new row violates check constraint "chk_exitgate_if_exittime"

-- Test: ExitTime set but ExitGateID NULL should fail
INSERT INTO PersonVisit (PersonID, EntryGateID, EntryTime, ExitGateID, ExitTime, CreatedAt) 
VALUES (1, 1, '2024-01-20 10:00:00', NULL, '2024-01-20 18:00:00', NOW());
-- Expected: ERROR - new row violates check constraint "chk_exitgate_if_exittime"
```

---

## 5. Update/Delete Cascade Testing

### 5.1 ON UPDATE CASCADE Tests

```sql
-- Test: Update parent PK, child FK should update
UPDATE MemberType SET TypeID = 10 WHERE TypeID = 1;
SELECT TypeID FROM Member WHERE TypeID = 10;
-- Expected: All Member records with TypeID=1 should now have TypeID=10

-- Test: Update Gate PK, GateOccupancy FK should update
UPDATE Gate SET GateID = 10 WHERE GateID = 1;
SELECT GateID FROM GateOccupancy WHERE GateID = 10;
-- Expected: GateOccupancy record should have GateID=10
```

### 5.2 ON DELETE RESTRICT Tests

```sql
-- Test: Cannot delete MemberType with Members
DELETE FROM MemberType WHERE TypeID = 1;
-- Expected: ERROR - foreign key constraint violation

-- Test: Cannot delete Member with PersonVisits
DELETE FROM Member WHERE MemberID = 8;
-- Expected: ERROR - foreign key constraint violation

-- Test: Cannot delete Vehicle with VehicleVisits
DELETE FROM Vehicle WHERE VehicleID = 1;
-- Expected: ERROR - foreign key constraint violation
```

### 5.3 ON DELETE SET NULL Tests

```sql
-- Test: Delete Member, Vehicle.OwnerID should be NULL
DELETE FROM Member WHERE MemberID = 1;
SELECT OwnerID FROM Vehicle WHERE VehicleID = 1;
-- Expected: OwnerID should be NULL

-- Test: Delete Vehicle, PersonVisit.VehicleID should be NULL
DELETE FROM Vehicle WHERE VehicleID = 6;
SELECT VehicleID FROM PersonVisit WHERE VisitID = 1;
-- Expected: VehicleID should be NULL
```

### 5.4 ON DELETE CASCADE Tests

```sql
-- Test: Delete Gate, GateOccupancy should be deleted
DELETE FROM Gate WHERE GateID = 1;
SELECT * FROM GateOccupancy WHERE GateID = 1;
-- Expected: No rows returned (record deleted)
```

---

## 6. Data Validation Queries

### 6.1 Referential Integrity Validation

```sql
-- Find orphaned PersonVisit records (PersonID doesn't exist)
SELECT pv.VisitID, pv.PersonID 
FROM PersonVisit pv 
LEFT JOIN Member m ON pv.PersonID = m.MemberID 
WHERE m.MemberID IS NULL;
-- Expected: 0 rows

-- Find orphaned VehicleVisit records (VehicleID doesn't exist)
SELECT vv.VisitID, vv.VehicleID 
FROM VehicleVisit vv 
LEFT JOIN Vehicle v ON vv.VehicleID = v.VehicleID 
WHERE v.VehicleID IS NULL;
-- Expected: 0 rows

-- Find vehicles with invalid OwnerID
SELECT v.VehicleID, v.OwnerID 
FROM Vehicle v 
LEFT JOIN Member m ON v.OwnerID = m.MemberID 
WHERE v.OwnerID IS NOT NULL AND m.MemberID IS NULL;
-- Expected: 0 rows
```

### 6.2 Temporal Consistency Validation

```sql
-- Find PersonVisits with ExitTime < EntryTime
SELECT VisitID, PersonID, EntryTime, ExitTime 
FROM PersonVisit 
WHERE ExitTime IS NOT NULL AND ExitTime < EntryTime;
-- Expected: 0 rows

-- Find VehicleVisits with ExitTime < EntryTime
SELECT VisitID, VehicleID, EntryTime, ExitTime 
FROM VehicleVisit 
WHERE ExitTime IS NOT NULL AND ExitTime < EntryTime;
-- Expected: 0 rows
```

### 6.3 Constraint Compliance Validation

```sql
-- Find Members with invalid Email format
SELECT MemberID, Email 
FROM Member 
WHERE Email NOT LIKE '%@%.%';
-- Expected: 0 rows

-- Find GateOccupancy with negative count
SELECT GateID, OccupancyCount 
FROM GateOccupancy 
WHERE OccupancyCount < 0;
-- Expected: 0 rows

-- Find PersonVisits with ExitTime but no ExitGateID
SELECT VisitID, ExitTime, ExitGateID 
FROM PersonVisit 
WHERE ExitTime IS NOT NULL AND ExitGateID IS NULL;
-- Expected: 0 rows
```

---

## 7. Test Data Coverage Matrix

| Test Scenario | Tables Affected | Test Cases | Status |
|---------------|-----------------|------------|--------|
| Normal Entry/Exit | PersonVisit, VehicleVisit, GateOccupancy | 15 completed visits | ✅ |
| Active Visits | PersonVisit, VehicleVisit | 18 active visits | ✅ |
| Multi-gate Entry/Exit | PersonVisit, VehicleVisit | 3 different gate scenarios | ✅ |
| With Vehicle | PersonVisit, VehicleVisit | 20+ visits with vehicles | ✅ |
| Without Vehicle | PersonVisit | 5 visits on foot | ✅ |
| Public Vehicles (Taxis) | Vehicle, PersonVisit, VehicleVisit | 3 taxis, 5+ visits | ✅ |
| All Member Types | Member, PersonVisit | Residents, Students, Visitors | ✅ |
| All Vehicle Types | Vehicle, VehicleVisit | PrivateCar, Bike, Taxi | ✅ |
| All Gates | Gate, PersonVisit, VehicleVisit | All 4 gates used | ✅ |
| NULL Values | All tables | Image, Age, Department, OwnerID, VehicleID | ✅ |

---

## 8. Data Generation Script Structure

### 8.1 Insertion Order

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

### 8.2 Transaction Management

```sql
BEGIN;

-- Insert all data
INSERT INTO MemberType ...;
INSERT INTO VehicleType ...;
-- ... (all inserts)

-- Validate constraints
-- Run validation queries

COMMIT;
-- Or ROLLBACK if validation fails
```

---

## 9. Gemini Prompts for Test Data Generation

### 9.1 Realistic Test Data Generation Prompt

```
Generate comprehensive test data for the GateGuard Entry Gate Management System database with the following requirements:

CONTEXT:
- System: GateGuard for IIT Gandhinagar Campus
- Database: PostgreSQL
- Requirement: 10-20 rows per table with realistic, meaningful data

TABLES AND ROW COUNTS:
1. MemberType: 3 rows (Resident, Student, Visitor)
2. VehicleType: 5 rows (PrivateCar, Taxi, Bike, Truck, Bus)
3. Role: 3 rows (Guard, Admin, SuperAdmin)
4. Gate: 4 rows (Main Gate, East Gate, West Gate, South Gate)
5. Member: 20 rows (mix of Residents, Students, Visitors)
6. Vehicle: 18 rows (mix of owned and public vehicles)
7. User: 8 rows (guards and admins)
8. GateOccupancy: 4 rows (one per gate)
9. PersonVisit: 25 rows (mix of completed and active visits)
10. VehicleVisit: 20 rows (mix of completed and active visits)

DATA REQUIREMENTS:

MEMBER DATA (20 rows):
- 7 Residents: Professors/staff with @iitgn.ac.in emails, ages 35-50, various departments
- 8 Students: Students with @iitgn.ac.in emails, ages 19-22, various departments
- 5 Visitors: External people with @gmail.com emails, ages 25-45, NULL department
- Indian names (first and last names)
- Contact numbers: +91-XXXXXXXXXX format
- Image: NULL for all (or realistic paths)
- Realistic CreatedAt timestamps

VEHICLE DATA (18 rows):
- 10 Private Cars: Owned by Members, Gujarat license plates (GJ-06-XX-#### format)
- 5 Bikes: Owned by Members, Gujarat license plates
- 3 Taxis: OwnerID = NULL, Gujarat license plates
- Realistic CreatedAt timestamps

PERSONVISIT DATA (25 rows):
- 15 Completed visits: ExitTime set, ExitGateID set, ExitTime >= EntryTime
- 10 Active visits: ExitTime NULL, ExitGateID NULL
- Mix of same gate entry/exit and different gate entry/exit
- Mix of with vehicle (VehicleID set) and without vehicle (VehicleID NULL)
- All gates represented
- All member types represented
- Realistic timestamps (recent dates, logical entry/exit times)

VEHICLEVISIT DATA (20 rows):
- 12 Completed visits: ExitTime set, ExitTime >= EntryTime
- 8 Active visits: ExitTime NULL
- All vehicle types represented
- All gates represented
- Realistic timestamps

CONSTRAINTS TO RESPECT:
- All foreign keys must reference existing records
- Email must be unique and valid format
- LicensePlate must be unique
- Username must be unique
- ExitTime >= EntryTime for all completed visits
- OccupancyCount >= 0
- All NOT NULL columns must have values
- CHECK constraints must be satisfied

OUTPUT FORMAT:
Generate SQL INSERT statements in the correct order (respecting foreign key dependencies).
Include comments explaining each data set.
Ensure all data is realistic and reflects actual campus operations.

Generate complete, ready-to-execute SQL INSERT statements.
```

### 9.2 Integrity Validation Query Prompt

```
Generate comprehensive SQL validation queries for the GateGuard database to verify all constraints and data integrity.

VALIDATION AREAS:

1. PRIMARY KEY CONSTRAINTS:
   - Verify no duplicate PKs
   - Verify no NULL PKs

2. FOREIGN KEY CONSTRAINTS:
   - Find orphaned records (FK references non-existent parent)
   - Verify ON DELETE RESTRICT works
   - Verify ON DELETE SET NULL works
   - Verify ON DELETE CASCADE works
   - Verify ON UPDATE CASCADE works

3. UNIQUE CONSTRAINTS:
   - Verify Email uniqueness
   - Verify LicensePlate uniqueness
   - Verify Username uniqueness
   - Verify TypeName uniqueness

4. NOT NULL CONSTRAINTS:
   - Verify all NOT NULL columns have values
   - Test NULL insertion attempts

5. CHECK CONSTRAINTS:
   - Verify ExitTime >= EntryTime
   - Verify OccupancyCount >= 0
   - Verify Email format
   - Verify TypeName values
   - Verify Age range (if applicable)

6. LOGICAL CONSTRAINTS:
   - Verify ExitGateID set if ExitTime set
   - Verify temporal consistency
   - Verify referential integrity

OUTPUT REQUIREMENTS:
- Generate SELECT queries to find violations
- Generate INSERT/UPDATE/DELETE queries to test constraints
- Include expected results for each query
- Organize by constraint type
- Include comments explaining each test

Generate comprehensive validation queries with expected results.
```

---

## 10. Next Steps

1. **Proceed to Summary Report** (`5_Assignment1_Summary_Report.md`)
2. **Execute test data** insertion scripts
3. **Run validation queries** to verify integrity
4. **Document any issues** and resolutions

---

**Document Version**: 1.0  
**Last Updated**: Assignment-1 Planning Phase  
**Status**: Test Data Strategy Planned ✅

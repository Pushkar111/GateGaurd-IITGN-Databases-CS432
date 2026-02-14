-- =============================================================================
-- GateGuard Assignment-1 | Module A | SQL Dump
-- =============================================================================
-- Project: GateGuard Entry Gate Management System (IIT Gandhinagar)
-- Course: CS432 Track-1 Assignment-1
-- Contents: Schema (10 tables, constraints, indexes) + Sample Data
-- Database: PostgreSQL
-- =============================================================================
-- INSTRUCTIONS:
-- 1. Create an empty database: CREATE DATABASE gateguard;
-- 2. Run this entire file in pgAdmin Query Tool (or: psql -d gateguard -f gateguard_module_a_dump.sql)
-- 3. Re-running drops existing tables and recreates everything (idempotent).
-- =============================================================================


-- ############################################################################
-- PART 1: SCHEMA (DROP + CREATE TABLES + INDEXES)
-- ############################################################################

-- Drop existing objects (order respects FK dependencies)
DROP TABLE IF EXISTS VehicleVisit;
DROP TABLE IF EXISTS PersonVisit;
DROP TABLE IF EXISTS GateOccupancy;
DROP TABLE IF EXISTS "User";
DROP TABLE IF EXISTS Vehicle;
DROP TABLE IF EXISTS Member;
DROP TABLE IF EXISTS Gate;
DROP TABLE IF EXISTS Role;
DROP TABLE IF EXISTS VehicleType;
DROP TABLE IF EXISTS MemberType;

-- 1. MemberType
CREATE TABLE MemberType (
    TypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_membertype_name CHECK (TypeName IN ('Resident', 'Student', 'Visitor'))
);
CREATE INDEX idx_membertype_name ON MemberType(TypeName);

-- 2. Member
CREATE TABLE Member (
    MemberID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL UNIQUE,
    ContactNumber VARCHAR(20) NOT NULL,
    Image BYTEA,
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
    CONSTRAINT chk_member_age CHECK (Age IS NULL OR (Age > 0 AND Age < 150))
);
CREATE INDEX idx_member_type ON Member(TypeID);
CREATE INDEX idx_member_email ON Member(Email);
CREATE INDEX idx_member_name ON Member(Name);

-- 3. VehicleType
CREATE TABLE VehicleType (
    TypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vehicletype_name CHECK (TypeName IN ('PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus'))
);
CREATE INDEX idx_vehicletype_name ON VehicleType(TypeName);

-- 4. Vehicle
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
CREATE INDEX idx_vehicle_type ON Vehicle(TypeID);
CREATE INDEX idx_vehicle_owner ON Vehicle(OwnerID);
CREATE UNIQUE INDEX idx_vehicle_licenseplate ON Vehicle(LicensePlate);

-- 5. Gate
CREATE TABLE Gate (
    GateID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Location VARCHAR(255) NOT NULL,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_gate_name CHECK (LENGTH(Name) > 0)
);
CREATE INDEX idx_gate_name ON Gate(Name);
CREATE INDEX idx_gate_location ON Gate(Location);

-- 6. GateOccupancy
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
CREATE INDEX idx_occupancy_count ON GateOccupancy(OccupancyCount);

-- 7. Role
CREATE TABLE Role (
    RoleID SERIAL PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_role_name CHECK (RoleName IN ('Guard', 'Admin', 'SuperAdmin'))
);
CREATE INDEX idx_role_name ON Role(RoleName);

-- 8. User (reserved word in PostgreSQL)
CREATE TABLE "User" (
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
CREATE INDEX idx_user_role ON "User"(RoleID);
CREATE UNIQUE INDEX idx_user_username ON "User"(Username);

-- 9. PersonVisit
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
CREATE INDEX idx_personvisit_person ON PersonVisit(PersonID);
CREATE INDEX idx_personvisit_entrygate ON PersonVisit(EntryGateID);
CREATE INDEX idx_personvisit_exitgate ON PersonVisit(ExitGateID);
CREATE INDEX idx_personvisit_vehicle ON PersonVisit(VehicleID);
CREATE INDEX idx_personvisit_entrytime ON PersonVisit(EntryTime);
CREATE INDEX idx_personvisit_exittime ON PersonVisit(ExitTime);
CREATE INDEX idx_personvisit_active ON PersonVisit(PersonID, ExitTime) WHERE ExitTime IS NULL;

-- 10. VehicleVisit
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
CREATE INDEX idx_vehiclevisit_vehicle ON VehicleVisit(VehicleID);
CREATE INDEX idx_vehiclevisit_entrygate ON VehicleVisit(EntryGateID);
CREATE INDEX idx_vehiclevisit_exitgate ON VehicleVisit(ExitGateID);
CREATE INDEX idx_vehiclevisit_entrytime ON VehicleVisit(EntryTime);
CREATE INDEX idx_vehiclevisit_exittime ON VehicleVisit(ExitTime);
CREATE INDEX idx_vehiclevisit_active ON VehicleVisit(VehicleID, ExitTime) WHERE ExitTime IS NULL;


-- ############################################################################
-- PART 2: SAMPLE DATA (INSERT + SEQUENCE RESET)
-- ############################################################################

BEGIN;

INSERT INTO membertype (typeid, typename, createdat) VALUES
(1, 'Resident', '2024-01-01 00:00:00'),
(2, 'Student', '2024-01-01 00:00:00'),
(3, 'Visitor', '2024-01-01 00:00:00');

INSERT INTO vehicletype (typeid, typename, createdat) VALUES
(1, 'PrivateCar', '2024-01-01 00:00:00'),
(2, 'Taxi', '2024-01-01 00:00:00'),
(3, 'Bike', '2024-01-01 00:00:00'),
(4, 'Truck', '2024-01-01 00:00:00'),
(5, 'Bus', '2024-01-01 00:00:00');

INSERT INTO role (roleid, rolename, createdat) VALUES
(1, 'Guard', '2024-01-01 00:00:00'),
(2, 'Admin', '2024-01-01 00:00:00'),
(3, 'SuperAdmin', '2024-01-01 00:00:00');

INSERT INTO gate (gateid, name, location, createdat) VALUES
(1, 'Main Gate', 'North Entrance, Near Admin Block', '2024-01-01 00:00:00'),
(2, 'East Gate', 'East Entrance, Near Hostels', '2024-01-01 00:00:00'),
(3, 'West Gate', 'West Entrance, Near Academic Block', '2024-01-01 00:00:00'),
(4, 'South Gate', 'South Entrance, Near Sports Complex', '2024-01-01 00:00:00');

INSERT INTO member (memberid, name, email, contactnumber, image, age, department, typeid, createdat, updatedat) VALUES
(1, 'Dr. Rajesh Kumar', 'rajesh.kumar@iitgn.ac.in', '+91-9876543210', NULL, 45, 'Computer Science', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2, 'Prof. Priya Sharma', 'priya.sharma@iitgn.ac.in', '+91-9876543211', NULL, 42, 'Electrical Engineering', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(3, 'Dr. Amit Patel', 'amit.patel@iitgn.ac.in', '+91-9876543212', NULL, 38, 'Mechanical Engineering', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(4, 'Prof. Sneha Reddy', 'sneha.reddy@iitgn.ac.in', '+91-9876543213', NULL, 50, 'Chemistry', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(5, 'Dr. Vikram Singh', 'vikram.singh@iitgn.ac.in', '+91-9876543214', NULL, 47, 'Physics', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(6, 'Prof. Anjali Desai', 'anjali.desai@iitgn.ac.in', '+91-9876543215', NULL, 41, 'Mathematics', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(7, 'Dr. Manoj Joshi', 'manoj.joshi@iitgn.ac.in', '+91-9876543216', NULL, 44, 'Civil Engineering', 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(8, 'Arjun Mehta', 'arjun.mehta@iitgn.ac.in', '+91-9876543217', NULL, 20, 'Computer Science', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(9, 'Kavya Nair', 'kavya.nair@iitgn.ac.in', '+91-9876543218', NULL, 21, 'Electrical Engineering', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(10, 'Rohan Gupta', 'rohan.gupta@iitgn.ac.in', '+91-9876543219', NULL, 22, 'Mechanical Engineering', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(11, 'Divya Iyer', 'divya.iyer@iitgn.ac.in', '+91-9876543220', NULL, 19, 'Chemistry', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(12, 'Siddharth Rao', 'siddharth.rao@iitgn.ac.in', '+91-9876543221', NULL, 20, 'Physics', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(13, 'Ananya Krishnan', 'ananya.krishnan@iitgn.ac.in', '+91-9876543222', NULL, 21, 'Mathematics', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(14, 'Varun Menon', 'varun.menon@iitgn.ac.in', '+91-9876543223', NULL, 22, 'Civil Engineering', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(15, 'Isha Agarwal', 'isha.agarwal@iitgn.ac.in', '+91-9876543224', NULL, 20, 'Computer Science', 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(16, 'Ramesh Kumar', 'ramesh.kumar@gmail.com', '+91-9876543225', NULL, 35, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(17, 'Sunita Devi', 'sunita.devi@gmail.com', '+91-9876543226', NULL, 28, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(18, 'Mohammed Ali', 'mohammed.ali@gmail.com', '+91-9876543227', NULL, 40, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(19, 'Geeta Sharma', 'geeta.sharma@gmail.com', '+91-9876543228', NULL, 32, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(20, 'Pradeep Nair', 'pradeep.nair@gmail.com', '+91-9876543229', NULL, 45, NULL, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00');

INSERT INTO vehicle (vehicleid, licenseplate, typeid, ownerid, createdat, updatedat) VALUES
(1, 'GJ-06-AB-1234', 1, 1, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(2, 'GJ-06-CD-5678', 1, 2, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(3, 'GJ-06-EF-9012', 1, 3, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(4, 'GJ-06-GH-3456', 1, 4, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(5, 'GJ-06-IJ-7890', 1, 5, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(6, 'GJ-06-KL-2468', 1, 8, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(7, 'GJ-06-MN-1357', 1, 9, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(8, 'GJ-06-OP-9753', 1, 10, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(9, 'GJ-06-QR-8642', 1, 12, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(10, 'GJ-06-ST-7531', 1, 14, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(11, 'GJ-06-UV-6420', 3, 11, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(12, 'GJ-06-WX-5319', 3, 13, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(13, 'GJ-06-YZ-4208', 3, 15, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(14, 'GJ-06-AA-3197', 3, 6, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(15, 'GJ-06-BB-2086', 3, 7, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(16, 'GJ-06-CC-1975', 2, NULL, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(17, 'GJ-06-DD-0864', 2, NULL, '2024-01-15 10:00:00', '2024-01-15 10:00:00'),
(18, 'GJ-06-EE-9753', 2, NULL, '2024-01-15 10:00:00', '2024-01-15 10:00:00');

INSERT INTO "User" (userid, username, passwordhash, roleid, createdat, updatedat) VALUES
(1, 'guard1', 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(2, 'guard2', 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(3, 'guard3', 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(4, 'guard4', 'd4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(5, 'admin1', 'e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0', 2, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(6, 'admin2', 'f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1', 2, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(7, 'superadmin', 'g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2', 3, '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(8, 'guard5', 'h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3', 1, '2024-01-01 10:00:00', '2024-01-01 10:00:00');

INSERT INTO gateoccupancy (gateid, occupancycount, updatedat) VALUES
(1, 5, '2024-01-20 14:30:00'),
(2, 3, '2024-01-20 14:30:00'),
(3, 8, '2024-01-20 14:30:00'),
(4, 2, '2024-01-20 14:30:00');

INSERT INTO personvisit (visitid, personid, entrygateid, entrytime, exitgateid, exittime, vehicleid, createdat, updatedat) VALUES
(1, 8, 1, '2024-01-16 08:00:00', 1, '2024-01-16 18:00:00', 6, '2024-01-16 08:00:00', '2024-01-16 18:00:00'),
(2, 9, 2, '2024-01-16 08:30:00', 2, '2024-01-16 17:30:00', 7, '2024-01-16 08:30:00', '2024-01-16 17:30:00'),
(3, 10, 3, '2024-01-16 09:00:00', 3, '2024-01-16 17:00:00', 8, '2024-01-16 09:00:00', '2024-01-16 17:00:00'),
(4, 11, 2, '2024-01-16 09:15:00', 2, '2024-01-16 16:45:00', 11, '2024-01-16 09:15:00', '2024-01-16 16:45:00'),
(5, 12, 1, '2024-01-16 09:30:00', 1, '2024-01-16 18:30:00', 9, '2024-01-16 09:30:00', '2024-01-16 18:30:00'),
(6, 1, 1, '2024-01-17 07:30:00', 3, '2024-01-17 19:00:00', 1, '2024-01-17 07:30:00', '2024-01-17 19:00:00'),
(7, 2, 2, '2024-01-17 08:00:00', 4, '2024-01-17 18:30:00', 2, '2024-01-17 08:00:00', '2024-01-17 18:30:00'),
(8, 3, 3, '2024-01-17 08:15:00', 1, '2024-01-17 19:15:00', 3, '2024-01-17 08:15:00', '2024-01-17 19:15:00'),
(9, 13, 1, '2024-01-17 10:00:00', 1, '2024-01-17 16:00:00', NULL, '2024-01-17 10:00:00', '2024-01-17 16:00:00'),
(10, 14, 2, '2024-01-17 10:30:00', 2, '2024-01-17 15:30:00', NULL, '2024-01-17 10:30:00', '2024-01-17 15:30:00'),
(11, 15, 3, '2024-01-17 11:00:00', 3, '2024-01-17 17:00:00', NULL, '2024-01-17 11:00:00', '2024-01-17 17:00:00'),
(12, 16, 1, '2024-01-18 14:00:00', 1, '2024-01-18 16:00:00', NULL, '2024-01-18 14:00:00', '2024-01-18 16:00:00'),
(13, 17, 2, '2024-01-18 14:30:00', 2, '2024-01-18 17:00:00', 16, '2024-01-18 14:30:00', '2024-01-18 17:00:00'),
(14, 18, 3, '2024-01-18 15:00:00', 3, '2024-01-18 18:00:00', NULL, '2024-01-18 15:00:00', '2024-01-18 18:00:00'),
(15, 19, 4, '2024-01-18 15:30:00', 4, '2024-01-18 17:30:00', 17, '2024-01-18 15:30:00', '2024-01-18 17:30:00'),
(16, 4, 1, '2024-01-20 08:00:00', NULL, NULL, 4, '2024-01-20 08:00:00', NULL),
(17, 5, 2, '2024-01-20 08:30:00', NULL, NULL, 5, '2024-01-20 08:30:00', NULL),
(18, 6, 3, '2024-01-20 09:00:00', NULL, NULL, 14, '2024-01-20 09:00:00', NULL),
(19, 7, 4, '2024-01-20 09:15:00', NULL, NULL, 15, '2024-01-20 09:15:00', NULL),
(20, 8, 1, '2024-01-20 10:00:00', NULL, NULL, NULL, '2024-01-20 10:00:00', NULL),
(21, 9, 2, '2024-01-20 10:30:00', NULL, NULL, NULL, '2024-01-20 10:30:00', NULL),
(22, 10, 3, '2024-01-20 11:00:00', NULL, NULL, NULL, '2024-01-20 11:00:00', NULL),
(23, 11, 4, '2024-01-20 11:30:00', NULL, NULL, NULL, '2024-01-20 11:30:00', NULL),
(24, 20, 1, '2024-01-20 12:00:00', NULL, NULL, 18, '2024-01-20 12:00:00', NULL),
(25, 16, 2, '2024-01-20 13:00:00', NULL, NULL, NULL, '2024-01-20 13:00:00', NULL);

INSERT INTO vehiclevisit (visitid, vehicleid, entrygateid, entrytime, exitgateid, exittime, createdat, updatedat) VALUES
(1, 1, 1, '2024-01-17 07:30:00', 3, '2024-01-17 19:00:00', '2024-01-17 07:30:00', '2024-01-17 19:00:00'),
(2, 2, 2, '2024-01-17 08:00:00', 4, '2024-01-17 18:30:00', '2024-01-17 08:00:00', '2024-01-17 18:30:00'),
(3, 3, 3, '2024-01-17 08:15:00', 1, '2024-01-17 19:15:00', '2024-01-17 08:15:00', '2024-01-17 19:15:00'),
(4, 6, 1, '2024-01-16 08:00:00', 1, '2024-01-16 18:00:00', '2024-01-16 08:00:00', '2024-01-16 18:00:00'),
(5, 7, 2, '2024-01-16 08:30:00', 2, '2024-01-16 17:30:00', '2024-01-16 08:30:00', '2024-01-16 17:30:00'),
(6, 8, 3, '2024-01-16 09:00:00', 3, '2024-01-16 17:00:00', '2024-01-16 09:00:00', '2024-01-16 17:00:00'),
(7, 11, 2, '2024-01-16 09:15:00', 2, '2024-01-16 16:45:00', '2024-01-16 09:15:00', '2024-01-16 16:45:00'),
(8, 12, 1, '2024-01-17 10:00:00', 1, '2024-01-17 16:00:00', '2024-01-17 10:00:00', '2024-01-17 16:00:00'),
(9, 13, 3, '2024-01-17 11:00:00', 3, '2024-01-17 17:00:00', '2024-01-17 11:00:00', '2024-01-17 17:00:00'),
(10, 16, 2, '2024-01-18 14:30:00', 2, '2024-01-18 17:00:00', '2024-01-18 14:30:00', '2024-01-18 17:00:00'),
(11, 17, 4, '2024-01-18 15:30:00', 4, '2024-01-18 17:30:00', '2024-01-18 15:30:00', '2024-01-18 17:30:00'),
(12, 18, 1, '2024-01-19 10:00:00', 1, '2024-01-19 12:00:00', '2024-01-19 10:00:00', '2024-01-19 12:00:00'),
(13, 4, 1, '2024-01-20 08:00:00', NULL, NULL, '2024-01-20 08:00:00', NULL),
(14, 5, 2, '2024-01-20 08:30:00', NULL, NULL, '2024-01-20 08:30:00', NULL),
(15, 9, 1, '2024-01-20 09:00:00', NULL, NULL, '2024-01-20 09:00:00', NULL),
(16, 10, 3, '2024-01-20 09:15:00', NULL, NULL, '2024-01-20 09:15:00', NULL),
(17, 14, 3, '2024-01-20 09:00:00', NULL, NULL, '2024-01-20 09:00:00', NULL),
(18, 15, 4, '2024-01-20 09:15:00', NULL, NULL, '2024-01-20 09:15:00', NULL),
(19, 16, 1, '2024-01-20 12:00:00', NULL, NULL, '2024-01-20 12:00:00', NULL),
(20, 17, 2, '2024-01-20 13:00:00', NULL, NULL, '2024-01-20 13:00:00', NULL);

SELECT setval(pg_get_serial_sequence('membertype', 'typeid'), (SELECT COALESCE(MAX(typeid), 1) FROM membertype));
SELECT setval(pg_get_serial_sequence('member', 'memberid'), (SELECT COALESCE(MAX(memberid), 1) FROM member));
SELECT setval(pg_get_serial_sequence('vehicletype', 'typeid'), (SELECT COALESCE(MAX(typeid), 1) FROM vehicletype));
SELECT setval(pg_get_serial_sequence('vehicle', 'vehicleid'), (SELECT COALESCE(MAX(vehicleid), 1) FROM vehicle));
SELECT setval(pg_get_serial_sequence('gate', 'gateid'), (SELECT COALESCE(MAX(gateid), 1) FROM gate));
SELECT setval(pg_get_serial_sequence('role', 'roleid'), (SELECT COALESCE(MAX(roleid), 1) FROM role));
SELECT setval(pg_get_serial_sequence('"User"', 'userid'), (SELECT COALESCE(MAX(userid), 1) FROM "User"));
SELECT setval(pg_get_serial_sequence('personvisit', 'visitid'), (SELECT COALESCE(MAX(visitid), 1) FROM personvisit));
SELECT setval(pg_get_serial_sequence('vehiclevisit', 'visitid'), (SELECT COALESCE(MAX(visitid), 1) FROM vehiclevisit));

COMMIT;

-- =============================================================================
-- END OF MODULE A DUMP
-- =============================================================================

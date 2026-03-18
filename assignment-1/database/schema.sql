-- =============================================================================
-- GateGuard Entry Gate Management System - Database Schema
-- =============================================================================
-- Database: PostgreSQL
-- Normalization: 3NF
-- =============================================================================

-- Drop existing objects (for clean re-run). Order respects FK dependencies.
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

-- =============================================================================
-- 1. MemberType
-- =============================================================================
CREATE TABLE MemberType (
    TypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_membertype_name CHECK (TypeName IN ('Resident', 'Student', 'Visitor'))
);
CREATE INDEX idx_membertype_name ON MemberType(TypeName);

-- =============================================================================
-- 2. Member
-- =============================================================================
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

-- =============================================================================
-- 3. VehicleType
-- =============================================================================
CREATE TABLE VehicleType (
    TypeID SERIAL PRIMARY KEY,
    TypeName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_vehicletype_name CHECK (TypeName IN ('PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus'))
);
CREATE INDEX idx_vehicletype_name ON VehicleType(TypeName);

-- =============================================================================
-- 4. Vehicle
-- =============================================================================
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

-- =============================================================================
-- 5. Gate
-- =============================================================================
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

-- =============================================================================
-- 6. GateOccupancy
-- =============================================================================
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

-- =============================================================================
-- 7. Role
-- =============================================================================
CREATE TABLE Role (
    RoleID SERIAL PRIMARY KEY,
    RoleName VARCHAR(50) NOT NULL UNIQUE,
    CreatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_role_name CHECK (RoleName IN ('Guard', 'Admin', 'SuperAdmin'))
);
CREATE INDEX idx_role_name ON Role(RoleName);

-- =============================================================================
-- 8. User (quoted: reserved word in PostgreSQL)
-- =============================================================================
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

-- =============================================================================
-- 9. PersonVisit
-- =============================================================================
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

-- =============================================================================
-- 10. VehicleVisit
-- =============================================================================
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

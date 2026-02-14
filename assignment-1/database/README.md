# GateGuard Database

PostgreSQL schema and sample data for the GateGuard Entry Gate Management System.  
**Source of truth:** `cursor-ai-agent/` planning documents.

## Contents

| File | Purpose |
|------|---------|
| `schema.sql` | Creates all 10 tables, constraints, and indexes (FK-safe drop order, then CREATE). |
| `seed.sql` | Inserts sample data in dependency order and resets SERIAL sequences. |
| **`gateguard_module_a_dump.sql`** | **Module A submission:** single file = schema + sample data. Run this alone to recreate the full database. |

## Requirements

- **PostgreSQL** 12+ (or compatible)
- Database created and connection details (host, port, user, database name)

## Quick Start

### 1. Create database (if needed)

```bash
createdb gateguard
```

Or in `psql`:

```sql
CREATE DATABASE gateguard;
```

### 2. Run schema

```bash
psql -h localhost -U your_user -d gateguard -f database/schema.sql
```

### 3. Load sample data

```bash
psql -h localhost -U your_user -d gateguard -f database/seed.sql
```

### 4. One-shot (schema + data)

```bash
psql -h localhost -U your_user -d gateguard -f database/schema.sql -f database/seed.sql
```

## Setup with pgAdmin

If you use **pgAdmin**, you can create the database and run the scripts from the GUI.

### 1. Create the database

1. In the **Browser** (left panel), right-click **Databases**.
2. Choose **Create** → **Database…**.
3. **Database:** `gateguard` (or any name you prefer).
4. **Owner:** your PostgreSQL user (e.g. `postgres`).
5. Click **Save**.

### 2. Run the schema

1. In the Browser, expand **Databases** → **gateguard**.
2. Right-click **gateguard** → **Query Tool** (or use the **Query Tool** toolbar icon).
3. In the Query Tool:
   - Click **Open File** (folder icon) or use **File → Open**.
   - Select `schema.sql` (from this project’s `database/` folder).
4. Click **Execute/Run** (▶) or press **F5**.
5. Check the **Messages** tab: you should see “CREATE TABLE” and “CREATE INDEX” messages without errors.

### 3. Load sample data

1. In the same Query Tool (or open a new one for **gateguard**):
   - **File → Open** and select `seed.sql`.
2. Click **Execute/Run** (▶) or press **F5**.
3. Check **Messages**: you should see “INSERT 0 3”, “INSERT 0 20”, etc., and “COMMIT” at the end.

### 4. Verify

1. In the Browser, expand **gateguard** → **Schemas** → **public** → **Tables**.
2. You should see all 10 tables: **MemberType**, **Member**, **VehicleType**, **Vehicle**, **Gate**, **GateOccupancy**, **Role**, **User**, **PersonVisit**, **VehicleVisit**.
3. Right-click any table → **View/Edit Data** → **All Rows** to confirm data.

**Tip:** To re-run from scratch, execute `schema.sql` first (it drops and recreates tables), then run `seed.sql` again.

## Schema Summary

- **10 tables:** MemberType, Member, VehicleType, Vehicle, Gate, GateOccupancy, Role, User, PersonVisit, VehicleVisit  
- **Referential integrity:** All FKs with ON DELETE RESTRICT/SET NULL/CASCADE and ON UPDATE CASCADE as per plan  
- **Constraints:** NOT NULL (≥3 per table), UNIQUE (Email, LicensePlate, Username, type names), CHECK (e.g. ExitTime ≥ EntryTime, OccupancyCount ≥ 0)  
- **Indexes:** PKs, FKs, and selected columns for queries (see `schema.sql`)

**Note:** The `User` table is created as `"User"` (double-quoted) because `USER` is a reserved word in PostgreSQL. Use `"User"` in all SQL and application code when referring to this table.

## Seed Data

- **MemberType:** 3 rows (Resident, Student, Visitor)  
- **VehicleType:** 5 rows (PrivateCar, Taxi, Bike, Truck, Bus)  
- **Role:** 3 rows (Guard, Admin, SuperAdmin)  
- **Gate:** 4 rows (Main, East, West, South)  
- **Member:** 20 rows (7 residents, 8 students, 5 visitors)  
- **Vehicle:** 18 rows (10 cars, 5 bikes, 3 taxis)  
- **User:** 8 rows (guards and admins)  
- **GateOccupancy:** 4 rows (one per gate)  
- **PersonVisit:** 25 rows (15 completed, 10 active)  
- **VehicleVisit:** 20 rows (12 completed, 8 active)  

## Module A submission

For **Assignment-1 Module A**, submit the single dump file:

- **File:** `database/gateguard_module_a_dump.sql`
- **Contains:** Full schema (DROP + CREATE + indexes) and all sample data (INSERTs + sequence reset).
- **To restore:** Create an empty database, then run this file once (e.g. in pgAdmin Query Tool or `psql -d gateguard -f gateguard_module_a_dump.sql`).
- Rename or keep as `gateguard_module_a_dump.sql` unless your course instructions specify a different name.

## Restoring from scratch

`schema.sql` drops tables in FK-safe order, then recreates them. Re-run:

1. `schema.sql`  
2. `seed.sql`  

to get a clean database with sample data.

## Connection string example

```
postgresql://user:password@localhost:5432/gateguard
```

Use this (or your actual credentials) for Node.js/Express and any DB client.

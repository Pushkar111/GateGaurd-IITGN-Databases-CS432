# GateGuard – Entry Gate Management System

## Problem Statement

In campuses, residential complexes, and corporate facilities, entry and exit management is often handled by security personnel using handwritten logs or verbal verification. This manual process is slow, error-prone, and vulnerable to security breaches, as unauthorised visitors or vehicles can enter without proper tracking. 

During peak hours, long queues form at gates, causing congestion and increasing the risk of missed or incorrect entries. Additionally, authorities lack real-time visibility into who is on the premises, making it difficult to respond to emergencies or monitor occupancy levels effectively.

---

## Current Solutions

Many facilities use basic access cards, visitor registers, or simple gate management software to control entry. Some systems support QR codes or RFID cards, but they usually focus only on authentication and do not provide integrated vehicle tracking, real-time occupancy monitoring, or detailed traffic analytics. 

Visitor pre-registration is often handled through separate systems or manual approvals, leading to delays at the gate. These fragmented solutions provide limited insight into peak-hour traffic, security risks, and overall gate performance, reducing their effectiveness in managing large-scale or high-security environments.

---

## Project Phases

### Assignment 1: Database and UML Development

This assignment involves conducting a detailed requirement analysis of the selected problem statement to clearly define system scope and functionality. A system architecture will be designed using standard UML diagrams to model structural and behavioural aspects of the application. Based on this design, a normalised relational database schema will be developed, specifying entities, relationships, primary and foreign keys, and integrity constraints to ensure an efficient and consistent data model.

**Learning Objectives:**
- **System Modelling:** Transforming real-world requirements into formal technical models
- **Architectural Design:** Understanding data and control flow within a complete software system
- **Database Normalisation:** Applying principles from 1NF to 3NF to reduce redundancy and dependencies
- **Schema Mapping:** Converting object-oriented class diagrams into relational database tables

### Assignment 2: Application and B+ Tree Development

This assignment requires the development of core backend application logic along with a custom B+ Tree indexing structure implemented from scratch. The B+ Tree will function as a high-performance indexing layer for critical attributes such as User IDs, Order Timestamps, or Transaction Logs. The application must integrate this index to support efficient search and range query operations, demonstrating the practical impact of data structures on system performance.

**Learning Objectives:**
- **Indexing Internals:** Understanding how database indexes enable fast data retrieval
- **Algorithmic Implementation:** Implementing B+ Trees to support logarithmic-time operations
- **Query Optimisation:** Demonstrating performance gains of indexed access over linear scanning
- **System Integration:** Linking low-level data structures with high-level application logic

### Assignment 3: ACID Testing on the Application and B+ Tree

This assignment focuses on evaluating the system under concurrent workloads to validate ACID properties (Atomicity, Consistency, Isolation, Durability). Simulated multi-user scenarios will be created to test simultaneous read, write, and update operations. Special attention will be given to maintaining consistency between the main database and the custom B+ Tree index during transaction rollbacks, crashes, or partial failures.

**Learning Objectives:**
- **Transaction Management:** Designing operations that either complete fully or revert safely
- **Concurrency Control:** Applying locking and synchronisation mechanisms to prevent conflicts
- **Data Integrity:** Ensuring alignment between database records and index structures
- **Crash Recovery:** Studying mechanisms that guarantee data persistence after failures

### Assignment 4: Sharding of the Developed Application

This assignment involves implementing logical data partitioning (sharding) across multiple simulated nodes or tables. A suitable Shard Key (such as Region, User ID, or Hash value) will be selected, and application logic will be modified to correctly route queries to the appropriate shard. The exercise simulates real-world distributed database systems that scale horizontally to handle large datasets.

**Learning Objectives:**
- **Horizontal Scaling:** Distinguishing between vertical and horizontal system expansion
- **Sharding Strategies:** Applying range-based, directory-based, and hash-based partitioning
- **Distributed Query Routing:** Locating data across multiple partitions efficiently
- **Scalability Trade-offs:** Analysing consistency, availability, and partition tolerance in distributed systems

---

## Evaluation Plan

The proposed system will be evaluated along the following dimensions:

- **Correctness and Design Quality:** Accuracy of requirement analysis, UML modelling, schema normalisation, and alignment between application logic and database design
- **Indexing and Transactional Behaviour:** Proper implementation of the B+ Tree indexing structure and validation of ACID properties under concurrent access and failure conditions
- **Scalability and Performance:** Impact of indexing and sharding on query latency, throughput, and system overhead compared to baseline approaches

Evaluation will follow predefined rubrics for each assignment, with a viva conducted after every assignment.

> **Note:** Separate documents will be shared for each assignment and evaluation.

---

## Expected Outcomes

By the end of Track 1, the project is expected to achieve the following outcomes:

- A well-structured system design based on requirement analysis, UML modelling, and normalised relational schemas
- A functional application with a custom B+ Tree indexing mechanism for efficient data retrieval
- A robust system demonstrating ACID compliance under concurrent and failure scenarios
- A sharded data architecture illustrating principles of distributed databases and horizontal scalability
- A scalable database-driven application capable of handling real-world complexities

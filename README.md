# ELIMS (Electronic Laboratory Information Management System)

### Requirements
- Docker Desktop (Windows/macOS/Linux)
- Git

### Setup Instructions

```bash
git clone https://github.com/YOUR_USERNAME/ELIMS.git
cd ELIMS
cp .env.example .env
docker compose up -d --build
 | Email                                         | Password | Role        |
| --------------------------------------------- | -------- | ----------- |
| [admin@elims.local](mailto:admin@elims.local) | admin123 | Super Admin |

# to install the chemistry tests
docker exec -it elims_api npm run seed:chemistry
  



  ELIMS v1.0.1

Enterprise Laboratory Information Management System
MediTrust Diagnostics — Complete Lab Workflow Automation

1. Overview

ELIMS v1.0.1 is a modern, full-stack Laboratory Information Management System (LIMS) designed to manage patients, test orders, sample collection, test processing, results verification, billing, invoicing, reporting, and staff access control through a robust RBAC engine.

This version includes:

Full installation automation

Auto database restore (preloaded data included)

Panel recalculation & analyte linking

Payment workflow & invoicing

Dashboards & analytics

Seeded roles, permissions, departments, sample types, units, tests & normal ranges

Optimized backend + frontend build & container orchestration

Technologies:

React (Vite) + Tailwind CSS

Node.js + Express

PostgreSQL 16

Docker & Docker Compose

Nginx

2. Features
2.1 Patient Management

Register & update patient information

Search by name or Lab ID

Full visit & test history

Automatic age calculation

Ward tracking

2.2 Test Requests & Panels

Create new test requests

Add panels or individual tests

Automatic panel price calculation

Configurable analytes, ranges, units, departments, sample types

2.3 Sample Collection

Phlebotomy worklist

Mark collected samples

Workflow transitions

2.4 Laboratory & Pathology

Technician worklist

Result entry (numeric/qualitative)

Auto-flag out-of-range values

Verification & approval workflow

Printable reports

2.5 Billing & Invoicing

Auto invoice creation

Process payments (cash/mobile money/etc.)

Pending payments tracking

Revenue analytics

Integrated invoice page

2.6 Dashboard

Total revenue

Invoice count

New patients

Pending payments

Completed tests

Pending tests

Active users

Monthly revenue graph

2.7 Admin Panel

User management

Role management

Permission control using RBAC

Department, unit, panel & range configuration

3. System Architecture
ELIMS/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   ├── migrations/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.tsx
│   └── index.html
│
├── elims_backup.sql
├── install.sh
└── docker-compose.yml

4. Requirements

Docker & Docker Compose

4GB RAM minimum

At least 20GB free disk space

Linux recommended, Windows/macOS supported

5. Installation (Automatic — Recommended)

Run:

chmod +x install.sh
./install.sh


This will automatically:

Install Docker (Linux)

Build backend + frontend

Create and initialize the database

Restore all data from elims_backup.sql (patients, tests, panels, etc.)

Apply migrations & seeds

Start all containers

6. Manual Installation

Clone:

git clone https://github.com/Fadil9626/ELIMS.git
cd ELIMS


Start:

docker compose up -d --build


Frontend: http://localhost:8081
Backend API: http://localhost:5000

7. Environment Configuration

Create backend/.env:

POSTGRES_USER=postgres
POSTGRES_PASSWORD=elims_pass
POSTGRES_DB=elims_db
JWT_SECRET=mysecret
CORS_ORIGIN=http://localhost:5173,http://localhost:8081

8. Default Login
Email: admin@elims.local
Password: elimsadmin
Role: System Administrator

9. Backup & Restore
Backup:
docker exec elims_db pg_dump -U postgres elims_db > elims_backup.sql

Restore:
docker exec -i elims_db psql -U postgres elims_db < elims_backup.sql

10. Development

Backend:

cd backend
npm install
npm run dev


Frontend:

cd frontend
npm install
npm run dev

11. RBAC Permissions

Format:

Module:Action


Examples:

Patients:Create

Billing:Create

Phlebotomy:Update

Pathology:Verify

SuperAdmin override:

*:* 

12. API Quick View
Authentication

POST /api/auth/login

Patients

GET /api/patients

POST /api/patients

Test Requests

POST /api/test-requests

POST /api/test-requests/:id/payment

Results

POST /api/test-requests/:id/results

POST /api/test-requests/:id/verify-results

13. Troubleshooting

Backend logs:

docker logs elims_api


Frontend logs:

docker logs elims_web


Database logs:

docker logs elims_db


Reset everything:

docker compose down
docker compose up -d --build

14. Deployment Notes

Works on any VPS

Add SSL for production

Nginx already configured

PostgreSQL data persists automatically
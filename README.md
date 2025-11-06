<<<<<<< HEAD
# ELIMS - Laboratory Information Management System  
Version: v1.0.0 (Docker Deployment Package)

This package contains everything needed to deploy ELIMS on a Linux server with Docker.

---

## ✅ Requirements

Before starting, ensure the server has:

| Requirement | Version / Info |
|-----------|----------------|
| **OS** | Ubuntu 20.04 / 22.04 or Debian 12 |
| **Docker** | 24+ |
| **Docker Compose** | v2.20+ |
| **Public Domain Names** | 2 domains (example below) |
| **Open Ports** | 80 & 443 must be open |

---

## 🌍 Domain Setup

You will need **two subdomains**:

| Component | Example | Points To |
|----------|---------|-----------|
| Frontend (Web UI) | `yourlab.com` | Server Public IP |
| Backend API | `api.yourlab.com` | Server Public IP |

**Both must be A Records**.

---

## 🔧 Step 1 — Upload the Release Folder

Upload the folder **`elims-v1-release`** to the server:

```bash
scp -r elims-v1-release user@server-ip:/home/user/
=======
# ELIMS
LAB MANAGEMENT SYSTEM
>>>>>>> ceb8c328c59fd1168e93688a57ff51d1a2154e42

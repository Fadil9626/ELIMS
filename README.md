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

ELIMS Installation Guide

This script automates the deployment of the ELIMS (Electronic Laboratory Information Management System) on a Linux server.

Prerequisites

Server: A clean Ubuntu 20.04 or 22.04 server.

Project Files: Upload your project folder to the server (e.g., /root/elims or /home/ubuntu/elims).

Structure: Ensure your project folder looks like this:
How to Run
Make the script executable:
chmod +x install.sh


Run the script (as root or with sudo):
sudo ./install.sh


Follow the prompts: The script will ask for database passwords and configuration details.
What this script does
System Updates: Updates the OS and installs core tools (curl, git, build-essentials).
Environment: Installs Node.js (v20), NPM, and PostgreSQL.
Database: - Creates a PostgreSQL user and database.
Restores your database.sql backup file automatically.
Backend: - Installs dependencies.
Configures .env file.
Starts the server using PM2 (Process Manager) to keep it alive forever.
Frontend: - Installs dependencies.
Builds the optimized production static files (dist).
Deploys them to /var/www/elims.
Web Server: - Installs and configures Nginx as a reverse proxy.
Serves the frontend on Port 80 (HTTP).

# 🛵 Global Ride Project (Full-Stack Ride-Hailing Application)

A comprehensive, full-stack micro-mobility and bike-taxi booking platform for Global Ride. This project provides a seamless, real-time ride-sharing experience for both customers and drivers.

## 🚀 Tech Stack & Architecture

- Frontend: React.js (Vite), JavaScript, Leaflet Maps, HTML5, CSS3
- Backend: Python, FastAPI, SQLAlchemy, SQLite Database
- APIs & Services: Geocoding Location Search, Secure Payment Gateway Integration

## 📁 Project Directory Structure

- rapido_backend/ - Contains the FastAPI server, API routers, database models, schemas, and fare/distance calculation logic.
- rapido_frontend/ - Contains the React (Vite) client application, user/driver dashboards, map components, and service APIs.

## ⚙️ System Requirements & Prerequisites

Make sure you have the following software installed on your machine before starting:
- Python (v3.8 or higher)
- Node.js & npm (v14 or higher)
- Git

## 🛠️ Step-by-Step Instructions to Run Locally

### Step 1: Clone the Repository
Open your terminal/command prompt and run:
git clone https://github.com/Gautam-kumar12-creater/rapido-clone-project.git
cd rapido-clone-project

### Step 2: Setup and Run the Backend (FastAPI)
Navigate to the backend directory:
cd rapido_backend

Activate your Python virtual environment (For Windows PowerShell / CMD):
.venv\Scripts\activate

Install the required Python dependencies:
pip install -r requirements.txt

Start the FastAPI development server:
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
(The backend server will be live at: http://127.0.0.1:8000)

### Step 3: Setup and Run the Frontend (React / Vite)
Open a new terminal tab in your code editor and navigate to the frontend directory:
cd rapido_frontend

Install the necessary node packages:
npm install

Start the frontend development server:
npm run dev
(The frontend client will be live at: http://localhost:5173)

## 🌐 Deploy to Render

This repository includes a Render Blueprint (`render.yaml`) that creates a public
FastAPI backend and a static React frontend. To deploy it:

1. Push the project, including `render.yaml` and the actual files under
   `rapido_backend`, to a GitHub repository. Render's checkout must contain the
   backend source at that path.
2. In Render, choose **New + → Blueprint**, connect that repository, and deploy
   the Blueprint.
3. Wait for both services to finish building, then open the `rapido-frontend`
   service's `onrender.com` URL. The frontend is configured to call the backend
   service automatically.

Render's free backend may take a short time to wake after inactivity. This app
currently keeps users and rides in process memory, not a persistent database,
so that data can be lost when the backend restarts or redeploys. Treat the
deployment as a demo, not a production ride or payment service.

## ✨ Key Features

- User (Rider) Dashboard: Search pickup and drop locations via custom geocoding, view real-time trip previews, select bike/scooter types, and calculate dynamic fares and ETAs instantly.
- Driver Dashboard: Manage incoming ride requests, track active trip statuses, and handle trip assignments seamlessly.
- Live Trip Status Tracker: Real-time state management tracking rides from request to completion.
- Secure Payment Processing: Integrated checkout and payment gateways for hassle-free transactions.

## 👨‍💻 Author
Gautam Kumar

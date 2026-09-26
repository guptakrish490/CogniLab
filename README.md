# CogniLab — Web-Based Cognitive Experiment Platform (Backend API)

Developed for high-precision, web-based behavioral and cognitive experiments.

---

## Problem Statement
Democratize cognitive science research by building a Software-as-a-Service (SaaS) platform that enables researchers to create, deploy, and analyze browser-based behavioral experiments while addressing the key challenge of obtaining reliable millisecond-sensitive timing measurements on the web.

---

## Key Features

1. **Researcher Dashboard & Auth**: Secure researcher registration and login using JWT and bcryptjs.
2. **Experiment Lifecycle**: Build draft experiments, configure trials/stimuli, publish experiments, and generate shareable short public links (publicId).
3. **Anonymous Participant Sessions**: Participants take experiments without creating an account; sessions use anonymous participant codes (e.g., P-MERRQZ).
4. **Browser Timing Calibration & Reliability Score**: Session-level scoring engine evaluating display refresh stability, frame timing jitter, input responsiveness, and dropped frames (0-100 score).
5. **High-Precision Reaction Time Logging**: Preserves raw millisecond reaction times recorded via browser high-resolution timing APIs.
6. **Researcher Results & Analytics**: Aggregate metrics (average reaction time, accuracy, reliability breakdown) with flags for low-reliability sessions.

---

## Backend Architecture

CogniLab is built with **Node.js**, **Express**, **MongoDB**, and **Mongoose** following a 4-Layered Clean Architecture:

```text
HTTP Request
     │
     ▼
[ ROUTE LAYER ]          ── (Defines endpoints & Auth middleware)
     │
     ▼
[ CONTROLLER LAYER ]     ── (Parses req.body/params & returns JSON responses)
     │
     ▼
[ SERVICE LAYER ]        ── (Contains core business logic, calibration formulas, & aggregation)
     │
     ▼
[ MODEL LAYER ]          ── (Mongoose Schemas & MongoDB persistence)
```

---

## Directory Structure

```text
src/
├── server.js                     # Server launcher & DB connection bootstrapper
├── app.js                        # Express App setup & middleware routing
├── db/
│   └── connection.js             # Mongoose MongoDB connection handler
├── middleware/
│   └── auth.middleware.js        # JWT protection middleware for researcher routes
├── errors/
│   └── errorHandler.js          # Centralized Express error handler
├── auth/
│   ├── auth.model.js             # Mongoose User schema (Researchers)
│   ├── auth.service.js           # Registration & login logic
│   ├── auth.controller.js        # Auth request handlers
│   └── auth.routes.js            # POST /auth/register, POST /auth/login
├── experiments/
│   ├── experiment.model.js       # Experiment schema (DRAFT, PUBLISHED, CLOSED)
│   ├── experiment.service.js     # Experiment creation & publishing logic
│   ├── experiment.controller.js  # Controller for experiment routes
│   └── experiment.routes.js      # Researcher & public experiment endpoints
├── trials/
│   ├── trial.model.js            # Trial schema (stimuli, duration, expected responses)
│   ├── trial.service.js          # Sequential trial management logic
│   ├── trial.controller.js       # Controller for trial routes
│   └── trial.routes.js           # CRUD endpoints for trials
├── calibration/
│   └── calibration.service.js    # Browser calibration & reliability scoring engine
├── participants/
│   ├── participant.model.js      # Anonymous participant session schema
│   ├── participant.service.js    # Session start, calibration & completion logic
│   ├── participant.controller.js # Controller for participant endpoints
│   └── participant.routes.js     # Public endpoints for participants
├── responses/
│   └── response.model.js         # Raw reaction time response schema
└── results/
    ├── results.service.js        # Researcher analytics & session aggregation engine
    ├── results.controller.js     # Controller for results routes
    └── results.routes.js         # Analytics endpoints
```

---

## API Reference Map

### 1. Health Check
- `GET /api/health` — Public server status check

### 2. Authentication (`/auth`)
- `POST /auth/register` — Register a researcher (`name`, `email`, `password`)
- `POST /auth/login` — Researcher login & receive JWT token (`email`, `password`)

### 3. Experiments (`/experiments`)
- `POST /experiments` *(Protected)* — Create a draft experiment
- `GET /experiments` *(Protected)* — List all researcher experiments
- `GET /experiments/:id` *(Protected)* — Get single experiment detail
- `PATCH /experiments/:id` *(Protected)* — Edit draft experiment
- `POST /experiments/:id/publish` *(Protected)* — Publish experiment & generate `publicId`
- `GET /experiments/public/:publicId` *(Public)* — Get published experiment details for participants

### 4. Trials (`/experiments/:experimentId/trials`)
- `POST /experiments/:experimentId/trials` *(Protected)* — Add trial stimulus configuration
- `GET /experiments/:experimentId/trials` *(Public/Protected)* — Get list of trials ordered by `trialOrder`
- `PATCH /experiments/:experimentId/trials/:id` *(Protected)* — Update a trial
- `DELETE /experiments/:experimentId/trials/:id` *(Protected)* — Remove a trial

### 5. Participant Execution (`/sessions`)
- `POST /sessions/start/:publicId` — Initialize anonymous participant session (`P-XXXXXX`)
- `POST /sessions/:sessionId/calibration` — Submit calibration signals & get reliability score
- `POST /sessions/:sessionId/responses` — Submit trial reaction time (`reactionTimeMs`, timestamps)
- `POST /sessions/:sessionId/complete` — Complete session & view individual summary

### 6. Results & Analytics (`/experiments/:experimentId/results`)
- `GET /experiments/:experimentId/results` *(Protected)* — Aggregated analytics, accuracy %, average reaction time, and reliability flags
- `GET /experiments/:experimentId/results/:sessionId` *(Protected)* — Detailed trial response breakdown for a specific participant session

---

## Setup & Local Run Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (running locally on port `27017` or a MongoDB Atlas URI)

### Installation
1. Clone the repository and navigate into the folder:
   ```bash
   cd CogniLab
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file in the root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/cognilab
   JWT_SECRET=cognilab_hackathon_super_secret_key_2026
   NODE_ENV=development
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

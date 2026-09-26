# Problem Statement 
Develop a secure, flexible, and high-precision Software-as-a-Service (SaaS) platform that empowers researchers to build and deploy complex behavioral experiments directly in a web browser. The platform's mission is to democratize cognitive science research by providing an accessible, no-code/low-code solution that replicates the accuracy of labbased studies while enabling large-scale, diverse online data collection.
# CogniLab — Web-Based Cognitive Experiment Platform (Backend API)

# SOLUTION- CogniLab
Developed for high-precision, web-based behavioral and cognitive experiments.

## Web-Based Cognitive Experiment Platform

### Core Idea

We are building a web-based SaaS platform that allows researchers to create and conduct cognitive and behavioral experiments directly through a browser.

The platform has two main users:

1. Researchers — who create, configure, publish, and analyze experiments.
2. Participants — who anonymously take published experiments through a browser.

The main goal is to make browser-based behavioral research easier while addressing one of the biggest challenges of web experiments: the reliability of timing and participant/device measurements.

---

# 1. Researcher Flow
## Problem Statement
Democratize cognitive science research by building a Software-as-a-Service (SaaS) platform that enables researchers to create, deploy, and analyze browser-based behavioral experiments while addressing the key challenge of obtaining reliable millisecond-sensitive timing measurements on the web.

A researcher first creates an account and logs into the researcher dashboard.

From the dashboard, the researcher can create a new experiment.

## Creating an Experiment

The researcher provides basic information such as:

* Experiment name
* Description
* Instructions
* Test/trial configuration
* Timing parameters
* Stimuli such as , images, colors, etc.
* Expected responses
* Number/order of trials

An experiment can contain a single test or multiple types of trials/tests.

For example:

```
Experiment: Human Reaction Study

    Trial 1 → Reaction to Red Circle
    Trial 2 → Reaction to Blue Circle
    Trial 3 → Color Matching
    Trial 4 → Memory Response
```

The researcher does not need to write code.

For the hackathon MVP, the experiment builder can be form-based rather than a fully complex drag-and-drop editor.

---

# 2. Draft and Publishing
## Key Features

When the researcher saves an experiment, it initially remains a draft.
1. **Researcher Dashboard & Auth**: Secure researcher registration and login using JWT and bcryptjs.
2. **Experiment Lifecycle**: Build draft experiments, configure trials/stimuli, publish experiments, and generate shareable short public links (publicId).
3. **Anonymous Participant Sessions**: Participants take experiments without creating an account; sessions use anonymous participant codes (e.g., P-MERRQZ).
4. **Browser Timing Calibration & Reliability Score**: Session-level scoring engine evaluating display refresh stability, frame timing jitter, input responsiveness, and dropped frames (0-100 score).
5. **High-Precision Reaction Time Logging**: Preserves raw millisecond reaction times recorded via browser high-resolution timing APIs.
6. **Researcher Results & Analytics**: Aggregate metrics (average reaction time, accuracy, reliability breakdown) with flags for low-reliability sessions.

```
DRAFT
   ↓
Researcher reviews experiment
   ↓
PUBLISH
   ↓
Experiment becomes available to participants
```

Once published, the system generates a unique experiment link.

Example:

```
/experiment/a8f3k2
```

The researcher can share this link with participants.

---

# 3. Participant Flow
## Backend Architecture

A participant opens the experiment link.
CogniLab is built with **Node.js**, **Express**, **MongoDB**, and **Mongoose** following a 4-Layered Clean Architecture:

The participant does not need to provide their real identity.

Instead, the system creates an anonymous participant/session ID.

Example:

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
Participant ID: P-7X92K
```

The participant first sees the experiment instructions.

Before the actual experiment starts, the platform performs a browser/device compatibility and calibration check.

---

# 4. Browser Reliability / Calibration
## Directory Structure

This is one of the main differentiating features of our platform.

Browser-based experiments have a major problem:

Different devices and browsers can have different timing behavior.

For example:

* Different display refresh rates
* Frame rendering delays
* Browser performance differences
* Input/keyboard latency
* Temporary frame drops
* Device performance differences

Therefore, before the experiment begins, the platform performs a short calibration process.

The system collects relevant browser/device timing information and generates a session-level reliability score.

Example:

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
Browser Reliability

Score: 93/100

Display stability:      Good
Frame consistency:      Good
Input responsiveness:   Good
Timing stability:       Good
```

The reliability score is associated with that participant's experiment session.

---

# 5. Experiment Execution
## API Reference Map

After calibration, the participant begins the actual experiment.
### 1. Health Check
- `GET /api/health` — Public server status check

The platform controls the presentation of each stimulus and records the participant's response.
### 2. Authentication (`/auth`)
- `POST /auth/register` — Register a researcher (`name`, `email`, `password`)
- `POST /auth/login` — Researcher login & receive JWT token (`email`, `password`)

Example:
### 3. Experiments (`/experiments`)
- `POST /experiments` *(Protected)* — Create a draft experiment
- `GET /experiments` *(Protected)* — List all researcher experiments
- `GET /experiments/:id` *(Protected)* — Get single experiment detail
- `PATCH /experiments/:id` *(Protected)* — Edit draft experiment
- `POST /experiments/:id/publish` *(Protected)* — Publish experiment & generate `publicId`
- `GET /experiments/public/:publicId` *(Public)* — Get published experiment details for participants

```
Fixation Cross
      ↓
Wait 500 ms
      ↓
Red Circle appears
      ↓
Participant presses Space
      ↓
Reaction time calculated
      ↓
Next trial
```
### 4. Trials (`/experiments/:experimentId/trials`)
- `POST /experiments/:experimentId/trials` *(Protected)* — Add trial stimulus configuration
- `GET /experiments/:experimentId/trials` *(Public/Protected)* — Get list of trials ordered by `trialOrder`
- `PATCH /experiments/:experimentId/trials/:id` *(Protected)* — Update a trial
- `DELETE /experiments/:experimentId/trials/:id` *(Protected)* — Remove a trial

Example measurement:
### 5. Participant Execution (`/sessions`)
- `POST /sessions/start/:publicId` — Initialize anonymous participant session (`P-XXXXXX`)
- `POST /sessions/:sessionId/calibration` — Submit calibration signals & get reliability score
- `POST /sessions/:sessionId/responses` — Submit trial reaction time (`reactionTimeMs`, timestamps)
- `POST /sessions/:sessionId/complete` — Complete session & view individual summary

```
Stimulus displayed: 500 ms
Response detected:  743 ms
### 6. Results & Analytics (`/experiments/:experimentId/results`)
- `GET /experiments/:experimentId/results` *(Protected)* — Aggregated analytics, accuracy %, average reaction time, and reliability flags
- `GET /experiments/:experimentId/results/:sessionId` *(Protected)* — Detailed trial response breakdown for a specific participant session

Reaction time = 243 ms
```

The platform should use high-resolution browser timing mechanisms and carefully control stimulus presentation to obtain as accurate a measurement as possible in a web environment.

---

# 6. Raw and Reliability-Aware Measurements
## Setup & Local Run Instructions

The platform should always preserve the original/raw measurement.
### Prerequisites
- Node.js (v18+)
- MongoDB (running locally on port `27017` or a MongoDB Atlas URI)

For example:

```
Raw reaction time: 247 ms
Reliability score: 93/100
```

The system can additionally generate a reliability-aware or quality-adjusted reading where appropriate.

For example:

```
Raw reading:              247 ms
Quality-adjusted reading: 251 ms
Reliability:               93/100
```

The raw measurement should never be overwritten.

This allows researchers to see both the original browser measurement and the platform's reliability-aware interpretation.

---

# 7. Participant Results

After completing the experiment, the participant can see their own results.

For example:

```
Experiment Completed

Average Reaction Time: 247 ms
Accuracy: 92%

Session Reliability: 93/100

Trials Completed: 20/20
```

The participant's personal identity is not exposed to the researcher.

---

# 8. Researcher Results Dashboard

The researcher can return to their dashboard and see all completed experiment sessions.

Participants remain anonymous.

Example:

```
Experiment: Human Reaction Study

Participants: 84

Average Reaction Time: 247 ms
Median Reaction Time: 241 ms
Average Accuracy: 91%

High Reliability Sessions: 72
Medium Reliability:        9
Low Reliability:           3
```

The researcher can inspect individual anonymous sessions.

Example:

```
Participant P-7X92K

Reliability: 93/100

Trial 1 → 243 ms → Correct
Trial 2 → 281 ms → Correct
Trial 3 → 198 ms → Incorrect
Trial 4 → 252 ms → Correct
```

The researcher can also see raw and reliability-aware measurements where applicable.

---

# 9. Low-Reliability Sessions

The platform can flag sessions where browser/device timing appears unreliable.

Example:

```
Participant P-4A82M

Reliability: 54/100

⚠ Timing instability detected

Researcher may choose to:
- Include the data
- Exclude the session from analysis
- Inspect the raw readings
```

The platform should not silently delete or modify participant data.

---

# 10. Experiment Lifecycle

The overall experiment lifecycle is:

```
Researcher Login
       ↓
Create Experiment
       ↓
Save as Draft
       ↓
Configure Tests/Trials
       ↓
Publish
       ↓
Generate Shareable Link
       ↓
Participant Opens Link
       ↓
Anonymous Session Created
       ↓
Browser Calibration
       ↓
Reliability Score Generated
       ↓
Experiment Begins
       ↓
Stimuli Presented
       ↓
Responses Recorded
       ↓
Raw Reaction Times Stored
       ↓
Reliability-Aware Analysis
       ↓
Participant Sees Results
       ↓
Researcher Sees Anonymous Results
```

---

# 11. Core Data Model

The main entities can be:

```
Users
  ↓
Experiments
  ↓
Trials

Experiments
  ↓
Participant Sessions
  ↓
Responses
```

Conceptually:

```
User
 └── Experiments
       ├── Trial 1
       ├── Trial 2
       ├── Trial 3
       └── Participant Sessions
              ├── Response 1
              ├── Response 2
              └── Response 3
```

Important information stored for a participant session can include:

```
anonymous participant ID
experiment ID
reliability score
browser/device calibration information
start time
completion time
```

Each response can contain:

```
trial ID
stimulus
response
reaction time
correct/incorrect
timestamp
```

---

# 12. Main Features for the Hackathon MVP

Because the hackathon is only 6 hours, the MVP should focus on a complete working flow.

### Researcher

* Registration/login
* Create experiment
* Add trials/tests
* Save experiment
* Publish experiment
* Generate participant link
* View experiment results

### Participant

* Open experiment link
* Anonymous session creation
* Browser calibration
* Reliability score
* Complete experiment
* Reaction-time measurement
* View results

### Analytics

* Participant count
* Average reaction time
* Median reaction time
* Accuracy
* Reliability scores
* Individual anonymous sessions
* Raw measurements
* Reliability-aware measurements
* Low-reliability session flags

---

# 13. Main Differentiating Feature

The key feature of the platform is:

## Browser Reliability + Precision-Aware Research

Instead of treating every browser measurement as equally reliable, the platform first evaluates the participant's environment.

The researcher therefore receives not just:

```
Participant → 247 ms
```

but:

```
Participant P-7X92K

Raw reaction time: 247 ms
Reliability: 93/100
Quality-aware reading: 251 ms
```

This directly addresses the problem of conducting high-precision behavioral experiments on the web.

---

# 14. Product Vision

The long-term vision is to become a browser-based alternative to traditional cognitive experiment software.

Future versions could support:

* Drag-and-drop experiment builder
* Conditional branching
* Advanced randomization
* More experiment types
* Experiment templates
* Adaptive experiments
* Advanced statistical analysis
* Exporting research datasets
* Collaboration between researchers
* More detailed device/browser calibration
* Privacy and consent management
* Research ethics workflows

For the hackathon, however, the focus is on proving the core concept with a polished end-to-end working experiment.
A 
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

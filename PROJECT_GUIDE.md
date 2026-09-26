# CogniLab Project Guide

CogniLab is a web-based cognitive and behavioral experiment platform. Researchers create browser experiments, configure trials, publish participant links, collect anonymous reaction-time data, and inspect results together with browser-environment reliability information.

This document describes the current implementation in this repository. It is intended as a shared onboarding and demo reference for the whole team.

## 1. Product Flow

### Researcher flow

```
Register or log in
        |
        v
Create experiment draft
        |
        v
Add trials
        |
        v
Publish experiment
        |
        v
Share public participant link
        |
        v
View anonymous results and reliability information
```

### Participant flow

```
Open public link
        |
        v
Load published experiment and trials
        |
        v
Create anonymous session
        |
        v
Run browser frame calibration
        |
        v
Calculate and store reliability score
        |
        v
Run trials in the browser
        |
        v
Measure reaction time with performance.now()
        |
        v
Submit raw response data
        |
        v
Complete session and show summary
```

## 2. Technology

### Backend

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Tokens for researcher authentication
- bcryptjs for password hashing
- nanoid for public experiment IDs and anonymous participant codes

### Frontend

- React
- Vite
- React Router
- Axios
- lucide-react icons
- Plain CSS in `client/src/index.css`

## 3. Repository Structure

```
src/
├── app.js                         Express app and route mounting
├── server.js                      MongoDB connection and server startup
├── db/connection.js               Mongoose connection
├── auth/                          Registration, login, user model
├── experiments/                   Experiment routes, controller, service, model
├── trials/                        Trial routes, controller, service, model
├── participants/                  Anonymous sessions and response orchestration
├── responses/                     Response model
├── calibration/                   Reliability scoring logic
├── results/                       Analytics and researcher result routes
├── middleware/auth.middleware.js  JWT protection
└── errors/errorHandler.js         Global error response

client/src/
├── App.jsx                        Frontend routes
├── context/AuthContext.jsx         Login state and local storage session
├── services/api.js                 Central Axios client and API helpers
├── pages/auth/                    Login and registration
├── pages/researcher/              Dashboard, builder, results
└── pages/participant/             Public experiment runner
```

## 4. Backend Architecture

The backend follows this flow:

```
HTTP request
    |
    v
Express route
    |
    v
Controller
    |
    v
Service
    |
    v
Mongoose model / MongoDB
```

### Routes

Routes define the HTTP method, URL, middleware, and controller handler.

### Controllers

Controllers read request parameters/body data, call a service, and return the HTTP response. Business rules should not be added here.

### Services

Services contain business logic such as ownership checks, publishing, session creation, response validation, reliability scoring orchestration, and result aggregation.

### Models

Mongoose models define the MongoDB document shape, required fields, enums, and indexes.

## 5. Database Models

### User

Fields:

```
name
email
password (bcrypt hash, never returned to the client)
createdAt
updatedAt
```

### Experiment

Fields:

```
researcher       User reference
title
description
instructions
status           DRAFT | PUBLISHED | CLOSED
publicId         short public share identifier
publishedAt
createdAt
updatedAt
```

Only the owning researcher can access private experiment endpoints.

Draft experiments cannot be opened through the public experiment endpoint. Publishing assigns a new `publicId` and changes the status to `PUBLISHED`.

### Trial

Fields:

```
experiment       Experiment reference
trialOrder
stimulusType
stimulus         flexible Mixed value, currently often { color: "RED" }
durationMs
expectedResponse
createdAt
updatedAt
```

Trials are returned in ascending `trialOrder`.

### ParticipantSession

Fields:

```
experiment
anonymousCode
reliabilityScore
reliabilitySummary
reliabilityFlags
calibrationData
startedAt
completedAt
status           STARTED | COMPLETED | ABANDONED
createdAt
updatedAt
```

Participants do not create accounts. The anonymous code is generated using `nanoid` and is used for displaying a participant-safe identifier in results.

### Response

Fields:

```
participantSession
trial
response
reactionTimeMs
correct
stimulusTimestamp
responseTimestamp
createdAt
updatedAt
```

The raw reaction time is preserved. It is not overwritten using the reliability score.

## 6. API Reference

The backend runs on `http://localhost:5000` by default. All successful responses use this general format:

```
{
  "success": true,
  "data": {}
}
```

Errors generally use:

```
{
  "success": false,
  "message": "Readable error message"
}
```

### Health

```
GET /api/health
```

Used to confirm that the server is running.

### Authentication

```
POST /auth/register
POST /auth/login
```

Registration body:

```
{
  "name": "Dr. Alex Vance",
  "email": "alex@example.com",
  "password": "secret123"
}
```

Login body:

```
{
  "email": "alex@example.com",
  "password": "secret123"
}
```

Both return a `user` object and a JWT token:

```
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "name": "Dr. Alex Vance",
      "email": "alex@example.com"
    },
    "token": "..."
  }
}
```

Protected researcher requests use:

```http
Authorization: Bearer <token>
```

### Experiments

All routes in this section require a researcher JWT unless marked public.

```http
POST  /experiments
GET   /experiments
GET   /experiments/:id
PATCH /experiments/:id
POST  /experiments/:id/publish
```

Create body:

```
{
  "title": "Visual Reaction Time Study",
  "description": "Measures responses to visual stimuli.",
  "instructions": "Press the expected key as soon as the stimulus appears."
}
```

Public experiment configuration:

```http
GET /experiments/public/:publicId
```

This endpoint only returns experiments whose status is `PUBLISHED`.

### Trials

```http
GET    /experiments/:experimentId/trials
POST   /experiments/:experimentId/trials
PATCH  /experiments/:experimentId/trials/:id
DELETE /experiments/:experimentId/trials/:id
```

Create trial body:

```
{
  "stimulusType": "VISUAL_CIRCLE",
  "stimulus": { "color": "RED" },
  "durationMs": 2000,
  "expectedResponse": "SPACE"
}
```

Creating, updating, and deleting trials requires researcher authentication and ownership of the related experiment. Reading trials is public so the participant runner can load trials for a published experiment.

### Participant sessions

```http
POST /sessions/start/:publicId
POST /sessions/:sessionId/calibration
POST /sessions/:sessionId/responses
POST /sessions/:sessionId/complete
```

Start session response contains the newly created anonymous session. The frontend stores its `_id` in React state for subsequent requests.

Calibration body example:

```
{
  "refreshRate": 120,
  "frameJitter": 2.1,
  "inputLatency": 12,
  "droppedFrames": 0
}
```

Response body example:

```
{
  "trialId": "...",
  "response": "SPACE",
  "reactionTimeMs": 247.25,
  "stimulusTimestamp": 12345.231,
  "responseTimestamp": 12592.481
}
```

### Results

These routes require researcher authentication and verify experiment ownership.

```http
GET /experiments/:experimentId/results
GET /experiments/:experimentId/results/:sessionId
```

The aggregate result includes participant count, average reaction time, average accuracy, reliability distribution, and completed anonymous sessions.

## 7. How Reliability Is Generated

Reliability belongs to an individual `ParticipantSession`. It is not a global browser rating.

### Browser measurement

The participant runner uses `requestAnimationFrame` for approximately 60 frames. It records the time between frames using `performance.now()`.

It derives:

```
refreshRate = round(1000 / averageFrameDelta)
frameJitter = absolute(averageFrameDelta - 16.67)
inputLatency = currently a practical demo value of 12 ms
droppedFrames = currently 0 in the MVP calibration flow
```

The frontend sends these raw values to the backend. The backend does not trust a score sent by the client; it calculates the score from the raw calibration values.

The current browser calibration workflow uses 120 animation frames. It trims the first and last 10% of frame intervals, calculates the standard deviation as frame jitter, and counts intervals longer than 1.5 times the estimated frame interval as dropped-frame candidates. It then asks the participant for five key presses and measures each keydown event to the next `requestAnimationFrame`; the median sample becomes `inputLatency`.

### Backend scoring model

The scoring starts at `100` and applies penalties:

| Signal | Condition | Penalty | Flag |
|---|---:|---:|---|
| Frame jitter | Greater than 4 ms | -10 | No flag for warning range |
| Frame jitter | Greater than 10 ms | -20 | High frame timing jitter detected |
| Dropped frames | 1 to 5 | 3 per frame | No flag |
| Dropped frames | More than 5 | -25 | Multiple dropped frames during calibration |
| Input latency | Greater than 15 ms | -10 | No flag for warning range |
| Input latency | Greater than 30 ms | -20 | Elevated input responsiveness latency |
| Refresh rate | Less than 50 Hz | -15 | Low or unstable display refresh rate |

The final value is rounded and clamped to the range `0` to `100`.

The service also generates qualitative values:

```
displayStability
frameConsistency
inputResponsiveness
```

The score is a practical MVP indicator. It is not scientifically validated and must not be described as equivalent to laboratory equipment. Raw calibration data and raw reaction times remain available for interpretation.

## 8. How Reaction-Time Responses Work

The browser measures reaction time because the backend cannot accurately measure a participant's response with HTTP arrival times. Network latency would contaminate the result.

For each trial:

1. The runner waits through a short fixation period.
2. The stimulus becomes visible.
3. The browser records `stimulusTimestamp = performance.now()`.
4. The participant presses a key.
5. The browser records `responseTimestamp = performance.now()`.
6. The browser calculates `reactionTimeMs = responseTimestamp - stimulusTimestamp`.
7. The runner immediately hides the stimulus and sends the completed measurement to the backend.
8. The backend validates the session and trial relationship, calculates correctness, and stores the response.

The backend never replaces `reactionTimeMs` with a quality-adjusted value. Reliability is stored separately and used to contextualize results and flag low-quality sessions.

The current MVP also stores an explicit `enhancedReactionTimeMs` interpretation for participant and researcher summaries:

```text
enhancedReactionTimeMs = rawReactionTimeMs + ((100 - reliabilityScore) * 0.5 ms)
```

For example, a 247 ms raw response at a reliability score of 93 produces 250.5 ms, displayed as approximately 251 ms. This is a transparent heuristic for demo interpretation, not a scientifically validated correction. Raw timing must always remain the primary measurement.

Correctness is calculated server-side by comparing the submitted response with the trial's `expectedResponse`, case-insensitively.

## 9. Frontend Architecture

`client/src/services/api.js` is the central Axios client. It:

- Uses `VITE_API_URL` when configured, otherwise `http://localhost:5000`.
- Adds `Authorization: Bearer <token>` when a token exists in local storage.
- Clears local auth state when the backend returns `401`.

The React routes are:

```
/login
/register
/dashboard
/experiments/:id
/experiments/:id/results
/experiment/:publicId
```

Researcher pages are protected by `ProtectedRoute`. Participant pages are public and do not require login.

## 10. Running Locally

### Requirements

- Node.js
- MongoDB running locally on `127.0.0.1:27017`

### Environment

The root `.env` currently expects:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/cognilab
JWT_SECRET=your-development-secret
NODE_ENV=development
```

### Start backend

From the repository root:

```bash
npm install
node src/server.js
```

The backend should print:

```
MongoDB connected
Server running at http://localhost:5000
```

The normal `npm run dev` command uses nodemon. On some Windows environments, nodemon can fail with a process-spawn `EPERM`; plain Node is sufficient for the hackathon.

### Start frontend

In another terminal:

```bash
cd client
npm install
npm run dev
```

Vite normally serves the frontend at:

```
http://localhost:5173
```

Optional frontend environment variable:

```env
VITE_API_URL=http://localhost:5000
```

### Production build check

```bash
cd client
npm run build
```

## 11. Manual Demo Checklist

1. Open `/register`.
2. Create a researcher account.
3. Confirm the dashboard loads.
4. Create an experiment draft.
5. Open the experiment builder.
6. Add at least one trial.
7. Publish the experiment.
8. Open the generated participant link in a new tab or private window.
9. Start the anonymous session.
10. Wait for calibration and review the score.
11. Run all trials and submit the expected keyboard responses.
12. Confirm the completion summary appears.
13. Return to the researcher dashboard.
14. Open the experiment results page.
15. Confirm participant count, reaction time, accuracy, and reliability are shown.

## 12. Security and Privacy Decisions

- Researcher passwords are hashed with bcrypt before storage.
- JWTs expire after seven days.
- Researcher experiment queries include the authenticated researcher ID.
- Participants do not create accounts.
- Participant records use anonymous codes rather than names or emails.
- Public endpoints expose only published experiment configuration.
- Reaction-time values are accepted from the browser because that is where the measurement occurs, but trial/session ownership is validated server-side.
- Response trial IDs must belong to the same experiment as the participant session.

## 13. Current MVP Limitations

These are known limitations and should be explained honestly during the demo:

- The calibration score is a heuristic quality indicator, not laboratory-grade validation.
- Browser input latency is measured as event-to-next-render timing, not a direct hardware sensor measurement.
- There is no researcher `/auth/me` endpoint yet, although a frontend helper is defined for it and is currently unused.
- Trial update/delete helpers in the frontend service are not currently used by the UI and should remain aligned with the nested backend route if editing is added later.
- There are no automated integration tests yet.
- The backend starts only after MongoDB is reachable.
- No quality-adjusted reaction-time value is calculated; raw reaction time and reliability are intentionally kept separate.

## 14. Important Design Principle

CogniLab should communicate that browser experiments can be measured and contextualized carefully, not that they magically become identical to laboratory equipment.

The strongest technical story is:

```
Preserve the raw measurement
        +
Preserve the raw calibration data
        +
Generate an explicit session-level quality score
        +
Flag low-reliability sessions for interpretation
```

That keeps the system useful, explainable, and scientifically responsible.

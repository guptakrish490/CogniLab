# CogniLab Deployment

CogniLab deploys as two services:

```
Vercel
  React/Vite frontend
       |
       v
Render
  Express API + MongoDB connection
```

## 1. MongoDB Atlas

Create a MongoDB Atlas cluster before deploying Render.

1. Create a database user.
2. Add `0.0.0.0/0` to the network access list for a hackathon deployment, or restrict it to the Render outbound IPs if available for your plan.
3. Copy the application connection string.
4. Replace the password and database name in the connection string.

Example:

```
mongodb+srv://username:password@cluster.mongodb.net/cognilab
```

## 2. Deploy the backend to Render

Create a new Render Web Service from the GitHub repository.

Use these settings if Render does not automatically detect `render.yaml`:

```
Root directory: repository root
Runtime: Node
Build command: npm install
Start command: node src/server.js
Health check path: /api/health
```

Add these environment variables in Render:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-random-secret>
CLIENT_ORIGIN=https://<your-vercel-domain>.vercel.app
```

After deployment, verify:

```
https://<your-render-service>.onrender.com/api/health
```

Expected response:

```
{
  "status": "ok",
  "message": "CogniLab API Server is running cleanly"
}
```

Copy the Render service URL. Do not include `/api` in `VITE_API_URL` because the application routes are mounted at the root, while only the health route uses `/api/health`.

## 3. Deploy the frontend to Vercel

Create a new Vercel project from the same repository.

Set the project root directory to `client`.

Use:

```
Framework preset: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

Add this Vercel environment variable for Production, Preview, and Development:

```env
VITE_API_URL=https://<your-render-service>.onrender.com
```

The `client/vercel.json` file provides the SPA rewrite needed for routes such as:

```
/login
/dashboard
/experiments/:id
/experiment/:publicId
```

Without that rewrite, refreshing a nested React route can return a Vercel 404.

## 4. Update the Render CORS origin

After Vercel gives you the final domain, set Render's `CLIENT_ORIGIN` to that exact origin:

```
https://your-project.vercel.app
```

Do not add a trailing slash. Redeploy or restart the Render service after changing it.

For a custom Vercel domain, use the custom domain instead of the `.vercel.app` address.

## 5. Production smoke test

Run this sequence after both services deploy:

1. Open the Vercel frontend.
2. Register a researcher account.
3. Create an experiment.
4. Add at least one trial.
5. Publish the experiment.
6. Open the public participant link in an incognito window.
7. Complete browser calibration.
8. Complete all trials.
9. Return to the researcher Results page.
10. Confirm session status, response count, raw reaction time, enhanced reaction time, and individual responses.

## 6. Common deployment problems

### Frontend still calls localhost

Set `VITE_API_URL` in Vercel and redeploy. Vite environment variables are embedded at build time, so changing the variable requires a new deployment.

### CORS error in the browser

Set Render `CLIENT_ORIGIN` to the exact Vercel origin and restart Render.

### Render health check fails

Confirm MongoDB Atlas allows the Render connection and that `MONGODB_URI` is valid. The API starts listening only after MongoDB connects.

### Atlas connection troubleshooting

If the API reports `querySrv ECONNREFUSED _mongodb._tcp...`, the failure is DNS/network resolution, not an application authentication error. Check these items:

1. In Atlas, open **Database > Connect > Drivers**, copy the current Node.js connection string, and replace `<password>` with the database user's password.
2. URL-encode reserved password characters. For example, `-` is valid as-is, while `@` becomes `%40`, `#` becomes `%23`, and `/` becomes `%2F`.
3. In **Security > Network Access**, add the IP address used by the deployment service. For a temporary hackathon test, `0.0.0.0/0` permits access from anywhere, but it should be restricted for a real deployment.
4. Confirm the Atlas database user exists and has read/write access to `cognilab`.
5. If the local network blocks `mongodb+srv` DNS lookups, use Atlas's **Standard connection string** option and copy the non-SRV URI instead.

Never commit `.env` or paste the database password into source control. If a password was exposed publicly, rotate it in Atlas immediately.

### Refreshing a frontend route returns 404

Confirm Vercel is using the `client` directory as the project root and that `client/vercel.json` is committed.

### Cold start delay

Render free services can sleep when idle. The first request may take longer while the service wakes up.

## 7. Secrets

Never commit:

- `.env`
- MongoDB passwords
- JWT secrets
- Production API keys

Use `.env.example` only as a variable-name reference.

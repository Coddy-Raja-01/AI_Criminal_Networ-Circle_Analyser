# SIH26189 Criminal Network Analysis

## Local development

1. Copy `.env.example` to `.env`.
2. Set a strong `API_KEY` with at least 32 characters and a PostgreSQL password.
3. Start Docker Desktop.
4. Run:

```powershell
docker compose up --build
```

Open `http://localhost:8080`. The API is available at `http://localhost:8000` and Swagger is at `http://localhost:8000/docs`.

Without Docker, start the services separately:

```powershell
Push-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000

Push-Location ..\frontend
npm install
npm run dev -- --host 0.0.0.0
```

Then open `http://localhost:5173`.

## GitHub and production deployment

GitHub stores the source code but does not run Docker Compose, FastAPI, or PostgreSQL. Deploy the stack to a Docker-capable host such as Railway, Render, Azure, Fly.io, or a private server. Keep the frontend and backend together behind the Nginx proxy in `frontend/` so `API_KEY` remains server-side.

Configure these variables in the deployment provider's secret/environment settings. Do not paste this block into PowerShell; it is a list of dashboard variable names and values:

```text
POSTGRES_DB=criminal_network
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-random-password>
API_KEY=<strong-random-value-at-least-32-characters>
CORS_ALLOWED_ORIGINS=https://<your-frontend-domain>
```

For local PowerShell only, set a variable with PowerShell syntax:

```powershell
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173"
```

For Vercel, set these server-side variables in **Project Settings > Environment Variables**:

```text
BACKEND_URL=https://<your-backend-domain>
API_KEY=<the-same-private-key-configured on the backend>
```

The Vercel function in `frontend/api/[...path].ts` forwards `/api/...` requests to `BACKEND_URL` and adds `API_KEY` on the server. Do not create a `VITE_API_KEY` variable: Vite variables are exposed to browser users. Set the Vercel project root to `frontend`; its `api/` directory is deployed automatically with the frontend.

Never commit `.env`, database files, or API keys. `.env.example` is the safe template to commit. Do not deploy this frontend as a plain GitHub Pages site: a static site cannot securely forward requests with the private API key or run the FastAPI backend.

Before pushing, verify that secrets are not tracked:

```powershell
git check-ignore -v .env
git ls-files .env
```

The second command must produce no output.

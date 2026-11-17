# LEAD Client Demo

Static, database-free demonstration of LEAD. All identities and records are synthetic. Data is stored only in the visitor's browser under `lead-client-demo-v1`.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run typecheck
npm run build
```

The static output is written to `out/`.

## Shutdown

Set `NEXT_PUBLIC_DEMO_ENABLED=false` in the demo Vercel project and redeploy. For immediate shutdown, enable Vercel Deployment Protection or remove the demo domain. Set `NEXT_PUBLIC_DEMO_EXPIRES_AT` to an ISO timestamp for scheduled expiry.

Never add MongoDB, production API URLs, real contact details, or production authentication secrets to this project.

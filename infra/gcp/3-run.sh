#!/usr/bin/env bash
# Step 3 of 3: Cloud Run service widoo-api and migration job, with their configuration.
# Creates them with Google sample images, which the deploy-staging workflow replaces; later runs
# update the configuration and keep the deployed image. Usage: ./3-run.sh [--dry-run] [--yes]
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./common.sh
parse_args "$@"

# Peer address of the Cloud Run front end, trusted for X-Forwarded-For (rate limit per client).
# To confirm after the first deployment (infra/README.md).
: "${TRUST_PROXY:=linklocal}"
# Browser origins of the admin; none in staging yet.
: "${CORS_ORIGINS:=}"

announce \
  "creates or updates the public service $SERVICE and the job $MIGRATION_JOB; each update of the service creates a revision that receives the traffic" \
  "gcloud run services update-traffic $SERVICE --region=$REGION --to-revisions=<previous revision>=100"

network=(--network="$NETWORK" --subnet="$SUBNET" --vpc-egress=private-ranges-only)
# Separator | instead of the comma, which lists of origins or proxies contain.
env_vars="^|^FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID|SENTRY_ENVIRONMENT=$ENVIRONMENT"
env_vars+="|TRUST_PROXY=$TRUST_PROXY|CORS_ORIGINS=$CORS_ORIGINS"
secrets=DATABASE_URL=database-url:latest
if has_secret_value sentry-dsn; then
  secrets+=,SENTRY_DSN=sentry-dsn:latest
else
  echo 'sentry-dsn has no value: no error report. Run this script again once it is set.'
fi

step "Service $SERVICE"
# TCP startup probe and no liveness probe: /v1/health answers 503 while the database is down,
# and restarting the instances would not bring it back. Commas inside values are intended.
# shellcheck disable=SC2054
service=(--region="$REGION" --service-account="$RUNTIME_SA" "${network[@]}"
  --execution-environment=gen2 --cpu=1 --memory=512Mi --cpu-boost --concurrency=80
  --timeout=60s --min-instances=0 --max-instances=2
  --startup-probe=tcpSocket.port=8080,periodSeconds=5,timeoutSeconds=5,failureThreshold=12
  --update-env-vars="$env_vars" --update-secrets="$secrets")
if exists gcloud run services describe "$SERVICE" --region="$REGION"; then
  run gcloud run services update "$SERVICE" "${service[@]}"
else
  run gcloud run deploy "$SERVICE" --image=us-docker.pkg.dev/cloudrun/container/hello \
    --port=8080 "${service[@]}"
fi
# Public API: the app calls it without Google identity; Firebase tokens protect the routes.
run gcloud run services add-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member=allUsers --role=roles/run.invoker --format=none

step "Job $MIGRATION_JOB"
# Same image as the service; the workflow runs it before each deployment.
# shellcheck disable=SC2054
job=(--region="$REGION" --service-account="$MIGRATION_SA" "${network[@]}"
  --command=node --args=--enable-source-maps,dist/migrate.js
  --cpu=1 --memory=512Mi --tasks=1 --max-retries=0 --task-timeout=10m
  --update-secrets=DATABASE_URL=database-url:latest)
if exists gcloud run jobs describe "$MIGRATION_JOB" --region="$REGION"; then
  run gcloud run jobs update "$MIGRATION_JOB" "${job[@]}"
else
  run gcloud run jobs create "$MIGRATION_JOB" --image=us-docker.pkg.dev/cloudrun/container/job \
    "${job[@]}"
fi

step 'Deployer rights, limited to the service and the job'
run gcloud run services add-iam-policy-binding "$SERVICE" --region="$REGION" \
  --member="serviceAccount:$DEPLOYER_SA" --role=roles/run.developer --format=none
run gcloud run jobs add-iam-policy-binding "$MIGRATION_JOB" --region="$REGION" \
  --member="serviceAccount:$DEPLOYER_SA" --role=roles/run.developer --format=none

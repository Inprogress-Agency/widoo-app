#!/usr/bin/env bash
# Step 2 of 3: VPC, Cloud SQL Postgres 16 on a private IP, database, user, secrets.
# Idempotent: creates what is missing and leaves the rest. Usage: ./2-database.sh [--dry-run] [--yes]
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./common.sh
parse_args "$@"

announce \
  "creates the network $NETWORK, the Cloud SQL instance $SQL_INSTANCE ($SQL_TIER, private IP only, daily backups, PITR 7 days; about 15 minutes), the database $DB_NAME, the user $DB_USER and the secrets database-url and sentry-dsn" \
  "the instance has deletion protection: gcloud sql instances patch $SQL_INSTANCE --no-deletion-protection, then delete; a deleted instance loses its data and backups"

step 'Network'
if ! exists gcloud compute networks describe "$NETWORK"; then
  run gcloud compute networks create "$NETWORK" --subnet-mode=custom
fi
# Cloud Run instances take their addresses here (Direct VPC egress, /26 at least).
if ! exists gcloud compute networks subnets describe "$SUBNET" --region="$REGION"; then
  run gcloud compute networks subnets create "$SUBNET" --network="$NETWORK" --region="$REGION" \
    --range="$SUBNET_RANGE" --enable-private-ip-google-access
fi
# Private services access: the range where Google places the private IP of Cloud SQL.
if ! exists gcloud compute addresses describe "$PSA_RANGE" --global; then
  run gcloud compute addresses create "$PSA_RANGE" --global --purpose=VPC_PEERING \
    --prefix-length=20 --network="$NETWORK"
fi
if ! listed gcloud services vpc-peerings list --network="$NETWORK" \
  --service=servicenetworking.googleapis.com --format='value(peering)'; then
  run gcloud services vpc-peerings connect --service=servicenetworking.googleapis.com \
    --network="$NETWORK" --ranges="$PSA_RANGE"
fi

step 'Cloud SQL'
# Enterprise edition: Postgres 16 defaults to Enterprise Plus, which has no shared-core tier.
# TLS required; no public IP, so only the VPC reaches it. The postgres user keeps no password.
if ! exists gcloud sql instances describe "$SQL_INSTANCE"; then
  run gcloud sql instances create "$SQL_INSTANCE" --region="$REGION" \
    --database-version=POSTGRES_16 --edition=enterprise --tier="$SQL_TIER" \
    --availability-type=zonal --storage-type=SSD --storage-size=10GB --storage-auto-increase \
    --network="$NETWORK" --no-assign-ip --ssl-mode=ENCRYPTED_ONLY \
    --backup-start-time=01:00 --retained-backups-count=7 \
    --enable-point-in-time-recovery --retained-transaction-log-days=7 \
    --maintenance-window-day=SUN --maintenance-window-hour=2 --deletion-protection
fi
if ! exists gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE"; then
  run gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE"
fi

step 'Secrets'
# Values stay in the region. SENTRY_DSN is optional: the API sends no report without it.
for secret in database-url sentry-dsn; do
  if ! exists gcloud secrets describe "$secret"; then
    run gcloud secrets create "$secret" --replication-policy=user-managed --locations="$REGION"
  fi
done
grant_secret() {
  run gcloud secrets add-iam-policy-binding "$1" --member="serviceAccount:$2" \
    --role=roles/secretmanager.secretAccessor --format=none
}
grant_secret database-url "$RUNTIME_SA"
grant_secret database-url "$MIGRATION_SA"
grant_secret sentry-dsn "$RUNTIME_SA"

step "User $DB_USER and secret database-url"
# Built-in users belong to cloudsqlsuperuser, which may create the postgis and pg_trgm extensions
# of the first migration. The password is generated here and travels through file descriptors
# only: never printed, never a command-line argument (gcloud writes its arguments to its logs).
set_database_url() {
  local password token url method response operation ip
  password=$(openssl rand -hex 24)
  token=$(gcloud auth print-access-token)
  url="https://sqladmin.googleapis.com/v1/projects/$PROJECT_ID/instances/$SQL_INSTANCE/users"
  method=POST
  if listed gcloud sql users list --instance="$SQL_INSTANCE" --filter="name=$DB_USER" \
    --format='value(name)'; then
    method=PUT
    url+="?name=$DB_USER"
  fi
  echo "+ curl -X $method $url (generated password in the request body, not shown)"
  response=$(curl -fsS -X "$method" "$url" -H 'Content-Type: application/json' \
    -H @<(printf 'Authorization: Bearer %s\n' "$token") \
    --data-binary @<(printf '{"name":"%s","password":"%s"}' "$DB_USER" "$password"))
  operation=$(sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' <<<"$response")
  run gcloud sql operations wait "$operation" --timeout=300 --format=none
  ip=$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(ipAddresses[0].ipAddress)')
  echo '+ gcloud secrets versions add database-url --data-file=- (URL on stdin, not shown)'
  printf 'postgres://%s:%s@%s:5432/%s?sslmode=require' "$DB_USER" "$password" "$ip" "$DB_NAME" |
    gcloud secrets versions add database-url --data-file=- --format=none
}
if has_secret_value database-url; then
  echo 'database-url already has a value: user and password left unchanged.'
elif [[ $DRY_RUN == true ]]; then
  echo "+ (generate a password, set it on $DB_USER, store the URL in database-url)"
else
  set_database_url
fi

#!/usr/bin/env bash
# Step 4 of 4: Cloud Scheduler jobs that call the internal routes of the API with the service token.
# Run it after 3-run.sh, and again after each rotation of internal-token (infra/README.md).
# Idempotent: creates a missing job, realigns an existing one. Usage: ./4-scheduler.sh [--dry-run] [--yes]
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./common.sh
parse_args "$@"

# Wall-clock time of the nightly jobs: 03:00 in Paris, after the Cloud SQL backup of 01:00 UTC
# and outside its maintenance window (Sunday, 02:00 UTC).
TIME_ZONE=Europe/Paris
RECOMMENDATION_JOB=widoo-recommendation-nightly

announce \
  "creates or updates the Cloud Scheduler job $RECOMMENDATION_JOB in $REGION: POST /v1/internal/recommendation on $SERVICE every night at 03:00 $TIME_ZONE, with the value of internal-token in its Authorization header" \
  "gcloud scheduler jobs pause $RECOMMENDATION_JOB --location=$REGION (resume to restore), or delete it; the API keeps its last computed components"

if [[ $DRY_RUN == true ]]; then
  service_url='<service URL>'
else
  service_url=$(gcloud run services describe "$SERVICE" --region="$REGION" \
    --format='value(status.url)' 2>/dev/null) || service_url=''
  [[ -n $service_url ]] || {
    echo "Service $SERVICE not found: run 3-run.sh first." >&2
    exit 1
  }
  has_secret_value internal-token || {
    echo 'internal-token has no value: run 2-database.sh first.' >&2
    exit 1
  }
  # In variables only: never printed, never a command-line argument.
  internal_token=$(gcloud secrets versions access latest --secret=internal-token)
  access_token=$(gcloud auth print-access-token)
fi

# Job resource of the Cloud Scheduler API, on stdout. printf, a builtin, rather than a here-document,
# which the bash of macOS writes to a temporary file. Body {} (base64 e30=) with its Content-Type:
# Fastify refuses an empty JSON body. No oidcToken nor oauthToken: either would replace the header.
# Retries: twice, 5 minutes apart at least, for a cold start or a database restart; the
# recomputation is idempotent. Deadline beyond the 60 s timeout of the service.
job_json() {
  local name=$1 uri=$2 schedule=$3 description=$4 token=$5
  printf '{"name":"%s","description":"%s","schedule":"%s","timeZone":"%s",' \
    "$name" "$description" "$schedule" "$TIME_ZONE"
  printf '"attemptDeadline":"90s","retryConfig":{"retryCount":2,"minBackoffDuration":"300s"},'
  printf '"httpTarget":{"uri":"%s","httpMethod":"POST","body":"e30=",' "$uri"
  printf '"headers":{"Content-Type":"application/json","Authorization":"Bearer %s"}}}\n' "$token"
}

# Creates or updates one job that POSTs {} to an internal route with the service token. Through
# the REST API rather than gcloud scheduler, whose --headers would put the token on the command
# line, which gcloud writes to its logs. The response, which holds the header, is not printed.
# Reused by the later internal jobs (/internal/recompute, #56): one call each, below.
schedule_internal_job() {
  local job=$1 path=$2 schedule=$3 description=$4
  local parent="projects/$PROJECT_ID/locations/$REGION"
  local api=https://cloudscheduler.googleapis.com/v1 method url
  if exists gcloud scheduler jobs describe "$job" --location="$REGION"; then
    method=PATCH
    url="$api/$parent/jobs/$job?updateMask=description,schedule,timeZone,attemptDeadline,retryConfig,httpTarget"
  else
    method=POST
    url="$api/$parent/jobs"
  fi
  echo "+ curl -X $method $url (job below, internal-token in the Authorization header, not shown)"
  job_json "$parent/jobs/$job" "$service_url$path" "$schedule" "$description" '<internal-token>'
  [[ $DRY_RUN == true ]] && return
  curl -fsS -o /dev/null -X "$method" "$url" -H 'Content-Type: application/json' \
    -H @<(printf 'Authorization: Bearer %s\n' "$access_token") \
    --data-binary @<(job_json "$parent/jobs/$job" "$service_url$path" "$schedule" "$description" \
      "$internal_token") || {
    echo "Cloud Scheduler refused the job (response not shown, it may hold the token). Check that 1-foundation.sh enabled cloudscheduler.googleapis.com, then run this script again." >&2
    exit 1
  }
  # Named fields only: a plain describe would print the header, hence the token.
  run gcloud scheduler jobs describe "$job" --location="$REGION" \
    --format='table(state,schedule,timeZone,httpTarget.uri)'
}

step "Job $RECOMMENDATION_JOB"
schedule_internal_job "$RECOMMENDATION_JOB" /v1/internal/recommendation '0 3 * * *' \
  'Nightly recomputation of the recommendation components (Widoo API)'

#!/usr/bin/env bash
# Loads, or removes, the demo dataset of #32 (Paris, ten routes) in the staging database (#287).
# One execution of the migration job with overridden arguments: same image as the service, same
# network, same DATABASE_URL secret; no new resource, no new right. The command in the image
# refuses on its own outside the widoo-staging project and without DEMO_SEED=staging.
# Run it after the deployment of the commit that ships dist/demo-seed.js, never during one.
# Usage: ./demo-seed.sh load|remove [--dry-run] [--yes]
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./common.sh

action=${1:-}
case $action in
  load | remove) shift ;;
  *)
    echo "Usage: $0 load|remove [--dry-run] [--yes]" >&2
    exit 2
    ;;
esac
parse_args "$@"

# Staging only, whatever PROJECT_ID says: the image would refuse anyway, this stops it earlier.
if [[ $PROJECT_ID != widoo-staging ]]; then
  echo "The demo dataset is for widoo-staging only, not $PROJECT_ID." >&2
  exit 1
fi

if [[ $action == load ]]; then
  announce \
    "writes the demo dataset (Paris, 10 routes, their places, steps and Unsplash photos, 2 fictitious authors) to the staging database; a second run leaves the same state" \
    "./demo-seed.sh remove"
else
  announce \
    "deletes the demo dataset from the staging database: the 10 routes with their steps and photos, the demo places no other route uses, the 2 fictitious authors; nothing else" \
    "./demo-seed.sh load"
fi

step "Execution of $MIGRATION_JOB: node dist/demo-seed.js $action"
run gcloud run jobs execute "$MIGRATION_JOB" --region="$REGION" \
  --args="--enable-source-maps,dist/demo-seed.js,$action" \
  --update-env-vars=DEMO_SEED=staging --wait

# Public, read-only endpoint: the routes of a zone that holds the ten demo routes.
step 'Routes of the demo zone'
zone='bbox=2.32,48.82,2.45,48.9'
if [[ $DRY_RUN == true ]]; then
  echo "? curl -fsS <service URL>/v1/routes/search/count?$zone"
else
  url=$(gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)')
  curl -fsS "$url/v1/routes/search/count?$zone"
  echo
fi
case $action in
  load) echo 'Expected: {"count":10}' ;;
  remove) echo 'Expected: {"count":0}, unless other routes were created in the zone' ;;
esac

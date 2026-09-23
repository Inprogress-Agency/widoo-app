#!/usr/bin/env bash
# Step 1 of 3: APIs, Artifact Registry, service accounts, Workload Identity Federation for GitHub.
# Idempotent: creates what is missing and leaves the rest. Usage: ./1-foundation.sh [--dry-run] [--yes]
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./common.sh
parse_args "$@"

announce \
  "enables the APIs; creates the Docker repository $AR_REPOSITORY, three service accounts without keys, and the Workload Identity pool $WIF_POOL through which deploy-staging.yml on main acts as $DEPLOYER_SA" \
  "delete what was created (infra/README.md); enabled APIs cost nothing"

step 'APIs'
run gcloud services enable run.googleapis.com artifactregistry.googleapis.com \
  sqladmin.googleapis.com secretmanager.googleapis.com compute.googleapis.com \
  servicenetworking.googleapis.com iam.googleapis.com iamcredentials.googleapis.com \
  sts.googleapis.com

step 'Artifact Registry'
if ! exists gcloud artifacts repositories describe "$AR_REPOSITORY" --location="$REGION"; then
  run gcloud artifacts repositories create "$AR_REPOSITORY" --location="$REGION" \
    --repository-format=docker --description='Widoo API images'
fi
# Keeps the 10 most recent images (rollback targets) and deletes the others after 30 days.
run gcloud artifacts repositories set-cleanup-policies "$AR_REPOSITORY" --location="$REGION" \
  --policy=artifact-cleanup.json --no-dry-run --format=none

step 'Service accounts'
create_service_account() {
  if ! exists gcloud iam service-accounts describe "$1@$PROJECT_ID.iam.gserviceaccount.com"; then
    run gcloud iam service-accounts create "$1" --display-name="$2"
  fi
}
# No project-level role for any of them: each role is granted on one resource.
create_service_account widoo-api-run 'Widoo API, Cloud Run service'
create_service_account widoo-api-migrate 'Widoo API migrations, Cloud Run job'
create_service_account widoo-deployer 'GitHub Actions deploy-staging.yml'

# The deployer pushes images and deploys as the two runtime accounts. Its Cloud Run role is
# granted on the service and the job themselves (3-run.sh).
run gcloud artifacts repositories add-iam-policy-binding "$AR_REPOSITORY" --location="$REGION" \
  --member="serviceAccount:$DEPLOYER_SA" --role=roles/artifactregistry.writer --format=none
for account in "$RUNTIME_SA" "$MIGRATION_SA"; do
  run gcloud iam service-accounts add-iam-policy-binding "$account" \
    --member="serviceAccount:$DEPLOYER_SA" --role=roles/iam.serviceAccountUser --format=none
done

step 'Workload Identity Federation'
if ! exists gcloud iam workload-identity-pools describe "$WIF_POOL" --location=global; then
  run gcloud iam workload-identity-pools create "$WIF_POOL" --location=global \
    --display-name='GitHub Actions'
fi
# Only the deploy-staging workflow of main, in the staging environment, of this repository.
mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id'
condition="assertion.repository_id == \"$GITHUB_REPOSITORY_ID\" && assertion.ref == \"refs/heads/main\" && assertion.environment == \"$ENVIRONMENT\" && assertion.workflow_ref == \"$GITHUB_WORKFLOW_REF\""
provider=(--location=global --workload-identity-pool="$WIF_POOL")
if exists gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" "${provider[@]}"; then
  run gcloud iam workload-identity-pools providers update-oidc "$WIF_PROVIDER" "${provider[@]}" \
    --attribute-mapping="$mapping" --attribute-condition="$condition"
else
  run gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" "${provider[@]}" \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping="$mapping" --attribute-condition="$condition"
fi
pool="projects/$(project_number)/locations/global/workloadIdentityPools/$WIF_POOL"
run gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_SA" \
  --role=roles/iam.workloadIdentityUser --format=none \
  --member="principalSet://iam.googleapis.com/$pool/attribute.repository_id/$GITHUB_REPOSITORY_ID"

step "Variables of the GitHub environment $ENVIRONMENT (not secrets), to set once"
cat <<EOF
gh variable set GCP_PROJECT_ID --env $ENVIRONMENT --body $PROJECT_ID
gh variable set GCP_REGION --env $ENVIRONMENT --body $REGION
gh variable set GCP_WIF_PROVIDER --env $ENVIRONMENT --body $pool/providers/$WIF_PROVIDER
gh variable set GCP_DEPLOYER_SA --env $ENVIRONMENT --body $DEPLOYER_SA
EOF

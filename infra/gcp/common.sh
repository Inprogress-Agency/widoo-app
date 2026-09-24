# shellcheck shell=bash disable=SC2034 # settings used by the scripts that source this file
# Settings and helpers shared by the infra/gcp scripts: sourced, never run directly.
# Every setting below can be overridden from the environment (PROJECT_ID=... ./1-foundation.sh).
# Compatible with the bash 3.2 of macOS.

# --- Target ---------------------------------------------------------------------------------
: "${PROJECT_ID:=widoo-staging}"
: "${REGION:=europe-west9}"
# GitHub environment allowed to deploy, and SENTRY_ENVIRONMENT of the API.
: "${ENVIRONMENT:=staging}"
# Firebase project whose ID tokens the API accepts (Firebase added to the GCP project).
: "${FIREBASE_PROJECT_ID:=$PROJECT_ID}"

# --- GitHub: immutable repository id, so that a renamed or recreated repository gets nothing ---
: "${GITHUB_REPOSITORY_ID:=1379731427}" # Inprogress-Agency/widoo-app
: "${GITHUB_WORKFLOW_REF:=Inprogress-Agency/widoo-app/.github/workflows/deploy-staging.yml@refs/heads/main}"

# --- Resources ------------------------------------------------------------------------------
AR_REPOSITORY=widoo
NETWORK=widoo-vpc
SUBNET=widoo-run
SUBNET_RANGE=10.10.0.0/24
PSA_RANGE=widoo-google-services
SQL_INSTANCE=widoo-db
SQL_TIER=db-f1-micro
DB_NAME=widoo
DB_USER=widoo
SERVICE=widoo-api
MIGRATION_JOB=widoo-api-migrate
WIF_POOL=github
WIF_PROVIDER=widoo-app
RUNTIME_SA="widoo-api-run@$PROJECT_ID.iam.gserviceaccount.com"
MIGRATION_SA="widoo-api-migrate@$PROJECT_ID.iam.gserviceaccount.com"
DEPLOYER_SA="widoo-deployer@$PROJECT_ID.iam.gserviceaccount.com"

# Every gcloud call targets PROJECT_ID, whatever the local default, and never prompts.
export CLOUDSDK_CORE_PROJECT="$PROJECT_ID"
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

DRY_RUN=false
ASSUME_YES=false

parse_args() {
  local arg
  for arg in "$@"; do
    case $arg in
      --dry-run) DRY_RUN=true ;;
      --yes) ASSUME_YES=true ;;
      *)
        echo "Usage: $0 [--dry-run] [--yes]" >&2
        exit 2
        ;;
    esac
  done
}

# Prints a command line after the prefix $1, quoting only the arguments that need it.
show() {
  local arg line=$1
  shift
  for arg in "$@"; do
    if [[ $arg =~ ^[A-Za-z0-9_./:=,@%+-]+$ ]]; then
      line+=" $arg"
    else
      line+=" '${arg//\'/\'\\\'\'}'"
    fi
  done
  echo "$line"
}

# Prints the command, then runs it unless --dry-run.
run() {
  show + "$@"
  [[ $DRY_RUN == true ]] || "$@"
}

# True when the describe command succeeds. --dry-run assumes the resource is missing.
exists() {
  if [[ $DRY_RUN == true ]]; then
    show '?' "$@"
    return 1
  fi
  "$@" >/dev/null 2>&1
}

# True when the list command prints something. --dry-run assumes it prints nothing.
listed() {
  if [[ $DRY_RUN == true ]]; then
    show '?' "$@"
    return 1
  fi
  [[ -n $("$@" 2>/dev/null) ]]
}

step() {
  printf '\n== %s\n' "$*"
}

# Announces target, effect and rollback (CLAUDE.md, remote actions), then asks before any remote change.
announce() {
  local account='(not checked in dry run)'
  if [[ $DRY_RUN == false ]]; then
    command -v gcloud >/dev/null || {
      echo 'gcloud not found: https://cloud.google.com/sdk/docs/install' >&2
      exit 1
    }
    account=$(gcloud config get-value account 2>/dev/null)
  fi
  cat <<EOF
Target:   project $PROJECT_ID, region $REGION, as $account
Effect:   $1
Rollback: $2
EOF
  if [[ $DRY_RUN == true ]]; then
    echo 'Dry run: the commands are printed, none is executed.'
    return
  fi
  [[ $ASSUME_YES == true ]] && return
  local answer
  read -r -p 'Continue? [y/N] ' answer
  [[ $answer == y || $answer == Y ]] || {
    echo 'Aborted.'
    exit 1
  }
}

project_number() {
  if [[ $DRY_RUN == true ]]; then
    echo '<PROJECT_NUMBER>'
  else
    gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)'
  fi
}

# True when the secret has an enabled version (a value Cloud Run can read).
has_secret_value() {
  listed gcloud secrets versions list "$1" --filter=state:ENABLED --limit=1 --format='value(name)'
}

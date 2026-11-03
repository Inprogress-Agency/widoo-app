#!/usr/bin/env bash
# Step 5 of 5: Cloud Storage buckets of the photos (#47), their rights, and the variables of the API.
# Run it after 3-run.sh. Idempotent: creates the missing buckets and realigns their settings, rights
# and the variables of the service. Usage: ./5-media.sh [--dry-run] [--yes]
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source-path=SCRIPTDIR
source ./common.sh
parse_args "$@"

# Public URL of the processed photos, which the API puts before each path (MEDIA_PUBLIC_BASE_URL).
: "${MEDIA_PUBLIC_BASE_URL:=https://storage.googleapis.com/$MEDIA_BUCKET}"

announce \
  "creates the private bucket $MEDIA_UPLOAD_BUCKET (originals sent by signed URL, deleted after a day) and the public bucket $MEDIA_BUCKET (processed photos, readable by anyone who has their URL, not listable); lets $RUNTIME_SA write both and sign URLs as itself; sets MEDIA_UPLOAD_BUCKET, MEDIA_BUCKET and MEDIA_PUBLIC_BASE_URL on $SERVICE, which creates a revision" \
  "gcloud run services update $SERVICE --region=$REGION --remove-env-vars=MEDIA_UPLOAD_BUCKET,MEDIA_BUCKET,MEDIA_PUBLIC_BASE_URL (the photo routes answer 503 again, stored photos are no longer served); deleting a bucket deletes its photos for good (infra/README.md)"

step 'API'
run gcloud services enable storage.googleapis.com

# Both buckets in the region of the API, IAM only (no ACL), and without soft delete: a photo
# deleted is gone at once (Securite-et-RGPD), never kept seven more days.
bucket_settings=(--uniform-bucket-level-access --soft-delete-duration=0)

step "Bucket $MEDIA_UPLOAD_BUCKET (originals, private)"
# Public access prevented: the originals keep their EXIF, GPS position included. Lifecycle: an
# upload never confirmed, or whose deletion failed, is deleted after a day.
if exists gcloud storage buckets describe "gs://$MEDIA_UPLOAD_BUCKET"; then
  run gcloud storage buckets update "gs://$MEDIA_UPLOAD_BUCKET" "${bucket_settings[@]}" \
    --public-access-prevention --lifecycle-file=upload-lifecycle.json
else
  run gcloud storage buckets create "gs://$MEDIA_UPLOAD_BUCKET" --location="$REGION" \
    --default-storage-class=STANDARD "${bucket_settings[@]}" \
    --public-access-prevention --lifecycle-file=upload-lifecycle.json
fi

step "Bucket $MEDIA_BUCKET (processed photos, public)"
if exists gcloud storage buckets describe "gs://$MEDIA_BUCKET"; then
  run gcloud storage buckets update "gs://$MEDIA_BUCKET" "${bucket_settings[@]}"
else
  run gcloud storage buckets create "gs://$MEDIA_BUCKET" --location="$REGION" \
    --default-storage-class=STANDARD "${bucket_settings[@]}"
fi
# Read by anyone who has the URL of a photo, never listed: legacyObjectReader carries
# storage.objects.get alone, where objectViewer would also list every photo of the bucket.
run gcloud storage buckets add-iam-policy-binding "gs://$MEDIA_BUCKET" \
  --member=allUsers --role=roles/storage.legacyObjectReader --format=none

step "Rights of $RUNTIME_SA"
# Writes, reads and deletes the objects of both buckets, nothing else of them.
for bucket in "$MEDIA_UPLOAD_BUCKET" "$MEDIA_BUCKET"; do
  run gcloud storage buckets add-iam-policy-binding "gs://$bucket" \
    --member="serviceAccount:$RUNTIME_SA" --role=roles/storage.objectUser --format=none
done
# The account has no key: it signs the upload URLs through signBlob of the IAM Credentials API,
# on itself only (iamcredentials.googleapis.com, enabled by 1-foundation.sh).
run gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$RUNTIME_SA" --role=roles/iam.serviceAccountTokenCreator --format=none

step "Variables of $SERVICE"
if [[ $DRY_RUN == false ]] && ! exists gcloud run services describe "$SERVICE" --region="$REGION"; then
  echo "Service $SERVICE not found: run 3-run.sh first." >&2
  exit 1
fi
# Not secrets. --update-env-vars keeps the other variables, as 3-run.sh keeps these ones.
run gcloud run services update "$SERVICE" --region="$REGION" \
  --update-env-vars="MEDIA_UPLOAD_BUCKET=$MEDIA_UPLOAD_BUCKET,MEDIA_BUCKET=$MEDIA_BUCKET,MEDIA_PUBLIC_BASE_URL=$MEDIA_PUBLIC_BASE_URL"

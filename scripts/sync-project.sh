#!/usr/bin/env bash
# Synchronise le Status du Project « Widoo — MVP » avec les labels et l'état des issues :
#   issue ouverte  status:ready  → Prêts     } seulement depuis un statut vide, Cadrage ou Prêts :
#   issue ouverte  needs-design  → Cadrage   } un ticket parti en développement ne recule jamais
#   issue fermée   type:design   → Terminés  (quel que soit le statut courant)
# Un item En cours, À review, À déployer ou Terminés garde son statut malgré status:ready ou
# needs-design : le script le liste comme conservé. En cours et À review sont posés par CODE,
# À déployer par le workflow intégré, Terminés après vérification en staging.
# --dry-run affiche les mêmes lignes qu'un vrai lancement, sans rien écrire. Idempotent.
# Usage : scripts/sync-project.sh [--dry-run]
# Chargé par source (validate-design.sh, sync-project.test.sh), il ne définit que les règles.
set -euo pipefail

# Règles jq, testées hors ligne par scripts/sync-project.test.sh.
# rule : statut cible d'une issue et label qui le donne. decide : same (déjà au statut cible),
# set (à changer) ou keep (conservé : ticket parti en développement).
# shellcheck disable=SC2016 # programme jq : ses $ ne sont pas des variables du shell
SYNC_RULES='
def rule: (.labels | map(.name? // .)) as $l
  | if .state == "CLOSED" and ($l | index("type:design")) then {target: "Terminés", label: "type:design"}
    elif .state == "OPEN" and ($l | index("status:ready")) then {target: "Prêts", label: "status:ready"}
    elif .state == "OPEN" and ($l | index("needs-design")) then {target: "Cadrage", label: "needs-design"}
    else empty end;
def unstarted: . == null or . == "" or . == "-" or . == "Cadrage" or . == "Prêts";
def decide($current; $target):
  if $current == $target then "same"
  elif $target == "Terminés" or ($current | unstarted) then "set"
  else "keep" end;
'

# $1 = statut courant (vide ou « - » si aucun), $2 = statut cible → same, set ou keep
status_decision() { jq -rn --arg c "$1" --arg t "$2" "$SYNC_RULES"' decide($c; $t)'; }

# Entrée sur stdin : les issues (gh issue list --json number,state,labels) puis les items du
# Project (gh project item-list --format json). Sortie TSV, une ligne par issue visée par une
# règle : décision (set, keep, same, absent), n°, id d'item, statut courant, statut cible, label.
sync_plan() {
  jq -rs "$SYNC_RULES"'
    .[0] as $issues
    | (reduce (.[1].items[] | select(.content.number != null)) as $it ({};
        ($it.content.number | tostring) as $k | if has($k) then . else .[$k] = $it end)) as $idx
    | $issues[] | rule as $r | $idx[.number | tostring] as $it
    | if $it == null then ["absent", .number, "-", "-", $r.target, $r.label]
      else [decide($it.status; $r.target), .number, $it.id, ($it.status // "-"), $r.target, $r.label] end
    | @tsv'
}

main() {
  local repo owner title dry pnum pid fields fid plan changed=0 kept=0 same=0
  repo="${REPO:-Inprogress-Agency/widoo-app}"; owner="${repo%%/*}"; title="${PROJECT_TITLE:-Widoo — MVP}"
  case "${1:-}" in
    "") dry="" ;;
    --dry-run) dry=1 ;;
    *) echo "argument inconnu : $1 — usage : scripts/sync-project.sh [--dry-run]" >&2; exit 2 ;;
  esac

  pnum=$(gh project list --owner "$owner" --format json --jq ".projects[] | select(.title == \"$title\") | .number" | head -1)
  [ -n "$pnum" ] || { echo "Project « $title » introuvable chez $owner" >&2; exit 1; }
  pid=$(gh project view "$pnum" --owner "$owner" --format json --jq '.id')
  fields=$(gh project field-list "$pnum" --owner "$owner" --format json)
  fid=$(jq -r '.fields[] | select(.name == "Status") | .id' <<<"$fields")
  opt() { jq -r --arg n "$1" '.fields[] | select(.name == "Status") | .options[] | select(.name == $n) | .id' <<<"$fields"; }
  for s in "Prêts" "Cadrage" "Terminés"; do [ -n "$(opt "$s")" ] || { echo "option Status « $s » absente du Project" >&2; exit 1; }; done

  plan=$( { gh issue list -R "$repo" --state all --limit 500 --json number,state,labels
            gh project item-list "$pnum" --owner "$owner" --limit 500 --format json; } | sync_plan)
  while IFS=$'\t' read -r decision num item current target label; do
    case "$decision" in
      same) same=$((same+1)) ;;
      absent) echo "  #$num : absent du Project (le workflow Auto-add l'ajoutera)" ;;
      keep) echo "  #$num : $current conservé, $label ignoré (ticket parti en développement)"; kept=$((kept+1)) ;;
      set)
        # seule écriture du script, jamais en --dry-run
        [ -n "$dry" ] || gh project item-edit --project-id "$pid" --id "$item" --field-id "$fid" --single-select-option-id "$(opt "$target")" >/dev/null
        echo "  #$num : $current → $target"; changed=$((changed+1)) ;;
    esac
  done <<<"$plan"
  echo "sync-project${dry:+ (--dry-run, aucune écriture)} : $changed modifié(s), $kept conservé(s), $same déjà conforme(s)"
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi

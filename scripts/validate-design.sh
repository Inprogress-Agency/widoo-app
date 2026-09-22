#!/usr/bin/env bash
# À chaque planche validée par Ilan : ferme le ticket design et libère les tickets
# dev qu'il bloque (needs-design retiré, status:ready posé, ligne « Maquette : »
# ajoutée au contexte), après avoir vérifié que la page wiki Ecrans porte 🟢 sous
# chaque écran concerné. Le wiki (export design/<E-xx>/, section Ecrans, entrée
# Design-Changelog si la spec a bougé) est mis à jour et poussé AVANT ce script.
# Idempotent : relançable sans doublon.
# Si le clone du wiki (../widoo-app.wiki à côté du dépôt, ou --wiki <chemin>) a des
# commits non poussés, le script les pousse d'abord.
# Usage : scripts/validate-design.sh <n° ticket design> --date AAAA-MM-JJ --link <url Claude Design> [--wiki <chemin>] [--dry-run]
set -euo pipefail
REPO="${REPO:-Inprogress-Agency/widoo-app}"
W="https://github.com/$REPO/wiki"
RAW="https://raw.githubusercontent.com/wiki/$REPO"
DN="" DATE="" LINK="" DRY="" WIKI=""
usage() { sed -n '2,10p' "$0" >&2; exit 2; }
while [ $# -gt 0 ]; do
  case "$1" in
    --date) DATE="${2:-}"; shift 2 ;;
    --link) LINK="${2:-}"; shift 2 ;;
    --wiki) WIKI="${2:-}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -*) echo "option inconnue : $1" >&2; usage ;;
    *) DN="$1"; shift ;;
  esac
done
[ -n "$DN" ] && [ -n "$DATE" ] && [ -n "$LINK" ] || usage
grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' <<<"$DATE" || { echo "date attendue au format AAAA-MM-JJ" >&2; exit 2; }
run() { if [ -n "$DRY" ]; then echo "+ $*"; else "$@"; fi; }
edit_body() { # $1 = n°, $2 = nouveau corps (non affiché en dry-run)
  if [ -n "$DRY" ]; then echo "+ gh issue edit $1 --body (corps mis à jour)"; else gh issue edit "$1" -R "$REPO" --body "$2" >/dev/null; fi
}

# 1. Ticket design et écrans qu'il couvre (ligne « écrans E-01, E-04 » du contexte)
design=$(gh issue view "$DN" -R "$REPO" --json number,title,state,body,labels)
jq -e '.labels[] | select(.name == "type:design")' <<<"$design" >/dev/null \
  || { echo "#$DN n'est pas un ticket type:design" >&2; exit 1; }
dbody=$(jq -r .body <<<"$design")
screens=$(grep -m1 -E 'écrans' <<<"$dbody" | grep -o -E '\b[EA]-[0-9]{2}\b' | sort -u || true)
[ -n "$screens" ] || screens=$(grep -o -E '\b[EA]-[0-9]{2}\b' <<<"$dbody" | sort -u || true)
[ -n "$screens" ] || { echo "#$DN : aucun identifiant d'écran (E-xx / A-xx) dans le ticket" >&2; exit 1; }
echo "#$DN — $(jq -r .title <<<"$design") · écrans : $(tr '\n' ' ' <<<"$screens")"

# 2. Wiki : pousser le clone local s'il est en avance, puis vérifier le 🟢 de chaque écran
[ -n "$WIKI" ] || WIKI="$(cd "$(dirname "$0")/.." && pwd)/../widoo-app.wiki"
if [ -d "$WIKI/.git" ] && [ "$(git -C "$WIKI" rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)" != 0 ]; then
  echo "  wiki : $(git -C "$WIKI" rev-list --count '@{u}..HEAD') commit(s) à pousser depuis $WIKI"
  run git -C "$WIKI" push -q && sleep 3
fi
# chaque écran doit avoir 🟢 sur la première ligne sous son titre dans Ecrans
page=$(curl -fsSL "$RAW/Ecrans.md") || { echo "page wiki Ecrans illisible ($RAW/Ecrans.md)" >&2; exit 1; }
heading() { awk -v s="$1" 'index($0, "### " s " ") == 1 { sub(/^### /, ""); print; exit }' <<<"$page"; }
anchor()  { heading "$1" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^[:alnum:] _-]//g; s/ /-/g'; }
ok=1
for s in $screens; do
  [ -n "$(heading "$s")" ] || { echo "  $s : section absente de Ecrans"; ok=0; continue; }
  first=$(awk -v s="$s" 'index($0, "### " s " ") == 1 { f=1; next } f && NF { print; exit }' <<<"$page")
  if grep -q "🟢" <<<"$first"; then echo "  $s : 🟢 dans Ecrans"
  else echo "  $s : pas de 🟢 sous « ### $s » dans Ecrans — mettre le wiki à jour et le pousser d'abord"; ok=0; fi
done
[ "$ok" = 1 ] || exit 1

# 3. Fermer le ticket design : corps complété, commentaire avec le lien de la planche
new=$(awk -v link="$LINK" -v date="$DATE" '
  /^Lien de la planche Claude Design :/ { print "Lien de la planche Claude Design : " link; next }
  /^Validée par Ilan le :/             { print "Validée par Ilan le : " date; next }
  { print }' <<<"$dbody")
[ "$new" = "$dbody" ] || edit_body "$DN" "$new"
if [ "$(jq -r .state <<<"$design")" = "OPEN" ]; then
  run gh issue close "$DN" -R "$REPO" --comment "Planche validée par Ilan le $DATE — $LINK · miroir wiki : $W/Ecrans" >/dev/null
  echo "  #$DN : fermé"
else echo "  #$DN : déjà fermé"; fi

# 4. Tickets dev bloqués par le ticket design : ligne Maquette, needs-design → status:ready
devs=$(gh api "repos/$REPO/issues/$DN/dependencies/blocking" --jq '.[] | select(.state == "open") | .number' || true)
[ -n "$devs" ] || echo "  aucun ticket dev ouvert bloqué par #$DN"
for n in $devs; do
  t=$(gh issue view "$n" -R "$REPO" --json title,body)
  title=$(jq -r .title <<<"$t"); cur=$(jq -r .body <<<"$t")
  # écrans cités par le ticket dev parmi ceux de la planche ; sinon tous ceux de la planche
  mine=$(grep -o -E '\b[EA]-[0-9]{2}\b' <<<"$title"$'\n'"$cur" | sort -u | grep -Fx -f <(printf '%s\n' "$screens") || true)
  [ -n "$mine" ] || mine=$screens
  links=""; for s in $mine; do links+="[$s]($W/Ecrans#$(anchor "$s")), "; done
  line="Maquette : ${links%, } · validée le $DATE"
  if grep -q '^Maquette :' <<<"$cur"; then echo "  #$n : ligne Maquette déjà présente"
  else
    upd=$(awk -v l="$line" '{ print } !done && /^Epic : #/ { print l; done=1 }' <<<"$cur")
    grep -q '^Maquette :' <<<"$upd" || upd=$(printf '%s\n\n%s' "$line" "$cur")
    edit_body "$n" "$upd"
  fi
  run gh issue edit "$n" -R "$REPO" --remove-label needs-design --add-label status:ready >/dev/null
  echo "  #$n : status:ready — $title"
done

# 5. Contrôle et suite manuelle
echo
if "$(dirname "$0")/check-design-links.sh"; then echo "check-design-links : rien à corriger"; else echo "check-design-links : à corriger (ci-dessus)"; fi
echo "Reste à la main : passer ces tickets en « Prêts » dans le Project « Widoo — MVP »."

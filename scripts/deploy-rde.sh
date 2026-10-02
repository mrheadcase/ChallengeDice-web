#!/usr/bin/env bash
# Builds the current checkout and pushes it straight to the RDE (rapid development
# environment) for review before anything goes to development/dev. Runs from a dev
# machine with SSH access to the server; works from any branch, uncommitted changes
# included (they're flagged as "dirty" in rde-version.txt).
#
#   scripts/deploy-rde.sh
#
# nginx serves /var/www/challengedice-rde on :3003 (sites-available/challengedice-rde).
# Roll back to the previous build on the server:
#   rsync -a --delete /var/backups/challengedice-rde.prev/ /var/www/challengedice-rde/
set -euo pipefail

HOST="${RDE_HOST:-challengedice}"
TARGET="${RDE_TARGET:-/var/www/challengedice-rde}"
BACKUP="${RDE_BACKUP:-/var/backups/challengedice-rde.prev}"

cd "$(dirname "$0")/.."

commit=$(git rev-parse --short HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)
dirty=""
[[ -n "$(git status --porcelain --untracked-files=no)" ]] && dirty="-dirty"

# The RDE serves from its domain root, not /ChallengeDice-web
BASE_PATH='' npm run build

echo "$branch $commit$dirty $(date -u +%Y-%m-%dT%H:%M:%SZ)" > build/rde-version.txt

# Relative paths only: Windows tar reads "C:" as a remote host
tar czf - -C build . | ssh "$HOST" "
	set -euo pipefail
	work=\$(mktemp -d)
	trap 'rm -rf \"\$work\"' EXIT
	tar xzf - --no-same-owner -C \"\$work\"
	[[ -f \"\$work/index.html\" ]] || { echo 'build has no index.html, not deploying' >&2; exit 1; }
	mkdir -p '$BACKUP'
	rsync -a --delete '$TARGET/' '$BACKUP/'
	rsync -a --delete-delay --delay-updates \"\$work/\" '$TARGET/'
	chown -R deploy:deploy '$TARGET'
"

echo "Deployed $branch $commit$dirty to $HOST:$TARGET"

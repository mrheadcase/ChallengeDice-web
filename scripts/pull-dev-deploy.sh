#!/usr/bin/env bash
# Runs on the dev server as the deploy user, from cron every minute. Installs the newest
# development build that GitHub Actions published to the dev-latest pre-release
# (.github/workflows/deploy-dev.yml). Quiet unless it deploys or something is wrong.
#
# Install (as deploy):  ~/bin/pull-dev-deploy.sh, plus this crontab line:
#   * * * * * $HOME/bin/pull-dev-deploy.sh >> $HOME/.local/state/challengedice-dev/deploy.log 2>&1
# Roll back to the previous build:
#   rsync -a --delete ~/backups/challengedice-dev.prev/ /var/www/challengedice-dev/
set -euo pipefail

# Overridable for testing in a sandbox
URL="${DEPLOY_URL:-https://github.com/mrheadcase/ChallengeDice-web/releases/download/dev-latest}"
TARGET="${DEPLOY_TARGET:-/var/www/challengedice-dev}"
BACKUP="${DEPLOY_BACKUP:-$HOME/backups/challengedice-dev.prev}"
STATE="${DEPLOY_STATE:-$HOME/.local/state/challengedice-dev}"

mkdir -p "$STATE" "$(dirname "$BACKUP")"

# Skip this run if the previous one is still going
exec 9> "$STATE/lock"
flock -n 9 || exit 0

# Nothing published yet, or GitHub unreachable: try again next minute
manifest=$(curl -fsSL --max-time 20 "$URL/version.txt" 2> /dev/null) || exit 0
read -r commit checksum <<< "$manifest"
if [[ ! "$commit" =~ ^[0-9a-f]{40}$ || ! "$checksum" =~ ^[0-9a-f]{64}$ ]]; then
	echo "$(date -Is) unexpected manifest, skipping: $manifest"
	exit 1
fi

# Already live
[[ "$(cat "$STATE/deployed" 2> /dev/null)" == "$commit" ]] && exit 0

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsSL --max-time 120 -o "$work/site.tar.gz" "$URL/challengedice-dev.tar.gz"
# version.txt is uploaded after the tarball, so a mismatch means an upload is in
# progress; the next run picks it up
[[ "$(sha256sum "$work/site.tar.gz" | cut -d' ' -f1)" == "$checksum" ]] || exit 0

mkdir "$work/site"
tar xzf "$work/site.tar.gz" -C "$work/site"
if [[ ! -f "$work/site/index.html" ]]; then
	echo "$(date -Is) build $commit has no index.html, not deploying"
	exit 1
fi

# Keep the live site as the rollback copy, then sync the new build in place.
# --delay-updates/--delete-delay swap everything in at the end of the transfer.
rsync -a --delete "$TARGET/" "$BACKUP/"
rsync -a --delete-delay --delay-updates "$work/site/" "$TARGET/"

echo "$commit" > "$STATE/deployed"
echo "$(date -Is) deployed $commit"

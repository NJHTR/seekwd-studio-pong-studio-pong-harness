#!/bin/sh
#
# get-pong.sh — one-script setup for a self-hosted pong instance (docker compose).
#
# Usage:
#   curl -fsSL https://get.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness | sh
#   curl -fsSL https://get.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness | sh -s -- --upgrade
#
# Prefer to inspect before running?
#   curl -fsSL https://get.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness -o get-pong.sh && less get-pong.sh && sh get-pong.sh
#
# Source: https://github.com/pong-io/pong/blob/master/docker/get-pong.sh
set -eu

SCRIPT_VERSION="1.4.0"
# The version to install is derived from the latest stable GitHub release in
# resolve_pong_version(); this fallback only applies when that lookup fails.
FALLBACK_PONG_VERSION="2.43.4"
# Sandbox service release (API, runner and sandbox images ship together).
# Pinned here, not resolved at run time: the stack definition must match it.
# --upgrade moves existing installs to this pin.
SANDBOX_VERSION="1.8.1"
PONG_DIR="${PONG_DIR:-./pong}"
PONG_PORT=5678
SOURCE_URL="https://github.com/pong-io/pong/blob/master/docker/get-pong.sh"
# The stack definition lives next to this script in the repo and is downloaded
# at install time. A plain filesystem path also works (used by the test
# harness to install from a working copy).
COMPOSE_SOURCE="${PONG_COMPOSE_URL:-https://raw.githubusercontent.com/pong-io/pong/master/docker/get-pong-compose.yml}"
COMPOSE_HISTORY_URL="https://github.com/pong-io/pong/commits/master/docker/get-pong-compose.yml"
DOCS_HOSTING_URL="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"
DOCS_EVERYDAY_URL="https://github.com/NJHTR/seekwd-studio-pong-studio-pong-harness"

UPGRADE=0
NO_START=0
REQUESTED_VERSION=""

# Anonymous failure report (RudderStack): offered only when an install or
# upgrade fails, and sent only after the user answers yes. The payload is the
# script version, OS name, install|upgrade mode and the failed step — nothing
# else. The write key is a public client-side key. DO_NOT_TRACK=1 disables
# the offer entirely.
TELEMETRY_URL="https://nnrry.dataplane.rudderstack.com/v1/track"
TELEMETRY_WRITE_KEY="3IDNZwfcE0lfjVDb0Y1wp8ZVGlg"
# Set before steps whose failure could be on pong's side (stack definition
# download, image pulls, container start, health check). Failures of the
# user's environment (no docker, port taken, ...) leave it empty and no
# report is offered.
STEP=""

# Apply ANSI styling only when stdout is a terminal that supports it and the
# user hasn't opted out (https://no-color.org).
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != "dumb" ]; then
	BOLD=$(printf '\033[1m')
	DIM=$(printf '\033[2m')
	CYAN=$(printf '\033[36m')
	GREEN=$(printf '\033[32m')
	YELLOW=$(printf '\033[33m')
	RESET=$(printf '\033[0m')
else
	BOLD='' DIM='' CYAN='' GREEN='' YELLOW='' RESET=''
fi
# stderr can be a terminal when stdout isn't, so red gets its own check and reset.
if [ -t 2 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-dumb}" != "dumb" ]; then
	RED=$(printf '\033[1;31m')
	RED_RESET=$(printf '\033[0m')
else
	RED='' RED_RESET=''
fi

say() { printf '%s\n' "$*"; }
ok() { printf '%s\342\234\224%s %s\n' "$GREEN" "$RESET" "$*"; }

# Never sends without an explicit yes. The prompt uses /dev/tty because
# 'curl | sh' owns stdin; without a terminal there is no prompt and no report.
offer_failure_report() {
	[ -n "$STEP" ] || return 0
	[ -z "${DO_NOT_TRACK:-}" ] || return 0
	printf '\nSend an anonymous failure report to pong, so we can fix this?\n(script version, OS name, failed step — nothing else) [y/N] ' >/dev/tty 2>/dev/null || return 0
	read -r answer </dev/tty 2>/dev/null || return 0
	case "$answer" in
	[Yy]*) ;;
	*) return 0 ;;
	esac
	mode="install"
	[ "$UPGRADE" -eq 1 ] && mode="upgrade"
	body="{\"anonymousId\":\"$(gen_secret)\",\"event\":\"install_failed\",\"properties\":{\"scriptVersion\":\"${SCRIPT_VERSION}\",\"os\":\"$(uname -s)\",\"mode\":\"${mode}\",\"step\":\"${STEP}\"}}"
	if command -v curl >/dev/null 2>&1; then
		curl -s -o /dev/null --max-time 5 -u "${TELEMETRY_WRITE_KEY}:" \
			-H 'Content-Type: application/json' -d "$body" "$TELEMETRY_URL" 2>/dev/null || true
	elif command -v wget >/dev/null 2>&1; then
		wget -q -O /dev/null -T 5 \
			--header="Authorization: Basic $(printf '%s:' "$TELEMETRY_WRITE_KEY" | base64)" \
			--header='Content-Type: application/json' \
			--post-data="$body" "$TELEMETRY_URL" 2>/dev/null || true
	fi
	printf 'Thank you!\n' >/dev/tty 2>/dev/null || true
}

fail() {
	printf '%sError:%s %s\n' "$RED" "$RED_RESET" "$*" >&2
	offer_failure_report
	exit 1
}

usage() {
	cat <<EOF
get-pong.sh v${SCRIPT_VERSION} — set up a self-hosted pong instance with docker compose.

Usage: get-pong.sh [options]
       curl -fsSL https://get.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness | sh -s -- [options]

Options:
  --version [x.y.z]  Without a value: print script version and the pong version
                     that would be installed (latest stable). With a value:
                     install (or, with --upgrade, upgrade to) that pong version.
  --upgrade          Upgrade an existing install: updates the PONG_VERSION and
                     PONG_SANDBOX_VERSION lines in .env, points the sandbox image
                     tags in compose.yml at PONG_SANDBOX_VERSION, pulls images
                     and restarts. Never touches any other configuration or
                     secrets.
  --no-start         Write the configuration files but don't start pong.
  --help             Show this help.

Environment:
  PONG_DIR            Install directory (default: ./pong)
  DO_NOT_TRACK=1     Never offer to send an anonymous failure report.

For production-grade setups (TLS, Postgres, queue mode) see:
  ${DOCS_HOSTING_URL}
EOF
}

parse_args() {
	while [ $# -gt 0 ]; do
		case "$1" in
			--version)
				if [ $# -gt 1 ] && [ "${2#-}" = "$2" ]; then
					valid_pong_version "$2" ||
						fail "invalid --version '$2' — expected a release version like 2.32.0"
					REQUESTED_VERSION="$2"
					shift
				else
					say "get-pong.sh v${SCRIPT_VERSION} (installs the latest stable pong, currently $(resolve_pong_version), with sandbox service ${SANDBOX_VERSION})"
					exit 0
				fi
				;;
			--upgrade) UPGRADE=1 ;;
			--no-start) NO_START=1 ;;
			--help | -h)
				usage
				exit 0
				;;
			*)
				usage >&2
				fail "unknown option: $1"
				;;
		esac
		shift
	done
}

check_deps() {
	command -v docker >/dev/null 2>&1 || fail "Docker is not installed.
  Install it first:
    Linux / WSL:   curl -fsSL https://get.docker.com | sh
                   then: sudo usermod -aG docker \$USER && re-open your shell
    macOS:         https://docs.docker.com/desktop/setup/install/mac-install/
    Windows:       https://docs.docker.com/desktop/setup/install/windows-install/
                   (enable your distro under Settings > Resources > WSL integration)
  Podman, Colima and other Docker-compatible engines work too: install the
  'docker' CLI with the compose plugin and point DOCKER_HOST at their socket."

	docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 plugin is not available.
  ('docker compose version' failed — the legacy 'docker-compose' binary is not supported.)
  See https://docs.docker.com/compose/install/"

	docker info >/dev/null 2>&1 || fail "The Docker daemon is not running (or DOCKER_HOST points at a dead socket).
  Start Docker (e.g. open Docker Desktop, or 'sudo systemctl start docker') and re-run.
  Podman/Colima users: make sure the machine/socket is running, e.g.
  'podman machine start' or 'colima start', and DOCKER_HOST points at it."

	ok "Docker found ($(docker --version | awk '{print $3}' | tr -d ','))"
	ok "Docker Compose found ($(docker compose version --short 2>/dev/null))"
}

# Prints the content of a URL (or plain file path) to stdout.
fetch() {
	case "$1" in
	*://*)
		if command -v curl >/dev/null 2>&1; then
			curl -fsSL --max-time 10 "$1" 2>/dev/null
		elif command -v wget >/dev/null 2>&1; then
			wget -qO- -T 10 "$1" 2>/dev/null
		else
			return 2
		fi
		;;
	*) cat "$1" 2>/dev/null ;;
	esac
}

# Returns 0 if an HTTP GET against $1 gets any response at all.
http_get() {
	if command -v curl >/dev/null 2>&1; then
		curl -sf -o /dev/null --max-time 3 "$1"
	elif command -v wget >/dev/null 2>&1; then
		wget -q -O /dev/null -T 3 "$1" 2>/dev/null
	else
		return 2
	fi
}

port_in_use() {
	# In use only when something actually answers. Refusals AND timeouts count
	# as free: Windows firewalls/WSL drop instead of refusing, which made the
	# old "anything but refused" check a false positive. --noproxy keeps a
	# corporate proxy from answering on 127.0.0.1's behalf. Ambiguous cases
	# fall through to the container healthcheck, which surfaces real conflicts.
	if command -v curl >/dev/null 2>&1; then
		rc=0
		curl -s -o /dev/null --noproxy '*' --max-time 2 "http://127.0.0.1:${PONG_PORT}/" 2>/dev/null || rc=$?
		# rc 0 = HTTP response; 52/56 = connection accepted but no/broken reply.
		[ "$rc" -eq 0 ] || [ "$rc" -eq 52 ] || [ "$rc" -eq 56 ]
	elif command -v wget >/dev/null 2>&1; then
		rc=0
		wget -q -O /dev/null --no-proxy -T 2 "http://127.0.0.1:${PONG_PORT}/" 2>/dev/null || rc=$?
		# rc 0 = OK response; 8 = server issued an error response.
		[ "$rc" -eq 0 ] || [ "$rc" -eq 8 ]
	else
		return 1
	fi
}

gen_secret() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 24
	else
		od -An -tx1 -N24 /dev/urandom | tr -d ' \n'
	fi
}

# Exactly three dot-separated numeric components (e.g. 2.32.0).
valid_pong_version() {
	case "$1" in
	*[!0-9.]* | *.*.*.* | .* | *. | *..*) return 1 ;;
	[0-9]*.[0-9]*.[0-9]*) return 0 ;;
	*) return 1 ;;
	esac
}

# Latest stable pong version from GitHub releases; FALLBACK_PONG_VERSION covers
# offline/API failures. Installs stay pinned in .env — never a floating tag,
# which would silently upgrade (and run DB migrations) on any container recreate.
resolve_pong_version() {
	releases_url="https://api.github.com/repos/pong-io/pong/releases/latest"
	v="$(fetch "$releases_url" | sed -n 's/.*"tag_name": *"pong@\([0-9][0-9.]*\)".*/\1/p' | head -n1)"
	if valid_pong_version "$v"; then
		printf '%s\n' "$v"
	else
		printf '%s\n' "$FALLBACK_PONG_VERSION"
	fi
}

write_env() {
	sandbox_api_key="$(gen_secret)"
	runner_key="$(gen_secret)"
	registration_token="$(gen_secret)"
	cat >"${PONG_DIR}/.env" <<EOF
# Generated by get-pong.sh v${SCRIPT_VERSION}. Keep this file out of version control.

# Versions to run. 'get-pong.sh --upgrade' updates these two lines and nothing
# else. The sandbox service API, runner and sandbox images share one release.
PONG_VERSION=${INSTALL_VERSION}
PONG_SANDBOX_VERSION=${SANDBOX_VERSION}

# Code-node user code (JavaScript and Python) runs in the separate 'runners'
# container. The broker binds 0.0.0.0 so that container can reach it — its
# port (5679) stays private to the compose network.
PONG_RUNNERS_MODE=external
PONG_RUNNERS_BROKER_LISTEN_ADDRESS=0.0.0.0
PONG_RUNNERS_AUTH_TOKEN=$(gen_secret)

# Web search for the AI assistant runs through the bundled SearXNG service.
# Optionally set a Brave Search API key instead — it takes priority.
INSTANCE_AI_BRAVE_SEARCH_API_KEY=
PONG_INSTANCE_AI_SEARXNG_URL=http://searxng:8080
SEARXNG_SECRET=$(gen_secret)

PONG_INSTANCE_AI_SANDBOX_ENABLED=true
PONG_INSTANCE_AI_SANDBOX_PROVIDER=pong-sandbox
PONG_INSTANCE_AI_SANDBOX_API_URL=http://sandbox-api:8080
PONG_SANDBOX_SERVICE_URL=http://sandbox-api:8080

# Sandbox service secrets — generated uniquely for this install.
# The API and runner sides must agree, so each secret appears twice.
#
# Must match a value in SANDBOX_API_KEYS above — this is how pong authenticates
# to the sandbox.
SANDBOX_API_KEYS=${sandbox_api_key}
PONG_SANDBOX_SERVICE_API_KEY=${sandbox_api_key}

SANDBOX_API_RUNNER_REGISTRATION_TOKEN=${registration_token}
SANDBOX_RUNNER_REGISTRATION_TOKEN=${registration_token}

SANDBOX_API_RUNNER_API_KEY=${runner_key}
SANDBOX_RUNNER_API_KEYS=${runner_key}
EOF
	chmod 600 "${PONG_DIR}/.env"
}

# The stack definition is maintained in the repo (COMPOSE_SOURCE) and
# versioned via its '# compose-version: N' line. It is downloaded once at
# install time; after that the local copy belongs to the user, except for the
# sandbox image tags that --upgrade repoints (migrate_compose_sandbox_pins).
compose_version() { sed -n 's/^# compose-version: *//p' | head -n1; }

write_compose() {
	if ! fetch "$COMPOSE_SOURCE" >"${PONG_DIR}/compose.yml.tmp" ||
		! grep -q '^services:' "${PONG_DIR}/compose.yml.tmp"; then
		rm -f "${PONG_DIR}/compose.yml.tmp"
		fail "could not download the stack definition from
  ${COMPOSE_SOURCE}
  Check your network connection and re-run."
	fi
	mv "${PONG_DIR}/compose.yml.tmp" "${PONG_DIR}/compose.yml"
}

# Sets NAME=VALUE in .env, replacing the existing line or appending one.
# .env is user state: nothing but the named line changes.
set_env_value() {
	if grep -q "^$1=" "${PONG_DIR}/.env"; then
		sed "s|^$1=.*|$1=$2|" "${PONG_DIR}/.env" >"${PONG_DIR}/.env.tmp"
		mv "${PONG_DIR}/.env.tmp" "${PONG_DIR}/.env"
	else
		printf '%s=%s\n' "$1" "$2" >>"${PONG_DIR}/.env"
	fi
	chmod 600 "${PONG_DIR}/.env"
}

# Stack definition v1 hard-coded the sandbox image tags. Point them at
# PONG_SANDBOX_VERSION so --upgrade can move them, and switch the runner URL
# to https, which the sandbox service serves since 1.3. Only these lines
# change; the rest of compose.yml stays the user's.
migrate_compose_sandbox_pins() {
	# shellcheck disable=SC2016  # the literal ${PONG_SANDBOX_VERSION} is the point
	sed -e 's|\(ghcr\.io/pong-io/pong-sandbox-service-[a-z-]*:\)[0-9A-Za-z._-]\{1,\}|\1${PONG_SANDBOX_VERSION}|' \
		-e 's|^\( *SANDBOX_RUNNER_HTTP_BASE_URL: \)http://sandbox-runner-1:8080 *$|\1https://sandbox-runner-1:8080|' \
		"${PONG_DIR}/compose.yml" >"${PONG_DIR}/compose.yml.tmp"
	if cmp -s "${PONG_DIR}/compose.yml" "${PONG_DIR}/compose.yml.tmp"; then
		rm -f "${PONG_DIR}/compose.yml.tmp"
		return 0
	fi
	had_http=0
	grep -q 'SANDBOX_RUNNER_HTTP_BASE_URL: http://sandbox-runner-1:8080' "${PONG_DIR}/compose.yml" && had_http=1
	mv "${PONG_DIR}/compose.yml.tmp" "${PONG_DIR}/compose.yml"
	ok "Updated compose.yml: sandbox images now follow PONG_SANDBOX_VERSION"
	say "  ${DIM}compose.yml had the sandbox service images pinned to fixed tags. Those image"
	say "  lines now end in :\${PONG_SANDBOX_VERSION}, so this and future upgrades set the"
	say "  version through .env."
	[ "$had_http" -eq 0 ] || say "  The runner URL now uses https, which the sandbox service serves since 1.3."
	say "  Nothing else in compose.yml changed.${RESET}"
}

# Existing installs keep their compose.yml untouched, so when the published
# stack definition has moved on, say so instead of silently rewriting it.
# Best-effort: stays quiet if offline or if the user removed the version line.
check_compose_freshness() {
	[ -f "${PONG_DIR}/compose.yml" ] || return 0
	installed="$(compose_version <"${PONG_DIR}/compose.yml")"
	[ -n "$installed" ] || return 0
	latest="$(fetch "$COMPOSE_SOURCE" | compose_version)"
	[ -n "$latest" ] && [ "$latest" != "$installed" ] || return 0
	say ""
	say "Note: the pong stack definition is now v${latest}; this install was generated"
	say "from v${installed}. Beyond the sandbox image tags, get-pong.sh never rewrites"
	say "an existing compose.yml."
	say "To review what changed: ${COMPOSE_HISTORY_URL}"
}

write_searxng_settings() {
	# The stock image serves HTML only; pong's web search needs the JSON API.
	cat >"${PONG_DIR}/searxng-settings.yml" <<'EOF'
# Generated by get-pong.sh. SearXNG configuration for the pong AI assistant.
use_default_settings: true
search:
  formats:
    - html
    - json
EOF
}

compose() {
	docker compose -f "${PONG_DIR}/compose.yml" "$@"
}

# Docker Hub's anonymous pull rate limit is a common first-run failure, so
# turn it into recovery advice instead of a raw error dump. Consumes the log.
check_rate_limit() {
	grep -qiE 'toomanyrequests|rate ?limit' "$1" || return 0
	rm -f "$1"
	STEP="docker-hub-rate-limit"
	fail "Docker Hub pull rate limit reached — your configuration in ${PONG_DIR} is
  unaffected. Wait about an hour, then start pong with:
    docker compose -f ${PONG_DIR}/compose.yml up -d
  Or 'docker login' with a Docker Hub account to raise the limit and re-run."
}

# Pull attached to the terminal so compose renders its in-place progress bars
# (capturing the output would drop compose into plain line mode). On failure,
# retry quietly to get the error text for classification — a rate-limited pull
# fails again instantly, a transient blip just succeeds on the retry.
compose_pull() {
	compose pull && return 0
	log="$(mktemp)"
	if compose pull -q >"$log" 2>&1; then
		rm -f "$log"
		return 0
	fi
	check_rate_limit "$log"
	rm -f "$log"
	fail "pulling images failed — see the output above; check your network and re-run."
}

# Quiet on success — compose's per-container status lines are only shown
# when something went wrong.
compose_checked() {
	log="$(mktemp)"
	if compose "$@" >"$log" 2>&1; then
		rm -f "$log"
		return 0
	fi
	cat "$log" >&2
	check_rate_limit "$log"
	rm -f "$log"
	fail "starting pong failed — check 'docker compose -f ${PONG_DIR}/compose.yml logs'."
}

do_upgrade() {
	if [ ! -f "${PONG_DIR}/.env" ] || [ ! -f "${PONG_DIR}/compose.yml" ]; then
		fail "no existing install found in ${PONG_DIR} — run without --upgrade to install."
	fi

	target="${REQUESTED_VERSION:-$(resolve_pong_version)}"
	current="$(sed -n 's/^PONG_VERSION=//p' "${PONG_DIR}/.env")"
	set_env_value PONG_VERSION "$target"
	ok "pong version: ${current:-unset} -> ${target}"
	# Installs from before PONG_SANDBOX_VERSION carry the tag in compose.yml.
	current_sandbox="$(sed -n 's/^PONG_SANDBOX_VERSION=//p' "${PONG_DIR}/.env")"
	[ -n "$current_sandbox" ] ||
		current_sandbox="$(sed -n 's|.*pong-sandbox-service-api:\([0-9A-Za-z._-]*\).*|\1|p' "${PONG_DIR}/compose.yml" | head -n1)"
	set_env_value PONG_SANDBOX_VERSION "$SANDBOX_VERSION"
	ok "sandbox service version: ${current_sandbox:-unset} -> ${SANDBOX_VERSION}"
	migrate_compose_sandbox_pins
	check_compose_freshness

	if [ "$NO_START" -eq 1 ]; then
		say ""
		say "Not restarting (--no-start). To apply the upgrade:"
		say "  docker compose -f ${PONG_DIR}/compose.yml pull && docker compose -f ${PONG_DIR}/compose.yml up -d"
		exit 0
	fi

	say "Pulling images..."
	STEP="image-pull"
	compose_pull
	STEP="container-start"
	compose_checked up -d --quiet-pull
	ok "Restarted with pong ${target} and sandbox service ${SANDBOX_VERSION}"
}

wait_for_pong() {
	printf 'Waiting for pong to become ready (first boot pulls images and runs migrations) ...'
	waited=0
	while [ "$waited" -lt 180 ]; do
		if http_get "http://127.0.0.1:${PONG_PORT}/healthz"; then
			printf ' %s\342\234\223%s\n' "$GREEN" "$RESET"
			return 0
		fi
		sleep 3
		waited=$((waited + 3))
	done
	printf '\n'
	return 1
}

print_summary() {
	cat <<EOF

${BOLD}pong is running at:${RESET} ${CYAN}http://localhost:${PONG_PORT}${RESET}
${BOLD}Data stored in:${RESET}    ${PONG_DIR} ${DIM}(Docker volume: pong-data)${RESET}
${BOLD}Config files:${RESET}      ${PONG_DIR}/compose.yml, ${PONG_DIR}/.env

${BOLD}To stop:${RESET}  docker compose -f ${PONG_DIR}/compose.yml down
${BOLD}To start:${RESET} docker compose -f ${PONG_DIR}/compose.yml up -d
${DIM}More everyday commands: ${DOCS_EVERYDAY_URL}${RESET}

${YELLOW}${BOLD}Security notes:${RESET}
  - Only port ${PONG_PORT} (pong) should ever be reachable from the internet.
  - The sandbox runner is privileged Docker-in-Docker — never publish its ports.

This setup is meant to try pong locally. For production (TLS, Postgres, queue
mode) see ${DOCS_HOSTING_URL}

${DIM}get-pong.sh v${SCRIPT_VERSION} — source: ${SOURCE_URL}${RESET}

${GREEN}➜${RESET}  ${BOLD}All set! Open ${CYAN}http://localhost:${PONG_PORT}${RESET}${BOLD} in your browser to get started.${RESET}
EOF
}

main() {
	parse_args "$@"
	check_deps

	if [ -f "${PONG_DIR}/compose.yml" ] || [ -f "${PONG_DIR}/.env" ]; then
		if [ "$UPGRADE" -eq 1 ]; then
			do_upgrade
			STEP="pong-readiness-timeout"
			wait_for_pong || fail "pong did not become ready — check 'docker compose -f ${PONG_DIR}/compose.yml logs pong'."
			print_summary
			exit 0
		fi
		say "Found an existing install in ${PONG_DIR} — leaving it untouched."
		say ""
		if http_get "http://127.0.0.1:${PONG_PORT}/healthz"; then
			say "pong is already running at: http://localhost:${PONG_PORT}"
		else
			say "To start it:  docker compose -f ${PONG_DIR}/compose.yml up -d"
			say "Once started, pong runs at: http://localhost:${PONG_PORT}"
		fi
		say "To upgrade:   curl -fsSL https://get.github.com/NJHTR/seekwd-studio-pong-studio-pong-harness | sh -s -- --upgrade"
		say "To uninstall: docker compose -f ${PONG_DIR}/compose.yml down -v && rm -rf ${PONG_DIR}   # DELETES all pong data"
		check_compose_freshness
		exit 0
	fi
	[ "$UPGRADE" -eq 0 ] || fail "no existing install found in ${PONG_DIR} — run without --upgrade to install."

	if [ -d "${PONG_DIR}" ] && [ -n "$(ls -A "${PONG_DIR}")" ]; then
		fail "${PONG_DIR} exists and is not empty — refusing to write into it.
  Pick another directory with: PONG_DIR=./some-dir sh get-pong.sh"
	fi
	if [ "$NO_START" -eq 0 ] && port_in_use; then
		fail "something is already listening on port ${PONG_PORT} — stop it first, or use --no-start
  and adjust the port mapping in ${PONG_DIR}/compose.yml before starting."
	fi

	INSTALL_VERSION="${REQUESTED_VERSION:-$(resolve_pong_version)}"
	mkdir -p "${PONG_DIR}"
	STEP="stack-definition-download"
	write_compose
	STEP=""
	ok "Created ${PONG_DIR}/compose.yml"
	write_searxng_settings
	ok "Created ${PONG_DIR}/searxng-settings.yml"
	write_env
	ok "Created ${PONG_DIR}/.env (unique secrets generated)"

	if [ "$NO_START" -eq 1 ]; then
		say ""
		say "Not starting (--no-start). When ready:"
		say "  docker compose -f ${PONG_DIR}/compose.yml up -d"
		exit 0
	fi

	say "Pulling images (this can take a few minutes on first run)..."
	STEP="image-pull"
	compose_pull
	STEP="container-start"
	compose_checked up -d --quiet-pull
	ok "Started pong ${INSTALL_VERSION} and sandbox services"
	STEP="pong-readiness-timeout"
	wait_for_pong || fail "pong did not become ready — check 'docker compose -f ${PONG_DIR}/compose.yml logs pong'."
	print_summary
}

# main is called on the last line so a truncated download executes nothing.
main "$@"

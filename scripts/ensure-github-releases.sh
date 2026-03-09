#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  ensure-github-releases.sh [tag ...]
  ensure-github-releases.sh --points-at-ref <ref> [--pattern <glob>]
  ensure-github-releases.sh --all-tags [--pattern <glob>] [--latest=false]

Examples:
  ensure-github-releases.sh --points-at-ref HEAD --pattern '@no-mess/*'
  ensure-github-releases.sh --all-tags --pattern '@no-mess/*' --latest=false
EOF
}

mode="points-at-ref"
ref="HEAD"
pattern=""
latest_setting=""
declare -a explicit_tags=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all-tags)
      mode="all-tags"
      ;;
    --points-at-ref)
      mode="points-at-ref"
      shift
      ref="${1:?missing ref for --points-at-ref}"
      ;;
    --pattern)
      shift
      pattern="${1:?missing glob for --pattern}"
      ;;
    --latest=false)
      latest_setting="false"
      ;;
    --latest)
      latest_setting="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      mode="explicit"
      explicit_tags+=("$1")
      ;;
  esac
  shift
done

declare -a tags=()

if [[ "$mode" == "explicit" ]]; then
  tags=("${explicit_tags[@]}")
elif [[ "$mode" == "all-tags" ]]; then
  if [[ -n "$pattern" ]]; then
    mapfile -t tags < <(git tag --list "$pattern")
  else
    mapfile -t tags < <(git tag)
  fi
else
  if [[ -n "$pattern" ]]; then
    mapfile -t tags < <(git tag --list "$pattern" --points-at "$ref")
  else
    mapfile -t tags < <(git tag --points-at "$ref")
  fi
fi

if [[ ${#tags[@]} -eq 0 ]]; then
  echo "No matching tags found."
  exit 0
fi

for tag in "${tags[@]}"; do
  if gh release view "$tag" >/dev/null 2>&1; then
    echo "Release already exists for $tag"
    continue
  fi

  echo "Creating GitHub release for $tag"
  declare -a create_args=(
    release create "$tag"
    --title "$tag"
    --generate-notes
    --verify-tag
  )

  if [[ "$latest_setting" == "true" ]]; then
    create_args+=(--latest)
  elif [[ "$latest_setting" == "false" ]]; then
    create_args+=(--latest=false)
  fi

  gh "${create_args[@]}"
done

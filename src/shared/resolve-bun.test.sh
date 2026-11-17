#!/usr/bin/env bash
# Regression: PATH bun wrappers can be executable and still fail at exec
# (musl PT_INTERP missing, deleted target, wrong-OS stub). Resolver must skip
# them. Keep functions in sync with src/templates/install.sh markers.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TEMPLATE="$ROOT/src/templates/install.sh"

extract_resolver() {
  awk '/# CLAWGOD_BUN_RESOLVER_BEGIN/{p=1; next} /# CLAWGOD_BUN_RESOLVER_END/{p=0} p' "$TEMPLATE"
}

resolver="$(extract_resolver)"
if [ -z "$resolver" ]; then
  echo "FAIL: bun resolver markers missing from $TEMPLATE" >&2
  exit 1
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
printf '%s\n' "$resolver" > "$WORK/resolver.sh"

mkdir -p "$WORK/bin" "$WORK/home/.bun/bin"

cat > "$WORK/bin/broken-bun" <<'EOF'
#!/bin/sh
exec /this/path/does/not/exist/bun "$@"
EOF
chmod +x "$WORK/bin/broken-bun"

cat > "$WORK/bin/good-bun" <<'EOF'
#!/bin/sh
echo 1.3.14
EOF
chmod +x "$WORK/bin/good-bun"

cp "$WORK/bin/good-bun" "$WORK/home/.bun/bin/bun"
chmod +x "$WORK/home/.bun/bin/bun"

ln -s "$WORK/bin/broken-bun" "$WORK/bin/bun"

run_resolve() {
  HOME="$WORK/home" PATH="$WORK/bin:$PATH" \
    bash -c 'source "$1"; clawgod_resolve_bun "${2:-}"' bash "$WORK/resolver.sh" "${1:-}"
}

# 1. PATH bun is broken, baked empty → home bun
got="$(run_resolve)"
if [ "$got" != "$WORK/home/.bun/bin/bun" ]; then
  echo "FAIL: expected home bun, got: $got" >&2
  exit 1
fi

# 2. baked good path wins over PATH wrapper
got="$(run_resolve "$WORK/bin/good-bun")"
if [ "$got" != "$WORK/bin/good-bun" ]; then
  echo "FAIL: expected baked good bun, got: $got" >&2
  exit 1
fi

# 3. baked broken path is skipped
got="$(run_resolve "$WORK/bin/broken-bun")"
if [ "$got" != "$WORK/home/.bun/bin/bun" ]; then
  echo "FAIL: expected skip baked broken, got: $got" >&2
  exit 1
fi

# 4. no home bun, PATH bun broken → fail
rm -f "$WORK/home/.bun/bin/bun"
if HOME="$WORK/home" PATH="$WORK/bin:$PATH" \
  bash -c 'source "$1"; clawgod_resolve_bun' bash "$WORK/resolver.sh"
then
  echo "FAIL: expected resolve failure when every candidate is broken" >&2
  exit 1
fi

# 5. no home bun, PATH bun good
rm -f "$WORK/bin/bun"
ln -s "$WORK/bin/good-bun" "$WORK/bin/bun"
got="$(HOME="$WORK/home" PATH="$WORK/bin:$PATH" \
  bash -c 'source "$1"; clawgod_resolve_bun' bash "$WORK/resolver.sh")"
if [ "$got" != "$WORK/bin/bun" ]; then
  echo "FAIL: expected PATH bun, got: $got" >&2
  exit 1
fi

echo "ok: bun resolver skips unrunnable wrappers"

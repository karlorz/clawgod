# Fork changelog vs upstream

Tracks **features and major changes** in this repository relative to the upstream copy (`{UPSTREAM_REPOSITORY}` = historical `0Chencc/clawgod`).

- **Upstream baseline tag (immutable):** `v1.6.1` @ `f61ff7d` — do not move or re-release this tag on the fork.
- **First fork release:** `v1.6.1-0` (self-version `1.6.1-0`).
- **Product owner:** `{GITHUB_REPOSITORY}` only for install / self-update / badges.

Upstream product URL / domain must not reappear in installers or self-update paths. Attribution to upstream under GPL-3.0 is required.

---

## v1.9.3-0 — merge upstream v1.9.3 (2026-09-05)

**Base:** upstream `v1.9.3` + fork train. Self-version / tag: `1.9.3-0` / `v1.9.3-0`. Release published 2026-09-05 ~15:46Z. Compare: `v1.7.5-2...v1.9.3-0`.

### From upstream (prefer upstream)

| Area | Change |
|------|--------|
| **Claude ESM / Windows chunks** | Support v2.1.245+ ESM chunk-graph layout; preserve Windows `B:/~BUN/root` chunk paths; tolerate successful Windows stderr in CI |
| **Installer build** | Reproducible build sources; shared `cli.cjs` cleanup / dedupe into `src/shared/cli.cjs` |
| **Windows install** | Support `irm \| iex` pipe execution (BOM / package-path fixes) |
| **CI** | Native Node.js 24 actions; macOS 26 ARM64 daily compatibility checks |
| **Patches** | Feature registry + `CLAWGOD_FEATURE_*` / `patches.json` toggles; auto-mode classifier tuning; classifier timeout floor helper + tests |

### Fork interest routing kept

| Keep | Detail |
|------|--------|
| **Product URLs** | Install / update-check / `claude update` / reinstall / import assets → `karlorz/clawgod` only |
| **Sync SoT** | `upstream-sync-pr.yml` (Actions) + preserve isolation on conflict merges (`#17`, `#18`, `#20`) |
| **compat-daily** | Green on the v1.9.3 merge line; do not treat historical 2.1.214 “expected red” notes as current |
| **Docs / identity** | Fork changelog, rebranded READMEs/web, no CNAME |

Tag policy: never move upstream `v1.9.3`; ship fork as `v1.9.3-0`.

### Verify after install

```bash
grep -E 'karlorz/clawgod|0Chencc' ~/.clawgod/cli.cjs | head
# expect karlorz only
cat ~/.clawgod/.clawgod-version
# expect 1.9.3-0 (or newer fork train)
```

---

## v1.7.5-2 — README-only guard + Claude 2.1.227–238 patches (2026-08-23)

**Base:** fork `v1.7.5-1`. Self-version / tag: `1.7.5-2` / `v1.7.5-2`. Compare: `v1.7.5-1...v1.7.5-2`.

### Major changes

| Area | Change |
|------|--------|
| **CI** | Reject README-only PRs (`reject-readme-only.yml`) — PRs that only touch `README.md` / `README_JP.md` / `README_ZH.md` fail |
| **Patches** | Match `claude update` action wrapper for v2.1.227+; Bun.isStandaloneExecutable guard for v2.1.236+; minified action helper rename for v2.1.238 |
| **Herdr** | Expose Claude identity to Herdr agent detection |
| **Docs** | Index architecture references; compat issues referenced for auto-close |

### Fork interest routing kept

Product URLs, lean deny lists, compat-daily auto-issue, and fork identity docs remain on `karlorz/clawgod` only.

---

## v1.6.1-0 — Fork isolation (2026-07-18)

**Base:** upstream `v1.6.1`.

### Major features / changes

| Area | Change |
|------|--------|
| **Product identity** | Single repo constant `CLAWGOD_GITHUB_REPO` / `$ClawGodGitHubRepo` = this fork |
| **Install** | Header examples, release download URLs → this fork only |
| **Update check** | Wrapper polls `api.github.com/repos/{GITHUB_REPOSITORY}/releases/latest` |
| **`claude update`** | Redirect still re-runs installer; download host is this fork’s `releases/latest` |
| **Reinstall messages** | Launchers point at this fork’s install assets |
| **Docs / web** | README badges, handbook install snippets, landing install widgets → this fork |
| **CNAME** | Removed upstream Pages host (`clawgod.0chen.cc`) |
| **Attribution** | README “derived from upstream” + migration section (one-shot curl) |
| **Tag policy** | Patch train `v1.6.1-0`, `v1.6.1-1`, …; never override `v1.6.1` |
| **CI** | `release` / `compat-daily` / `cache-cleanup-weekly` logic matches upstream; targets this repo via `github.repository` |

### Explicitly not in this release

- Claude Code **2.1.214** patch regex fixes (Ultrareview, third-party auto-mode gate) — deferred; `compat-daily` expected red on current `@latest` (`24 applied, 7 skipped, 2 failed`).
- Auto-pin bare `claude update` to a known-good Claude version — deferred (still npm `@latest` unless `--version`).

### Commits (fork train on top of `v1.6.1`)

| Commit | Summary |
|--------|---------|
| `f8b623b` | install: self-update / install URLs → fork |
| `98fb812` | docs/web rebrand; drop CNAME |
| `25e609f` | simplify: single repo constant; drop unused URL constants |
| `abb5a01` | tag train `1.6.1-0`; CI/tag policy docs |
| `207a76b` | clarify one-shot migration curl |

### Migration (old upstream install → this fork)

```bash
curl -fsSL https://github.com/{GITHUB_REPOSITORY}/releases/latest/download/install.sh | bash
```

Do not rely on `claude update` until that one-shot reinstall has rewritten `~/.clawgod/`.

### Verify after install

```bash
grep -E 'api.github.com/repos|releases/latest/download' ~/.clawgod/cli.cjs | head
cat ~/.clawgod/.clawgod-version   # expect 1.6.1-0 or newer fork train
```

---

## v1.7.5-0 — merge upstream v1.7.5 (2026-07-24)

**Base:** upstream `v1.7.5` (`507405a`) + fork train. Self-version / tag: `1.7.5-0` / `v1.7.5-0` (source placeholder `0.0.0-dev`; release workflow injects from git tag).

### From upstream v1.7.1–v1.7.5 (prefer upstream)

| Area | Change | Upstream |
|------|--------|----------|
| **Update prompt** | Show notice only when remote semver is **newer** (`_semGt`), not on mere inequality | v1.7.5 |
| **ANSI green theme** | Non-truecolor: `claude` / `claudeShimmer` / `briefLabelClaude` → green ANSI/RGB | v1.7.5 (#137) |
| **Windows uninstall** | Remove clawgod launcher when no `claude.orig` backup; clean `openai-proxy` + import binary | v1.7.4 |
| **`fv()` / Bun standalone** | Patch `Bun.isStandaloneExecutable` in source (not runtime monkey-patch); Bun 1.4+ unconfigurable property; compat functional checks | v1.7.3 |
| **Release version inject** | CI rewrites `CLAWGOD_SELF_VERSION` / `$ClawSelfVersion` from git tag | v1.7.2 |
| **PSScriptRoot** | Safe `openai-proxy.cjs` load under `iex` | v1.7.1 |

### Fork security hardenings (vs upstream)

| Area | Change |
|------|--------|
| **Remote Control opt-in** | Upstream cleared `disableRemoteControl` for any non-Anthropic `baseURL`. Fork requires **`CLAWGOD_ENABLE_REMOTE_CONTROL=1`** or `provider.json` **`enableRemoteControl: true`**, and logs when it clears the lean flag. Default lean Remote Control stays off. |
| **baseURL host match** | Hostname parse (`api.anthropic.com` / `*.anthropic.com`) instead of `/anthropic.com/` substring |
| **Release tag allowlist** | Inject step rejects tags outside `N.N.N` / fork-train (`1.7.5-0`); uses `|` sed delimiters |

---

## v1.7.5-1 — import CI + Claude 2.1.218 patch track (2026-07-24)

**Base:** fork `v1.7.5-0`. Self-version / tag: `1.7.5-1` / `v1.7.5-1`.

### P1 — import CI (`build-import.yml`)

| Area | Change |
|------|--------|
| **darwin-x64 runner** | `macos-13` → **`macos-15-intel`** (macos-13 retired Dec 2025; jobs queued forever / never attached import assets) |

Evidence: GitHub changelog 2025-09-19; docs list `macos-15-intel` / `macos-26-intel` as current Intel labels.

### P2 — Claude Code **2.1.218** patch track (local `cli.original.cjs`)

| Patch | 2.1.218 change | Fix |
|-------|----------------|-----|
| **GrowthBook env** | `hWr()` early-returns before reading `CLAUDE_INTERNAL_FC_OVERRIDES` (dead code) | New pattern rewrites dead return so `features.json` env injection works |
| **Agent Teams** | `Z.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` object form (not `helper(process.env.…)`) | New env-object matcher; legacy helper form kept optional |
| **Voice Mode** | `allow_voice_mode` + mic chain (`rNo`/`Cgr`); `tengu_amber_quartz_disabled` gone | New chain matcher; old quartz kill optional |
| **Computer Use gate** | `X()&&Y().enabled` form absent; **subscription + default enabled still apply** | Gate patch optional; CU still unlocked via other patches |

Legacy patterns remain `optional: true` so older Claude versions keep working.

### Fork interest routing kept

| Keep | Detail |
|------|--------|
| **Product URLs** | Install / update-check / `claude update` / reinstall / import assets → `karlorz/clawgod` only |
| **Lean deny lists** | Custom **on** / **max** denylists (EnterPlanMode + Web* on default lean) |
| **compat-daily** | Auto-open `compat-broken` issues on this repo for any **non-PR** failure (not schedule-only) |
| **Docs / identity** | Fork changelog, rebranded READMEs/web, no CNAME |

Tag policy: never move upstream `v1.7.5`; ship fork as `v1.7.5-0`.

---

## v1.7.0-0 — merge upstream v1.7.0 (2026-07-19)

**Base:** upstream `v1.7.0` (`bbf2eca`) + fork train. Self-version / tag: `1.7.0-0` / `v1.7.0-0`.

### From upstream v1.7.0 (prefer upstream)

| Area | Change |
|------|--------|
| **OpenAI-compat proxy** | Local Anthropic Messages ↔ OpenAI Chat Completions proxy (`openai-proxy.cjs`); `provider.json` `type`: `grok` / `openai-compat` |
| **Provider import CLI** | Rust `clawgod-import` + launcher `claude import` / `clawgod import`; CI `build-import.yml` |
| **Ultrareview (2.1.214)** | Prefer upstream: patch `rQt`-style gate + optional direct-literal getter (replaces fork-only const-ref Ultrareview matcher from `v1.6.1-2`) |
| **Auto-mode inline gate** | Same as prior fork fix: `!=="anthropicAws"` **or** `!helper(var)` |

### Fork interest routing kept

| Keep | Detail |
|------|--------|
| **Product URLs** | Install / update-check / `claude update` redirect / reinstall / **import binary download** → `karlorz/clawgod` only (`CLAWGOD_GITHUB_REPO` / `$ClawGodGitHubRepo`) |
| **Lean deny lists** | Custom **on** / **max** tool denylists (EnterPlanMode + Web* on default lean) |
| **compat-daily** | Auto-open `compat-broken` issues on this repo for any non-PR failure |
| **Docs / identity** | Fork changelog, rebranded READMEs/web, no CNAME |

Tag policy: never move upstream `v1.7.0`; ship fork as `v1.7.0-0`.

---

## v1.6.1-2 — Claude 2.1.214 patch fix + compat issue auto-open (2026-07-18)

**Base:** fork `v1.6.1-1`. Self-version / tag: `1.6.1-2` / `v1.6.1-2`.

### Patcher (Claude Code 2.1.214)

| Patch | 2.1.214 change | Fix |
|-------|----------------|-----|
| **Ultrareview enable** | Flag name moved to `var C="tengu_review_bughunter_config"`; getter is `function X(){return et(C,null)}` | Match string-literal **or** const-ref form; `validate` ensures const is the bughunter flag; still merge `{...cfg, enabled:!0}` |
| **Auto-mode inline gate** | `!=="anthropicAws"` became `!d6(provider)` helper | Match `!=="firstParty"&&(same!=="anthropicAws"\|!helper(same))…return!1` |

Local verify on extracted 2.1.214: **`26 applied, 7 skipped, 0 failed`**.

**Superseded by `v1.7.0-0`:** Ultrareview matcher replaced by upstream rQt-gate approach; auto-mode inline gate retained (same pattern as upstream).

### compat-daily auto-issue (this repo)

Upstream only ran issue filing when `github.event_name == 'schedule'`. Manual `workflow_dispatch` / `push` failures never opened a ticket. Fork now:

- Opens/updates issues on **this** repository for any **non-PR** failure
- Ensures labels `compat-broken` + `bug` exist before create
- Title still: `compat-daily: broke (claude <version>)`

---

## v1.6.1-1 — custom lean deny lists + apply parity (2026-07-18)

**Base:** fork `v1.6.1-0`. Self-version: `1.6.1-1`. Tag: `v1.6.1-1` (does not move `v1.6.1` / `v1.6.1-0`).

### Lean `permissions.deny` customization

| Level | Tools in `permissions.deny` |
|-------|-----------------------------|
| **on** (default) | `DesignSync`, `PushNotification`, `RemoteTrigger`, `EnterPlanMode`, `WebFetch`, `WebSearch` |
| **max** (adds to on) | `NotebookEdit`, `CronCreate`, `CronDelete`, `CronList`, `ExitPlanMode`, `SendMessage`, `ScheduleWakeup`, `AskUserQuestion`, `ReportFindings` |

### Deltas vs upstream / previous fork default

| Change | Detail |
|--------|--------|
| **Moved on → max** | `NotebookEdit`, `CronCreate`, `CronDelete`, `CronList` (available again under default lean **on**) |
| **Moved max → on** | `EnterPlanMode` (blocked by default lean) |
| **New on denies** | `WebFetch`, `WebSearch` (block model web tools on lean **on**) |
| **Unchanged flags** | Still 4 base `disable*` on fill-if-missing; `disableBundledSkills` max-only |
| **Install apply parity** | Install-time lean-on now strips max-only flags/denies (same as wrapper), so reinstall/migration matches `claude --lean-on` |

### Files

- `install.sh` / `install.ps1` — wrapper toggle + install-time lean apply
- `.github/workflows/compat-daily.yml` — assert lean-on deny samples (`DesignSync`, `EnterPlanMode`, `WebFetch`, `WebSearch`)

Apply with reinstall from this fork’s release or:

```bash
claude --lean-on    # or --lean-max / --lean-off
```

---

## Upstream baseline retained (current tip v1.9.3)

Everything in upstream through `v1.9.3` is the shared code base (historical notes below still mention the v1.7.5 era) (OpenAI-compat proxy, provider import, lean mode, Bun standalone / `fv()` patches, ANSI green theme, update-prompt semver compare, etc.). This file only lists **fork deltas** after that point.

When adding a new fork release:

1. Bump self-version and tag per train (`v1.7.5-N` or next upstream line). Source placeholder stays `0.0.0-dev`; release injects from the tag.
2. Append a section here with features / major changes / deferred items.
3. Link the section from [README.md](../README.md) only if user-facing; keep long detail here.
4. Index new wiki work items from root `CLAUDE.md` using `{WIKI_VAULT}/...` placeholders.

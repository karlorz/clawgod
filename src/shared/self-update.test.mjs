import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { constants, tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

const root = mkdtempSync(join(tmpdir(), 'clawgod-self-update-'));
const fixtures = [];

// Capture and execute the handler emitted by the real patcher. Throwing from
// process.exit also proves that the original upstream handler cannot run.
async function redirect(source, platform, { result = { status: 0 }, argv = ['update'], env = {}, spawn } = {}) {
  const stop = new Error('process exited');
  let handler, exitCode, stderr = '';
  const calls = [];
  const command = {};
  for (const method of ['command', 'alias', 'description', 'allowUnknownOption']) command[method] = () => command;
  command.action = fn => { handler = fn; return command; };
  runInNewContext(source, {
    cmd: command, s: fn => fn,
    process: {
      argv: ['bun', 'cli.cjs', ...argv], platform, env,
      stderr: { write(text) { stderr += text; } },
      exit(code) { exitCode = code; throw stop; },
    },
    require(name) {
      if (name === 'os' || name === 'node:os') return { constants };
      assert.equal(name, 'child_process');
      return { spawnSync(executable, args, options) {
        calls.push({ executable, args: Array.from(args), options });
        return spawn ? spawn(executable, args, options) : result;
      } };
    },
  });
  assert.equal(typeof handler, 'function');
  await assert.rejects(handler(), error => error === stop);
  assert.equal(calls.length, 1);
  return { exitCode, stderr, env, call: calls[0] };
}

try {
  for (const graph of [false, true]) {
    for (const wrapped of [false, true]) {
      const dir = join(root, `${graph ? 'graph' : 'legacy'}-${wrapped ? 'wrapped' : 'direct'}`);
      mkdirSync(dir);
      for (const name of ['patch.mjs', 'ast-patches.mjs', 'acorn.mjs']) {
        copyFileSync(new URL(`./${name}`, import.meta.url), join(dir, name));
      }
      const entry = join(dir, 'cli.original.cjs');
      if (graph) {
        mkdirSync(join(dir, 'bunfs'));
        writeFileSync(entry, '// Version: 2.1.299\n// graph entry\n');
      }
      const target = graph ? join(dir, 'bunfs/commands.js') : entry;
      const action = 'async(A)=>{throw new Error("upstream handler ran")}';
      writeFileSync(target, `// Version: 2.1.299\ncmd.command("update").alias("upgrade").description("Update").action(${wrapped ? `s(${action})` : action});\n`);
      const patch = (...args) => {
        const result = spawnSync(process.execPath, [join(dir, 'patch.mjs'), ...args], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr + result.stdout);
        return result.stdout.match(/Result: .*/)?.[0];
      };
      patch('--capture-clean-source');
      const summary = patch();
      const source = readFileSync(target, 'utf8');
      assert.equal(patch(), summary, 'repeat patching preserves the result');
      assert.equal(readFileSync(target, 'utf8'), source, 'repeat patching preserves the handler');
      fixtures.push(source);

      for (const platform of ['linux', 'darwin', 'win32']) {
        for (const [result, expected] of [
          [{ status: 0 }, 0], [{ status: 7 }, 7],
          [{ status: null, error: Object.assign(new Error('fixture'), { code: 'ENOENT' }) }, 1],
          [{ status: null, signal: 'SIGTERM' }, 128 + constants.signals.SIGTERM],
          [{ status: null, signal: 'SIGINT' }, 128 + constants.signals.SIGINT],
          [{ status: null, signal: 'UNKNOWN' }, 1],
          [{ status: null }, 1], [{}, 1], [{ status: -1 }, 1],
        ]) {
          const actual = await redirect(source, platform, { result });
          assert.equal(actual.exitCode, expected, `${platform}: ${JSON.stringify(result)}`);
          if (expected !== 0 && result.status !== 7) assert.match(actual.stderr, /\[clawgod\].*(?:failed|signal|start|status)/i);
        }
        for (const alias of ['update', 'upgrade']) {
          const flags = [
            ['--version', 'CLAWGOD_VERSION', '2.1.299'],
            ['--no-upgrade', 'CLAWGOD_NO_UPGRADE', '1'],
            ['--tolerate-stale', 'CLAWGOD_TOLERATE_STALE', '1'],
            ['--lean-on', 'CLAWGOD_LEAN_ON', '1'],
            ['--lean-off', 'CLAWGOD_LEAN_OFF', '1'],
            ['--lean-max', 'CLAWGOD_LEAN_MAX', '1'],
          ];
          for (const [flag, key, value] of flags) {
            const env = { IS_SANDBOX: '1', ANTHROPIC_AUTH_TOKEN: 'fixture-private-token' };
            const actual = await redirect(source, platform, { argv: [alias, flag, ...(flag === '--version' ? [value] : [])], env });
            assert.equal(actual.env[key], value);
            assert.equal(actual.call.options.env, env);
            assert.equal(env.IS_SANDBOX, '1');
            assert.equal(env.ANTHROPIC_AUTH_TOKEN, 'fixture-private-token');
            assert.equal(actual.call.options.stdio, 'inherit');
            assert.doesNotMatch(actual.stderr, /fixture-private-token/);
          }
          const env = { CLAWGOD_VERSION: 'existing-pin' };
          await redirect(source, platform, { argv: [alias], env });
          assert.equal(env.CLAWGOD_VERSION, 'existing-pin');
        }
      }
    }
  }
  console.log('[self-update.test] generated legacy/graph handlers, aliases, options, and subprocess outcomes passed');

  if (process.platform !== 'win32') {
    const bin = join(root, 'mock bin \u00fc');
    mkdirSync(bin);
    writeFileSync(join(bin, 'curl'), `#!/bin/bash
set -e
printf '%s\\n' "$@" > "$CLAWGOD_TEST_CURL_ARGS"
target=''
while [ "$#" -gt 0 ]; do
  if [ "$1" = '-o' ] || [ "$1" = '--output' ]; then target="$2"; shift 2; else shift; fi
done
if [ -z "$target" ]; then exit 99; fi
case "$CLAWGOD_TEST_DOWNLOAD" in
  failure) exit 22 ;;
  partial) printf '%s\\n' "$CLAWGOD_TEST_INSTALLER" > "$target"; exit 18 ;;
  empty) : > "$target" ;;
  success) printf '%s\\n' "$CLAWGOD_TEST_INSTALLER" > "$target" ;;
esac
`, { mode: 0o755 });
    for (const [index, source] of fixtures.entries()) {
      for (const [label, download, installer, expected, executed] of [
        ['success', 'success', 'exit 0', 0, true],
        ['installer failure', 'success', 'exit 7', 7, true],
        ['download failure', 'failure', 'exit 0', 22, false],
        ['partial download', 'partial', 'exit 0', 18, false],
        ['empty download', 'empty', 'exit 0', 1, false],
        ['termination', 'success', 'kill -TERM "$PPID"; exit 0', 143, true],
      ]) {
        const dir = join(root, `posix ${index} ${label} \u00fc`);
        const temp = join(dir, 'temporary files');
        mkdirSync(temp, { recursive: true });
        const marker = join(dir, 'executed');
        const argsFile = join(dir, 'curl-args');
        const env = {
          ...process.env, PATH: `${bin}:${process.env.PATH}`, TMPDIR: temp,
          CLAWGOD_TEST_DOWNLOAD: download, CLAWGOD_TEST_CURL_ARGS: argsFile,
          CLAWGOD_TEST_MARKER: marker,
          CLAWGOD_TEST_INSTALLER: `printf tested > "$CLAWGOD_TEST_MARKER"\n${installer}\n`,
        };
        let child;
        const actual = await redirect(source, process.platform, { env, spawn(command, args, options) {
          child = spawnSync(command, args, { ...options, stdio: 'pipe', encoding: 'utf8', timeout: 10000 });
          return child;
        } });
        assert.equal(actual.exitCode, expected, `${label}: ${child.stderr}`);
        assert.equal(existsSync(marker), executed, `${label}: installer execution`);
        assert.deepEqual(readdirSync(temp), [], `${label}: temporary directory removed`);
        assert.ok(readFileSync(argsFile, 'utf8').includes('https://github.com/karlorz/clawgod/releases/latest/download/install.sh'));
      }
    }
    console.log('[self-update.test] real Bash downloads, partial/empty responses, installer exits, paths, and signal cleanup passed');
  }

  if (process.platform === 'win32') {
    const quote = value => "'" + value.replaceAll("'", "''") + "'";
    for (const [index, source] of fixtures.entries()) {
      const captured = await redirect(source, 'win32');
      assert.equal(captured.call.executable, 'powershell');
      assert.deepEqual(captured.call.args.slice(0, 2), ['-NoProfile', '-EncodedCommand']);
      const payload = Buffer.from(captured.call.args[2], 'base64').toString('utf16le');
      for (const [label, response, downloadError, expected, executed] of [
        ['success', 'exit 0', false, 0, true],
        ['installer failure', 'exit 7', false, 7, true],
        ['installer exception', 'throw "fixture installer error"', false, 1, true],
        ['download exception', '', true, 1, false],
        ['empty download', '', false, 1, false],
        ['blank download', '   ', false, 1, false],
      ]) {
        for (const proxy of ['none', 'http', 'https']) {
          const dir = join(root, `windows ${index} ${label} ${proxy} \u00fc`);
          mkdirSync(dir);
          const marker = join(dir, 'executed');
          const record = join(dir, 'request.json');
          const installer = response.trim() ? `[IO.File]::WriteAllText(${quote(marker)},'tested');${response}` : response;
          const script = `
function Invoke-RestMethod {
  param([Parameter(Position=0)][string]$Uri,[string]$Proxy)
  @{Uri=$Uri;Proxy=$Proxy;ProxySpecified=$PSBoundParameters.ContainsKey('Proxy')} | ConvertTo-Json -Compress | Set-Content -Encoding ASCII ${quote(record)}
  ${downloadError ? "Write-Error 'fixture download error'" : `return ${quote(installer)}`}
}
${payload}
`;
          const env = { ...process.env };
          for (const key of Object.keys(env)) if (/^https?_proxy$/i.test(key)) delete env[key];
          if (proxy !== 'none') env.HTTP_PROXY = 'http://http-proxy.invalid:8080';
          if (proxy === 'https') env.HTTPS_PROXY = 'http://https-proxy.invalid:8081';
          let child;
          const actual = await redirect(source, 'win32', { env, spawn(command, args, options) {
            const encoded = Buffer.from(script, 'utf16le').toString('base64');
            child = spawnSync(command, [args[0], args[1], encoded], { ...options, stdio: 'pipe', encoding: 'utf8', timeout: 15000 });
            return child;
          } });
          assert.equal(actual.exitCode, expected, `${label}/${proxy}: ${child.stderr}`);
          assert.equal(existsSync(marker), executed, `${label}: installer execution`);
          const request = JSON.parse(readFileSync(record, 'utf8').replace(/^\uFEFF/, ''));
          assert.equal(request.Uri, 'https://github.com/karlorz/clawgod/releases/latest/download/install.ps1');
          assert.equal(request.ProxySpecified, proxy !== 'none');
          assert.equal(request.Proxy, proxy === 'https' ? env.HTTPS_PROXY : proxy === 'http' ? env.HTTP_PROXY : '');
        }
      }
    }
    console.log('[self-update.test] real PowerShell encoded payload, downloads, exceptions, installer exits, and proxies passed');
  } else {
    console.log('[self-update.test] PowerShell execution is covered by the Windows smoke job');
  }
} finally {
  rmSync(root, { recursive: true, force: true });
}

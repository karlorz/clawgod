const fs = require("fs");
const settingsPath = process.argv[1];
const isMax = process.argv[2] === "true";
const baseDeny = ["DesignSync","PushNotification","RemoteTrigger","EnterPlanMode","WebFetch","WebSearch"];
const maxDeny = ["NotebookEdit","CronCreate","CronDelete","CronList","ExitPlanMode","SendMessage","ScheduleWakeup","AskUserQuestion","ReportFindings"];
const baseFlags = ["disableWorkflows","disableRemoteControl","disableClaudeAiConnectors","disableArtifact"];
const maxFlags = ["disableBundledSkills"];
const deny = isMax ? [...baseDeny, ...maxDeny] : baseDeny;
const flags = isMax ? [...baseFlags, ...maxFlags] : baseFlags;
let s = {};
try { s = JSON.parse(fs.readFileSync(settingsPath, "utf8")); } catch {}
let changed = false;
for (const k of flags) { if (!(k in s)) { s[k] = true; changed = true; } }
// Match wrapper: if downgrading from max to on, drop max-only keys/denies
if (!isMax) { for (const k of maxFlags) { if (k in s) { delete s[k]; changed = true; } } }
if (!s.permissions) s.permissions = {};
if (!Array.isArray(s.permissions.deny)) s.permissions.deny = [];
const ex = new Set(s.permissions.deny);
for (const t of deny) { if (!ex.has(t)) { s.permissions.deny.push(t); changed = true; } }
if (!isMax) {
  const maxSet = new Set(maxDeny);
  const before = s.permissions.deny.length;
  s.permissions.deny = s.permissions.deny.filter(function(t) { return !maxSet.has(t); });
  if (s.permissions.deny.length !== before) changed = true;
}
if (changed) fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2) + "\n");

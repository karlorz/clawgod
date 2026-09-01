const fs=require("fs"),p=process.argv[1];
const baseDeny=["DesignSync","PushNotification","RemoteTrigger","EnterPlanMode","WebFetch","WebSearch"];
const maxDeny=["NotebookEdit","CronCreate","CronDelete","CronList","ExitPlanMode","SendMessage","ScheduleWakeup","AskUserQuestion","ReportFindings"];
const allDeny=new Set([...baseDeny,...maxDeny]);
const allFlags=["disableWorkflows","disableRemoteControl","disableClaudeAiConnectors","disableArtifact","disableBundledSkills"];
let s={};try{s=JSON.parse(fs.readFileSync(p,"utf8"))}catch{process.exit(0)}
for(const k of allFlags)delete s[k];
if(Array.isArray(s.permissions?.deny))s.permissions.deny=s.permissions.deny.filter(t=>!allDeny.has(t));
fs.writeFileSync(p,JSON.stringify(s,null,2)+"\n");

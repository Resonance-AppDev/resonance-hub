// Dependency-free, local-only forge controls. Node 20+; Git on PATH.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';

const SELF = fileURLToPath(import.meta.url);
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const SHA = /^[0-9a-f]{64}$/;
const die = (condition, message) => { if (!condition) throw new Error(message); };
export const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value) + '\n', 'utf8');
function strictJSON(bytes, label) {
  const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const value = JSON.parse(raw);
  // Requiring one canonical serialization rejects duplicate keys, ambiguity and trailing data.
  die(raw === JSON.stringify(value) || raw === JSON.stringify(value) + '\n', `${label}: noncanonical JSON; use supplied writer`);
  return value;
}
function keys(value, expected, label) {
  die(value && typeof value === 'object' && !Array.isArray(value), `${label}: object required`);
  die(Object.keys(value).sort().join('|') === [...expected].sort().join('|'), `${label}: unexpected or missing fields`);
}
function local(p) {
  die(typeof p === 'string' && path.isAbsolute(p) && !p.startsWith('\\\\') && !p.startsWith('//'), 'An absolute local-disk path is required (no URL, UNC or remote name)');
  const real = fs.realpathSync(p);
  die(!real.startsWith('\\\\') && !real.startsWith('//'), 'Network paths are not supported');
  return real;
}
const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
function envForGit(inheritReceive = false) {
  const env = { ...process.env };
  if (!inheritReceive) for (const key of Object.keys(env)) if (key.startsWith('GIT_')) delete env[key];
  return { ...env, GIT_ALLOW_PROTOCOL: 'file', GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0', GIT_NO_REPLACE_OBJECTS: '1', GIT_LFS_SKIP_SMUDGE: '1', GIT_OPTIONAL_LOCKS: '0' };
}
export function git(repo, args, receive = false) {
  const result = spawnSync('git', ['-C', repo, ...args], { env: envForGit(receive), maxBuffer: 32 * 1024 * 1024 });
  die(!result.error && result.status === 0, `git ${args[0]} failed: ${result.error?.message || result.stderr?.toString().trim() || result.status}`);
  return result.stdout;
}
const textGit = (r, a, q = false) => git(r, a, q).toString('utf8').trim();
function bare(p) { const r = local(p); die(textGit(r, ['rev-parse', '--is-bare-repository']) === 'true', 'Authority must be an existing bare repository'); return r; }
function head(r, ref = 'HEAD', q = false) { return textGit(r, ['rev-parse', '--verify', `${ref}^{commit}`], q); }
function tree(r, oid, q = false) { return textGit(r, ['rev-parse', `${oid}^{tree}`], q); }
function exactSource(repo, candidate) {
  die(OID.test(candidate), 'Expected candidate must be a full lowercase commit SHA');
  die(head(repo) === candidate, 'Checked-out HEAD differs from the exact candidate');
  die(git(repo, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).length === 0, 'Source must be clean, including untracked files');
}
function assertDirectLocalPush(repo) {
  const config = git(repo, ['config', '--list', '--null']).toString('utf8');
  for (const row of config.split('\0')) {
    const name = row.split('\n', 1)[0].toLowerCase();
    die(!/^url\..*\.(insteadof|pushinsteadof)$/.test(name), 'Git URL rewriting must be reviewed before direct local publication');
  }
  // Client hooks are arbitrary programs; do not invoke an unreviewed hook during a local-only operation.
  const hook = textGit(repo, ['rev-parse', '--git-path', 'hooks/pre-push']);
  die(!fs.existsSync(path.resolve(repo, hook)), 'A client pre-push hook exists; review it separately before local publication');
}
function writeNew(p, value) { fs.writeFileSync(p, encode(value), { flag: 'wx', mode: 0o600 }); }
function checkReceipt(receipt, candidate, expectedTree) {
  die(receipt.schema === 'resonance-forge-validation/v2', 'Wrong validation receipt schema');
  die(receipt.candidate === candidate && receipt.tree === expectedTree && receipt.clean === true && receipt.status === 'passed', 'Validation receipt does not certify this exact clean candidate');
  for (const name of ['traceability', 'openNovaManifest', 'workerOps', 'gitDiffCheck', 'noNestedGit']) die(receipt.checks?.[name] === true, `Required source check missing: ${name}`);
  die(receipt.applicationValidationPerformed === false, 'Source gate receipt must not claim application certification');
}
function policyAt(repo) {
  const p = strictJSON(fs.readFileSync(path.join(repo, 'governance', 'policy.json')), 'policy');
  die(p.schema === 'resonance-forge-policy/v2' && ID.test(p.repositoryId), 'Invalid server policy');
  die(same(local(p.repositoryPath), local(repo)), 'Policy is bound to a different repository');
  die(['canonical', 'mirror'].includes(p.role), 'Invalid policy role');
  die(digest(fs.readFileSync(path.join(repo, 'governance', 'forge-control.mjs'))) === p.engineSha256, 'Installed engine hash mismatch');
  die(digest(fs.readFileSync(path.join(repo, 'governance', 'hooks', 'pre-receive'))) === p.hookSha256, 'Installed receive hook hash mismatch');
  die(digest(fs.readFileSync(path.join(repo, 'governance', 'hooks', 'post-receive'))) === p.postHookSha256, 'Installed post-receive hook hash mismatch');
  return p;
}
function verifyEnvelope(repo, old, promoted, id, policy, receive = false) {
  die(ID.test(id), 'Invalid approval id');
  const approvalPath = `evidence/approvals/${id}.json`;
  const entry = textGit(repo, ['ls-tree', promoted, '--', approvalPath], receive);
  die(entry.startsWith('100644 blob '), 'Approval must be a regular nonexecutable committed file');
  const blob = git(repo, ['show', `${promoted}:${approvalPath}`], receive);
  die(blob.length <= 128 * 1024, 'Approval record too large');
  const envelope = strictJSON(blob, 'approval envelope');
  keys(envelope, ['payload', 'signature'], 'approval envelope');
  die(typeof envelope.payload === 'string' && typeof envelope.signature === 'string', 'Approval envelope fields must be strings');
  const payloadBytes = Buffer.from(envelope.payload, 'base64');
  const signature = Buffer.from(envelope.signature, 'base64');
  die(payloadBytes.toString('base64') === envelope.payload && signature.toString('base64') === envelope.signature && signature.length === 64, 'Invalid base64 or Ed25519 signature');
  const a = strictJSON(payloadBytes, 'signed approval');
  keys(a, ['schema','repositoryId','approvalId','reviewer','oldMain','candidate','candidateTree','validation','issuedAt','expiresAt','scope','status','decision','productionDeploymentAuthorized','dnsChangeAuthorized'], 'signed approval');
  die(a.schema === 'resonance-human-source-approval/v2' && a.repositoryId === policy.repositoryId && a.approvalId === id, 'Approval identity mismatch');
  die(a.status === 'approved' && a.decision === 'approved' && a.scope === 'canonical-source-promotion-only' && a.productionDeploymentAuthorized === false && a.dnsChangeAuthorized === false, 'Approval scope/status mismatch');
  die(ID.test(a.reviewer) && Object.hasOwn(policy.reviewers, a.reviewer), 'Reviewer is not enrolled in server policy');
  const key = crypto.createPublicKey(policy.reviewers[a.reviewer]);
  die(key.asymmetricKeyType === 'ed25519' && crypto.verify(null, payloadBytes, key, signature), 'Trusted reviewer signature verification failed');
  die(OID.test(a.oldMain) && OID.test(a.candidate) && OID.test(a.candidateTree) && a.oldMain === old, 'Approval does not bind the current main');
  const now = Date.now(), issued = Date.parse(a.issuedAt), expiry = Date.parse(a.expiresAt);
  die(Number.isFinite(issued) && Number.isFinite(expiry) && issued <= now + 60000 && expiry > now && expiry > issued && expiry - issued <= 7 * 86400000, 'Approval expired or timestamp invalid');
  die(tree(repo, a.candidate, receive) === a.candidateTree, 'Approved candidate tree mismatch');
  git(repo, ['merge-base', '--is-ancestor', old, a.candidate], receive);
  checkReceipt(a.validation, a.candidate, a.candidateTree);
  const parents = textGit(repo, ['rev-list', '--parents', '-n', '1', promoted], receive).split(' ');
  die(parents.length === 2 && parents[1] === a.candidate, 'Promotion must be one approval-only commit directly on the candidate');
  const changed = git(repo, ['diff', '--no-ext-diff', '--no-renames', '--name-only', '-z', a.candidate, promoted], receive).toString('utf8').split('\0').filter(Boolean);
  die(changed.length === 1 && changed[0] === approvalPath, 'Only this signed approval JSON may change after the reviewed candidate');
  return a;
}
export function receive(repo, input, options = []) {
  repo = local(repo);
  const policy = policyAt(repo);
  const lines = input.trim().split('\n').filter(Boolean);
  die(lines.length > 0, 'Empty receive transaction');
  const updates = lines.map(line => {
    const parts = line.trim().split(/\s+/);
    die(parts.length === 3 && OID.test(parts[0]) && OID.test(parts[1]), 'Malformed receive update');
    return { old: parts[0], next: parts[1], ref: parts[2] };
  });
  if (policy.role === 'canonical') {
    die(updates.length === 1 && updates[0].ref === 'refs/heads/main', 'Canonical receive accepts only one main update; no tags or other refs');
    const u = updates[0];
    die(!/^0+$/.test(u.old) && !/^0+$/.test(u.next), 'Main creation/deletion is not a promotion operation');
    git(repo, ['merge-base', '--is-ancestor', u.old, u.next], true);
    die(options.length === 1 && options[0].startsWith('rsn-governance-approved='), 'Exactly one governance approval option required');
    verifyEnvelope(repo, u.old, u.next, options[0].slice('rsn-governance-approved='.length), policy, true);
  } else {
    die(options.length === 0, 'Mirror receive does not accept push options');
    const authority = bare(policy.authorityPath);
    const ap = policyAt(authority);
    die(ap.role === 'canonical' && ap.repositoryId === policy.repositoryId, 'Mirror authority binding mismatch');
    const canonicalMain = head(authority, 'refs/heads/main'); // clean Git environment, not mirror quarantine
    for (const u of updates) {
      if (u.ref.startsWith('refs/heads/rnd/')) continue; // deliberate unrestricted R&D namespace
      die(u.ref === 'refs/heads/canonical-main', 'Mirror accepts only canonical-main and rnd/*');
      die(u.next === canonicalMain, 'Mirror baseline must equal the bound local canonical main; deletion is forbidden');
      if (!/^0+$/.test(u.old)) git(repo, ['merge-base', '--is-ancestor', u.old, u.next], true);
    }
  }
  // No success log here: pre-receive acceptance is not proof that refs were updated.
}
export function install({ source, authority, mirror, expectedSource, expectedMain, receiptPath, reviewersPath, repositoryId }) {
  source = local(source); authority = bare(authority);
  die(ID.test(repositoryId), 'Invalid repository id');
  exactSource(source, expectedSource);
  die(head(authority, 'refs/heads/main') === expectedMain, 'Local authority main differs from expected SHA');
  die(OID.test(expectedMain), 'Expected main must be a full SHA');
  checkReceipt(JSON.parse(fs.readFileSync(receiptPath, 'utf8')), expectedSource, tree(source, expectedSource));
  const reviewers = JSON.parse(fs.readFileSync(reviewersPath, 'utf8'));
  die(reviewers && Object.keys(reviewers).length > 0, 'At least one explicitly enrolled reviewer is required');
  for (const [id, pem] of Object.entries(reviewers)) die(ID.test(id) && crypto.createPublicKey(pem).asymmetricKeyType === 'ed25519', 'Reviewer enrollment requires Ed25519 public keys');
  const targets = [{ repo: authority, role: 'canonical' }];
  // Adopt existing mirrors only. Never silently create a competing repository.
  if (mirror) { mirror = bare(mirror); die(!same(mirror, authority), 'Mirror must be separate'); targets.push({ repo: mirror, role: 'mirror' }); }
  for (const {repo} of targets) die(!fs.existsSync(path.join(repo, 'governance')), 'Existing governance directory: migration must be reviewed, not overwritten');
  for (const {repo, role} of targets) {
    const dir = path.join(repo, 'governance');
    fs.mkdirSync(path.join(dir, 'hooks'), { recursive: true, mode: 0o700 });
    fs.copyFileSync(path.join(repo, 'config'), path.join(dir, 'config.before-install'));
    const engine = fs.readFileSync(SELF);
    fs.writeFileSync(path.join(dir, 'forge-control.mjs'), engine, {flag:'wx'});
    const shellQuote = s => "'" + s.replaceAll("'", "'\\''") + "'";
    const unixPath = s => s.replaceAll('\\', '/');
    const hook = Buffer.from('#!/bin/sh\nset -eu\nexec ' + shellQuote(unixPath(process.execPath)) + ' ' + shellQuote(unixPath(path.join(dir,'forge-control.mjs'))) + ' receive\n');
    fs.writeFileSync(path.join(dir, 'hooks', 'pre-receive'), hook, { flag: 'wx', mode: 0o755 });
    const postHook = Buffer.from(hook.toString().replace(/ receive\n$/, ' post-receive\n'));
    fs.writeFileSync(path.join(dir, 'hooks', 'post-receive'), postHook, { flag: 'wx', mode: 0o755 });
    const p = {schema:'resonance-forge-policy/v2',repositoryId,repositoryPath:repo,role,authorityPath:authority,reviewers,engineSha256:digest(engine),hookSha256:digest(hook),postHookSha256:digest(postHook)};
    writeNew(path.join(dir, 'policy.json'), p);
    git(repo, ['config', 'core.hooksPath', path.join(dir, 'hooks').replaceAll('\\', '/')]);
    git(repo, ['config', 'receive.advertisePushOptions', 'true']);
    git(repo, ['config', 'receive.denyNonFastForwards', role === 'canonical' ? 'true' : 'false']);
    git(repo, ['config', 'receive.denyDeletes', role === 'canonical' ? 'true' : 'false']);
  }
  die(head(authority, 'refs/heads/main') === expectedMain, 'Authority changed concurrently during installation');
  return {status:'installed',authority,mirror:mirror || null,main:expectedMain,refsAdvanced:false};
}
export function verifyInstallation(authority, mirror) {
  authority = bare(authority);
  for (const repo of [authority, ...(mirror ? [bare(mirror)] : [])]) {
    const p = policyAt(repo);
    const expectedRole = same(repo, authority) ? 'canonical' : 'mirror';
    die(p.role === expectedRole && same(local(p.authorityPath), authority), 'Repository role/authority mismatch');
    const hookPath = textGit(repo,['config','--get','core.hooksPath']);
    die(same(local(hookPath),local(path.join(repo,'governance','hooks'))), 'Active hooksPath differs from installed controls');
    die(textGit(repo,['config','--get','receive.advertisePushOptions']) === 'true', 'Push options are not enabled');
    if (expectedRole === 'canonical') for (const key of ['receive.denyNonFastForwards','receive.denyDeletes']) die(textGit(repo,['config','--get',key]) === 'true', `${key} is disabled`);
    git(repo,['fsck','--full']);
  }
  const main = head(authority,'refs/heads/main');
  if (mirror) die(head(mirror,'refs/heads/canonical-main') === main, 'Mirror baseline is not aligned');
  return {status:'verified-local-controls',authority,main,mirror:mirror||null,networkTransportActivated:false};
}
export function publish({ source, authority, expectedHead, approvalId }) {
  source = local(source); authority = bare(authority);
  exactSource(source, expectedHead);
  verifyInstallation(authority);
  const policy = policyAt(authority);
  const old = head(authority,'refs/heads/main');
  const approval = verifyEnvelope(source, old, expectedHead, approvalId, policy);
  assertDirectLocalPush(source);
  // Use the SHA and explicit local filesystem destination, never a remote alias or branch.
  git(source, ['push', '--atomic', '-o', `rsn-governance-approved=${approvalId}`, authority, `${expectedHead}:refs/heads/main`]);
  die(head(authority,'refs/heads/main') === expectedHead, 'Post-push authority verification failed');
  const received = strictJSON(fs.readFileSync(path.join(authority,'governance',`received-${expectedHead}.json`)), 'server receive receipt');
  die(received.oldMain === old && received.newMain === expectedHead, 'Server receive receipt does not match publication');
  const result = {schema:'resonance-source-promotion/v2',recordedAt:new Date().toISOString(),oldMain:old,newMain:expectedHead,candidate:approval.candidate,approvalId,reviewer:approval.reviewer,productionDeploymentAuthorized:false};
  const out = path.join(authority,'governance',`promotion-${expectedHead}.json`);
  writeNew(out,result);
  return {...result,receipt:out};
}
export function syncMirror(authority, mirror) {
  authority = bare(authority); mirror = bare(mirror);
  verifyInstallation(authority);
  const mp = policyAt(mirror);
  die(mp.role === 'mirror' && same(local(mp.authorityPath),authority), 'Mirror authority mismatch');
  const main = head(authority,'refs/heads/main');
  assertDirectLocalPush(authority);
  git(authority,['push',mirror,`${main}:refs/heads/canonical-main`]);
  die(head(mirror,'refs/heads/canonical-main') === main, 'Mirror sync verification failed');
  return {status:'mirror-aligned',main};
}
function postReceive(repo, input) {
  const policy = policyAt(repo);
  if(policy.role !== 'canonical') return;
  for(const line of input.trim().split('\n').filter(Boolean)) {
    const [oldMain,newMain,ref] = line.trim().split(/\s+/);
    die(OID.test(oldMain) && OID.test(newMain) && ref === 'refs/heads/main', 'Invalid post-receive input');
    die(head(repo,ref) === newMain, 'Post-receive main verification failed');
    writeNew(path.join(repo,'governance',`received-${newMain}.json`), {schema:'resonance-forge-received/v2',recordedAt:new Date().toISOString(),oldMain,newMain,ref,productionDeploymentAuthorized:false});
  }
}
async function signApproval(a) {
  const repo = local(a.source), authority = bare(a.authority);
  exactSource(repo, a.candidate);
  verifyInstallation(authority);
  const policy = policyAt(authority);
  die(ID.test(a.approvalId) && ID.test(a.reviewer), 'Invalid approval/reviewer id');
  const candidateTree = tree(repo,a.candidate);
  const validation = JSON.parse(fs.readFileSync(a.receiptPath,'utf8'));
  checkReceipt(validation,a.candidate,candidateTree);
  die(Object.hasOwn(policy.reviewers,a.reviewer), 'Reviewer is not enrolled');
  die(process.stdin.isTTY && process.stdout.isTTY, 'Signing requires an interactive human terminal');
  const oldMain = head(authority,'refs/heads/main');
  git(repo,['merge-base','--is-ancestor',oldMain,a.candidate]);
  const rl = readline.createInterface({input:process.stdin,output:process.stdout});
  let confirmation;
  try { confirmation = await rl.question(`Review source ${a.candidate}, tree ${candidateTree}, and gate receipt before signing.\nType APPROVE ${a.candidate}: `); } finally { rl.close(); }
  die(confirmation === `APPROVE ${a.candidate}`, 'Human confirmation did not match');
  const privateKey = crypto.createPrivateKey(fs.readFileSync(local(a.privateKey)));
  die(privateKey.asymmetricKeyType === 'ed25519', 'Ed25519 private key required');
  const pub = crypto.createPublicKey(privateKey).export({type:'spki',format:'der'});
  die(pub.equals(crypto.createPublicKey(policy.reviewers[a.reviewer]).export({type:'spki',format:'der'})), 'Private key does not match enrolled reviewer');
  const issued = Date.now();
  const payload = {schema:'resonance-human-source-approval/v2',repositoryId:policy.repositoryId,approvalId:a.approvalId,reviewer:a.reviewer,oldMain,candidate:a.candidate,candidateTree,validation,issuedAt:new Date(issued).toISOString(),expiresAt:new Date(issued+86400000).toISOString(),scope:'canonical-source-promotion-only',status:'approved',decision:'approved',productionDeploymentAuthorized:false,dnsChangeAuthorized:false};
  const bytes = Buffer.from(JSON.stringify(payload));
  const out = path.join(repo,'evidence','approvals',`${a.approvalId}.json`);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  writeNew(out,{payload:bytes.toString('base64'),signature:crypto.sign(null,bytes,privateKey).toString('base64')});
  return {status:'signed-not-committed',approvalPath:out,candidate:a.candidate};
}
async function main() {
  const [command,...rest] = process.argv.slice(2);
  const args = {};
  for(let i=0;i<rest.length;i+=2) { die(rest[i].startsWith('--') && rest[i+1] && !Object.hasOwn(args,rest[i].slice(2)), 'Expected unique --name value arguments'); args[rest[i].slice(2)] = rest[i+1]; }
  let result;
  if(command==='receive') {
    const options=[];const count=Number(process.env.GIT_PUSH_OPTION_COUNT||'0');die(Number.isInteger(count)&&count>=0&&count<=10,'Invalid push option count');
    for(let i=0;i<count;i++) options.push(process.env[`GIT_PUSH_OPTION_${i}`]||'');
    receive(process.cwd(),fs.readFileSync(0,'utf8'),options);return;
  }
  if(command==='post-receive') {postReceive(process.cwd(),fs.readFileSync(0,'utf8'));return;}
  if(command==='install') result=install(args);
  else if(command==='verify') result=verifyInstallation(args.authority,args.mirror);
  else if(command==='publish') result=publish(args);
  else if(command==='sync') result=syncMirror(args.authority,args.mirror);
  else if(command==='sign') result=await signApproval(args);
  else if(command==='assert-source') {exactSource(local(args.source),args.candidate);result={candidate:args.candidate,tree:tree(args.source,args.candidate),clean:true};}
  else throw new Error('Unknown command');
  console.log(JSON.stringify(result,null,2));
}
if(process.argv[1] && same(path.resolve(process.argv[1]),SELF)) main().catch(e=>{console.error(`SOVEREIGN-FORGE REJECT: ${e.message}`);process.exitCode=1;});

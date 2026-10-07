import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {install,publish,syncMirror,verifyInstallation,git} from '../forge-control.mjs';

// All keys, signatures, receipts and approvals here are disposable TEST fixtures.
// No test contacts a remote service or opens an existing user repository.
// A real empty file is required for GIT_CONFIG_GLOBAL.
// Node's os.devNull resolves to \\.\nul on Windows, which this
// Git-for-Windows environment rejects as a config path.
const isolatedGitConfig =
  path.join(os.tmpdir(), `sovereign-forge-empty-gitconfig-${process.pid}`);
fs.writeFileSync(isolatedGitConfig, '');
process.on('exit', () => {
  try {
    fs.rmSync(isolatedGitConfig, {force:true});
  } catch {}
});
function command(repo,args,allowFailure=false) {
  const env={...process.env}; for(const k of Object.keys(env)) if(k.startsWith('GIT_')) delete env[k];
  Object.assign(env,{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:isolatedGitConfig,GIT_ALLOW_PROTOCOL:'file',GIT_TERMINAL_PROMPT:'0'});
  const r=spawnSync('git',['-C',repo,...args],{env,encoding:'utf8'});
  if(!allowFailure) assert.equal(r.status,0,r.stderr || r.error?.message);
  return allowFailure?r:r.stdout.trim();
}
const sha=(r,ref='HEAD')=>command(r,['rev-parse',ref]);
function receipt(repo,candidate){return {schema:'resonance-forge-validation/v2',candidate,tree:sha(repo,`${candidate}^{tree}`),clean:true,status:'passed',checks:{traceability:true,openNovaManifest:true,workerOps:true,gitDiffCheck:true,noNestedGit:true},applicationValidationPerformed:false};}
function fixture(t) {
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sovereign-forge-test-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true,maxRetries:3}));
 const source=path.join(dir,'source'),authority=path.join(dir,'authority.git'),mirror=path.join(dir,'mirror.git');
 fs.mkdirSync(source);command(source,['init','-b','main']);command(source,['config','user.name','Disposable Reviewer Test']);command(source,['config','user.email','test@example.invalid']);command(source,['config','commit.gpgsign','false']);command(source,['config','core.autocrlf','false']);
 fs.writeFileSync(path.join(source,'app.txt'),'baseline\n');command(source,['add','.']);command(source,['commit','-m','baseline']);const old=sha(source);
 command(dir,['clone','--bare',source,authority]);command(dir,['init','--bare',mirror]);
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const keysPath=path.join(dir,'reviewers.json'),receiptPath=path.join(dir,'gate.json');
 fs.writeFileSync(keysPath,JSON.stringify({'test-reviewer':publicKey.export({type:'spki',format:'pem'})}));
 fs.writeFileSync(receiptPath,JSON.stringify(receipt(source,old)));
 install({source,authority,mirror,expectedSource:old,expectedMain:old,receiptPath,reviewersPath:keysPath,repositoryId:'Test-DataNest'});
 fs.writeFileSync(path.join(source,'app.txt'),'candidate\n');command(source,['add','app.txt']);command(source,['commit','-m','candidate']);const candidate=sha(source);
 const payload={schema:'resonance-human-source-approval/v2',repositoryId:'Test-DataNest',approvalId:'TEST',reviewer:'test-reviewer',oldMain:old,candidate,candidateTree:sha(source,`${candidate}^{tree}`),validation:receipt(source,candidate),issuedAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),scope:'canonical-source-promotion-only',status:'approved',decision:'approved',productionDeploymentAuthorized:false,dnsChangeAuthorized:false};
 return {dir,source,authority,mirror,old,candidate,payload,privateKey};
}
function approval(f,{payload=f.payload,key=f.privateKey,raw,extra=false}={}){
 const data=Buffer.from(JSON.stringify(payload));const record=raw??JSON.stringify({payload:data.toString('base64'),signature:crypto.sign(null,data,key).toString('base64')})+'\n';
 const file=path.join(f.source,'evidence','approvals','TEST.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,record);
 if(extra)fs.writeFileSync(path.join(f.source,'extra.txt'),'unapproved\n');
 command(f.source,['add','.']);command(f.source,['commit','-m','approval fixture']);return sha(f.source);
}
function direct(f,next,options=['-o','rsn-governance-approved=TEST'],ref='refs/heads/main'){
 return command(f.source,['push',...options,f.authority,`${next}:${ref}`],true);
}
function rejected(r){assert.notEqual(r.status,0,`Unexpected acceptance: ${r.stdout} ${r.stderr}`);}

test('valid signed approval is accepted by real receive hook and exact-SHA publisher',t=>{
 const f=fixture(t),next=approval(f);const result=publish({source:f.source,authority:f.authority,expectedHead:next,approvalId:'TEST'});
 assert.equal(result.newMain,next);assert.equal(sha(f.authority,'main'),next);assert.equal(result.productionDeploymentAuthorized,false);
});
test('self-authored unsigned approval is rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f,{raw:JSON.stringify({status:'approved',approvedSourceCommit:f.candidate})})));});
test('malformed JSON is rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f,{raw:`NOT JSON\n"status": "approved"\n"approvedSourceCommit": "${f.candidate}"\n`})));});
test('duplicate JSON envelope fields are rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f,{raw:'{"payload":"x","payload":"y","signature":"z"}'})));});
test('signature from an unenrolled private key is rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f,{key:crypto.generateKeyPairSync('ed25519').privateKey})));});
for(const [name,change] of [
 ['unknown reviewer',p=>p.reviewer='unknown'],
 ['different repository',p=>p.repositoryId='Other'],
 ['wrong approval id',p=>p.approvalId='OTHER'],
 ['wrong old main',p=>p.oldMain=p.candidate],
 ['wrong tree',p=>p.candidateTree=p.oldMain],
 ['expired approval',p=>{p.issuedAt='2020-01-01T00:00:00.000Z';p.expiresAt='2020-01-02T00:00:00.000Z';}],
 ['future approval',p=>{p.issuedAt=new Date(Date.now()+3600000).toISOString();p.expiresAt=new Date(Date.now()+7200000).toISOString();}],
 ['overlong validity',p=>p.expiresAt=new Date(Date.now()+30*86400000).toISOString()],
 ['pending decision',p=>p.decision='pending'],
 ['deployment authorization',p=>p.productionDeploymentAuthorized=true],
 ['wrong validation candidate',p=>p.validation.candidate=p.oldMain],
 ['failed source check',p=>p.validation.checks.traceability=false],
 ['missing source check',p=>delete p.validation.checks.workerOps]
]) test(`${name} is rejected`,t=>{const f=fixture(t);change(f.payload);rejected(direct(f,approval(f)));});
test('source changes in approval commit are rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f,{extra:true})));});
test('extra approval-history commit is rejected',t=>{const f=fixture(t);approval(f);command(f.source,['commit','--allow-empty','-m','extra']);rejected(direct(f,sha(f.source)));});
test('missing approval push option is rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f),[]));});
test('duplicate approval options are rejected',t=>{const f=fixture(t);rejected(direct(f,approval(f),['-o','rsn-governance-approved=TEST','-o','rsn-governance-approved=OTHER']));});
test('canonical main deletion is rejected',t=>{const f=fixture(t);rejected(command(f.source,['push',f.authority,':refs/heads/main'],true));});
test('canonical tags are rejected',t=>{const f=fixture(t);rejected(direct(f,f.candidate,[],'refs/tags/unreviewed'));});
test('non-fast-forward replacement is rejected',t=>{const f=fixture(t);const next=approval(f);assert.equal(direct(f,next).status,0);rejected(command(f.source,['push','--force','-o','rsn-governance-approved=TEST',f.authority,`${f.old}:refs/heads/main`],true));});
test('publisher rejects remote alias before attempting transport',t=>{const f=fixture(t);assert.throws(()=>publish({source:f.source,authority:'sovereign',expectedHead:f.candidate,approvalId:'TEST'}),/absolute local/);});
test('publisher rejects URL destination before attempting transport',t=>{const f=fixture(t);assert.throws(()=>publish({source:f.source,authority:'https://example.invalid/repo',expectedHead:f.candidate,approvalId:'TEST'}),/absolute local/);});
test('publisher rejects a candidate other than checked-out HEAD',t=>{const f=fixture(t);assert.throws(()=>publish({source:f.source,authority:f.authority,expectedHead:f.old,approvalId:'TEST'}),/HEAD differs/);});
test('publisher rejects dirty source',t=>{const f=fixture(t),next=approval(f);fs.writeFileSync(path.join(f.source,'untracked.txt'),'dirty');assert.throws(()=>publish({source:f.source,authority:f.authority,expectedHead:next,approvalId:'TEST'}),/clean/);});
test('installation rejects source HEAD mismatch',t=>{const f=fixture(t);assert.throws(()=>install({source:f.source,authority:f.authority,expectedSource:f.old,expectedMain:f.old,repositoryId:'Test'}),/HEAD differs/);});
test('mirror baseline sync accepts only exact canonical main',t=>{const f=fixture(t);syncMirror(f.authority,f.mirror);assert.equal(sha(f.mirror,'canonical-main'),f.old);rejected(command(f.source,['push',f.mirror,`${f.candidate}:refs/heads/canonical-main`],true));});
test('mirror baseline deletion is rejected',t=>{const f=fixture(t);syncMirror(f.authority,f.mirror);rejected(command(f.source,['push',f.mirror,':refs/heads/canonical-main'],true));});
test('mirror R&D permits creation, force replacement and deletion',t=>{const f=fixture(t);syncMirror(f.authority,f.mirror);command(f.source,['push',f.mirror,`${f.candidate}:refs/heads/rnd/test`]);command(f.source,['push','--force',f.mirror,`${f.old}:refs/heads/rnd/test`]);command(f.source,['push',f.mirror,':refs/heads/rnd/test']);assert.equal(sha(f.mirror,'canonical-main'),f.old);});
test('mirror sync advances after signed canonical promotion',t=>{const f=fixture(t);syncMirror(f.authority,f.mirror);const next=approval(f);publish({source:f.source,authority:f.authority,expectedHead:next,approvalId:'TEST'});syncMirror(f.authority,f.mirror);assert.equal(verifyInstallation(f.authority,f.mirror).main,next);});
test('verification rejects hook tampering',t=>{const f=fixture(t);fs.appendFileSync(path.join(f.authority,'governance','hooks','pre-receive'),'#changed\n');assert.throws(()=>verifyInstallation(f.authority),/hook hash mismatch/);});
test('verification rejects hooksPath redirection',t=>{const f=fixture(t);command(f.authority,['config','core.hooksPath',f.dir]);assert.throws(()=>verifyInstallation(f.authority),/hooksPath/);});
test('publication rejects Git URL rewriting',t=>{const f=fixture(t),next=approval(f);command(f.source,['config',`url.${f.mirror}.pushInsteadOf`,f.authority]);assert.throws(()=>publish({source:f.source,authority:f.authority,expectedHead:next,approvalId:'TEST'}),/URL rewriting/);assert.equal(sha(f.authority,'main'),f.old);});
test('publication rejects an unreviewed client pre-push hook',t=>{const f=fixture(t),next=approval(f);fs.writeFileSync(path.join(f.source,'.git','hooks','pre-push'),'#!/bin/sh\nexit 0\n',{mode:0o755});assert.throws(()=>publish({source:f.source,authority:f.authority,expectedHead:next,approvalId:'TEST'}),/pre-push hook/);});
test('a successful direct signed push records a server receipt',t=>{const f=fixture(t),next=approval(f);assert.equal(direct(f,next).status,0);const r=JSON.parse(fs.readFileSync(path.join(f.authority,'governance',`received-${next}.json`),'utf8'));assert.equal(r.oldMain,f.old);assert.equal(r.newMain,next);});
test('a rejected push creates no success receipt',t=>{const f=fixture(t),next=approval(f,{extra:true});rejected(direct(f,next));assert.equal(fs.existsSync(path.join(f.authority,'governance',`received-${next}.json`)),false);});
test('verification rejects post-receive hook tampering',t=>{const f=fixture(t);fs.appendFileSync(path.join(f.authority,'governance','hooks','post-receive'),'# tampered\n');assert.throws(()=>verifyInstallation(f.authority),/post-receive hook hash/);});
test('multi-ref canonical transactions are rejected atomically',t=>{const f=fixture(t),next=approval(f);rejected(command(f.source,['push','--atomic','-o','rsn-governance-approved=TEST',f.authority,`${next}:refs/heads/main`,`${next}:refs/tags/test`],true));assert.equal(sha(f.authority,'main'),f.old);});

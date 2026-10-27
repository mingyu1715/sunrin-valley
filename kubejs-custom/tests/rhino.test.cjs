const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

test('pinned actual Rhino evaluates shipped bridge and policy without lexical-scope failures',t=>{
  const root=path.resolve(__dirname,'..');
  const isolated=path.join(root,'../.work/runtime-integration/server');
  const rhino=process.env.SUNRIN_RHINO_JAR || path.join(isolated,'mods/rhino-forge-2001.2.3-build.10.jar');
  if(!fs.existsSync(rhino) && !process.env.SUNRIN_RHINO_CLASSPATH) {t.skip('Pinned Rhino unavailable; set SUNRIN_RHINO_CLASSPATH to Rhino2001.2.3-build.10 + Gson + commons-lang3');return;}
  const classpath=process.env.SUNRIN_RHINO_CLASSPATH || [rhino,path.join(isolated,'libraries/com/google/code/gson/gson/2.10/gson-2.10.jar'),path.join(isolated,'libraries/org/apache/commons/commons-lang3/3.12.0/commons-lang3-3.12.0.jar')].join(path.delimiter);
  const result=spawnSync('java',['-cp',classpath,path.join(__dirname,'RhinoCompatibility.java'),root],{encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,`${result.error || ''}\n${result.stdout}\n${result.stderr}`);
});

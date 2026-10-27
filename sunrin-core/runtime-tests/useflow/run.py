"""Run only the prepared loopback server and fabricated client; keep all evidence."""
from pathlib import Path
import argparse,json,subprocess,time,sys

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('run_dir',type=Path);parser.add_argument('--timeout',type=int,default=600);args=parser.parse_args()
    work=args.run_dir.resolve();server_dir=work/'server';client_dir=work/'client';control=work/'control'
    identity=json.loads((work/'preparation.json').read_text());assert identity.get('copiedAccounts') is False and identity.get('copiedWorlds') is False
    assert not (server_dir/'e2e-world').exists() and not (control/'done.json').exists(),'Choose a freshly prepared run directory'
    plan=json.loads((client_dir/'launch-plan.json').read_text());java=plan['command'][0]
    command=[java,'-Dsunrin.useFlowServer=true','-Dsunrin.useFlowDirectory='+str(control),'@user_jvm_args.txt','@libraries/net/minecraftforge/forge/1.20.1-47.4.0/unix_args.txt','nogui']
    server=None;client=None;started=time.time();success=False;error=None;fallback=False
    try:
        with (work/'server-console.log').open('w') as out:server=subprocess.Popen(command,cwd=server_dir,stdin=subprocess.PIPE,stdout=out,stderr=subprocess.STDOUT)
        owned={'serverPid':server.pid,'serverCwd':str(server_dir),'started':started};(work/'owned-processes.json').write_text(json.dumps(owned,indent=2))
        print('Owned server',server.pid,flush=True)
        while not (control/'server-state.json').exists():
            if server.poll() is not None:raise RuntimeError(f'Server exited before ready: {server.returncode}')
            if time.time()-started>240:raise RuntimeError('Server ready timeout')
            time.sleep(1)
        protocol='\n'.join(['launcher standard','mainClass '+plan['mainClass'],'windowTitle Sunrin isolated native use regression','windowParams 1280x720','launcherBrand SunrinUseFlowE2E','launcherVersion test']+['param '+value for value in plan['minecraftArguments']]+['launch',''])
        with (work/'client-console.log').open('w') as out:client=subprocess.Popen(plan['command'],cwd=client_dir/'game',stdin=subprocess.PIPE,stdout=out,stderr=subprocess.STDOUT)
        owned.update(clientPid=client.pid,clientCwd=str(client_dir/'game'));(work/'owned-processes.json').write_text(json.dumps(owned,indent=2))
        client.stdin.write(protocol.encode());client.stdin.close();print('Owned client',client.pid,flush=True)
        while not (control/'done.json').exists():
            if client.poll() is not None:raise RuntimeError(f'Client exited before results: {client.returncode}')
            if server.poll() is not None:raise RuntimeError(f'Server exited before results: {server.returncode}')
            if time.time()-started>args.timeout:raise RuntimeError('Native use regression timeout')
            time.sleep(1)
        result=json.loads((control/'useflow-results.json').read_text());success=len(result['stages'])==6 and all(row['passed'] for row in result['stages']) and result.get('initial15Plus15WelcomeGranted') is True and result.get('chatProfileApplied') is True
        try:client.wait(timeout=60)
        except subprocess.TimeoutExpired:print('Native shutdown timed out; owned client fallback only',flush=True)
    except Exception as exc:error=str(exc);print(error,file=sys.stderr)
    finally:
        if client is not None and client.poll() is None:
            fallback=True;client.terminate()
            try:client.wait(timeout=20)
            except subprocess.TimeoutExpired:client.kill();client.wait(timeout=10)
        if server is not None and server.poll() is None:
            try:server.stdin.write(b'stop\n');server.stdin.flush()
            except (BrokenPipeError,OSError):pass
            try:server.wait(timeout=35)
            except subprocess.TimeoutExpired:
                fallback=True;server.terminate()
                try:server.wait(timeout=15)
                except subprocess.TimeoutExpired:server.kill();server.wait(timeout=10)
        status={'checksPassed':success,'error':error,'fallbackTermination':fallback,'serverExit':None if server is None else server.returncode,'clientExit':None if client is None else client.returncode,'results':str(control/'useflow-results.json')};(work/'run-status.json').write_text(json.dumps(status,indent=2)+'\n');print(json.dumps(status,indent=2),flush=True)
    return 0 if success and not fallback and server.returncode==0 and client.returncode==0 else 1
if __name__=='__main__':sys.exit(main())

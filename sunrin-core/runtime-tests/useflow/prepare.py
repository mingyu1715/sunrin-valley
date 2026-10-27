"""Prepare a fresh disposable use-flow run from the existing public-binary test cache."""
from pathlib import Path
import argparse,datetime,hashlib,json,shutil,subprocess,sys
ROOT=Path(__file__).resolve().parents[3];MODULE=Path(__file__).resolve().parent

def clone(source,target):
    if not source.exists():return
    target.parent.mkdir(parents=True,exist_ok=True)
    if sys.platform=='darwin':subprocess.run(['/bin/cp','-cR',str(source),str(target)],check=True)
    elif source.is_dir():shutil.copytree(source,target)
    else:shutil.copy2(source,target)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,default=ROOT/'.work/runtime-integration')
    parser.add_argument('--core-jar',type=Path)
    parser.add_argument('--observer-jar',type=Path,default=MODULE/'build/libs/sunrin-useflow-observer-0.1.0.jar')
    parser.add_argument('--run-dir',type=Path,default=ROOT/'.work/useflow-runs'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    args=parser.parse_args();cache=args.cache.resolve();work=args.run_dir.resolve()
    jars=sorted((ROOT/'sunrin-core/build/libs').glob('sunrin-core-*.jar'))
    core=(args.core_jar or (jars[0] if len(jars)==1 else Path('missing-choose-core-jar'))).resolve();observer=args.observer_jar.resolve()
    assert core.is_file() and observer.is_file(),'Build Core and observer first; use --core-jar if multiple candidates exist'
    marker=json.loads((cache/'client/preparation.json').read_text())
    assert marker.get('accountsCopied') is False and marker.get('savesCopied') is False and marker.get('userOptionsImported') is False,'Cache must be the isolated public-binary fixture'
    assert not work.exists(),'Use a new --run-dir; existing evidence is never overwritten'
    work.mkdir(parents=True);server=work/'server';client=work/'client';game=client/'game';server.mkdir();game.mkdir(parents=True)
    for name in ['libraries','mods','config','configureddefaults','defaultconfigs','kubejs','easy_npc','emotes','local','modernfix','moonlight-global-datapacks','patchouli_books','quests_structures','rhino.local.properties']:clone(cache/'server'/name,server/name)
    for name in ['mods','config','configureddefaults','defaultconfigs','kubejs','resourcepacks','shaderpacks','patchouli_books','options.txt']:clone(cache/'client/game'/name,game/name)
    for name in ['libraries','assets']:clone(cache/'client'/name,client/name)
    for target in [server,game]:
        for name in ['saves','accounts.json','accounts.cfg','servers.dat','launcher_accounts.json','ops.json','usercache.json']:assert not (target/name).exists(),f'Unexpected personal state: {target/name}'
        for jar in (target/'mods').glob('*.jar'):
            if jar.name.startswith(('sunrin-core-','sunrin-integration-observer-','sunrin-useflow-observer-')):jar.unlink()
        shutil.copyfile(core,target/'mods'/core.name);shutil.copyfile(observer,target/'mods'/observer.name)
        shutil.rmtree(target/'config/sunrin',ignore_errors=True)
        for folder in ['startup_scripts','server_scripts','data']:
            for source in (ROOT/'kubejs-custom'/folder).rglob('*'):
                if source.is_file():dest=target/'kubejs'/source.relative_to(ROOT/'kubejs-custom');dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,dest)
    (server/'eula.txt').write_text('eula=true\n');(server/'user_jvm_args.txt').write_text('-Xms1G\n-Xmx4G\n-Dlog4j2.formatMsgNoLookups=true\n')
    props={}
    for line in (cache/'server/server.properties').read_text().splitlines():
        if '=' in line and not line.startswith('#'):key,value=line.split('=',1);props[key]=value
    props.update({'server-ip':'127.0.0.1','server-port':'25597','rcon.port':'25598','enable-rcon':'false','query.port':'25598','enable-query':'false','online-mode':'false','enforce-secure-profile':'false','white-list':'false','enforce-whitelist':'false','level-name':'e2e-world','level-seed':'12345','spawn-protection':'0','view-distance':'3','simulation-distance':'3','max-players':'2','gamemode':'survival','motd':'Sunrin disposable native use regression'})
    (server/'server.properties').write_text('\n'.join(key+'='+value for key,value in props.items())+'\n')
    voice=server/'config/voicechat/voicechat-server.properties'
    if voice.exists():voice.write_text('\n'.join('port=25599' if line.startswith('port=') else 'bind_address=127.0.0.1' if line.startswith('bind_address=') else line for line in voice.read_text().splitlines())+'\n')
    plan=json.loads((cache/'client/launch-plan.json').read_text());old=str(Path(plan['game']).parent);new=str(client)
    command=[arg.replace(old,new) for arg in plan['command'] if not arg.startswith(('-Dsunrin.guiTest=','-Dsunrin.guiResultDirectory='))]
    assert not any('javaagent' in arg for arg in command)
    position=command.index('-cp');command[position:position]=['-Dsunrin.useFlowTest=true','-Dsunrin.useFlowDirectory='+str(work/'control')]
    mcargs=[value.replace(old,new) for value in plan['minecraftArguments']]
    assert mcargs[mcargs.index('--username')+1]=='SunrinGuiTest' and mcargs[mcargs.index('--accessToken')+1]=='0','Only fabricated offline identity is permitted'
    assert Path(command[0]).is_file(),'Cached public Java runtime is missing'
    launch={'command':command,'minecraftArguments':mcargs,'game':str(game),'mainClass':'io.github.zekerzhayard.forgewrapper.installer.Main'}
    (client/'launch-plan.json').write_text(json.dumps(launch,indent=2)+'\n');(work/'control').mkdir()
    identity={'scope':'fresh loopback use-flow fixture','coreSHA256':hashlib.sha256(core.read_bytes()).hexdigest(),'observerSHA256':hashlib.sha256(observer.read_bytes()).hexdigest(),'policySHA256':hashlib.sha256((server/'kubejs/server_scripts/sunrin_policy.js').read_bytes()).hexdigest(),'chatOverlaySHA256':hashlib.sha256((server/'kubejs/server_scripts/playerEvents/chatColors.js').read_bytes()).hexdigest(),'copiedAccounts':False,'copiedWorlds':False,'originalOptionsCopied':False,'cache':str(cache)}
    (work/'preparation.json').write_text(json.dumps(identity,indent=2)+'\n');print(work)
if __name__=='__main__':main()

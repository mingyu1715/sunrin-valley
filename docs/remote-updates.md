# 원격 게임 구성 업데이트

런처 0.1.2부터 `client-pack/update-source.json`의 고정 GitHub HTTPS 주소에서 `client-pack/channel/stable.json`을 확인합니다. 모드팩 버전과 런처 버전은 별개입니다. 모드·리소스팩·KubeJS만 바뀌면 친구가 런처를 다시 받을 필요가 없습니다. 기존 0.1.1 런처는 원격 기능을 지원하지 않으므로 한 번은 새 런처로 교체해야 합니다.

채널 파일은 버전별 manifest·Prism 배포 사양·자체 overlay ZIP의 주소와 SHA256을 담습니다. 모드와 Stay True·BSL 등 타사 파일은 manifest에 기록된 공식 배포처에서 받습니다. 자체 overlay는 `kubejs-custom/`의 startup/server/client scripts·assets·data와 `Sunrin-Custom.zip`을 담습니다. 테스트·README·숨김 파일은 업로드하지 않습니다.

세 파일을 모두 검증한 뒤 캐시를 갱신합니다. 서버에 연결할 수 없으면 마지막 검증본으로 기존 설치를 확인합니다. 계정·옵션·월드는 보존하고 실행 중인 게임은 수정하지 않습니다. 채널의 최소 런처 버전을 충족하지 못할 때만 새 앱 다운로드를 안내합니다.

## 운영자가 새 구성을 배포하는 순서

1. GitHub에서 자체 KubeJS/리소스 소스 또는 `client-pack/sources.json`의 고정 파일 목록을 수정합니다.
2. `sources.json`의 `packVersion`을 올리고 `python3 build-scripts/resolve-pack.py`로 manifest를 갱신합니다. 새로운 버전 번호를 사용하며 이미 발행한 버전의 파일은 교체하지 않습니다.
3. `main`에 올리면 **Publish game content** Action이 자체 리소스를 빌드하고 `pack-버전` 릴리스에 파일을 올립니다. Actions에서 직접 실행할 수도 있습니다.
4. 모든 파일 업로드가 성공하면 마지막에 `stable.json`을 갱신합니다. 친구는 런처의 **업데이트**를 눌러 적용합니다.

셰이더는 파일만 추가하며 자동으로 켜지 않습니다. 리소스팩 우선순위는 설치와 실행 준비 때 자동 정리합니다. 원본 Sunlit 덮어쓰기 팩이 최우선이고, 선린 커스텀·기존 호환 팩·Stay True 순서입니다.

처음 발행하거나 로컬에서 준비할 때:

```sh
npm run build
python3 build-scripts/build-update.py --repo mingyu1715/sunrin-valley
```

결과는 `release/updates/팩버전/`입니다. `manifest.json`, `prism-runtime.json`, `Sunrin-Overlay.zip`, `SHA256SUMS.txt`를 `pack-팩버전` 릴리스에 먼저 업로드하고, 생성된 `stable.json`을 채널 경로에 마지막으로 반영합니다. 모드팩 릴리스는 `--latest=false`, 런처 릴리스만 `--latest`로 발행해 앱 다운로드 안내가 최신 런처로 연결되게 합니다.

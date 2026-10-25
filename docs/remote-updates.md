# 원격 게임 구성 업데이트

모드팩 버전과 런처 버전은 별개입니다. 0.1.3 런처는 고정 GitHub 주소의 `client-pack/channel/operating.json`에서 실제 운영 버전과 점검 상태를 확인합니다. 기존 0.1.2 런처의 `stable.json` 주소도 운영 버전을 가리키도록 유지합니다. 모드·리소스팩·KubeJS 변경마다 새 런처를 받을 필요는 없습니다.

채널 파일은 버전별 manifest·Prism 배포 사양·자체 overlay ZIP의 주소와 SHA256을 담습니다. 모드와 Stay True·BSL 등 타사 파일은 manifest에 기록된 공식 배포처에서 받습니다. 자체 overlay는 `kubejs-custom/`의 startup/server/client scripts·assets·data와 `Sunrin-Custom.zip`을 담습니다. 테스트·README·숨김 파일은 업로드하지 않습니다.

세 파일을 모두 검증한 뒤 캐시를 갱신합니다. 서버에 연결할 수 없으면 마지막 검증본으로 기존 설치를 확인합니다. 계정·옵션·월드는 보존하고 실행 중인 게임은 수정하지 않습니다. 채널의 최소 런처 버전을 충족하지 못할 때만 새 앱 다운로드를 안내합니다.

## 운영자가 새 구성을 배포하는 순서

1. GitHub에서 자체 KubeJS/리소스 소스 또는 `client-pack/sources.json`의 고정 파일 목록을 수정합니다.
2. `sources.json`의 `packVersion`을 올리고 `python3 build-scripts/resolve-pack.py`로 manifest를 갱신합니다. 새로운 버전 번호를 사용하며 이미 발행한 버전의 파일은 교체하지 않습니다.
3. `main`에 올리면 기존 **Publish game content** Action이 자체 리소스를 빌드하고 `pack-버전` 릴리스에 파일을 올립니다. Actions에서 직접 실행할 수도 있습니다.
4. 업로드 성공 후 `published.json`과 `releases/버전.json`만 기록합니다. 이 단계는 서버 운영 버전이나 기존 런처의 `stable.json`을 변경하지 않습니다.
5. 서버에 실제 적용·재시작·정상 확인이 끝난 뒤에만 운영 버전을 바꿉니다. 이때 친구에게 해당 버전의 **업데이트**가 표시됩니다.

셰이더는 파일만 추가하며 자동으로 켜지 않습니다. 리소스팩 우선순위는 설치와 실행 준비 때 자동 정리합니다. 원본 Sunlit 덮어쓰기 팩이 최우선이고, 선린 커스텀·기존 호환 팩·Stay True 순서입니다.

처음 발행하거나 로컬에서 준비할 때:

```sh
npm run build
python3 build-scripts/build-update.py --repo mingyu1715/sunrin-valley
```

결과는 `release/updates/팩버전/`입니다. 세 파일과 체크섬을 먼저 업로드한 뒤 `python3 build-scripts/set-operation.py --root . --record-publication release/updates/팩버전/stable.json`으로 발행 목록을 기록합니다. 모드팩 릴리스는 `--latest=false`, 런처 릴리스만 `--latest`로 발행합니다. 최소 런처 버전을 올릴 때는 새 런처를 먼저 준비합니다.

## 운영 버전·점검 상태

`operating.json`은 활성 릴리스 전체, 운영 버전, 상태(`unconfigured`, `online`, `scheduled`, `maintenance`, `failed`, `unknown`), 공지, 목표 버전·시각을 담습니다. 현재는 서버가 없어 **운영 구성0.1.2 / 미구축**으로 초기화했습니다. 새 발행만으로 클라이언트가 먼저 업데이트하지 않습니다.

서버 정상 확인 후 운영 전환을 준비하는 명령 예시:

```sh
python3 build-scripts/set-operation.py --root . --client-release client-pack/channel/releases/0.2.0.json --state online --active-version 0.2.0 --message '점검 완료'
```

이 도구는 로컬 `operating.json`과 호환용 `stable.json`을 함께 기록할 뿐 Git push나 서버 명령을 실행하지 않습니다. 두 파일을 한 커밋으로 발행하는 운영자 어댑터를 연결해야 클라이언트에 반영됩니다. 점검 중에는 기존 활성 릴리스를 유지하고, 실패 복구 시 이전 버전과 실패 상태를 기록할 수 있습니다. 런처는 대기 중30초 간격으로 상태를 재확인하며, 점검 종료 후 자동으로 시작 버튼을 복원합니다.

## 예약 서버 업데이트 준비

[server-ops 설정과 복구 안내](../server-ops/README.md)의 예제를 복사하고 목표 버전·시간대를 포함한 적용 시각을 지정합니다. 기본값은 비활성이며 `--plan`은 쓰기나 서버 연결 없이 순서만 보여 줍니다.

```sh
python3 server-ops/updater.py --plan
```

실제 서버 구축 후 공지·저장 동결/flush·종료·시작·상태 확인·운영 메타데이터 발행 어댑터를 설정해야 실행할 수 있습니다. 원본 클라이언트에는 서버에서 쓸 수 없는 모드가 있으므로 독립적으로 검증한 서버 ZIP을 사용합니다. 백업을 보존하고 업데이트/기동/상태 확인 실패 시 이전 서버와 데이터를 되돌립니다. 중단된 작업은 `--recover --plan`으로 확인하고 명시적으로 복구합니다. 실제 서버 연결과 실서버 적용 검증은 아직 수행하지 않았습니다.

클라이언트도 설치 중 바뀐 파일을 먼저 저널에 기록합니다. 실패하면 기존 파일·옵션·설치 기록을 되돌리고, 복구 자체가 중단되면 백업을 남겨 다음 **복구**에서 재시도합니다. 게임/Prism이 실행 중이면 복구를 수행하지 않습니다.

# Sunrin Core

Minecraft **1.20.1**, Forge **47.4.0**, Java **17**. 보상 추첨과 접속 보상 정책은 KubeJS에 두고, 이 모드는 서버 지급 기록·화면·칭호/이름 색상·관리자 동작만 연결합니다. 아이템은 KubeJS가 등록합니다.

## 빌드와 확인

```sh
sh sunrin-core/gradlew -p sunrin-core build
python3 sunrin-core/test-domain.py
npm test
```

출력은 `sunrin-core/build/libs/sunrin-core-0.1.0.jar`입니다. 배포 전에 `build-scripts/pin-owned-artifact.py --refresh`와 manifest/서버 후보 생성기를 실행해 실제 바이트의 고정 해시를 갱신합니다. 클라이언트와 서버에 같은 JAR·스크립트를 적용합니다.

## 설정

`kubejs/data/sunrin/defaults/{random-box,furniture-box,geonpi}.json`을 최초 한 번만 `config/sunrin/`으로 복사합니다. 운영자가 편집한 파일은 업데이트나 재로드로 덮어쓰지 않습니다. 없거나 잘못된 보상 ID·확률 합계·시즌 후보는 상자를 소비하기 전에 차단합니다. `/sunrinpolicy reload`로 재검증합니다.

관리자 패널과 건피권 알림은 `geonpi.json`의 같은 `operatorUuids`를 사용합니다. 최초 기본값은 확인된 `peach_min` UUID 한 개이며, 목록에 있다는 이유로 OP를 자동 부여하지 않습니다. `/sunrin admin`에서 본인의 임시 OP와 게임 모드를 각각 전환합니다. 임시 OP 변경은 원래 권한·레벨·접속 제한 우회 값을 기록하고 로그아웃·재접속·재시작에 복구합니다. Core 변경 이후 외부에서 바꾼 권한은 보존합니다. 복구를 확인할 수 없으면 기록을 유지하고 시작 또는 재접속을 중단합니다.

칭호권은 기존 `kubejs:rename_ticket` ID와 텍스처를 유지합니다. 칭호는 NFC 기준 1~10 Unicode 코드포인트이며 자동 괄호는 제외합니다. 이름 색상을 지정하기 전에는 기존 scoreboard 색을 상속합니다. 팀을 교체하거나 실제 Minecraft 계정명을 바꾸지 않습니다.

## 지급 기록과 복구

기록은 `<월드>/data/sunrin-core/deliveries/<플레이어 UUID>/<거래 UUID>.json`에 남습니다. 확정 아이템 NBT·소비 전 입력·설정 버전·지급/습득 증거가 포함됩니다. 인벤토리가 부족하면 바로 바닥에 떨어지며, 보관함을 만들지 않습니다. 미완료·손상·바닥 아이템의 존재를 확인할 수 없는 기록은 자동 재추첨/재지급하지 않고 후속 지급을 멈춥니다.

운영자는 백업을 보존한 뒤 거래 기록과 실제 인벤토리·바닥 아이템을 비교합니다. 정상 드롭이 있는 청크를 불러온 후 다음 명령으로 다시 검증할 수 있습니다.

```text
/sunrin recovery recheck <플레이어 UUID>
```

필요한 수동 복구를 끝내고 같은 보상이 이미 전달됐음을 확인한 뒤에만 다음 확인 명령을 사용합니다. 이 명령 자체는 아이템을 추가 지급하지 않습니다. UUID 허용 운영자 또는 서버 콘솔만 실행할 수 있습니다.

```text
/sunrin recovery acknowledge <플레이어 UUID> <거래 UUID>
```

플레이어 파일과 월드 엔티티는 서로 다른 저장소입니다. 모든 전원 차단 시점의 원자성을 보장한다고 가정하지 않으며, 확인할 수 없는 상태는 원본 기록을 유지하고 운영자 검토로 넘깁니다. 정상 아이템의 습득·만료·파괴는 별도 증거로 구분합니다.

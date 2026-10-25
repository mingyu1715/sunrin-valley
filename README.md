# 선린밸리 · Sunrin Valley

**전용 설치 화면 + Prism Launcher 원본**으로 실행하는 Minecraft 1.20.1 Forge 생활형 클라이언트입니다. Windows x64와 macOS Apple Silicon을 대상으로 합니다.

## 친구가 사용하는 순서

> **첫 실행 보안 경고 안내:** Windows 코드 서명과 macOS Developer ID 서명·공증은 적용하지 않았습니다. Mac DMG의 앱에는 번들 검증용 무료 로컬 서명을 적용했습니다. 처음 설치하거나 실행할 때 운영체제의 보안 경고가 표시될 수 있습니다. 공식 GitHub 릴리스에서 받은 파일인지 확인해 주세요.

**[Windows 설치 가이드 — 보안 경고 화면 포함](docs/windows-install.md) · [Mac DMG 설치 가이드](docs/mac-install.md)**

1. [최신 런처 릴리스](https://github.com/mingyu1715/sunrin-valley/releases/latest)에서 운영체제에 맞는 앱을 실행합니다. 로컬 빌드는 `release/1.1.1/`입니다.
2. **게임 설치**를 누릅니다. 원본 4.1.5A, 추가 모드, 한국어 설정, 커스텀 리소스, Java 17과 Prism을 준비합니다.
3. **게임 실행**을 누릅니다. 필요한 경우 Microsoft 계정 추가 안내와 인증 창에서 로그인을 완료합니다.
4. 선린밸리 버튼은 **준비하는 중**을 표시하고, 그 아래에 로그인 확인·Minecraft/Forge 준비·실행 단계를 보여줍니다. 첫 실행 시 Minecraft·Forge·라이브러리·기본 게임 자산은 Prism이 추가로 내려받습니다.

일반 실행은 Prism 메인 창과 정상 로그 콘솔을 숨깁니다. Java·테마 선택 페이지도 기본값으로 줄였지만, 원본의 필수 로그인·다운로드 진행·오류 창은 나타날 수 있습니다. 직접 Prism을 열려면 **설정 → 문제 해결 → Prism 직접 열기**를 사용합니다. 선린밸리는 Prism 계정 파일을 읽거나 수정하지 않습니다. 비밀번호 입력과 게임 소유권 확인·인증은 Prism과 Microsoft 창에서 진행합니다.

## 포함 구성

- Society: Sunlit Valley **4.1.5A**, Minecraft **1.20.1**, Forge **47.4.0**
- Simple Voice Chat **2.6.22**, Emotecraft **2.2.7-b.build.50**, Music Disc Maker **3.1.2**, StageBox **1.3.0**
- 원본의 한국어 재사용, 초기 `lang:ko_kr`, `Sunrin-Custom.zip` 활성화
- Stay True 자동 적용. 우선순위는 Sunlit 전용 덮어쓰기 → 선린 커스텀 → 기존 호환 팩 → Stay True → 기본입니다.
- Complementary Reimagined와 BSL은 선택 가능한 파일로 준비하며 자동으로 켜지 않습니다.
- 게임 메모리 최소 8GB·권장 12GB. 시스템 24GB 이상은 12GB, 16GB는 8GB를 기본 추천하며 기존 수동 설정은 보존합니다.
- KubeJS 아이템 `kubejs:geonpi_ticket`, `kubejs:rename_ticket`, `kubejs:sunrin_meal`
- **선린 급식**: 설명 **학교에서 먹던 그 맛.**, 허기 **4칸(8포인트)**, 포만감 계수 **1.0**

이용권은 등록·이름·텍스처까지 구현했습니다. 이용권 사용 효과는 별도 서버 기능으로 아직 연결하지 않았습니다. 서버에 접속할 때는 같은 추가 모드와 `kubejs-custom/startup_scripts/sunrin_items.js`를 서버에도 적용해야 합니다.

## 설치와 설정 보존

설정에서 지정한 전용 폴더 아래 `prism-data/instances/SunrinValley/.minecraft/`를 사용합니다. 처음에는 비어 있는 폴더를 선택합니다. 기존 `.minecraft`는 옵션·셰이더를 읽는 용도로만 사용합니다.

- options는 최초 1회 가져오며 이후 사용자 키·음량 등을 보존합니다.
- 셰이더 공유는 기존 ZIP을 개별 연결합니다. Windows 연결 권한이 없으면 해당 파일의 공유를 건너뜁니다.
- 수정한 모드 설정(`config/`)과 월드·스크린샷·사용자가 추가한 파일은 보존합니다.
- **복구**는 잠긴 파일을 해시로 확인하고 누락·손상을 다시 내려받습니다. 변경 전 관리 파일은 `.minecraft/.sunrin/backups/`에 보관합니다.
- Prism 또는 게임이 실행 중이면 설치·복구·설정 변경을 거부합니다.
- 런처 0.1.2부터 GitHub의 최신 목록으로 모드·리소스팩·자체 KubeJS를 원격 업데이트합니다. 앱 기능 변경 때만 새 런처를 받습니다. 기존 0.1.1 사용자는 한 번 새 런처로 바꿔야 합니다. [운영자 배포 방법](docs/remote-updates.md)을 참고하세요.
- 0.1.3부터 발행된 최신 버전과 서버 운영 버전을 분리합니다. 클라이언트는 운영 버전만 선택하며 점검 상태를 기존 상태 영역에 표시합니다. 설치 실패 시 저널로 기존 정상 파일을 복원합니다.

1.1.0부터 런처 자체도 **설정 → 런처 업데이트**에서 GitHub 최신 릴리스를 확인하고 교체할 수 있습니다. 게임·계정·설정·월드는 다시 설치하지 않습니다. 1.1.1은 변경 내역을 팝업으로 표시하고 저장·복사 완료 알림은 약 2초 후 사라집니다. [런처 업데이트 내역](launcher/CHANGELOG.md)을 참고하세요.

## 개발

Node.js 22.12 이상, Python 3.10 이상을 권장합니다.

```sh
npm ci
npm run build
npm run dev
```

```sh
npm test
npm run typecheck
npm run package:mac
npm run package:win
```

`package:mac`은 Apple Silicon용 DMG, `package:win`은 Windows x64 설치형 EXE를 만듭니다. Mac은 `identity: "-"`와 명시적인 Electron 권한으로 무료 로컬 서명을 적용하고, 앱의 엄격한 번들 서명·버전·아키텍처와 DMG 무결성 검사를 통과해야 패키징에 성공합니다. Developer ID 서명·Apple 공증은 수행하지 않습니다. 개발자는 빌드에 Python을 사용하지만 배포 런처 사용자에게는 Node/Python 설치가 필요하지 않습니다.

런처 릴리스는 양쪽 플랫폼 패키징 후 `node build-scripts/build-launcher-update.cjs --version 1.1.1 --directory release/1.1.1 --changelog launcher/CHANGELOG.md`로 업데이트 ZIP·버전 목록·체크섬을 생성합니다. GitHub의 `launcher-버전` 최신 릴리스에 설치 파일과 생성물을 함께 올립니다. 게임 운영 버전 채널은 별도로 유지합니다.

원본 목록 재현: `python3 build-scripts/resolve-pack.py --check`. 리소스팩 빌드: `python3 build-scripts/build-resources.py`. 전체 다운로드 검증: `npm run verify:install` (프로젝트의 `.local-test/`에 실제 파일을 설치하고 디스크 공간을 사용합니다).

## 상태 표시와 유지

- 설치된 모드팩·계정·게임 옵션은 앱을 다시 열어도 기존 전용 데이터 경로에서 유지합니다. 정상 파일은 재사용하며 전체를 다시 받지 않습니다.
- 게임 실행을 요청한 뒤 창을 닫아도 Prism은 계속 동작합니다. 다시 열면 프로세스의 PID·시작 시각과 저장된 단계만 대조해 로그인·게임 준비 상태를 복원합니다. 계정 관리만 별도로 연 창은 게임 준비로 표시하지 않습니다.
- 모드팩 파일 준비와 Minecraft/Forge 준비는 다른 단계입니다. 모드팩은 선린밸리가, 기본 게임 구성요소는 Prism이 담당합니다.
- 실행 단계는 고정된 엔진 이벤트와 실제 게임 프로세스에서 확인합니다. 원시 엔진 출력과 계정 파일은 UI에 전달하지 않습니다. Prism 내부의 정확한 진행률은 공식 API가 없어 임의 퍼센트를 표시하지 않습니다.
- 중단된 다운로드의 완료 파일은 재사용합니다. 받던 단일 파일의 바이트 단위 이어받기는 아직 지원하지 않습니다.
- 1.0.0부터 Windows 제어판 제거 프로그램과 macOS 앱 메뉴 제거를 제공합니다. 전용 데이터와 월드 삭제를 확인한 뒤 정리합니다.

## 검증 범위

macOS arm64에서 전체 팩 설치·해시 검사, Java 17 실행, Electron 창·설정 IPC, 로그인 전용 최초 안내, 창 종료 후 엔진 유지와 준비 단계 복원을 검증했습니다. 0.1.2는 원격 파일 검증·오프라인 캐시·리소스 순서·설정 보존을 포함한 자동 테스트 140개와 TypeScript 검사를 통과했습니다. Windows 배포물 생성과 실제 Windows 실행은 구분합니다. **Microsoft 계정 로그인, 게임 월드 진입, 모드 간 게임 내 동작은 실제 플레이어 계정으로 추가 확인해야 합니다.**

0.1.3은 185개 테스트와 실제 Electron 네 가지 화면 크기의 호버/클릭/점검 표시를 검증했습니다. 격리된 전체 모드팩에서 실패를 주입해 시작 스크립트·옵션·설치 기록의 바이트 단위 복원을 확인했고, 정상 복구는 추가 모드 다운로드0건으로 완료했습니다. 공식 Prism11.1.1 기동도 확인했습니다. 예약 서버 도구는 모의 명령/파일로 검증했으며 실제 서버는 연결하지 않았습니다.

[실제 GitHub 발행 실행](https://github.com/mingyu1715/sunrin-valley/actions/runs/40120654286)이 성공했습니다. 공개 채널과 세 배포 파일을 인증 없이 검증하고, 기존 설치에서 Stay True·BSL 두 파일만 새로 내려받아 업데이트했습니다. 팩 순서와 비활성 셰이더·개인 옵션·월드 보존, 오프라인 재사용, macOS 배포 앱의 추천 메모리·12GB 버튼·설정 저장을 확인했습니다.

## 자료와 출처

- [현재 구성과 제한](docs/project-overview.md)
- [구현 계획과 확인 항목](docs/work-plan.md)
- [모드 목록](docs/mod-list.md), [원본 한국어 적용 순서](client-pack/localization.md)
- [에셋](docs/asset-plan.md), [리소스팩](resourcepacks/README.md), [KubeJS 등록 코드](kubejs-custom/startup_scripts/sunrin_items.js)
- 원본: [Society: Sunlit Valley / Chakyl](https://www.curseforge.com/minecraft/modpacks/society-sunlit-valley/files/8980840)
- 실행 프로그램: [Prism Launcher](https://prismlauncher.org/), [고정 공식 배포 11.1.1](https://github.com/PrismLauncher/PrismLauncher/releases/tag/11.1.1), [소스와 라이선스](https://github.com/PrismLauncher/PrismLauncher)
- Java: [Eclipse Temurin / Adoptium](https://adoptium.net/)

Prism은 수정하지 않은 공식 프로그램을 다운로드하여 별도로 실행합니다. 이 프로젝트는 Prism Launcher의 공식 제품이나 제휴 프로젝트가 아닙니다. 모드 JAR과 원본 팩은 자체 미러로 재호스팅하지 않고 잠긴 공식 배포 URL에서 내려받습니다.

## 런처 1.0.0

- 설치된 게임은 **게임 실행**을 누르면 운영 버전을 확인합니다. 업데이트가 있으면 **업데이트가 있습니다**로 바뀌고, 다시 누르면 용량 안내 후 업데이트하고 실행합니다. 모드팩 운영 버전과 런처 버전은 별개입니다.
- 설치 전 다운로드·예상 설치 구성·임시/복구 파일을 포함한 여유 공간을 계산합니다. 정확한 공급자 메타데이터가 없는 실행 환경은 보수적인 예산과 25% 여유, 2 GiB 예비 공간을 더합니다. 월드 증가량은 달라질 수 있습니다. 설정의 설치 용량은 전용 모드·런타임·캐시·월드의 실제 파일 크기 합입니다.
- 오류 안내에서 **상세 정보**, **오류 정보 복사**, **진단 파일 저장**을 사용할 수 있습니다. 동일한 가림 처리 결과를 TXT로 저장하며 계정 파일이나 전체 로그 폴더를 내보내지 않습니다. 이번 실행의 충돌 보고서 또는 명시적인 치명 오류 발췌가 있을 때 포함합니다. 모든 게임 오류가 파일을 남기지는 않습니다.
- 설치·게임 준비 중 창을 닫으면 **계속 보기 / 창만 닫기**를 안내합니다. 창만 닫아도 기존 백그라운드 작업과 로그인 상태를 유지합니다.
- Windows는 제어판의 프로그램 제거와 설정의 설치된 앱에 등록됩니다. 제거 확인 후 전용 모드·Prism 로그인·Java·캐시·설정·월드와 런처를 정리합니다. 이전 포터블 EXE는 직접 지울 수 있으며, 데이터는 새 설치형 런처의 제거 프로그램으로 정리합니다. 런처 업데이트 설치에서는 게임 데이터를 삭제하지 않습니다.
- Mac은 설치한 앱의 **Sunrin Valley → 선린밸리 제거…** 메뉴에서 전용 데이터를 삭제하고 앱을 휴지통으로 옮깁니다. 앱만 휴지통에 넣으면 별도 데이터는 남습니다. 두 플랫폼 모두 월드는 먼저 백업해야 하며 기존 Minecraft 폴더는 유지합니다.
- 1.0.0 자동 검사 260개와 TypeScript·플랫폼 빌드, 실제 Electron UI/IPC 및 격리된 배포 앱 제거 도우미를 검증했습니다.
- Windows 실제 PC 설치·제거 및 Microsoft 로그인 후 플레이 검증은 사용자 요청에 따라 후속 패치 점검으로 남겨두었습니다. 신뢰된 개발자 인증서를 통한 서명·Apple 공증과 실제 서버 연결은 이번 발행에 포함되지 않습니다.

1.1.1은 런처 테스트 256개와 실제 Electron 팝업·알림·버튼 회귀 검증을 통과했습니다. Mac에서는 격리된 실제 앱으로 1.1.0→1.1.1 교체·시작 확인·이전 앱 정리와 실패 시 1.1.0 복원을 검증하고 가짜 계정·설정·월드 파일의 바이트 보존을 확인합니다. Windows 업데이트 도우미는 [Windows PowerShell 실행 검증](https://github.com/mingyu1715/sunrin-valley/actions/runs/40202478591)에서 교체·복구를 통과했으며, 설치 화면과 실제 플레이는 Windows 사용자 확인이 필요합니다.

# 선린밸리 · Sunrin Valley

**전용 설치 화면 + Prism Launcher 원본**으로 실행하는 Minecraft 1.20.1 Forge 생활형 클라이언트입니다. Windows x64와 macOS Apple Silicon을 대상으로 합니다.

## 친구가 사용하는 순서

1. 운영체제에 맞는 `release/`의 런처를 실행합니다.
2. **게임 설치**를 누릅니다. 원본 4.1.5A, 추가 모드, 한국어 설정, 커스텀 리소스, Java 17과 Prism을 준비합니다.
3. **설정 → Prism에서 로그인**을 누르고 Prism 최초 설정과 Microsoft 계정 추가를 완료합니다. 계정 메뉴에서 Microsoft 계정을 추가할 수도 있습니다.
4. Prism 초기 설정 후에는 창을 닫아도 됩니다. 선린밸리의 **게임 시작**을 누릅니다. 첫 게임 실행 시 Minecraft·Forge·라이브러리·게임 자산은 Prism이 추가로 내려받습니다.

Prism 원본의 설정·로그인·오류 화면이 나타날 수 있습니다. 선린밸리는 계정 토큰이나 비밀번호를 읽지 않습니다. 게임 소유권 확인과 인증은 Prism이 담당합니다.

## 포함 구성

- Society: Sunlit Valley **4.1.5A**, Minecraft **1.20.1**, Forge **47.4.0**
- Simple Voice Chat **2.6.22**, Emotecraft **2.2.7-b.build.50**, Music Disc Maker **3.1.2**, Beat Lamp **1.2.2**
- 원본의 한국어 재사용, 초기 `lang:ko_kr`, `Sunrin-Custom.zip` 활성화
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
- 팩 버전은 런처에 포함된 잠금 manifest로 관리합니다. 새 manifest를 포함한 런처를 배포하면 업데이트 상태를 감지합니다. 별도 온라인 업데이트 서버는 아직 연결하지 않았습니다.

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

`package:mac`은 Apple Silicon용 ZIP, `package:win`은 Windows x64 포터블 EXE를 만듭니다. 개발 빌드는 서명·공증하지 않았습니다. 개발자는 빌드에 Python을 사용하지만 배포 런처 사용자에게는 Node/Python 설치가 필요하지 않습니다.

원본 목록 재현: `python3 build-scripts/resolve-pack.py --check`. 리소스팩 빌드: `python3 build-scripts/build-resources.py`. 전체 다운로드 검증: `npm run verify:install` (프로젝트의 `.local-test/`에 실제 파일을 설치하고 디스크 공간을 사용합니다).

## 검증 범위

macOS arm64에서 전체 팩 설치·해시 검사, Java 17 실행, Electron 창·설정 IPC, Prism 최초 설정 창, 런처 재시작 후 실행 중 Prism 복구 차단을 검증했습니다. Windows 배포물 생성과 실제 Windows 실행은 구분합니다. **Microsoft 계정 로그인, 게임 월드 진입, 모드 간 게임 내 동작은 실제 플레이어 계정으로 추가 확인해야 합니다.**

## 자료와 출처

- [현재 구성과 제한](docs/project-overview.md)
- [구현 계획과 확인 항목](docs/work-plan.md)
- [모드 목록](docs/mod-list.md), [원본 한국어 적용 순서](client-pack/localization.md)
- [에셋](docs/asset-plan.md), [리소스팩](resourcepacks/README.md), [KubeJS 등록 코드](kubejs-custom/startup_scripts/sunrin_items.js)
- 원본: [Society: Sunlit Valley / Chakyl](https://www.curseforge.com/minecraft/modpacks/society-sunlit-valley/files/8980840)
- 실행 프로그램: [Prism Launcher](https://prismlauncher.org/), [고정 공식 배포 11.1.1](https://github.com/PrismLauncher/PrismLauncher/releases/tag/11.1.1), [소스와 라이선스](https://github.com/PrismLauncher/PrismLauncher)
- Java: [Eclipse Temurin / Adoptium](https://adoptium.net/)

Prism은 수정하지 않은 공식 프로그램을 다운로드하여 별도로 실행합니다. 이 프로젝트는 Prism Launcher의 공식 제품이나 제휴 프로젝트가 아닙니다. 모드 JAR과 원본 팩은 자체 미러로 재호스팅하지 않고 잠긴 공식 배포 URL에서 내려받습니다.

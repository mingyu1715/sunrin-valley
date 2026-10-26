# StageBox 시작 충돌 수정 — 구성 0.1.4

Minecraft 1.20.1·Forge 47.4.0·원본 Sunlit Valley 4.1.5A를 유지하고 StageBox 1.3.0만 **1.1.2**로 교체합니다. 나머지 373개 파일 pin과 자체 리소스/KubeJS overlay는 이전 구성과 같습니다. 런처 앱은 1.1.3 그대로 사용합니다.

## 원인과 선택

실제 충돌 로그의 `StageBoxClient.addEntityLayers:77`은 `EntityRenderersEvent.AddLayers.getEntityRenderer(EntityType):EntityRenderer`를 호출합니다. 다음 호출인 `getPlayerSkin(String)`도 Forge 47.4.0에 없습니다. 해당 Forge 버전은 `getRenderer(...):LivingEntityRenderer`와 `getSkin(...):LivingEntityRenderer`를 제공합니다. StageBox 1.2.0에도 같은 잘못된 호출이 있어 대안에서 제외했습니다.

근거는 [고정 Forge 47.4.0 소스](https://maven.minecraftforge.net/net/minecraftforge/forge/1.20.1-47.4.0/forge-1.20.1-47.4.0-sources.jar)와 실제 배포 JAR의 메서드 참조입니다. 기존 문서의 “Forge 47.4.0 호환”은 `mods.toml` 버전 조건 충족을 실행 호환으로 잘못 해석한 설명이었으며 정정했습니다.

[공식 StageBox 1.1.2](https://www.curseforge.com/minecraft/mc-mods/stagebox/files/8918785)는 해당 렌더 레이어 처리 없이 기존 기능을 제공합니다. 설치 파일은 공식 CDN에서 직접 받으며 수정하거나 재배포하지 않습니다.

- 파일: `StageBox-Mod-1.1.2-Forge-1.20.1.jar`, 1,054,415바이트
- SHA1: `d015cd4bad85a30e5405f5db5450e30ceebf08b8`
- SHA256: `b59cd5e13b205582a9f847a9246ed113aa283ef596a0ae823a4930f95cc22325`
- Java 17, ZIP CRC 정상, 한국어·영어 각각 316키

## 실제 클라이언트 검증

Apple Silicon·Java 17.0.21에서 원본 계정/토큰과 저장한 월드를 복사하지 않은 별도 환경으로 검사했습니다.

| 구성 | 결과 |
|---|---|
| StageBox만 제외, 나머지 355개 모드 SHA256 동일 | 실제 메인 화면 10초 유지, 정상 종료 코드 0 |
| 공식 StageBox 1.1.2 + 동일한 355개 모드 | StageBox 클래스 로드 및 실제 메인 화면 10초 유지, 정상 종료 코드 0 |

검증 요약은 `client-pack/fixtures/stagebox-runtime-verification.json`에 기록했습니다. Windows 실제 게임 실행, StageBox 소리·조명·기존 월드 로딩 및 서버 접속까지 검증한 것은 아닙니다.

설치기 회귀 테스트는 0.1.3→0.1.4 교체 시 나머지 모드·옵션·설정·계정·월드/플레이어 파일 보존, 수정된 구버전 JAR의 비활성 백업, 중간 실패 시 이전 JAR·영수증 복원을 확인합니다.

## 서버와 월드 보존 조건

StageBox 네트워크 프로토콜은 1.3.0에서 `3`, 1.1.2에서 `1`이므로 서버도 같은 버전으로 맞춰야 합니다. 서버 대상 lock은 `server-ops/releases/0.1.4/pack-lock.json`이며 서버 백업·교체·정상 기동 확인 후 현재 설치 기준 `server-ops/aws/pack-lock.json`도 대상 lock과 일치시켰습니다. 이전 기준은 `server-ops/releases/0.1.2/pack-lock.json`으로 보존합니다. 운영 채널은 실제 서버 교체·정상 확인 뒤 전환합니다.

1.1.2에는 1.3.0의 블록 17종이 없습니다. 설치기는 기존 월드 파일을 수정하지 않지만, 이후 그 월드를 열 때 구버전에 없는 배치물까지 유지된다고 보장할 수 없습니다. 서버 교체 전 전체 월드·플레이어 데이터·설정과 기존 JAR/lock/소유 마커를 별도로 백업합니다. 원본 백업 없이 기존 월드를 시험 기동하지 않습니다.

2026-10-26 실제 서버 적용에서는 정상 저장·종료 후 2,447개 청크와 NBT 파일 22개를 읽기 전용으로 확인했습니다. StageBox 참조 104개는 `level.dat`의 Forge 등록 목록에만 있었고 실제 객체 참조는 없었습니다. 전용 전체 백업 후 StageBox만 교체했으며, 첫 기동 전 월드 파일과 나머지 서버 모드 314개의 해시 일치를 확인했습니다. 교체 후 Forge 47.4.0 서버 준비·RCON 정상 작동과 기존 60분 종료 타이머의 시각 보존을 확인했습니다.

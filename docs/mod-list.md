# 실제 클라이언트 구성

기준은 `client-pack/manifest.json`입니다. 파일별 경로·URL·해시·크기·프로젝트/파일 ID를 잠갔습니다. 원본 ZIP과 소스 커밋 `f00b8473bbf16ac0d0d3f3afbc01be0519f9dd9b`를 실제 대조했습니다.

| 구분 | 구성 |
|---|---|
| 기반 | Society: Sunlit Valley 4.1.5A / Minecraft 1.20.1 / Forge 47.4.0 |
| 원본 | 모드 351개, 리소스팩 15개, 셰이더 1개 + ZIP overrides |
| 추가 | 아래 Forge 모드 4개 |
| 커스텀 | 원본 KubeJS에서 아이템 3종 추가 + Sunrin-Custom.zip |
| 합계 | 다운로드 파일 371개. 원본 overrides와 자체 파일은 별도 |

| 추가 모드 | 고정 버전 | 설치 대상 |
|---|---|---|
| Simple Voice Chat | 2.6.22 | 클라이언트·서버 |
| Emotecraft | 2.2.7-b.build.50 (Beta) | 클라이언트·서버 |
| Music Disc Maker | 3.1.2 | 클라이언트·서버, 같은 버전 사용 |
| Beat Lamp | 1.2.2 | 클라이언트·서버 |

추가 4종의 실제 JAR 해시·CRC·Forge/MC 대상·한국어 파일을 확인했습니다. Emotecraft는 원본에 이미 들어 있는 PlayerAnimator 1.0.2-rc1로 의존성을 충족합니다. 중복 추가하지 않습니다. Music Disc Maker와 Beat Lamp의 관련 클래스도 정적으로 확인했으며 실제 게임 내 연동은 아직 검증하지 않았습니다.

WATUT/CoroUtil·Simple Hats·Zetter·Immersive Paintings·Exposure·Etched·FTB Quests/Chunks·KubeJS·LootJS·Create: Numismatics·Chunky·spark는 원본 lock에 포함되어 있어 그대로 사용합니다. 전체 파일과 정확한 버전은 manifest를 봅니다.

원본 한국어 파일은 481개입니다. 기존 한국어를 우선 적용하며 별도 Sunrin-Korean 번역 프로젝트는 만들지 않습니다. 순서와 원본 옵션의 파일명 보정은 `client-pack/localization.md`에 기록했습니다.

WorldEdit·Sunrin Core·EssentialsX·Essential Mod·FTB Essentials는 이번 클라이언트에 새로 추가하지 않습니다. 관리자·보상·퀘스트·월드 작업도 현재 범위에 포함하지 않습니다.

출처: [공식 클라이언트](https://www.curseforge.com/minecraft/modpacks/society-sunlit-valley/files/8980840), [고정 원본 소스](https://github.com/Chakyl/society-sunlit-valley/tree/f00b8473bbf16ac0d0d3f3afbc01be0519f9dd9b). 추가 모드의 공식 프로젝트·버전·파일 출처는 `client-pack/sources.json`과 manifest에 포함합니다.

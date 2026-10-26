# 실제 클라이언트 구성

기준은 `client-pack/manifest.json`입니다. 파일별 경로·URL·해시·크기·프로젝트/파일 ID를 잠갔습니다. 원본 ZIP과 소스 커밋 `f00b8473bbf16ac0d0d3f3afbc01be0519f9dd9b`를 실제 대조했습니다.

| 구분 | 구성 |
|---|---|
| 기반 | Society: Sunlit Valley 4.1.5A / Minecraft 1.20.1 / Forge 47.4.0 |
| 원본 | 모드 351개, 리소스팩 15개, 셰이더 1개 + ZIP overrides |
| 추가 | 아래 Forge 모드 5개 + Stay True 리소스팩 + BSL 셰이더 |
| 커스텀 | 원본 KubeJS에서 아이템 3종 추가 + Sunrin-Custom.zip |
| 합계 | 다운로드 파일 374개. 원본 overrides와 자체 파일은 별도 |

| 추가 모드 | 고정 버전 | 설치 대상 |
|---|---|---|
| Simple Voice Chat | 2.6.22 | 클라이언트·서버 |
| Emotecraft | 2.2.7-b.build.50 (Beta) | 클라이언트·서버 |
| Music Disc Maker | 3.1.2 | 클라이언트·서버, 같은 버전 사용 |
| StageBox | 1.1.2 | 클라이언트·서버, CurseForge file 8918785, 양쪽 버전 일치 필요 |
| Korean Chat Patch | 1.9.6 | 클라이언트 전용, Windows x64·Mac Apple Silicon |

추가 4종의 실제 JAR 해시·CRC·Forge/MC 대상·한국어 파일을 확인했습니다. Emotecraft는 원본에 이미 들어 있는 PlayerAnimator 1.0.2-rc1로 의존성을 충족합니다. 중복 추가하지 않습니다. StageBox 1.3.0은 메타데이터의 버전 범위와 달리 Forge 47.4.0에 없는 렌더러 API를 호출해 시작 중 충돌했습니다. 0.1.4 구성에서는 1.1.2로 교체하며 Forge 47.4.0은 유지합니다. 1.1.2는 별도 필수 라이브러리 없이 Java 17을 사용하고 한국어·영어 각각 316개 키를 내장합니다. 자체 `.ogg` 음악 재생 방식을 쓰며 Music Disc Maker 연동과 게임 안의 소리·조명은 아직 검증하지 않았습니다.

선린밸리 팩 0.1.1에서 Beat Lamp를 StageBox로 교체했습니다. 기존 영수증으로 관리되는 Beat Lamp 파일은 업데이트에서 정리하고, 원본 351개 모드와 나머지 추가 모드 3개는 유지합니다.

콘텐츠 팩 0.1.2에는 [Stay True 1.20](https://www.curseforge.com/minecraft/texture-packs/stay-true/files/4624707)의 `Stay_True_1.20.zip`과 [BSL 10.1.8](https://modrinth.com/shader/bsl-shaders/version/Y68yiql9)의 `BSL_v10.1.8.zip`을 추가했습니다. 두 파일의 Minecraft 1.20.1 배포 메타데이터와 실제 ZIP 해시·크기·CRC를 검증했습니다. 원본 Complementary Reimagined r5.6.1 일반판과 Clrwl 변형은 그대로 사용하며 셰이더는 자동으로 활성화하지 않습니다. 파일은 공식 배포자의 CDN에서 직접 설치합니다.

리소스팩은 높은 우선순위부터 Sunlit overrides → Sunrin-Custom → 원본/사용자 호환 팩 → Stay True → 바닐라 순으로 적용합니다. Stay True의 OptiFine 전용 부가 효과와 각 셰이더의 실제 GPU 렌더링은 아직 검증하지 않았습니다. 상세 출처·검증 범위는 `client-pack/localization.md`에 기록했습니다.

WATUT/CoroUtil·Simple Hats·Zetter·Immersive Paintings·Exposure·Etched·FTB Quests/Chunks·KubeJS·LootJS·Create: Numismatics·Chunky·spark는 원본 lock에 포함되어 있어 그대로 사용합니다. 전체 파일과 정확한 버전은 manifest를 봅니다.

원본 한국어 파일은 481개입니다. 기존 한국어를 우선 적용하며 별도 Sunrin-Korean 번역 프로젝트는 만들지 않습니다. 순서와 원본 옵션의 파일명 보정은 `client-pack/localization.md`에 기록했습니다.

WorldEdit·Sunrin Core·EssentialsX·Essential Mod·FTB Essentials는 이번 클라이언트에 새로 추가하지 않습니다. 관리자·보상·퀘스트·월드 작업도 현재 범위에 포함하지 않습니다.

출처: [공식 클라이언트](https://www.curseforge.com/minecraft/modpacks/society-sunlit-valley/files/8980840), [고정 원본 소스](https://github.com/Chakyl/society-sunlit-valley/tree/f00b8473bbf16ac0d0d3f3afbc01be0519f9dd9b). 추가 모드의 공식 프로젝트·버전·파일 출처는 `client-pack/sources.json`과 manifest에 포함합니다.

콘텐츠 팩 0.1.3의 [Korean Chat Patch 1.9.6](https://modrinth.com/mod/qyulnpBL/version/6R6bSXKY)은 Windows x64 DLL과 macOS x64/arm64 통합 라이브러리를 포함합니다. 실제 파일 SHA1·SHA256과 Forge/MC 대상, 클라이언트 전용 메타데이터를 검증했습니다. 필수 추가 라이브러리는 없으며 서버 모드 315개는 유지합니다. 인게임 한글 조합·FTB 퀘스트 입력창 동작은 실제 플레이어 확인이 필요합니다.

Korean Chat Patch는 원본 파일의 해시를 검증한 뒤 설치 시 클라이언트 전용 메타데이터(`clientSideOnly`, `displayTest`)만 보정합니다. Forge 서버 목록의 잘못된 불일치 표시를 막기 위한 조치이며 클래스·네이티브 라이브러리·번역·LGPL 라이선스 내용은 변경하지 않습니다. manifest는 공식 원본 다운로드 해시를 유지하고 설치 영수증은 보정된 실제 파일의 해시를 기록합니다. 보정 코드는 `launcher/src/main/korean-input.ts`에서 확인할 수 있습니다.

StageBox 교체 근거와 실행 검증·기존 월드 보존 범위는 [호환성 기록](stagebox-compatibility.md)을 참고하세요.

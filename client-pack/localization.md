# 원본 한국어와 초기 설정

공식 `Society-Sunlit-Valley-4.1.5A.zip`의 SHA256은 `6902439ba377c139b712cc42132d73498ff1f5ee77d795d141d255098391d7c9`이다. ZIP CRC 검사와 고정 소스 커밋 `f00b8473bbf16ac0d0d3f3afbc01be0519f9dd9b`의 project/file ID 367개 대조를 통과했다. `manifest.json`에는 원본 351개 모드, 리소스팩 15개, 셰이더 1개, 추가 모드 5개, Stay True 리소스팩과 BSL 셰이더를 잠갔다. 다운로드 파일은 총 374개다. 콘텐츠 버전은 `sources.json.packVersion`에서 정하며 현재 0.1.4다.

원본 `overrides/` 안에 한국어 파일 481개가 실제로 있다: `kubejs/` 213개, `patchouli_books/` 267개, `config/fancymenu/assets/changelog_ko_kr.markdown` 1개. 모든 실제 경로는 `manifest.json.localizations`에 기록한다. 이번 범위는 이 기존 파일을 재사용하며 별도 전체 번역팩은 만들지 않는다. 완역 여부는 산정하지 않았다. 추가 모드 네 개도 각각 `assets/<modid>/lang/ko_kr.json`을 내장한다. StageBox 1.1.2는 한국어와 영어 각각 316개 키를 내장한다. 신규 전체 번역은 진행하지 않는다.

원본 `configureddefaults/README.md`에 따르면 기본 파일은 대상이 없을 때만 게임 폴더로 복사된다. 설치 순서는 원본 ZIP의 `overrides/` 추출 → 잠긴 파일 다운로드 → 기본/실제 옵션의 한국어 및 리소스팩 순서 적용이다. 기존 사용자 옵션에서 다른 게임 설정은 유지한다.

원본 `configureddefaults/options.txt`의 리소스팩 순서는 다음과 같다. 한국어는 KubeJS/안내서 리소스에서 제공되어 별도 언어팩 항목을 추가할 필요가 없다.

```text
resourcePacks:["file/Lopy-Create-Pipez.zip","file/Icon Journey 1.1.zip","file/JourneyMap Extended Mob Icons v2.0.zip","file/updated_aquaculture-1.1.zip","file/MobCrates_1.20.1_v1.zip","file/JadeStardewValleyTheme.zip","file/Stardew_plaques v1.0.zip","file/CreateSophisticatedBackpacks.zip","file/Fairy Wings Elytra.zip"]
```

원본 옵션의 `CreateSophisticatedBackpacks.zip`은 원본 잠금 파일명 `CreateSophBackpacks.zip`과 다르므로 해당 항목은 설치된 파일명으로 맞춰야 한다. 원본 ZIP의 `resourcepacks/sunlit_overrides.zip`도 함께 추출한다.

적용 우선순위는 높은 쪽부터 `sunlit_overrides.zip` → `Sunrin-Custom.zip` → 원본/사용자 호환 리소스팩 → `Stay_True_1.20.zip` → 바닐라다. Minecraft `resourcePacks` JSON은 반대인 낮은 우선순위부터 기록하므로 Sunlit 팩이 배열 마지막에 온다. 실제 원본 15개 리소스팩을 모두 포함하며 기존 사용자 팩도 보존한다. 원본에 이름만 남은 `Create Simple Storage 2.1.zip`과 `Better tom's create storage 1.1.zip`은 설치 목록에 없다.

`config/resourcepackoverrides.json`의 스키마는 2다. `default_packs`는 실패 후 복구에 사용할 목록이고 `options.txt`와 같은 낮은→높은 순서다. `pack_overrides`의 `"1"` 배열과 `"$$1"` 설정 객체는 그룹을 정의하며 `required: true`는 팩을 필수로 지정한다. `default_position`, `fixed_position`, `force_compatible`도 지원한다. 구현 근거는 [ResourceOverridesManager](https://github.com/Fuzss/resource-pack-overrides/blob/58ea7f02cc0e39c96bbf3ae65f6e5cce33e8a970/Common/src/main/java/fuzs/resourcepackoverrides/client/data/ResourceOverridesManager.java)와 [실패 복구 Mixin](https://github.com/Fuzss/resource-pack-overrides/blob/58ea7f02cc0e39c96bbf3ae65f6e5cce33e8a970/Common/src/main/java/fuzs/resourcepackoverrides/mixin/client/MinecraftMixin.java)이다.

# 리소스팩·셰이더 확인 범위

| 파일 | 배포 식별자 | 실제 ZIP 확인 |
|---|---|---|
| `Stay_True_1.20.zip` | CurseForge 353554 / 4624707 | 2,139,266바이트, pack format 15, SHA1/SHA256/CRC |
| `BSL_v10.1.8.zip` | Modrinth Q1vvjJYV / Y68yiql9 | 1,134,153바이트, SHA1/SHA256/CRC, 셰이더 구조 |
| `ComplementaryReimagined_r5.6.1.zip` | 원본 CurseForge 627557 / 7090226 | 원본 pin 유지, 공식 Modrinth 파일과 동일 SHA1 |

[Stay True 1.20 공식 파일](https://www.curseforge.com/minecraft/texture-packs/stay-true/files/4624707)과 [BSL 10.1.8 공식 파일](https://modrinth.com/shader/bsl-shaders/version/Y68yiql9)은 Minecraft 1.20.1을 지원 대상으로 명시한다. Stay True의 일부 연결 텍스처·색상 효과는 [저자 설명](https://www.curseforge.com/minecraft/texture-packs/stay-true)에 따라 OptiFine 기능이 필요하다. 이번 추가는 원본 Forge/Oculus 구성을 유지하며 OptiFine을 추가하지 않는다. 따라서 해당 부가 효과의 전체 구현이나 게임 내 외형을 검증했다는 뜻은 아니다.

Complementary는 이미 원본 manifest와 ZIP overrides에 있다. 원본의 일반판과 `ComplementaryReimagined_r5.6.1 + Clrwl_1.0.5.zip` 변형을 보존하며 중복 버전을 추가하지 않는다. BSL과 Complementary는 셰이더 선택 목록에 파일만 제공한다. 원본 `config/oculus.properties`의 `enableShaders=false`를 유지한다. Iris 설정 파일을 새로 생성하거나 자동으로 셰이더를 선택하지 않는다. 실제 GPU에서의 렌더링·성능은 별도 실행 확인 대상이다.

Stay True 저자는 공식 FAQ에서 모드팩 사용을 허용한다. BSL은 All Rights Reserved이며 공식 설명은 무단 재배포를 허용하지 않는다. Complementary r5.6.1 안의 라이선스 1.6은 원본을 변경하지 않고 Modrinth/CurseForge 배포 시스템을 이용하는 모드팩 포함을 허용한다. 설치 파일은 각 배포자의 공식 CDN에서 직접 내려받으며 저장소나 자체 배포 ZIP에 이 제삼자 파일을 미러링하지 않는다. 출처와 정확한 해시는 `sources.json.visuals`, 메타데이터는 `fixtures/visual-versions.json`, 실물 ZIP 검사 결과는 `fixtures/visual-artifact-verification.json`에 기록했다.

# 추가 모드 확인 범위

| 모드 | 고정 버전 | 확인한 실제 파일 |
|---|---|---|
| Simple Voice Chat | 2.6.22 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |
| Emotecraft | 2.2.7-b.build.50 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |
| Music Disc Maker | 3.1.2 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |
| StageBox | 1.1.2 | Forge 1.20.1 JAR, SHA1/SHA256/크기/CRC, 한국어 316키 |

Emotecraft JAR은 PlayerAnimator를 내장하지 않는다. 실제 `META-INF/mods.toml`에서 `playeranimator >=0.2.0`을 요구하며, 원본 팩의 `player-animation-lib-forge-1.0.2-rc1+1.20.jar`(CurseForge project 658587/file 4587214)가 충족한다.

[StageBox 1.1.2 공식 배포](https://www.curseforge.com/minecraft/mc-mods/stagebox/files/8918785)는 CurseForge project 1591857/file 8918785이다. 이전 1.3.0의 `mods.toml` 버전 조건은 Forge 47.4.0을 허용했지만 실제 클래스가 존재하지 않는 Forge API를 호출해 충돌했다. 버전 조건 충족은 실행 호환 검증과 다르다. 0.1.4는 해당 호출이 없는 1.1.2로 교체하고 Forge 47.4.0을 유지한다. 상세 근거와 검증 범위는 [호환성 기록](../docs/stagebox-compatibility.md)에 기록한다. 클래스 버전은 Java 17이다. StageBox는 자체 `.ogg` 음악·플레이리스트를 사용하며 Music Disc Maker와의 연동은 확인하지 않았다. [Music Disc Maker 공식 설명](https://modrinth.com/mod/music-disc-maker)에 따라 서버와 클라이언트 버전을 맞춰야 한다. 게임 안의 소리·조명과 Windows/macOS 오디오 장치 동작은 별도 실행 검증이 필요하다.

선린밸리 팩 0.1.1에서 StageBox가 Beat Lamp를 대체한다. 업데이트 시 이전 설치 영수증이 관리하던 Beat Lamp JAR은 제거하며, 사용자가 수정한 파일이면 먼저 백업한다. 원본 Sunlit Valley 버전은 4.1.5A를 유지한다.

# 재현

```sh
python3 build-scripts/resolve-pack.py --check
python3 -m unittest discover -s client-pack -p 'test_*.py'
python3 build-scripts/resolve-pack.py --download-base --verify-archive
python3 build-scripts/resolve-pack.py --check --verify-visuals
```

기본 생성과 `--check`는 체크인된 fixture만 사용하여 네트워크/캐시 없이 동작한다. `--download-base`는 없을 때 원본 ZIP만 내려받고 검증하며, `--verify-archive`는 이미 받은 ZIP의 SHA256/CRC/원본 manifest/한국어 481파일 해시를 검증한다. 추가 모드 JAR 네 개가 `client-pack/cache/`에 있으면 `--verify-addons`로 실물 검사를 반복한다. Stay True/BSL ZIP 두 개가 같은 캐시에 있으면 `--verify-visuals`로 크기·SHA1/SHA256·CRC·팩 구조를 검사하여 체크인된 실물 검사 결과와 대조한다. 생성기는 원본 모드 전체를 내려받지 않으며, 배포·설치 단계가 `manifest.json`의 URL/해시를 사용한다. 체크인된 fixture의 SHA256은 `sources.json`의 `sourceHash`로 검증한다. StageBox와 Stay True의 공개 CurseForge 메타데이터에는 SHA1이 없어 공식 CDN 실물에서 계산한 해시를 사용한다. 제삼자 JAR/ZIP은 저장소에 포함하지 않는다.

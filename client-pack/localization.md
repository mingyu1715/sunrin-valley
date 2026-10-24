# 원본 한국어와 초기 설정

공식 `Society-Sunlit-Valley-4.1.5A.zip`의 SHA256은 `6902439ba377c139b712cc42132d73498ff1f5ee77d795d141d255098391d7c9`이다. ZIP CRC 검사와 고정 소스 커밋 `f00b8473bbf16ac0d0d3f3afbc01be0519f9dd9b`의 project/file ID 367개 대조를 통과했다. `manifest.json`에는 원본 351개 모드, 리소스팩 15개, 셰이더 1개, 추가 모드 4개를 모두 잠갔다.

원본 `overrides/` 안에 한국어 파일 481개가 실제로 있다: `kubejs/` 213개, `patchouli_books/` 267개, `config/fancymenu/assets/changelog_ko_kr.markdown` 1개. 모든 실제 경로는 `manifest.json.localizations`에 기록한다. 이번 범위는 이 기존 파일을 재사용하며 별도 전체 번역팩은 만들지 않는다. 완역 여부는 산정하지 않았다. 추가 모드 네 개도 각각 `assets/<modid>/lang/ko_kr.json`을 내장한다.

원본 `configureddefaults/README.md`에 따르면 기본 파일은 대상이 없을 때만 게임 폴더로 복사된다. 설치 순서는 원본 ZIP의 `overrides/` 추출 → 잠긴 파일 다운로드 → `configureddefaults/options.txt`의 `lang:en_us`를 `lang:ko_kr`로 수정 → 실제 `options.txt`의 언어도 `ko_kr`로 설정이다. 기존 사용자 옵션을 초기화하지 않고 언어 항목만 변경한다.

원본 `configureddefaults/options.txt`의 리소스팩 순서는 다음과 같다. 한국어는 KubeJS/안내서 리소스에서 제공되어 별도 언어팩 항목을 추가할 필요가 없다.

```text
resourcePacks:["file/Lopy-Create-Pipez.zip","file/Icon Journey 1.1.zip","file/JourneyMap Extended Mob Icons v2.0.zip","file/updated_aquaculture-1.1.zip","file/MobCrates_1.20.1_v1.zip","file/JadeStardewValleyTheme.zip","file/Stardew_plaques v1.0.zip","file/CreateSophisticatedBackpacks.zip","file/Fairy Wings Elytra.zip"]
```

원본 옵션의 `CreateSophisticatedBackpacks.zip`은 원본 잠금 파일명 `CreateSophBackpacks.zip`과 다르므로 해당 항목은 설치된 파일명으로 맞춰야 한다. 원본 ZIP의 `resourcepacks/sunlit_overrides.zip`도 함께 추출한다.

# 추가 모드 확인 범위

| 모드 | 고정 버전 | 확인한 실제 파일 |
|---|---|---|
| Simple Voice Chat | 2.6.22 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |
| Emotecraft | 2.2.7-b.build.50 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |
| Music Disc Maker | 3.1.2 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |
| Beat Lamp | 1.2.2 | Forge 1.20.1 JAR, SHA1/크기/CRC, 한국어 |

Emotecraft JAR은 PlayerAnimator를 내장하지 않는다. 실제 `META-INF/mods.toml`에서 `playeranimator >=0.2.0`을 요구하며, 원본 팩의 `player-animation-lib-forge-1.0.2-rc1+1.20.jar`(CurseForge project 658587/file 4587214)가 충족한다.

[Beat Lamp 공식 설명](https://modrinth.com/mod/beat-lamp)은 Music Disc Maker의 온라인 디스크 연동을 명시한다. 실제 Beat Lamp JAR에는 `MusicDiscMakerAudioBridge`, `MusicDiscMakerDiscMixin`, `MusicDiscMakerStreamMixin`이 있고, 대상 `DiscSoundInstance`/`LavaPlayerAudioStream` 클래스도 선택한 Music Disc Maker JAR에 존재한다. 이는 배포물의 정적 연동 확인이며, 게임 안의 소리·램프 반응과 Windows/macOS 오디오 장치 동작은 별도 실행 검증이 필요하다. [Music Disc Maker 공식 설명](https://modrinth.com/mod/music-disc-maker)에 따라 서버와 클라이언트 버전을 맞춰야 한다.

# 재현

```sh
python3 build-scripts/resolve-pack.py --check
python3 -m unittest discover -s client-pack -p 'test_*.py'
python3 build-scripts/resolve-pack.py --download-base --verify-archive
```

기본 생성과 `--check`는 체크인된 fixture만 사용하여 네트워크/캐시 없이 동작한다. `--download-base`는 없을 때 원본 ZIP만 내려받고 검증하며, `--verify-archive`는 이미 받은 ZIP의 SHA256/CRC/원본 manifest/한국어 481파일 해시를 검증한다. 추가 모드 JAR 네 개가 `client-pack/cache/`에 있으면 `--verify-addons`로 실물 검사를 반복한다. 생성기는 원본 모드 전체를 내려받지 않으며, 배포·설치 단계가 `manifest.json`의 URL/해시를 사용한다. 체크인된 공식 fixture의 SHA256은 `sources.json`의 `sourceHash`로 검증한다.

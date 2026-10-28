# Sunrin-Custom 최소 리소스팩

Minecraft **1.20.1**용 `pack_format: 15` 리소스팩입니다. 기존 아이템 6종의 픽셀 텍스처와 마을 이동권을 포함한 모델 7개, 한국어 이름·툴팁, 팩 아이콘을 포함합니다. 마을 이동권은 바닐라 `minecraft:item/map` 텍스처를 참조합니다.

```sh
python3 build-scripts/build-resources.py
python3 -m unittest discover -s resourcepacks -p 'test_*.py' -v
node --test kubejs-custom/test_items.cjs
```

소스는 `resourcepacks/Sunrin-Custom/`, 배포 결과는 `resourcepacks/dist/Sunrin-Custom.zip`입니다. ZIP 루트에 `pack.mcmeta`, `pack.png`, `assets/`가 바로 위치합니다. 파일 순서·ZIP 시간·권한을 고정해 같은 소스에서 같은 ZIP이 나옵니다. 다른 출력 경로는 `--output /path/to/Sunrin-Custom.zip`으로 지정할 수 있습니다.

런처는 빌드한 ZIP을 인스턴스의 `resourcepacks/Sunrin-Custom.zip`으로 복사하고 팩을 활성화합니다. 아이템 등록 스크립트 `kubejs-custom/startup_scripts/sunrin_items.js`는 클라이언트와 서버의 `kubejs/startup_scripts/sunrin_items.js`로 배치합니다. 등록 변경은 게임·서버를 재시작해야 반영됩니다. 원본 모드팩의 다른 KubeJS 파일은 유지합니다.

| 리소스 | 등록 ID | 번역 키 |
|---|---|---|
| 건피권 | `kubejs:geonpi_ticket` | `item.kubejs.geonpi_ticket` |
| 칭호권 | `kubejs:rename_ticket` | `item.kubejs.rename_ticket` |
| 선린 급식 | `kubejs:sunrin_meal` | `item.kubejs.sunrin_meal` |
| 랜덤박스 | `kubejs:random_box` | `item.kubejs.random_box` |
| 가구랜덤박스 | `kubejs:furniture_random_box` | `item.kubejs.furniture_random_box` |
| 닉네임 색상 변경권 | `kubejs:name_color_ticket` | `item.kubejs.name_color_ticket` |
| 마을 이동권 | `kubejs:town_warp_ticket` | `item.kubejs.town_warp_ticket` |

모델은 `assets/kubejs/models/item/`, 직접 제작한 텍스처는 `assets/kubejs/textures/item/`, 한국어는 `assets/kubejs/lang/ko_kr.json`에 있습니다. 마을 이동권 외에는 모델·텍스처 파일명이 등록 ID의 경로와 같고 등록 스크립트도 같은 텍스처를 참조합니다. 이 리소스팩 자체는 아이템을 등록하지 않으며, 바닐라 아이템 모델을 덮어쓰지 않습니다.

`선린 급식`은 기존 `hunger(8)`와 `saturation(1.0)`, **학교에서 먹던 그 맛.** 문구를 유지합니다. 이용권·상자 효과는 KubeJS 서버 스크립트와 기존 Sunrin Core에서 처리합니다. 마을 이동권의 우클릭은 `sunrin_town_warp.js`에서 처리하며 안전한 공용 스폰으로 이동한 뒤 1개 소모합니다.

구현 근거는 [KubeJS 공식 아이템 등록 문서](https://kubejs.com/wiki/tutorials/item-registry/)와 Minecraft 1.20.1용 `2001` 브랜치의 [ItemBuilder](https://github.com/KubeJS-Mods/KubeJS/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/item/ItemBuilder.java), [FoodBuilder](https://github.com/KubeJS-Mods/KubeJS/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/item/FoodBuilder.java), [TextWrapper](https://github.com/KubeJS-Mods/KubeJS/blob/2001/common/src/main/java/dev/latvian/mods/kubejs/bindings/TextWrapper.java) 원본입니다. Node 테스트는 실제 startup 스크립트를 실행해 등록 결과·음식 값·번역 툴팁·리소스 경로를 검사합니다. Forge 내 실제 섭취·표시 확인은 실행 검수 항목으로 남습니다.

별도 전체 한국어 번역팩은 제작하지 않습니다. 기존 아이템의 등록 ID와 텍스처는 유지합니다.

모든 PNG는 이 프로젝트를 위해 새로 그린 픽셀 도형이며 외부 게임의 텍스처를 사용하지 않았습니다. 크림·흙갈색·잎초록을 기본색으로 사용하고, 두 이용권은 형태와 문양으로도 구별합니다. 제작: Codex, 2026-10-25. 이 프로젝트의 배포·수정용으로 제작했으며, 별도 외부 에셋 라이선스는 없습니다.

# 가구랜덤박스 후보 목록

2026-10-26 · Society: Sunlit Valley 4.1.5A · Minecraft 1.20.1 / Forge 47.4.0

> 2026-10-27 구현: 이 문서는 조사 후보 원본입니다. 실제 기본 보상은 [검증된 2,026개 목록](../kubejs-custom/data/sunrin/defaults/furniture-box.json)이며 [현재 구현·검증 현황](custom-systems-status.md)을 참고하세요.

설치된 모드 JAR와 원본팩 스크립트에서 **가구·장식 후보 2,338개 ID**를 추출했습니다. 색상·목재 변형은 각각 별도 ID입니다. 추가 경계 검토 항목은 534개입니다.

**조사 초안이며 운영 보상 설정이 아닙니다.** 설치·원격 manifest·서버·월드·플레이어 데이터는 변경하지 않았습니다. 모든 후보의 실제 외형·런타임 등록·배치·지급을 검증한 상태는 아닙니다.

## 포함 기준

- 가구·장식 모드의 적격 아이템을 넓게 포함하고, 특징 있는 소파·중세/판타지 가구·대형 시계·개구리 조명과 의자·수집형 인형을 포함합니다.
- 양털이 제작 재료라는 이유로 제외하지 않습니다. 밋밋한 단색 방석 수준의 기본형은 외형 확인 후 제외하고 저가 상점 후보로 분리합니다.
- 앉기·수납·조명 등 정상 가구 기능과 원본팩의 제작법 제한은 제외 사유가 아닙니다.
- 재료·도구·일반 건축 블록·템플릿 모델·아이템으로 등록되지 않은 경로는 가구 보상에 넣지 않습니다. 문·벽지·창문과 기본 스툴 등은 경계 검토에 남겼습니다.
- 최종 검증된 목록에서 균등하게 1개를 즉시 지급합니다. 가구별 고정 확률·등급·20개 제한·계열별 이중 추첨을 두지 않습니다. 인벤토리가 가득 차면 넘친 아이템은 플레이어 위치에 떨어지게 합니다.

## 모드별 후보 수

| 모드 | 설치 버전 | 후보 ID 수 |
|---|---|---:|
| Let’s Do Bakery | 2.0.3 | 21 |
| Let’s Do Beachparty | 1.1.5 | 19 |
| Beautify | 2.0.2 | 52 |
| Let’s Do Brewery | 2.0.3 | 19 |
| Let’s Do Candlelight | 2.0.2 | 123 |
| Chimes | 2.1.1 | 6 |
| Cluttered | 3.0.3 | 444 |
| Cozy Cafe | 1.10 | 4 |
| Create | 6.0.8 | 1 |
| Decorative Blocks | 4.1.3 | 7 |
| Display Delight Lite | 0.0.1-lite | 2 |
| Etcetera | 1.1.3 | 12 |
| Fantasy’s Furniture | 9.0.0 | 287 |
| Let’s Do Farm & Charm | 1.0.4 | 21 |
| Farmer’s Delight | 1.3.2 | 18 |
| Let’s Do Furniture | 1.0.4 | 126 |
| Let’s Do HerbalBrews | 1.0.12 | 7 |
| Kata 인형 (원본팩 등록) | 4.1.5A KubeJS | 15 |
| Let’s Do Meadow | 1.3.23 | 50 |
| Let’s Do NetherVinery | 1.2.19 | 16 |
| Night Lights | 1.1 | 82 |
| Perfect Plushies | 1.13.3 | 47 |
| Quark | 4.0-462 | 31 |
| MrCrayfish’s Furniture: Refurbished | 1.0.20 | 381 |
| Snowy Spirit | 3.0.10 | 36 |
| Society KubeJS 장식 | 4.1.5A | 2 |
| Straw Statues | 8.0.3 | 1 |
| Supplementaries | 3.1.43 | 139 |
| Tanuki Decor | 20.1.1.0 | 211 |
| Twigs | 3.1.0 | 15 |
| Let’s Do Vinery | 1.4.41 | 57 |
| Whimsy Deco | 1.2 | 86 |
| 합계 | | **2,338** |

## 특징 있는 후보 예시

아래 이름은 구분을 돕기 위한 설명용 한국어입니다. 실제 ID를 대조한 대표 예시이며 전체 후보는 다음 절에 있습니다.

| 분류 | 가구 | 실제 후보 ID |
|---|---|---|
| 큰 시계·앤티크 | 큰 괘종시계 | `tanukidecor:grandfather_clock` |
| 큰 시계·앤티크 | 대형 시계탑 문자판 | `tanukidecor:large_clock_tower_dial` |
| 큰 시계·앤티크 | 로코코 시계 | `tanukidecor:rococo_clock` |
| 큰 시계·앤티크 | 벚나무 괘종시계 | `furniture:cherry_grandfather_clock` |
| 소파 | 스위츠 소파 | `tanukidecor:sweets_sofa` |
| 소파 | 고저스 소파 | `tanukidecor:gorgeous_sofa` |
| 소파 | 모로코풍 소파 | `whimsy_deco:moroccan_sofa` |
| 소파 | 퀼트 무늬 다크우드 소파 | `cluttered:darkwood_sofa_quilted` |
| 소파 | 서던 플레어 다크우드 소파 | `cluttered:darkwood_sofa_southern_flair` |
| 소파 | 왕실 소파 | `fantasyfurniture:royal/sofa` |
| 소파 | 노르딕 소파 | `fantasyfurniture:nordic/sofa` |
| 개성 있는 의자 | 개구리 의자 | `whimsy_deco:froggy_chair` |
| 개성 있는 의자 | 분홍 개구리 의자 | `whimsy_deco:pink_froggy_chair` |
| 개성 있는 의자 | 딸기 안락의자 | `cluttered:armchair_strawberry` |
| 개성 있는 의자 | 검은 고양이 안락의자 | `cluttered:armchair_black_cat` |
| 중세·판타지 | 왕실 샹들리에 | `fantasyfurniture:royal/chandelier` |
| 중세·판타지 | 공중에 뜬 마도서 | `fantasyfurniture:decorations/floating_tomes` |
| 중세·판타지 | 노르딕 소울 젬 조명 | `fantasyfurniture:decorations/nordic_soul_gems_light` |
| 중세·판타지 | 왕실 왕관 장식 | `fantasyfurniture:decorations/royal_cushioned_crown` |
| 중세·판타지 | 왕실 대형 벽거울 | `fantasyfurniture:decorations/royal_wall_mirror_large` |
| 특이한 조명 | 개구리 무드등 | `nightlights:frog_green` |
| 특이한 조명 | 분홍 문어 무드등 | `nightlights:octopus_pink` |
| 특이한 조명 | 버섯 무드등 | `nightlights:mushroom_red` |
| 특이한 조명 | 벌 램프 | `cluttered:bee_lamp` |
| 특이한 조명 | 스테인드글라스 램프 | `cluttered:stained_glass_lamp` |
| 특이한 조명 | 분홍 로켓 램프 | `tanukidecor:pink_rocket_lamp` |
| 전시 소품 | 달 관측소 천구의 | `cluttered:lunar_observatory_globe` |
| 전시 소품 | 스팀펑크 지구본 | `cluttered:steampunk_globe` |
| 전시 소품 | 발광버섯 테라리움 | `cluttered:glowshroom_terrarium_pink` |
| 전시 소품 | 기차 모형 세트 | `tanukidecor:train_set` |
| 전시 소품 | 플라스마 볼 | `tanukidecor:plasma_ball` |
| 전시 소품 | 유리병 속 배 | `tanukidecor:ship_in_a_bottle` |
| 상점·카페 | 축음기 | `furniture:gramophone` |
| 상점·카페 | 구리 타자기 | `candlelight:typewriter_copper` |
| 상점·카페 | 케이크 진열장 | `bakery:cake_display` |
| 상점·카페 | 빵 상자 | `bakery:breadbox` |
| 야외·휴양 | 비치 파라솔 | `beachparty:beach_parasol` |
| 야외·휴양 | 라디오 | `beachparty:radio` |
| 인형 | 카피바라 인형 | `perfectplushies:adv_capybara_plushie` |
| 인형 | 개구리 인형 | `perfectplushies:adv_frog_plushie` |
| 인형 | 레서판다 인형 | `perfectplushies:adv_red_panda_plushie` |
| 작은 장식 | 유리 풍경 | `chimes:glass_bells` |
| 작은 장식 | 모래시계 | `supplementaries:hourglass` |

인형은 표의 대체 ID와 원본 NBT 초기화 경로를 함께 검증한 뒤 지급합니다.

## 전체 후보 ID

한국어 이름은 원본팩에 기존 번역이 있는 경우에만 사용했습니다. `초기화 확인`은 원본팩의 대체 ID/NBT 규칙 재사용이 필요한 항목이며, ID 문자열만 지급하면 정상 동작한다고 가정하지 않습니다.

<details><summary>Let’s Do Bakery — 21개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 케이크 스테이션 | `bakery:baker_station` |  |
| 정복자 배너: §cBakery | `bakery:bakery_standard` |  |
| 빵 바구니 | `bakery:bread_crate` |  |
| 빵 상자 | `bakery:breadbox` |  |
| 벽돌 카운터 | `bakery:brick_counter` |  |
| 수납장 | `bakery:cabinet` |  |
| 케이크 진열대 | `bakery:cake_display` |  |
| 케이크 스탠드 | `bakery:cake_stand` |  |
| 초콜릿 상자 | `bakery:chocolate_box` |  |
| 컵케이크 진열대 | `bakery:cupcake_display` |  |
| 서랍 | `bakery:drawer` |  |
| 철제 벤치 | `bakery:iron_bench` |  |
| 철제 의자 | `bakery:iron_chair` |  |
| 철제 테이블 | `bakery:iron_table` |  |
| 병 | `bakery:jar` |  |
| 벽돌 싱크대 | `bakery:kitchen_sink` |  |
| 작은 요리 냄비 | `bakery:small_cooking_pot` |  |
| 입간판 | `bakery:street_sign` |  |
| 트레이 | `bakery:tray` |  |
| 벽 수납장 | `bakery:wall_cabinet` |  |
| 벽 진열대 | `bakery:wall_display` |  |

</details>

<details><summary>Let’s Do Beachparty — 19개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 해변 의자 | `beachparty:beach_chair` | 원본 상자 사용 ID |
| 해변 파라솔 | `beachparty:beach_parasol` |  |
| 비치 타월 | `beachparty:beach_towel` |  |
| 티키 수납장 | `beachparty:cabinet` |  |
| 의자 | `beachparty:chair` | 원본 상자 사용 ID |
| 선베드 | `beachparty:deck_chair` | 원본 상자 사용 ID |
| 빈 모래 양동이 | `beachparty:empty_sand_bucket` | 원본 배치/NBT 규칙 확인 |
| 해먹 | `beachparty:hammock` | 원본 상자 사용 ID |
| 라운지 의자 | `beachparty:lounge_chair` | 원본 상자 사용 ID |
| 병 속의 메시지 | `beachparty:message_in_a_bottle` | 원본 배치/NBT 규칙 확인 |
| 미니 냉장고 | `beachparty:mini_fridge` |  |
| 야자나무 긴 횃불 | `beachparty:palm_tall_torch` |  |
| 야자나무 횃불 | `beachparty:palm_torch_item` | 원본 배치/NBT 규칙 확인 |
| 해변 라디오 | `beachparty:radio` |  |
| 모래 양동이 | `beachparty:sand_bucket` | 원본 배치/NBT 규칙 확인 |
| 조개 | `beachparty:seashell` |  |
| 테이블 | `beachparty:table` | 원본 상자 사용 ID |
| 티키 바 | `beachparty:tiki_bar` |  |
| 티키 의자 | `beachparty:tiki_chair` | 원본 상자 사용 ID |

</details>

<details><summary>Beautify — 52개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 아카시아나무 블라인드 | `beautify:acacia_blinds` |  |
| 아카시아 액자 | `beautify:acacia_picture_frame` | 원본 상자 사용 ID |
| 아카시아나무 격자 | `beautify:acacia_trellis` | 외형/범위 검토 |
| 자작나무 블라인드 | `beautify:birch_blinds` |  |
| 자작나무 액자 | `beautify:birch_picture_frame` | 원본 상자 사용 ID |
| 자작나무 격자 | `beautify:birch_trellis` | 외형/범위 검토 |
| 책 더미 | `beautify:bookstack` | 원본 상자 사용 ID |
| 식물학자 작업대 | `beautify:botanist_workbench` | 외형/범위 검토 |
| 진홍빛 블라인드 | `beautify:crimson_blinds` |  |
| 진홍빛 액자 | `beautify:crimson_picture_frame` | 원본 상자 사용 ID |
| 진홍빛 격자 | `beautify:crimson_trellis` | 외형/범위 검토 |
| 짙은 참나무 블라인드 | `beautify:dark_oak_blinds` |  |
| 짙은 참나무 액자 | `beautify:dark_oak_picture_frame` | 원본 상자 사용 ID |
| 짙은 참나무 격자 | `beautify:dark_oak_trellis` | 외형/범위 검토 |
| 매달린 화분 | `beautify:hanging_pot` |  |
| 철 블라인드 | `beautify:iron_blinds` |  |
| 정글 블라인드 | `beautify:jungle_blinds` |  |
| 정글 액자 | `beautify:jungle_picture_frame` | 원본 상자 사용 ID |
| 정글 격자 | `beautify:jungle_trellis` | 외형/범위 검토 |
| 대나무 램프 | `beautify:lamp_bamboo` | 원본 상자 사용 ID |
| 촛대 | `beautify:lamp_candelabra` |  |
| 검은색 촛대 | `beautify:lamp_candelabra_black` |  |
| 파란색 촛대 | `beautify:lamp_candelabra_blue` |  |
| 갈색 촛대 | `beautify:lamp_candelabra_brown` |  |
| 청록색 촛대 | `beautify:lamp_candelabra_cyan` |  |
| 회색 촛대 | `beautify:lamp_candelabra_gray` |  |
| 초록색 촛대 | `beautify:lamp_candelabra_green` |  |
| 하늘색 촛대 | `beautify:lamp_candelabra_light_blue` |  |
| 회백색 촛대 | `beautify:lamp_candelabra_light_gray` |  |
| 연두색 촛대 | `beautify:lamp_candelabra_lime` |  |
| 자홍색 촛대 | `beautify:lamp_candelabra_magenta` |  |
| 주황색 촛대 | `beautify:lamp_candelabra_orange` |  |
| 분홍색 촛대 | `beautify:lamp_candelabra_pink` |  |
| 보라색 촛대 | `beautify:lamp_candelabra_purple` |  |
| 빨간색 촛대 | `beautify:lamp_candelabra_red` |  |
| 하얀색 촛대 | `beautify:lamp_candelabra_white` |  |
| 노란색 촛대 | `beautify:lamp_candelabra_yellow` |  |
| 발광석 정수 램프 | `beautify:lamp_jar` | 원본 상자 사용 ID |
| 전구 | `beautify:lamp_light_bulb` | 원본 상자 사용 ID |
| 맹그로브나무 블라인드 | `beautify:mangrove_blinds` |  |
| 맹그로브나무 액자 | `beautify:mangrove_picture_frame` | 원본 상자 사용 ID |
| 맹그로브나무 격자 | `beautify:mangrove_trellis` | 외형/범위 검토 |
| 참나무 블라인드 | `beautify:oak_blinds` |  |
| 참나무 액자 | `beautify:oak_picture_frame` | 원본 상자 사용 ID |
| 참나무 격자 | `beautify:oak_trellis` | 외형/범위 검토 |
| 석영 액자 | `beautify:quartz_picture_frame` | 원본 상자 사용 ID |
| 가문비나무 블라인드 | `beautify:spruce_blinds` |  |
| 가문비나무 액자 | `beautify:spruce_picture_frame` | 원본 상자 사용 ID |
| 가문비나무 격자 | `beautify:spruce_trellis` | 외형/범위 검토 |
| 뒤틀린 블라인드 | `beautify:warped_blinds` |  |
| 뒤틀린 액자 | `beautify:warped_picture_frame` | 원본 상자 사용 ID |
| 뒤틀린 격자 | `beautify:warped_trellis` | 외형/범위 검토 |

</details>

<details><summary>Let’s Do Brewery — 19개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 바 카운터 | `brewery:bar_counter` |  |
| 큰 배럴 | `brewery:barrel_main` | 원본 상자 사용 ID |
| 맥주잔 | `brewery:beer_mug` |  |
| 맥주 스탠다드 | `brewery:beer_standard` |  |
| 벤치 | `brewery:bench` |  |
| 수납장 | `brewery:cabinet` |  |
| 구리 양조 스테이션 | `brewery:copper_brewingstation` |  |
| 서랍 | `brewery:drawer` |  |
| 건조된 보리 | `brewery:dried_barley` |  |
| 건조된 옥수수 | `brewery:dried_corn` |  |
| 건조된 귀리 | `brewery:dried_oat` |  |
| 건조된 밀 | `brewery:dried_wheat` |  |
| 강화된 양조 스테이션 | `brewery:netherite_brewingstation` |  |
| Patterned Carpet | `brewery:patterned_carpet` | 같은 설치 가구의 아이템 별칭 확인 |
| 무늬 양탄자 | `brewery:patterned_carpet_block` |  |
| 사이드보드 | `brewery:sideboard` |  |
| 테이블 | `brewery:table` |  |
| 벽 수납장 | `brewery:wall_cabinet` |  |
| 나무 양조 스테이션 | `brewery:wooden_brewingstation` |  |

</details>

<details><summary>Let’s Do Candlelight — 123개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 아카시아 대형 테이블 | `candlelight:acacia_big_table` |  |
| 아카시아 수납장 | `candlelight:acacia_cabinet` |  |
| 아카시아 의자 | `candlelight:acacia_chair` |  |
| 소박한 아카시아 서랍 | `candlelight:acacia_drawer` |  |
| 아카시아 선반 | `candlelight:acacia_shelf` |  |
| 아카시아 테이블 | `candlelight:acacia_table` |  |
| 대나무 대형 테이블 | `candlelight:bamboo_big_table` |  |
| 대나무 수납장 | `candlelight:bamboo_cabinet` |  |
| 대나무 의자 | `candlelight:bamboo_chair` |  |
| 대나무 카운터 | `candlelight:bamboo_counter` |  |
| 소박한 대나무 서랍 | `candlelight:bamboo_drawer` |  |
| 대나무 싱크대 | `candlelight:bamboo_kitchen_sink` |  |
| 대나무 선반 | `candlelight:bamboo_shelf` |  |
| 대나무 스토브 | `candlelight:bamboo_stove` |  |
| 대나무 테이블 | `candlelight:bamboo_table` |  |
| 현무암 카운터 | `candlelight:basalt_counter` |  |
| 현무암 싱크대 | `candlelight:basalt_kitchen_sink` |  |
| 현무암 스토브 | `candlelight:basalt_stove` |  |
| 자작나무 대형 테이블 | `candlelight:birch_big_table` |  |
| 자작나무 수납장 | `candlelight:birch_cabinet` |  |
| 자작나무 의자 | `candlelight:birch_chair` |  |
| 소박한 자작나무 서랍 | `candlelight:birch_drawer` |  |
| 자작나무 선반 | `candlelight:birch_shelf` |  |
| 자작나무 테이블 | `candlelight:birch_table` |  |
| Bowl | `candlelight:bowl` | 원본 배치/NBT 규칙 확인 |
| 수납장 | `candlelight:cabinet` |  |
| 정복자 배너: §6Candlelight | `candlelight:candlelight_standard` |  |
| 의자 | `candlelight:chair` | 원본 상자 사용 ID |
| 벚나무 대형 테이블 | `candlelight:cherry_big_table` |  |
| 벚나무 수납장 | `candlelight:cherry_cabinet` |  |
| 벚나무 의자 | `candlelight:cherry_chair` |  |
| 소박한 벚나무 서랍 | `candlelight:cherry_drawer` |  |
| 벚나무 선반 | `candlelight:cherry_shelf` |  |
| 벚나무 테이블 | `candlelight:cherry_table` |  |
| 로맨틱한 초콜릿 상자 | `candlelight:chocolate_box` |  |
| 조약돌 카운터 | `candlelight:cobblestone_counter` |  |
| 조약돌 싱크대 | `candlelight:cobblestone_kitchen_sink` |  |
| 조약돌 스토브 | `candlelight:cobblestone_stove` |  |
| 요리 팬 | `candlelight:cooking_pan` |  |
| 달인의 요리 냄비 | `candlelight:cooking_pot` |  |
| 진홍빛 대형 테이블 | `candlelight:crimson_big_table` |  |
| 진홍빛 수납장 | `candlelight:crimson_cabinet` |  |
| 진홍빛 의자 | `candlelight:crimson_chair` |  |
| 소박한 진홍빛 서랍 | `candlelight:crimson_drawer` |  |
| 진홍빛 선반 | `candlelight:crimson_shelf` |  |
| 진홍빛 테이블 | `candlelight:crimson_table` |  |
| 짙은 참나무 대형 테이블 | `candlelight:dark_oak_big_table` |  |
| 짙은 참나무 수납장 | `candlelight:dark_oak_cabinet` |  |
| 짙은 참나무 의자 | `candlelight:dark_oak_chair` |  |
| 소박한 짙은 참나무 서랍 | `candlelight:dark_oak_drawer` |  |
| 짙은 참나무 선반 | `candlelight:dark_oak_shelf` |  |
| 짙은 참나무 테이블 | `candlelight:dark_oak_table` |  |
| 심층암 카운터 | `candlelight:deepslate_counter` |  |
| 심층암 싱크대 | `candlelight:deepslate_kitchen_sink` |  |
| 심층암 스토브 | `candlelight:deepslate_stove` |  |
| 디너 벨 | `candlelight:dinner_bell` | 원본 상자 사용 ID |
| 소박한 서랍 | `candlelight:drawer` |  |
| 엔드 석재 카운터 | `candlelight:end_counter` |  |
| 엔드 석재 싱크대 | `candlelight:end_kitchen_sink` |  |
| 엔드 석재 스토브 | `candlelight:end_stove` |  |
| 유리잔 | `candlelight:glass` |  |
| 화강암 카운터 | `candlelight:granite_counter` |  |
| 화강암 싱크대 | `candlelight:granite_kitchen_sink` |  |
| 화강암 스토브 | `candlelight:granite_stove` |  |
| 하트 | `candlelight:hearth` | 원본 상자 사용 ID |
| 보석 상자 | `candlelight:jewelry_box` | 원본 상자 사용 ID |
| 정글나무 대형 테이블 | `candlelight:jungle_big_table` |  |
| 정글나무 수납장 | `candlelight:jungle_cabinet` |  |
| 정글나무 의자 | `candlelight:jungle_chair` |  |
| 소박한 정글 서랍 | `candlelight:jungle_drawer` |  |
| 정글나무 선반 | `candlelight:jungle_shelf` |  |
| 정글나무 테이블 | `candlelight:jungle_table` |  |
| 갓등 | `candlelight:lamp` | 원본 상자 사용 ID |
| 맹그로브나무 대형 테이블 | `candlelight:mangrove_big_table` |  |
| 맹그로브나무 수납장 | `candlelight:mangrove_cabinet` |  |
| 맹그로브나무 의자 | `candlelight:mangrove_chair` |  |
| 소박한 맹그로브 서랍 | `candlelight:mangrove_drawer` |  |
| 맹그로브나무 선반 | `candlelight:mangrove_shelf` |  |
| 맹그로브나무 테이블 | `candlelight:mangrove_table` |  |
| 진흙 벽돌 카운터 | `candlelight:mud_counter` |  |
| 진흙 벽돌 싱크대 | `candlelight:mud_kitchen_sink` |  |
| 진흙 벽돌 스토브 | `candlelight:mud_stove` |  |
| 노트 종이 | `candlelight:note_paper` |  |
| 참나무 대형 테이블 | `candlelight:oak_big_table` |  |
| 참나무 수납장 | `candlelight:oak_cabinet` |  |
| 참나무 의자 | `candlelight:oak_chair` |  |
| 소박한 참나무 서랍 | `candlelight:oak_drawer` |  |
| 참나무 선반 | `candlelight:oak_shelf` |  |
| 참나무 테이블 | `candlelight:oak_table` |  |
| 작은 그림 | `candlelight:painting` | 원본 상자 사용 ID |
| 접시 | `candlelight:plate` | 원본 배치/NBT 규칙 확인 |
| 석영 카운터 | `candlelight:quartz_counter` |  |
| 석영 싱크대 | `candlelight:quartz_kitchen_sink` |  |
| 석영 스토브 | `candlelight:quartz_stove` |  |
| 석영 벽돌 카운터 | `candlelight:red_nether_bricks_counter` |  |
| 석영 벽돌 싱크대 | `candlelight:red_nether_bricks_kitchen_sink` |  |
| 석영 벽돌 스토브 | `candlelight:red_nether_bricks_stove` |  |
| 사암 카운터 | `candlelight:sandstone_counter` |  |
| 사암 싱크대 | `candlelight:sandstone_kitchen_sink` |  |
| 사암 스토브 | `candlelight:sandstone_stove` |  |
| 사이드 테이블 | `candlelight:side_table` |  |
| 사이드보드 | `candlelight:sideboard` |  |
| 소파 | `candlelight:sofa` | 원본 상자 사용 ID |
| 가문비나무 대형 테이블 | `candlelight:spruce_big_table` |  |
| 가문비나무 수납장 | `candlelight:spruce_cabinet` |  |
| 가문비나무 의자 | `candlelight:spruce_chair` |  |
| 소박한 가문비나무 서랍 | `candlelight:spruce_drawer` |  |
| 가문비나무 선반 | `candlelight:spruce_shelf` |  |
| 가문비나무 테이블 | `candlelight:spruce_table` |  |
| 석재 벽돌 카운터 | `candlelight:stone_bricks_counter` |  |
| 석재 벽돌 싱크대 | `candlelight:stone_bricks_kitchen_sink` |  |
| 석재 벽돌 스토브 | `candlelight:stone_bricks_stove` |  |
| 테이블 | `candlelight:table` | 원본 상자 사용 ID |
| 테이블 사인 | `candlelight:table_sign` |  |
| 구리 타자기 | `candlelight:typewriter_copper` | 원본 상자 사용 ID |
| 철 타자기 | `candlelight:typewriter_iron` | 원본 상자 사용 ID |
| 뒤틀린 대형 테이블 | `candlelight:warped_big_table` |  |
| 뒤틀린 수납장 | `candlelight:warped_cabinet` |  |
| 뒤틀린 의자 | `candlelight:warped_chair` |  |
| 소박한 뒤틀린 서랍 | `candlelight:warped_drawer` |  |
| 뒤틀린 선반 | `candlelight:warped_shelf` |  |
| 뒤틀린 테이블 | `candlelight:warped_table` |  |
| 와인 글라스 | `candlelight:wine_glass` |  |

</details>

<details><summary>Chimes — 6개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 자수정 풍경 | `chimes:amethyst_chimes` | 원본 상자 사용 ID |
| 대나무 풍경 | `chimes:bamboo_chimes` | 원본 상자 사용 ID |
| 조각된 대나무 풍경 | `chimes:carved_bamboo_chimes` | 원본 상자 사용 ID |
| 구리 풍경 | `chimes:copper_chimes` | 원본 상자 사용 ID |
| 유리 풍경 | `chimes:glass_bells` | 원본 상자 사용 ID |
| 철 풍경 | `chimes:iron_chimes` | 원본 상자 사용 ID |

</details>

<details><summary>Cluttered — 444개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 파스텔 토끼 인형 | `cluttered:adv_pastel_bunny_plushie` | 초기화 확인 |
| 파란색 Sandseal 인형 | `cluttered:adv_sand_seal_plush_blue` | 초기화 확인 |
| 초록색 Sandseal 인형 | `cluttered:adv_sand_seal_plush_green` | 초기화 확인 |
| 빨간색 Sandseal 인형 | `cluttered:adv_sand_seal_plush_red` | 초기화 확인 |
| 테디 베어 | `cluttered:adv_teddy_bear` | 초기화 확인 |
| 주방 저울 | `cluttered:analog_kitchen_scale` | 원본 상자 사용 ID |
| 고대 코덱스 | `cluttered:ancient_codex` | 원본 상자 사용 ID |
| 무성애자 깃발 | `cluttered:animated_flag_asexual` |  |
| 양성애자 깃발 | `cluttered:animated_flag_bisexual` |  |
| 레즈비언 깃발 | `cluttered:animated_flag_lesbian` |  |
| 논바이너리 깃발 | `cluttered:animated_flag_nonbinary` |  |
| 범성애자 깃발 | `cluttered:animated_flag_pansexual` |  |
| 무지개 깃발 | `cluttered:animated_flag_rainbow` |  |
| 트랜스젠더 깃발 | `cluttered:animated_flag_transgender` |  |
| 골동품 독서대 | `cluttered:antique_book_stand` | 원본 상자 사용 ID |
| 골동품 도서관 책 | `cluttered:antique_library_books` | 원본 상자 사용 ID |
| 골동품 지도 | `cluttered:antique_map` | 원본 상자 사용 ID |
| 골동품 미니 테이블 | `cluttered:antique_mini_table` | 원본 상자 사용 ID |
| 골동품 스탠딩 램프 | `cluttered:antique_standing_lamp` | 원본 상자 사용 ID |
| 사과 의자 | `cluttered:apple_chair` | 원본 상자 사용 ID |
| 검은 고양이 안락의자 | `cluttered:armchair_black_cat` | 원본 상자 사용 ID |
| 꽃무늬 안락의자 | `cluttered:armchair_flower` | 원본 상자 사용 ID |
| 하트무늬 안락의자 | `cluttered:armchair_heart` | 원본 상자 사용 ID |
| 레몬무늬 안락의자 | `cluttered:armchair_lemon` | 원본 상자 사용 ID |
| 별무늬 안락의자 | `cluttered:armchair_starry` | 원본 상자 사용 ID |
| 딸기무늬 안락의자 | `cluttered:armchair_strawberry` | 원본 상자 사용 ID |
| 수박무늬 안락의자 | `cluttered:armchair_watermelon` | 원본 상자 사용 ID |
| 유리 병 모음 | `cluttered:assorted_glass_jars` | 원본 상자 사용 ID |
| 대나무 책장 | `cluttered:bamboo_bookshelf` | 원본 상자 사용 ID |
| 꽃 바구니 | `cluttered:basket_of_flowers` | 원본 상자 사용 ID |
| 농산물 바구니 | `cluttered:basket_of_produce` | 원본 상자 사용 ID |
| 벌 램프 | `cluttered:bee_lamp` | 원본 상자 사용 ID |
| 화난 벌 램프 | `cluttered:bee_lamp_angry` | 원본 상자 사용 ID |
| 베리 케이크 | `cluttered:berry_cake` | 원본 상자 사용 ID |
| 파란색 자전거 | `cluttered:bicycle_blue` | 원본 상자 사용 ID |
| 분홍색 자전거 | `cluttered:bicycle_pink` | 원본 상자 사용 ID |
| 보라색 자전거 | `cluttered:bicycle_purple` | 원본 상자 사용 ID |
| 파란색 꽃 장식 자전거 | `cluttered:bicycle_with_flowers_blue` | 원본 상자 사용 ID |
| 분홍색 꽃 장식 자전거 | `cluttered:bicycle_with_flowers_pink` | 원본 상자 사용 ID |
| 보라색 꽃 장식 자전거 | `cluttered:bicycle_with_flowers_purple` | 원본 상자 사용 ID |
| 노란색 꽃 장식 자전거 | `cluttered:bicycle_with_flowers_yellow` | 원본 상자 사용 ID |
| 노란색 자전거 | `cluttered:bicycle_yellow` | 원본 상자 사용 ID |
| 파란색 새집 | `cluttered:birdhouse_blue` | 원본 상자 사용 ID |
| 파스텔 새집 | `cluttered:birdhouse_pastel` | 원본 상자 사용 ID |
| 빨간색 새집 | `cluttered:birdhouse_red` | 원본 상자 사용 ID |
| 나무 새집 | `cluttered:birdhouse_unpainted` | 원본 상자 사용 ID |
| 검은 고양이 카운터 | `cluttered:black_cat_counter_drawers` | 원본 상자 사용 ID |
| 검은 고양이 왼쪽 카운터 | `cluttered:black_cat_counter_left_door` | 원본 상자 사용 ID |
| 검은 고양이 오른쪽 카운터 | `cluttered:black_cat_counter_right_door` | 원본 상자 사용 ID |
| 검은 고양이 싱크대 | `cluttered:black_cat_sink` | 원본 상자 사용 ID |
| 검은 고양이 테이블 | `cluttered:black_cat_table` | 원본 상자 사용 ID |
| 파란색 버섯 침대 | `cluttered:blue_mushroom_bed` | 원본 상자 사용 ID |
| 파란색 버섯 책장 | `cluttered:blue_mushroom_bookshelf` |  |
| 파란색 버섯 램프 | `cluttered:blue_mushroom_lamp` | 원본 상자 사용 ID |
| 파란색 버섯 테이블 | `cluttered:blue_mushroom_table` | 원본 상자 사용 ID |
| 파란색 버섯 TV | `cluttered:blue_mushroom_tv` | 원본 상자 사용 ID |
| 파란색 버섯 옷장 | `cluttered:blue_mushroom_wardrobe` | 원본 상자 사용 ID |
| 블루베리 머핀 | `cluttered:blueberry_muffin` | 원본 상자 사용 ID |
| 열린 책 | `cluttered:book_open` | 원본 상자 사용 ID |
| 페인트 상자 | `cluttered:box_of_paints` | 원본 상자 사용 ID |
| 황동 열쇠 | `cluttered:brass_key` | 원본 상자 사용 ID |
| 서류가방 | `cluttered:briefcase_blank` | 원본 상자 사용 ID |
| 로버 서류가방 | `cluttered:briefcase_rover` | 원본 상자 사용 ID |
| 게시판 | `cluttered:bulletin_board` | 원본 상자 사용 ID |
| 어수선한 게시판 | `cluttered:bulletin_board_cluttered` | 원본 상자 사용 ID |
| 토끼 북엔드 | `cluttered:bunny_book_ends` | 원본 상자 사용 ID |
| 버튼 스툴 | `cluttered:button_stool` | 원본 상자 사용 ID |
| 케이지 전구 | `cluttered:caged_bulb` | 원본 상자 사용 ID |
| 카드 인덱스 | `cluttered:card_index` | 원본 상자 사용 ID |
| 골판지 상자 | `cluttered:cardboard_box_open` | 원본 상자 사용 ID |
| 고양이 머그컵 | `cluttered:cat_mugs_cluttered` | 원본 상자 사용 ID |
| 검은 고양이 화분 | `cluttered:cat_plant_pot_black` | 원본 상자 사용 ID |
| 주황색 고양이 화분 | `cluttered:cat_plant_pot_orange` | 원본 상자 사용 ID |
| 가마솥 포스터 | `cluttered:cauldron_poster` | 원본 상자 사용 ID |
| 옥수 별 | `cluttered:chalcedony_sun_block` |  |
| 차이나 캐비닛 | `cluttered:china_cabinet` | 원본 상자 사용 ID |
| 뺑 오 쇼콜라 | `cluttered:chocolate_croissant` | 원본 상자 사용 ID |
| 시나몬 번 | `cluttered:cinnamon_bun` | 원본 상자 사용 ID |
| 커피 그라인더 | `cluttered:coffee_grinder` | 원본 상자 사용 ID |
| 콜로세움 랜턴 | `cluttered:colosseo_wall_lantern` | 원본 상자 사용 ID |
| 파란색 제과 테이블 | `cluttered:confectionery_table_blue` | 원본 상자 사용 ID |
| 분홍색 제과 테이블 | `cluttered:confectionery_table_pink` | 원본 상자 사용 ID |
| 코티지 안락의자 | `cluttered:cottage_armchair` | 원본 상자 사용 ID |
| 코티지 책장 | `cluttered:cottage_bookcase` | 원본 상자 사용 ID |
| 코티지 의자 | `cluttered:cottage_chair` | 원본 상자 사용 ID |
| 쿠션이 있는 코티지 의자 | `cluttered:cottage_chair_cushioned` | 원본 상자 사용 ID |
| 코티지 오토만 | `cluttered:cottage_ottoman` | 원본 상자 사용 ID |
| 코티지 사이드 테이블 | `cluttered:cottage_side_table` | 원본 상자 사용 ID |
| 코티지 스탠딩 램프 | `cluttered:cottage_standing_lamp` | 원본 상자 사용 ID |
| 야생 능금나무 책장 | `cluttered:crabapple_bookshelf` |  |
| 크루아상 | `cluttered:croissant` | 원본 상자 사용 ID |
| 큐피드 벤치 | `cluttered:cupid_bench` | 원본 상자 사용 ID |
| 다크우드 지오메트릭 침대 | `cluttered:darkwood_bed_geometric` | 원본 상자 사용 ID |
| 다크우드 퀼트 침대 | `cluttered:darkwood_bed_quilted` | 원본 상자 사용 ID |
| 다크우드 서던 플레어 침대 | `cluttered:darkwood_bed_southern_flair` | 원본 상자 사용 ID |
| 다크우드 캐비닛 | `cluttered:darkwood_cabinet` | 원본 상자 사용 ID |
| 다크우드 지오메트릭 안락의자 | `cluttered:darkwood_chair_geometric` | 원본 상자 사용 ID |
| 다크우드 퀼트 안락의자 | `cluttered:darkwood_chair_quilted` | 원본 상자 사용 ID |
| 다크우드 서던 플레어 안락의자 | `cluttered:darkwood_chair_southern_flair` | 원본 상자 사용 ID |
| 다크우드 시계 | `cluttered:darkwood_clock` | 원본 상자 사용 ID |
| 다크우드 지오메트릭 선반 | `cluttered:darkwood_decorative_shelves_geometric` | 원본 상자 사용 ID |
| 다크우드 퀼트 선반 | `cluttered:darkwood_decorative_shelves_quilted` | 원본 상자 사용 ID |
| 다크우드 서던 플레어 선반 | `cluttered:darkwood_decorative_shelves_southern_flair` | 원본 상자 사용 ID |
| 다크우드 협탁 | `cluttered:darkwood_endtable` | 원본 상자 사용 ID |
| 다크우드 지오메트릭 소파 | `cluttered:darkwood_sofa_geometric` | 원본 상자 사용 ID |
| 다크우드 퀼트 소파 | `cluttered:darkwood_sofa_quilted` | 원본 상자 사용 ID |
| 다크우드 서던 플레어 소파 | `cluttered:darkwood_sofa_southern_flair` | 원본 상자 사용 ID |
| 다크우드 스툴 | `cluttered:darkwood_stool` | 원본 상자 사용 ID |
| 다크우드 테이블 | `cluttered:darkwood_table` | 원본 상자 사용 ID |
| 심층 옥수 별 | `cluttered:deep_chalcedony_sun_block` |  |
| 갈색 책상 | `cluttered:desk_brown` | 원본 상자 사용 ID |
| 어수선한 갈색 책상 | `cluttered:desk_brown_cluttered` | 원본 상자 사용 ID |
| 초록색 책상 | `cluttered:desk_green` | 원본 상자 사용 ID |
| 어수선한 초록색 책상 | `cluttered:desk_green_cluttered` | 원본 상자 사용 ID |
| 도라도 캐비닛 | `cluttered:dorado_cabinet` | 원본 상자 사용 ID |
| 어수선한 도라도 캐비닛 | `cluttered:dorado_cabinet_cluttered` | 원본 상자 사용 ID |
| 허브 건조대 | `cluttered:drying_herbs` | 원본 상자 사용 ID |
| 자수정 협탁 | `cluttered:endtable_amethyst` | 원본 상자 사용 ID |
| 버블검 협탁 | `cluttered:endtable_bubblegum` | 원본 상자 사용 ID |
| 숯 협탁 | `cluttered:endtable_charcoal` | 원본 상자 사용 ID |
| 협탁 장식 | `cluttered:endtable_decor` | 원본 상자 사용 ID |
| 초원 협탁 | `cluttered:endtable_meadow` | 원본 상자 사용 ID |
| 페리윙클 협탁 | `cluttered:endtable_periwinkle` | 원본 상자 사용 ID |
| 선샤인 협탁 | `cluttered:endtable_sunshine` | 원본 상자 사용 ID |
| 나무 협탁 | `cluttered:endtable_wood` | 원본 상자 사용 ID |
| 봉투 더미 | `cluttered:envelope_stack` | 원본 상자 사용 ID |
| 눈 블록 | `cluttered:eye_block` |  |
| 천 더미 | `cluttered:fabric_bolts` | 원본 상자 사용 ID |
| 울타리 선반 | `cluttered:fence_shelf_blue` | 원본 상자 사용 ID |
| 서류함 | `cluttered:filing_box` | 원본 상자 사용 ID |
| 야생 능금나무 꽃 카펫 | `cluttered:flower_carpet_crabapple` |  |
| 포플러나무 꽃 카펫 | `cluttered:flower_carpet_poplar` |  |
| 신비한 버드나무 꽃 카펫 | `cluttered:flower_carpet_willow` |  |
| 꽃 책상 램프 | `cluttered:flower_desk_lamp` | 원본 상자 사용 ID |
| 파란색 꽃 선반 | `cluttered:flower_shelf_blue` | 원본 상자 사용 ID |
| 파란색 꽃 선반 양초 | `cluttered:flower_shelf_candle_blue` | 원본 상자 사용 ID |
| 초록색 꽃 선반 양초 | `cluttered:flower_shelf_candle_green` | 원본 상자 사용 ID |
| 파스텔 노란색 꽃 선반 양초 | `cluttered:flower_shelf_candle_pastel_yellow` | 원본 상자 사용 ID |
| 분홍색 꽃 선반 양초 | `cluttered:flower_shelf_candle_pink` | 원본 상자 사용 ID |
| 보라색 꽃 선반 양초 | `cluttered:flower_shelf_candle_purple` | 원본 상자 사용 ID |
| 노란색 꽃 선반 양초 | `cluttered:flower_shelf_candle_yellow` | 원본 상자 사용 ID |
| 초록색 꽃 선반 | `cluttered:flower_shelf_green` | 원본 상자 사용 ID |
| 파스텔 노란색 꽃 선반 | `cluttered:flower_shelf_pastel_yellow` | 원본 상자 사용 ID |
| 분홍색 꽃 선반 | `cluttered:flower_shelf_pink` | 원본 상자 사용 ID |
| 꽃 선반 식물 | `cluttered:flower_shelf_plant` | 원본 상자 사용 ID |
| 보라색 꽃 선반 | `cluttered:flower_shelf_purple` | 원본 상자 사용 ID |
| 노란색 꽃 선반 | `cluttered:flower_shelf_yellow` | 원본 상자 사용 ID |
| 꽃무늬 차 주전자 | `cluttered:flower_tea_kettle` | 원본 상자 사용 ID |
| 꽃 핀 야생 능금나무 책장 | `cluttered:flowering_crabapple_bookshelf` |  |
| 꽃 핀 포플러나무 책장 | `cluttered:flowering_poplar_bookshelf` |  |
| 형광단풍나무 책장 | `cluttered:fluorescent_maple_bookshelf` |  |
| 퓌시 안락의자 | `cluttered:fwish_armchair` | 원본 상자 사용 ID |
| 퓌시 책장 | `cluttered:fwish_bookcase` | 원본 상자 사용 ID |
| 퓌시 오토만 | `cluttered:fwish_ottoman` | 원본 상자 사용 ID |
| 검은 고양이 가랜드 | `cluttered:garland_black_cat` | 원본 상자 사용 ID |
| 꽃 가랜드 | `cluttered:garland_blossom` | 원본 상자 사용 ID |
| 토끼 가랜드 | `cluttered:garland_bunny` | 원본 상자 사용 ID |
| 폴라로이드 가랜드 A | `cluttered:garland_polaroid_a` | 원본 상자 사용 ID |
| 폴라로이드 가랜드 B | `cluttered:garland_polaroid_b` | 원본 상자 사용 ID |
| 별무늬 가랜드 | `cluttered:garland_starry` | 원본 상자 사용 ID |
| 해바라기 가랜드 | `cluttered:garland_sunflower` | 원본 상자 사용 ID |
| 잡화점 캐비닛 | `cluttered:general_store_cabinet` | 원본 상자 사용 ID |
| 유리 꽃병 | `cluttered:glass_vase_of_flowers` | 원본 상자 사용 ID |
| 파란색 발광 버섯 테라리움 | `cluttered:glowshroom_terrarium_blue` | 원본 상자 사용 ID |
| 초록색 발광 버섯 테라리움 | `cluttered:glowshroom_terrarium_green` | 원본 상자 사용 ID |
| 분홍색 발광 버섯 테라리움 | `cluttered:glowshroom_terrarium_pink` | 원본 상자 사용 ID |
| 보라색 발광 버섯 테라리움 | `cluttered:glowshroom_terrarium_purple` | 원본 상자 사용 ID |
| 노란색 발광 버섯 테라리움 | `cluttered:glowshroom_terrarium_yellow` | 원본 상자 사용 ID |
| 파란색 구슬 사탕 기계 | `cluttered:gumball_machine_blue` | 원본 상자 사용 ID |
| 보라색 구슬 사탕 기계 | `cluttered:gumball_machine_purple` | 원본 상자 사용 ID |
| 빨간색 구슬 사탕 기계 | `cluttered:gumball_machine_red` | 원본 상자 사용 ID |
| 햄 샌드위치 | `cluttered:ham_sandwich` | 원본 상자 사용 ID |
| 옷감 걸이 | `cluttered:hanging_cloth` | 원본 상자 사용 ID |
| 매달린 꽃 화분 | `cluttered:hanging_plant_pot_flowers` | 원본 상자 사용 ID |
| 매달린 잔디 화분 | `cluttered:hanging_plant_pot_grass` | 원본 상자 사용 ID |
| 매달린 식물 선반 | `cluttered:hanging_shelves_plants` | 원본 상자 사용 ID |
| 매달린 도자기 선반 | `cluttered:hanging_shelves_pottery` | 원본 상자 사용 ID |
| 하바나 캐비닛 | `cluttered:havana_cabinet` | 원본 상자 사용 ID |
| 어수선한 하바나 캐비닛 | `cluttered:havana_cabinet_cluttered` | 원본 상자 사용 ID |
| 하트 케이크 | `cluttered:heart_cake` | 원본 상자 사용 ID |
| 별 장식 | `cluttered:heavenly_ornamental_array` | 원본 상자 사용 ID |
| 벌집 램프 | `cluttered:honeycomb_lamp` | 원본 상자 사용 ID |
| 호핀 공원 랜턴 | `cluttered:hoppin_park_lantern` | 원본 상자 사용 ID |
| 제국 의자 | `cluttered:imperial_chair` | 원본 상자 사용 ID |
| 제국 테이블 | `cluttered:imperial_table` | 원본 상자 사용 ID |
| 잼 병 | `cluttered:jam_jars` | 원본 상자 사용 ID |
| 갈색 캐비닛 | `cluttered:kitchen_set_brown_cabinet` |  |
| 갈색 유리 캐비닛 | `cluttered:kitchen_set_brown_cabinet_glass` |  |
| 갈색 내부 캐비닛 | `cluttered:kitchen_set_brown_cabinet_inner_corner` |  |
| 갈색 반 캐비닛 | `cluttered:kitchen_set_brown_cabinet_mini` | 원본 상자 사용 ID |
| 갈색 열린 캐비닛 | `cluttered:kitchen_set_brown_cabinet_open` |  |
| 갈색 외부 캐비닛 | `cluttered:kitchen_set_brown_cabinet_outer_corner` |  |
| 갈색 카운터 | `cluttered:kitchen_set_brown_counter` |  |
| 갈색 내부 카운터 | `cluttered:kitchen_set_brown_counter_inner_corner` |  |
| 갈색 외부 왼쪽 카운터 | `cluttered:kitchen_set_brown_counter_outer_corner_left` |  |
| 갈색 외부 오른쪽 카운터 | `cluttered:kitchen_set_brown_counter_outer_corner_right` |  |
| 갈색 카운터 싱크대 | `cluttered:kitchen_set_brown_counter_sink` |  |
| 연두색 캐비닛 | `cluttered:kitchen_set_light_green_cabinet` |  |
| 연두색 유리 캐비닛 | `cluttered:kitchen_set_light_green_cabinet_glass` |  |
| 연두색 내부 캐비닛 | `cluttered:kitchen_set_light_green_cabinet_inner_corner` |  |
| 연두색 반 캐비닛 | `cluttered:kitchen_set_light_green_cabinet_mini` |  |
| 연두색 열린 캐비닛 | `cluttered:kitchen_set_light_green_cabinet_open` |  |
| 연두색 외부 캐비닛 | `cluttered:kitchen_set_light_green_cabinet_outer_corner` |  |
| 연두색 카운터 | `cluttered:kitchen_set_light_green_counter` |  |
| 연두색 내부 카운터 | `cluttered:kitchen_set_light_green_counter_inner_corner` |  |
| 연두색 외부 왼쪽 카운터 | `cluttered:kitchen_set_light_green_counter_outer_corner_left` |  |
| 연두색 외부 오른쪽 카운터 | `cluttered:kitchen_set_light_green_counter_outer_corner_right` |  |
| 연두색 카운터 싱크대 | `cluttered:kitchen_set_light_green_counter_sink` |  |
| 분홍색 캐비닛 | `cluttered:kitchen_set_pink_cabinet` |  |
| 분홍색 유리 캐비닛 | `cluttered:kitchen_set_pink_cabinet_glass` |  |
| 분홍색 내부 캐비닛 | `cluttered:kitchen_set_pink_cabinet_inner_corner` |  |
| 분홍색 반 캐비닛 | `cluttered:kitchen_set_pink_cabinet_mini` |  |
| 분홍색 열린 캐비닛 | `cluttered:kitchen_set_pink_cabinet_open` |  |
| 분홍색 외부 캐비닛 | `cluttered:kitchen_set_pink_cabinet_outer_corner` |  |
| 분홍색 카운터 | `cluttered:kitchen_set_pink_counter` |  |
| 분홍색 내부 카운터 | `cluttered:kitchen_set_pink_counter_inner_corner` |  |
| 분홍색 외부 왼쪽 카운터 | `cluttered:kitchen_set_pink_counter_outer_corner_left` |  |
| 분홍색 외부 오른쪽 카운터 | `cluttered:kitchen_set_pink_counter_outer_corner_right` |  |
| 분홍색 카운터 싱크대 | `cluttered:kitchen_set_pink_counter_sink` |  |
| 보라색 캐비닛 | `cluttered:kitchen_set_purple_cabinet` |  |
| 보라색 유리 캐비닛 | `cluttered:kitchen_set_purple_cabinet_glass` |  |
| 보라색 내부 캐비닛 | `cluttered:kitchen_set_purple_cabinet_inner_corner` |  |
| 보라색 반 캐비닛 | `cluttered:kitchen_set_purple_cabinet_mini` |  |
| 보라색 열린 캐비닛 | `cluttered:kitchen_set_purple_cabinet_open` |  |
| 보라색 외부 캐비닛 | `cluttered:kitchen_set_purple_cabinet_outer_corner` |  |
| 보라색 카운터 | `cluttered:kitchen_set_purple_counter` |  |
| 보라색 내부 카운터 | `cluttered:kitchen_set_purple_counter_inner_corner` |  |
| 보라색 외부 왼쪽 카운터 | `cluttered:kitchen_set_purple_counter_outer_corner_left` |  |
| 보라색 외부 오른쪽 카운터 | `cluttered:kitchen_set_purple_counter_outer_corner_right` |  |
| 보라색 카운터 싱크대 | `cluttered:kitchen_set_purple_counter_sink` |  |
| 하얀색 캐비닛 | `cluttered:kitchen_set_white_cabinet` |  |
| 하얀색 유리 캐비닛 | `cluttered:kitchen_set_white_cabinet_glass` |  |
| 하얀색 내부 캐비닛 | `cluttered:kitchen_set_white_cabinet_inner_corner` |  |
| 하얀색 반 캐비닛 | `cluttered:kitchen_set_white_cabinet_mini` |  |
| 하얀색 열린 캐비닛 | `cluttered:kitchen_set_white_cabinet_open` |  |
| 하얀색 외부 캐비닛 | `cluttered:kitchen_set_white_cabinet_outer_corner` |  |
| 하얀색 카운터 | `cluttered:kitchen_set_white_counter` |  |
| 하얀색 내부 카운터 | `cluttered:kitchen_set_white_counter_inner_corner` |  |
| 하얀색 외부 왼쪽 카운터 | `cluttered:kitchen_set_white_counter_outer_corner_left` |  |
| 하얀색 외부 오른쪽 카운터 | `cluttered:kitchen_set_white_counter_outer_corner_right` |  |
| 하얀색 카운터 싱크대 | `cluttered:kitchen_set_white_counter_sink` |  |
| 노란색 캐비닛 | `cluttered:kitchen_set_yellow_cabinet` |  |
| 노란색 유리 캐비닛 | `cluttered:kitchen_set_yellow_cabinet_glass` |  |
| 노란색 내부 캐비닛 | `cluttered:kitchen_set_yellow_cabinet_inner_corner` |  |
| 노란색 반 캐비닛 | `cluttered:kitchen_set_yellow_cabinet_mini` |  |
| 노란색 열린 캐비닛 | `cluttered:kitchen_set_yellow_cabinet_open` |  |
| 노란색 외부 캐비닛 | `cluttered:kitchen_set_yellow_cabinet_outer_corner` |  |
| 노란색 카운터 | `cluttered:kitchen_set_yellow_counter` |  |
| 노란색 내부 카운터 | `cluttered:kitchen_set_yellow_counter_inner_corner` |  |
| 노란색 외부 왼쪽 카운터 | `cluttered:kitchen_set_yellow_counter_outer_corner_left` |  |
| 노란색 외부 오른쪽 카운터 | `cluttered:kitchen_set_yellow_counter_outer_corner_right` |  |
| 노란색 카운터 싱크대 | `cluttered:kitchen_set_yellow_counter_sink` |  |
| 레몬 테이블 | `cluttered:lemon_table` | 원본 상자 사용 ID |
| 러블리 러브 시트 | `cluttered:lovely_love_seat_basic` | 원본 상자 사용 ID |
| 검은색 러블리 러브 시트 | `cluttered:lovely_love_seat_black` | 원본 상자 사용 ID |
| 달 관측소 종이 바구니 | `cluttered:lunar_observatory_basket_of_papers` | 원본 상자 사용 ID |
| 달 관측소 책 | `cluttered:lunar_observatory_books` | 원본 상자 사용 ID |
| 달 관측소 지구본 | `cluttered:lunar_observatory_globe` | 원본 상자 사용 ID |
| 달 관측소 병 | `cluttered:lunar_observatory_jar` | 원본 상자 사용 ID |
| 달 관측소 받침대 테이블 | `cluttered:lunar_observatory_pedestal_table` | 원본 상자 사용 ID |
| 달 관측소 테이블 | `cluttered:lunar_observatory_table` | 원본 상자 사용 ID |
| 마돈나 오토만 | `cluttered:madonna_ottoman` | 원본 상자 사용 ID |
| 대리석 별 | `cluttered:marble_sun_block` |  |
| 인어 화장대 | `cluttered:mermaid_dresser` | 원본 상자 사용 ID |
| 인어 진주 | `cluttered:mermaid_pearl` | 원본 상자 사용 ID |
| 미니 선인장 세트 | `cluttered:mini_cactus_set` | 원본 상자 사용 ID |
| 미니 무성애자 깃발 | `cluttered:mini_flag_ace` |  |
| 미니 양성애자 깃발 | `cluttered:mini_flag_bi` |  |
| 미니 레즈비언 깃발 | `cluttered:mini_flag_lesbian` |  |
| 미니 논바이너리 깃발 | `cluttered:mini_flag_nonbinary` |  |
| 미니 범성애자 깃발 | `cluttered:mini_flag_pan` |  |
| 미니 무지개 깃발 | `cluttered:mini_flag_rainbow` |  |
| 미니 트랜스젠더 깃발 | `cluttered:mini_flag_trans` |  |
| 미니 매달린 테라리움 | `cluttered:mini_hanging_terrariums` | 원본 상자 사용 ID |
| 달 벽 장식 | `cluttered:moon_decoration` | 원본 상자 사용 ID |
| 달 펜던트 | `cluttered:moon_pendant` | 원본 상자 사용 ID |
| 뮤렉스 캐비닛 | `cluttered:murex_cabinet` | 원본 상자 사용 ID |
| 어수선한 뮤렉스 캐비닛 | `cluttered:murex_cabinet_cluttered` | 원본 상자 사용 ID |
| 버섯 병 | `cluttered:mushroom_jars` | 원본 상자 사용 ID |
| 갈색 버섯 테라리움 | `cluttered:mushroom_terrarium_brown` | 원본 상자 사용 ID |
| 빨간색 버섯 테라리움 | `cluttered:mushroom_terrarium_red` | 원본 상자 사용 ID |
| 신문 더미 | `cluttered:newspaper_pile_short` | 원본 상자 사용 ID |
| 높은 신문 더미 | `cluttered:newspaper_pile_tall` | 원본 상자 사용 ID |
| 초록색 협탁 | `cluttered:nightstand_green` | 원본 상자 사용 ID |
| 사무용품 A | `cluttered:office_supplies_a` | 원본 상자 사용 ID |
| 사무용품 B | `cluttered:office_supplies_b` | 원본 상자 사용 ID |
| 검은색 펜던트 등 | `cluttered:osson_pendant_black` | 원본 상자 사용 ID |
| 갈색 펜던트 등 | `cluttered:osson_pendant_brown` | 원본 상자 사용 ID |
| 주황색 펜던트 등 | `cluttered:osson_pendant_orange` | 원본 상자 사용 ID |
| 초록색 펜던트 등 | `cluttered:osson_pendant_racing_green` | 원본 상자 사용 ID |
| 빨간색 펜던트 등 | `cluttered:osson_pendant_red` | 원본 상자 사용 ID |
| 연두색 펜던트 등 | `cluttered:osson_pendant_sage_green` | 원본 상자 사용 ID |
| 흰색 펜던트 등 | `cluttered:osson_pendant_white` | 원본 상자 사용 ID |
| 노란색 펜던트 등 | `cluttered:osson_pendant_yellow` | 원본 상자 사용 ID |
| 물감 물병 | `cluttered:paint_water_jar` | 원본 상자 사용 ID |
| 팬케이크 더미 | `cluttered:pancake_stack` | 원본 상자 사용 ID |
| 종이 더미 | `cluttered:paper_pile` | 원본 상자 사용 ID |
| 파스텔 침대 | `cluttered:pastel_bed` | 원본 상자 사용 ID |
| 파스텔 캐비닛 | `cluttered:pastel_cabinet` | 원본 상자 사용 ID |
| 파스텔 의자 | `cluttered:pastel_chair` | 원본 상자 사용 ID |
| 파스텔 조명 | `cluttered:pastel_light` | 원본 상자 사용 ID |
| 파스텔 스툴 | `cluttered:pastel_stool` | 원본 상자 사용 ID |
| 파스텔 테이블 | `cluttered:pastel_table` | 원본 상자 사용 ID |
| 파스텔 옷장 | `cluttered:pastel_wardrobe` | 원본 상자 사용 ID |
| 페이스트리 진열장 | `cluttered:pastry_display_case` | 원본 상자 사용 ID |
| 페이스트리 접시 | `cluttered:pastry_plate` | 원본 상자 사용 ID |
| 헬로 키티 받침대 | `cluttered:pedestal_hk` | 원본 상자 사용 ID |
| 피크닉 바구니 | `cluttered:picnic_basket` | 원본 상자 사용 ID |
| 준비된 피크닉 바구니 | `cluttered:picnic_basket_prepared` | 원본 상자 사용 ID |
| 장식용 파인애플 | `cluttered:pineapple` | 원본 상자 사용 ID |
| 식물 사다리 | `cluttered:plant_ladder` | 원본 상자 사용 ID |
| 폭타폭 고리 | `cluttered:pok_ta_pok_hoop` | 원본 상자 사용 ID |
| 폭타폭 뱀 고리 | `cluttered:pok_ta_pok_hoop_snakes` | 원본 상자 사용 ID |
| 폴라로이드 카메라 | `cluttered:polaroid_camera` | 원본 상자 사용 ID |
| 폴라로이드 A | `cluttered:polaroids_a` | 원본 상자 사용 ID |
| 폴라로이드 B | `cluttered:polaroids_b` | 원본 상자 사용 ID |
| 폴라로이드 C | `cluttered:polaroids_c` | 원본 상자 사용 ID |
| 포플러나무 책장 | `cluttered:poplar_bookshelf` |  |
| 포션 선반 | `cluttered:potion_shelf` | 원본 상자 사용 ID |
| 잭오랜턴 책장 | `cluttered:pumpkin_bookshelf` |  |
| 파란색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_blue` | 원본 상자 사용 ID |
| 초록색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_green` | 원본 상자 사용 ID |
| 파스텔 파란색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_pastel_blue` | 원본 상자 사용 ID |
| 파스텔 분홍색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_pastel_pink` | 원본 상자 사용 ID |
| 파스텔 보라색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_pastel_purple` | 원본 상자 사용 ID |
| 파스텔 노란색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_pastel_yellow` | 원본 상자 사용 ID |
| 빨간색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_red` | 원본 상자 사용 ID |
| 노란색 퍼즐 조각 테이블 | `cluttered:puzzle_piece_table_yellow` | 원본 상자 사용 ID |
| 파란색 레코드 플레이어 | `cluttered:record_player_blue` | 원본 상자 사용 ID |
| 갈색 레코드 플레이어 | `cluttered:record_player_brown` | 원본 상자 사용 ID |
| 분홍색 레코드 플레이어 | `cluttered:record_player_pink` | 원본 상자 사용 ID |
| 보라색 레코드 플레이어 | `cluttered:record_player_purple` | 원본 상자 사용 ID |
| 빨간색 레코드 플레이어 | `cluttered:record_player_red` | 원본 상자 사용 ID |
| 흰색 레코드 플레이어 | `cluttered:record_player_white` | 원본 상자 사용 ID |
| 노란색 레코드 플레이어 | `cluttered:record_player_yellow` | 원본 상자 사용 ID |
| 빨간색 버섯 침대 | `cluttered:red_mushroom_bed` | 원본 상자 사용 ID |
| 빨간색 버섯 책장 | `cluttered:red_mushroom_bookshelf` |  |
| 빨간색 버섯 램프 | `cluttered:red_mushroom_lamp` | 원본 상자 사용 ID |
| 빨간색 버섯 테이블 | `cluttered:red_mushroom_table` | 원본 상자 사용 ID |
| 빨간색 버섯 TV | `cluttered:red_mushroom_tv` | 원본 상자 사용 ID |
| 빨간색 버섯 옷장 | `cluttered:red_mushroom_wardrobe` | 원본 상자 사용 ID |
| 레트로 카페 선반 | `cluttered:retro_cafe_shelf` | 원본 상자 사용 ID |
| 레트로 카페 선반 유리창 | `cluttered:retro_cafe_shelf_window` | 원본 상자 사용 ID |
| 검은색 레트로 냉장고 | `cluttered:retro_fridge_black` | 원본 상자 사용 ID |
| 파란색 레트로 냉장고 | `cluttered:retro_fridge_blue` | 원본 상자 사용 ID |
| 분홍색 레트로 냉장고 | `cluttered:retro_fridge_pink` | 원본 상자 사용 ID |
| 보라색 레트로 냉장고 | `cluttered:retro_fridge_purple` | 원본 상자 사용 ID |
| 빨간색 레트로 냉장고 | `cluttered:retro_fridge_red` | 원본 상자 사용 ID |
| 터쿼이즈 레트로 냉장고 | `cluttered:retro_fridge_turquoise` | 원본 상자 사용 ID |
| 하얀색 레트로 냉장고 | `cluttered:retro_fridge_white` | 원본 상자 사용 ID |
| 노란색 레트로 냉장고 | `cluttered:retro_fridge_yellow` | 원본 상자 사용 ID |
| 검은색 레트로 토스터기 | `cluttered:retro_toaster_black` | 원본 상자 사용 ID |
| 파란색 레트로 토스터기 | `cluttered:retro_toaster_blue` | 원본 상자 사용 ID |
| 분홍색 레트로 토스터기 | `cluttered:retro_toaster_pink` | 원본 상자 사용 ID |
| 보라색 레트로 토스터기 | `cluttered:retro_toaster_purple` | 원본 상자 사용 ID |
| 빨간색 레트로 토스터기 | `cluttered:retro_toaster_red` | 원본 상자 사용 ID |
| 터쿼이즈 레트로 토스터기 | `cluttered:retro_toaster_turquoise` | 원본 상자 사용 ID |
| 하얀색 레트로 토스터기 | `cluttered:retro_toaster_white` | 원본 상자 사용 ID |
| 노란색 레트로 토스터기 | `cluttered:retro_toaster_yellow` | 원본 상자 사용 ID |
| 리토 목재 책 | `cluttered:rito_wooden_books` | 원본 상자 사용 ID |
| 장미 협탁 | `cluttered:rose_end_table` | 원본 상자 사용 ID |
| 검은색 장미 협탁 | `cluttered:rose_end_table_black` | 원본 상자 사용 ID |
| 로버 머그잔 | `cluttered:rover_mug` | 원본 상자 사용 ID |
| 로버 스툴 | `cluttered:rover_stool` | 원본 상자 사용 ID |
| 작은 책 더미 | `cluttered:row_of_small_books` | 원본 상자 사용 ID |
| 파스텔 작은 책 더미 | `cluttered:row_of_small_books_pastel` | 원본 상자 사용 ID |
| 선반 위 파스텔 작은 책 더미 | `cluttered:row_of_small_books_pastel_shelved` | 원본 상자 사용 ID |
| 선반 위 작은 책 더미 | `cluttered:row_of_small_books_shelved` | 원본 상자 사용 ID |
| 루빅 큐브 | `cluttered:rubiks_cube` | 원본 상자 사용 ID |
| 파스텔 루빅 큐브 | `cluttered:rubiks_cube_pastel` | 원본 상자 사용 ID |
| 노바키드 금고 | `cluttered:safe_novakid` | 원본 상자 사용 ID |
| 소금과 후추 | `cluttered:salt_pepper_shakers` | 원본 상자 사용 ID |
| 흩어진 종이 | `cluttered:scattered_papers` | 원본 상자 사용 ID |
| 가위와 실 | `cluttered:scissors_and_thread` | 원본 상자 사용 ID |
| 바다 보석 랜턴 | `cluttered:sea_gem_lantern` | 원본 상자 사용 ID |
| 해조류 화분 | `cluttered:seaweed_planter` | 원본 상자 사용 ID |
| 셀처 캔 | `cluttered:seltzer_cans` | 원본 상자 사용 ID |
| 바느질 잡동사니 | `cluttered:sewing_clutter` | 원본 상자 사용 ID |
| 골동품 재봉틀 | `cluttered:sewing_machine_antique` | 원본 상자 사용 ID |
| 재봉 마네킹 | `cluttered:sewing_mannequin` | 원본 상자 사용 ID |
| 바느질 테이블 | `cluttered:sewing_table_with_tablecloth` | 원본 상자 사용 ID |
| 스케치북 | `cluttered:sketchbook_single` | 원본 상자 사용 ID |
| 잘린 식빵 | `cluttered:sliced_bread` | 원본 상자 사용 ID |
| 작은 책장 | `cluttered:small_bookcase` | 원본 상자 사용 ID |
| 작은 관목 | `cluttered:small_bush` | 원본 상자 사용 ID |
| 작은 가마솥 세트 | `cluttered:small_cauldron_set` | 원본 상자 사용 ID |
| 작은 유리 병 | `cluttered:small_glass_jars` | 원본 상자 사용 ID |
| 작은 선반 | `cluttered:small_shelf` | 원본 상자 사용 ID |
| 작은 분홍색 선반 | `cluttered:small_shelf_pink` | 원본 상자 사용 ID |
| 향신료 병 | `cluttered:small_spice_jars` | 원본 상자 사용 ID |
| 초록색 실타래 | `cluttered:spool_of_thread_green` | 원본 상자 사용 ID |
| 분홍색 실타래 | `cluttered:spool_of_thread_pink` | 원본 상자 사용 ID |
| 보라색 실타래 | `cluttered:spool_of_thread_purple` | 원본 상자 사용 ID |
| 노란색 실타래 | `cluttered:spool_of_thread_yellow` | 원본 상자 사용 ID |
| 쌓인 책 | `cluttered:stack_of_books` | 원본 상자 사용 ID |
| 높게 쌓인 책 | `cluttered:stack_of_books_tall` | 원본 상자 사용 ID |
| 스테인드 글라스 램프 | `cluttered:stained_glass_lamp` | 원본 상자 사용 ID |
| 별 펜던트 | `cluttered:stars_pendant` | 원본 상자 사용 ID |
| 스팀펑크 지구본 | `cluttered:steampunk_globe` | 원본 상자 사용 ID |
| 스팀펑크 램프 | `cluttered:steampunk_lamp` | 원본 상자 사용 ID |
| 믹싱 볼 | `cluttered:sweetheart_baking_set_bowl` | 원본 상자 사용 ID |
| 베이킹 재료 | `cluttered:sweetheart_baking_set_ingredients` | 원본 상자 사용 ID |
| 스위트하트 카운터 | `cluttered:sweetheart_counter_drawers` | 원본 상자 사용 ID |
| 스위트하트 왼쪽 카운터 | `cluttered:sweetheart_counter_left_door` | 원본 상자 사용 ID |
| 스위트하트 오른쪽 카운터 | `cluttered:sweetheart_counter_right_door` | 원본 상자 사용 ID |
| 스위트하트 싱크대 | `cluttered:sweetheart_sink` | 원본 상자 사용 ID |
| 스위트하트 테이블 | `cluttered:sweetheart_table` | 원본 상자 사용 ID |
| 플라타너스나무 책장 | `cluttered:sycamore_bookshelf` |  |
| 테이블 | `cluttered:table` | 원본 상자 사용 ID |
| 식탁보와 테이블 | `cluttered:table_with_white_tablecloth` | 원본 상자 사용 ID |
| 베이지색 시자기 마을 화분 | `cluttered:tarrey_town_planter_beige` |  |
| 파란색 시자기 마을 화분 | `cluttered:tarrey_town_planter_blue` |  |
| 형광 시자기 마을 화분 | `cluttered:tarrey_town_planter_fluorescent` |  |
| 초록색 시자기 마을 화분 | `cluttered:tarrey_town_planter_green` |  |
| 분홍색 시자기 마을 화분 | `cluttered:tarrey_town_planter_pink` |  |
| 보라색 시자기 마을 화분 | `cluttered:tarrey_town_planter_purple` |  |
| 빨간색 시자기 마을 화분 | `cluttered:tarrey_town_planter_red` |  |
| 노란색 시자기 마을 화분 | `cluttered:tarrey_town_planter_yellow` |  |
| 태리타운 스토브 | `cluttered:tarrytown_stove` | 원본 상자 사용 ID |
| 직조무늬 돌 | `cluttered:textile_block_stone` |  |
| 초록색 타일 | `cluttered:tiles_green` |  |
| 무지갯빛 타일 | `cluttered:tiles_iridescent` |  |
| 작은 무지갯빛 타일 | `cluttered:tiles_iridescent_small` |  |
| 주방 타일 | `cluttered:tiles_kitchen` |  |
| 분홍색 타일 | `cluttered:tiles_pink` |  |
| 보라색 타일 | `cluttered:tiles_purple` |  |
| 노란색 타일 | `cluttered:tiles_yellow` |  |
| 전통 라디오 | `cluttered:traditional_radio` | 원본 상자 사용 ID |
| 화분 두 개 | `cluttered:two_flower_pots` | 원본 상자 사용 ID |
| 유령 의자 | `cluttered:unliving_chair` | 원본 상자 사용 ID |
| 바이알 스탠드 | `cluttered:vial_stand` | 원본 상자 사용 ID |
| 바이올렛 병풍 | `cluttered:violet_screen` | 원본 상자 사용 ID |
| 물뿌리개 | `cluttered:watering_can` | 원본 상자 사용 ID |
| 구리 물뿌리개 | `cluttered:watering_can_copper` | 원본 상자 사용 ID |
| 웨딩 아치 | `cluttered:wedding_arch` | 원본 상자 사용 ID |
| 검은 고양이 신비한 버드나무 책장 | `cluttered:willow_bookshelf_black_cat` |  |
| 연금술사의 신비한 버드나무 책장 | `cluttered:willow_bookshelf_bottles` |  |
| 삼색 고양이 신비한 버드나무 책장 | `cluttered:willow_bookshelf_calico_cat` |  |
| 거미줄 친 신비한 버드나무 책장 | `cluttered:willow_bookshelf_cobweb` |  |
| 약초학자의 신비한 버드나무 책장 | `cluttered:willow_bookshelf_vase` |  |
| 와인 랙 | `cluttered:wine_bottle_rack` | 원본 상자 사용 ID |
| 와인 병 | `cluttered:wine_bottles` | 원본 상자 사용 ID |
| 파스텔 목재 블록 책장 | `cluttered:wooden_block_bookshelf_pastel` | 원본 상자 사용 ID |
| 노트패드 | `cluttered:yellow_notepad` | 원본 상자 사용 ID |

</details>

<details><summary>Cozy Cafe — 4개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Cafe Manager | `cozycafe:cafe_manager` | 원본 배치/NBT 규칙 확인 |
| Cafe Menu | `cozycafe:cafe_menu` |  |
| Cafe Sign | `cozycafe:cafe_sign` | 원본 배치/NBT 규칙 확인 |
| Plating Station | `cozycafe:plating_station` |  |

</details>

<details><summary>Create — 1개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Cuckoo Clock | `create:cuckoo_clock` | 원본 상자 사용 ID |

</details>

<details><summary>Decorative Blocks — 7개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 쇠창살 | `decorative_blocks:bar_panel` |  |
| 화로 | `decorative_blocks:brazier` |  |
| 큰 사슬 | `decorative_blocks:chain` |  |
| 샹들리에 | `decorative_blocks:chandelier` |  |
| 목재 격자 | `decorative_blocks:lattice` |  |
| 영혼 화로 | `decorative_blocks:soul_brazier` |  |
| 영혼 샹들리에 | `decorative_blocks:soul_chandelier` |  |

</details>

<details><summary>Display Delight Lite — 2개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Food Plate | `displaydelight:food_plate` |  |
| Small Food Plate | `displaydelight:small_food_plate` |  |

</details>

<details><summary>Etcetera — 12개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 꽃다발 | `etcetera:bouquet` |  |
| 주사위 | `etcetera:dice` |  |
| 드럼 | `etcetera:drum` |  |
| 프레임 | `etcetera:frame` |  |
| 발광 아이템 거치대 | `etcetera:glow_item_stand` |  |
| 무지개빛 랜턴 | `etcetera:iridescent_lantern` |  |
| 아이템 거치대 | `etcetera:item_stand` |  |
| 전구 | `etcetera:light_bulb` |  |
| 가시 캔 | `etcetera:prickly_can` |  |
| 오징어 램프 | `etcetera:squid_lamp` |  |
| 테라코타 꽃병 | `etcetera:terracotta_vase` |  |
| 색이 입혀진 전구 | `etcetera:tinted_light_bulb` |  |

</details>

<details><summary>Fantasy’s Furniture — 287개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 뼈 침대 더블 | `fantasyfurniture:bone/skeleton/bed_double` |  |
| 뼈 침대 싱글 | `fantasyfurniture:bone/skeleton/bed_single` |  |
| 뼈 벤치 | `fantasyfurniture:bone/skeleton/bench` |  |
| 뼈 책장 | `fantasyfurniture:bone/skeleton/bookshelf` |  |
| 뼈 양탄자 | `fantasyfurniture:bone/skeleton/carpet` |  |
| 뼈 의자 | `fantasyfurniture:bone/skeleton/chair` |  |
| 뼈 샹들리에 | `fantasyfurniture:bone/skeleton/chandelier` |  |
| 뼈 상자 | `fantasyfurniture:bone/skeleton/chest` |  |
| 뼈 스켈레톤 카운터 | `fantasyfurniture:bone/skeleton/counter` |  |
| 뼈 책상 왼쪽 | `fantasyfurniture:bone/skeleton/desk_left` |  |
| 뼈 책상 오른쪽 | `fantasyfurniture:bone/skeleton/desk_right` |  |
| 뼈 문 더블 | `fantasyfurniture:bone/skeleton/door_double` |  |
| 뼈 문 싱글 | `fantasyfurniture:bone/skeleton/door_single` |  |
| 뼈 서랍 | `fantasyfurniture:bone/skeleton/drawer` |  |
| 뼈 장식장 | `fantasyfurniture:bone/skeleton/dresser` |  |
| 뼈 바닥 조명 | `fantasyfurniture:bone/skeleton/floor_light` |  |
| 뼈 금고 | `fantasyfurniture:bone/skeleton/lockbox` |  |
| 뼈 스켈레톤 오븐 | `fantasyfurniture:bone/skeleton/oven` |  |
| 뼈 그림 스몰 | `fantasyfurniture:bone/skeleton/painting_small` |  |
| 뼈 그림 와이드 | `fantasyfurniture:bone/skeleton/painting_wide` |  |
| 뼈 선반 | `fantasyfurniture:bone/skeleton/shelf` |  |
| 뼈 해골 | `fantasyfurniture:bone/skeleton/skull` |  |
| 뼈 소파 | `fantasyfurniture:bone/skeleton/sofa` |  |
| 뼈 스툴 | `fantasyfurniture:bone/skeleton/stool` |  |
| 뼈 테이블 라지 | `fantasyfurniture:bone/skeleton/table_large` |  |
| 뼈 테이블 스몰 | `fantasyfurniture:bone/skeleton/table_small` |  |
| 뼈 테이블 와이드 | `fantasyfurniture:bone/skeleton/table_wide` |  |
| 뼈 벽 조명 | `fantasyfurniture:bone/skeleton/wall_light` |  |
| 뼈 옷장 하단 | `fantasyfurniture:bone/skeleton/wardrobe_bottom` |  |
| 뼈 옷장 상단 | `fantasyfurniture:bone/skeleton/wardrobe_top` |  |
| 위더 뼈 침대 더블 | `fantasyfurniture:bone/wither/bed_double` |  |
| 위더 뼈 침대 싱글 | `fantasyfurniture:bone/wither/bed_single` |  |
| 위더 뼈 벤치 | `fantasyfurniture:bone/wither/bench` |  |
| 위더 뼈 책장 | `fantasyfurniture:bone/wither/bookshelf` |  |
| 위더 뼈 양탄자 | `fantasyfurniture:bone/wither/carpet` |  |
| 위더 뼈 의자 | `fantasyfurniture:bone/wither/chair` |  |
| 위더 뼈 샹들리에 | `fantasyfurniture:bone/wither/chandelier` |  |
| 위더 뼈 상자 | `fantasyfurniture:bone/wither/chest` |  |
| 위더 뼈 카운터 | `fantasyfurniture:bone/wither/counter` |  |
| 위더 뼈 책상 왼쪽 | `fantasyfurniture:bone/wither/desk_left` |  |
| 위더 뼈 책상 오른쪽 | `fantasyfurniture:bone/wither/desk_right` |  |
| 위더 뼈 문 더블 | `fantasyfurniture:bone/wither/door_double` |  |
| 위더 뼈 문 싱글 | `fantasyfurniture:bone/wither/door_single` |  |
| 위더 뼈 서랍 | `fantasyfurniture:bone/wither/drawer` |  |
| 위더 뼈 장식장 | `fantasyfurniture:bone/wither/dresser` |  |
| 위더 뼈 바닥 조명 | `fantasyfurniture:bone/wither/floor_light` |  |
| 위더 뼈 금고 | `fantasyfurniture:bone/wither/lockbox` |  |
| 뼈 위더 오븐 | `fantasyfurniture:bone/wither/oven` |  |
| 위더 뼈 그림 스몰 | `fantasyfurniture:bone/wither/painting_small` |  |
| 위더 뼈 그림 와이드 | `fantasyfurniture:bone/wither/painting_wide` |  |
| 위더 뼈 선반 | `fantasyfurniture:bone/wither/shelf` |  |
| 위더 뼈 해골 | `fantasyfurniture:bone/wither/skull` |  |
| 위더 뼈 소파 | `fantasyfurniture:bone/wither/sofa` |  |
| 위더 뼈 스툴 | `fantasyfurniture:bone/wither/stool` |  |
| 위더 뼈 테이블 라지 | `fantasyfurniture:bone/wither/table_large` |  |
| 위더 뼈 테이블 (소) | `fantasyfurniture:bone/wither/table_small` |  |
| 위더 뼈 테이블 (넓은) | `fantasyfurniture:bone/wither/table_wide` |  |
| 위더 뼈 벽 조명 | `fantasyfurniture:bone/wither/wall_light` |  |
| 위더 뼈 옷장 하단 | `fantasyfurniture:bone/wither/wardrobe_bottom` |  |
| 위더 뼈 옷장 상단 | `fantasyfurniture:bone/wither/wardrobe_top` |  |
| 블루베리 바구니 | `fantasyfurniture:decorations/berry_basket_blueberry` |  |
| 바구니 | `fantasyfurniture:decorations/berry_basket_empty` |  |
| 딸기 바구니 | `fantasyfurniture:decorations/berry_basket_strawberry` |  |
| 스위트베리 바구니 | `fantasyfurniture:decorations/berry_basket_sweetberry` |  |
| 천 뭉치 | `fantasyfurniture:decorations/bolts_of_cloth` |  |
| 뼈 영혼 모래 촛불 | `fantasyfurniture:decorations/bone_candles` |  |
| 뼈 잔 | `fantasyfurniture:decorations/bone_skeleton_chalices` |  |
| 뼈 더미 | `fantasyfurniture:decorations/bone_skeleton_pile` |  |
| 해골 꽃 | `fantasyfurniture:decorations/bone_skeleton_skull_blossoms` |  |
| 위더 뼈 잔 | `fantasyfurniture:decorations/bone_wither_chalices` |  |
| 위더 뼈 더미 | `fantasyfurniture:decorations/bone_wither_pile` |  |
| 위더 해골 꽃 | `fantasyfurniture:decorations/bone_wither_skull_blossoms` |  |
| 책 더미 | `fantasyfurniture:decorations/book_stack` |  |
| 비트 수프 그릇 | `fantasyfurniture:decorations/bowl_beetroot_soup` |  |
| 그릇 | `fantasyfurniture:decorations/bowl_empty` |  |
| 버섯 스튜 그릇 | `fantasyfurniture:decorations/bowl_mushroom_stew` |  |
| 양조 가마솥 | `fantasyfurniture:decorations/brewing_cauldron` |  |
| 청동 사슬 | `fantasyfurniture:decorations/bronze_chain` |  |
| 금화 더미 | `fantasyfurniture:decorations/coin_stack_gold` |  |
| 철 주화 더미 | `fantasyfurniture:decorations/coin_stack_iron` |  |
| 쿠키 항아리 | `fantasyfurniture:decorations/cookie_jar` |  |
| 던머 도자기 1 | `fantasyfurniture:decorations/dunmer_pottery_0` |  |
| 던머 도자기 2 | `fantasyfurniture:decorations/dunmer_pottery_1` |  |
| 요정 조명 (1) | `fantasyfurniture:decorations/fairy_lights_1` |  |
| 요정 조명 (2) | `fantasyfurniture:decorations/fairy_lights_2` |  |
| 떠다니는 고서 | `fantasyfurniture:decorations/floating_tomes` |  |
| 묘비 | `fantasyfurniture:decorations/gravestone` |  |
| 매달린 약초 | `fantasyfurniture:decorations/hanging_herbs` |  |
| 블루베리 머핀 | `fantasyfurniture:decorations/muffins_blueberry` |  |
| 초콜릿 머핀 | `fantasyfurniture:decorations/muffins_chocolate` |  |
| 스위트베리 머핀 | `fantasyfurniture:decorations/muffins_sweetberry` |  |
| 갈색 버섯 | `fantasyfurniture:decorations/mushrooms_brown` |  |
| 빨간 버섯 | `fantasyfurniture:decorations/mushrooms_red` |  |
| 강령군주 촛대 | `fantasyfurniture:decorations/necrolord_candelabra` |  |
| 삶은 크림 과자 | `fantasyfurniture:decorations/nordic_boiled_creme_treats` |  |
| 벌꿀주 병 | `fantasyfurniture:decorations/nordic_mead_bottles` |  |
| 검은 영혼석 | `fantasyfurniture:decorations/nordic_soul_gems_dark` |  |
| 영혼석 | `fantasyfurniture:decorations/nordic_soul_gems_light` |  |
| 스위트 롤 | `fantasyfurniture:decorations/nordic_sweetrolls` |  |
| 종이 더미 | `fantasyfurniture:decorations/paper_stack` |  |
| 물약 병 | `fantasyfurniture:decorations/potion_bottles` |  |
| 물약 병 | `fantasyfurniture:decorations/potion_bottles_dyeable` |  |
| 선물 더미 1 | `fantasyfurniture:decorations/presents_stack_1` |  |
| 선물 더미 2 | `fantasyfurniture:decorations/presents_stack_2` |  |
| 왕실 촛대 | `fantasyfurniture:decorations/royal_candelabra` |  |
| 왕실 잔 | `fantasyfurniture:decorations/royal_chalices` |  |
| 왕실 왕관 | `fantasyfurniture:decorations/royal_crown` |  |
| 왕실 쿠션 왕관 | `fantasyfurniture:decorations/royal_cushioned_crown` |  |
| 왕실 바닥 쿠션 | `fantasyfurniture:decorations/royal_floor_cushion` |  |
| 왕실 음식 1 | `fantasyfurniture:decorations/royal_food_0` |  |
| 왕실 음식 2 | `fantasyfurniture:decorations/royal_food_1` |  |
| 왕실 접시 | `fantasyfurniture:decorations/royal_platter` |  |
| 왕실 큰 벽 거울 | `fantasyfurniture:decorations/royal_wall_mirror_large` |  |
| 왕실 작은 벽 거울 | `fantasyfurniture:decorations/royal_wall_mirror_small` |  |
| 눈덩이 | `fantasyfurniture:decorations/snowballs` |  |
| 작은 거미줄 | `fantasyfurniture:decorations/spider_web_small` |  |
| 넓은 거미줄 | `fantasyfurniture:decorations/spider_web_wide` |  |
| 쌓을 수 있는 호박 | `fantasyfurniture:decorations/stackable_pumpkins` |  |
| 양말 | `fantasyfurniture:decorations/stocking` |  |
| 맥주잔 | `fantasyfurniture:decorations/tankards_empty` |  |
| 꿀 맥주잔 | `fantasyfurniture:decorations/tankards_honeymead` |  |
| 우유 맥주잔 | `fantasyfurniture:decorations/tankards_milk` |  |
| 스위트베리 맥주잔 | `fantasyfurniture:decorations/tankards_sweetberry` |  |
| 벤티르 현수막 | `fantasyfurniture:decorations/venthyr_banner` |  |
| 벤티르 초 | `fantasyfurniture:decorations/venthyr_candles` |  |
| 벤티르 잔 | `fantasyfurniture:decorations/venthyr_chalices` |  |
| 벤티르 음식 1 | `fantasyfurniture:decorations/venthyr_food_0` |  |
| 벤티르 음식 2 | `fantasyfurniture:decorations/venthyr_food_1` |  |
| 벤티르 접시 | `fantasyfurniture:decorations/venthyr_platter` |  |
| 벤티르 찻잔 | `fantasyfurniture:decorations/venthyr_tea_cups` |  |
| 벤티르 찻잔 세트 | `fantasyfurniture:decorations/venthyr_tea_set` |  |
| 벤티르 고서 | `fantasyfurniture:decorations/venthyr_tomes` |  |
| 위도우블룸 꽃병 | `fantasyfurniture:decorations/venthyr_widow_bloom` |  |
| 던머 더블 | `fantasyfurniture:dunmer/bed_double` |  |
| 던머 싱글 | `fantasyfurniture:dunmer/bed_single` |  |
| 던머 벤치 | `fantasyfurniture:dunmer/bench` |  |
| 던머 책장 | `fantasyfurniture:dunmer/bookshelf` |  |
| 던머 양탄자 | `fantasyfurniture:dunmer/carpet` |  |
| 던머 의자 | `fantasyfurniture:dunmer/chair` |  |
| 던머 샹들리에 | `fantasyfurniture:dunmer/chandelier` |  |
| 던머 상자 | `fantasyfurniture:dunmer/chest` |  |
| 던머 카운터 | `fantasyfurniture:dunmer/counter` |  |
| 던머 쿠션 | `fantasyfurniture:dunmer/cushion` |  |
| 던머 왼쪽 책상 | `fantasyfurniture:dunmer/desk_left` |  |
| 던머 오른쪽 책상 | `fantasyfurniture:dunmer/desk_right` |  |
| 던머 더블 | `fantasyfurniture:dunmer/door_double` |  |
| 던머 싱글 | `fantasyfurniture:dunmer/door_single` |  |
| 던머 서랍 | `fantasyfurniture:dunmer/drawer` |  |
| 던머 장식장 | `fantasyfurniture:dunmer/dresser` |  |
| 던머 바닥 조명 | `fantasyfurniture:dunmer/floor_light` |  |
| 던머 잠긴 상자 | `fantasyfurniture:dunmer/lockbox` |  |
| 던머 구이판 | `fantasyfurniture:dunmer/oven` |  |
| 던머 작은 그림 | `fantasyfurniture:dunmer/painting_small` |  |
| 던머 넓은 그림 | `fantasyfurniture:dunmer/painting_wide` |  |
| 던머 선반 | `fantasyfurniture:dunmer/shelf` |  |
| 던머 소파 | `fantasyfurniture:dunmer/sofa` |  |
| 던머 스툴 | `fantasyfurniture:dunmer/stool` |  |
| 던머 큰 테이블 | `fantasyfurniture:dunmer/table_large` |  |
| 던머 작은 테이블 | `fantasyfurniture:dunmer/table_small` |  |
| 던머 넓은 테이블 | `fantasyfurniture:dunmer/table_wide` |  |
| 던머 벽 조명 | `fantasyfurniture:dunmer/wall_light` |  |
| 던머 옷장 하단 | `fantasyfurniture:dunmer/wardrobe_bottom` |  |
| 던머 옷장 상단 | `fantasyfurniture:dunmer/wardrobe_top` |  |
| 가구 작업대 | `fantasyfurniture:furniture_station` |  |
| 네크로로드 더블 | `fantasyfurniture:necrolord/bed_double` |  |
| 네크로로드 싱글 | `fantasyfurniture:necrolord/bed_single` |  |
| 네크로로드 벤치 | `fantasyfurniture:necrolord/bench` |  |
| 네크로로드 책장 | `fantasyfurniture:necrolord/bookshelf` |  |
| 네크로로드 양탄자 | `fantasyfurniture:necrolord/carpet` |  |
| 네크로로드 의자 | `fantasyfurniture:necrolord/chair` |  |
| 네크로로드 샹들리에 | `fantasyfurniture:necrolord/chandelier` |  |
| 네크로로드 상자 | `fantasyfurniture:necrolord/chest` |  |
| 네크로로드 카운터 | `fantasyfurniture:necrolord/counter` |  |
| 네크로로드 쿠션 | `fantasyfurniture:necrolord/cushion` |  |
| 네크로로드 왼쪽 책상 | `fantasyfurniture:necrolord/desk_left` |  |
| 네크로로드 오른쪽 책상 | `fantasyfurniture:necrolord/desk_right` |  |
| 네크로로드 양문 | `fantasyfurniture:necrolord/door_double` |  |
| 네크로로드 단문 | `fantasyfurniture:necrolord/door_single` |  |
| 네크로로드 서랍 | `fantasyfurniture:necrolord/drawer` |  |
| 네크로로드 장식장 | `fantasyfurniture:necrolord/dresser` |  |
| 네크로로드 바닥 조명 | `fantasyfurniture:necrolord/floor_light` |  |
| 네크로로드 잠긴 상자 | `fantasyfurniture:necrolord/lockbox` |  |
| 네크로로드 오븐 | `fantasyfurniture:necrolord/oven` |  |
| 네크로로드 작은 그림 | `fantasyfurniture:necrolord/painting_small` |  |
| 네크로로드 넓은 그림 | `fantasyfurniture:necrolord/painting_wide` |  |
| 네크로로드 선반 | `fantasyfurniture:necrolord/shelf` |  |
| 네크로로드 소파 | `fantasyfurniture:necrolord/sofa` |  |
| 네크로로드 스툴 | `fantasyfurniture:necrolord/stool` |  |
| 네크로로드 큰 테이블 | `fantasyfurniture:necrolord/table_large` |  |
| 네크로로드 작은 테이블 | `fantasyfurniture:necrolord/table_small` |  |
| 네크로로드 넓은 테이블 | `fantasyfurniture:necrolord/table_wide` |  |
| 네크로로드 벽 조명 | `fantasyfurniture:necrolord/wall_light` |  |
| 네크로로드 옷장 하단 | `fantasyfurniture:necrolord/wardrobe_bottom` |  |
| 네크로로드 옷장 상단 | `fantasyfurniture:necrolord/wardrobe_top` |  |
| 노르딕 더블 침대 | `fantasyfurniture:nordic/bed_double` |  |
| 노르딕 싱글 침대 | `fantasyfurniture:nordic/bed_single` |  |
| 노르딕 벤치 | `fantasyfurniture:nordic/bench` |  |
| 노르딕 책장 | `fantasyfurniture:nordic/bookshelf` |  |
| 노르딕 양탄자 | `fantasyfurniture:nordic/carpet` |  |
| 노르딕 의자 | `fantasyfurniture:nordic/chair` |  |
| 노르딕 샹들리에 | `fantasyfurniture:nordic/chandelier` |  |
| 노르딕 상자 | `fantasyfurniture:nordic/chest` |  |
| 노르딕 카운터 | `fantasyfurniture:nordic/counter` |  |
| 노르딕 쿠션 | `fantasyfurniture:nordic/cushion` |  |
| 노르딕풍 왼쪽 책상 | `fantasyfurniture:nordic/desk_left` |  |
| 노르딕풍 오른쪽 책상 | `fantasyfurniture:nordic/desk_right` |  |
| 노르딕풍 이중 문 | `fantasyfurniture:nordic/door_double` |  |
| 노르딕풍 단일 문 | `fantasyfurniture:nordic/door_single` |  |
| 노르딕풍 서랍 | `fantasyfurniture:nordic/drawer` |  |
| 노르딕풍 장식장 | `fantasyfurniture:nordic/dresser` |  |
| 노르딕풍 바닥 조명 | `fantasyfurniture:nordic/floor_light` |  |
| 노르딕풍 잠긴 상자 | `fantasyfurniture:nordic/lockbox` |  |
| 노르딕풍 오븐 | `fantasyfurniture:nordic/oven` |  |
| 노르딕풍 작은 그림 | `fantasyfurniture:nordic/painting_small` |  |
| 노르딕풍 넓은 그림 | `fantasyfurniture:nordic/painting_wide` |  |
| 노르딕풍 선반 | `fantasyfurniture:nordic/shelf` |  |
| 노르딕풍 소파 | `fantasyfurniture:nordic/sofa` |  |
| 노르딕풍 스툴 | `fantasyfurniture:nordic/stool` |  |
| 노르딕풍 큰 테이블 | `fantasyfurniture:nordic/table_large` |  |
| 노르딕풍 작은 테이블 | `fantasyfurniture:nordic/table_small` |  |
| 노르딕풍 넓은 테이블 | `fantasyfurniture:nordic/table_wide` |  |
| 노르딕풍 벽 조명 | `fantasyfurniture:nordic/wall_light` |  |
| 노르딕풍 옷장 하단 | `fantasyfurniture:nordic/wardrobe_bottom` |  |
| 노르딕풍 옷장 상단 | `fantasyfurniture:nordic/wardrobe_top` |  |
| 로얄 이중 침대 | `fantasyfurniture:royal/bed_double` |  |
| 로얄 단일 침대 | `fantasyfurniture:royal/bed_single` |  |
| 로얄 벤치 | `fantasyfurniture:royal/bench` |  |
| 로얄 책장 | `fantasyfurniture:royal/bookshelf` |  |
| 로얄 양탄자 | `fantasyfurniture:royal/carpet` |  |
| 로얄 의자 | `fantasyfurniture:royal/chair` |  |
| 로얄 샹들리에 | `fantasyfurniture:royal/chandelier` |  |
| 로얄 상자 | `fantasyfurniture:royal/chest` |  |
| 로얄 카운터 | `fantasyfurniture:royal/counter` |  |
| 로얄 쿠션 | `fantasyfurniture:royal/cushion` |  |
| 로얄풍 왼쪽 책상 | `fantasyfurniture:royal/desk_left` |  |
| 로얄풍 오른쪽 책상 | `fantasyfurniture:royal/desk_right` |  |
| 로얄풍 이중 문 | `fantasyfurniture:royal/door_double` |  |
| 로얄풍 단일 문 | `fantasyfurniture:royal/door_single` |  |
| 로얄풍 서랍 | `fantasyfurniture:royal/drawer` |  |
| 로얄풍 장식장 | `fantasyfurniture:royal/dresser` |  |
| 로얄풍 바닥 조명 | `fantasyfurniture:royal/floor_light` |  |
| 로얄풍 잠긴 상자 | `fantasyfurniture:royal/lockbox` |  |
| 로얄풍 오븐 | `fantasyfurniture:royal/oven` |  |
| 로얄풍 작은 그림 | `fantasyfurniture:royal/painting_small` |  |
| 로얄풍 넓은 그림 | `fantasyfurniture:royal/painting_wide` |  |
| 로얄풍 선반 | `fantasyfurniture:royal/shelf` |  |
| 로얄 소파 | `fantasyfurniture:royal/sofa` |  |
| 로얄 스툴 | `fantasyfurniture:royal/stool` |  |
| 로얄 테이블 (대) | `fantasyfurniture:royal/table_large` |  |
| 로얄 테이블 (소) | `fantasyfurniture:royal/table_small` |  |
| 로얄 테이블 (넓은) | `fantasyfurniture:royal/table_wide` |  |
| 로얄 벽 조명 | `fantasyfurniture:royal/wall_light` |  |
| 로얄 옷장 하단 | `fantasyfurniture:royal/wardrobe_bottom` |  |
| 로얄 옷장 상단 | `fantasyfurniture:royal/wardrobe_top` |  |
| 벤티르 이중 침대 | `fantasyfurniture:venthyr/bed_double` |  |
| 벤티르 단일 침대 | `fantasyfurniture:venthyr/bed_single` |  |
| 벤티르 벤치 | `fantasyfurniture:venthyr/bench` |  |
| 벤티르 책장 | `fantasyfurniture:venthyr/bookshelf` |  |
| 벤티르 양탄자 | `fantasyfurniture:venthyr/carpet` |  |
| 벤티르 의자 | `fantasyfurniture:venthyr/chair` |  |
| 벤티르 샹들리에 | `fantasyfurniture:venthyr/chandelier` |  |
| 벤티르 상자 | `fantasyfurniture:venthyr/chest` |  |
| 벤티르 카운터 | `fantasyfurniture:venthyr/counter` |  |
| 벤티르 쿠션 | `fantasyfurniture:venthyr/cushion` |  |
| 벤티르 왼쪽 책상 | `fantasyfurniture:venthyr/desk_left` |  |
| 벤티르 오른쪽 책상 | `fantasyfurniture:venthyr/desk_right` |  |
| 벤티르 이중 문 | `fantasyfurniture:venthyr/door_double` |  |
| 벤티르 단일 문 | `fantasyfurniture:venthyr/door_single` |  |
| 벤티르 서랍 | `fantasyfurniture:venthyr/drawer` |  |
| 벤티르 장식장 | `fantasyfurniture:venthyr/dresser` |  |
| 벤티르 바닥 조명 | `fantasyfurniture:venthyr/floor_light` |  |
| 벤티르 잠긴 상자 | `fantasyfurniture:venthyr/lockbox` |  |
| 벤티르 오븐 | `fantasyfurniture:venthyr/oven` |  |
| 벤티르 작은 그림 | `fantasyfurniture:venthyr/painting_small` |  |
| 벤티르 넓은 그림 | `fantasyfurniture:venthyr/painting_wide` |  |
| 벤티르 선반 | `fantasyfurniture:venthyr/shelf` |  |
| 벤티르 소파 | `fantasyfurniture:venthyr/sofa` |  |
| 벤티르 스툴 | `fantasyfurniture:venthyr/stool` |  |
| 벤티르 테이블 (대) | `fantasyfurniture:venthyr/table_large` |  |
| 화려한 큰 벤티르 테이블 | `fantasyfurniture:venthyr/table_large_fancy` |  |
| 벤티르 테이블 (소) | `fantasyfurniture:venthyr/table_small` |  |
| 화려한 작은 벤티르 테이블 | `fantasyfurniture:venthyr/table_small_fancy` |  |
| 벤티르 테이블 (넓은) | `fantasyfurniture:venthyr/table_wide` |  |
| 화려한 넓은 벤티르 테이블 | `fantasyfurniture:venthyr/table_wide_fancy` |  |
| 벤티르 벽 조명 | `fantasyfurniture:venthyr/wall_light` |  |
| 벤티르 옷장 하단 | `fantasyfurniture:venthyr/wardrobe_bottom` |  |
| 벤티르 옷장 상단 | `fantasyfurniture:venthyr/wardrobe_top` |  |

</details>

<details><summary>Let’s Do Farm & Charm — 21개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 비트 자루 | `farm_and_charm:beetroot_bag` |  |
| 당근 자루 | `farm_and_charm:carrot_bag` |  |
| 요리 냄비 | `farm_and_charm:cooking_pot` |  |
| 옥수수 자루 | `farm_and_charm:corn_bag` |  |
| 믹싱 볼 | `farm_and_charm:crafting_bowl` |  |
| 먹이통 | `farm_and_charm:feeding_trough` |  |
| 밀가루 포대 | `farm_and_charm:flour_bag` |  |
| 양상추 자루 | `farm_and_charm:lettuce_bag` |  |
| 그라인더 | `farm_and_charm:mincer` |  |
| 양파 자루 | `farm_and_charm:onion_bag` |  |
| 감자 자루 | `farm_and_charm:potato_bag` |  |
| 로스터 | `farm_and_charm:roaster` |  |
| §6허수아비 | `farm_and_charm:scarecrow` |  |
| 구리 사일로 | `farm_and_charm:silo_copper` |  |
| 나무 사일로 | `farm_and_charm:silo_wood` |  |
| 스토브 | `farm_and_charm:stove` |  |
| 딸기 자루 | `farm_and_charm:strawberry_bag` |  |
| 토마토 자루 | `farm_and_charm:tomato_bag` |  |
| 도구 거치대 | `farm_and_charm:tool_rack` |  |
| 삭제됨 - 제작대에 올려 다이아몬드 스프링클러로 반환 | `farm_and_charm:water_sprinkler` |  |
| 창 턱 | `farm_and_charm:window_sill` |  |

</details>

<details><summary>Farmer’s Delight — 18개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Acacia Cabinet | `farmersdelight:acacia_cabinet` |  |
| Bamboo Basket | `farmersdelight:bamboo_basket` |  |
| Bamboo Cabinet | `farmersdelight:bamboo_cabinet` |  |
| Birch Cabinet | `farmersdelight:birch_cabinet` |  |
| Cherry Cabinet | `farmersdelight:cherry_cabinet` |  |
| Cooking Pot | `farmersdelight:cooking_pot` |  |
| Crimson Cabinet | `farmersdelight:crimson_cabinet` |  |
| Cutting Board | `farmersdelight:cutting_board` |  |
| Dark Oak Cabinet | `farmersdelight:dark_oak_cabinet` |  |
| Full Tatami Mat | `farmersdelight:full_tatami_mat` |  |
| Half Tatami Mat | `farmersdelight:half_tatami_mat` |  |
| Jungle Cabinet | `farmersdelight:jungle_cabinet` |  |
| Mangrove Cabinet | `farmersdelight:mangrove_cabinet` |  |
| Oak Cabinet | `farmersdelight:oak_cabinet` |  |
| Spruce Cabinet | `farmersdelight:spruce_cabinet` |  |
| 스토브 | `farmersdelight:stove` |  |
| Warped Cabinet | `farmersdelight:warped_cabinet` |  |
| Basket | `farmersdelight:wooden_basket` |  |

</details>

<details><summary>Let’s Do Furniture — 126개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 아카시아나무 벤치 | `furniture:acacia_bench` |  |
| 아카시아나무 수납장 | `furniture:acacia_cabinet` |  |
| 아카시아나무 시계 | `furniture:acacia_clock` | 원본 상자 사용 ID |
| 아카시아나무 책상 | `furniture:acacia_desk` |  |
| 아카시아나무 책상 의자 | `furniture:acacia_desk_chair` |  |
| 아카시아나무 옷장 | `furniture:acacia_dresser` |  |
| 아카시아나무 괘종시계 | `furniture:acacia_grandfather_clock` |  |
| 아카시아나무 거울 | `furniture:acacia_mirror` | 원본 상자 사용 ID |
| 아카시아나무 덧문 | `furniture:acacia_shutter` |  |
| 쓰레기통 | `furniture:bin` |  |
| 자작나무 벤치 | `furniture:birch_bench` |  |
| 자작나무 수납장 | `furniture:birch_cabinet` |  |
| 자작나무 시계 | `furniture:birch_clock` | 원본 상자 사용 ID |
| 자작나무 책상 | `furniture:birch_desk` |  |
| 자작나무 책상 의자 | `furniture:birch_desk_chair` |  |
| 자작나무 옷장 | `furniture:birch_dresser` |  |
| 자작나무 괘종시계 | `furniture:birch_grandfather_clock` |  |
| 자작나무 거울 | `furniture:birch_mirror` | 원본 상자 사용 ID |
| 자작나무 덧문 | `furniture:birch_shutter` |  |
| 청사진 | `furniture:blueprints` |  |
| 병 속의 배 | `furniture:boat_in_a_jar` | 원본 상자 사용 ID |
| 벽돌 굴뚝 | `furniture:brick_chimney` |  |
| 금전 등록기 | `furniture:cash_register` | 원본 상자 사용 ID |
| 벚나무 벤치 | `furniture:cherry_bench` |  |
| 벚나무 수납장 | `furniture:cherry_cabinet` |  |
| 벚나무 시계 | `furniture:cherry_clock` | 원본 상자 사용 ID |
| 벚나무 책상 | `furniture:cherry_desk` |  |
| 벚나무 책상 의자 | `furniture:cherry_desk_chair` |  |
| 벚나무 옷장 | `furniture:cherry_dresser` |  |
| 벚나무 괘종시계 | `furniture:cherry_grandfather_clock` |  |
| 벚나무 거울 | `furniture:cherry_mirror` | 원본 상자 사용 ID |
| 벚나무 덧문 | `furniture:cherry_shutter` |  |
| 궤짝 | `furniture:coffer` | 원본 상자 사용 ID |
| 구리 굴뚝 | `furniture:copper_chimney` |  |
| 구리 어항 | `furniture:copper_fish_tank` | 원본 상자 사용 ID |
| 검은색 커튼 | `furniture:curtain_black` |  |
| 파란색 커튼 | `furniture:curtain_blue` |  |
| 갈색 커튼 | `furniture:curtain_brown` |  |
| 청록색 커튼 | `furniture:curtain_cyan` |  |
| 회색 커튼 | `furniture:curtain_gray` |  |
| 초록색 커튼 | `furniture:curtain_green` |  |
| 하늘색 커튼 | `furniture:curtain_light_blue` |  |
| 회백색 커튼 | `furniture:curtain_light_gray` |  |
| 연두색 커튼 | `furniture:curtain_lime` |  |
| 자홍색 커튼 | `furniture:curtain_magenta` |  |
| 주황색 커튼 | `furniture:curtain_orange` |  |
| 분홍색 커튼 | `furniture:curtain_pink` |  |
| 보라색 커튼 | `furniture:curtain_purple` |  |
| 빨간색 커튼 | `furniture:curtain_red` |  |
| 하얀색 커튼 | `furniture:curtain_white` |  |
| 노란색 커튼 | `furniture:curtain_yellow` |  |
| 짙은 참나무 벤치 | `furniture:dark_oak_bench` |  |
| 짙은 참나무 수납장 | `furniture:dark_oak_cabinet` |  |
| 짙은 참나무 시계 | `furniture:dark_oak_clock` | 원본 상자 사용 ID |
| 짙은 참나무 책상 | `furniture:dark_oak_desk` |  |
| 짙은 참나무 책상 의자 | `furniture:dark_oak_desk_chair` |  |
| 짙은 참나무 옷장 | `furniture:dark_oak_dresser` |  |
| 짙은 참나무 괘종시계 | `furniture:dark_oak_grandfather_clock` |  |
| 짙은 참나무 거울 | `furniture:dark_oak_mirror` | 원본 상자 사용 ID |
| 짙은 참나무 덧문 | `furniture:dark_oak_shutter` |  |
| 장식장 | `furniture:display` | 원본 상자 사용 ID |
| 탐험가 상자 | `furniture:explorers_box` | 원본 상자 사용 ID |
| 축음기 | `furniture:gramophone` | 원본 상자 사용 ID |
| 철제 물고기 수조 | `furniture:iron_fish_tank` | 원본 상자 사용 ID |
| 정글나무 벤치 | `furniture:jungle_bench` |  |
| 정글나무 수납장 | `furniture:jungle_cabinet` |  |
| 정글나무 시계 | `furniture:jungle_clock` | 원본 상자 사용 ID |
| 정글나무 책상 | `furniture:jungle_desk` |  |
| 정글나무 책상 의자 | `furniture:jungle_desk_chair` |  |
| 정글나무 옷장 | `furniture:jungle_dresser` |  |
| 정글나무 괘종시계 | `furniture:jungle_grandfather_clock` |  |
| 정글나무 거울 | `furniture:jungle_mirror` | 원본 상자 사용 ID |
| 정글나무 덧문 | `furniture:jungle_shutter` |  |
| 검은색 램프 | `furniture:lamp_black` |  |
| 파란색 램프 | `furniture:lamp_blue` |  |
| 갈색 램프 | `furniture:lamp_brown` |  |
| 청록색 램프 | `furniture:lamp_cyan` |  |
| 회색 램프 | `furniture:lamp_gray` |  |
| 초록색 램프 | `furniture:lamp_green` |  |
| 하늘색 램프 | `furniture:lamp_light_blue` |  |
| 회백색 램프 | `furniture:lamp_light_gray` |  |
| 연두색 램프 | `furniture:lamp_lime` |  |
| 자홍색 램프 | `furniture:lamp_magenta` |  |
| 주황색 램프 | `furniture:lamp_orange` |  |
| 분홍색 램프 | `furniture:lamp_pink` |  |
| 보라색 램프 | `furniture:lamp_purple` |  |
| 빨간색 램프 | `furniture:lamp_red` |  |
| 하얀색 램프 | `furniture:lamp_white` |  |
| 노란색 램프 | `furniture:lamp_yellow` |  |
| 맹그로브나무 벤치 | `furniture:mangrove_bench` |  |
| 맹그로브나무 수납장 | `furniture:mangrove_cabinet` |  |
| 맹그로브나무 시계 | `furniture:mangrove_clock` | 원본 상자 사용 ID |
| 맹그로브나무 책상 | `furniture:mangrove_desk` |  |
| 맹그로브나무 책상 의자 | `furniture:mangrove_desk_chair` |  |
| 맹그로브나무 옷장 | `furniture:mangrove_dresser` |  |
| 맹그로브나무 괘종시계 | `furniture:mangrove_grandfather_clock` |  |
| 맹그로브나무 거울 | `furniture:mangrove_mirror` | 원본 상자 사용 ID |
| 맹그로브나무 덧문 | `furniture:mangrove_shutter` |  |
| 참나무 벤치 | `furniture:oak_bench` |  |
| 참나무 수납장 | `furniture:oak_cabinet` |  |
| 참나무 시계 | `furniture:oak_clock` | 원본 상자 사용 ID |
| 참나무 책상 | `furniture:oak_desk` |  |
| 참나무 책상 의자 | `furniture:oak_desk_chair` |  |
| 참나무 옷장 | `furniture:oak_dresser` |  |
| 참나무 괘종시계 | `furniture:oak_grandfather_clock` |  |
| 참나무 거울 | `furniture:oak_mirror` | 원본 상자 사용 ID |
| 참나무 덧문 | `furniture:oak_shutter` |  |
| Plated Street Lantern | `furniture:plated_street_lantern_item` |  |
| 재봉 키트 | `furniture:sewing_kit` | 원본 상자 사용 ID |
| 가문비나무 벤치 | `furniture:spruce_bench` |  |
| 가문비나무 수납장 | `furniture:spruce_cabinet` |  |
| 가문비나무 시계 | `furniture:spruce_clock` | 원본 상자 사용 ID |
| 가문비나무 책상 | `furniture:spruce_desk` |  |
| 가문비나무 책상 의자 | `furniture:spruce_desk_chair` |  |
| 가문비나무 옷장 | `furniture:spruce_dresser` |  |
| 가문비나무 괘종시계 | `furniture:spruce_grandfather_clock` |  |
| 가문비나무 거울 | `furniture:spruce_mirror` | 원본 상자 사용 ID |
| 가문비나무 덧문 | `furniture:spruce_shutter` |  |
| 증기 흡기구 | `furniture:steam_vent` |  |
| 석재 벽돌 화분 | `furniture:stone_brick_planter` |  |
| 석재 벽돌 굴뚝 | `furniture:stone_bricks_chimney` |  |
| Street Lantern | `furniture:street_lantern_item` |  |
| 망원경 | `furniture:telescope` | 원본 상자 사용 ID |
| 테라리움 | `furniture:terrarium` | 원본 상자 사용 ID |
| 공구 상자 | `furniture:tool_box` | 원본 상자 사용 ID |
| 나무 화분 | `furniture:wooden_planter` |  |

</details>

<details><summary>Let’s Do HerbalBrews — 7개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 양조 가마솥 | `herbalbrews:cauldron` |  |
| 구리 찻주전자 | `herbalbrews:copper_tea_kettle` |  |
| §e정복자 배너: §aHerbal Brews | `herbalbrews:herbalbrews_banner` |  |
| 유리 물병 | `herbalbrews:jug` |  |
| 스토브 | `herbalbrews:stove` |  |
| 찻주전자 | `herbalbrews:tea_kettle` |  |
| 찻잎 자루 | `herbalbrews:tea_leaf_crate` |  |

</details>

<details><summary>Kata 인형 (원본팩 등록) — 15개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Ace Kata Doll | `kata:adv_ace_kata_doll` | 초기화 확인 |
| Chimera | `kata:adv_chimera` | 초기화 확인 |
| Dipp Kata Doll | `kata:adv_dipp_kata_doll` | 초기화 확인 |
| Foomin Kata Doll | `kata:adv_foomin_kata_doll` | 초기화 확인 |
| Fredbear Plushie | `kata:adv_fredbear_plushie` | 초기화 확인 |
| Geraldine Plushie | `kata:adv_geraldine_plushie` | 초기화 확인 |
| Havana Kata Doll | `kata:adv_havana_kata_doll` | 초기화 확인 |
| Honey Kata Doll | `kata:adv_honey_kata_doll` | 초기화 확인 |
| Ichigo Kata Doll | `kata:adv_ichigo_kata_doll` | 초기화 확인 |
| Johnson Kata Doll | `kata:adv_johnson_kata_doll` | 초기화 확인 |
| June Kata Doll | `kata:adv_june_kata_doll` | 초기화 확인 |
| Jungle Kata Doll | `kata:adv_jungle_kata_doll` | 초기화 확인 |
| Prince Kata Doll | `kata:adv_prince_kata_doll` | 초기화 확인 |
| Princess Fredbear Plushie | `kata:adv_princess_fredbear_plushie` | 초기화 확인 |
| Shiny Fredbear Plushie | `kata:adv_shiny_fredbear_plushie` | 초기화 확인 |

</details>

<details><summary>Let’s Do Meadow — 50개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 알파인 벤치 | `meadow:bench` |  |
| 카메라 | `meadow:camera` | 원본 상자 사용 ID |
| 캔 | `meadow:can` |  |
| 알파인 의자 | `meadow:chair` |  |
| 자동 치즈 착제기 | `meadow:cheese_form` |  |
| 치즈 랙 | `meadow:cheese_rack` |  |
| 요리 가마솥 | `meadow:cooking_cauldron` |  |
| 도어 매트 | `meadow:doormat` |  |
| 장작 | `meadow:fire_log` |  |
| 얼룩덜룩한 양털 침대 | `meadow:flecked_bed` |  |
| 얼룩덜룩한 양털 카펫 | `meadow:flecked_carpet` |  |
| 퐁듀 | `meadow:fondue` |  |
| 냄비 걸이가 있는 모닥불 | `meadow:frame` |  |
| 하트 패턴 창문 | `meadow:heart_patterned_window` |  |
| 하이랜드 양털 침대 | `meadow:highland_bed` |  |
| 하이랜드 양털 카펫 | `meadow:highland_carpet` |  |
| 새까만 양털 침대 | `meadow:inky_bed` |  |
| 새까만 양털 카펫 | `meadow:inky_carpet` |  |
| §e정복자 배너: §2Meadow | `meadow:meadow_banner` |  |
| 기름 랜턴 | `meadow:oil_lantern` |  |
| 누더기 양털 침대 | `meadow:patched_bed` |  |
| 누더기 양털 카펫 | `meadow:patched_carpet` |  |
| 알파인 창문 | `meadow:pine_window` |  |
| 바위 양털 침대 | `meadow:rocky_bed` |  |
| 바위 양털 카펫 | `meadow:rocky_carpet` |  |
| 알파인 선반 | `meadow:shelf` |  |
| 창문 셔터 | `meadow:shutter_block` |  |
| 색칠된 창문 셔터 | `meadow:shutter_block_berry` |  |
| 색칠된 창문 셔터 | `meadow:shutter_block_fir` |  |
| 색칠된 창문 셔터 | `meadow:shutter_block_poppy` |  |
| 돌 벤치 | `meadow:stone_bench` |  |
| 돌 테이블 | `meadow:stone_table` |  |
| 타일 스토브 | `meadow:stove_tiles` |  |
| 타일 벤치 | `meadow:stove_tiles_bench` |  |
| 덮개가 있는 타일 스토브 | `meadow:stove_tiles_lid` |  |
| 나무 보관함이 있는 타일 스토브 | `meadow:stove_tiles_wood` |  |
| 밀짚 침대 | `meadow:straw_bed` |  |
| 태양 패턴 창문 | `meadow:sun_patterned_window` |  |
| 알파인 테이블 | `meadow:table` |  |
| 그림자 양털 침대 | `meadow:umbra_bed` |  |
| 그림자 양털 카펫 | `meadow:umbra_carpet` |  |
| 뒤틀린 양털 침대 | `meadow:warped_bed` |  |
| 뒤틀린 양털 카펫 | `meadow:warped_carpet` |  |
| 물뿌리개 | `meadow:watering_can` |  |
| 손수레 | `meadow:wheelbarrow` | 원본 상자 사용 ID |
| 목재 절삭대 | `meadow:woodcutter` |  |
| 나무 가마솥 | `meadow:wooden_cauldron` |  |
| 나무 화분 박스 | `meadow:wooden_flower_box` |  |
| 큰 나무 화분 | `meadow:wooden_flower_pot_big` |  |
| 나무 화분 | `meadow:wooden_flower_pot_small` |  |

</details>

<details><summary>Let’s Do NetherVinery — 16개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Crimson Apple Press | `nethervinery:crimson_apple_press` |  |
| Crimson Barrel | `nethervinery:crimson_barrel` |  |
| Crimson Aging Barrel | `nethervinery:crimson_fermentation_barrel` |  |
| 진홍빛 포도 자루 | `nethervinery:crimson_grape_crate` |  |
| Crimson Grapevine Pot | `nethervinery:crimson_grapevine_pot` |  |
| 큰 진홍빛 와인거치대 | `nethervinery:crimson_wine_rack_big` |  |
| 진홍빛 와인거치대 | `nethervinery:crimson_wine_rack_mid` |  |
| 작은 진홍빛 와인거치대 | `nethervinery:crimson_wine_rack_small` |  |
| Warped Apple Press | `nethervinery:warped_apple_press` |  |
| Warped Barrel | `nethervinery:warped_barrel` |  |
| Warped Aging Barrel | `nethervinery:warped_fermentation_barrel` |  |
| 뒤틀린 포도 자루 | `nethervinery:warped_grape_crate` |  |
| Warped Grapevine Pot | `nethervinery:warped_grapevine_pot` |  |
| 큰 뒤틀린 와인거치대 | `nethervinery:warped_wine_rack_big` |  |
| 뒤틀린 와인거치대 | `nethervinery:warped_wine_rack_mid` |  |
| 작은 뒤틀린 와인거치대 | `nethervinery:warped_wine_rack_small` |  |

</details>

<details><summary>Night Lights — 82개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 검은색 요정 전구 | `nightlights:fairy_lights_black` |  |
| 파란색 요정 전구 | `nightlights:fairy_lights_blue` |  |
| 갈색 요정 전구 | `nightlights:fairy_lights_brown` |  |
| 청록색 요정 전구 | `nightlights:fairy_lights_cyan` |  |
| 요정 전구 | `nightlights:fairy_lights_default` |  |
| 회색 요정 전구 | `nightlights:fairy_lights_gray` |  |
| 초록색 요정 전구 | `nightlights:fairy_lights_green` |  |
| 하늘색 요정 전구 | `nightlights:fairy_lights_light_blue` |  |
| 회백색 요정 전구 | `nightlights:fairy_lights_light_gray` |  |
| 연두색 요정 전구 | `nightlights:fairy_lights_lime` |  |
| 자홍색 요정 전구 | `nightlights:fairy_lights_magenta` |  |
| 주황색 요정 전구 | `nightlights:fairy_lights_orange` |  |
| 분홍색 요정 전구 | `nightlights:fairy_lights_pink` |  |
| 보라색 요정 전구 | `nightlights:fairy_lights_purple` |  |
| 빨간색 요정 전구 | `nightlights:fairy_lights_red` |  |
| 하얀색 요정 전구 | `nightlights:fairy_lights_white` |  |
| 노란색 요정 전구 | `nightlights:fairy_lights_yellow` |  |
| 검은색 개구리 야간 조명 | `nightlights:frog_black` |  |
| 파란색 개구리 야간 조명 | `nightlights:frog_blue` |  |
| 갈색 개구리 야간 조명 | `nightlights:frog_brown` |  |
| 청록색 개구리 야간 조명 | `nightlights:frog_cyan` |  |
| 회색 개구리 야간 조명 | `nightlights:frog_gray` |  |
| 초록색 개구리 야간 조명 | `nightlights:frog_green` |  |
| 하늘색 개구리 야간 조명 | `nightlights:frog_light_blue` |  |
| 회백색 개구리 야간 조명 | `nightlights:frog_light_gray` |  |
| 연두색 개구리 야간 조명 | `nightlights:frog_lime` |  |
| 자홍색 개구리 야간 조명 | `nightlights:frog_magenta` |  |
| 주황색 개구리 야간 조명 | `nightlights:frog_orange` |  |
| 분홍색 개구리 야간 조명 | `nightlights:frog_pink` |  |
| 보라색 개구리 야간 조명 | `nightlights:frog_purple` |  |
| 빨간색 개구리 야간 조명 | `nightlights:frog_red` |  |
| 하얀색 개구리 야간 조명 | `nightlights:frog_white` |  |
| 노란색 개구리 야간 조명 | `nightlights:frog_yellow` |  |
| 검은색 매달린 조명 | `nightlights:hanging_lights_black` |  |
| 파란색 매달린 조명 | `nightlights:hanging_lights_blue` |  |
| 갈색 매달린 조명 | `nightlights:hanging_lights_brown` |  |
| 청록색 매달린 조명 | `nightlights:hanging_lights_cyan` |  |
| 매달린 조명 | `nightlights:hanging_lights_default` |  |
| 회색 매달린 조명 | `nightlights:hanging_lights_gray` |  |
| 초록색 매달린 조명 | `nightlights:hanging_lights_green` |  |
| 하늘색 매달린 조명 | `nightlights:hanging_lights_light_blue` |  |
| 회백색 매달린 조명 | `nightlights:hanging_lights_light_gray` |  |
| 연두색 매달린 조명 | `nightlights:hanging_lights_lime` |  |
| 자홍색 매달린 조명 | `nightlights:hanging_lights_magenta` |  |
| 주황색 매달린 조명 | `nightlights:hanging_lights_orange` |  |
| 분홍색 매달린 조명 | `nightlights:hanging_lights_pink` |  |
| 보라색 매달린 조명 | `nightlights:hanging_lights_purple` |  |
| 빨간색 매달린 조명 | `nightlights:hanging_lights_red` |  |
| 하얀색 매달린 조명 | `nightlights:hanging_lights_white` |  |
| 노란색 매달린 조명 | `nightlights:hanging_lights_yellow` |  |
| 검은색 버섯 야간 조명 | `nightlights:mushroom_black` |  |
| 파란색 버섯 야간 조명 | `nightlights:mushroom_blue` |  |
| 갈색 버섯 야간 조명 | `nightlights:mushroom_brown` |  |
| 청록색 버섯 야간 조명 | `nightlights:mushroom_cyan` |  |
| 회색 버섯 야간 조명 | `nightlights:mushroom_gray` |  |
| 초록색 버섯 야간 조명 | `nightlights:mushroom_green` |  |
| 하늘색 버섯 야간 조명 | `nightlights:mushroom_light_blue` |  |
| 회백색 버섯 야간 조명 | `nightlights:mushroom_light_gray` |  |
| 연두색 버섯 야간 조명 | `nightlights:mushroom_lime` |  |
| 자홍색 버섯 야간 조명 | `nightlights:mushroom_magenta` |  |
| 주황색 버섯 야간 조명 | `nightlights:mushroom_orange` |  |
| 분홍색 버섯 야간 조명 | `nightlights:mushroom_pink` |  |
| 보라색 버섯 야간 조명 | `nightlights:mushroom_purple` |  |
| 빨간색 버섯 야간 조명 | `nightlights:mushroom_red` |  |
| 하얀색 버섯 야간 조명 | `nightlights:mushroom_white` |  |
| 노란색 버섯 야간 조명 | `nightlights:mushroom_yellow` |  |
| 검은색 문어 야간 조명 | `nightlights:octopus_black` |  |
| 파란색 문어 야간 조명 | `nightlights:octopus_blue` |  |
| 갈색 문어 야간 조명 | `nightlights:octopus_brown` |  |
| 청록색 문어 야간 조명 | `nightlights:octopus_cyan` |  |
| 회색 문어 야간 조명 | `nightlights:octopus_gray` |  |
| 초록색 문어 야간 조명 | `nightlights:octopus_green` |  |
| 하늘색 문어 야간 조명 | `nightlights:octopus_light_blue` |  |
| 회백색 문어 야간 조명 | `nightlights:octopus_light_gray` |  |
| 연두색 문어 야간 조명 | `nightlights:octopus_lime` |  |
| 자홍색 문어 야간 조명 | `nightlights:octopus_magenta` |  |
| 주황색 문어 야간 조명 | `nightlights:octopus_orange` |  |
| 분홍색 문어 야간 조명 | `nightlights:octopus_pink` |  |
| 보라색 문어 야간 조명 | `nightlights:octopus_purple` |  |
| 빨간색 문어 야간 조명 | `nightlights:octopus_red` |  |
| 하얀색 문어 야간 조명 | `nightlights:octopus_white` |  |
| 노란색 문어 야간 조명 | `nightlights:octopus_yellow` |  |

</details>

<details><summary>Perfect Plushies — 47개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Aye Aye Plushie | `perfectplushies:adv_aye_aye_plushie` | 초기화 확인 |
| Bear Plushie | `perfectplushies:adv_bear_plushie` | 초기화 확인 |
| Brown Rabbit Plushie | `perfectplushies:adv_brown_rabbit_plushie` | 초기화 확인 |
| Capybara Plushie | `perfectplushies:adv_capybara_plushie` | 초기화 확인 |
| Cat Plushie | `perfectplushies:adv_cat_plushie` | 초기화 확인 |
| Doe Plushie | `perfectplushies:adv_doe_plushie` | 초기화 확인 |
| Dog Plushie | `perfectplushies:adv_dog_plushie` | 초기화 확인 |
| Dolphin Plushie | `perfectplushies:adv_dolphin_plushie` | 초기화 확인 |
| Duck Plushie | `perfectplushies:adv_duck_plushie` | 초기화 확인 |
| Elephant Plushie | `perfectplushies:adv_elephant_plushie` | 초기화 확인 |
| Fennec Fox Plushie | `perfectplushies:adv_fennec_fox_plushie` | 초기화 확인 |
| Frog Plushie | `perfectplushies:adv_frog_plushie` | 초기화 확인 |
| Goose Plushie | `perfectplushies:adv_goose_plushie` | 초기화 확인 |
| Hedgehog Plushie | `perfectplushies:adv_hedgehog_plushie` | 초기화 확인 |
| Hippo Plushie | `perfectplushies:adv_hippo_plushie` | 초기화 확인 |
| Hummingbird Plushie | `perfectplushies:adv_hummingbird_plushie` | 초기화 확인 |
| Koala Plushie | `perfectplushies:adv_koala_plushie` | 초기화 확인 |
| Lion Cub Plushie | `perfectplushies:adv_lion_cub_plushie` | 초기화 확인 |
| Monkey Plushie | `perfectplushies:adv_monkey_plushie` | 초기화 확인 |
| Mouse Plushie | `perfectplushies:adv_mouse_plushie` | 초기화 확인 |
| Panda Plushie | `perfectplushies:adv_panda_plushie` | 초기화 확인 |
| Quokka Plushie | `perfectplushies:adv_quokka_plushie` | 초기화 확인 |
| Raccoon Plushie | `perfectplushies:adv_raccoon_plushie` | 초기화 확인 |
| Red Fox Plushie | `perfectplushies:adv_red_fox_plushie` | 초기화 확인 |
| Red Panda Plushie | `perfectplushies:adv_red_panda_plushie` | 초기화 확인 |
| Red Ruffed Lemur Plushie | `perfectplushies:adv_red_ruffed_lemur_plushie` | 초기화 확인 |
| Reindeer Plushie | `perfectplushies:adv_reindeer_plushie` | 초기화 확인 |
| Robin Plushie | `perfectplushies:adv_robin_plushie` | 초기화 확인 |
| Rubber Duck Plushie | `perfectplushies:adv_rubber_duck_plushie` | 초기화 확인 |
| Seal Plushie | `perfectplushies:adv_seal_plushie` | 초기화 확인 |
| Snow Fox Plushie | `perfectplushies:adv_snow_fox_plushie` | 초기화 확인 |
| Turtle Plushie | `perfectplushies:adv_turtle_plushie` | 초기화 확인 |
| White Rabbit Plushie | `perfectplushies:adv_white_rabbit_plushie` | 초기화 확인 |
| Daniel Plushie | `perfectplushies:daniel_plushie` |  |
| Dumbo Blob Plushie | `perfectplushies:dumbo_blob_plushie` |  |
| GamerPotion Plushie | `perfectplushies:gamerpotion_plushie` |  |
| GamerPotion Plushie | `perfectplushies:gamerpotion_plushie_rare` |  |
| Geode Plushie | `perfectplushies:geode_plushie` |  |
| Joosh Plushie | `perfectplushies:joosh_plushie` |  |
| June Plushie | `perfectplushies:june_plushie` |  |
| Nyf Plushie | `perfectplushies:nyf_plushie` |  |
| RoCris Plushie | `perfectplushies:rocris_plushie` |  |
| Silk Plushie | `perfectplushies:silk_plushie` |  |
| SirJain Plushie | `perfectplushies:sirjain_plushie` |  |
| SirJain Plushie | `perfectplushies:sirjain_plushie_rare` |  |
| SizableShrimp Plushie | `perfectplushies:sizableshrimp_plushie` |  |
| Tslat Plushie | `perfectplushies:tslat_plushie` |  |

</details>

<details><summary>Quark — 31개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 아카시아나무 잎 카펫 | `quark:acacia_leaf_carpet` |  |
| 잿빛나무 잎 카펫 | `quark:ancient_leaf_carpet` |  |
| 진달래 잎 카펫 | `quark:azalea_leaf_carpet` |  |
| 자작나무 잎 카펫 | `quark:birch_leaf_carpet` |  |
| 검은색 동굴 수정 조명 | `quark:black_crystal_lamp` |  |
| 블레이즈 랜턴 | `quark:blaze_lantern` |  |
| 서리꽃 트럼펫나무 잎 카펫 | `quark:blue_blossom_leaf_carpet` |  |
| 파란색 동굴 수정 조명 | `quark:blue_crystal_lamp` |  |
| 벚나무 잎 카펫 | `quark:cherry_leaf_carpet` |  |
| 짙은 참나무 잎 카펫 | `quark:dark_oak_leaf_carpet` |  |
| 더스크바운드 랜턴 | `quark:duskbound_lantern` |  |
| 꽃 핀 진달래 잎 카펫 | `quark:flowering_azalea_leaf_carpet` |  |
| 유리 아이템 액자 | `quark:glass_item_frame` |  |
| 발광 유리 아이템 액자 | `quark:glowing_glass_item_frame` |  |
| 초록색 동굴 수정 조명 | `quark:green_crystal_lamp` |  |
| 남색 동굴 수정 조명 | `quark:indigo_crystal_lamp` |  |
| 정글 나무 잎 카펫 | `quark:jungle_leaf_carpet` |  |
| 청명꽃 트럼펫나무 잎 카펫 | `quark:lavender_blossom_leaf_carpet` |  |
| 맹그로브나무 잎 카펫 | `quark:mangrove_leaf_carpet` |  |
| 참나무 잎 카펫 | `quark:oak_leaf_carpet` |  |
| 온기꽃 트럼펫나무 잎 카펫 | `quark:orange_blossom_leaf_carpet` |  |
| 주황색 동굴 수정 조명 | `quark:orange_crystal_lamp` |  |
| 종이 랜턴 | `quark:paper_lantern` |  |
| 장식된 종이 랜턴 | `quark:paper_lantern_sakura` |  |
| 불꽃 트럼펫나무 잎 카펫 | `quark:red_blossom_leaf_carpet` |  |
| 빨간색 동굴 수정 조명 | `quark:red_crystal_lamp` |  |
| 가문비나무 잎 카펫 | `quark:spruce_leaf_carpet` |  |
| 보라색 동굴 수정 조명 | `quark:violet_crystal_lamp` |  |
| 흰색 동굴 수정 조명 | `quark:white_crystal_lamp` |  |
| 화창꽃 트럼펫나무 잎 카펫 | `quark:yellow_blossom_leaf_carpet` |  |
| 노란색 동굴 수정 조명 | `quark:yellow_crystal_lamp` |  |

</details>

<details><summary>MrCrayfish’s Furniture: Refurbished — 381개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 아카시아 세면대 | `refurbished_furniture:acacia_basin` |  |
| 아카시아 욕조 | `refurbished_furniture:acacia_bath` |  |
| 아카시아나무 의자 | `refurbished_furniture:acacia_chair` |  |
| 아카시아나무 상자 | `refurbished_furniture:acacia_crate` |  |
| 아카시아나무 도마 | `refurbished_furniture:acacia_cutting_board` |  |
| 아카시아나무 어두운 천장 팬 | `refurbished_furniture:acacia_dark_ceiling_fan` |  |
| 얇은 아카시아나무 책상 | `refurbished_furniture:acacia_desk` |  |
| 아카시아나무 서랍 | `refurbished_furniture:acacia_drawer` |  |
| 아카시아나무 부엌 찬장 | `refurbished_furniture:acacia_kitchen_cabinetry` |  |
| 아카시아나무 부엌 서랍 | `refurbished_furniture:acacia_kitchen_drawer` |  |
| 아카시아나무 부엌 싱크대 | `refurbished_furniture:acacia_kitchen_sink` |  |
| 아카시아 주방 수납장 | `refurbished_furniture:acacia_kitchen_storage_cabinet` |  |
| 아카시아나무 천장 조명 선풍기 | `refurbished_furniture:acacia_light_ceiling_fan` |  |
| 아카시아나무 우편함 | `refurbished_furniture:acacia_mail_box` |  |
| 아카시아 수납 캐비닛 | `refurbished_furniture:acacia_storage_cabinet` |  |
| 아카시아나무 저장 항아리 | `refurbished_furniture:acacia_storage_jar` |  |
| 얇은 아카시아나무 테이블 | `refurbished_furniture:acacia_table` |  |
| 아카시아나무 변기 | `refurbished_furniture:acacia_toilet` |  |
| 버치 세면대 | `refurbished_furniture:birch_basin` |  |
| 버치 욕조 | `refurbished_furniture:birch_bath` |  |
| 자작나무 의자 | `refurbished_furniture:birch_chair` |  |
| 자작나무 상자 | `refurbished_furniture:birch_crate` |  |
| 자작나무 도마 | `refurbished_furniture:birch_cutting_board` |  |
| 자작나무 어두운 천장 팬 | `refurbished_furniture:birch_dark_ceiling_fan` |  |
| 얇은 자작나무 책상 | `refurbished_furniture:birch_desk` |  |
| 자작나무 서랍 | `refurbished_furniture:birch_drawer` |  |
| 자작나무 부엌 찬장 | `refurbished_furniture:birch_kitchen_cabinetry` |  |
| 자작나무 부엌 서랍 | `refurbished_furniture:birch_kitchen_drawer` |  |
| 자작나무 부엌 싱크대 | `refurbished_furniture:birch_kitchen_sink` |  |
| 자작나무 주방 수납장 | `refurbished_furniture:birch_kitchen_storage_cabinet` |  |
| 자작나무 천장 조명 선풍기 | `refurbished_furniture:birch_light_ceiling_fan` |  |
| 자작나무 우편함 | `refurbished_furniture:birch_mail_box` |  |
| 자작나무 수납 캐비닛 | `refurbished_furniture:birch_storage_cabinet` |  |
| 자작나무 저장 항아리 | `refurbished_furniture:birch_storage_jar` |  |
| 얇은 자작나무 테이블 | `refurbished_furniture:birch_table` |  |
| 자작나무 변기 | `refurbished_furniture:birch_toilet` |  |
| 검은색 세면대 | `refurbished_furniture:black_basin` |  |
| 검은색 욕조 | `refurbished_furniture:black_bath` |  |
| 검은색 쿨러 | `refurbished_furniture:black_cooler` |  |
| 검은색 그릴 | `refurbished_furniture:black_grill` |  |
| 검은색 부엌 찬장 | `refurbished_furniture:black_kitchen_cabinetry` |  |
| 부엌 검은색 서랍 | `refurbished_furniture:black_kitchen_drawer` |  |
| 부엌 검은색 싱크대 | `refurbished_furniture:black_kitchen_sink` |  |
| 검은색 주방 수납장 | `refurbished_furniture:black_kitchen_storage_cabinet` |  |
| 검은색 전기 램프 | `refurbished_furniture:black_lamp` |  |
| 검은색 변기 | `refurbished_furniture:black_toilet` |  |
| 검은색 트램펄린 | `refurbished_furniture:black_trampoline` |  |
| 파란색 세면대 | `refurbished_furniture:blue_basin` |  |
| 파란색 욕조 | `refurbished_furniture:blue_bath` |  |
| 파란색 쿨러 | `refurbished_furniture:blue_cooler` |  |
| 파란색 그릴 | `refurbished_furniture:blue_grill` |  |
| 파란색 부엌 찬장 | `refurbished_furniture:blue_kitchen_cabinetry` |  |
| 파란색 부엌 서랍 | `refurbished_furniture:blue_kitchen_drawer` |  |
| 부엌 파란색 싱크대 | `refurbished_furniture:blue_kitchen_sink` |  |
| 파란색 주방 수납장 | `refurbished_furniture:blue_kitchen_storage_cabinet` |  |
| 파란색 전기 램프 | `refurbished_furniture:blue_lamp` |  |
| 파란색 변기 | `refurbished_furniture:blue_toilet` |  |
| 파란색 트램펄린 | `refurbished_furniture:blue_trampoline` |  |
| 갈색 세면대 | `refurbished_furniture:brown_basin` |  |
| 갈색 욕조 | `refurbished_furniture:brown_bath` |  |
| 갈색 쿨러 | `refurbished_furniture:brown_cooler` |  |
| 갈색 그릴 | `refurbished_furniture:brown_grill` |  |
| 갈색 부엌 찬장 | `refurbished_furniture:brown_kitchen_cabinetry` |  |
| 갈색 부엌 서랍 | `refurbished_furniture:brown_kitchen_drawer` |  |
| 부엌 갈색 싱크대 | `refurbished_furniture:brown_kitchen_sink` |  |
| 갈색 주방 수납장 | `refurbished_furniture:brown_kitchen_storage_cabinet` |  |
| 갈색 전기 램프 | `refurbished_furniture:brown_lamp` |  |
| 갈색 변기 | `refurbished_furniture:brown_toilet` |  |
| 갈색 트램펄린 | `refurbished_furniture:brown_trampoline` |  |
| 벚꽃 세면대 | `refurbished_furniture:cherry_basin` |  |
| 벚나무 욕조 | `refurbished_furniture:cherry_bath` |  |
| 벚나무 의자 | `refurbished_furniture:cherry_chair` |  |
| 벚나무 상자 | `refurbished_furniture:cherry_crate` |  |
| 벚나무 도마 | `refurbished_furniture:cherry_cutting_board` |  |
| 벚꽃 어두운 천장 팬 | `refurbished_furniture:cherry_dark_ceiling_fan` |  |
| 얇은 벚나무 책상 | `refurbished_furniture:cherry_desk` |  |
| 벚나무 서랍 | `refurbished_furniture:cherry_drawer` |  |
| 벚나무 부엌 찬장 | `refurbished_furniture:cherry_kitchen_cabinetry` |  |
| 벚나무 부엌 서랍 | `refurbished_furniture:cherry_kitchen_drawer` |  |
| 벚나무 부엌 싱크대 | `refurbished_furniture:cherry_kitchen_sink` |  |
| 벚나무 주방 수납장 | `refurbished_furniture:cherry_kitchen_storage_cabinet` |  |
| 벚나무 천장 조명 선풍기 | `refurbished_furniture:cherry_light_ceiling_fan` |  |
| 벚나무 우편함 | `refurbished_furniture:cherry_mail_box` |  |
| 벚나무 수납 캐비닛 | `refurbished_furniture:cherry_storage_cabinet` |  |
| 벚나무 저장 항아리 | `refurbished_furniture:cherry_storage_jar` |  |
| 얇은 벚나무 테이블 | `refurbished_furniture:cherry_table` |  |
| 벚꽃 변기 | `refurbished_furniture:cherry_toilet` |  |
| 컴퓨터 | `refurbished_furniture:computer` |  |
| 크림슨 세면대 | `refurbished_furniture:crimson_basin` |  |
| 진홍색 욕조 | `refurbished_furniture:crimson_bath` |  |
| 진홍빛 의자 | `refurbished_furniture:crimson_chair` |  |
| 진홍빛 상자 | `refurbished_furniture:crimson_crate` |  |
| 진홍빛 도마 | `refurbished_furniture:crimson_cutting_board` |  |
| 진홍빛 어두운 천장 팬 | `refurbished_furniture:crimson_dark_ceiling_fan` |  |
| 얇은 진홍빛 책상 | `refurbished_furniture:crimson_desk` |  |
| 진홍빛 서랍 | `refurbished_furniture:crimson_drawer` |  |
| 진홍빛 부엌 찬장 | `refurbished_furniture:crimson_kitchen_cabinetry` |  |
| 진홍빛 부엌 서랍 | `refurbished_furniture:crimson_kitchen_drawer` |  |
| 진홍빛 부엌 싱크대 | `refurbished_furniture:crimson_kitchen_sink` |  |
| 진홍빛 주방 수납장 | `refurbished_furniture:crimson_kitchen_storage_cabinet` |  |
| 진홍빛 천장 조명 선풍기 | `refurbished_furniture:crimson_light_ceiling_fan` |  |
| 진홍빛 우편함 | `refurbished_furniture:crimson_mail_box` |  |
| 진홍빛 수납 캐비닛 | `refurbished_furniture:crimson_storage_cabinet` |  |
| 진홍빛 저장 항아리 | `refurbished_furniture:crimson_storage_jar` |  |
| 얇은 진홍빛 테이블 | `refurbished_furniture:crimson_table` |  |
| 크림슨 변기 | `refurbished_furniture:crimson_toilet` |  |
| 청록색 세면대 | `refurbished_furniture:cyan_basin` |  |
| 청록색 욕조 | `refurbished_furniture:cyan_bath` |  |
| 청록색 쿨러 | `refurbished_furniture:cyan_cooler` |  |
| 청록색 그릴 | `refurbished_furniture:cyan_grill` |  |
| 청록색 부엌 찬장 | `refurbished_furniture:cyan_kitchen_cabinetry` |  |
| 청록색 부엌 서랍 | `refurbished_furniture:cyan_kitchen_drawer` |  |
| 부엌 청록색 싱크대 | `refurbished_furniture:cyan_kitchen_sink` |  |
| 청록색 주방 수납장 | `refurbished_furniture:cyan_kitchen_storage_cabinet` |  |
| 청록색 전기 램프 | `refurbished_furniture:cyan_lamp` |  |
| 청록색 변기 | `refurbished_furniture:cyan_toilet` |  |
| 청록색 트램펄린 | `refurbished_furniture:cyan_trampoline` |  |
| 어두운 천장 조명 | `refurbished_furniture:dark_ceiling_light` |  |
| 어두운 전기 발전기 | `refurbished_furniture:dark_electricity_generator` |  |
| 어두운 색 냉장고 | `refurbished_furniture:dark_fridge` |  |
| 어두운 색 전등 스위치 | `refurbished_furniture:dark_lightswitch` |  |
| 어두운 색 전자레인지 | `refurbished_furniture:dark_microwave` |  |
| 어두운 참나무 세면대 | `refurbished_furniture:dark_oak_basin` |  |
| 어두운 참나무 욕조 | `refurbished_furniture:dark_oak_bath` |  |
| 짙은 참나무 의자 | `refurbished_furniture:dark_oak_chair` |  |
| 짙은 참나무 상자 | `refurbished_furniture:dark_oak_crate` |  |
| 짙은 참나무 도마 | `refurbished_furniture:dark_oak_cutting_board` |  |
| 짙은 참나무 어두운 천장 팬 | `refurbished_furniture:dark_oak_dark_ceiling_fan` |  |
| 얇은 짙은 참나무 책상 | `refurbished_furniture:dark_oak_desk` |  |
| 짙은 참나무 서랍 | `refurbished_furniture:dark_oak_drawer` |  |
| 짙은 참나무 부엌 찬장 | `refurbished_furniture:dark_oak_kitchen_cabinetry` |  |
| 짙은 참나무 부엌 서랍 | `refurbished_furniture:dark_oak_kitchen_drawer` |  |
| 짙은 참나무 부엌 싱크대 | `refurbished_furniture:dark_oak_kitchen_sink` |  |
| 짙은 참나무 주방 수납장 | `refurbished_furniture:dark_oak_kitchen_storage_cabinet` |  |
| 짙은 참나무 천장 조명 선풍기 | `refurbished_furniture:dark_oak_light_ceiling_fan` |  |
| 짙은 참나무 우편함 | `refurbished_furniture:dark_oak_mail_box` |  |
| 짙은 참나무 수납 캐비닛 | `refurbished_furniture:dark_oak_storage_cabinet` |  |
| 짙은 참나무 저장 항아리 | `refurbished_furniture:dark_oak_storage_jar` |  |
| 얇은 짙은 참나무 테이블 | `refurbished_furniture:dark_oak_table` |  |
| 어두운 참나무 변기 | `refurbished_furniture:dark_oak_toilet` |  |
| 짙은 색 레인지 후드 | `refurbished_furniture:dark_range_hood` |  |
| 어두운 색 스토브 | `refurbished_furniture:dark_stove` |  |
| 어두운 색 토스터 | `refurbished_furniture:dark_toaster` |  |
| 현관 매트 | `refurbished_furniture:door_mat` |  |
| 초인종 | `refurbished_furniture:doorbell` |  |
| 프라이팬 | `refurbished_furniture:frying_pan` |  |
| 회색 세면대 | `refurbished_furniture:gray_basin` |  |
| 회색 욕조 | `refurbished_furniture:gray_bath` |  |
| 회색 쿨러 | `refurbished_furniture:gray_cooler` |  |
| 회색 그릴 | `refurbished_furniture:gray_grill` |  |
| 회색 부엌 찬장 | `refurbished_furniture:gray_kitchen_cabinetry` |  |
| 회색 부엌 서랍 | `refurbished_furniture:gray_kitchen_drawer` |  |
| 부엌 회색 싱크대 | `refurbished_furniture:gray_kitchen_sink` |  |
| 회색 주방 수납장 | `refurbished_furniture:gray_kitchen_storage_cabinet` |  |
| 회색 전기 램프 | `refurbished_furniture:gray_lamp` |  |
| 회색 변기 | `refurbished_furniture:gray_toilet` |  |
| 회색 트램펄린 | `refurbished_furniture:gray_trampoline` |  |
| 초록색 세면대 | `refurbished_furniture:green_basin` |  |
| 초록색 욕조 | `refurbished_furniture:green_bath` |  |
| 초록색 쿨러 | `refurbished_furniture:green_cooler` |  |
| 초록색 그릴 | `refurbished_furniture:green_grill` |  |
| 초록색 부엌 찬장 | `refurbished_furniture:green_kitchen_cabinetry` |  |
| 부엌 초록색 서랍 | `refurbished_furniture:green_kitchen_drawer` |  |
| 부엌 초록색 싱크대 | `refurbished_furniture:green_kitchen_sink` |  |
| 초록색 주방 수납장 | `refurbished_furniture:green_kitchen_storage_cabinet` |  |
| 초록색 전기 램프 | `refurbished_furniture:green_lamp` |  |
| 초록색 변기 | `refurbished_furniture:green_toilet` |  |
| 초록색 트램펄린 | `refurbished_furniture:green_trampoline` |  |
| 정글 세면대 | `refurbished_furniture:jungle_basin` |  |
| 정글 욕조 | `refurbished_furniture:jungle_bath` |  |
| 정글 의자 | `refurbished_furniture:jungle_chair` |  |
| 정글 상자 | `refurbished_furniture:jungle_crate` |  |
| 정글나무 도마 | `refurbished_furniture:jungle_cutting_board` |  |
| 정글나무 어두운 천장 팬 | `refurbished_furniture:jungle_dark_ceiling_fan` |  |
| 얇은 정글 책상 | `refurbished_furniture:jungle_desk` |  |
| 정글 서랍 | `refurbished_furniture:jungle_drawer` |  |
| 정글 부엌 찬장 | `refurbished_furniture:jungle_kitchen_cabinetry` |  |
| 정글 부엌 서랍 | `refurbished_furniture:jungle_kitchen_drawer` |  |
| 정글 부엌 싱크대 | `refurbished_furniture:jungle_kitchen_sink` |  |
| 정글 주방 수납장 | `refurbished_furniture:jungle_kitchen_storage_cabinet` |  |
| 정글나무 천장 조명 선풍기 | `refurbished_furniture:jungle_light_ceiling_fan` |  |
| 정글나무 우편함 | `refurbished_furniture:jungle_mail_box` |  |
| 정글 수납 캐비닛 | `refurbished_furniture:jungle_storage_cabinet` |  |
| 정글나무 저장 항아리 | `refurbished_furniture:jungle_storage_jar` |  |
| 얇은 정글나무 테이블 | `refurbished_furniture:jungle_table` |  |
| 정글 변기 | `refurbished_furniture:jungle_toilet` |  |
| 하늘색 세면대 | `refurbished_furniture:light_blue_basin` |  |
| 하늘색 욕조 | `refurbished_furniture:light_blue_bath` |  |
| 하늘색 쿨러 | `refurbished_furniture:light_blue_cooler` |  |
| 하늘색 그릴 | `refurbished_furniture:light_blue_grill` |  |
| 하늘색 부엌 찬장 | `refurbished_furniture:light_blue_kitchen_cabinetry` |  |
| 하늘색 부엌 서랍 | `refurbished_furniture:light_blue_kitchen_drawer` |  |
| 부엌 하늘색 싱크대 | `refurbished_furniture:light_blue_kitchen_sink` |  |
| 하늘색 주방 수납장 | `refurbished_furniture:light_blue_kitchen_storage_cabinet` |  |
| 하늘색 전기 램프 | `refurbished_furniture:light_blue_lamp` |  |
| 하늘색 변기 | `refurbished_furniture:light_blue_toilet` |  |
| 하늘색 트램펄린 | `refurbished_furniture:light_blue_trampoline` |  |
| 밝은 색 천장 조명 | `refurbished_furniture:light_ceiling_light` |  |
| 전기 발전기 | `refurbished_furniture:light_electricity_generator` |  |
| 밝은 색 냉장고 | `refurbished_furniture:light_fridge` |  |
| 회백색 세면대 | `refurbished_furniture:light_gray_basin` |  |
| 회백색 욕조 | `refurbished_furniture:light_gray_bath` |  |
| 회백색 쿨러 | `refurbished_furniture:light_gray_cooler` |  |
| 회백색 그릴 | `refurbished_furniture:light_gray_grill` |  |
| 회백색 부엌 찬장 | `refurbished_furniture:light_gray_kitchen_cabinetry` |  |
| 회백색 부엌 서랍 | `refurbished_furniture:light_gray_kitchen_drawer` |  |
| 부엌 회백색 싱크대 | `refurbished_furniture:light_gray_kitchen_sink` |  |
| 회백색 주방 수납장 | `refurbished_furniture:light_gray_kitchen_storage_cabinet` |  |
| 회백색 전기 램프 | `refurbished_furniture:light_gray_lamp` |  |
| 회백색 변기 | `refurbished_furniture:light_gray_toilet` |  |
| 회백색 트램펄린 | `refurbished_furniture:light_gray_trampoline` |  |
| 밝은 색 전등 스위치 | `refurbished_furniture:light_lightswitch` |  |
| 밝은 색 전자레인지 | `refurbished_furniture:light_microwave` |  |
| 연한 색 레인지 후드 | `refurbished_furniture:light_range_hood` |  |
| 밝은 색 스토브 | `refurbished_furniture:light_stove` |  |
| 밝은 색 토스터 | `refurbished_furniture:light_toaster` |  |
| 연두색 세면대 | `refurbished_furniture:lime_basin` |  |
| 연두색 욕조 | `refurbished_furniture:lime_bath` |  |
| 연두색 쿨러 | `refurbished_furniture:lime_cooler` |  |
| 연두색 그릴 | `refurbished_furniture:lime_grill` |  |
| 연두색 부엌 찬장 | `refurbished_furniture:lime_kitchen_cabinetry` |  |
| 연두색 부엌 서랍 | `refurbished_furniture:lime_kitchen_drawer` |  |
| 부엌 연두색 싱크대 | `refurbished_furniture:lime_kitchen_sink` |  |
| 연두색 주방 수납장 | `refurbished_furniture:lime_kitchen_storage_cabinet` |  |
| 연두색 전기 램프 | `refurbished_furniture:lime_lamp` |  |
| 연두색 변기 | `refurbished_furniture:lime_toilet` |  |
| 연두색 트램펄린 | `refurbished_furniture:lime_trampoline` |  |
| 자홍색 세면대 | `refurbished_furniture:magenta_basin` |  |
| 마젠타색 욕조 | `refurbished_furniture:magenta_bath` |  |
| 자홍색 쿨러 | `refurbished_furniture:magenta_cooler` |  |
| 자홍색 그릴 | `refurbished_furniture:magenta_grill` |  |
| 자홍색 부엌 찬장 | `refurbished_furniture:magenta_kitchen_cabinetry` |  |
| 자홍색 부엌 서랍 | `refurbished_furniture:magenta_kitchen_drawer` |  |
| 부엌 자홍색 싱크대 | `refurbished_furniture:magenta_kitchen_sink` |  |
| 자홍색 주방 수납장 | `refurbished_furniture:magenta_kitchen_storage_cabinet` |  |
| 자홍색 전기 램프 | `refurbished_furniture:magenta_lamp` |  |
| 자홍색 변기 | `refurbished_furniture:magenta_toilet` |  |
| 자홍색 트램펄린 | `refurbished_furniture:magenta_trampoline` |  |
| 맹그로브 세면대 | `refurbished_furniture:mangrove_basin` |  |
| 맹그로브나무 욕조 | `refurbished_furniture:mangrove_bath` |  |
| 맹그로브나무 의자 | `refurbished_furniture:mangrove_chair` |  |
| 맹그로브나무 상자 | `refurbished_furniture:mangrove_crate` |  |
| 맹그로브나무 도마 | `refurbished_furniture:mangrove_cutting_board` |  |
| 맹그로브 어두운 천장 팬 | `refurbished_furniture:mangrove_dark_ceiling_fan` |  |
| 얇은 맹그로브나무 책상 | `refurbished_furniture:mangrove_desk` |  |
| 맹그로브나무 서랍 | `refurbished_furniture:mangrove_drawer` |  |
| 맹그로브나무 부엌 찬장 | `refurbished_furniture:mangrove_kitchen_cabinetry` |  |
| 맹그로브나무 부엌 서랍 | `refurbished_furniture:mangrove_kitchen_drawer` |  |
| 맹그로브나무 부엌 싱크대 | `refurbished_furniture:mangrove_kitchen_sink` |  |
| 맹그로브 주방 수납장 | `refurbished_furniture:mangrove_kitchen_storage_cabinet` |  |
| 맹그로브나무 천장 조명 선풍기 | `refurbished_furniture:mangrove_light_ceiling_fan` |  |
| 맹그로브나무 우편함 | `refurbished_furniture:mangrove_mail_box` |  |
| 맹그로브 수납 캐비닛 | `refurbished_furniture:mangrove_storage_cabinet` |  |
| 맹그로브나무 저장 항아리 | `refurbished_furniture:mangrove_storage_jar` |  |
| 얇은 맹그로브나무 테이블 | `refurbished_furniture:mangrove_table` |  |
| 맹그로브 변기 | `refurbished_furniture:mangrove_toilet` |  |
| 오크 세면대 | `refurbished_furniture:oak_basin` |  |
| 오크 욕조 | `refurbished_furniture:oak_bath` |  |
| 참나무 의자 | `refurbished_furniture:oak_chair` |  |
| 참나무 상자 | `refurbished_furniture:oak_crate` |  |
| 참나무 도마 | `refurbished_furniture:oak_cutting_board` |  |
| 참나무 어두운 천장 팬 | `refurbished_furniture:oak_dark_ceiling_fan` |  |
| 얇은 참나무 책상 | `refurbished_furniture:oak_desk` |  |
| 참나무 서랍 | `refurbished_furniture:oak_drawer` |  |
| 참나무 부엌 찬장 | `refurbished_furniture:oak_kitchen_cabinetry` |  |
| 참나무 부엌 서랍 | `refurbished_furniture:oak_kitchen_drawer` |  |
| 참나무 부엌 싱크대 | `refurbished_furniture:oak_kitchen_sink` |  |
| 참나무 주방 수납장 | `refurbished_furniture:oak_kitchen_storage_cabinet` |  |
| 참나무 천장 조명 선풍기 | `refurbished_furniture:oak_light_ceiling_fan` |  |
| 참나무 우편함 | `refurbished_furniture:oak_mail_box` |  |
| 참나무 수납 캐비닛 | `refurbished_furniture:oak_storage_cabinet` |  |
| 참나무 저장 항아리 | `refurbished_furniture:oak_storage_jar` |  |
| 얇은 참나무 테이블 | `refurbished_furniture:oak_table` |  |
| 참나무 변기 | `refurbished_furniture:oak_toilet` |  |
| 주황색 세면대 | `refurbished_furniture:orange_basin` |  |
| 주황색 욕조 | `refurbished_furniture:orange_bath` |  |
| 주황색 쿨러 | `refurbished_furniture:orange_cooler` |  |
| 주황색 그릴 | `refurbished_furniture:orange_grill` |  |
| 주황색 부엌 찬장 | `refurbished_furniture:orange_kitchen_cabinetry` |  |
| 주황색 부엌 서랍 | `refurbished_furniture:orange_kitchen_drawer` |  |
| 부엌 주황색 싱크대 | `refurbished_furniture:orange_kitchen_sink` |  |
| 주황색 주방 수납장 | `refurbished_furniture:orange_kitchen_storage_cabinet` |  |
| 주황색 전기 램프 | `refurbished_furniture:orange_lamp` |  |
| 주황색 변기 | `refurbished_furniture:orange_toilet` |  |
| 주황색 트램펄린 | `refurbished_furniture:orange_trampoline` |  |
| 분홍색 세면대 | `refurbished_furniture:pink_basin` |  |
| 분홍색 욕조 | `refurbished_furniture:pink_bath` |  |
| 분홍색 쿨러 | `refurbished_furniture:pink_cooler` |  |
| 분홍색 그릴 | `refurbished_furniture:pink_grill` |  |
| 분홍색 부엌 찬장 | `refurbished_furniture:pink_kitchen_cabinetry` |  |
| 분홍색 부엌 서랍 | `refurbished_furniture:pink_kitchen_drawer` |  |
| 부엌 분홍색 싱크대 | `refurbished_furniture:pink_kitchen_sink` |  |
| 분홍색 주방 수납장 | `refurbished_furniture:pink_kitchen_storage_cabinet` |  |
| 분홍색 전기 램프 | `refurbished_furniture:pink_lamp` |  |
| 분홍색 변기 | `refurbished_furniture:pink_toilet` |  |
| 분홍색 트램펄린 | `refurbished_furniture:pink_trampoline` |  |
| 접시 | `refurbished_furniture:plate` |  |
| 우편함 | `refurbished_furniture:post_box` |  |
| 보라색 세면대 | `refurbished_furniture:purple_basin` |  |
| 보라색 욕조 | `refurbished_furniture:purple_bath` |  |
| 보라색 쿨러 | `refurbished_furniture:purple_cooler` |  |
| 보라색 그릴 | `refurbished_furniture:purple_grill` |  |
| 보라색 부엌 찬장 | `refurbished_furniture:purple_kitchen_cabinetry` |  |
| 보라색 부엌 서랍 | `refurbished_furniture:purple_kitchen_drawer` |  |
| 부엌 보라색 싱크대 | `refurbished_furniture:purple_kitchen_sink` |  |
| 보라색 주방 수납장 | `refurbished_furniture:purple_kitchen_storage_cabinet` |  |
| 보라색 전기 램프 | `refurbished_furniture:purple_lamp` |  |
| 보라색 변기 | `refurbished_furniture:purple_toilet` |  |
| 보라색 트램펄린 | `refurbished_furniture:purple_trampoline` |  |
| 재활용 쓰레기통 | `refurbished_furniture:recycle_bin` |  |
| 빨간색 세면대 | `refurbished_furniture:red_basin` |  |
| 빨간색 욕조 | `refurbished_furniture:red_bath` |  |
| 빨간색 쿨러 | `refurbished_furniture:red_cooler` |  |
| 빨간색 그릴 | `refurbished_furniture:red_grill` |  |
| 빨간색 부엌 찬장 | `refurbished_furniture:red_kitchen_cabinetry` |  |
| 부엌 빨간색 서랍 | `refurbished_furniture:red_kitchen_drawer` |  |
| 부엌 빨간색 싱크대 | `refurbished_furniture:red_kitchen_sink` |  |
| 빨간색 주방 수납장 | `refurbished_furniture:red_kitchen_storage_cabinet` |  |
| 빨간색 전기 램프 | `refurbished_furniture:red_lamp` |  |
| 빨간색 변기 | `refurbished_furniture:red_toilet` |  |
| 빨간색 트램펄린 | `refurbished_furniture:red_trampoline` |  |
| 스프루스 세면대 | `refurbished_furniture:spruce_basin` |  |
| 스프루스 욕조 | `refurbished_furniture:spruce_bath` |  |
| 가문비나무 의자 | `refurbished_furniture:spruce_chair` |  |
| 가문비나무 상자 | `refurbished_furniture:spruce_crate` |  |
| 가문비나무 도마 | `refurbished_furniture:spruce_cutting_board` |  |
| 가문비나무 어두운 천장 팬 | `refurbished_furniture:spruce_dark_ceiling_fan` |  |
| 얇은 가문비나무 책상 | `refurbished_furniture:spruce_desk` |  |
| 가문비나무 서랍 | `refurbished_furniture:spruce_drawer` |  |
| 가문비나무 부엌 찬장 | `refurbished_furniture:spruce_kitchen_cabinetry` |  |
| 가문비나무 부엌 서랍 | `refurbished_furniture:spruce_kitchen_drawer` |  |
| 가문비나무 부엌 싱크대 | `refurbished_furniture:spruce_kitchen_sink` |  |
| 가문비나무 주방 수납장 | `refurbished_furniture:spruce_kitchen_storage_cabinet` |  |
| 가문비나무 천장 조명 선풍기 | `refurbished_furniture:spruce_light_ceiling_fan` |  |
| 가문비나무 우편함 | `refurbished_furniture:spruce_mail_box` |  |
| 가문비나무 수납 캐비닛 | `refurbished_furniture:spruce_storage_cabinet` |  |
| 가문비나무 저장 항아리 | `refurbished_furniture:spruce_storage_jar` |  |
| 얇은 가문비나무 테이블 | `refurbished_furniture:spruce_table` |  |
| 가문비나무 변기 | `refurbished_furniture:spruce_toilet` |  |
| 텔레비전 | `refurbished_furniture:television` |  |
| 휘어진 세면대 | `refurbished_furniture:warped_basin` |  |
| 휘어진 욕조 | `refurbished_furniture:warped_bath` |  |
| 뒤틀린 의자 | `refurbished_furniture:warped_chair` |  |
| 뒤틀린 상자 | `refurbished_furniture:warped_crate` |  |
| 뒤틀린 도마 | `refurbished_furniture:warped_cutting_board` |  |
| 뒤틀린 어두운 천장 팬 | `refurbished_furniture:warped_dark_ceiling_fan` |  |
| 얇은 뒤틀린 책상 | `refurbished_furniture:warped_desk` |  |
| 뒤틀린 서랍 | `refurbished_furniture:warped_drawer` |  |
| 뒤틀린 부엌 찬장 | `refurbished_furniture:warped_kitchen_cabinetry` |  |
| 뒤틀린 부엌 서랍 | `refurbished_furniture:warped_kitchen_drawer` |  |
| 뒤틀린 부엌 싱크대 | `refurbished_furniture:warped_kitchen_sink` |  |
| 뒤틀린 주방 수납장 | `refurbished_furniture:warped_kitchen_storage_cabinet` |  |
| 뒤틀린 천장 조명 선풍기 | `refurbished_furniture:warped_light_ceiling_fan` |  |
| 뒤틀린 우편함 | `refurbished_furniture:warped_mail_box` |  |
| 뒤틀린 수납 캐비닛 | `refurbished_furniture:warped_storage_cabinet` |  |
| 뒤틀린 저장 항아리 | `refurbished_furniture:warped_storage_jar` |  |
| 얇은 뒤틀린 테이블 | `refurbished_furniture:warped_table` |  |
| 휘어진 변기 | `refurbished_furniture:warped_toilet` |  |
| 하얀색 세면대 | `refurbished_furniture:white_basin` |  |
| 하얀색 욕조 | `refurbished_furniture:white_bath` |  |
| 하얀색 쿨러 | `refurbished_furniture:white_cooler` |  |
| 하얀색 그릴 | `refurbished_furniture:white_grill` |  |
| 하얀색 부엌 찬장 | `refurbished_furniture:white_kitchen_cabinetry` |  |
| 하얀색 부엌 서랍 | `refurbished_furniture:white_kitchen_drawer` |  |
| 부엌 하얀색 싱크대 | `refurbished_furniture:white_kitchen_sink` |  |
| 하얀색 주방 수납장 | `refurbished_furniture:white_kitchen_storage_cabinet` |  |
| 하얀색 전기 램프 | `refurbished_furniture:white_lamp` |  |
| 하얀색 변기 | `refurbished_furniture:white_toilet` |  |
| 하얀색 트램펄린 | `refurbished_furniture:white_trampoline` |  |
| 작업대 | `refurbished_furniture:workbench` |  |
| 노란색 세면대 | `refurbished_furniture:yellow_basin` |  |
| 노란색 욕조 | `refurbished_furniture:yellow_bath` |  |
| 노란색 쿨러 | `refurbished_furniture:yellow_cooler` |  |
| 노란색 그릴 | `refurbished_furniture:yellow_grill` |  |
| 노란색 부엌 찬장 | `refurbished_furniture:yellow_kitchen_cabinetry` |  |
| 노란색 부엌 서랍 | `refurbished_furniture:yellow_kitchen_drawer` |  |
| 부엌 노란색 싱크대 | `refurbished_furniture:yellow_kitchen_sink` |  |
| 노란색 주방 수납장 | `refurbished_furniture:yellow_kitchen_storage_cabinet` |  |
| 노란색 전기 램프 | `refurbished_furniture:yellow_lamp` |  |
| 노란색 변기 | `refurbished_furniture:yellow_toilet` |  |
| 노란색 트램펄린 | `refurbished_furniture:yellow_trampoline` |  |

</details>

<details><summary>Snowy Spirit — 36개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Candy Cane Block | `snowyspirit:candy_cane_block` |  |
| Black Glow Lights | `snowyspirit:glow_lights_black` |  |
| Blue Glow Lights | `snowyspirit:glow_lights_blue` |  |
| Brown Glow Lights | `snowyspirit:glow_lights_brown` |  |
| Cyan Glow Lights | `snowyspirit:glow_lights_cyan` |  |
| Gray Glow Lights | `snowyspirit:glow_lights_gray` |  |
| Green Glow Lights | `snowyspirit:glow_lights_green` |  |
| Light Blue Glow Lights | `snowyspirit:glow_lights_light_blue` |  |
| Light Gray Glow Lights | `snowyspirit:glow_lights_light_gray` |  |
| Lime Glow Lights | `snowyspirit:glow_lights_lime` |  |
| Magenta Glow Lights | `snowyspirit:glow_lights_magenta` |  |
| Orange Glow Lights | `snowyspirit:glow_lights_orange` |  |
| Pink Glow Lights | `snowyspirit:glow_lights_pink` |  |
| Prismatic Glow Lights | `snowyspirit:glow_lights_prismatic` |  |
| Purple Glow Lights | `snowyspirit:glow_lights_purple` |  |
| Red Glow Lights | `snowyspirit:glow_lights_red` |  |
| White Glow Lights | `snowyspirit:glow_lights_white` |  |
| Yellow Glow Lights | `snowyspirit:glow_lights_yellow` |  |
| Black Gumdrop | `snowyspirit:gumdrop_black` |  |
| Blue Gumdrop | `snowyspirit:gumdrop_blue` |  |
| Brown Gumdrop | `snowyspirit:gumdrop_brown` |  |
| Cyan Gumdrop | `snowyspirit:gumdrop_cyan` |  |
| Gray Gumdrop | `snowyspirit:gumdrop_gray` |  |
| Green Gumdrop | `snowyspirit:gumdrop_green` |  |
| Light Blue Gumdrop | `snowyspirit:gumdrop_light_blue` |  |
| Light Gray Gumdrop | `snowyspirit:gumdrop_light_gray` |  |
| Lime Gumdrop | `snowyspirit:gumdrop_lime` |  |
| Magenta Gumdrop | `snowyspirit:gumdrop_magenta` |  |
| Orange Gumdrop | `snowyspirit:gumdrop_orange` |  |
| Pink Gumdrop | `snowyspirit:gumdrop_pink` |  |
| Purple Gumdrop | `snowyspirit:gumdrop_purple` |  |
| Red Gumdrop | `snowyspirit:gumdrop_red` |  |
| White Gumdrop | `snowyspirit:gumdrop_white` |  |
| Yellow Gumdrop | `snowyspirit:gumdrop_yellow` |  |
| Snow Globe | `snowyspirit:snow_globe` | 원본 상자 사용 ID |
| 리스 | `snowyspirit:wreath` |  |

</details>

<details><summary>Society KubeJS 장식 — 2개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 노움 | `society:gnome` | 초기화 확인 · 원본 상자 사용 ID |
| 랜턴을 든 노움 | `society:lantern_gnome` | 초기화 확인 |

</details>

<details><summary>Straw Statues — 1개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 짚 인형 | `strawstatues:straw_statue` |  |

</details>

<details><summary>Supplementaries — 139개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Awning | `supplementaries:awning` |  |
| Black Awning | `supplementaries:awning_black` |  |
| Blue Awning | `supplementaries:awning_blue` |  |
| Brown Awning | `supplementaries:awning_brown` |  |
| Cyan Awning | `supplementaries:awning_cyan` |  |
| Gray Awning | `supplementaries:awning_gray` |  |
| Green Awning | `supplementaries:awning_green` |  |
| Light Blue Awning | `supplementaries:awning_light_blue` |  |
| Light Gray Awning | `supplementaries:awning_light_gray` |  |
| Lime Awning | `supplementaries:awning_lime` |  |
| Magenta Awning | `supplementaries:awning_magenta` |  |
| Orange Awning | `supplementaries:awning_orange` |  |
| Pink Awning | `supplementaries:awning_pink` |  |
| Purple Awning | `supplementaries:awning_purple` |  |
| Red Awning | `supplementaries:awning_red` |  |
| White Awning | `supplementaries:awning_white` |  |
| Yellow Awning | `supplementaries:awning_yellow` |  |
| Blackboard | `supplementaries:blackboard` |  |
| Blackstone Lamp | `supplementaries:blackstone_lamp` |  |
| Bunting | `supplementaries:bunting` |  |
| Black Bunting | `supplementaries:bunting_black` |  |
| Blue Bunting | `supplementaries:bunting_blue` |  |
| Brown Bunting | `supplementaries:bunting_brown` |  |
| Cyan Bunting | `supplementaries:bunting_cyan` |  |
| Gray Bunting | `supplementaries:bunting_gray` |  |
| Green Bunting | `supplementaries:bunting_green` |  |
| Light Blue Bunting | `supplementaries:bunting_light_blue` |  |
| Light Gray Bunting | `supplementaries:bunting_light_gray` |  |
| Lime Bunting | `supplementaries:bunting_lime` |  |
| Magenta Bunting | `supplementaries:bunting_magenta` |  |
| Orange Bunting | `supplementaries:bunting_orange` |  |
| Pink Bunting | `supplementaries:bunting_pink` |  |
| Purple Bunting | `supplementaries:bunting_purple` |  |
| Red Bunting | `supplementaries:bunting_red` |  |
| Yellow Bunting | `supplementaries:bunting_yellow` |  |
| Cage | `supplementaries:cage` |  |
| Candle Holder | `supplementaries:candle_holder` |  |
| Black Candle Holder | `supplementaries:candle_holder_black` |  |
| Blue Candle Holder | `supplementaries:candle_holder_blue` |  |
| Brown Candle Holder | `supplementaries:candle_holder_brown` |  |
| Cupric Candle Holder | `supplementaries:candle_holder_cupric` |  |
| Cyan Candle Holder | `supplementaries:candle_holder_cyan` |  |
| Ender Candle Holder | `supplementaries:candle_holder_ender` |  |
| Gray Candle Holder | `supplementaries:candle_holder_gray` |  |
| Green Candle Holder | `supplementaries:candle_holder_green` |  |
| Light Blue Candle Holder | `supplementaries:candle_holder_light_blue` |  |
| Light Gray Candle Holder | `supplementaries:candle_holder_light_gray` |  |
| Lime Candle Holder | `supplementaries:candle_holder_lime` |  |
| Magenta Candle Holder | `supplementaries:candle_holder_magenta` |  |
| Orange Candle Holder | `supplementaries:candle_holder_orange` |  |
| Pink Candle Holder | `supplementaries:candle_holder_pink` |  |
| Purple Candle Holder | `supplementaries:candle_holder_purple` |  |
| Red Candle Holder | `supplementaries:candle_holder_red` |  |
| Soul Candle Holder | `supplementaries:candle_holder_soul` |  |
| Spectacle Candle Holder | `supplementaries:candle_holder_spectacle` |  |
| White Candle Holder | `supplementaries:candle_holder_white` |  |
| Yellow Candle Holder | `supplementaries:candle_holder_yellow` |  |
| Clock Block | `supplementaries:clock_block` | 원본 상자 사용 ID |
| Crystal Display | `supplementaries:crystal_display` |  |
| Deepslate Lamp | `supplementaries:deepslate_lamp` |  |
| Doormat | `supplementaries:doormat` |  |
| End Stone Lamp | `supplementaries:end_stone_lamp` |  |
| Faucet | `supplementaries:faucet` |  |
| Fire Pit | `supplementaries:fire_pit` |  |
| Black Flag | `supplementaries:flag_black` |  |
| Blue Flag | `supplementaries:flag_blue` |  |
| Brown Flag | `supplementaries:flag_brown` |  |
| Cyan Flag | `supplementaries:flag_cyan` |  |
| Gray Flag | `supplementaries:flag_gray` |  |
| Green Flag | `supplementaries:flag_green` |  |
| Light Blue Flag | `supplementaries:flag_light_blue` |  |
| Light Gray Flag | `supplementaries:flag_light_gray` |  |
| Lime Flag | `supplementaries:flag_lime` |  |
| Magenta Flag | `supplementaries:flag_magenta` |  |
| Orange Flag | `supplementaries:flag_orange` |  |
| Pink Flag | `supplementaries:flag_pink` |  |
| Purple Flag | `supplementaries:flag_purple` |  |
| Red Flag | `supplementaries:flag_red` |  |
| White Flag | `supplementaries:flag_white` |  |
| Yellow Flag | `supplementaries:flag_yellow` |  |
| 높은 화분 상자 | `supplementaries:flower_box` |  |
| Globe | `supplementaries:globe` |  |
| Sepia Globe | `supplementaries:globe_sepia` |  |
| Goblet | `supplementaries:goblet` |  |
| Hat Stand | `supplementaries:hat_stand` |  |
| Hourglass | `supplementaries:hourglass` |  |
| Item Shelf | `supplementaries:item_shelf` |  |
| Jar | `supplementaries:jar` |  |
| Boat in a Jar | `supplementaries:jar_boat` |  |
| Lunch Basket | `supplementaries:lunch_basket` | 원본 상자 사용 ID |
| Notice Board | `supplementaries:notice_board` |  |
| Pedestal | `supplementaries:pedestal` |  |
| Present | `supplementaries:present` |  |
| Black Present | `supplementaries:present_black` |  |
| Blue Present | `supplementaries:present_blue` |  |
| Brown Present | `supplementaries:present_brown` |  |
| Cyan Present | `supplementaries:present_cyan` |  |
| Gray Present | `supplementaries:present_gray` |  |
| Green Present | `supplementaries:present_green` |  |
| Light Blue Present | `supplementaries:present_light_blue` |  |
| Light Gray Present | `supplementaries:present_light_gray` |  |
| Lime Present | `supplementaries:present_lime` |  |
| Magenta Present | `supplementaries:present_magenta` |  |
| Orange Present | `supplementaries:present_orange` |  |
| Pink Present | `supplementaries:present_pink` |  |
| Purple Present | `supplementaries:present_purple` |  |
| Red Present | `supplementaries:present_red` |  |
| White Present | `supplementaries:present_white` |  |
| Yellow Present | `supplementaries:present_yellow` |  |
| Safe | `supplementaries:safe` |  |
| Sconce | `supplementaries:sconce` |  |
| Ender Sconce | `supplementaries:sconce_ender` |  |
| Glow Sconce | `supplementaries:sconce_glow` |  |
| Cupric Sconce | `supplementaries:sconce_green` |  |
| Sconce Lever | `supplementaries:sconce_lever` |  |
| Nether Brass Sconce | `supplementaries:sconce_nether_brass` |  |
| Soul Sconce | `supplementaries:sconce_soul` |  |
| Statue | `supplementaries:statue` |  |
| Stone Lamp | `supplementaries:stone_lamp` |  |
| Tater in a Jar | `supplementaries:tater_in_a_jar` |  |
| 덫 선물 | `supplementaries:trapped_present` |  |
| 검은색 덫 선물 | `supplementaries:trapped_present_black` |  |
| 파란색 덫 선물 | `supplementaries:trapped_present_blue` |  |
| 갈색 덫 선물 | `supplementaries:trapped_present_brown` |  |
| 청록색 덫 선물 | `supplementaries:trapped_present_cyan` |  |
| 회색 덫 선물 | `supplementaries:trapped_present_gray` |  |
| 초록색 덫 선물 | `supplementaries:trapped_present_green` |  |
| 하늘색 덫 선물 | `supplementaries:trapped_present_light_blue` |  |
| 회백색 덫 선물 | `supplementaries:trapped_present_light_gray` |  |
| 연두색 덫 선물 | `supplementaries:trapped_present_lime` |  |
| 자홍색 덫 선물 | `supplementaries:trapped_present_magenta` |  |
| 주황색 덫 선물 | `supplementaries:trapped_present_orange` |  |
| 분홍색 덫 선물 | `supplementaries:trapped_present_pink` |  |
| 보라색 덫 선물 | `supplementaries:trapped_present_purple` |  |
| 빨간색 덫 선물 | `supplementaries:trapped_present_red` |  |
| 하얀색 덫 선물 | `supplementaries:trapped_present_white` |  |
| 노란색 덫 선물 | `supplementaries:trapped_present_yellow` |  |
| Urn | `supplementaries:urn` |  |
| Wind Vane | `supplementaries:wind_vane` |  |

</details>

<details><summary>Tanuki Decor — 211개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| Developer Mini Figure | `tanukidecor:adv_developer_mini_figure` | 초기화 확인 · 외형/범위 검토 |
| Mayoral Mini Figure | `tanukidecor:adv_mayoral_mini_figure` | 초기화 확인 · 외형/범위 검토 |
| 알람 시계 | `tanukidecor:alarm_clock` | 원본 상자 사용 ID |
| 기념 시계 | `tanukidecor:anniversary_clock` | 원본 상자 사용 ID |
| 앤티크 침대 | `tanukidecor:antique_bed` | 원본 상자 사용 ID |
| 골동품 책장 | `tanukidecor:antique_bookcase` | 원본 상자 사용 ID |
| 골동품 책상 | `tanukidecor:antique_bureau` | 원본 상자 사용 ID |
| 골동품 캐비넷 | `tanukidecor:antique_cabinet` | 원본 상자 사용 ID |
| 앤티크 의자 | `tanukidecor:antique_chair` | 원본 상자 사용 ID |
| 골동품 시계 | `tanukidecor:antique_clock` | 원본 상자 사용 ID |
| 골동품 책상 | `tanukidecor:antique_desk` | 원본 상자 사용 ID |
| 골동품 거울 | `tanukidecor:antique_mirror` | 원본 상자 사용 ID |
| 앤티크 전화기 | `tanukidecor:antique_phone` | 원본 상자 사용 ID |
| 앤티크 라디오 | `tanukidecor:antique_radio` | 원본 상자 사용 ID |
| 앤티크 작은 테이블 | `tanukidecor:antique_small_table` | 원본 상자 사용 ID |
| 도일리가 있는 앤티크 작은 테이블 | `tanukidecor:antique_small_table_with_doily` | 원본 상자 사용 ID |
| 앤티크 소파 | `tanukidecor:antique_sofa` | 원본 상자 사용 ID |
| 앤티크 테이블 | `tanukidecor:antique_table` | 원본 상자 사용 ID |
| 앤티크 벽 오일 램프 | `tanukidecor:antique_wall_oil_lamp` | 원본 상자 사용 ID |
| 골동품 벽 선반 | `tanukidecor:antique_wall_shelf` | 원본 상자 사용 ID |
| 골동품 옷장 | `tanukidecor:antique_wardrobe` | 원본 상자 사용 ID |
| 밴조 시계 | `tanukidecor:banjo_clock` | 원본 상자 사용 ID |
| 새장 | `tanukidecor:birdcage` | 원본 상자 사용 ID |
| 파란색 침대 | `tanukidecor:blue_bed` | 원본 상자 사용 ID |
| 파란색 벤치 | `tanukidecor:blue_bench` | 원본 상자 사용 ID |
| 파란색 책장 | `tanukidecor:blue_bookshelf` | 원본 상자 사용 ID |
| 파란색 캐비넷 | `tanukidecor:blue_bureau` | 원본 상자 사용 ID |
| 파란색 캐비넷 | `tanukidecor:blue_cabinet` | 원본 상자 사용 ID |
| 파란색 의자 | `tanukidecor:blue_chair` | 원본 상자 사용 ID |
| 파란색 시계 | `tanukidecor:blue_clock` | 원본 상자 사용 ID |
| 파란색 서랍장 | `tanukidecor:blue_dresser` | 원본 상자 사용 ID |
| 파란색 램프 | `tanukidecor:blue_lamp` | 원본 상자 사용 ID |
| 파란색 로켓 램프 | `tanukidecor:blue_rocket_lamp` | 원본 상자 사용 ID |
| 파란색 과학 포드 | `tanukidecor:blue_science_pod` | 원본 상자 사용 ID |
| 파란색 가판대 덮개 | `tanukidecor:blue_stall_tarp` | 원본 상자 사용 ID |
| 파란색 테이블 | `tanukidecor:blue_table` | 원본 상자 사용 ID |
| 파란색 벽 덮개 | `tanukidecor:blue_wall_tarp` | 원본 상자 사용 ID |
| 파란색 옷장 | `tanukidecor:blue_wardrobe` | 원본 상자 사용 ID |
| 갈색 버섯 침대 | `tanukidecor:brown_mushroom_bed` | 원본 상자 사용 ID |
| 갈색 버섯 램프 | `tanukidecor:brown_mushroom_lamp` | 원본 상자 사용 ID |
| 갈색 버섯 원목 스툴 | `tanukidecor:brown_mushroom_log_stool` | 원본 상자 사용 ID |
| 갈색 버섯 스툴 | `tanukidecor:brown_mushroom_stool` | 원본 상자 사용 ID |
| 갈색 버섯 테이블 | `tanukidecor:brown_mushroom_table` | 원본 상자 사용 ID |
| 카바나 안락의자 | `tanukidecor:cabana_armchair` | 원본 상자 사용 ID |
| 카바나 침대 | `tanukidecor:cabana_bed` | 원본 상자 사용 ID |
| 카바나 책장 | `tanukidecor:cabana_bookcase` | 원본 상자 사용 ID |
| 카바나 의자 | `tanukidecor:cabana_chair` | 원본 상자 사용 ID |
| 카바나 서랍장 | `tanukidecor:cabana_dresser` | 원본 상자 사용 ID |
| 카바나 램프 | `tanukidecor:cabana_lamp` | 원본 상자 사용 ID |
| 카바나 칸막이 | `tanukidecor:cabana_screen` | 원본 상자 사용 ID |
| 카바나 테이블 | `tanukidecor:cabana_table` | 원본 상자 사용 ID |
| 카바나 화장대 | `tanukidecor:cabana_vanity` | 원본 상자 사용 ID |
| 카바나 옷장 | `tanukidecor:cabana_wardrobe` | 원본 상자 사용 ID |
| 휴대용 시계 | `tanukidecor:carriage_clock` | 원본 상자 사용 ID |
| 금전 등록기 | `tanukidecor:cash_register` | 원본 상자 사용 ID |
| 클래식 꽃병 | `tanukidecor:classic_vase` | 원본 상자 사용 ID |
| 크리스탈 시계 | `tanukidecor:crystal_clock` | 원본 상자 사용 ID |
| 뻐꾸기 시계 | `tanukidecor:cuckoo_clock` | 원본 상자 사용 ID |
| 디저트 케이스 | `tanukidecor:dessert_case` | 원본 상자 사용 ID |
| 진열장 | `tanukidecor:display_case` | 원본 상자 사용 ID |
| 진열 시계 | `tanukidecor:display_watch` | 원본 상자 사용 ID |
| DIY 작업대 | `tanukidecor:diy_workbench` | 외형/범위 검토 |
| 이집트 침대 | `tanukidecor:egyptian_bed` | 원본 상자 사용 ID |
| 이집트 의자 | `tanukidecor:egyptian_chair` | 원본 상자 사용 ID |
| 이집트 문장 | `tanukidecor:egyptian_crest` | 원본 상자 사용 ID |
| 이집트 램프 | `tanukidecor:egyptian_lamp` | 원본 상자 사용 ID |
| 이집트 테이블 | `tanukidecor:egyptian_table` | 원본 상자 사용 ID |
| 우아한 새장 | `tanukidecor:elegant_birdcage` | 원본 상자 사용 ID |
| 엠블럼 시계 | `tanukidecor:emblem_clock` | 원본 상자 사용 ID |
| 화려한 꽃병 | `tanukidecor:fancy_vase` | 원본 상자 사용 ID |
| 장작 | `tanukidecor:firewood` | 원본 상자 사용 ID |
| 폴리엇 시계 | `tanukidecor:foliot_clock` | 원본 상자 사용 ID |
| 진저브레드 시계 | `tanukidecor:gingerbread_clock` | 원본 상자 사용 ID |
| 지구본 | `tanukidecor:globe` | 원본 상자 사용 ID |
| 발광 이끼 항아리 | `tanukidecor:glowing_moss_jar` | 원본 상자 사용 ID |
| 화려한 침대 | `tanukidecor:gorgeous_bed` | 원본 상자 사용 ID |
| 화려한 장식장 | `tanukidecor:gorgeous_chest` | 원본 상자 사용 ID |
| 화려한 시계 | `tanukidecor:gorgeous_clock` | 원본 상자 사용 ID |
| 화려한 붙박이장 | `tanukidecor:gorgeous_closet` | 원본 상자 사용 ID |
| 화려한 카운터 | `tanukidecor:gorgeous_counter` | 원본 상자 사용 ID |
| 화려한 책상 | `tanukidecor:gorgeous_desk` | 원본 상자 사용 ID |
| 화려한 램프 | `tanukidecor:gorgeous_lamp` | 원본 상자 사용 ID |
| 화려한 미니 서랍 | `tanukidecor:gorgeous_mini_drawer` | 원본 상자 사용 ID |
| 화려한 의자 | `tanukidecor:gorgeous_seat` | 원본 상자 사용 ID |
| 화려한 소파 | `tanukidecor:gorgeous_sofa` | 원본 상자 사용 ID |
| 화려한 스툴 | `tanukidecor:gorgeous_stool` | 원본 상자 사용 ID |
| 화려한 테이블 | `tanukidecor:gorgeous_table` | 원본 상자 사용 ID |
| 괘종시계 | `tanukidecor:grandfather_clock` | 원본 상자 사용 ID |
| 초록색 침대 | `tanukidecor:green_bed` | 원본 상자 사용 ID |
| 초록색 벤치 | `tanukidecor:green_bench` | 원본 상자 사용 ID |
| 초록색 의자 | `tanukidecor:green_chair` | 원본 상자 사용 ID |
| 초록색 시계 | `tanukidecor:green_clock` | 원본 상자 사용 ID |
| 초록색 카운터 | `tanukidecor:green_counter` | 원본 상자 사용 ID |
| 초록색 책상 | `tanukidecor:green_desk` | 원본 상자 사용 ID |
| 초록색 서랍장 | `tanukidecor:green_dresser` | 원본 상자 사용 ID |
| 초록색 램프 | `tanukidecor:green_lamp` | 원본 상자 사용 ID |
| 초록색 미니 서랍 | `tanukidecor:green_mini_drawer` | 원본 상자 사용 ID |
| 초록색 식료품 저장실 | `tanukidecor:green_pantry` | 원본 상자 사용 ID |
| 초록색 로켓 램프 | `tanukidecor:green_rocket_lamp` | 원본 상자 사용 ID |
| 초록색 과학 포드 | `tanukidecor:green_science_pod` | 원본 상자 사용 ID |
| 초록색 가판대 덮개 | `tanukidecor:green_stall_tarp` | 원본 상자 사용 ID |
| 초록색 테이블 | `tanukidecor:green_table` | 원본 상자 사용 ID |
| 초록색 벽 덮개 | `tanukidecor:green_wall_tarp` | 원본 상자 사용 ID |
| 초록색 옷장 | `tanukidecor:green_wardrobe` | 원본 상자 사용 ID |
| 껌볼 머신 | `tanukidecor:gumball_machine` | 원본 상자 사용 ID |
| 손수레 | `tanukidecor:handcart` | 원본 상자 사용 ID |
| 휴일 트리 | `tanukidecor:holiday_tree` | 원본 상자 사용 ID |
| 모래시계 | `tanukidecor:hourglass` | 원본 상자 사용 ID |
| 랜턴 시계 | `tanukidecor:lantern_clock` | 원본 상자 사용 ID |
| 대형 시계탑 문자판 | `tanukidecor:large_clock_tower_dial` | 원본 상자 사용 ID |
| 큰 화려한 꽃병 | `tanukidecor:large_fancy_vase` | 원본 상자 사용 ID |
| 대형 벽난로 | `tanukidecor:large_fireplace` | 원본 상자 사용 ID |
| 큰 줄무늬 꽃병 | `tanukidecor:large_striped_vase` | 원본 상자 사용 ID |
| 도서관 시계 | `tanukidecor:library_clock` | 원본 상자 사용 ID |
| 원목 벤치 | `tanukidecor:log_bench` | 원본 상자 사용 ID |
| 원목 스툴 | `tanukidecor:log_stool` | 원본 상자 사용 ID |
| 긴 진열장 | `tanukidecor:long_display_case` | 원본 상자 사용 ID |
| 벽난로 시계 | `tanukidecor:mantle_clock` | 원본 상자 사용 ID |
| 메트로놈 | `tanukidecor:metronome` | 원본 상자 사용 ID |
| 미니멀리스트 침대 | `tanukidecor:minimalist_bed` | 원본 상자 사용 ID |
| 미니멀리스트 의자 | `tanukidecor:minimalist_chair` | 원본 상자 사용 ID |
| 미니멀리즘 시계 | `tanukidecor:minimalist_clock` | 원본 상자 사용 ID |
| 미니멀리스트 소파 | `tanukidecor:minimalist_couch` | 원본 상자 사용 ID · 외형/범위 검토 |
| 미니멀리스트 서랍장 | `tanukidecor:minimalist_dresser` | 원본 상자 사용 ID |
| 미니멀리스트 램프 | `tanukidecor:minimalist_lamp` | 원본 상자 사용 ID |
| 미니멀리스트 거울 | `tanukidecor:minimalist_mirror` | 원본 상자 사용 ID |
| 미니멀리스트 작은 테이블 | `tanukidecor:minimalist_small_table` | 원본 상자 사용 ID |
| 미니멀리스트 스툴 | `tanukidecor:minimalist_stool` | 원본 상자 사용 ID |
| 미니멀리스트 테이블 | `tanukidecor:minimalist_table` | 원본 상자 사용 ID |
| 미니멀리스트 옷장 | `tanukidecor:minimalist_wardrobe` | 원본 상자 사용 ID |
| 좁은 파란색 끈 장식 | `tanukidecor:narrow_blue_streamer` | 원본 상자 사용 ID |
| 좁은 초록색 끈 장식 | `tanukidecor:narrow_green_streamer` | 원본 상자 사용 ID |
| 좁은 빨간색 끈 장식 | `tanukidecor:narrow_red_streamer` | 원본 상자 사용 ID |
| 좁은 전구 | `tanukidecor:narrow_string_lights` | 원본 상자 사용 ID |
| 좁은 노란색 끈 장식 | `tanukidecor:narrow_yellow_streamer` | 원본 상자 사용 ID |
| 네온 클럽 간판 | `tanukidecor:neon_club_sign` | 원본 상자 사용 ID |
| 네온 다이아몬드 간판 | `tanukidecor:neon_diamond_sign` | 원본 상자 사용 ID |
| 네온 하트 간판 | `tanukidecor:neon_heart_sign` | 원본 상자 사용 ID |
| 네온 스페이드 간판 | `tanukidecor:neon_spade_sign` | 원본 상자 사용 ID |
| 뉴턴의 요람 | `tanukidecor:newtons_cradle` | 원본 상자 사용 ID |
| 주황색 과학 포드 | `tanukidecor:orange_science_pod` | 원본 상자 사용 ID |
| 올빼미 시계 | `tanukidecor:owl_clock` | 원본 상자 사용 ID |
| 축음기 | `tanukidecor:phonograph` | 원본 상자 사용 ID |
| 피아노 | `tanukidecor:piano` | 원본 상자 사용 ID |
| 분홍색 로켓 램프 | `tanukidecor:pink_rocket_lamp` | 원본 상자 사용 ID |
| 플라스마 볼 | `tanukidecor:plasma_ball` | 원본 상자 사용 ID |
| 보라색 로켓 램프 | `tanukidecor:purple_rocket_lamp` | 원본 상자 사용 ID |
| 인식 가능한 시계 | `tanukidecor:recognizable_clock` | 원본 상자 사용 ID |
| 빨간색 시계 | `tanukidecor:red_clock` | 원본 상자 사용 ID |
| 빨간색 버섯 침대 | `tanukidecor:red_mushroom_bed` | 원본 상자 사용 ID |
| 빨간색 버섯 램프 | `tanukidecor:red_mushroom_lamp` | 원본 상자 사용 ID |
| 빨간색 버섯 원목 스툴 | `tanukidecor:red_mushroom_log_stool` | 원본 상자 사용 ID |
| 빨간색 버섯 스툴 | `tanukidecor:red_mushroom_stool` | 원본 상자 사용 ID |
| 빨간색 버섯 테이블 | `tanukidecor:red_mushroom_table` | 원본 상자 사용 ID |
| 빨간색 로켓 램프 | `tanukidecor:red_rocket_lamp` | 원본 상자 사용 ID |
| 빨간색 과학 포드 | `tanukidecor:red_science_pod` | 원본 상자 사용 ID |
| 빨간색 가판대 덮개 | `tanukidecor:red_stall_tarp` | 원본 상자 사용 ID |
| 빨간색 벽 덮개 | `tanukidecor:red_wall_tarp` | 원본 상자 사용 ID |
| 갈대 시계 | `tanukidecor:reed_clock` | 원본 상자 사용 ID |
| 리갈 옷장 | `tanukidecor:regal_armoire` | 원본 상자 사용 ID |
| 리갈 침대 | `tanukidecor:regal_bed` | 원본 상자 사용 ID |
| 리갈 책장 | `tanukidecor:regal_bookshelf` | 원본 상자 사용 ID |
| 리갈 의자 | `tanukidecor:regal_chair` | 원본 상자 사용 ID |
| 왕실 시계 | `tanukidecor:regal_clock` | 원본 상자 사용 ID |
| 리갈 서랍장 | `tanukidecor:regal_dresser` | 원본 상자 사용 ID |
| 리갈 램프 | `tanukidecor:regal_lamp` | 원본 상자 사용 ID |
| 리갈 작은 테이블 | `tanukidecor:regal_small_table` | 원본 상자 사용 ID |
| 리갈 소파 | `tanukidecor:regal_sofa` | 원본 상자 사용 ID |
| 리갈 테이블 | `tanukidecor:regal_table` | 원본 상자 사용 ID |
| 리갈 화장대 | `tanukidecor:regal_vanity` | 원본 상자 사용 ID |
| 리갈 벽 램프 | `tanukidecor:regal_wall_lamp` | 원본 상자 사용 ID |
| 로코코 시계 | `tanukidecor:rococo_clock` | 원본 상자 사용 ID |
| 거친 원목 벤치 | `tanukidecor:rough_log_bench` | 원본 상자 사용 ID |
| 병 속의 배 | `tanukidecor:ship_in_a_bottle` | 원본 상자 사용 ID |
| 슬레이트 시계 | `tanukidecor:slate_clock` | 원본 상자 사용 ID |
| 슬롯 머신 | `tanukidecor:slot_machine` | 원본 상자 사용 ID |
| 소형 시계탑 문자판 | `tanukidecor:small_clock_tower_dial` | 원본 상자 사용 ID |
| 작은 화려한 꽃병 | `tanukidecor:small_fancy_vase` | 원본 상자 사용 ID |
| 소형 벽난로 | `tanukidecor:small_fireplace` | 원본 상자 사용 ID |
| 작은 줄무늬 꽃병 | `tanukidecor:small_striped_vase` | 원본 상자 사용 ID |
| 스노우 글로브 | `tanukidecor:snowglobe` | 원본 상자 사용 ID |
| 역 시계 | `tanukidecor:station_clock` | 원본 상자 사용 ID |
| 스위츠 침대 | `tanukidecor:sweets_bed` | 원본 상자 사용 ID |
| 단맛 책장 | `tanukidecor:sweets_bookcase` | 원본 상자 사용 ID |
| 스위츠 의자 | `tanukidecor:sweets_chair` | 원본 상자 사용 ID |
| 스위츠 붙박이장 | `tanukidecor:sweets_closet` | 원본 상자 사용 ID |
| 스위츠 서랍장 | `tanukidecor:sweets_dresser` | 원본 상자 사용 ID |
| 스위츠 미니 램프 | `tanukidecor:sweets_mini_lamp` | 원본 상자 사용 ID |
| 단맛 미니 테이블 | `tanukidecor:sweets_mini_table` | 원본 상자 사용 ID |
| 스위츠 소파 | `tanukidecor:sweets_sofa` | 원본 상자 사용 ID |
| 단맛 테이블 | `tanukidecor:sweets_table` | 원본 상자 사용 ID |
| 스위츠 벽 램프 | `tanukidecor:sweets_wall_lamp` | 원본 상자 사용 ID |
| 기차 세트 | `tanukidecor:train_set` | 원본 상자 사용 ID |
| 청록색 로켓 램프 | `tanukidecor:turquoise_rocket_lamp` | 원본 상자 사용 ID |
| 넓은 파란색 장식 끈 | `tanukidecor:wide_blue_streamer` | 원본 상자 사용 ID |
| 넓은 초록색 장식 끈 | `tanukidecor:wide_green_streamer` | 원본 상자 사용 ID |
| 넓은 빨간색 장식 끈 | `tanukidecor:wide_red_streamer` | 원본 상자 사용 ID |
| 넓은 전구 | `tanukidecor:wide_string_lights` | 원본 상자 사용 ID |
| 넓은 노란색 장식 끈 | `tanukidecor:wide_yellow_streamer` | 원본 상자 사용 ID |
| 나무 블록 침대 | `tanukidecor:wooden_block_bed` | 원본 상자 사용 ID |
| 나무 블록 벤치 | `tanukidecor:wooden_block_bench` | 원본 상자 사용 ID |
| 나무 블록 책장 | `tanukidecor:wooden_block_bookshelf` | 원본 상자 사용 ID |
| 나무 블록 의자 | `tanukidecor:wooden_block_chair` | 원본 상자 사용 ID |
| 나무 블록 시계 | `tanukidecor:wooden_block_clock` | 원본 상자 사용 ID |
| 나무 블록 서랍장 | `tanukidecor:wooden_block_drawers` | 원본 상자 사용 ID |
| 나무 블록 스툴 | `tanukidecor:wooden_block_stool` | 원본 상자 사용 ID |
| 나무 블록 테이블 | `tanukidecor:wooden_block_table` | 원본 상자 사용 ID |
| 나무 블록 장난감 | `tanukidecor:wooden_block_toys` | 원본 상자 사용 ID |
| 노란색 로켓 램프 | `tanukidecor:yellow_rocket_lamp` | 원본 상자 사용 ID |
| 노란색 가판대 덮개 | `tanukidecor:yellow_stall_tarp` | 원본 상자 사용 ID |
| 노란색 벽 덮개 | `tanukidecor:yellow_wall_tarp` | 원본 상자 사용 ID |

</details>

<details><summary>Twigs — 15개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 소형 종이 랜턴 | `twigs:allium_paper_lantern` |  |
| 화분에 심은 진달래 꽃 | `twigs:azalea_flowers` |  |
| 소형 종이 랜턴 | `twigs:blue_orchid_paper_lantern` |  |
| 청동 조개껍데기 | `twigs:bronzed_seashell` |  |
| 소형 종이 랜턴 | `twigs:crimson_roots_paper_lantern` |  |
| 진홍색 버섯 램프 | `twigs:crimson_shroomlamp` |  |
| 소형 종이 랜턴 | `twigs:dandelion_paper_lantern` |  |
| 램프 | `twigs:lamp` |  |
| 유백색 조개껍데기 | `twigs:opaline_seashell` |  |
| 소형 종이 랜턴 | `twigs:paper_lantern` |  |
| 장밋빛 조개껍데기 | `twigs:roseate_seashell` |  |
| 영혼 램프 | `twigs:soul_lamp` |  |
| 주황색 조개껍데기 | `twigs:tangerine_seashell` |  |
| 소형 종이 랜턴 | `twigs:torchflower_paper_lantern` |  |
| 뒤틀린 버섯 램프 | `twigs:warped_shroomlamp` |  |

</details>

<details><summary>Let’s Do Vinery — 57개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 큰 아카시아나무 와인거치대 | `vinery:acacia_wine_rack_big` |  |
| 아카시아나무 와인거치대 | `vinery:acacia_wine_rack_mid` |  |
| 작은 아카시아나무 와인거치대 | `vinery:acacia_wine_rack_small` |  |
| 사과 자루 | `vinery:apple_bag` |  |
| 사과 압착기 | `vinery:apple_press` |  |
| 큰 대나무 와인거치대 | `vinery:bamboo_wine_rack_big` |  |
| 대나무 와인거치대 | `vinery:bamboo_wine_rack_mid` |  |
| 작은 대나무 와인거치대 | `vinery:bamboo_wine_rack_small` |  |
| 바구니 | `vinery:basket` |  |
| 큰 자작나무 와인거치대 | `vinery:birch_wine_rack_big` |  |
| 자작나무 와인거치대 | `vinery:birch_wine_rack_mid` |  |
| 작은 자작나무 와인거치대 | `vinery:birch_wine_rack_small` |  |
| 체리 자루 | `vinery:cherry_bag` |  |
| 큰 벚나무 와인거치대 | `vinery:cherry_wine_rack_big` |  |
| 벚나무 와인거치대 | `vinery:cherry_wine_rack_mid` |  |
| 작은 벚나무 와인거치대 | `vinery:cherry_wine_rack_small` |  |
| 짙은 벚나무 통 | `vinery:dark_cherry_barrel` |  |
| 짙은 벚나무 대형 테이블 | `vinery:dark_cherry_big_table` |  |
| 짙은 벚나무 수납장 | `vinery:dark_cherry_cabinet` |  |
| 짙은 벚나무 의자 | `vinery:dark_cherry_chair` |  |
| 짙은 벚나무 서랍 | `vinery:dark_cherry_drawer` |  |
| 짙은 벚나무 책장 | `vinery:dark_cherry_shelf` |  |
| 짙은 벚나무 테이블 | `vinery:dark_cherry_table` |  |
| 큰 짙은 벚나무 와인거치대 | `vinery:dark_cherry_wine_rack_big` |  |
| 짙은 벚나무 와인거치대 | `vinery:dark_cherry_wine_rack_mid` |  |
| 작은 짙은 벚나무 와인거치대 | `vinery:dark_cherry_wine_rack_small` |  |
| 큰 짙은 참나무 와인거치대 | `vinery:dark_oak_wine_rack_big` |  |
| 짙은 참나무 와인거치대 | `vinery:dark_oak_wine_rack_mid` |  |
| 작은 짙은 참나무 와인거치대 | `vinery:dark_oak_wine_rack_small` |  |
| 고급 와인통 | `vinery:fermentation_barrel` |  |
| 꽃 상자 | `vinery:flower_box` |  |
| 큰 화분 | `vinery:flower_pot_big` |  |
| 포도 밟기 통 | `vinery:grapevine_pot` |  |
| 큰 정글나무 와인거치대 | `vinery:jungle_wine_rack_big` |  |
| 정글나무 와인거치대 | `vinery:jungle_wine_rack_mid` |  |
| 작은 정글나무 와인거치대 | `vinery:jungle_wine_rack_small` |  |
| 큰 맹그로브나무 와인거치대 | `vinery:mangrove_wine_rack_big` |  |
| 맹그로브나무 와인거치대 | `vinery:mangrove_wine_rack_mid` |  |
| 작은 맹그로브나무 와인거치대 | `vinery:mangrove_wine_rack_small` |  |
| 큰 참나무 와인거치대 | `vinery:oak_wine_rack_big` |  |
| 참나무 와인거치대 | `vinery:oak_wine_rack_mid` |  |
| 작은 참나무 와인거치대 | `vinery:oak_wine_rack_small` |  |
| 적포도 자루 | `vinery:red_grape_bag` |  |
| 정글 적포도 자루 | `vinery:red_jungle_grape_bag` |  |
| 사바나 적포도 자루 | `vinery:red_savanna_grape_bag` |  |
| 타이가 적포도 자루 | `vinery:red_taiga_grape_bag` |  |
| 큰 가문비나무 와인거치대 | `vinery:spruce_wine_rack_big` |  |
| 가문비나무 와인거치대 | `vinery:spruce_wine_rack_mid` |  |
| 작은 가문비나무 와인거치대 | `vinery:spruce_wine_rack_small` |  |
| 쌓을 수 있는 통나무 | `vinery:stackable_log` |  |
| 보관 바구니 | `vinery:storage_pot` |  |
| §e정복자 배너: §5Vinery | `vinery:vinery_standard` |  |
| 백포도 자루 | `vinery:white_grape_bag` |  |
| 정글 백포도 자루 | `vinery:white_jungle_grape_bag` |  |
| 사바나 백포도 자루 | `vinery:white_savanna_grape_bag` |  |
| 타이가 백포도 자루 | `vinery:white_taiga_grape_bag` |  |
| 와인 상자 | `vinery:wine_box` |  |

</details>

<details><summary>Whimsy Deco — 86개</summary>

| 표시 이름 / 원래 이름 | 검토할 보상 ID | 비고 |
|---|---|---|
| 큰 판다 인형 | `whimsy_deco:adv_big_panda_plushie` | 초기화 확인 · 외형/범위 검토 |
| 꽃 돼지 인형 | `whimsy_deco:adv_flower_pig_plushie` | 초기화 확인 · 외형/범위 검토 |
| 푸푸 인형들 | `whimsy_deco:adv_fufu_plushie` | 초기화 확인 · 외형/범위 검토 |
| 황금 돼지 인형 | `whimsy_deco:adv_golden_pig_plushie` | 초기화 확인 · 외형/범위 검토 |
| 노래 부르는 빨간 인형 | `whimsy_deco:adv_red_vocal_doll` | 초기화 확인 · 외형/범위 검토 |
| 노래 부르는 인형 | `whimsy_deco:adv_vocal_doll` | 초기화 확인 · 외형/범위 검토 |
| 앤티크 빈티지 지구본 | `whimsy_deco:antique_vintage_globe` | 원본 상자 사용 ID |
| 대나무 초 | `whimsy_deco:bamboo_candle` | 원본 상자 사용 ID |
| 대나무 틀 종이 랜턴 | `whimsy_deco:bamboo_framed_paper_lantern` | 원본 상자 사용 ID |
| 욕실 랙 | `whimsy_deco:bathroom_rack` | 원본 상자 사용 ID |
| 검은색 ATM | `whimsy_deco:black_atm` | 원본 상자 사용 ID |
| 검은색 금전 등록기 | `whimsy_deco:black_cash_register` | 원본 상자 사용 ID |
| 검은색 장신구 금전 등록기 | `whimsy_deco:black_curio_cash_register` | 원본 상자 사용 ID |
| 검은색 전화기 | `whimsy_deco:black_phone` | 원본 상자 사용 ID |
| 검은 백조 튜브 | `whimsy_deco:black_swan_swimming_ring` | 원본 상자 사용 ID |
| 파란색 ATM | `whimsy_deco:blue_atm` | 원본 상자 사용 ID |
| 파란색 개구리 의자 | `whimsy_deco:blue_froggy_chair` | 원본 상자 사용 ID |
| 파란색 잔디 깎이 | `whimsy_deco:blue_lawn_mower` | 원본 상자 사용 ID |
| 파란색 구명 튜브 | `whimsy_deco:blue_life_preserver_ring` | 원본 상자 사용 ID |
| 파란색 종이 랜턴 | `whimsy_deco:blue_paper_lantern` | 원본 상자 사용 ID |
| 파란색 전화기 | `whimsy_deco:blue_phone` | 원본 상자 사용 ID |
| 파란색 양말 | `whimsy_deco:blue_stocking` | 원본 상자 사용 ID |
| 파란색 장난감 비행기 | `whimsy_deco:blue_toy_plane` | 원본 상자 사용 ID |
| 청동 카우벨 | `whimsy_deco:bronze_cowbell` | 원본 상자 사용 ID |
| 빗자루 | `whimsy_deco:broom` | 원본 상자 사용 ID |
| 금전 등록기 | `whimsy_deco:cash_register` | 원본 상자 사용 ID |
| 주철 선반 | `whimsy_deco:cast_iron_ledge` | 외형/범위 검토 |
| 주철 다락문 | `whimsy_deco:cast_iron_trapdoor` | 외형/범위 검토 |
| 미끄럼 주의 표지판 | `whimsy_deco:caution_floor_sign` | 원본 상자 사용 ID |
| 구리 장신구 금전 등록기 | `whimsy_deco:copper_curio_cash_register` | 원본 상자 사용 ID |
| 카우벨 | `whimsy_deco:cowbell` | 원본 상자 사용 ID |
| 짙은 참나무 책상 거울 | `whimsy_deco:dark_oak_desk_mirror` | 원본 상자 사용 ID |
| 다트판 | `whimsy_deco:dartboard` | 원본 상자 사용 ID |
| 선풍기 | `whimsy_deco:fan` | 원본 상자 사용 ID |
| 플라밍고 튜브 | `whimsy_deco:flamingo_swimming_ring` | 원본 상자 사용 ID |
| 개구리 의자 | `whimsy_deco:froggy_chair` | 원본 상자 사용 ID |
| 인형 뽑기 기계 | `whimsy_deco:gatcha_machine` | 원본 상자 사용 ID |
| 노움 | `whimsy_deco:gnome` |  |
| 금 장신구 금전 등록기 | `whimsy_deco:gold_curio_cash_register` | 원본 상자 사용 ID |
| 황금 복 고양이 | `whimsy_deco:gold_lucky_cat` |  |
| 황금 말발굽 | `whimsy_deco:golden_horseshoe` | 원본 상자 사용 ID |
| 회색 금전 등록기 | `whimsy_deco:gray_cash_register` |  |
| 초록색 ATM | `whimsy_deco:green_atm` | 원본 상자 사용 ID |
| 초록색 양말 | `whimsy_deco:green_stocking` | 원본 상자 사용 ID |
| 말발굽 | `whimsy_deco:horseshoe` | 원본 상자 사용 ID |
| 철 장신구 금전 등록기 | `whimsy_deco:iron_curio_cash_register` | 원본 상자 사용 ID |
| 랜턴 노움 | `whimsy_deco:lantern_gnome` |  |
| 복 고양이 | `whimsy_deco:lucky_cat` | 원본 상자 사용 ID |
| 마트료시카 인형 | `whimsy_deco:matryoshka_doll` | 원본 상자 사용 ID |
| 모로코 소파 | `whimsy_deco:moroccan_sofa` | 원본 상자 사용 ID |
| 참나무 책상 거울 | `whimsy_deco:oak_desk_mirror` | 원본 상자 사용 ID |
| 주황색 개구리 의자 | `whimsy_deco:orange_froggy_chair` | 원본 상자 사용 ID |
| 주황색 잔디 깎이 | `whimsy_deco:orange_lawn_mower` | 원본 상자 사용 ID |
| 주황색 구명 튜브 | `whimsy_deco:orange_life_preserver_ring` | 원본 상자 사용 ID |
| 주황색 양말 | `whimsy_deco:orange_stocking` | 원본 상자 사용 ID |
| 종이 랜턴 | `whimsy_deco:paper_lantern` | 원본 상자 사용 ID |
| 전화기 | `whimsy_deco:phone` |  |
| 분홍색 개구리 의자 | `whimsy_deco:pink_froggy_chair` | 원본 상자 사용 ID |
| 밀대 | `whimsy_deco:push_broom` | 원본 상자 사용 ID |
| 등나무 스툴 | `whimsy_deco:rattan_stool` | 원본 상자 사용 ID |
| 리코더 | `whimsy_deco:recorder` | 원본 상자 사용 ID |
| 빨간색 ATM | `whimsy_deco:red_atm` | 원본 상자 사용 ID |
| 빨간색 잔디 깎이 | `whimsy_deco:red_lawn_mower` | 원본 상자 사용 ID |
| 빨간색 구명 튜브 | `whimsy_deco:red_life_preserver_ring` | 원본 상자 사용 ID |
| 빨간색 종이 랜턴 | `whimsy_deco:red_paper_lantern` | 원본 상자 사용 ID |
| 빨간색 전화기 | `whimsy_deco:red_phone` | 원본 상자 사용 ID |
| 빨간색 양말 | `whimsy_deco:red_stocking` | 원본 상자 사용 ID |
| 빨간색 장난감 비행기 | `whimsy_deco:red_toy_plane` | 원본 상자 사용 ID |
| 고무 오리 | `whimsy_deco:rubber_duck` | 원본 상자 사용 ID |
| 키 | `whimsy_deco:ship_helm` | 원본 상자 사용 ID |
| 샤워 | `whimsy_deco:shower` | 원본 상자 사용 ID |
| 노래하는 개구리 | `whimsy_deco:singing_frog` |  |
| 가문비나무 책상 거울 | `whimsy_deco:spruce_desk_mirror` | 원본 상자 사용 ID |
| 백조 튜브 | `whimsy_deco:swan_swimming_ring` | 원본 상자 사용 ID |
| 교통 콘 | `whimsy_deco:traffic_cone` | 원본 상자 사용 ID |
| 나무 종이 랜턴 | `whimsy_deco:tree_paper_lantern` | 원본 상자 사용 ID |
| 덩굴 등나무 의자 | `whimsy_deco:vine_rattan_chair` | 원본 상자 사용 ID |
| 빈티지 지구본 | `whimsy_deco:vintage_globe` | 원본 상자 사용 ID |
| 뒤틀린 등나무 의자 | `whimsy_deco:warped_rattan_chair` | 원본 상자 사용 ID |
| 세탁기 | `whimsy_deco:washing_machine` | 원본 상자 사용 ID |
| 나무 틀 종이 랜턴 | `whimsy_deco:wood_framed_paper_lantern` | 원본 상자 사용 ID |
| 노란색 ATM | `whimsy_deco:yellow_atm` | 원본 상자 사용 ID |
| 노란색 개구리 의자 | `whimsy_deco:yellow_froggy_chair` | 원본 상자 사용 ID |
| 노란색 잔디 깎이 | `whimsy_deco:yellow_lawn_mower` | 원본 상자 사용 ID |
| 노란색 구명 튜브 | `whimsy_deco:yellow_life_preserver_ring` | 원본 상자 사용 ID |
| 노란색 장난감 비행기 | `whimsy_deco:yellow_toy_plane` | 원본 상자 사용 ID |

</details>

## 추가 경계 검토 ID

아래 항목은 위 후보 수에 포함하지 않았습니다. 기본형 디자인이나 건축 장식 범위를 확인할 항목이며, 미감 탈락으로 일괄 확정한 목록은 아닙니다.

<details><summary>추가 검토 목록 펼치기</summary>

| 이름 | ID | 이유 |
|---|---|---|
| Apple Jam | `bakery:apple_jam` | Placeable filled jam container: potentially kitchen décor, but also food; confirm desired boundary before adding. |
| Chocolate Spread | `bakery:chocolate_jam` | Placeable filled jam container: potentially kitchen décor, but also food; confirm desired boundary before adding. |
| Glowberry Jam | `bakery:glowberry_jam` | Placeable filled jam container: potentially kitchen décor, but also food; confirm desired boundary before adding. |
| Strawberry Jam | `bakery:strawberry_jam` | Placeable filled jam container: potentially kitchen décor, but also food; confirm desired boundary before adding. |
| Sweetberry Jam | `bakery:sweetberry_jam` | Placeable filled jam container: potentially kitchen décor, but also food; confirm desired boundary before adding. |
| Pool Noodle | `beachparty:pool_noodle` | Wearable/swimming equipment; include only if entity/block placement is demonstrated. |
| Axolotl Rubber Ring | `beachparty:rubber_ring_axolotl` | Swimming equipment; cute appearance alone does not establish placeable decoration. |
| Pelican Rubber Ring | `beachparty:rubber_ring_pelican` | Swimming equipment; cute appearance alone does not establish placeable decoration. |
| Sandwaves | `beachparty:sandwaves` | Sand scenery with a block item; visual and scope review needed for decorative terrain versus generic block. |
| Cloche | `candlelight:cloche` | Small table accessory; item registration exists but its use/independent placement needs review before treating it as standalone furniture. |
| Napkin | `candlelight:napkin` | Small table accessory; item registration exists but its use/independent placement needs review before treating it as standalone furniture. |
| Alabaster French Door | `cluttered:alabaster_french_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Screen Door | `cluttered:alabaster_screen_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Wainscoting | `cluttered:alabaster_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Window | `cluttered:alabaster_window_divided` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Window Pane | `cluttered:alabaster_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Wallpaper | `cluttered:apple_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Black Armchair | `cluttered:armchair_black` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Blue Armchair | `cluttered:armchair_blue` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Brown Armchair | `cluttered:armchair_brown` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Cyan Armchair | `cluttered:armchair_cyan` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Fuchsia Armchair | `cluttered:armchair_fuchsia` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Gray Armchair | `cluttered:armchair_gray` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Green Armchair | `cluttered:armchair_green` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Ivory Armchair | `cluttered:armchair_ivory` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Light Blue Armchair | `cluttered:armchair_light_blue` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Light Gray Armchair | `cluttered:armchair_light_gray` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Lime Armchair | `cluttered:armchair_lime` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Magenta Armchair | `cluttered:armchair_magenta` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Orange Armchair | `cluttered:armchair_orange` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Pink Armchair | `cluttered:armchair_pink` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Purple Armchair | `cluttered:armchair_purple` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Red Armchair | `cluttered:armchair_red` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| White Armchair | `cluttered:armchair_white` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Yellow Armchair | `cluttered:armchair_yellow` | Aesthetic review: solid-color armchair family may meet the basic wool/cushion exclusion; no visual inspection performed. Not definitively excluded. |
| Art Nouveau Door | `cluttered:art_nouveau_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Dark Art Nouveau Door | `cluttered:art_nouveau_door_dark` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Aura Tile | `cluttered:aura_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bifurcating Tile | `cluttered:bifurcating_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Black Amaryllis Tile | `cluttered:black_amaryllis_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Black Cat Window | `cluttered:black_cat_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Black Cat Window Pane | `cluttered:black_cat_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Door | `cluttered:blue_mushroom_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Hanging Sign | `cluttered:blue_mushroom_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Sign | `cluttered:blue_mushroom_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Trapdoor | `cluttered:blue_mushroom_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Wainscoting | `cluttered:blue_mushroom_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Window | `cluttered:blue_mushroom_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Mushroom Window Pane | `cluttered:blue_mushroom_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Rose Wallpaper | `cluttered:blue_rose_striped_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Rose Wallpaper Lower Trim | `cluttered:blue_rose_striped_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Rose Wallpaper Upper Trim | `cluttered:blue_rose_striped_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Cotton Candy Wainscoting | `cluttered:blue_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chocolate Chip Wainscoting | `cluttered:brown_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Balustrade | `cluttered:chalcedony_balustrade` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Pillar | `cluttered:chalcedony_pillar` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Pillar Base | `cluttered:chalcedony_pillar_base` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Doric Pillar | `cluttered:chalcedony_pillar_doric` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Ionic Pillar | `cluttered:chalcedony_pillar_ionic` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Chalcedony Pillar | `cluttered:chalcedony_pillar_starry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Chalcedony Pillar Base | `cluttered:chalcedony_pillar_starry_base` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Chalcedony Doric Pillar | `cluttered:chalcedony_pillar_starry_doric` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Chalcedony Ionic Pillar | `cluttered:chalcedony_pillar_starry_ionic` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Subway Tiles | `cluttered:chalcedony_subway_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Tiles | `cluttered:chalcedony_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Victorian Bracket | `cluttered:chalcedony_victorian_bracket` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Bow Bracket | `cluttered:chalcedony_victorian_bracket_bow` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Bow-Scroll Bracket | `cluttered:chalcedony_victorian_bracket_bow_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Scroll Bracket | `cluttered:chalcedony_victorian_bracket_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Shelf Bracket | `cluttered:chalcedony_victorian_bracket_scroll_shelf` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Star Bracket | `cluttered:chalcedony_victorian_bracket_star` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Star-Scroll Bracket | `cluttered:chalcedony_victorian_bracket_star_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Window | `cluttered:chalcedony_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chalcedony Window Pane | `cluttered:chalcedony_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Checkered Fruit Wallpaper | `cluttered:checkered_fruit_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Checkered Green Strawberry Wallpaper | `cluttered:checkered_green_strawberry_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Checkered Green Wallpaper | `cluttered:checkered_green_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Checkered Pink Strawberry Wallpaper | `cluttered:checkered_pink_strawberry_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Checkered Pink Wallpaper | `cluttered:checkered_pink_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chic Wallpaper | `cluttered:chic_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chic Wallpaper Lower Trim | `cluttered:chic_wallpaper_lower_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chic Wallpaper Upper Trim | `cluttered:chic_wallpaper_upper_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Colosseo Pillar | `cluttered:colosseo_pillar` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Colosseo Pillar Base | `cluttered:colosseo_pillar_base` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Colosseo Pillar Top | `cluttered:colosseo_pillar_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Confectionary Wallpaper | `cluttered:confectionary_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Confectionary Wallpaper Lower Trim | `cluttered:confectionary_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Confectionary Wallpaper Upper Trim | `cluttered:confectionary_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Door | `cluttered:crabapple_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Hanging Sign | `cluttered:crabapple_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Sign | `cluttered:crabapple_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Trapdoor | `cluttered:crabapple_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Wainscoting | `cluttered:crabapple_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Window | `cluttered:crabapple_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Crabapple Window Pane | `cluttered:crabapple_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Dark Starry Wallpaper | `cluttered:dark_starry_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Dark Starry Wallpaper Lower Trim | `cluttered:dark_starry_wallpaper_lower_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Dark Starry Wallpaper Upper Trim | `cluttered:dark_starry_wallpaper_upper_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Balustrade | `cluttered:deep_chalcedony_balustrade` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Pillar | `cluttered:deep_chalcedony_pillar` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Pillar Base | `cluttered:deep_chalcedony_pillar_base` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Doric Pillar | `cluttered:deep_chalcedony_pillar_doric` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Ionic Pillar | `cluttered:deep_chalcedony_pillar_ionic` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Deep Chalcedony Pillar | `cluttered:deep_chalcedony_pillar_starry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Deep Chalcedony Pillar Base | `cluttered:deep_chalcedony_pillar_starry_base` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Deep Chalcedony Doric Pillar | `cluttered:deep_chalcedony_pillar_starry_doric` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Deep Chalcedony Ionic Pillar | `cluttered:deep_chalcedony_pillar_starry_ionic` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Subway Tiles | `cluttered:deep_chalcedony_subway_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Tiles | `cluttered:deep_chalcedony_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Victorian Bracket | `cluttered:deep_chalcedony_victorian_bracket` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Bow Bracket | `cluttered:deep_chalcedony_victorian_bracket_bow` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Bow-Scroll Bracket | `cluttered:deep_chalcedony_victorian_bracket_bow_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Scroll Bracket | `cluttered:deep_chalcedony_victorian_bracket_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Shelf Bracket | `cluttered:deep_chalcedony_victorian_bracket_scroll_shelf` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Star Bracket | `cluttered:deep_chalcedony_victorian_bracket_star` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Star-Scroll Bracket | `cluttered:deep_chalcedony_victorian_bracket_star_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Window | `cluttered:deep_chalcedony_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Deep Chalcedony Window Pane | `cluttered:deep_chalcedony_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Anchor Motif Wallpaper | `cluttered:diamond_wallpaper_anchor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Anchor Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_anchor_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Anchor Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_anchor_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Anchor Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_anchor_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Anchor Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_anchor_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper | `cluttered:diamond_wallpaper_apple` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_apple_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_apple_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_apple_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_apple_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_apple_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apple Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_apple_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper | `cluttered:diamond_wallpaper_blackberry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_blackberry_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_blackberry_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_blackberry_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_blackberry_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_blackberry_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blackberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_blackberry_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper | `cluttered:diamond_wallpaper_blueberry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_blueberry_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_blueberry_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_blueberry_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_blueberry_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_blueberry_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_blueberry_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bone Motif Wallpaper | `cluttered:diamond_wallpaper_bones` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bone Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_bones_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bone Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_bones_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bone Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_bones_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bone Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_bones_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper | `cluttered:diamond_wallpaper_bouquet` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_bouquet_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_bouquet_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_bouquet_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_bouquet_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_bouquet_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Bouquet Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_bouquet_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper | `cluttered:diamond_wallpaper_brown_mushroom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_brown_mushroom_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_brown_mushroom_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_brown_mushroom_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_brown_mushroom_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_brown_mushroom_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Brown Mushroom Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_brown_mushroom_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper | `cluttered:diamond_wallpaper_green_grapes` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_green_grapes_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_green_grapes_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_green_grapes_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_green_grapes_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_green_grapes_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Grape Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_green_grapes_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper | `cluttered:diamond_wallpaper_lemon` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_lemon_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_lemon_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_lemon_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_lemon_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_lemon_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lemon Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_lemon_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper | `cluttered:diamond_wallpaper_orange` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_orange_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_orange_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_orange_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_orange_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_orange_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_orange_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper | `cluttered:diamond_wallpaper_pear` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_pear_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_pear_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_pear_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_pear_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_pear_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pear Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_pear_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper | `cluttered:diamond_wallpaper_plum` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_plum_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_plum_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_plum_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_plum_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_plum_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Plum Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_plum_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper | `cluttered:diamond_wallpaper_purple_grapes` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_purple_grapes_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_purple_grapes_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_purple_grapes_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_purple_grapes_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_purple_grapes_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Grape Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_purple_grapes_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper | `cluttered:diamond_wallpaper_red_mushroom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_red_mushroom_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_red_mushroom_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_red_mushroom_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_red_mushroom_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_red_mushroom_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_red_mushroom_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper | `cluttered:diamond_wallpaper_strawberry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_strawberry_bottom_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_strawberry_bottom_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper Lower Trim | `cluttered:diamond_wallpaper_strawberry_bottom_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_strawberry_top_brown` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_strawberry_top_color` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Motif Wallpaper Upper Trim | `cluttered:diamond_wallpaper_strawberry_top_white` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Dynasty Door | `cluttered:dynasty_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Esperanca Tile | `cluttered:esperanca_tile` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fish Wallpaper | `cluttered:fish_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Tropical Fish Wallpaper | `cluttered:fish_wallpaper_tropical` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Floral Berry Wallpaper | `cluttered:floral_berry_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Floral Berry Wallpaper Lower Trim | `cluttered:floral_berry_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Floral Berry Wallpaper Upper Trim | `cluttered:floral_berry_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Floral Border Wallpaper | `cluttered:floral_border_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Door | `cluttered:flowering_crabapple_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Hanging Sign | `cluttered:flowering_crabapple_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Sign | `cluttered:flowering_crabapple_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Trapdoor | `cluttered:flowering_crabapple_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Wainscoting | `cluttered:flowering_crabapple_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Window | `cluttered:flowering_crabapple_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Crabapple Window Pane | `cluttered:flowering_crabapple_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Door | `cluttered:flowering_poplar_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Hanging Sign | `cluttered:flowering_poplar_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Sign | `cluttered:flowering_poplar_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Trapdoor | `cluttered:flowering_poplar_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Wainscoting | `cluttered:flowering_poplar_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Window | `cluttered:flowering_poplar_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Poplar Window Pane | `cluttered:flowering_poplar_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Log Door | `cluttered:flowering_willow_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Hanging Sign | `cluttered:flowering_willow_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Sign | `cluttered:flowering_willow_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Trapdoor | `cluttered:flowering_willow_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Wainscoting | `cluttered:flowering_willow_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Window | `cluttered:flowering_willow_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Flowering Willow Window Pane | `cluttered:flowering_willow_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Door | `cluttered:fluorescent_maple_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Hanging Sign | `cluttered:fluorescent_maple_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Sign | `cluttered:fluorescent_maple_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Trapdoor | `cluttered:fluorescent_maple_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Wainscoting | `cluttered:fluorescent_maple_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Window | `cluttered:fluorescent_maple_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Fluorescent Maple Window Pane | `cluttered:fluorescent_maple_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Ghost Wallpaper | `cluttered:ghost_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Ghost Wallpaper Lower Trim | `cluttered:ghost_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Ghost Wallpaper Upper Trim | `cluttered:ghost_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Ghost Wallpaper Trim | `cluttered:ghost_wallpaper_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Macabre Mauve Wainscoting | `cluttered:ghost_wallpaper_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Gingerbread Side Trim | `cluttered:gingerbread_bricks_corner` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Gingerbread Bricks Upper Trim | `cluttered:gingerbread_bricks_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Gingerbread Bricks Corner Trim | `cluttered:gingerbread_bricks_top_corner` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Greenhouse Window | `cluttered:greenhouse_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Left Arch Window | `cluttered:greenhouse_window_arch_left` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Right Arch Window | `cluttered:greenhouse_window_arch_right` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Circle Window | `cluttered:greenhouse_window_circle` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Pointed Window | `cluttered:greenhouse_window_pointed` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Left Radial Window | `cluttered:greenhouse_window_radial_left` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Right Radial Window | `cluttered:greenhouse_window_radial_right` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Alabaster Rounded Window | `cluttered:greenhouse_window_rounded` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Autumn Aubergine Wainscoting | `cluttered:halloween_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Halloween Wallpaper | `cluttered:halloween_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Halloween Wallpaper Lower Trim | `cluttered:halloween_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Halloween Wallpaper Upper Trim | `cluttered:halloween_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Hannish Tile | `cluttered:hannish_tile` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Apricot Jam Jar Block | `cluttered:jam_jar_apricot` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blueberry Jam Jar Block | `cluttered:jam_jar_blueberry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Cherry Jam Jar Block | `cluttered:jam_jar_cherry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Honey Jar Block | `cluttered:jam_jar_honey` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Orange Marmalade Jar Block | `cluttered:jam_jar_orange` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Strawberry Jam Jar Block | `cluttered:jam_jar_strawberry` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Lily Hills Tile | `cluttered:lily_hills_tile` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Balustrade | `cluttered:marble_balustrade` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Pillar | `cluttered:marble_pillar` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Pillar Base | `cluttered:marble_pillar_base` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Doric Pillar | `cluttered:marble_pillar_doric` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Ionic Pillar | `cluttered:marble_pillar_ionic` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Subway Tiles | `cluttered:marble_subway_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Floor Tile | `cluttered:marble_tile` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Border Tile | `cluttered:marble_tile_border` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Circular Marble Border Tile | `cluttered:marble_tile_border_circle` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Detailed Marble Border Tile | `cluttered:marble_tile_border_detailed` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Chiseled Marble Tile | `cluttered:marble_tile_chiseled` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Corner Tile | `cluttered:marble_tile_corner` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Circular Marble Corner Tile | `cluttered:marble_tile_corner_circle` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Tiles | `cluttered:marble_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Victorian Bracket | `cluttered:marble_victorian_bracket` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Bow Bracket | `cluttered:marble_victorian_bracket_bow` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Bow-Scroll Bracket | `cluttered:marble_victorian_bracket_bow_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Scroll Bracket | `cluttered:marble_victorian_bracket_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Shelf Bracket | `cluttered:marble_victorian_bracket_scroll_shelf` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Star Bracket | `cluttered:marble_victorian_bracket_star` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marble Star-Scroll Bracket | `cluttered:marble_victorian_bracket_star_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marigold Wallpaper | `cluttered:marigold_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marigold Wallpaper Lower Trim | `cluttered:marigold_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Marigold Wallpaper Upper Trim | `cluttered:marigold_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Mint Wallpaper | `cluttered:mint_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Mint Wallpaper Lower Trim | `cluttered:mint_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Mint Wallpaper Upper Trim | `cluttered:mint_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Mushroom Flat | `cluttered:mushroom_flat` | Static registerBlock+model exists, but no English name; identify intended decoration before inclusion. |
| Pink Stripe Wallpaper | `cluttered:pink_striped_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pink Stripe Wallpaper Lower Trim | `cluttered:pink_striped_wallpaper_lower_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pink Stripe Wallpaper Upper Trim | `cluttered:pink_striped_wallpaper_upper_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Door | `cluttered:poplar_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Hanging Sign | `cluttered:poplar_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Sign | `cluttered:poplar_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Trapdoor | `cluttered:poplar_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Wainscoting | `cluttered:poplar_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Window | `cluttered:poplar_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Poplar Window Pane | `cluttered:poplar_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Door | `cluttered:red_mushroom_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Hanging Sign | `cluttered:red_mushroom_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Sign | `cluttered:red_mushroom_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Trapdoor | `cluttered:red_mushroom_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Wainscoting | `cluttered:red_mushroom_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Window | `cluttered:red_mushroom_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Red Mushroom Window Pane | `cluttered:red_mushroom_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Retro Rainbow Wallpaper | `cluttered:retro_rainbow_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Rialto Gold Wallpaper | `cluttered:rialto_gold_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Rialto Gold Wallpaper Lower Trim | `cluttered:rialto_wallpaper_lower_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Rialto Gold Wallpaper Upper Trim | `cluttered:rialto_wallpaper_upper_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Rosette Tile | `cluttered:rosette_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Seismic Tile | `cluttered:seismic_tiles` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Wallpaper | `cluttered:starry_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Wallpaper Lower Trim | `cluttered:starry_wallpaper_lower_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Starry Wallpaper Upper Trim | `cluttered:starry_wallpaper_upper_trim` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Striped Floral Wallpaper | `cluttered:striped_floral_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Striped Floral Wallpaper Lower Trim | `cluttered:striped_floral_wallpaper_bottom` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Striped Floral Wallpaper Upper Trim | `cluttered:striped_floral_wallpaper_top` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Green Subway Tiles | `cluttered:subway_tiles_green` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Pink Subway Tiles | `cluttered:subway_tiles_pink` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Purple Subway Tiles | `cluttered:subway_tiles_purple` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Yellow Subway Tiles | `cluttered:subway_tiles_yellow` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Door | `cluttered:sycamore_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Hanging Sign | `cluttered:sycamore_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Sign | `cluttered:sycamore_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Trapdoor | `cluttered:sycamore_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Wainscoting | `cluttered:sycamore_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Window | `cluttered:sycamore_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Sycamore Window Pane | `cluttered:sycamore_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Tartan Yellow Wallpaper | `cluttered:tartan_yellow_wallpaper` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Verdant Tile | `cluttered:verdant_tile` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Verdant Tile Corner | `cluttered:verdant_tile_corner` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Verdant Tile Edge | `cluttered:verdant_tile_edge` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Door | `cluttered:willow_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Garden Door | `cluttered:willow_garden_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Hanging Sign | `cluttered:willow_hanging_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Log Door | `cluttered:willow_log_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Sign | `cluttered:willow_sign` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Trapdoor | `cluttered:willow_trapdoor` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Wainscoting | `cluttered:willow_wainscoting` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Window | `cluttered:willow_window` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Willow Window Pane | `cluttered:willow_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wooden French Door | `cluttered:wooden_french_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wooden Screen Door | `cluttered:wooden_screen_door` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Victorian Bracket | `cluttered:wooden_victorian_bracket` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Bow Bracket | `cluttered:wooden_victorian_bracket_bow` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Bow-Scroll Bracket | `cluttered:wooden_victorian_bracket_bow_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Scroll Bracket | `cluttered:wooden_victorian_bracket_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Shelf Bracket | `cluttered:wooden_victorian_bracket_scroll_shelf` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Star Bracket | `cluttered:wooden_victorian_bracket_star` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wood Star-Scroll Bracket | `cluttered:wooden_victorian_bracket_star_scroll` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wooden Window | `cluttered:wooden_window_divided` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Wooden Window Pane | `cluttered:wooden_window_pane` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue X-Tiles | `cluttered:x_tile_blue` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Blue Inverse X-Tiles | `cluttered:x_tile_blue_inverse` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Gray X-Tiles | `cluttered:x_tile_gray` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Gray Inverse X-Tiles | `cluttered:x_tile_gray_inverse` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Terracotta X-Tiles | `cluttered:x_tile_terracotta` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Terracotta Inverse X-Tiles | `cluttered:x_tile_terracotta_inverse` | Architectural/interior surface decoration: resource-supported but keep separate pending decision whether furniture box includes doors/windows/wall coverings/building ornament. |
| Acacia Seat | `decorative_blocks:acacia_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Bamboo Seat | `decorative_blocks:bamboo_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Birch Seat | `decorative_blocks:birch_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Cherry Seat | `decorative_blocks:cherry_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Crimson Seat | `decorative_blocks:crimson_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Dark Oak Seat | `decorative_blocks:dark_oak_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Jungle Seat | `decorative_blocks:jungle_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Mangrove Seat | `decorative_blocks:mangrove_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Oak Seat | `decorative_blocks:oak_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Spruce Seat | `decorative_blocks:spruce_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Warped Seat | `decorative_blocks:warped_seat` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Supply Cart | `farm_and_charm:supply_cart` | A placeable entity/transport cart rather than a block; inspect how it behaves and looks before adding to a furniture pool. |
| Black Pouffe | `furniture:pouffe_black` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Blue Pouffe | `furniture:pouffe_blue` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Brown Pouffe | `furniture:pouffe_brown` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Cyan Pouffe | `furniture:pouffe_cyan` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Gray Pouffe | `furniture:pouffe_gray` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Green Pouffe | `furniture:pouffe_green` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Light Blue Pouffe | `furniture:pouffe_light_blue` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Light Gray Pouffe | `furniture:pouffe_light_gray` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Lime Pouffe | `furniture:pouffe_lime` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Magenta Pouffe | `furniture:pouffe_magenta` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Orange Pouffe | `furniture:pouffe_orange` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Pink Pouffe | `furniture:pouffe_pink` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Purple Pouffe | `furniture:pouffe_purple` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Red Pouffe | `furniture:pouffe_red` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| White Pouffe | `furniture:pouffe_white` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Yellow Pouffe | `furniture:pouffe_yellow` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Black Sofa | `furniture:sofa_black` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Blue Sofa | `furniture:sofa_blue` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Brown Sofa | `furniture:sofa_brown` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Cyan Sofa | `furniture:sofa_cyan` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Gray Sofa | `furniture:sofa_gray` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Green Sofa | `furniture:sofa_green` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Light Blue Sofa | `furniture:sofa_light_blue` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Light Gray Sofa | `furniture:sofa_light_gray` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Lime Sofa | `furniture:sofa_lime` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Magenta Sofa | `furniture:sofa_magenta` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Orange Sofa | `furniture:sofa_orange` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Pink Sofa | `furniture:sofa_pink` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Purple Sofa | `furniture:sofa_purple` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Red Sofa | `furniture:sofa_red` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| White Sofa | `furniture:sofa_white` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Yellow Sofa | `furniture:sofa_yellow` | Aesthetic review: generic dyed sofa/pouffe family may meet basic wool/cushion exclusion. No visual inspection; not a confirmed aesthetic exclusion. |
| Climbing Rope | `meadow:climbing_rope_topmount` | Placeable climbing equipment; inspect whether it is wanted as mountaineering décor. |
| Pine Barn Door | `meadow:pine_barn_door` | Themed architectural fixture; scope review against generic-building-block exclusion. |
| Pine Barn Trapdoor | `meadow:pine_barn_trapdoor` | Themed architectural fixture; scope review against generic-building-block exclusion. |
| Pine Railing | `meadow:pine_railing` | Architectural railing rather than standalone furniture; scope review. |
| Black Stool | `quark:black_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Blue Stool | `quark:blue_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Brown Stool | `quark:brown_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Cyan Stool | `quark:cyan_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Gray Stool | `quark:gray_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Green Stool | `quark:green_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Light Blue Stool | `quark:light_blue_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Light Gray Stool | `quark:light_gray_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Lime Stool | `quark:lime_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Magenta Stool | `quark:magenta_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Orange Stool | `quark:orange_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Pink Stool | `quark:pink_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Purple Stool | `quark:purple_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Red Stool | `quark:red_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| White Stool | `quark:white_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Yellow Stool | `quark:yellow_stool` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Acacia Hedge | `refurbished_furniture:acacia_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Acacia Lattice Fence | `refurbished_furniture:acacia_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Acacia Lattice Fence Gate | `refurbished_furniture:acacia_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Andesite Stepping Stones | `refurbished_furniture:andesite_stepping_stones` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Azalea Hedge | `refurbished_furniture:azalea_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Birch Hedge | `refurbished_furniture:birch_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Birch Lattice Fence | `refurbished_furniture:birch_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Birch Lattice Fence Gate | `refurbished_furniture:birch_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Black Sofa | `refurbished_furniture:black_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Black Stool | `refurbished_furniture:black_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Blue Sofa | `refurbished_furniture:blue_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Blue Stool | `refurbished_furniture:blue_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Brown Sofa | `refurbished_furniture:brown_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Brown Stool | `refurbished_furniture:brown_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Cherry Hedge | `refurbished_furniture:cherry_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Cherry Lattice Fence | `refurbished_furniture:cherry_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Cherry Lattice Fence Gate | `refurbished_furniture:cherry_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Crimson Lattice Fence | `refurbished_furniture:crimson_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Crimson Lattice Fence Gate | `refurbished_furniture:crimson_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Cyan Sofa | `refurbished_furniture:cyan_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Cyan Stool | `refurbished_furniture:cyan_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Dark Oak Hedge | `refurbished_furniture:dark_oak_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Dark Oak Lattice Fence | `refurbished_furniture:dark_oak_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Dark Oak Lattice Fence Gate | `refurbished_furniture:dark_oak_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Deepslate Stepping Stones | `refurbished_furniture:deepslate_stepping_stones` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Diorite Stepping Stones | `refurbished_furniture:diorite_stepping_stones` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Granite Stepping Stones | `refurbished_furniture:granite_stepping_stones` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Gray Sofa | `refurbished_furniture:gray_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Gray Stool | `refurbished_furniture:gray_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Green Sofa | `refurbished_furniture:green_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Green Stool | `refurbished_furniture:green_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Jungle Hedge | `refurbished_furniture:jungle_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Jungle Lattice Fence | `refurbished_furniture:jungle_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Jungle Lattice Fence Gate | `refurbished_furniture:jungle_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Light Blue Sofa | `refurbished_furniture:light_blue_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Light Blue Stool | `refurbished_furniture:light_blue_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Light Gray Sofa | `refurbished_furniture:light_gray_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Light Gray Stool | `refurbished_furniture:light_gray_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Lime Sofa | `refurbished_furniture:lime_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Lime Stool | `refurbished_furniture:lime_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Magenta Sofa | `refurbished_furniture:magenta_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Magenta Stool | `refurbished_furniture:magenta_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Mangrove Hedge | `refurbished_furniture:mangrove_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Mangrove Lattice Fence | `refurbished_furniture:mangrove_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Mangrove Lattice Fence Gate | `refurbished_furniture:mangrove_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Oak Hedge | `refurbished_furniture:oak_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Oak Lattice Fence | `refurbished_furniture:oak_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Oak Lattice Fence Gate | `refurbished_furniture:oak_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Orange Sofa | `refurbished_furniture:orange_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Orange Stool | `refurbished_furniture:orange_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Pink Sofa | `refurbished_furniture:pink_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Pink Stool | `refurbished_furniture:pink_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Purple Sofa | `refurbished_furniture:purple_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Purple Stool | `refurbished_furniture:purple_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Red Sofa | `refurbished_furniture:red_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Red Stool | `refurbished_furniture:red_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Spruce Hedge | `refurbished_furniture:spruce_hedge` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Spruce Lattice Fence | `refurbished_furniture:spruce_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Spruce Lattice Fence Gate | `refurbished_furniture:spruce_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Stone Stepping Stones | `refurbished_furniture:stone_stepping_stones` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Warped Lattice Fence | `refurbished_furniture:warped_lattice_fence` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| Warped Lattice Fence Gate | `refurbished_furniture:warped_lattice_fence_gate` | Outdoor landscaping/architectural decor: keep as a separate optional pool pending box scope. |
| White Sofa | `refurbished_furniture:white_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| White Stool | `refurbished_furniture:white_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Yellow Sofa | `refurbished_furniture:yellow_sofa` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Yellow Stool | `refurbished_furniture:yellow_stool` | Aesthetic review: generic dyed sofa/stool family; model/textures not visually inspected, so basic upholstery exclusion remains provisional. |
| Acacia Table | `twigs:acacia_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Bamboo Table | `twigs:bamboo_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Birch Table | `twigs:birch_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Cherry Table | `twigs:cherry_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Crimson Table | `twigs:crimson_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Dark Oak Table | `twigs:dark_oak_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Jungle Table | `twigs:jungle_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Mangrove Table | `twigs:mangrove_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Oak Table | `twigs:oak_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Spruce Table | `twigs:spruce_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Warped Table | `twigs:warped_table` | 밋밋한 기본형 여부 외형 검토, 저가 상점 후보 |
| Acacia Lattice | `vinery:acacia_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Bamboo Lattice | `vinery:bamboo_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Birch Lattice | `vinery:birch_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Cherry Lattice | `vinery:cherry_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Dark Cherry Lattice | `vinery:dark_cherry_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Dark Oak Lattice | `vinery:dark_oak_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Jungle Lattice | `vinery:jungle_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Mangrove Lattice | `vinery:mangrove_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Oak Lattice | `vinery:oak_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Spruce Lattice | `vinery:spruce_lattice` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Window | `vinery:window` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |
| Window Block | `vinery:window_block` | Decorative trellis/window fixture with native item; scope review against generic-building-block exclusion. |

</details>

## 검증과 원본팩 연결

- 원본 683개 중 676개가 후보에 연결됩니다. 나머지 7개는 재료 `canvas`/`pells`, 가구 범위 밖 대포, 기본형 검토 중인 안락의자 2종, 바닐라 그림/종 2종이며 각각 별도 기록했습니다.
- 원본 `globalFurniturePlushies.js`의 `global.lootFurniture`에는 683개 ID가 있습니다. 원본 항목을 참고하면서 다른 설치 모드의 가구까지 조사했습니다.
- Tanuki/Whimsy/Night Lights/Beautify 및 핵심 가구·테마 모드는 언어·아이템 모델과 정적 등록 근거를 대조했습니다. 보조 장식 모드에는 언어·모델 확인 수준인 후보도 있으며, JSON에 항목별 증거를 남겼습니다.
- 원본팩의 `originalPlushies` 목록과 `plushieReRegister.js`가 등록하는 `adv_` ID를 연결했습니다. 인형 특성·퀘스트·애정·품질 NBT는 기존 생성 규칙을 재사용하는 방향이며 아직 지급 구현은 하지 않았습니다.
- Whimsy 1.2의 실제 `whimsy_deco:singing_frog`와 원본 스크립트가 가리키는 `singing_frog_plushie`는 이름이 다릅니다. 같은 아이템으로 임의 치환하지 않고, 확인된 전자는 후보로 남기고 후자 매핑은 보류했습니다.
- Fantasy Furniture ID에는 `fantasyfurniture:royal/sofa`처럼 `/`가 들어갑니다. 번역키의 점을 그대로 ID로 사용하지 않습니다.
- Let’s Do Furniture 가로등 아이템 ID는 `furniture:street_lantern_item`, `furniture:plated_street_lantern_item`입니다. 아이템 없는 블록 경로를 보상으로 쓰지 않습니다.
- 테마 모드의 접시·그릇·야자 횃불은 내부 블록 대신 실제 지급 아이템을 사용합니다. Cozy Cafe 간판은 설치 후 카페 연결이 필요할 수 있고, 관리기 NBT에 다른 카페 데이터를 복사하지 않습니다. Brewery 무늬 카펫은 같은 블록을 설치하는 아이템 별칭이 있어 운영 목록 확정 시 중복 가구 처리를 확인합니다.
- Every Compat의 런타임 생성 변형, 서버/클라이언트 실제 레지스트리, 원본팩의 추가 비활성화 설정을 확인한 뒤 운영용 목록을 확정해야 합니다.

[기계 판독용 전체 후보·증거·경계 검토·제외 목록](data/furniture-random-box-candidates-2026-10-26.json)

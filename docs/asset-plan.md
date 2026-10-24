# 현재 에셋 범위

사용자의 범위 축소와 KubeJS 등록 확정에 맞춰 이전 18종 계획을 대체합니다.

| 에셋 | 용도·경로 | 형식/규격 | 스타일 | 우선순위·대체 여부 | 상태 |
|---|---|---|---|---|---|
| 런처 배경 | `launcher/src/renderer/src/Valley.tsx` | SVG 코드, 화면에 맞춤 | 따뜻한 픽셀 마을·녹색·크림 | 필수, 최종 원화로 교체 가능 | 자체 제작 플레이스홀더 |
| 런처 로고·버튼 | `App.tsx`, `style.css` | 텍스트·CSS·SVG | 나무·잎·단순 아이콘 | 필수, 개별 버튼 이미지 불필요 | 구현 |
| 건피권 | `assets/kubejs/textures/item/geonpi_ticket.png` | 투명 PNG 16×16 | 종이표·해 | 필수, 개선 가능 | 제작·모델 연결 |
| 닉변권 | `assets/kubejs/textures/item/rename_ticket.png` | 투명 PNG 16×16 | 이름표·펜 | 필수, 개선 가능 | 제작·모델 연결 |
| 선린 급식 | `assets/kubejs/textures/item/sunrin_meal.png` | 투명 PNG 16×16 | 따뜻한 도시락 | 필수, 개선 가능 | 제작·모델 연결 |
| 리소스팩 아이콘 | `resourcepacks/Sunrin-Custom/pack.png` | PNG 128×128 | 마을·해 | 필수, 개선 가능 | 제작 |

아이템 경로는 `resourcepacks/Sunrin-Custom/` 아래입니다. namespace는 등록 방식에 맞춰 **kubejs로 확정**했습니다. KubeJS가 아이템을 등록하고 팩이 외형·번역을 제공합니다. 리소스팩 단독으로 새 아이템이 생기지 않습니다.

모든 그림은 이 프로젝트에서 새로 만든 코드 기반 픽셀 도형입니다. 기존 게임의 그림·로고를 복사하지 않았습니다. 랜덤 꾸러미·가구 꾸러미·행사·노래방 전용 에셋은 현재 제작 범위에서 제외합니다.

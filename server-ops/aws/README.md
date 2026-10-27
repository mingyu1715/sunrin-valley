# 선린밸리 AWS 테스트 서버

서울 `m7i.xlarge`(4 vCPU·16GiB), 암호화 gp3 100GB, Ubuntu 24.04 x64·Java 17, Forge 47.4.0용입니다. 기존 런처와 운영 버전 채널은 변경하지 않습니다.

현재 로컬 0.2.0 후보는 공식 Sunlit Valley 4.1.5A **서버 팩**에 추가 모드 4종(Beat Lamp 1.2.2 포함), Sunrin Core 및 재귀 선린 KubeJS 오버레이를 준비합니다. 운영 채널은 0.1.4를 유지하며, 후보 GitHub 자산은 아직 게시하지 않았습니다. Java 힙은 초기 4GB·최대 12GB입니다. 고정 Elastic IP를 사용하고 Minecraft TCP 25565·음성 UDP 24454만 공개합니다. 관리에는 SSM을 사용하며 SSH·RCON은 공개하지 않습니다.

신규 부트스트랩은 체크섬으로 고정한 자체 서버 오버레이를 다운로드합니다. 완전한 내장 페이로드가 SSM 크기 제한을 넘으므로 후보 자산 게시 전에는 실제 설치를 실행할 수 없습니다. 기존 설치는 변경된 잠금 파일을 거부하며, 검토된 소유권 마이그레이션과 백업·롤백은 [서버 업데이트 절차](../README.md#sunrin-020-local-candidate)를 따릅니다.

## 실행

AWS CLI 2.32 이상과 Python 3.10 이상이 필요합니다. 계정 인증은 브라우저에서 직접 진행합니다. 암호·장기 액세스 키를 코드나 서버에 넣지 않습니다.

```sh
aws login --profile sunrin-valley --region ap-northeast-2
python3 server-ops/aws/infrastructure.py plan --whitelist PLAYER_NAME --test-minutes 60
# 실제 생성은 비용과 Minecraft EULA 동의 후에만 실행
python3 server-ops/aws/infrastructure.py deploy --confirm-cost --accept-eula --whitelist PLAYER_NAME --test-minutes 60
python3 server-ops/aws/infrastructure.py status
python3 server-ops/aws/infrastructure.py start
python3 server-ops/aws/infrastructure.py stop
```

`stop`은 월드 저장 응답과 정상 프로세스 종료 증명을 받은 뒤에만 EC2를 중지합니다. 저장 실패나 비정상 JVM 종료를 정상 종료로 간주하지 않습니다. 중지·재시작에도 고정 IP와 EBS 데이터는 유지됩니다.

기본 테스트 제한은 준비 완료 후 60분입니다. Forge 재시작은 이미 작동하는 타이머를 연장하지 않습니다. 종료에 실패하면 강제로 끄지 않고 재시도하므로 **요금의 강제 상한은 아닙니다**. 초기 설치 실패도 방치되지 않도록 별도의 첫 부팅 종료 장치와 SSM 연결 전 실패 정리를 포함합니다.

## 요금과 알림

2026-10-23 공개 요금 기준으로 EC2 $0.2478/시간, 고정 IPv4 $0.005/시간, gp3 100GB $9.12/월입니다. EC2를 중지해도 **디스크와 고정 IP 요금은 남습니다**. 세금·유료 전송·추가 서비스는 별도입니다.

월간 사용료 예산 $7.55에 ACTUAL 30%·80%·100% 알림을 설정합니다. 2026-10-23 ECB 기준 환율 약 1,324.45원/$로 약 3천·8천·1만 원이며 실제 청구 환율은 다릅니다. 크레딧·환불로 사용료가 숨겨지지 않게 계산하며, 세금은 포함합니다. 알림은 지연될 수 있으며 수신 이메일 인증이 필요합니다. 기본 명령은 계획만 출력하며 `--apply`만 생성합니다. 기존 예산의 다른 설정은 덮어쓰지 않습니다.

```sh
python3 server-ops/aws/budgets.py --email YOUR_EMAIL --reference-krw-per-usd 1324.4527829893684
python3 server-ops/aws/budgets.py --email YOUR_EMAIL --reference-krw-per-usd 1324.4527829893684 --apply
python3 server-ops/aws/budgets.py --email YOUR_EMAIL --reference-krw-per-usd 1324.4527829893684 --verify-only
```

## 백업·주의 사항

호스트의 `python3 /usr/local/lib/sunrin/host.py backup`은 서버가 정상 중지된 상태에서 로컬 백업을 만들고 최근 3개를 유지합니다. 같은 EBS 안의 백업이며 외부 보관은 아닙니다. 인스턴스/스택을 삭제하면 루트 EBS와 월드도 삭제되므로 먼저 외부 백업을 확보해야 합니다. 서버 팩·리소스의 원본 전체 배포 파일은 Git에 포함하지 않습니다.

현재 `server-ops/updater.py` 운영 채널 전환은 별도로 활성화하지 않습니다. 실제 초기 서버가 검증되기 전 클라이언트 운영 버전을 올리지 않습니다.

```sh
python3 -m unittest discover -s server-ops/aws -p 'test_*.py'
bash -n server-ops/aws/bootstrap.sh
```

## 서버 목록 아이콘

`server-icon.png`는 앱 로고를 변환한 64×64 PNG입니다. 새 설치는 첫 시작 전에 적용하며, 기존 서버는 `python3 server-ops/aws/infrastructure.py queue-branding`으로 적용합니다. 이 명령은 EC2를 시작하지 않습니다. 중지 상태이면 다음 연결 때 실행되도록 최대 30일 대기하며, 이미 실행 중이면 저장·종료 확인 후 Minecraft만 재시작할 수 있습니다. 기존 60분 타이머는 연장하지 않습니다.

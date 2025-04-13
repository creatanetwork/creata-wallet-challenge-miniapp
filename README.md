# 크레아타 지갑 챌린지 미니앱

텔레그램 미니앱을 활용한 '블록체인 섬 탐험' 컨셉의 게임화된 크레아타 지갑 챌린지 앱입니다.

## 프로젝트 개요

이 프로젝트는 사용자들이 크레아타 지갑을 설치하고 다양한 블록체인 관련 미션을 완료하여 보상을 획득하는 게임화된 경험을 제공합니다. 텔레그램 미니앱 환경에서 실행되며, 다음과 같은 기능을 포함합니다:

- 크레아타 지갑 설치 및 연결 가이드
- 블록체인 탐험을 테마로 한 다양한 미션
- NFT 및 CTA(크레아타체인의 네이티브 토큰) 보상 시스템
- 주간 리더보드 및 랭킹 시스템
- 사용자 프로필 및 보상 관리

## 기술 스택

- **프론트엔드**: React, Vite, TailwindCSS, Framer Motion
- **백엔드**: Firebase (Firestore, Functions, Auth)
- **블록체인**: 크레아타체인 (카테나, 제니스)
- **외부 연동**: 텔레그램 WebApp API, 크레아타 지갑 API

## 프로젝트 설치 및 실행

### 필수 요구사항

- Node.js 18+ 설치
- Firebase 계정 및 프로젝트 설정
- 텔레그램 봇 및 미니앱 설정

### 설치 과정

1. 저장소를 클론합니다:
```bash
git clone https://github.com/your-username/creata-wallet-challenge-miniapp.git
cd creata-wallet-challenge-miniapp
```

2. 필요한 패키지를 설치합니다:
```bash
npm install
```

3. 환경 변수를 설정합니다:
`.env` 파일을 수정하여 Firebase 및 API 키를 설정합니다.

4. 개발 서버를 실행합니다:
```bash
npm run dev
```

5. 브라우저에서 `http://localhost:3000`으로 접속하여 앱을 확인합니다.

### 프로덕션 빌드

```bash
npm run build
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

## 미션 구조

프로젝트는 다음과 같은 8가지 주요 미션으로 구성되어 있습니다:

1. **입도 미션**: 크레아타 지갑 설치 및 연결
2. **유물 발견**: 첫 트랜잭션 전송
3. **유적 조사**: 스마트 컨트랙트 분석/배포
4. **전송 의식**: 크로스체인 전송
5. **수호자 인증**: 스테이킹 완료
6. **비밀문 해독**: 트랜잭션 로그 추적
7. **지식의 탑**: 블록체인 퀴즈 풀기
8. **챔피언 랭킹**: 리더보드 경쟁

각 미션은 고유한 보상과 난이도를 가지고 있으며, '블록체인 섬 탐험' 테마에 맞춰 스토리텔링 방식으로 제공됩니다.

## Firebase 컬렉션 구조

프로젝트는 다음과 같은 Firebase 컬렉션 구조를 사용합니다:

1. **users**: 사용자 정보 및 진행 상황
2. **missions**: 미션 정보 및 요구사항
3. **nfts**: NFT 메타데이터 및 정보
4. **leaderboard**: 주간 리더보드 및 랭킹
5. **stats**: 글로벌 통계 정보
6. **transactions**: 보상 트랜잭션 기록

자세한 스키마 정보는 `firebase.js` 파일을 참조하세요.

## 프로젝트 구조

```
creata-wallet-challenge-miniapp/
├── public/              # 정적 파일
├── src/
│   ├── components/      # 재사용 가능한 컴포넌트
│   ├── features/        # 기능별 모듈
│   ├── services/        # 외부 서비스 연동
│   ├── utils/           # 유틸리티 함수
│   ├── styles/          # 스타일 파일
│   ├── App.jsx          # 메인 앱 컴포넌트
│   └── main.jsx         # 진입점
├── .env                 # 환경 변수
└── vite.config.js       # Vite 설정
```

## 중요 참고 사항

- **CTA 토큰**: CTA는 크레아타체인의 네이티브 토큰으로, 별도의 스마트 컨트랙트 주소가 필요하지 않습니다. 일반적인 ETH나 BNB처럼 네이티브 전송을 통해 거래됩니다.
- **보상 시스템**: NFT 보상은 스마트 컨트랙트를 통해 민팅되며, CTA 보상은 네이티브 토큰 전송을 통해 이루어집니다.

## 라이센스

이 프로젝트는 MIT 라이센스에 따라 배포됩니다. 자세한 내용은 LICENSE 파일을 참조하세요.

## 기여 방법

1. 저장소를 포크합니다.
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`).
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`).
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`).
5. Pull Request를 생성합니다.

## 문의

질문이나 제안이 있으시면 이슈를 통해 문의해 주세요.

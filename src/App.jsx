import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { initTelegramWebApp } from './services/telegram';

// 서비스
import { checkWalletInstalled } from './services/wallet';

// 스크린
import OnboardingScreen from './features/onboarding/OnboardingScreen';
import MissionsScreen from './features/missions/MissionsScreen';
import MissionDetail from './features/missions/MissionDetail';
import RewardsScreen from './features/rewards/RewardsScreen';
import ProfileScreen from './features/profile/ProfileScreen';
import LeaderboardScreen from './features/profile/LeaderboardScreen';

function App() {
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 텔레그램 WebApp 초기화
    const webApp = initTelegramWebApp();
    if (webApp) {
      const user = webApp.initDataUnsafe?.user;
      if (user) {
        setTelegramUser({
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          username: user.username
        });
      }

      // 텔레그램 UI 설정
      webApp.setBackgroundColor('#121212');
      webApp.setHeaderColor('#121212');
      webApp.expand();
    }

    // 지갑 연결 상태 확인
    const checkWalletConnection = async () => {
      try {
        const isInstalled = await checkWalletInstalled();
        // 여기에 추가로 지갑이 연결되었는지 확인하는 로직 추가 필요
        setIsWalletConnected(false); // 기본값은 연결되지 않음
        setIsLoading(false);
      } catch (error) {
        console.error('지갑 연결 확인 오류:', error);
        setIsWalletConnected(false);
        setIsLoading(false);
      }
    };

    checkWalletConnection();
  }, []);

  // 로딩 중 화면
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-primary-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">크레아타 지갑 챌린지</h1>
          <p className="text-gray-300">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 지갑이 연결되지 않았다면 온보딩 화면으로 리다이렉트
  if (!isWalletConnected && window.location.pathname !== '/') {
    return <Navigate to="/" />;
  }

  return (
    <div className="app bg-primary-dark min-h-screen text-white">
      <Routes>
        <Route
          path="/"
          element={
            <OnboardingScreen
              telegramUser={telegramUser}
              onWalletConnected={(userInfo) => {
                setIsWalletConnected(true);
                setUserInfo(userInfo);
              }}
            />
          }
        />
        <Route path="/missions" element={<MissionsScreen userInfo={userInfo} />} />
        <Route path="/mission/:id" element={<MissionDetail userInfo={userInfo} />} />
        <Route path="/rewards" element={<RewardsScreen userInfo={userInfo} />} />
        <Route path="/profile" element={<ProfileScreen userInfo={userInfo} />} />
        <Route path="/leaderboard" element={<LeaderboardScreen userInfo={userInfo} />} />
      </Routes>
    </div>
  );
}

export default App;

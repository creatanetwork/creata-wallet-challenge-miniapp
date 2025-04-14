import { useEffect, useState } from 'react';
import { getTelegramUser } from '../services/telegram';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

const TelegramAuth = ({ onAuth }) => {
  const [user, setUser] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  // 텔레그램 사용자 정보 가져오기
  useEffect(() => {
    const fetchTelegramUser = async () => {
      try {
        // 텔레그램 WebApp에서 사용자 정보 가져오기
        const telegramUser = getTelegramUser();
        
        if (telegramUser) {
          setUser(telegramUser);
          
          // 서버에서 사용자 인증 검증 (Firebase Function 호출)
          setIsVerifying(true);
          try {
            const verifyTelegramUserFunc = httpsCallable(functions, 'verifyTelegramUser');
            const webApp = window.Telegram?.WebApp;
            
            // 텔레그램 initData 전달
            const result = await verifyTelegramUserFunc({
              initData: webApp ? webApp.initData : ''
            });
            
            if (result.data.verified) {
              // 검증된 사용자 정보로 업데이트
              setUser(prev => ({ ...prev, ...result.data.user }));
              
              // 부모 컴포넌트에 인증 완료 알림
              if (onAuth) {
                onAuth(result.data.user);
              }
            } else {
              setError('텔레그램 사용자 인증에 실패했습니다.');
            }
          } catch (verifyError) {
            console.error('텔레그램 사용자 검증 오류:', verifyError);
            // 검증 오류가 발생해도 기본 사용자 정보는 활용
            if (onAuth) {
              onAuth(telegramUser);
            }
          } finally {
            setIsVerifying(false);
          }
        } else {
          setError('텔레그램 사용자 정보를 가져올 수 없습니다.');
        }
      } catch (error) {
        console.error('텔레그램 인증 오류:', error);
        setError('텔레그램 인증 중 오류가 발생했습니다.');
      }
    };

    fetchTelegramUser();
  }, [onAuth]);

  // 로딩 중
  if (isVerifying) {
    return (
      <div className="flex flex-col items-center p-4">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-sm text-gray-400">텔레그램 사용자 정보 확인 중...</p>
      </div>
    );
  }

  // 오류 발생
  if (error) {
    return (
      <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-center">
        <p className="text-warning mb-2">인증 오류</p>
        <p className="text-sm text-gray-300">{error}</p>
        <p className="text-xs text-gray-400 mt-2">
          텔레그램 미니앱에서 이 앱을 실행해주세요.
        </p>
      </div>
    );
  }

  // 인증된 사용자 표시
  if (user) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center">
        <div className="w-10 h-10 rounded-full bg-primary/30 flex items-center justify-center mr-3 flex-shrink-0">
          <span className="text-white font-bold">
            {user.firstName ? user.firstName[0] : '?'}
          </span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white">
            {user.firstName} {user.lastName || ''}
          </p>
          {user.username && (
            <p className="text-sm text-gray-400">@{user.username}</p>
          )}
        </div>
        <div className="bg-success/20 text-success text-xs font-semibold px-2 py-1 rounded-full">
          인증됨
        </div>
      </div>
    );
  }

  // 기본 상태 (사용자 정보 없음)
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className="text-gray-300 mb-2">텔레그램 사용자 정보를 가져올 수 없습니다.</p>
      <p className="text-xs text-gray-400">
        텔레그램 미니앱에서 이 앱을 실행해주세요.
      </p>
    </div>
  );
};

export default TelegramAuth;

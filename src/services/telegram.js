// 텔레그램 WebApp 객체 초기화 및 액세스
export const initTelegramWebApp = () => {
  // window.Telegram.WebApp 객체가 있는지 확인
  if (!window.Telegram || !window.Telegram.WebApp) {
    console.error('텔레그램 WebApp을 찾을 수 없습니다.');
    return null;
  }

  // WebApp 객체 반환
  return window.Telegram.WebApp;
};

// 텔레그램 사용자 정보 가져오기
export const getTelegramUser = () => {
  const webApp = initTelegramWebApp();
  if (!webApp) return null;

  // 텔레그램에서 제공하는 사용자 데이터
  const user = webApp.initDataUnsafe?.user;
  if (!user) {
    console.warn('텔레그램 사용자 정보를 가져올 수 없습니다.');
    return null;
  }

  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    username: user.username,
    languageCode: user.language_code
  };
};

// 텔레그램 사용자 인증 데이터 검증 (백엔드와 통신)
export const verifyTelegramUser = async () => {
  const webApp = initTelegramWebApp();
  if (!webApp) return { verified: false };

  try {
    // 전체 initData를 백엔드로 전송하여 검증
    const initData = webApp.initData;

    const response = await fetch('/api/verify-telegram-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ initData })
    });

    const result = await response.json();
    return { verified: result.verified, user: result.user };
  } catch (error) {
    console.error('텔레그램 사용자 검증 오류:', error);
    return { verified: false };
  }
};

// 메인 버튼 설정 (화면 하단에 표시되는 주요 액션 버튼)
export const setMainButton = (text, onClick, isActive = true, color = '#2cab37') => {
  const webApp = initTelegramWebApp();
  if (!webApp) return;

  // 메인 버튼 설정
  const mainButton = webApp.MainButton;
  mainButton.text = text;
  mainButton.color = color;

  if (isActive) {
    mainButton.show();
    mainButton.enable();
  } else {
    mainButton.hide();
  }

  // 이전 이벤트 리스너 제거
  mainButton.offClick(mainButton.onClick);

  // 새 이벤트 리스너 추가
  if (onClick) {
    mainButton.onClick(onClick);
  }
};

// 앱 배경색 설정
export const setBackgroundColor = (color) => {
  const webApp = initTelegramWebApp();
  if (!webApp) return;

  webApp.setBackgroundColor(color);
};

// 앱 헤더 색상 설정
export const setHeaderColor = (color) => {
  const webApp = initTelegramWebApp();
  if (!webApp) return;

  webApp.setHeaderColor(color);
};

// 화면 확장 (전체 화면 모드)
export const expandApp = () => {
  const webApp = initTelegramWebApp();
  if (!webApp) return;

  webApp.expand();
};

// 메인 텔레그램 앱으로 데이터 전송 (미션 완료, 보상 수령 등의 결과)
export const sendDataToTelegram = (data) => {
  const webApp = initTelegramWebApp();
  if (!webApp) return false;

  try {
    // 데이터를 문자열로 변환하여 전송
    webApp.sendData(JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('텔레그램 데이터 전송 오류:', error);
    return false;
  }
};

// 햅틱 피드백 (진동) 제공
export const hapticFeedback = (type) => {
  const webApp = initTelegramWebApp();
  if (!webApp || !webApp.HapticFeedback) return;

  // 지원되는 타입: impact, notification, selection
  switch (type) {
    case 'success':
      webApp.HapticFeedback.notificationOccurred('success');
      break;
    case 'warning':
      webApp.HapticFeedback.notificationOccurred('warning');
      break;
    case 'error':
      webApp.HapticFeedback.notificationOccurred('error');
      break;
    case 'light':
      webApp.HapticFeedback.impactOccurred('light');
      break;
    case 'medium':
      webApp.HapticFeedback.impactOccurred('medium');
      break;
    case 'heavy':
      webApp.HapticFeedback.impactOccurred('heavy');
      break;
    case 'selection':
      webApp.HapticFeedback.selectionChanged();
      break;
  }
};

// 알림 표시 (텔레그램 팝업)
export const showAlert = (message) => {
  const webApp = initTelegramWebApp();
  if (!webApp) {
    alert(message); // 폴백
    return;
  }

  webApp.showAlert(message);
};

// 확인 대화상자 표시
export const showConfirm = async (message) => {
  const webApp = initTelegramWebApp();
  if (!webApp) {
    return confirm(message); // 폴백
  }

  return new Promise((resolve) => {
    webApp.showConfirm(message, resolve);
  });
};

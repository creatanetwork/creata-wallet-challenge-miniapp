// 지갑 주소 형식화 (0x1234...5678)
export const formatWalletAddress = (address, start = 6, end = 4) => {
  if (!address) return '';
  if (address.length < (start + end)) return address;

  return `${address.substring(0, start)}...${address.substring(address.length - end)}`;
};

// 날짜 형식화
export const formatDate = (dateObj) => {
  if (!dateObj) return '';

  // Date 객체가 아니면 변환
  const date = dateObj instanceof Date ? dateObj : new Date(dateObj);

  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 상대적 시간 표시 (예: '3분 전', '2시간 전')
export const getRelativeTime = (dateObj) => {
  if (!dateObj) return '';

  // Date 객체가 아니면 변환
  const date = dateObj instanceof Date ? dateObj : new Date(dateObj);

  // 유효한 날짜인지 확인
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diff = now - date;

  // 시간 간격 계산
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return '방금 전';
  } else if (minutes < 60) {
    return `${minutes}분 전`;
  } else if (hours < 24) {
    return `${hours}시간 전`;
  } else if (days < 7) {
    return `${days}일 전`;
  } else {
    return formatDate(date);
  }
};

// 숫자 형식화 (예: 1000 -> 1,000)
export const formatNumber = (num) => {
  if (num === undefined || num === null) return '0';

  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// URL 파라미터 가져오기
export const getUrlParam = (paramName) => {
  const url = new URL(window.location.href);
  return url.searchParams.get(paramName);
};

// 로컬 스토리지 헬퍼 함수
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('로컬 스토리지 저장 오류:', error);
      return false;
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('로컬 스토리지 조회 오류:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('로컬 스토리지 삭제 오류:', error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('로컬 스토리지 초기화 오류:', error);
      return false;
    }
  }
};

// 세션 스토리지 헬퍼 함수
export const sessionStore = {
  set: (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('세션 스토리지 저장 오류:', error);
      return false;
    }
  },

  get: (key, defaultValue = null) => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('세션 스토리지 조회 오류:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      sessionStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('세션 스토리지 삭제 오류:', error);
      return false;
    }
  },

  clear: () => {
    try {
      sessionStorage.clear();
      return true;
    } catch (error) {
      console.error('세션 스토리지 초기화 오류:', error);
      return false;
    }
  }
};

// 문자열 자르기 (긴 텍스트 처리)
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + '...';
};

// 에러 메시지 처리
export const getErrorMessage = (error) => {
  if (!error) return '알 수 없는 오류가 발생했습니다.';

  if (typeof error === 'string') return error;

  if (error.message) return error.message;

  return '알 수 없는 오류가 발생했습니다.';
};

// 딜레이 함수 (async/await 용)
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 문자열에서 해시태그 추출
export const extractHashtags = (text) => {
  if (!text) return [];

  const hashtagRegex = /#[가-힣a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex);

  return matches || [];
};

// 유효한 이메일 주소 확인
export const isValidEmail = (email) => {
  if (!email) return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 유효한 URL 확인
export const isValidUrl = (url) => {
  if (!url) return false;

  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// 랜덤 ID 생성
export const generateRandomId = (length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};

// 텍스트 복사 (클립보드)
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      // 보안 컨텍스트(HTTPS)에서는 Clipboard API 사용
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 대체 방법 (구형 브라우저, HTTP)
      const textArea = document.createElement('textarea');
      textArea.value = text;

      // 화면 밖에 위치시킴
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);

      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      return success;
    }
  } catch (error) {
    console.error('클립보드 복사 오류:', error);
    return false;
  }
};

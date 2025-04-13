import { motion, AnimatePresence } from 'framer-motion';
import { hapticFeedback } from '../../services/telegram';

const WalletSetupGuide = ({ isVisible, onClose }) => {
  // 모달이 보이지 않으면 null 반환 (렌더링 안함)
  if (!isVisible) return null;

  // 닫기 버튼 핸들러
  const handleClose = () => {
    hapticFeedback('medium');
    onClose();
  };

  // 스토어 링크로 이동
  const goToAppStore = () => {
    hapticFeedback('medium');

    // 사용자 기기 감지
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.creatachain.wallet';
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      window.location.href = 'https://apps.apple.com/app/creata-wallet/id1234567890';
    } else {
      window.location.href = 'https://wallet.creatachain.com/download';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <motion.div
            className="bg-gray-900 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 헤더 */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h3 className="text-xl font-bold">지갑 설치 가이드</h3>
              <button
                className="text-gray-400 hover:text-white"
                onClick={handleClose}
              >
                ✕
              </button>
            </div>

            {/* 내용 */}
            <div className="p-4">
              <h4 className="font-semibold text-lg mb-3">1. 크레아타 지갑 다운로드</h4>
              <p className="text-gray-300 mb-4">
                앱스토어 또는 플레이스토어에서 '크레아타 지갑'을 검색하여 다운로드합니다.
              </p>

              <div className="flex justify-center mb-6">
                <button
                  className="btn-accent"
                  onClick={goToAppStore}
                >
                  지갑 다운로드 하기
                </button>
              </div>

              <h4 className="font-semibold text-lg mb-3">2. 지갑 계정 생성</h4>
              <ul className="text-gray-300 mb-4 space-y-2">
                <li>1) 앱을 실행하고 '새 지갑 생성' 선택</li>
                <li>2) 비밀번호 설정 및 확인</li>
                <li>3) 백업 구문(시드 구문) 안전하게 저장</li>
                <li>4) 구문 확인 절차 완료</li>
              </ul>

              <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-6">
                <p className="text-yellow-300 text-sm font-semibold">중요 안내</p>
                <p className="text-yellow-100 text-sm">
                  백업 구문은 절대 타인과 공유하지 마세요. 이 구문을 알면 지갑에 있는 모든 자산에 접근할 수 있습니다.
                </p>
              </div>

              <h4 className="font-semibold text-lg mb-3">3. 지갑 연결</h4>
              <p className="text-gray-300 mb-4">
                지갑 설치가 완료되면 다시 이 화면으로 돌아와서 '지갑 연결하기' 버튼을 클릭하세요.
                연결 요청이 지갑 앱으로 전송되며, 승인하면 연동이 완료됩니다.
              </p>

              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
                <p className="text-blue-300 text-sm font-semibold">도움이 필요하신가요?</p>
                <p className="text-blue-100 text-sm">
                  지갑 설치 또는 사용 중 문제가 있으면 크레아타 지갑 공식 텔레그램 채널에 문의하세요.
                </p>
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="border-t border-gray-800 p-4">
              <button
                className="btn-primary w-full"
                onClick={handleClose}
              >
                이해했습니다
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WalletSetupGuide;

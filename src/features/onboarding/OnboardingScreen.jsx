import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import WalletConnector from '../../components/WalletConnector';
import WalletSetupGuide from './WalletSetupGuide';
import { setMainButton, hapticFeedback, expandApp, setBackgroundColor } from '../../services/telegram';
import { storage } from '../../utils/helpers';

// 페이드인 애니메이션 변수
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const OnboardingScreen = ({ telegramUser, onWalletConnected }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isGuideVisible, setIsGuideVisible] = useState(false);

  // 텔레그램 UI 초기화
  useEffect(() => {
    expandApp();
    setBackgroundColor('#121212');

    // 이전에 방문한 적이 있는지 확인
    const visited = storage.get('hasVisitedBefore');
    if (visited) {
      // 바로 지갑 연결 단계로 이동
      setCurrentStep(2);
    }
  }, []);

  // 다음 단계로 이동
  const handleNextStep = () => {
    hapticFeedback('medium');
    setCurrentStep(prev => prev + 1);
  };

  // 지갑 연결 성공 처리
  const handleWalletConnected = (userInfo) => {
    // 방문 기록 저장
    storage.set('hasVisitedBefore', true);

    // 부모 컴포넌트에 연결 완료 알림
    onWalletConnected(userInfo);

    // 미션 화면으로 이동
    setTimeout(() => {
      navigate('/missions');
    }, 1000);
  };

  // 텔레그램 메인 버튼 설정
  useEffect(() => {
    if (currentStep < 2) {
      setMainButton('다음', handleNextStep, true, '#3a86ff');
    } else {
      // 지갑 연결 단계에서는 메인 버튼 숨김
      setMainButton('', null, false);
    }
  }, [currentStep]);

  // 단계별 내용 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h2 className="text-2xl font-bold mb-4">블록체인 섬에 오신 것을 환영합니다!</h2>
            <p className="text-gray-300 mb-8">
              잊혀진 블록체인 섬에서 다양한 미션을 완료하고 보상을 획득하세요.
              크레아타 지갑을 통해 블록체인의 세계를 탐험해보세요!
            </p>
            <img
              src="/assets/images/backgrounds/island.png"
              alt="블록체인 섬"
              className="w-full max-w-sm mx-auto rounded-lg mb-8"
            />
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h2 className="text-2xl font-bold mb-4">탐험을 위한 준비</h2>
            <p className="text-gray-300 mb-6">
              이 여정을 시작하기 위해서는 크레아타 지갑이 필요합니다.
              지갑은 당신의 디지털 자산과 NFT를 안전하게 보관하는 공간입니다.
            </p>

            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">준비물:</h3>
              <ul className="text-left text-gray-300">
                <li className="flex items-center mb-2">
                  <span className="text-success mr-2">✓</span> 텔레그램 계정 (이미 완료!)
                </li>
                <li className="flex items-center mb-2">
                  <span className="text-primary mr-2">→</span> 크레아타 지갑 설치
                </li>
                <li className="flex items-center">
                  <span className="text-primary mr-2">→</span> 지갑 계정 생성
                </li>
              </ul>
            </div>

            <button
              className="text-primary underline"
              onClick={() => setIsGuideVisible(true)}
            >
              지갑 설치 가이드 보기
            </button>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            className="text-center"
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <h2 className="text-2xl font-bold mb-4">지갑 연결하기</h2>
            <p className="text-gray-300 mb-8">
              크레아타 지갑을 텔레그램 계정과 연결하여
              블록체인 섬 탐험을 시작하세요!
            </p>

            <WalletConnector
              telegramUser={telegramUser}
              onConnect={handleWalletConnected}
            />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col py-6 px-4">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold highlighted-text text-shadow">
          크레아타 지갑 챌린지
        </h1>
      </div>

      {/* 단계 표시기 */}
      <div className="flex justify-center mb-8">
        {[0, 1, 2].map((step) => (
          <div
            key={step}
            className={`w-3 h-3 rounded-full mx-1 ${
              step === currentStep
                ? 'bg-accent'
                : step < currentStep
                  ? 'bg-success'
                  : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* 내용 */}
      <div className="flex-1 flex flex-col justify-center items-center px-4">
        {renderStepContent()}
      </div>

      {/* 지갑 설치 가이드 모달 */}
      <WalletSetupGuide
        isVisible={isGuideVisible}
        onClose={() => setIsGuideVisible(false)}
      />
    </div>
  );
};

export default OnboardingScreen;

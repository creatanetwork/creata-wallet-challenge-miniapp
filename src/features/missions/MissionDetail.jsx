import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getMission, completeMission } from '../../utils/missions';
import { processMissionReward } from '../../utils/rewards';
import MissionVerification from './MissionVerification';
import RewardDisplay from '../../components/RewardDisplay';
import { hapticFeedback, setMainButton, showAlert } from '../../services/telegram';

// 페이드인 애니메이션
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const MissionDetail = ({ userInfo }) => {
  const { id: missionId } = useParams();
  const navigate = useNavigate();

  const [mission, setMission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRewardClaimed, setIsRewardClaimed] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardDetails, setRewardDetails] = useState(null);

  // 미션 데이터 로드
  useEffect(() => {
    const loadMissionData = async () => {
      if (!userInfo || !userInfo.telegramId || !userInfo.walletAddress) {
        setError('사용자 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        // 미션 정보 가져오기
        const missionData = await getMission(missionId);

        if (!missionData) {
          setError('미션을 찾을 수 없습니다.');
          setIsLoading(false);
          return;
        }

        setMission(missionData);

        // 사용자 미션 진행 상황 확인 (여기서는 간단한 예시)
        // 실제로는 사용자 문서에서 미션 진행 상황을 확인해야 함
        const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

        // 백엔드에서 미션 완료 상태와 보상 지급 상태 확인
        // 간소화를 위해 여기서는 더미 데이터 사용
        setIsCompleted(false);
        setIsRewardClaimed(false);

        setIsLoading(false);
      } catch (error) {
        console.error('미션 데이터 로드 오류:', error);
        setError('미션 데이터를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadMissionData();
  }, [missionId, userInfo]);

  // 텔레그램 메인 버튼 설정
  useEffect(() => {
    if (isCompleted && !isRewardClaimed) {
      // 완료했지만 보상을 받지 않은 경우
      setMainButton('보상 받기', handleClaimReward, true, '#ffbe0b');
    } else if (!isCompleted) {
      // 아직 완료하지 않은 경우
      setMainButton('미션 완료하기', handleCompleteMission, true, '#3a86ff');
    } else {
      // 이미 모두 완료한 경우
      setMainButton('미션 목록으로', () => navigate('/missions'), true, '#8338ec');
    }

    return () => {
      setMainButton('', null, false);
    };
  }, [isCompleted, isRewardClaimed, navigate]);

  // 미션 완료 처리
  const handleCompleteMission = async () => {
    hapticFeedback('medium');

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

      // 미션 완료 처리
      await completeMission(userId, missionId);

      // 상태 업데이트
      setIsCompleted(true);

      // 성공 알림
      showAlert('미션을 성공적으로 완료했습니다! 보상을 받으세요.');
      hapticFeedback('success');
    } catch (error) {
      console.error('미션 완료 처리 오류:', error);
      showAlert('미션 완료 처리 중 오류가 발생했습니다.');
      hapticFeedback('error');
    }
  };

  // 보상 지급 처리
  const handleClaimReward = async () => {
    hapticFeedback('medium');

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

      // 보상 지급 처리
      const result = await processMissionReward(userId, missionId);

      if (result.success) {
        // 보상 정보 저장
        setRewardDetails(result);

        // 보상 모달 표시
        setShowRewardModal(true);

        // 상태 업데이트
        setIsRewardClaimed(true);

        hapticFeedback('success');
      } else {
        showAlert(result.message || '보상 지급에 실패했습니다.');
        hapticFeedback('error');
      }
    } catch (error) {
      console.error('보상 지급 처리 오류:', error);
      showAlert('보상 지급 처리 중 오류가 발생했습니다.');
      hapticFeedback('error');
    }
  };

  // 난이도 표시 컴포넌트
  const renderDifficulty = (level) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-sm ${star <= level ? 'text-yellow-500' : 'text-gray-600'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">미션 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-warning mb-4">{error}</p>
          <button
            className="btn-primary"
            onClick={() => navigate('/missions')}
          >
            미션 목록으로
          </button>
        </div>
      </div>
    );
  }

  // 미션 배경 이미지 선택 (미션 ID에 따라 다른 이미지)
  const getMissionImage = (id) => {
    const images = {
      mission_arrival: '/assets/images/backgrounds/arrival.jpg',
      mission_transaction: '/assets/images/backgrounds/transaction.jpg',
      mission_smart_contract: '/assets/images/backgrounds/smart_contract.jpg',
      mission_cross_chain: '/assets/images/backgrounds/cross_chain.jpg',
      mission_staking: '/assets/images/backgrounds/staking.jpg',
      mission_kyt: '/assets/images/backgrounds/kyt.jpg',
      mission_quiz: '/assets/images/backgrounds/quiz.jpg',
      mission_leaderboard: '/assets/images/backgrounds/leaderboard.jpg'
    };

    return images[id] || '/assets/images/backgrounds/default.jpg';
  };

  return (
    <div className="min-h-screen pb-6">
      {/* 헤더 배경 */}
      <div
        className="h-48 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${getMissionImage(missionId)})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-primary-dark"></div>

        {/* 뒤로가기 버튼 */}
        <button
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center"
          onClick={() => navigate('/missions')}
        >
          <span className="text-white">←</span>
        </button>
      </div>

      {/* 미션 내용 */}
      <div className="relative -mt-10 px-4 z-10">
        <motion.div
          className="bg-gray-900 rounded-xl p-5 shadow-lg"
          variants={fadeIn}
          initial="hidden"
          animate="visible"
        >
          {/* 미션 상태 */}
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold">{mission.title}</h1>
            {renderDifficulty(mission.difficulty)}
          </div>

          {/* 미션 진행 상태 */}
          <div className="mb-4">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2
              ${isCompleted ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'}">
              {isCompleted ? '완료됨' : '진행 중'}
            </div>

            {/* 보상 정보 */}
            {mission.reward && (
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">보상:</span>
                <div className="inline-block px-2 py-1 rounded-full text-xs font-semibold
                  ${mission.reward.type === 'NFT' ? 'bg-yellow-500/20 text-yellow-400' :
                    mission.reward.type === 'CTA' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'}">
                  {mission.reward.type === 'NFT' ? 'NFT' :
                   mission.reward.type === 'CTA' ? `${mission.reward.amount} CTA` :
                   `${mission.reward.amount} 포인트`}
                </div>

                {isRewardClaimed && (
                  <span className="text-xs text-success">수령됨</span>
                )}
              </div>
            )}
          </div>

          {/* 미션 설명 */}
          <div className="bg-black/30 rounded-lg p-4 mb-6">
            <p className="text-gray-300">{mission.description}</p>
          </div>

          {/* 미션 검증 */}
          <MissionVerification
            mission={mission}
            userInfo={userInfo}
            isCompleted={isCompleted}
            onVerificationSuccess={handleCompleteMission}
          />
        </motion.div>
      </div>

      {/* 보상 모달 */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div
            className="bg-gray-900 rounded-xl p-5 w-full max-w-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <RewardDisplay
              type={rewardDetails.rewardType}
              details={rewardDetails.rewardDetails}
              onClose={() => setShowRewardModal(false)}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MissionDetail;

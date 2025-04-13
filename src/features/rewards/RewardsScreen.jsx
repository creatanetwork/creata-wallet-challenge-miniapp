import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUserRewards } from '../../utils/rewards';
import { getUserMissionProgress } from '../../utils/missions';
import RewardDetail from './RewardDetail';
import { formatWalletAddress, formatNumber } from '../../utils/helpers';
import { hapticFeedback, setMainButton } from '../../services/telegram';
import { getIPFSGatewayUrl } from '../../services/nft';

const RewardsScreen = ({ userInfo }) => {
  const navigate = useNavigate();
  const [userRewards, setUserRewards] = useState(null);
  const [missionsProgress, setMissionsProgress] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 사용자 데이터 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (!userInfo || !userInfo.telegramId || !userInfo.walletAddress) {
        setError('사용자 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

        // 병렬로 보상 및 미션 데이터 로드
        const [rewards, missions] = await Promise.all([
          getUserRewards(userId),
          getUserMissionProgress(userId)
        ]);

        setUserRewards(rewards);
        setMissionsProgress(missions);
        setIsLoading(false);
      } catch (error) {
        console.error('사용자 데이터 로드 오류:', error);
        setError('사용자 데이터를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [userInfo]);

  // 텔레그램 메인 버튼 설정
  useEffect(() => {
    setMainButton('미션 시작하기', () => {
      hapticFeedback('medium');
      navigate('/missions');
    }, true, '#3a86ff');

    return () => {
      setMainButton('', null, false);
    };
  }, [navigate]);

  // NFT 선택 핸들러
  const handleSelectNFT = (nft) => {
    hapticFeedback('medium');
    setSelectedNFT(nft);
  };

  // NFT 상세 모달 닫기
  const handleCloseNFTDetail = () => {
    hapticFeedback('medium');
    setSelectedNFT(null);
  };

  // 잠긴 미션 보상 카운트
  const getLockedRewardsCount = () => {
    return missionsProgress.filter(mission => !mission.progress?.completed).length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">보상 정보를 불러오는 중...</p>
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

  // NFT 배지 및 아이템
  const nfts = userRewards?.nfts || [];

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-b from-purple-900/50 to-transparent p-4 pt-8 pb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold">보상</h1>
            <p className="text-gray-300 text-sm">
              {formatWalletAddress(userInfo?.walletAddress)}
            </p>
          </div>

          <Link to="/profile" className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <span className="text-white font-bold">
                {userInfo?.displayName?.[0] || '?'}
              </span>
            </div>
          </Link>
        </div>

        {/* 보상 요약 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800 rounded-lg p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mr-3">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs">총 획득한 CTA</p>
              <p className="text-xl font-bold text-blue-400">{formatNumber(userRewards?.cta || 0)}</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 flex items-center">
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
              <span className="text-2xl">🏆</span>
            </div>
            <div>
              <p className="text-gray-400 text-xs">총 획득한 NFT</p>
              <p className="text-xl font-bold text-yellow-400">{nfts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* NFT 섹션 */}
      <div className="px-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">NFT 배지</h2>
          <Link to="/profile" className="text-primary text-sm">모두 보기</Link>
        </div>

        {nfts.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {nfts.slice(0, 6).map((nft, index) => (
              <motion.div
                key={index}
                className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-primary/50 transition-colors"
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectNFT(nft)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="aspect-square bg-gray-900 relative">
                  <img
                    src={getIPFSGatewayUrl(nft.image)}
                    alt={nft.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/assets/images/placeholders/nft-placeholder.png';
                    }}
                  />
                </div>

                <div className="p-2">
                  <h3 className="font-semibold text-white text-sm truncate">{nft.name}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-300 mb-2">아직 획득한 NFT가 없습니다.</p>
            <p className="text-gray-400 text-sm">
              미션을 완료하여 NFT 보상을 획득하세요!
            </p>
          </div>
        )}
      </div>

      {/* 잠긴 보상 섹션 */}
      <div className="px-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">잠긴 보상</h2>

        {getLockedRewardsCount() > 0 ? (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{getLockedRewardsCount()}개의 보상이 잠겨 있습니다</p>
                  <p className="text-gray-400 text-sm">미션을 완료하여 보상을 해제하세요</p>
                </div>
              </div>

              <button
                className="btn-primary py-2"
                onClick={() => navigate('/missions')}
              >
                미션 보기
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-success mb-2">모든 미션을 완료했습니다!</p>
            <p className="text-gray-400 text-sm">
              새로운 미션이 추가되면 알려드릴게요.
            </p>
          </div>
        )}
      </div>

      {/* 최근 보상 내역 */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3">최근 보상 내역</h2>

        {userRewards?.history && userRewards.history.length > 0 ? (
          <div className="space-y-2">
            {userRewards.history.slice(0, 5).map((reward, index) => (
              <motion.div
                key={index}
                className="bg-gray-800 rounded-lg p-3 flex items-center"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center mr-3
                  ${reward.type === 'NFT' ? 'bg-yellow-500/20' :
                    reward.type === 'CTA' ? 'bg-blue-500/20' :
                    'bg-purple-500/20'}`}
                >
                  <span className="text-xl">
                    {reward.type === 'NFT' ? '🏆' :
                     reward.type === 'CTA' ? '💰' :
                     '⭐'}
                  </span>
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`font-semibold
                        ${reward.type === 'NFT' ? 'text-yellow-400' :
                          reward.type === 'CTA' ? 'text-blue-400' :
                          'text-purple-400'}`}
                      >
                        {reward.type === 'NFT' ? 'NFT 획득' :
                         reward.type === 'CTA' ? `${reward.amount} CTA 획득` :
                         `${reward.amount} 포인트 획득`}
                      </p>
                      <p className="text-gray-300 text-sm">{reward.reason}</p>
                    </div>

                    <p className="text-gray-400 text-xs">
                      {reward.timestamp ? new Date(reward.timestamp).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="text-center mt-4">
              <Link to="/profile" className="text-primary text-sm">
                전체 내역 보기
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-300 mb-2">아직 보상 내역이 없습니다.</p>
            <p className="text-gray-400 text-sm">
              미션을 완료하여 보상을 획득하세요!
            </p>
          </div>
        )}
      </div>

      {/* NFT 상세 모달 */}
      {selectedNFT && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div
            className="bg-gray-900 rounded-lg p-4 w-full max-w-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <RewardDetail
              nft={selectedNFT}
              onClose={handleCloseNFTDetail}
            />
          </motion.div>
        </div>
      )}

      {/* 푸터 내비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-3 flex justify-around border-t border-gray-800">
        <Link to="/missions" className="flex flex-col items-center text-gray-500">
          <span className="text-xl">🗺️</span>
          <span className="text-xs mt-1">미션</span>
        </Link>
        <Link to="/rewards" className="flex flex-col items-center text-primary">
          <span className="text-xl">🏆</span>
          <span className="text-xs mt-1">보상</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center text-gray-500">
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">프로필</span>
        </Link>
      </div>
    </div>
  );
};

export default RewardsScreen;

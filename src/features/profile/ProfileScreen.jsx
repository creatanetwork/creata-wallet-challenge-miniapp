import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getUserRewards } from '../../utils/rewards';
import { getUserMissionProgress } from '../../utils/missions';
import { getUserLeaderboardRank } from '../../utils/rewards';
import { formatWalletAddress, formatNumber, copyToClipboard } from '../../utils/helpers';
import { hapticFeedback, showAlert, setMainButton } from '../../services/telegram';
import { getIPFSGatewayUrl } from '../../services/nft';

// 탭 정의
const TABS = {
  NFT: 'nft',
  REWARDS: 'rewards',
  MISSIONS: 'missions'
};

const ProfileScreen = ({ userInfo }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS.NFT);
  const [userRewards, setUserRewards] = useState(null);
  const [missionsProgress, setMissionsProgress] = useState([]);
  const [userRank, setUserRank] = useState(null);
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

        // 병렬로 모든 데이터 로드
        const [rewards, missions, rank] = await Promise.all([
          getUserRewards(userId),
          getUserMissionProgress(userId),
          getUserLeaderboardRank(userId)
        ]);

        setUserRewards(rewards);
        setMissionsProgress(missions);
        setUserRank(rank);
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
    setMainButton('리더보드 보기', () => {
      hapticFeedback('medium');
      navigate('/leaderboard');
    }, true, '#8338ec');

    return () => {
      setMainButton('', null, false);
    };
  }, [navigate]);

  // 지갑 주소 복사
  const handleCopyAddress = async () => {
    hapticFeedback('medium');

    if (userInfo?.walletAddress) {
      const success = await copyToClipboard(userInfo.walletAddress);

      if (success) {
        showAlert('지갑 주소가 복사되었습니다.');
      } else {
        showAlert('주소 복사에 실패했습니다.');
      }
    }
  };

  // 탭 변경 핸들러
  const handleTabChange = (tab) => {
    hapticFeedback('selection');
    setActiveTab(tab);
  };

  // NFT 탭 내용 렌더링
  const renderNFTTab = () => {
    const nfts = userRewards?.nfts || [];

    if (nfts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🏆</span>
          </div>
          <p className="text-gray-300 mb-2">아직 획득한 NFT가 없습니다.</p>
          <p className="text-gray-400 text-sm text-center">
            미션을 완료하여 NFT 보상을 획득하세요!
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => navigate('/missions')}
          >
            미션 시작하기
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 py-4">
        {nfts.map((nft, index) => (
          <motion.div
            key={index}
            className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-primary/50 transition-colors"
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

            <div className="p-3">
              <h3 className="font-semibold text-white text-sm truncate">{nft.name}</h3>
              <p className="text-gray-400 text-xs mt-1">
                Token ID: {nft.tokenId ? `#${nft.tokenId}` : 'N/A'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // 보상 탭 내용 렌더링
  const renderRewardsTab = () => {
    const history = userRewards?.history || [];

    if (history.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <p className="text-gray-300 mb-2">아직 획득한 보상이 없습니다.</p>
          <p className="text-gray-400 text-sm text-center">
            미션을 완료하여 토큰과 포인트 보상을 획득하세요!
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => navigate('/missions')}
          >
            미션 시작하기
          </button>
        </div>
      );
    }

    // 최신 순으로 정렬
    const sortedHistory = [...history].sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateB - dateA;
    });

    return (
      <div className="space-y-3 py-4">
        {sortedHistory.map((reward, index) => (
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

              {reward.txHash && (
                <div className="mt-1">
                  <a
                    href={`https://explorer.creatachain.com/tx/${reward.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-xs underline"
                  >
                    트랜잭션 보기
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    );
  };

  // 미션 탭 내용 렌더링
  const renderMissionsTab = () => {
    const completedMissions = missionsProgress.filter(mission => mission.progress?.completed);

    if (completedMissions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl">🎯</span>
          </div>
          <p className="text-gray-300 mb-2">아직 완료한 미션이 없습니다.</p>
          <p className="text-gray-400 text-sm text-center">
            첫 번째 미션을 완료하여 보상을 획득하세요!
          </p>
          <button
            className="btn-primary mt-4"
            onClick={() => navigate('/missions')}
          >
            미션 시작하기
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3 py-4">
        {completedMissions.map((mission, index) => (
          <motion.div
            key={mission.id}
            className="bg-gray-800 rounded-lg p-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-white">{mission.title}</h3>

              <div className="bg-success/20 text-success text-xs px-2 py-1 rounded-full">
                완료
              </div>
            </div>

            <p className="text-gray-400 text-sm mb-2">{mission.description}</p>

            {mission.progress?.completedAt && (
              <p className="text-gray-500 text-xs">
                완료일: {new Date(mission.progress.completedAt).toLocaleDateString()}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case TABS.NFT:
        return renderNFTTab();
      case TABS.REWARDS:
        return renderRewardsTab();
      case TABS.MISSIONS:
        return renderMissionsTab();
      default:
        return renderNFTTab();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">프로필 정보를 불러오는 중...</p>
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
            onClick={() => navigate('/')}
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-b from-blue-900/50 to-transparent p-4 pt-8 pb-6">
        <div className="flex items-center mb-6">
          <button
            className="mr-3 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
            onClick={() => navigate('/missions')}
          >
            <span className="text-white">←</span>
          </button>
          <h1 className="text-2xl font-bold">내 프로필</h1>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center mr-4">
              <span className="text-white text-2xl font-bold">
                {userInfo?.displayName?.[0] || '?'}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {userInfo?.displayName || '익명의 탐험가'}
              </h2>

              <div className="flex items-center mt-1">
                <p className="text-gray-400 text-sm mr-2">
                  {formatWalletAddress(userInfo?.walletAddress)}
                </p>
                <button
                  className="text-primary text-sm"
                  onClick={handleCopyAddress}
                >
                  복사
                </button>
              </div>
            </div>

            {userRank?.rank && (
              <div className="bg-accent py-1 px-3 rounded-full">
                <p className="text-black font-bold text-sm">#{userRank.rank} 위</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">포인트</p>
              <p className="text-lg font-bold">{formatNumber(userRank?.points || 0)}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">CTA</p>
              <p className="text-lg font-bold text-blue-400">{formatNumber(userRewards?.cta || 0)}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-xs mb-1">미션</p>
              <p className="text-lg font-bold">
                {missionsProgress.filter(m => m.progress?.completed).length}/{missionsProgress.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 메뉴 */}
      <div className="px-4 border-b border-gray-800">
        <div className="flex">
          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 ${
              activeTab === TABS.NFT
                ? 'border-primary text-white'
                : 'border-transparent text-gray-400'
            }`}
            onClick={() => handleTabChange(TABS.NFT)}
          >
            NFT
          </button>

          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 ${
              activeTab === TABS.REWARDS
                ? 'border-primary text-white'
                : 'border-transparent text-gray-400'
            }`}
            onClick={() => handleTabChange(TABS.REWARDS)}
          >
            보상 내역
          </button>

          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 ${
              activeTab === TABS.MISSIONS
                ? 'border-primary text-white'
                : 'border-transparent text-gray-400'
            }`}
            onClick={() => handleTabChange(TABS.MISSIONS)}
          >
            완료한 미션
          </button>
        </div>
      </div>

      {/* 탭 내용 */}
      <div className="px-4">
        {renderTabContent()}
      </div>

      {/* 푸터 내비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-3 flex justify-around border-t border-gray-800">
        <Link to="/missions" className="flex flex-col items-center text-gray-500">
          <span className="text-xl">🗺️</span>
          <span className="text-xs mt-1">미션</span>
        </Link>
        <Link to="/rewards" className="flex flex-col items-center text-gray-500">
          <span className="text-xl">🏆</span>
          <span className="text-xs mt-1">보상</span>
        </Link>
        <Link to="/profile" className="flex flex-col items-center text-primary">
          <span className="text-xl">👤</span>
          <span className="text-xs mt-1">프로필</span>
        </Link>
      </div>
    </div>

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getLeaderboard, getUserLeaderboardRank } from '../../utils/rewards';
import { formatWalletAddress, formatNumber } from '../../utils/helpers';
import { hapticFeedback, setMainButton } from '../../services/telegram';

// 상위 3위 애니메이션
const topRankVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: index * 0.2,
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  })
};

// 목록 애니메이션
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.6
    }
  }
};

// 아이템 애니메이션
const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

const LeaderboardScreen = ({ userInfo }) => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState({ entries: [] });
  const [userRank, setUserRank] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 리더보드 데이터 로드
  useEffect(() => {
    const loadLeaderboardData = async () => {
      if (!userInfo || !userInfo.telegramId || !userInfo.walletAddress) {
        setError('사용자 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

        // 병렬로 리더보드 데이터와 사용자 순위 로드
        const [leaderboardData, rankInfo] = await Promise.all([
          getLeaderboard(20), // 상위 20명 표시
          getUserLeaderboardRank(userId)
        ]);

        setLeaderboard(leaderboardData);
        setUserRank(rankInfo);
        setIsLoading(false);
      } catch (error) {
        console.error('리더보드 데이터 로드 오류:', error);
        setError('리더보드 데이터를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadLeaderboardData();
  }, [userInfo]);

  // 텔레그램 메인 버튼 설정
  useEffect(() => {
    setMainButton('미션 목록으로', () => {
      hapticFeedback('medium');
      navigate('/missions');
    }, true, '#3a86ff');

    return () => {
      setMainButton('', null, false);
    };
  }, [navigate]);

  // 트로피 색상 (순위별)
  const getTrophyColor = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-500'; // 금색
      case 2:
        return 'text-gray-300'; // 은색
      case 3:
        return 'text-amber-600'; // 동색
      default:
        return 'text-gray-600'; // 기본색
    }
  };

  // 내 순위가 상위 3위에 없는 경우 리더보드에 표시
  const shouldShowUserInList = () => {
    if (!userRank || !userRank.rank) return false;

    // 이미 상위 3위에 있으면 표시 안함
    if (userRank.rank <= 3) return false;

    // 표시된 목록에 이미 있으면 표시 안함
    const isInVisibleList = leaderboard.entries.some((entry, index) => index >= 3 && entry.userId === `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`);

    return !isInVisibleList;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">리더보드 정보를 불러오는 중...</p>
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

  // 상위 3위 추출
  const topThree = leaderboard.entries.slice(0, 3);

  // 나머지 참가자
  const remainingEntries = leaderboard.entries.slice(3);

  return (
    <div className="min-h-screen pb-8">
      {/* 헤더 */}
      <div className="bg-gradient-to-b from-purple-900/50 to-transparent p-4 pt-8 pb-6">
        <div className="flex items-center mb-6">
          <button
            className="mr-3 w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
            onClick={() => navigate('/missions')}
          >
            <span className="text-white">←</span>
          </button>
          <h1 className="text-2xl font-bold">챔피언 랭킹</h1>
        </div>

        <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">주간 리더보드</h2>
            <p className="text-sm text-gray-400">
              {leaderboard.weekStart ? new Date(leaderboard.weekStart).toLocaleDateString() : ''}
            </p>
          </div>
          <p className="text-sm text-gray-300 mt-1">
            이번 주의 상위 탐험가들입니다. 미션을 완료하고 보상을 획득하여 랭킹에 도전하세요!
          </p>
          <p className="text-accent text-sm mt-2">
            <span className="font-semibold">🏆 1위 보상:</span> 100 CTA + 챔피언 트로피 NFT
          </p>
        </div>
      </div>

      {/* 상위 3위 */}
      <div className="flex justify-center items-end px-4 pb-6 mb-6 relative">
        {topThree.map((entry, index) => {
          const rank = index + 1;
          const isCurrentUser = entry.userId === `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

          // 위치 및 크기 계산 (2위, 1위, 3위 순으로 배치)
          const position = rank === 1 ? 1 : rank === 2 ? 0 : 2;
          const size = rank === 1 ? 'w-28' : 'w-24';
          const zIndex = rank === 1 ? 'z-10' : 'z-0';
          const height = rank === 1 ? 'h-32' : 'h-28';

          return (
            <motion.div
              key={rank}
              className={`flex flex-col items-center mx-1 ${zIndex}`}
              custom={position}
              variants={topRankVariants}
              initial="hidden"
              animate="visible"
            >
              {/* 순위 */}
              <div className={`${getTrophyColor(rank)} text-2xl font-bold mb-2`}>
                {rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}
              </div>

              {/* 프로필 */}
              <div
                className={`${size} aspect-square rounded-full ${
                  rank === 1
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                    : rank === 2
                      ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                      : 'bg-gradient-to-r from-amber-700 to-amber-800'
                } flex items-center justify-center relative overflow-hidden`}
              >
                <div className={`${isCurrentUser ? 'border-4 border-accent' : ''} w-full h-full rounded-full flex items-center justify-center bg-gray-800`}>
                  <span className="text-white text-2xl font-bold">
                    {entry.displayName ? entry.displayName[0] : '?'}
                  </span>
                </div>

                {/* 빛나는 효과 */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine"></div>
              </div>

              {/* 이름 */}
              <p className={`text-sm font-medium mt-2 ${isCurrentUser ? 'text-accent' : 'text-white'}`}>
                {entry.displayName || formatWalletAddress(entry.walletAddress)}
              </p>

              {/* 점수 */}
              <div className={`${height} flex items-center justify-center px-3 py-1 rounded-lg mt-2 ${
                rank === 1
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : rank === 2
                    ? 'bg-gray-400/20 text-gray-300'
                    : 'bg-amber-700/20 text-amber-400'
              }`}>
                <span className="font-bold">{formatNumber(entry.points || 0)}</span>
              </div>
            </motion.div>
          );
        })}

        {/* 선 연결 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gray-800 z-0"></div>
      </div>

      {/* 나머지 순위 목록 */}
      <motion.div
        className="px-4 space-y-2"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {remainingEntries.map((entry, index) => {
          const rank = index + 4; // 4위부터 시작
          const isCurrentUser = entry.userId === `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

          return (
            <motion.div
              key={rank}
              className={`bg-gray-800 rounded-lg p-3 flex items-center ${isCurrentUser ? 'border border-accent' : ''}`}
              variants={itemVariants}
            >
              <div className="w-8 h-8 flex items-center justify-center mr-3">
                <span className="text-gray-400 font-semibold">{rank}</span>
              </div>

              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                <span className="text-white font-bold">
                  {entry.displayName ? entry.displayName[0] : '?'}
                </span>
              </div>

              <div className="flex-1">
                <p className={`font-medium ${isCurrentUser ? 'text-accent' : 'text-white'}`}>
                  {entry.displayName || formatWalletAddress(entry.walletAddress)}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatWalletAddress(entry.walletAddress)}
                </p>
              </div>

              <div className="bg-gray-700 px-3 py-1 rounded-lg">
                <span className="font-bold">{formatNumber(entry.points || 0)}</span>
              </div>
            </motion.div>
          );
        })}

        {/* 내 순위가 표시되지 않은 경우 별도로 표시 */}
        {shouldShowUserInList() && (
          <>
            <div className="flex items-center justify-center my-2">
              <div className="h-px bg-gray-700 flex-1"></div>
              <span className="text-gray-500 text-xs px-2">내 순위</span>
              <div className="h-px bg-gray-700 flex-1"></div>
            </div>

            <motion.div
              className="bg-gray-800 rounded-lg p-3 flex items-center border border-accent"
              variants={itemVariants}
            >
              <div className="w-8 h-8 flex items-center justify-center mr-3">
                <span className="text-gray-400 font-semibold">{userRank.rank}</span>
              </div>

              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 border-2 border-accent">
                <span className="text-white font-bold">
                  {userInfo?.displayName ? userInfo.displayName[0] : '?'}
                </span>
              </div>

              <div className="flex-1">
                <p className="font-medium text-accent">
                  {userInfo?.displayName || formatWalletAddress(userInfo?.walletAddress)}
                </p>
                <p className="text-gray-400 text-xs">
                  {formatWalletAddress(userInfo?.walletAddress)}
                </p>
              </div>

              <div className="bg-accent/20 px-3 py-1 rounded-lg">
                <span className="font-bold text-accent">{formatNumber(userRank.points || 0)}</span>
              </div>
            </motion.div>
          </>
        )}

        {leaderboard.entries.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-300 mb-2">아직 리더보드에 참가자가 없습니다.</p>
            <p className="text-gray-400 text-sm">
              첫 번째 참가자가 되어 보세요!
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default LeaderboardScreen;

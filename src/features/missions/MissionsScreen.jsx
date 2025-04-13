import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import MissionCard from '../../components/MissionCard';
import { getUserMissionProgress } from '../../utils/missions';
import { getUserLeaderboardRank } from '../../utils/rewards';
import { formatWalletAddress, formatNumber } from '../../utils/helpers';
import { hapticFeedback, setMainButton } from '../../services/telegram';

// 목록 애니메이션
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// 아이템 애니메이션
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const MissionsScreen = ({ userInfo }) => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [filter, setFilter] = useState('all'); // all, active, completed

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

  // 미션 데이터 로드
  useEffect(() => {
    const loadMissionData = async () => {
      if (!userInfo || !userInfo.telegramId || !userInfo.walletAddress) {
        setError('사용자 정보를 찾을 수 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;

        // 미션 진행 상황 가져오기
        const missionProgress = await getUserMissionProgress(userId);
        setMissions(missionProgress);

        // 사용자 랭킹 가져오기
        const rankInfo = await getUserLeaderboardRank(userId);
        setUserRank(rankInfo);

        setIsLoading(false);
      } catch (error) {
        console.error('미션 데이터 로드 오류:', error);
        setError('미션 데이터를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadMissionData();
  }, [userInfo]);

  // 필터링된 미션 목록
  const filteredMissions = missions.filter(mission => {
    if (filter === 'all') return true;
    if (filter === 'completed') return mission.progress?.completed;
    if (filter === 'active') return !mission.progress?.completed;
    return true;
  });

  // 완료된 미션 수
  const completedCount = missions.filter(mission => mission.progress?.completed).length;

  // 필터 변경 핸들러
  const handleFilterChange = (newFilter) => {
    hapticFeedback('selection');
    setFilter(newFilter);
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
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">미션 목록</h1>
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
            {userRank?.rank && (
              <div className="absolute -bottom-1 -right-1 bg-accent text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {userRank.rank}
              </div>
            )}
          </Link>
        </div>

        <div className="flex justify-between items-center bg-black/20 rounded-lg p-3">
          <div>
            <p className="text-xs text-gray-400">진행률</p>
            <p className="text-lg font-bold">
              {completedCount}/{missions.length} 미션
            </p>
          </div>

          <div className="w-24 h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
              style={{ width: `${(completedCount / missions.length) * 100}%` }}
            ></div>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-400">포인트</p>
            <p className="text-lg font-bold">{formatNumber(userRank?.points || 0)}</p>
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="px-4 py-3 flex justify-center">
        <div className="inline-flex bg-gray-900 rounded-lg p-1">
          <button
            className={`px-3 py-1 text-sm rounded-md ${filter === 'all' ? 'bg-primary text-white' : 'text-gray-400'}`}
            onClick={() => handleFilterChange('all')}
          >
            전체
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${filter === 'active' ? 'bg-primary text-white' : 'text-gray-400'}`}
            onClick={() => handleFilterChange('active')}
          >
            진행 중
          </button>
          <button
            className={`px-3 py-1 text-sm rounded-md ${filter === 'completed' ? 'bg-primary text-white' : 'text-gray-400'}`}
            onClick={() => handleFilterChange('completed')}
          >
            완료
          </button>
        </div>
      </div>

      {/* 미션 목록 */}
      <motion.div
        className="px-4 space-y-4 pb-8"
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {filteredMissions.length > 0 ? (
          filteredMissions.map((mission) => {
            // 미션 잠금 해제 여부 확인 (여기서는 간단한 예시로 구현)
            const completedMissionIds = missions
              .filter(m => m.progress?.completed)
              .map(m => m.id);

            // 첫 번째 미션은 항상 활성화, 그 외에는 이전 미션 완료 여부에 따라
            const isActive = mission.id === 'mission_arrival' ||
              completedMissionIds.includes('mission_arrival');

            return (
              <motion.div
                key={mission.id}
                variants={itemVariants}
                transition={{ duration: 0.3 }}
              >
                <MissionCard
                  mission={mission}
                  isCompleted={mission.progress?.completed}
                  isActive={isActive}
                />
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">표시할 미션이 없습니다.</p>
          </div>
        )}
      </motion.div>

      {/* 푸터 내비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md p-3 flex justify-around border-t border-gray-800">
        <Link to="/missions" className="flex flex-col items-center text-primary">
          <span className="text-xl">🗺️</span>
          <span className="text-xs mt-1">미션</span>
        </Link>
        <Link to="/rewards" className="flex flex-col items-center text-gray-500">
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

export default MissionsScreen;

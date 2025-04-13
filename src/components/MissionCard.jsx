import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hapticFeedback } from '../services/telegram';

// 난이도 표시 컴포넌트
const DifficultyStars = ({ level }) => {
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

// 보상 정보 컴포넌트
const RewardBadge = ({ type, amount, nftId }) => {
  const getRewardText = () => {
    if (type === 'CTA') {
      return `${amount} CTA`;
    } else if (type === 'NFT') {
      return 'NFT';
    } else if (type === 'POINTS') {
      return `${amount} 포인트`;
    }
    return '';
  };

  return (
    <div className="bg-black/30 px-2 py-1 rounded-full text-xs font-semibold">
      {type === 'NFT' ? (
        <span className="text-yellow-400">{getRewardText()}</span>
      ) : type === 'CTA' ? (
        <span className="text-blue-400">{getRewardText()}</span>
      ) : (
        <span className="text-purple-400">{getRewardText()}</span>
      )}
    </div>
  );
};

const MissionCard = ({ mission, isCompleted = false, isActive = true }) => {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);

  const {
    id,
    title,
    description,
    difficulty,
    reward = {},
    order
  } = mission;

  // 미션 카드 클릭 핸들러
  const handleClick = () => {
    hapticFeedback('medium');
    navigate(`/mission/${id}`);
  };

  // 터치 이벤트 핸들러 (모바일용 누르기 효과)
  const handleTouchStart = () => setIsPressed(true);
  const handleTouchEnd = () => setIsPressed(false);

  return (
    <div
      className={`
        mission-card
        ${isCompleted ? 'mission-card-completed' : ''}
        ${isPressed ? 'scale-98' : 'scale-100'}
        ${!isActive ? 'opacity-60' : 'cursor-pointer'}
        transition-all duration-150
      `}
      onClick={isActive ? handleClick : undefined}
      onTouchStart={isActive ? handleTouchStart : undefined}
      onTouchEnd={isActive ? handleTouchEnd : undefined}
      onTouchCancel={isActive ? handleTouchEnd : undefined}
    >
      <div className="flex items-start gap-3">
        {/* 미션 번호/아이콘 */}
        <div className="w-10 h-10 flex-shrink-0 rounded-md bg-primary flex items-center justify-center text-white font-bold">
          {isCompleted ? (
            <span className="text-success">✓</span>
          ) : (
            <span>{order || '#'}</span>
          )}
        </div>

        {/* 미션 정보 */}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-white">{title}</h3>
            <DifficultyStars level={difficulty} />
          </div>

          <p className="text-sm text-gray-300 mb-3 line-clamp-2">{description}</p>

          <div className="flex justify-between items-center">
            {reward && (
              <RewardBadge
                type={reward.type}
                amount={reward.amount}
                nftId={reward.nftId}
              />
            )}

            {isCompleted ? (
              <span className="text-xs text-success">완료됨</span>
            ) : !isActive ? (
              <span className="text-xs text-gray-500">잠김</span>
            ) : (
              <span className="text-xs text-primary">진행 가능</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionCard;

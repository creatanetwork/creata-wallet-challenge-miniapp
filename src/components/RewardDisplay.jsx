import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { hapticFeedback } from '../services/telegram';
import { getNFTMetadata } from '../services/nft';
import { getIPFSGatewayUrl } from '../services/nft';

// 보상 타입에 따른 애니메이션 효과
const animationVariants = {
  NFT: {
    container: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { duration: 0.5 } },
    },
    image: {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 10, delay: 0.3 } },
    },
    title: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { delay: 0.6 } },
    },
    description: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { delay: 0.8 } },
    },
  },
  CTA: {
    container: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { duration: 0.5 } },
    },
    coins: {
      initial: { y: -100, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 150, damping: 15, delay: 0.3 } },
    },
    amount: {
      initial: { scale: 3, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100, damping: 10, delay: 0.5 } },
    },
  },
  POINTS: {
    container: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: { duration: 0.5 } },
    },
    icon: {
      initial: { scale: 0, rotate: 360 },
      animate: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 200, damping: 10, delay: 0.3 } },
    },
    amount: {
      initial: { y: 20, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { delay: 0.6 } },
    },
  }
};

// 파티클 애니메이션 컴포넌트
const Particles = ({ type }) => {
  // 보상 타입에 따라 다른 색상 사용
  const colors = {
    NFT: ['#ffbe0b', '#fb5607', '#ff006e'],
    CTA: ['#3a86ff', '#8338ec', '#4cc9f0'],
    POINTS: ['#8338ec', '#c77dff', '#e0aaff'],
  };

  const particleCount = 30;
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 100 + Math.random() * 100;
    const duration = 0.5 + Math.random() * 1;
    const size = 5 + Math.random() * 15;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const color = colors[type][Math.floor(Math.random() * colors[type].length)];

    particles.push(
      <motion.div
        key={i}
        className="absolute"
        initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
        animate={{
          x,
          y,
          opacity: 0,
          scale: 1,
          transition: { duration, ease: [0.32, 0.72, 0, 1] }
        }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {particles}
    </div>
  );
};

const RewardDisplay = ({ type, details, onClose }) => {
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // NFT 메타데이터 로드 (NFT 보상인 경우)
  useEffect(() => {
    const loadNFTMetadata = async () => {
      if (type === 'NFT' && details?.nftId) {
        setIsLoading(true);
        try {
          const meta = await getNFTMetadata(details.nftId);
          setMetadata(meta);
        } catch (error) {
          console.error('NFT 메타데이터 로드 오류:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadNFTMetadata();
  }, [type, details]);

  // 닫기 버튼 클릭 핸들러
  const handleClose = () => {
    hapticFeedback('medium');
    onClose();
  };

  // 트랜잭션 보기 (트랜잭션 탐색기로 이동)
  const handleViewTransaction = () => {
    hapticFeedback('medium');

    if (details?.txHash) {
      window.open(`https://explorer.creatachain.com/tx/${details.txHash}`, '_blank');
    }
  };

  // NFT 보상 렌더링
  const renderNFTReward = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center py-6">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-300">NFT 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (!metadata) {
      return (
        <div className="text-center py-6">
          <p className="text-warning mb-2">NFT 정보를 불러올 수 없습니다.</p>
          <p className="text-gray-300 text-sm">나중에 다시 시도해주세요.</p>
        </div>
      );
    }

    const imageUrl = getIPFSGatewayUrl(metadata.image);

    return (
      <>
        <motion.div
          className="w-64 h-64 mx-auto mb-6 relative"
          variants={animationVariants.NFT.image}
          initial="initial"
          animate="animate"
        >
          <img
            src={imageUrl}
            alt={metadata.name}
            className="w-full h-full object-contain rounded-lg"
          />
          <div className="absolute inset-0 shadow-lg rounded-lg neon-shadow-accent pointer-events-none"></div>
        </motion.div>

        <motion.h3
          className="text-xl font-bold mb-2 text-center"
          variants={animationVariants.NFT.title}
          initial="initial"
          animate="animate"
        >
          {metadata.name}
        </motion.h3>

        <motion.p
          className="text-gray-300 text-center mb-6"
          variants={animationVariants.NFT.description}
          initial="initial"
          animate="animate"
        >
          {metadata.description}
        </motion.p>

        {details?.tokenId && (
          <div className="bg-black/30 p-3 rounded-lg text-sm text-gray-300 mb-6">
            <p className="flex justify-between mb-1">
              <span>Token ID:</span>
              <span className="font-mono">{details.tokenId}</span>
            </p>
            {details.txHash && (
              <p className="flex justify-between">
                <span>Transaction:</span>
                <button
                  className="text-primary underline"
                  onClick={handleViewTransaction}
                >
                  View
                </button>
              </p>
            )}
          </div>
        )}
      </>
    );
  };

  // CTA 토큰 보상 렌더링
  const renderCTAReward = () => {
    return (
      <>
        <motion.div
          className="w-24 h-24 mx-auto mb-6 relative"
          variants={animationVariants.CTA.coins}
          initial="initial"
          animate="animate"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-lg absolute">
              <span className="text-white text-xl font-bold">CTA</span>
            </div>
            <div className="w-16 h-16 bg-blue-500 rounded-full absolute -left-4 -top-2 shadow-lg"></div>
            <div className="w-12 h-12 bg-blue-700 rounded-full absolute -right-3 -bottom-1 shadow-lg"></div>
          </div>
        </motion.div>

        <motion.div
          className="text-center mb-6"
          variants={animationVariants.CTA.amount}
          initial="initial"
          animate="animate"
        >
          <h3 className="text-3xl font-bold mb-1 text-blue-400">{details?.amount || 0} CTA</h3>
          <p className="text-gray-300">토큰 보상을 획득했습니다!</p>
        </motion.div>

        {details?.txHash && (
          <div className="bg-black/30 p-3 rounded-lg text-sm text-gray-300 mb-6">
            <p className="flex justify-between">
              <span>Transaction:</span>
              <button
                className="text-primary underline"
                onClick={handleViewTransaction}
              >
                View
              </button>
            </p>
          </div>
        )}
      </>
    );
  };

  // 포인트 보상 렌더링
  const renderPointsReward = () => {
    return (
      <>
        <motion.div
          className="w-24 h-24 mx-auto mb-6 relative"
          variants={animationVariants.POINTS.icon}
          initial="initial"
          animate="animate"
        >
          <div className="w-full h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">P</span>
          </div>
        </motion.div>

        <motion.div
          className="text-center mb-6"
          variants={animationVariants.POINTS.amount}
          initial="initial"
          animate="animate"
        >
          <h3 className="text-3xl font-bold mb-1 text-purple-400">{details?.points || 0} 포인트</h3>
          <p className="text-gray-300">포인트를 획득했습니다!</p>
        </motion.div>
      </>
    );
  };

  // 보상 타입에 따라 다른 내용 렌더링
  const renderRewardContent = () => {
    switch (type) {
      case 'NFT':
        return renderNFTReward();
      case 'CTA':
        return renderCTAReward();
      case 'POINTS':
        return renderPointsReward();
      default:
        return (
          <div className="text-center py-6">
            <p className="text-warning">알 수 없는 보상 유형입니다.</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      className="relative"
      variants={animationVariants[type]?.container || {}}
      initial="initial"
      animate="animate"
    >
      {/* 파티클 애니메이션 */}
      <Particles type={type} />

      {/* 닫기 버튼 */}
      <button
        className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
        onClick={handleClose}
      >
        ✕
      </button>

      {/* 헤더 */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          축하합니다!
        </h2>
        <p className="text-gray-300">미션을 완료하고 보상을 획득했습니다.</p>
      </div>

      {/* 보상 내용 */}
      {renderRewardContent()}

      {/* 버튼 */}
      <div className="flex space-x-3">
        <button
          className="btn-secondary flex-1"
          onClick={handleClose}
        >
          닫기
        </button>

        <button
          className="btn-primary flex-1"
          onClick={() => {
            hapticFeedback('medium');
            onClose();
            // 지갑으로 이동 (예시)
            // window.location.href = 'creata://wallet/rewards';
          }}
        >
          지갑에서 보기
        </button>
      </div>
    </motion.div>
  );
};

export default RewardDisplay;

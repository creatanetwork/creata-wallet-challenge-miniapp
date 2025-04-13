import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getIPFSGatewayUrl } from '../../services/nft';
import { getNFTMetadata } from '../../services/nft';
import { hapticFeedback } from '../../services/telegram';

const RewardDetail = ({ nft, onClose }) => {
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // NFT 메타데이터 로드
  useEffect(() => {
    const loadMetadata = async () => {
      if (!nft || !nft.id) {
        setError('NFT 정보가 없습니다.');
        setIsLoading(false);
        return;
      }

      try {
        // 이미 메타데이터가 있으면 재활용
        if (nft.metadata) {
          setMetadata(nft.metadata);
          setIsLoading(false);
          return;
        }

        // 메타데이터 로드
        const data = await getNFTMetadata(nft.id);
        setMetadata(data);
        setIsLoading(false);
      } catch (error) {
        console.error('NFT 메타데이터 로드 오류:', error);
        setError('NFT 정보를 불러오는 중 오류가 발생했습니다.');
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, [nft]);

  // 닫기 버튼 핸들러
  const handleClose = () => {
    hapticFeedback('medium');
    onClose();
  };

  // 트랜잭션 탐색기 열기
  const handleViewTransaction = () => {
    hapticFeedback('medium');

    if (nft.txHash) {
      window.open(`https://explorer.creatachain.com/tx/${nft.txHash}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300">NFT 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-warning mb-4">{error}</p>
        <button
          className="btn-primary"
          onClick={handleClose}
        >
          닫기
        </button>
      </div>
    );
  }

  // 최종 메타데이터 (로드된 데이터 또는 NFT 객체의 필드 사용)
  const finalMetadata = metadata || nft;
  const imageUrl = getIPFSGatewayUrl(finalMetadata.image || nft.image);

  return (
    <div className="relative">
      {/* 닫기 버튼 */}
      <button
        className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white"
        onClick={handleClose}
      >
        ✕
      </button>

      {/* NFT 이미지 */}
      <div className="text-center mb-4">
        <motion.div
          className="w-48 h-48 mx-auto rounded-lg overflow-hidden border-2 border-yellow-500/30 relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <img
            src={imageUrl}
            alt={finalMetadata.name || nft.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = '/assets/images/placeholders/nft-placeholder.png';
            }}
          />

          {/* 빛나는 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shine"></div>
        </motion.div>
      </div>

      {/* NFT 정보 */}
      <div className="text-center mb-6">
        <motion.h3
          className="text-xl font-bold mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {finalMetadata.name || nft.name}
        </motion.h3>

        <motion.p
          className="text-gray-300 text-sm mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {finalMetadata.description || '설명이 없습니다.'}
        </motion.p>

        {/* 속성 정보 */}
        {finalMetadata.attributes && finalMetadata.attributes.length > 0 && (
          <motion.div
            className="grid grid-cols-2 gap-2 mt-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {finalMetadata.attributes.map((attr, index) => (
              <div key={index} className="bg-gray-800 rounded-md p-2">
                <p className="text-gray-400 text-xs">{attr.trait_type}</p>
                <p className="text-white font-semibold">{attr.value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* 토큰 정보 */}
      <motion.div
        className="bg-gray-800 rounded-lg p-3 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex justify-between mb-2">
          <span className="text-gray-400 text-sm">컨트랙트</span>
          <span className="text-gray-200 text-sm font-mono truncate">
            {(finalMetadata.contractAddress || nft.contractAddress || '').substring(0, 8)}...
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">토큰 ID</span>
          <span className="text-gray-200 text-sm font-mono">
            {finalMetadata.tokenId || nft.tokenId || 'N/A'}
          </span>
        </div>
      </motion.div>

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
            // 지갑에서 NFT 보기 (예시)
            // window.location.href = `creata://wallet/nft?contract=${nft.contractAddress}&tokenId=${nft.tokenId}`;
            handleClose();
          }}
        >
          지갑에서 보기
        </button>
      </div>
    </div>
  );
};

export default RewardDetail;

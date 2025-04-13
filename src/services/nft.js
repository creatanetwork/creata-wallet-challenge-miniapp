import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

// NFT 목록 조회 (ERC-721 기준)
export const getNFTs = async (address, contractAddresses = []) => {
  try {
    // 크레아타 NFT API 호출 (예시 URL, 실제 API 엔드포인트로 변경 필요)
    const response = await fetch(`https://api.creatachain.com/nfts/${address}`);
    if (!response.ok) {
      throw new Error('NFT 데이터를 가져오는데 실패했습니다.');
    }

    const data = await response.json();

    // 특정 컨트랙트 주소 필터링 (필요시)
    if (contractAddresses.length > 0) {
      return data.filter(nft => contractAddresses.includes(nft.contractAddress));
    }

    return data;
  } catch (error) {
    console.error('NFT 목록 조회 오류:', error);
    throw new Error('NFT 목록 조회에 실패했습니다.');
  }
};

// NFT 민팅 (미션 보상용 - Firebase Function 호출)
export const mintNFT = async (toAddress, nftId) => {
  try {
    const mintNftFunction = httpsCallable(functions, 'mintNft');
    const result = await mintNftFunction({
      walletAddress: toAddress,
      nftId
    });

    if (result.data && result.data.success) {
      return {
        success: true,
        txHash: result.data.txHash,
        tokenId: result.data.tokenId
      };
    }

    throw new Error(result.data?.message || 'NFT 민팅에 실패했습니다.');
  } catch (error) {
    console.error('NFT 민팅 오류:', error);
    throw new Error('NFT 민팅에 실패했습니다. 다시 시도해주세요.');
  }
};

// NFT 메타데이터 가져오기
export const getNFTMetadata = async (nftId) => {
  try {
    // Firebase Function 또는 API 호출하여 메타데이터 가져오기
    const getNftMetadataFunction = httpsCallable(functions, 'getNftMetadata');
    const result = await getNftMetadataFunction({ nftId });

    if (result.data) {
      return result.data;
    }

    throw new Error('NFT 메타데이터를 가져오는데 실패했습니다.');
  } catch (error) {
    console.error('NFT 메타데이터 조회 오류:', error);
    throw new Error('NFT 정보를 가져오는데 실패했습니다.');
  }
};

// NFT 미리보기 URL 생성 (IPFS URL을 HTTP Gateway URL로 변환)
export const getIPFSGatewayUrl = (ipfsUrl) => {
  if (!ipfsUrl) return '';

  // IPFS URL 형식 확인
  if (ipfsUrl.startsWith('ipfs://')) {
    const cid = ipfsUrl.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${cid}`;
  }

  return ipfsUrl;
};

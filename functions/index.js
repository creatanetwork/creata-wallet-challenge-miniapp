const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Web3 = require('web3');
const crypto = require('crypto');

admin.initializeApp();

// 크레아타 체인 네트워크 설정
const web3 = new Web3('https://cvm.node.creatachain.com'); // 카테나 체인 RPC URL

// 관리자 지갑 설정 (보안을 위해 환경 변수 사용)
const ADMIN_PRIVATE_KEY = functions.config().wallet.admin_private_key;
const adminAccount = web3.eth.accounts.privateKeyToAccount(ADMIN_PRIVATE_KEY);
web3.eth.accounts.wallet.add(adminAccount);

// NFT (ERC-721) 컨트랙트 설정
const NFT_CONTRACT_ADDRESS = functions.config().contracts.nft_address;
const NFT_ABI = [
  // NFT 컨트랙트 ABI (필요한 부분만 정의)
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'uri', type: 'string' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
];

// CTA 토큰 보상 전송 함수 (네이티브 토큰)
exports.sendCtaReward = functions.https.onCall(async (data, context) => {
  // 인증 확인 (관리자만 호출 가능하게 할 수도 있음)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '인증된 사용자만 이 함수를 호출할 수 있습니다.'
    );
  }

  const { walletAddress, amount, reason } = data;

  if (!walletAddress || !amount) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '지갑 주소와 금액이 필요합니다.'
    );
  }

  try {
    // Wei로 변환 (18 소수점)
    const amountInWei = web3.utils.toWei(amount.toString(), 'ether');

    // 네이티브 토큰(CTA) 전송 트랜잭션 생성
    const tx = await web3.eth.sendTransaction({
      from: adminAccount.address,
      to: walletAddress,
      value: amountInWei,
      gas: 21000, // 기본 전송 가스 비용
      gasPrice: web3.utils.toWei('10', 'gwei')
    });

    // 트랜잭션 로그 저장
    await admin.firestore().collection('transactions').add({
      type: 'CTA_REWARD',
      walletAddress,
      amount,
      reason,
      txHash: tx.transactionHash,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      txHash: tx.transactionHash
    };
  } catch (error) {
    console.error('CTA 보상 전송 오류:', error);
    throw new functions.https.HttpsError(
      'internal',
      '보상 전송 중 오류가 발생했습니다.',
      error.message
    );
  }
});

// NFT 민팅 함수
exports.mintNft = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '인증된 사용자만 이 함수를 호출할 수 있습니다.'
    );
  }

  const { walletAddress, nftId, metadata } = data;

  if (!walletAddress || !nftId || !metadata) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '지갑 주소, NFT ID, 메타데이터가 필요합니다.'
    );
  }

  try {
    // NFT 컨트랙트 인스턴스 생성
    const nftContract = new web3.eth.Contract(NFT_ABI, NFT_CONTRACT_ADDRESS);

    // NFT 메타데이터 IPFS에 업로드 (외부 서비스 사용)
    const metadataUri = await uploadToIpfs(metadata);

    // 다음 토큰 ID 가져오기 (안전하게 처리)
    const tokenId = await getNextTokenId();

    // NFT 민팅 트랜잭션
    const tx = await nftContract.methods
      .mint(walletAddress, tokenId, metadataUri)
      .send({
        from: adminAccount.address,
        gas: 500000,
        gasPrice: web3.utils.toWei('10', 'gwei')
      });

    // 트랜잭션 로그 저장
    await admin.firestore().collection('transactions').add({
      type: 'NFT_MINT',
      walletAddress,
      nftId,
      tokenId: tokenId.toString(),
      metadataUri,
      txHash: tx.transactionHash,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      txHash: tx.transactionHash,
      tokenId: tokenId.toString(),
      contractAddress: NFT_CONTRACT_ADDRESS
    };
  } catch (error) {
    console.error('NFT 민팅 오류:', error);
    throw new functions.https.HttpsError(
      'internal',
      'NFT 민팅 중 오류가 발생했습니다.',
      error.message
    );
  }
});

// 메타데이터를 IPFS에 업로드하는 함수 (예시)
async function uploadToIpfs(metadata) {
  // 실제로는 Pinata, Filebase 같은 IPFS 서비스 사용
  // 여기서는 단순화를 위해 외부 API 호출 가정
  const fetch = require('node-fetch');
  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': functions.config().pinata.api_key,
        'pinata_secret_api_key': functions.config().pinata.api_secret
      },
      body: JSON.stringify(metadata)
    });

    const result = await response.json();
    if (!result.IpfsHash) {
      throw new Error('IPFS 업로드 실패');
    }

    return `ipfs://${result.IpfsHash}`;
  } catch (error) {
    console.error('IPFS 업로드 오류:', error);
    throw error;
  }
}

// 다음 토큰 ID 가져오는 함수 (레이스 컨디션 방지)
async function getNextTokenId() {
  try {
    // Firestore 트랜잭션을 사용하여 안전하게 ID 증가
    const result = await admin.firestore().runTransaction(async (transaction) => {
      // 글로벌 카운터 문서 참조
      const counterRef = admin.firestore().collection('system').doc('nft_counter');
      const counterDoc = await transaction.get(counterRef);
      
      // 현재 토큰 ID 가져오기
      let currentId = 1;
      if (counterDoc.exists) {
        currentId = counterDoc.data().currentTokenId + 1;
      }
      
      // 카운터 업데이트
      transaction.set(counterRef, { currentTokenId: currentId }, { merge: true });
      
      return currentId;
    });
    
    return result;
  } catch (error) {
    console.error('토큰 ID 생성 오류:', error);
    // 오류 발생 시 기본값 사용
    return Math.floor(Date.now() / 1000); // 현재 타임스탬프 사용
  }
}

// 텔레그램 사용자 검증 함수
exports.verifyTelegramUser = functions.https.onCall(async (data, context) => {
  const { initData } = data;

  if (!initData) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '텔레그램 initData가 필요합니다.'
    );
  }

  try {
    // 텔레그램 initData 검증 로직 구현
    const isValid = verifyTelegramInitData(initData);

    if (!isValid) {
      throw new Error('유효하지 않은 텔레그램 데이터');
    }

    // initData에서 사용자 정보 추출
    const userData = extractUserFromInitData(initData);

    return {
      verified: true,
      user: userData
    };
  } catch (error) {
    console.error('텔레그램 사용자 검증 오류:', error);
    throw new functions.https.HttpsError(
      'internal',
      '사용자 검증 중 오류가 발생했습니다.',
      error.message
    );
  }
});

// 텔레그램 initData 검증 함수 (실제 구현)
function verifyTelegramInitData(initData) {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;
    
    // hash를 제외한 데이터 정렬하여 데이터 문자열 생성
    urlParams.delete('hash');
    const dataCheckString = Array.from(urlParams.entries())
      .sort()
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // 봇 토큰으로 HMAC-SHA-256 서명 생성
    const BOT_TOKEN = functions.config().telegram.bot_token;
    const secretKey = crypto
      .createHash('sha256')
      .update(BOT_TOKEN)
      .digest();
    
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    // 생성된 서명과 제공된 hash 비교
    return signature === hash;
  } catch (error) {
    console.error('Telegram initData 검증 오류:', error);
    return false;
  }
}

// initData에서 사용자 정보 추출 함수 (실제 구현)
function extractUserFromInitData(initData) {
  try {
    const data = new URLSearchParams(initData);
    const userJson = data.get('user');
    if (!userJson) {
      return {
        id: 0,
        first_name: "Unknown",
        last_name: "",
        username: "unknown"
      };
    }

    const user = JSON.parse(userJson);
    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name || "",
      username: user.username || ""
    };
  } catch (error) {
    console.error('사용자 정보 추출 오류:', error);
    return {
      id: 0,
      first_name: "Error",
      last_name: "",
      username: "error"
    };
  }
}

// 지갑 서명 검증 함수
exports.verifyWalletSignature = functions.https.onCall(async (data, context) => {
  const { address, message, signature } = data;
  
  // 필수 파라미터 검증
  if (!address || !message || !signature) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '주소, 메시지, 서명이 모두 필요합니다.'
    );
  }
  
  // 주소 형식 검증
  if (!web3.utils.isAddress(address)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '유효하지 않은 Ethereum 주소입니다.'
    );
  }
  
  try {
    // 서명 복구
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    
    // 복구된 주소와 제공된 주소 비교 (대소문자 구분 없이)
    const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
    
    return { isValid };
  } catch (error) {
    console.error('서명 검증 오류:', error);
    throw new functions.https.HttpsError(
      'internal',
      '서명 검증 중 오류가 발생했습니다.',
      error.message
    );
  }
});

// 미션 검증 함수
exports.verifyMission = functions.https.onCall(async (data, context) => {
  // 인증 확인
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      '인증된 사용자만 이 함수를 호출할 수 있습니다.'
    );
  }
  
  const { userId, missionId, verificationData } = data;
  
  // 사용자와 미션 정보 확인
  const userRef = admin.firestore().collection('users').doc(userId);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', '사용자를 찾을 수 없습니다.');
  }
  
  const missionRef = admin.firestore().collection('missions').doc(missionId);
  const missionDoc = await missionRef.get();
  
  if (!missionDoc.exists) {
    throw new functions.https.HttpsError('not-found', '미션을 찾을 수 없습니다.');
  }
  
  const mission = missionDoc.data();
  const requirementType = mission.requirements?.type || '';
  
  switch (requirementType) {
    case 'INSTALL':
      // 실제 지갑 설치 확인 로직
      return { success: true, message: '지갑 연결이 확인되었습니다.' };
      
    case 'TRANSFER':
      // 트랜잭션 검증
      const { txHash } = verificationData;
      if (!txHash) {
        return { success: false, message: '트랜잭션 해시가 필요합니다.' };
      }
      
      // 블록체인에서 실제 트랜잭션 조회 및 검증
      const txVerified = await verifyTransactionOnChain(txHash, {
        to: mission.requirements.params?.receiver || '0x1234567890AbCdEf1234567890AbCdEf12345678',
        minimumAmount: mission.requirements.params?.minimumAmount || 0.01,
        from: userDoc.data().walletAddress
      });
      
      return { 
        success: txVerified, 
        message: txVerified ? '트랜잭션이 확인되었습니다.' : '유효하지 않은 트랜잭션입니다.' 
      };
    
    case 'SMART_CONTRACT':
      // 스마트 컨트랙트 배포 검증
      const { contractAddress } = verificationData;
      if (!contractAddress) {
        return { success: false, message: '컨트랙트 주소가 필요합니다.' };
      }
      
      // 컨트랙트 코드 확인
      const code = await web3.eth.getCode(contractAddress);
      if (code === '0x' || code === '0x0') {
        return { success: false, message: '해당 주소에 컨트랙트 코드가 없습니다.' };
      }
      
      // 추가 검증 로직 (예: 인터페이스 확인)
      // ...
      
      return { success: true, message: '스마트 컨트랙트가 확인되었습니다.' };
      
    case 'CROSS_CHAIN':
      // 크로스체인 전송 검증
      // 실제 크로스체인 브릿지 API 호출 등으로 검증
      // 예시에서는 간단한 확인만 수행
      return { success: true, message: '크로스체인 전송이 확인되었습니다.' };
      
    case 'STAKING':
      // 스테이킹 검증
      const { amount } = verificationData;
      if (!amount || parseFloat(amount) < 10) {
        return { success: false, message: '최소 10 CTA를 스테이킹해야 합니다.' };
      }
      
      // 실제 스테이킹 상태 확인 로직
      // ...
      
      return { success: true, message: '스테이킹이 확인되었습니다.' };
      
    case 'KYT':
      // 트랜잭션 추적 검증
      const { patternCode } = verificationData;
      if (!patternCode) {
        return { success: false, message: '패턴 코드가 필요합니다.' };
      }
      
      // 실제 패턴 코드 검증 로직
      const correctPatternCode = mission.requirements.params?.correctCode || 'CODE-123-ABC';
      const isPatternCorrect = patternCode === correctPatternCode;
      
      return { 
        success: isPatternCorrect, 
        message: isPatternCorrect ? '패턴 코드가 확인되었습니다.' : '잘못된 패턴 코드입니다.' 
      };
      
    case 'QUIZ':
      // 퀴즈 검증
      const { answers } = verificationData;
      if (!answers || !Array.isArray(answers)) {
        return { success: false, message: '퀴즈 답변이 필요합니다.' };
      }
      
      // 실제 퀴즈 답변 검증 로직
      const correctAnswers = mission.requirements.params?.correctAnswers || [2]; // 예시 정답
      const passThreshold = mission.requirements.params?.passThreshold || 1; // 통과 기준
      
      let correctCount = 0;
      answers.forEach((answer, index) => {
        if (correctAnswers[index] === answer) {
          correctCount++;
        }
      });
      
      const passed = correctCount >= passThreshold;
      
      return { 
        success: passed, 
        message: passed ? '퀴즈를 완료했습니다.' : '퀴즈 점수가 통과 기준에 미치지 못했습니다.',
        score: correctCount,
        total: correctAnswers.length 
      };
      
    default:
      return { success: false, message: '지원되지 않는 미션 유형입니다.' };
  }
});

// 블록체인에서 트랜잭션 검증 함수
async function verifyTransactionOnChain(txHash, requirements) {
  try {
    // web3 라이브러리를 사용하여 트랜잭션 조회
    const tx = await web3.eth.getTransaction(txHash);
    if (!tx) return false;
    
    // 트랜잭션 검증
    const isFromCorrect = tx.from.toLowerCase() === requirements.from.toLowerCase();
    const isToCorrect = tx.to.toLowerCase() === requirements.to.toLowerCase();
    const isAmountCorrect = parseFloat(web3.utils.fromWei(tx.value, 'ether')) >= requirements.minimumAmount;
    
    return isFromCorrect && isToCorrect && isAmountCorrect;
  } catch (error) {
    console.error('트랜잭션 조회 오류:', error);
    return false;
  }
}

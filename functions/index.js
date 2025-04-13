const functions = require('firebase-functions');
const admin = require('firebase-admin');
const Web3 = require('web3');

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

    // 다음 토큰 ID 가져오기 (예: totalSupply + 1)
    const tokenId = await getNextTokenId(nftContract);

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

// 다음 토큰 ID 가져오는 함수 (예시)
async function getNextTokenId(nftContract) {
  try {
    // 컨트랙트에 totalSupply 함수가 있다고 가정
    const totalSupply = await nftContract.methods.totalSupply().call();
    return parseInt(totalSupply) + 1;
  } catch (error) {
    console.error('토큰 ID 조회 오류:', error);
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
    // 여기서는 검증 로직 생략 (실제로는 HMAC-SHA-256 서명 확인 등 필요)
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

// 텔레그램 initData 검증 함수 (실제 구현 필요)
function verifyTelegramInitData(initData) {
  // 실제 검증 로직 구현
  // 참고: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app

  // 여기서는 간단한 예시만 제공합니다. 실제 구현에서는 HMAC 검증을 해야 합니다.
  try {
    const data = new URLSearchParams(initData);
    const hash = data.get('hash');

    if (!hash) return false;

    // 실제 구현에서는 여기서 올바른 해시 계산 및 비교
    // const expectedHash = calculateHash(data, BOT_TOKEN);
    // return expectedHash === hash;

    return true; // 예시에서는 항상 유효하다고 가정
  } catch (error) {
    console.error('Telegram initData 검증 오류:', error);
    return false;
  }
}

// initData에서 사용자 정보 추출 함수 (실제 구현 필요)
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

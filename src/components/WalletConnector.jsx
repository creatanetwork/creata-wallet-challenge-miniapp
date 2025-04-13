import { useState, useEffect } from 'react';
import { checkWalletInstalled, connectCreataWallet, getAddressFromUrl, signMessage, getSignatureFromUrl } from '../services/wallet';
import { hapticFeedback, showAlert } from '../services/telegram';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const WalletConnector = ({ telegramUser, onConnect }) => {
  const [isWalletInstalled, setIsWalletInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // URL 파라미터에서 지갑 주소와 서명 확인
  useEffect(() => {
    const checkUrlParams = async () => {
      const address = getAddressFromUrl();
      const signature = getSignatureFromUrl();

      if (address) {
        setWalletAddress(address);

        // 서명이 있으면 검증
        if (signature && telegramUser) {
          try {
            // 서명 검증 (백엔드에서 처리하는 것이 안전)
            // 여기서는 간단히 DB에 저장하는 방식으로 처리
            const userId = `${telegramUser.id}_${address.toLowerCase()}`;
            const userRef = doc(db, 'users', userId);

            // 사용자 데이터 저장
            await setDoc(userRef, {
              telegramId: telegramUser.id,
              walletAddress: address.toLowerCase(),
              createdAt: new Date(),
              lastActiveAt: new Date(),
              missions: {},
              rewards: {
                cta: 0,
                nfts: []
              }
            }, { merge: true });

            setIsConnecting(false);

            // 부모 컴포넌트에 연결 성공 알림
            onConnect({
              telegramId: telegramUser.id,
              walletAddress: address,
              signature
            });

            hapticFeedback('success');
          } catch (error) {
            console.error('지갑 연결 완료 처리 오류:', error);
            setIsConnecting(false);
            showAlert('지갑 연결 중 오류가 발생했습니다. 다시 시도해주세요.');
            hapticFeedback('error');
          }
        }
      }
    };

    checkUrlParams();
  }, [telegramUser, onConnect]);

  // 지갑 설치 확인
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const installed = await checkWalletInstalled();
        setIsWalletInstalled(installed);
      } catch (error) {
        console.error('지갑 설치 확인 오류:', error);
        setIsWalletInstalled(false);
      }
    };

    checkWallet();
  }, []);

  // 지갑 연결 시작
  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      hapticFeedback('medium');

      // 지갑이 설치되어 있는지 다시 확인
      const installed = await checkWalletInstalled();

      if (!installed) {
        // 지갑이 설치되어 있지 않으면 설치 안내
        setIsConnecting(false);
        showAlert('크레아타 지갑이 설치되어 있지 않습니다. 먼저 지갑을 설치해주세요.');
        hapticFeedback('error');
        return;
      }

      // 지갑 연결 요청 (결과는 URL 파라미터를 통해 돌아옴)
      await connectCreataWallet();

      // 모바일의 경우 페이지가 리디렉션되므로 여기는 실행되지 않음
      // 브라우저 확장 프로그램의 경우 계속 실행

    } catch (error) {
      console.error('지갑 연결 오류:', error);
      setIsConnecting(false);
      showAlert('지갑 연결에 실패했습니다. 다시 시도해주세요.');
      hapticFeedback('error');
    }
  };

  // 앱스토어로 이동
  const handleInstallWallet = () => {
    hapticFeedback('medium');

    // iOS와 안드로이드 구분
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
      window.location.href = 'https://play.google.com/store/apps/details?id=com.creatachain.wallet';
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      window.location.href = 'https://apps.apple.com/app/creata-wallet/id1234567890';
    } else {
      window.location.href = 'https://wallet.creatachain.com/download';
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      {!isWalletInstalled ? (
        <div className="text-center mb-6">
          <p className="text-white mb-4">크레아타 지갑이 필요합니다. 아래 버튼을 눌러 설치해주세요.</p>
          <button
            className="btn-accent w-full max-w-xs"
            onClick={handleInstallWallet}
          >
            지갑 설치하기
          </button>
        </div>
      ) : (
        <div className="text-center mb-6">
          <p className="text-white mb-4">
            {walletAddress
              ? `연결된 지갑: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
              : '지갑을 연결하여 블록체인 섬 탐험을 시작하세요!'
            }
          </p>

          {!walletAddress && (
            <button
              className="btn-primary w-full max-w-xs"
              onClick={handleConnectWallet}
              disabled={isConnecting}
            >
              {isConnecting ? '연결 중...' : '지갑 연결하기'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletConnector;

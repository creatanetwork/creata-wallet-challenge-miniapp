import Web3 from 'web3';

// 모바일 환경 확인
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// 브라우저 확장 프로그램 확인
export const isCreataExtensionInstalled = () => {
  return typeof window.creata !== 'undefined';
};

// 모바일 앱 설치 확인 (딥링크 사용)
export const checkCreataWalletMobile = async () => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      // 앱이 설치되어 있지 않으면 타임아웃 발생
      resolve(false);
    }, 1500);

    // 딥링크로 지갑 앱 호출 시도
    window.location.href = 'creata://wallet/check';

    // 앱이 열리면 focus 이벤트 발생
    window.addEventListener('focus', () => {
      clearTimeout(timeout);
      resolve(true);
    }, { once: true });
  });
};

// 지갑 설치 확인 통합 함수
export const checkWalletInstalled = async () => {
  if (isMobile()) {
    return await checkCreataWalletMobile();
  } else {
    return isCreataExtensionInstalled();
  }
};

// 지갑 연결 요청
export const connectCreataWallet = async () => {
  try {
    if (isMobile()) {
      // 모바일 지갑 연결 (딥링크 + 리디렉션 방식)
      const callbackUrl = encodeURIComponent(window.location.href);
      window.location.href = `creata://wallet/connect?callback=${callbackUrl}`;
      return null; // 결과는 리디렉션 후 URL 파라미터로 받음
    } else if (window.creata) {
      // 브라우저 확장 프로그램 지갑 연결
      const accounts = await window.creata.request({ method: 'eth_requestAccounts' });
      return accounts[0]; // 연결된 주소 반환
    }
    return null;
  } catch (error) {
    console.error('지갑 연결 오류:', error);
    throw new Error('지갑 연결에 실패했습니다.');
  }
};

// 연결 후 URL 파라미터에서 지갑 주소 추출 (모바일 리디렉션 후)
export const getAddressFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('walletAddress');
};

// 메시지 서명 요청
export const signMessage = async (message, address) => {
  try {
    if (isMobile()) {
      // 모바일 지갑 서명 요청 (딥링크 + 리디렉션 방식)
      const encodedMessage = encodeURIComponent(message);
      const callbackUrl = encodeURIComponent(window.location.href);
      window.location.href = `creata://wallet/sign?message=${encodedMessage}&address=${address}&callback=${callbackUrl}`;
      return null; // 결과는 리디렉션 후 URL 파라미터로 받음
    } else if (window.creata) {
      // 브라우저 확장 프로그램 서명 요청
      const signature = await window.creata.request({
        method: 'personal_sign',
        params: [message, address],
      });
      return signature;
    }
    return null;
  } catch (error) {
    console.error('메시지 서명 오류:', error);
    throw new Error('메시지 서명에 실패했습니다.');
  }
};

// 서명 결과 URL 파라미터에서 추출 (모바일 리디렉션 후)
export const getSignatureFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('signature');
};

// 트랜잭션 전송 (토큰 전송 기준)
export const sendTransaction = async (toAddress, amount, tokenAddress = null) => {
  try {
    if (isMobile()) {
      // 모바일 지갑 트랜잭션 요청 (딥링크 + 리디렉션 방식)
      const callbackUrl = encodeURIComponent(window.location.href);
      let txUrl = '';

      if (tokenAddress) {
        // ERC-20 토큰 전송
        txUrl = `creata://wallet/transaction?type=token&to=${toAddress}&amount=${amount}&tokenAddress=${tokenAddress}&callback=${callbackUrl}`;
      } else {
        // 네이티브 코인(CTA) 전송 - CTA는 크레아타체인의 네이티브 토큰입니다
        txUrl = `creata://wallet/transaction?type=native&to=${toAddress}&amount=${amount}&callback=${callbackUrl}`;
      }

      window.location.href = txUrl;
      return null; // 결과는 리디렉션 후 URL 파라미터로 받음
    } else if (window.creata) {
      const web3 = new Web3(window.creata);

      if (tokenAddress) {
        // ERC-20 토큰 전송
        const tokenContract = new web3.eth.Contract([
          {
            name: 'transfer',
            type: 'function',
            inputs: [
              { type: 'address', name: 'to' },
              { type: 'uint256', name: 'value' }
            ],
            outputs: [{ type: 'bool' }]
          }
        ], tokenAddress);

        const data = tokenContract.methods.transfer(
          toAddress,
          web3.utils.toWei(amount.toString(), 'ether')
        ).encodeABI();

        const txHash = await window.creata.request({
          method: 'eth_sendTransaction',
          params: [{
            to: tokenAddress,
            from: await window.creata.request({ method: 'eth_requestAccounts' }).then(a => a[0]),
            data
          }],
        });

        return txHash;
      } else {
        // 네이티브 코인(CTA) 전송 - CTA는 크레아타체인의 네이티브 토큰입니다
        const txHash = await window.creata.request({
          method: 'eth_sendTransaction',
          params: [{
            to: toAddress,
            from: await window.creata.request({ method: 'eth_requestAccounts' }).then(a => a[0]),
            value: web3.utils.toHex(web3.utils.toWei(amount.toString(), 'ether'))
          }],
        });

        return txHash;
      }
    }

    return null;
  } catch (error) {
    console.error('트랜잭션 전송 오류:', error);
    throw new Error('트랜잭션 전송에 실패했습니다.');
  }
};

// 트랜잭션 결과 URL 파라미터에서 추출 (모바일 리디렉션 후)
export const getTxHashFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('txHash');
};

// 스마트 컨트랙트 함수 호출 (읽기 전용)
export const callContractRead = async (contractAddress, abi, functionName, params = []) => {
  try {
    const web3 = new Web3(isMobile() ? 'https://cvm.node.creatachain.com' : window.creata);
    const contract = new web3.eth.Contract(abi, contractAddress);
    const result = await contract.methods[functionName](...params).call();
    return result;
  } catch (error) {
    console.error('컨트랙트 읽기 오류:', error);
    throw new Error('컨트랙트 읽기에 실패했습니다.');
  }
};

// 스마트 컨트랙트 함수 호출 (쓰기 - 트랜잭션 발생)
export const callContractWrite = async (contractAddress, abi, functionName, params = []) => {
  try {
    if (isMobile()) {
      // 모바일 지갑에서는 ABI와 함수 이름, 파라미터를 전달하는 방식으로 구현
      const web3 = new Web3();
      const contract = new web3.eth.Contract(abi, contractAddress);
      const data = contract.methods[functionName](...params).encodeABI();
      const callbackUrl = encodeURIComponent(window.location.href);
      window.location.href = `creata://wallet/contract?to=${contractAddress}&data=${data}&callback=${callbackUrl}`;
      return null; // 결과는 리디렉션 후 URL 파라미터로 받음
    } else if (window.creata) {
      // 브라우저 확장 프로그램에서 컨트랙트 함수 호출
      const web3 = new Web3(window.creata);
      const accounts = await window.creata.request({ method: 'eth_requestAccounts' });
      const contract = new web3.eth.Contract(abi, contractAddress);
      const txHash = await contract.methods[functionName](...params).send({
        from: accounts[0]
      });
      return txHash;
    }
    return null;
  } catch (error) {
    console.error('컨트랙트 쓰기 오류:', error);
    throw new Error('컨트랙트 쓰기에 실패했습니다.');
  }
};

// 딥링크 테스트 함수
export const testDeepLink = async (type) => {
  try {
    const testLinks = {
      check: 'creata://wallet/check',
      connect: `creata://wallet/connect?callback=${encodeURIComponent(window.location.href)}`,
      transfer: `creata://wallet/transaction?type=native&to=0x1234567890AbCdEf1234567890AbCdEf12345678&amount=0.01&callback=${encodeURIComponent(window.location.href)}`,
      sign: `creata://wallet/sign?message=${encodeURIComponent('Test message')}&callback=${encodeURIComponent(window.location.href)}`
    };
    
    if (!testLinks[type]) {
      console.error('알 수 없는 딥링크 테스트 유형:', type);
      return false;
    }
    
    // 딥링크 열기
    window.location.href = testLinks[type];
    
    // 테스트 완료 플래그 설정 (실제로는 콜백에서 확인)
    return true;
  } catch (error) {
    console.error('딥링크 테스트 오류:', error);
    return false;
  }
};

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { verifyMission } from '../../utils/missions';
import { hapticFeedback, showAlert } from '../../services/telegram';

const MissionVerification = ({ mission, userInfo, isCompleted, onVerificationSuccess }) => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState({});

  // 미션 타입에 따른 검증 UI 렌더링
  const renderVerificationUI = () => {
    if (isCompleted) {
      return (
        <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center">
          <p className="text-success mb-2">미션을 성공적으로 완료했습니다!</p>
          <p className="text-gray-300 text-sm">보상을 받으려면 하단 버튼을 클릭하세요.</p>
        </div>
      );
    }

    const requirementType = mission.requirements?.type || '';

    switch (requirementType) {
      case 'INSTALL':
        return (
          <div className="text-center">
            <p className="text-gray-300 mb-4">이미 지갑을 설치하고 연결했습니다!</p>
            <button
              className="btn-primary w-full"
              onClick={handleVerifyInstall}
              disabled={isVerifying}
            >
              {isVerifying ? '확인 중...' : '완료 확인하기'}
            </button>
          </div>
        );

      case 'TRANSFER':
        return (
          <div>
            <p className="text-gray-300 mb-4">지정된 주소로 0.01 CTA를 전송하세요:</p>
            <div className="bg-gray-800 p-3 rounded-lg mb-4 break-all">
              <p className="text-gray-300 text-sm font-mono">
                {mission.requirements.params?.receiver || '0x1234567890AbCdEf1234567890AbCdEf12345678'}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">트랜잭션 해시 입력</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                placeholder="0x..."
                value={verificationData.txHash || ''}
                onChange={(e) => setVerificationData({...verificationData, txHash: e.target.value})}
              />
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleVerifyTransaction}
              disabled={isVerifying || !verificationData.txHash}
            >
              {isVerifying ? '검증 중...' : '거래 검증하기'}
            </button>
          </div>
        );

      case 'SMART_CONTRACT':
        return (
          <div>
            <p className="text-gray-300 mb-4">아래 스마트 컨트랙트를 배포하세요:</p>
            <div className="bg-gray-800 p-3 rounded-lg mb-4 overflow-x-auto">
              <pre className="text-gray-300 text-sm">
                {`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint private value;
    
    function set(uint x) public {
        value = x;
    }
    
    function get() public view returns (uint) {
        return value;
    }
}`}
              </pre>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">배포한 컨트랙트 주소 입력</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                placeholder="0x..."
                value={verificationData.contractAddress || ''}
                onChange={(e) => setVerificationData({...verificationData, contractAddress: e.target.value})}
              />
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleVerifySmartContract}
              disabled={isVerifying || !verificationData.contractAddress}
            >
              {isVerifying ? '검증 중...' : '컨트랙트 검증하기'}
            </button>
          </div>
        );

      case 'CROSS_CHAIN':
        return (
          <div>
            <p className="text-gray-300 mb-4">LunarLink를 사용하여 크로스체인 전송을 완료하세요:</p>
            <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">
              <li>제니스 체인에서 카테나 체인으로 자산을 전송하세요</li>
              <li>최소 0.001 CTA 이상의 금액을 전송해야 합니다</li>
              <li>전송 후 이 페이지로 돌아오세요</li>
            </ol>
            <div className="flex space-x-4">
              <button
                className="btn-secondary flex-1"
                onClick={handleOpenLunarLink}
              >
                LunarLink 열기
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleVerifyCrossChain}
                disabled={isVerifying}
              >
                {isVerifying ? '검증 중...' : '전송 검증하기'}
              </button>
            </div>
          </div>
        );

      case 'STAKING':
        return (
          <div>
            <p className="text-gray-300 mb-4">크레아타 지갑에서 스테이킹을 완료하세요:</p>
            <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-2">
              <li>최소 10 CTA를 스테이킹하세요</li>
              <li>최소 1시간 동안 스테이킹 상태를 유지하세요</li>
              <li>스테이킹 후 이 페이지로 돌아와 확인하세요</li>
            </ol>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">스테이킹한 금액 입력</label>
              <input
                type="number"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                placeholder="10"
                min="10"
                value={verificationData.amount || ''}
                onChange={(e) => setVerificationData({...verificationData, amount: e.target.value})}
              />
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleVerifyStaking}
              disabled={isVerifying || !verificationData.amount}
            >
              {isVerifying ? '검증 중...' : '스테이킹 검증하기'}
            </button>
          </div>
        );

      case 'KYT':
        return (
          <div>
            <p className="text-gray-300 mb-4">트랜잭션 로그를 분석하여 패턴 코드를 찾으세요:</p>
            <div className="bg-gray-800 p-3 rounded-lg mb-4">
              <p className="text-gray-300 text-sm">
                KYT 시스템에서 다음 주소의 트랜잭션을 분석하세요:
              </p>
              <p className="text-primary font-mono text-sm mt-1 break-all">
                {mission.requirements.params?.targetAddress || '0x9876543210FeDcBa9876543210FeDcBa98765432'}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-1">발견한 패턴 코드 입력</label>
              <input
                type="text"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white"
                placeholder="CODE-123-ABC"
                value={verificationData.patternCode || ''}
                onChange={(e) => setVerificationData({...verificationData, patternCode: e.target.value})}
              />
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleVerifyKyt}
              disabled={isVerifying || !verificationData.patternCode}
            >
              {isVerifying ? '검증 중...' : '패턴 코드 검증하기'}
            </button>
          </div>
        );

      case 'QUIZ':
        return (
          <div>
            <p className="text-gray-300 mb-4">크레아타체인에 대한 퀴즈를 풀어보세요:</p>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-white font-semibold mb-2">1. 크레아타체인의 두 체인은 무엇인가요?</p>
                <div className="space-y-2">
                  {['이더리움과 폴리곤', '비트코인과 솔라나', '제니스와 카테나', '코스모스와 오스모시스'].map((option, index) => (
                    <label key={index} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="q1"
                        value={index}
                        checked={verificationData.q1 === index}
                        onChange={() => setVerificationData({...verificationData, q1: index})}
                        className="text-primary"
                      />
                      <span className="text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* 더 많은 퀴즈 문제 추가 가능 */}
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleVerifyQuiz}
              disabled={isVerifying || verificationData.q1 === undefined}
            >
              {isVerifying ? '채점 중...' : '퀴즈 제출하기'}
            </button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p className="text-gray-300">이 미션에 대한 검증 방법이 제공되지 않았습니다.</p>
          </div>
        );
    }
  };

  // 지갑 설치 검증
  const handleVerifyInstall = async () => {
    hapticFeedback('medium');
    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id);

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '미션 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 트랜잭션 검증
  const handleVerifyTransaction = async () => {
    hapticFeedback('medium');
    if (!verificationData.txHash) {
      showAlert('트랜잭션 해시를 입력해주세요.');
      return;
    }

    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id, {
        txHash: verificationData.txHash
      });

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '트랜잭션 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 스마트 컨트랙트 검증
  const handleVerifySmartContract = async () => {
    hapticFeedback('medium');
    if (!verificationData.contractAddress) {
      showAlert('컨트랙트 주소를 입력해주세요.');
      return;
    }

    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id, {
        contractAddress: verificationData.contractAddress
      });

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '컨트랙트 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // LunarLink 열기
  const handleOpenLunarLink = () => {
    hapticFeedback('medium');
    // Redirect URL 생성 (현재 페이지로 돌아오기 위함)
    const redirectUrl = encodeURIComponent(window.location.href);
    window.location.href = `https://lunarlink.creatachain.com/?callback=${redirectUrl}`;
  };

  // 크로스체인 전송 검증
  const handleVerifyCrossChain = async () => {
    hapticFeedback('medium');
    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id);

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '크로스체인 전송 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 스테이킹 검증
  const handleVerifyStaking = async () => {
    hapticFeedback('medium');
    if (!verificationData.amount || parseFloat(verificationData.amount) < 10) {
      showAlert('최소 10 CTA 이상 스테이킹해야 합니다.');
      return;
    }

    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id, {
        amount: parseFloat(verificationData.amount)
      });

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '스테이킹 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // KYT 검증
  const handleVerifyKyt = async () => {
    hapticFeedback('medium');
    if (!verificationData.patternCode) {
      showAlert('패턴 코드를 입력해주세요.');
      return;
    }

    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id, {
        patternCode: verificationData.patternCode
      });

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '패턴 코드 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 퀴즈 검증
  const handleVerifyQuiz = async () => {
    hapticFeedback('medium');
    if (verificationData.q1 === undefined) {
      showAlert('모든 문제에 답변해주세요.');
      return;
    }

    setIsVerifying(true);

    try {
      const userId = `${userInfo.telegramId}_${userInfo.walletAddress.toLowerCase()}`;
      const result = await verifyMission(userId, mission.id, {
        answers: [verificationData.q1]
      });

      if (result.success) {
        onVerificationSuccess();
      } else {
        showAlert(result.message || '퀴즈 검증에 실패했습니다.');
      }
    } catch (error) {
      console.error('검증 오류:', error);
      showAlert('검증 중 오류가 발생했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">미션 검증</h3>
      {renderVerificationUI()}
    </div>
  );
};

export default MissionVerification;

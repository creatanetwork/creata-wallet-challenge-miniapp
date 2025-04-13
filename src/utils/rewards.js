import { collection, doc, getDoc, updateDoc, arrayUnion, increment, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';

// CTA 토큰 보상 지급 (Cloud Function 호출)
// CTA는 크레아타체인의 네이티브 토큰입니다
export const sendCtaReward = async (userId, amount, reason) => {
  try {
    // 사용자 정보 가져오기
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const walletAddress = userData.walletAddress;

    // Firebase Function 호출하여 실제 CTA 전송 (네이티브 토큰)
    const sendCta = httpsCallable(functions, 'sendCtaReward');

    const result = await sendCta({
      walletAddress,
      amount,
      reason
    });

    // 트랜잭션 결과 확인
    if (result.data && result.data.success) {
      // 사용자 보상 기록 업데이트
      await updateDoc(userRef, {
        'rewards.cta': increment(amount),
        'rewards.history': arrayUnion({
          type: 'CTA',
          amount,
          reason,
          timestamp: new Date(),
          txHash: result.data.txHash
        })
      });

      return {
        success: true,
        txHash: result.data.txHash
      };
    }

    throw new Error(result.data.message || '보상 지급 실패');
  } catch (error) {
    console.error('CTA 보상 지급 오류:', error);
    throw new Error('CTA 보상 지급에 실패했습니다.');
  }
};

// NFT 보상 지급 (Cloud Function 호출)
export const sendNftReward = async (userId, nftId, reason) => {
  try {
    // 사용자 정보 가져오기
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const walletAddress = userData.walletAddress;

    // NFT 정보 가져오기
    const nftRef = doc(db, 'nfts', nftId);
    const nftDoc = await getDoc(nftRef);

    if (!nftDoc.exists()) {
      throw new Error('NFT 정보를 찾을 수 없습니다.');
    }

    const nftData = nftDoc.data();

    // Firebase Function 호출하여 실제 NFT 민팅
    const mintNft = httpsCallable(functions, 'mintNft');

    const result = await mintNft({
      walletAddress,
      nftId,
      metadata: nftData.metadata
    });

    // 트랜잭션 결과 확인
    if (result.data && result.data.success) {
      // 사용자 보상 기록 업데이트
      await updateDoc(userRef, {
        'rewards.nfts': arrayUnion({
          id: nftId,
          name: nftData.name,
          image: nftData.image,
          tokenId: result.data.tokenId,
          contractAddress: result.data.contractAddress,
          receivedAt: new Date()
        }),
        'rewards.history': arrayUnion({
          type: 'NFT',
          nftId,
          reason,
          timestamp: new Date(),
          txHash: result.data.txHash
        })
      });

      return {
        success: true,
        txHash: result.data.txHash,
        tokenId: result.data.tokenId
      };
    }

    throw new Error(result.data.message || 'NFT 보상 지급 실패');
  } catch (error) {
    console.error('NFT 보상 지급 오류:', error);
    throw new Error('NFT 보상 지급에 실패했습니다.');
  }
};

// 점수(포인트) 부여
export const awardPoints = async (userId, points, reason) => {
  try {
    // 사용자 문서 참조
    const userRef = doc(db, 'users', userId);

    // 점수 업데이트
    await updateDoc(userRef, {
      points: increment(points),
      'rewards.history': arrayUnion({
        type: 'POINTS',
        amount: points,
        reason,
        timestamp: new Date()
      })
    });

    // 리더보드 업데이트
    const weekStartDate = getWeekStartDate(); // 주의 시작일 계산
    const leaderboardId = `weekly-${weekStartDate.toISOString().split('T')[0]}`;
    const leaderboardRef = doc(db, 'leaderboard', leaderboardId);

    // 리더보드가 있는지 확인
    const leaderboardDoc = await getDoc(leaderboardRef);

    if (leaderboardDoc.exists()) {
      // 기존 리더보드 업데이트
      await updateDoc(leaderboardRef, {
        entries: arrayUnion({
          userId,
          points,
          timestamp: new Date()
        })
      });
    } else {
      // 새 리더보드 생성
      await setDoc(leaderboardRef, {
        weekStart: weekStartDate,
        entries: [{
          userId,
          points,
          timestamp: new Date()
        }]
      });
    }

    return { success: true, points };
  } catch (error) {
    console.error('점수 부여 오류:', error);
    throw new Error('점수 부여에 실패했습니다.');
  }
};

// 사용자 보상 내역 조회
export const getUserRewards = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    return userData.rewards || { cta: 0, nfts: [], history: [] };
  } catch (error) {
    console.error('사용자 보상 내역 조회 오류:', error);
    throw new Error('사용자 보상 내역 조회에 실패했습니다.');
  }
};

// 미션 완료 후 보상 지급 처리
export const processMissionReward = async (userId, missionId) => {
  try {
    // 미션 정보 가져오기
    const missionRef = doc(db, 'missions', missionId);
    const missionDoc = await getDoc(missionRef);

    if (!missionDoc.exists()) {
      throw new Error('존재하지 않는 미션입니다.');
    }

    const mission = missionDoc.data();
    const reward = mission.reward;

    if (!reward || !reward.type) {
      return { success: true, message: '이 미션에는 보상이 없습니다.' };
    }

    // 사용자 정보 가져오기
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();

    // 이미 보상을 받았는지 확인
    const missionProgress = userData.missions && userData.missions[missionId];
    if (missionProgress && missionProgress.rewardClaimed) {
      return { success: false, message: '이미 보상을 받았습니다.' };
    }

    // 보상 유형에 따른 처리
    let rewardResult;

    switch (reward.type) {
      case 'CTA':
        rewardResult = await sendCtaReward(
          userId,
          reward.amount,
          `미션 완료: ${mission.title}`
        );
        break;

      case 'NFT':
        rewardResult = await sendNftReward(
          userId,
          reward.nftId,
          `미션 완료: ${mission.title}`
        );
        break;

      case 'POINTS':
        rewardResult = await awardPoints(
          userId,
          reward.amount,
          `미션 완료: ${mission.title}`
        );
        break;

      default:
        throw new Error('지원되지 않는 보상 유형입니다.');
    }

    // 보상 지급 상태 업데이트
    await updateDoc(userRef, {
      [`missions.${missionId}.rewardClaimed`]: true,
      [`missions.${missionId}.claimedAt`]: new Date()
    });

    return {
      success: true,
      rewardType: reward.type,
      rewardDetails: rewardResult
    };
  } catch (error) {
    console.error('보상 처리 오류:', error);
    throw new Error('보상 처리에 실패했습니다.');
  }
};

// 주의 시작일 계산 (리더보드용)
export const getWeekStartDate = () => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0(일요일)부터 6(토요일)
  const diff = now.getDate() - dayOfWeek;

  // 일요일을 주의 시작일로 설정
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
};

// 리더보드 조회
export const getLeaderboard = async (limit = 10) => {
  try {
    const weekStartDate = getWeekStartDate();
    const leaderboardId = `weekly-${weekStartDate.toISOString().split('T')[0]}`;
    const leaderboardRef = doc(db, 'leaderboard', leaderboardId);

    const leaderboardDoc = await getDoc(leaderboardRef);

    if (!leaderboardDoc.exists()) {
      return {
        weekStart: weekStartDate,
        entries: []
      };
    }

    const leaderboardData = leaderboardDoc.data();

    // 사용자별 점수 합산 및 정렬
    const userScores = {};

    leaderboardData.entries.forEach(entry => {
      if (!userScores[entry.userId]) {
        userScores[entry.userId] = 0;
      }
      userScores[entry.userId] += entry.points;
    });

    // 사용자 정보 가져오기
    const leaderboardEntries = [];

    for (const [userId, totalPoints] of Object.entries(userScores)) {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        leaderboardEntries.push({
          userId,
          walletAddress: userData.walletAddress,
          telegramId: userData.telegramId,
          displayName: userData.displayName || '익명의 탐험가',
          points: totalPoints
        });
      }
    }

    // 점수 기준 내림차순 정렬
    leaderboardEntries.sort((a, b) => b.points - a.points);

    // 상위 N개만 반환
    return {
      weekStart: weekStartDate,
      entries: leaderboardEntries.slice(0, limit)
    };
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    throw new Error('리더보드 조회에 실패했습니다.');
  }
};

// 사용자 리더보드 순위 조회
export const getUserLeaderboardRank = async (userId) => {
  try {
    const leaderboard = await getLeaderboard(1000); // 충분히 큰 숫자로 제한

    // 사용자 인덱스 찾기
    const userIndex = leaderboard.entries.findIndex(entry => entry.userId === userId);

    if (userIndex === -1) {
      return {
        rank: null,
        totalUsers: leaderboard.entries.length
      };
    }

    return {
      rank: userIndex + 1, // 1부터 시작하는 순위
      totalUsers: leaderboard.entries.length,
      points: leaderboard.entries[userIndex].points
    };
  } catch (error) {
    console.error('사용자 리더보드 순위 조회 오류:', error);
    throw new Error('사용자 리더보드 순위 조회에 실패했습니다.');
  }
};

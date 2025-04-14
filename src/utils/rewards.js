import { collection, doc, getDoc, updateDoc, arrayUnion, increment, setDoc, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';

// CTA 토큰 보상 지급 (Cloud Function 호출)
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

    // Firebase Function 호출하여 실제 CTA 전송
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
    // 사용자 정보 가져오기
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();

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
    await updateUserRank(userId, (userData.points || 0) + points);

    return { success: true, points };
  } catch (error) {
    console.error('점수 부여 오류:', error);
    throw new Error('점수 부여에 실패했습니다.');
  }
};

// 리더보드 업데이트 최적화 (백엔드 작업)
export const updateUserRank = async (userId, points) => {
  try {
    // 주간 시작일 계산
    const weekStartDate = getWeekStartDate();
    const leaderboardId = `weekly-${weekStartDate.toISOString().split('T')[0]}`;
    
    // 사용자 정보 가져오기
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    const userData = userDoc.data();
    
    // 리더보드 랭킹 문서 참조
    const rankingRef = doc(db, 'leaderboard', leaderboardId, 'rankings', userId);
    
    // 랭킹 정보 업데이트 (또는 생성)
    await setDoc(rankingRef, {
      userId,
      telegramId: userData.telegramId,
      walletAddress: userData.walletAddress,
      displayName: userData.displayName || '익명의 탐험가',
      points,
      updatedAt: new Date()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('랭킹 업데이트 오류:', error);
    throw new Error('랭킹 업데이트에 실패했습니다.');
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

// 리더보드 조회 최적화
export const getLeaderboard = async (limit = 10) => {
  try {
    const weekStartDate = getWeekStartDate();
    const leaderboardId = `weekly-${weekStartDate.toISOString().split('T')[0]}`;
    
    // 포인트 기준 내림차순 정렬 쿼리
    const rankingsRef = collection(db, 'leaderboard', leaderboardId, 'rankings');
    const rankingsQuery = query(
      rankingsRef,
      orderBy('points', 'desc'),
      limit(limit)
    );
    
    const rankingsSnapshot = await getDocs(rankingsQuery);
    const entries = [];
    
    rankingsSnapshot.forEach((doc) => {
      entries.push(doc.data());
    });
    
    return {
      weekStart: weekStartDate,
      entries
    };
  } catch (error) {
    console.error('리더보드 조회 오류:', error);
    throw new Error('리더보드 조회에 실패했습니다.');
  }
};

// 사용자 순위 조회 최적화
export const getUserLeaderboardRank = async (userId) => {
  try {
    const weekStartDate = getWeekStartDate();
    const leaderboardId = `weekly-${weekStartDate.toISOString().split('T')[0]}`;
    
    // 사용자 포인트 조회
    const rankingRef = doc(db, 'leaderboard', leaderboardId, 'rankings', userId);
    const rankingDoc = await getDoc(rankingRef);
    
    if (!rankingDoc.exists()) {
      return { rank: null, totalUsers: 0, points: 0 };
    }
    
    const userPoints = rankingDoc.data().points;
    
    // 사용자보다 높은 포인트를 가진 사용자 수 계산
    const rankingsRef = collection(db, 'leaderboard', leaderboardId, 'rankings');
    const higherRanksQuery = query(
      rankingsRef,
      where('points', '>', userPoints)
    );
    
    const higherRanksSnapshot = await getDocs(higherRanksQuery);
    const rank = higherRanksSnapshot.size + 1; // 1부터 시작하는 순위
    
    // 총 사용자 수 계산 (필요한 경우)
    const countQuery = query(rankingsRef);
    const countSnapshot = await getDocs(countQuery);
    const totalUsers = countSnapshot.size;
    
    return {
      rank,
      totalUsers,
      points: userPoints
    };
  } catch (error) {
    console.error('사용자 리더보드 순위 조회 오류:', error);
    throw new Error('사용자 리더보드 순위 조회에 실패했습니다.');
  }
};

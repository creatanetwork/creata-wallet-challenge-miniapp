import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, increment, setDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

// 모든 미션 목록 가져오기
export const getAllMissions = async () => {
  try {
    const missionsRef = collection(db, 'missions');
    const querySnapshot = await getDocs(missionsRef);
    const missions = [];

    querySnapshot.forEach((doc) => {
      missions.push({ id: doc.id, ...doc.data() });
    });

    // 순서대로 정렬
    missions.sort((a, b) => a.order - b.order);

    return missions;
  } catch (error) {
    console.error('미션 목록 조회 오류:', error);
    throw new Error('미션 목록 조회에 실패했습니다.');
  }
};

// 특정 미션 정보 가져오기
export const getMission = async (missionId) => {
  try {
    const missionRef = doc(db, 'missions', missionId);
    const missionDoc = await getDoc(missionRef);

    if (missionDoc.exists()) {
      return { id: missionDoc.id, ...missionDoc.data() };
    }

    return null;
  } catch (error) {
    console.error('미션 정보 조회 오류:', error);
    throw new Error('미션 정보 조회에 실패했습니다.');
  }
};

// 미션 완료 상태 업데이트
export const completeMission = async (userId, missionId) => {
  try {
    // 미션 정보 가져오기
    const mission = await getMission(missionId);

    if (!mission) {
      throw new Error('존재하지 않는 미션입니다.');
    }

    // 사용자 문서 참조
    const userRef = doc(db, 'users', userId);

    // 미션 완료 상태 업데이트
    await updateDoc(userRef, {
      [`missions.${missionId}.completed`]: true,
      [`missions.${missionId}.completedAt`]: new Date()
    });

    // 통계 업데이트
    const statsRef = doc(db, 'stats', 'global');

    await updateDoc(statsRef, {
      totalMissionsCompleted: increment(1)
    });

    return true;
  } catch (error) {
    console.error('미션 완료 상태 업데이트 오류:', error);
    throw new Error('미션 완료 상태 업데이트에 실패했습니다.');
  }
};

// 사용자의 모든 미션 진행 상황 조회
export const getUserMissionProgress = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const userData = userDoc.data();
    const missions = userData.missions || {};

    // 전체 미션 목록 가져오기
    const allMissions = await getAllMissions();

    // 미션 진행 상황 매핑
    return allMissions.map(mission => ({
      ...mission,
      progress: missions[mission.id] || { completed: false }
    }));
  } catch (error) {
    console.error('미션 진행 상황 조회 오류:', error);
    throw new Error('미션 진행 상황 조회에 실패했습니다.');
  }
};

// 미션 검증 함수 (미션 유형별로 다른 검증 로직 적용)
export const verifyMission = async (userId, missionId, verificationData = {}) => {
  try {
    // 미션 정보 가져오기
    const mission = await getMission(missionId);

    if (!mission) {
      throw new Error('존재하지 않는 미션입니다.');
    }

    // 미션 유형별 검증 로직
    const requirementType = mission.requirements?.type || '';

    switch (requirementType) {
      case 'INSTALL':
        // 지갑 설치/연결 확인은 이미 완료된 상태로 가정
        return { success: true, message: '지갑 연결이 확인되었습니다.' };

      case 'TRANSFER':
        // 트랜잭션 검증
        const { txHash } = verificationData;
        if (!txHash) {
          return { success: false, message: '트랜잭션 해시가 필요합니다.' };
        }

        // 여기에서 트랜잭션 검증 로직 추가 필요
        // 간단한 예시로, 해시가 있으면 성공으로 처리
        return { success: true, message: '트랜잭션이 확인되었습니다.' };

      case 'SMART_CONTRACT':
        // 스마트 컨트랙트 배포 검증
        const { contractAddress } = verificationData;
        if (!contractAddress) {
          return { success: false, message: '컨트랙트 주소가 필요합니다.' };
        }

        // 여기에서 컨트랙트 검증 로직 추가 필요
        return { success: true, message: '스마트 컨트랙트가 확인되었습니다.' };

      case 'CROSS_CHAIN':
        // 크로스체인 전송 검증
        // 간단한 예시로, 검증 데이터가 있으면 성공으로 처리
        return { success: true, message: '크로스체인 전송이 확인되었습니다.' };

      case 'STAKING':
        // 스테이킹 검증
        const { amount, duration } = verificationData;
        if (!amount || amount < 10) {
          return { success: false, message: '최소 10 CTA를 스테이킹해야 합니다.' };
        }

        return { success: true, message: '스테이킹이 확인되었습니다.' };

      case 'KYT':
        // 트랜잭션 추적 검증
        const { patternCode } = verificationData;
        if (!patternCode) {
          return { success: false, message: '패턴 코드가 필요합니다.' };
        }

        // 여기에서 패턴 코드 검증 로직 추가 필요
        return { success: true, message: '패턴 코드가 확인되었습니다.' };

      case 'QUIZ':
        // 퀴즈 검증
        const { answers } = verificationData;
        if (!answers || !Array.isArray(answers)) {
          return { success: false, message: '퀴즈 답변이 필요합니다.' };
        }

        // 여기에서 퀴즈 답변 검증 로직 추가 필요
        // 간단한 예시로, 답변이 있으면 성공으로 처리
        return { success: true, message: '퀴즈를 완료했습니다.' };

      default:
        return { success: false, message: '지원되지 않는 미션 유형입니다.' };
    }
  } catch (error) {
    console.error('미션 검증 오류:', error);
    throw new Error('미션 검증에 실패했습니다.');
  }
};

// 특정 미션이 잠금 해제되었는지 확인
export const isMissionUnlocked = (missionId, completedMissions = []) => {
  // 첫 번째 미션은 항상 잠금 해제
  if (missionId === 'mission_arrival') return true;

  // 미션 ID에 따른 선행 미션 매핑
  const prerequisiteMissions = {
    mission_transaction: ['mission_arrival'],
    mission_smart_contract: ['mission_transaction'],
    mission_cross_chain: ['mission_transaction'],
    mission_staking: ['mission_transaction'],
    mission_kyt: ['mission_smart_contract'],
    mission_quiz: ['mission_arrival'],
    mission_leaderboard: [] // 항상 접근 가능
  };

  // 선행 미션 목록 가져오기
  const prerequisites = prerequisiteMissions[missionId] || [];

  // 모든 선행 미션이 완료되었는지 확인
  return prerequisites.every(prereq => completedMissions.includes(prereq));
};

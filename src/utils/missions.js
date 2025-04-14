import { collection, doc, getDoc, getDocs, updateDoc, arrayUnion, increment, setDoc, query, where, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';

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
    // Firebase Function을 통해 백엔드에서 검증
    const verifyMissionFunc = httpsCallable(functions, 'verifyMission');
    const result = await verifyMissionFunc({
      userId,
      missionId,
      verificationData
    });
    
    return result.data;
  } catch (error) {
    console.error('미션 검증 오류:', error);
    throw new Error('미션 검증에 실패했습니다.');
  }
};

// 특정 미션이 잠금 해제되었는지 확인
export const isMissionUnlocked = async (userId, missionId) => {
  try {
    // 미션 정보 가져오기
    const missionRef = doc(db, 'missions', missionId);
    const missionDoc = await getDoc(missionRef);
    
    if (!missionDoc.exists()) {
      return false;
    }
    
    const mission = missionDoc.data();
    
    // 첫 번째 미션이나 prerequisites가 없는 경우 항상 잠금 해제
    if (!mission.prerequisites || mission.prerequisites.length === 0) {
      return true;
    }
    
    // 사용자의 미션 진행 상황 가져오기
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return false;
    }
    
    const userData = userDoc.data();
    const userMissions = userData.missions || {};
    
    // 모든 선행 미션이 완료되었는지 확인
    const allPrerequisitesCompleted = mission.prerequisites.every(
      prerequisite => userMissions[prerequisite]?.completed
    );
    
    return allPrerequisitesCompleted;
  } catch (error) {
    console.error('미션 잠금 상태 확인 오류:', error);
    return false;
  }
};

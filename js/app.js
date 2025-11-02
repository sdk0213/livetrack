// ============================================
// RunCheer Application - 객체지향 구조
// ============================================

// 환경 설정
const CONFIG = {
  KAKAO_JS_KEY: '1c986b10c0401ffb6c00df1ccddef006', // 카카오 개발자 콘솔에서 발급받은 JavaScript 키
  API_BASE: '/api',
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  IMAGE_QUALITY: 0.5, // 이미지 압축률 (0.5 = 50% 품질)
  IMAGE_MAX_WIDTH: 600, // 최대 가로 크기
  IMAGE_MAX_HEIGHT: 600, // 최대 세로 크기
  CACHE_DURATION: 3 * 60 * 60 * 1000 // 3시간
};

// ============================================
// 유틸리티 클래스
// ============================================
class Utils {
  static async compressImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // 최대 크기 제한 (비용 절감을 위해 작게)
          const MAX_WIDTH = CONFIG.IMAGE_MAX_WIDTH;
          const MAX_HEIGHT = CONFIG.IMAGE_MAX_HEIGHT;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            CONFIG.IMAGE_QUALITY
          );
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static generateGroupCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static showLoading(element) {
    const originalText = element.textContent;
    element.disabled = true;
    element.innerHTML = originalText + ' <span class="loading"></span>';
    return originalText;
  }

  static hideLoading(element, originalText) {
    element.disabled = false;
    element.textContent = originalText;
  }

  static showToast(message, type = 'info') {
    // 간단한 토스트 메시지
    alert(message);
  }

  // 거리 계산 (Haversine formula)
  static calcDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // GPX 포인트에서 특정 거리의 위치 계산
  static getPositionOnRoute(gpxPoints, distanceKm) {
    if (!gpxPoints || gpxPoints.length === 0) return null;
    
    let accumulated = 0;
    for (let i = 1; i < gpxPoints.length; i++) {
      const prev = gpxPoints[i - 1];
      const curr = gpxPoints[i];
      const segDist = this.calcDistance(prev.lat(), prev.lng(), curr.lat(), curr.lng());
      
      if (accumulated + segDist >= distanceKm) {
        const ratio = (distanceKm - accumulated) / segDist;
        const lat = prev.lat() + (curr.lat() - prev.lat()) * ratio;
        const lng = prev.lng() + (curr.lng() - prev.lng()) * ratio;
        return new naver.maps.LatLng(lat, lng);
      }
      accumulated += segDist;
    }
    return gpxPoints[gpxPoints.length - 1];
  }
}

// ============================================
// API 서비스 클래스
// ============================================
class APIService {
  static async request(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE}${endpoint}`;
    console.log(`[API Request] ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    console.log(`[API Response] ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Error] ${response.status}:`, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    // 204 No Content는 JSON 파싱하지 않음
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();
    console.log('[API Data]:', data);
    return data;
  }

  // 사용자 관련
  static async getUser(kakaoId) {
    return this.request(`/users/${kakaoId}`);
  }

  static async createUser(userData) {
    return this.request(`/users/${userData.kakaoId}`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  static async updateUserName(kakaoId, name) {
    return this.request(`/users/${kakaoId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
  }

  static async deleteUser(kakaoId) {
    return this.request(`/users/${kakaoId}`, {
      method: 'DELETE'
    });
  }

  // 그룹 관련
  static async createGroup(groupData) {
    return this.request('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData)
    });
  }

  static async createGroupWithMember(groupData) {
    return this.request('/groups/create-with-member', {
      method: 'POST',
      body: JSON.stringify(groupData)
    });
  }

  static async getGroup(code) {
    return this.request(`/groups/${code}`);
  }

  static async deleteGroup(code) {
    return this.request(`/groups/${code}`, {
      method: 'DELETE'
    });
  }

  static async getUserGroup(kakaoId) {
    return this.request(`/users/group?kakaoId=${kakaoId}`);
  }

  static async joinGroup(groupData) {
    try {
      return await this.request('/groups/join', {
        method: 'POST',
        body: JSON.stringify(groupData)
      });
    } catch (error) {
      // 주자 수 제한 에러 처리
      if (error.error === 'RUNNER_LIMIT_EXCEEDED') {
        throw new Error('이 그룹은 이미 주자가 50명 등록되어 있습니다.');
      }
      throw error;
    }
  }

  static async leaveGroup(leaveData) {
    return this.request('/groups/leave', {
      method: 'POST',
      body: JSON.stringify(leaveData)
    });
  }

  static async getGroupRunners(code) {
    return this.request(`/groups/runners?code=${code}`);
  }

  // 그룹 개수 확인
  static async getGroupCount() {
    const result = await this.request('/groups');
    return result.count || 0;
  }

  // 이미지 업로드
  static async uploadImage(blob, groupCode, kakaoId) {
    // Blob을 base64로 변환
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    return this.request('/images/upload', {
      method: 'POST',
      body: JSON.stringify({
        imageData: base64,
        groupCode,
        kakaoId
      })
    });
  }

  // 주자 데이터 (기존 API)
  static async getPlayerData(eventId, bib) {
    const response = await fetch(`/api/proxy?path=${encodeURIComponent(`event/${eventId}/player/${bib}`)}`);
    if (!response.ok) throw new Error('Player data fetch failed');
    return response.json();
  }
}

// ============================================
// 인증 관리 클래스
// ============================================
class AuthManager {
  constructor() {
    this.user = null;
    this.initKakao();
  }

  initKakao() {
    if (!Kakao.isInitialized()) {
      Kakao.init(CONFIG.KAKAO_JS_KEY);
      console.log('Kakao SDK initialized');
    }
  }

  // 페이지 로드 시 인가 코드 확인
  async handleRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('Login error:', error);
      alert('로그인에 실패했습니다.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return null;
    }

    if (code) {
      try {
        // URL에서 code 제거
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 서버에서 토큰 요청
        const response = await fetch('/api/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token request failed:', errorText);
          throw new Error(`Failed to get token: ${response.status}`);
        }

        const data = await response.json();
        
        // 액세스 토큰 설정
        Kakao.Auth.setAccessToken(data.access_token);
        
        const userInfo = data.user;
        this.user = userInfo;
        
        console.log('User info from Kakao:', userInfo);
        
        // 서버에 사용자 정보 저장/확인
        let userExists = false;
        try {
          await APIService.getUser(userInfo.id);
          console.log('Existing user found');
          userExists = true;
        } catch (e) {
          console.log('User not found, creating new user');
        }
        
        // 사용자가 없으면 생성
        if (!userExists) {
          const userData = {
            kakaoId: userInfo.id,
            name: userInfo.properties?.nickname || userInfo.kakao_account?.profile?.nickname || '사용자',
            profileImage: userInfo.properties?.profile_image || userInfo.kakao_account?.profile?.profile_image_url || ''
          };
          console.log('Creating new user with data:', userData);
          try {
            await APIService.createUser(userData);
            console.log('User created successfully');
          } catch (createError) {
            console.error('Failed to create user:', createError);
            // 중복 키 에러는 무시 (이미 존재하는 사용자 - 동시 생성 시도 등)
            if (createError.message && createError.message.includes('duplicate key')) {
              console.log('User already exists (race condition), continuing...');
            } else {
              throw new Error('사용자 생성에 실패했습니다. 다시 시도해주세요.');
            }
          }
        }
        
        return userInfo;
      } catch (error) {
        console.error('Failed to get user info:', error);
        alert(error.message || '로그인 처리 중 오류가 발생했습니다.');
        // 로컬스토리지 정리
        localStorage.removeItem('user');
        return null;
      }
    }

    return null;
  }

  async login() {
    try {
      if (!window.Kakao) {
        throw new Error('Kakao SDK not loaded');
      }

      // 공식 문서에 따른 정확한 방식: Kakao.Auth.authorize()
      // 리다이렉트 방식이므로 Promise가 아닌 페이지 이동 발생
      Kakao.Auth.authorize({
        redirectUri: 'https://livetrack-theta.vercel.app/'
      });
      
      // authorize는 페이지를 리다이렉트하므로 여기 코드는 실행되지 않음
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async getKakaoUserInfo() {
    return new Promise((resolve, reject) => {
      Kakao.API.request({
        url: '/v2/user/me',
        success: (res) => resolve(res),
        fail: (err) => reject(err)
      });
    });
  }

  logout() {
    Kakao.Auth.logout();
    this.user = null;
  }

  isLoggedIn() {
    return this.user !== null;
  }

  getUser() {
    return this.user;
  }
}

// ============================================
// 그룹 관리 클래스
// ============================================
class GroupManager {
  constructor() {
    this.currentGroup = null;
  }

  async createGroup(name, eventId, creatorKakaoId) {
    let code;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    // 중복되지 않는 코드 생성
    while (attempts < MAX_ATTEMPTS) {
      code = Utils.generateGroupCode();
      try {
        await APIService.getGroup(code);
        attempts++;
      } catch (e) {
        // 그룹이 없으면 사용 가능
        break;
      }
    }

    if (attempts >= MAX_ATTEMPTS) {
      throw new Error('그룹 코드 생성에 실패했습니다.');
    }

    const groupData = {
      code,
      name,
      eventId: parseInt(eventId, 10),
      creatorKakaoId
    };

    const group = await APIService.createGroup(groupData);
    this.currentGroup = group;
    return group;
  }

  async joinGroup(code) {
    const group = await APIService.getGroup(code);
    this.currentGroup = group;
    return group;
  }

  async registerRunner(kakaoId, bib, photoBlob, photoUrl = null) {
    if (!this.currentGroup) {
      throw new Error('그룹에 참여하지 않았습니다.');
    }

    let imageUrl = photoUrl;
    
    // photoBlob이 있으면 이미지 업로드
    if (photoBlob) {
      const imageResult = await APIService.uploadImage(
        photoBlob,
        this.currentGroup.code,
        kakaoId
      );
      imageUrl = imageResult.url;
    }

    // 주자 정보 등록
    const runnerData = {
      code: this.currentGroup.code,
      kakaoId,
      role: 'runner',
      bib,
      photoUrl: imageUrl
    };

    return APIService.joinGroup(runnerData);
  }

  async registerSupporter(kakaoId) {
    if (!this.currentGroup) {
      throw new Error('그룹에 참여하지 않았습니다.');
    }

    // 응원 정보 등록 (배번과 사진 불필요)
    const supporterData = {
      code: this.currentGroup.code,
      kakaoId,
      role: 'supporter'
    };

    return APIService.joinGroup(supporterData);
  }

  async getRunners() {
    if (!this.currentGroup) return [];
    return APIService.getGroupRunners(this.currentGroup.code);
  }

  async getGroupRunners(groupCode) {
    return APIService.getGroupRunners(groupCode);
  }

  async leaveGroup(kakaoId) {
    if (!this.currentGroup) return;
    await APIService.leaveGroup({
      code: this.currentGroup.code,
      kakaoId
    });
    this.currentGroup = null;
  }

  getCurrentGroup() {
    return this.currentGroup;
  }
}

// ============================================
// 이미지 캐시 관리 클래스
// ============================================
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loadFromStorage();
  }

  set(key, url) {
    const item = {
      url,
      timestamp: Date.now()
    };
    this.cache.set(key, item);
    this.saveToStorage();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // 캐시 만료 확인 (3시간)
    if (Date.now() - item.timestamp > CONFIG.CACHE_DURATION) {
      this.cache.delete(key);
      this.saveToStorage();
      return null;
    }

    return item.url;
  }

  loadFromStorage() {
    try {
      const data = localStorage.getItem('imageCache');
      if (data) {
        const parsed = JSON.parse(data);
        this.cache = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Failed to load cache:', e);
    }
  }

  saveToStorage() {
    try {
      const obj = Object.fromEntries(this.cache);
      localStorage.setItem('imageCache', JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save cache:', e);
    }
  }

  clear() {
    this.cache.clear();
    localStorage.removeItem('imageCache');
  }
}

// ============================================
// UI 관리 클래스
// ============================================
class UIManager {
  constructor(app) {
    this.app = app;
    this.initElements();
    this.initEventListeners();
  }

  initElements() {
    // Pages
    this.loginPage = document.getElementById('loginPage');
    this.mainApp = document.getElementById('mainApp');
    this.cheerPage = document.getElementById('cheerPage');
    this.profilePage = document.getElementById('profilePage');

    // Buttons
    this.kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
    this.createGroupBtn = document.getElementById('createGroupBtn');
    this.joinGroupBtn = document.getElementById('joinGroupBtn');
    this.startTrackingBtn = document.getElementById('startTrackingBtn');
    this.updateNameBtn = document.getElementById('updateNameBtn');
    this.leaveGroupBtn = document.getElementById('leaveGroupBtn');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.deleteAccountBtn = document.getElementById('deleteAccountBtn');
    this.faqBtn = document.getElementById('faqBtn');
    this.qnaBtn = document.getElementById('qnaBtn');
    this.privacyBtn = document.getElementById('privacyBtn');

    // Containers
    this.noGroupMessage = document.getElementById('noGroupMessage');
    this.groupInfo = document.getElementById('groupInfo');
    this.runnersList = document.getElementById('runnersList');
    this.runnersSection = document.getElementById('runnersSection');
    this.mapSection = document.getElementById('mapSection');
    this.resultsSection = document.getElementById('resultsSection');
  }

  initEventListeners() {
    // 로그인
    this.kakaoLoginBtn.addEventListener('click', () => this.app.handleLogin());
    
    // 그룹
    this.createGroupBtn.addEventListener('click', async () => {
      try {
        // 그룹 생성 완전 차단
        Utils.showToast('그룹 생성이 마감되었습니다.', 'error');
        // 버튼 숨기기
        this.createGroupBtn.style.display = 'none';
        return;
      } catch (error) {
        console.error('권한 체크 오류:', error);
        Utils.showToast('권한 확인 중 오류가 발생했습니다.', 'error');
      }
    });
    this.joinGroupBtn.addEventListener('click', () => this.showModal('joinGroupModal'));
    document.getElementById('confirmCreateGroupBtn').addEventListener('click', () => this.app.handleCreateGroup());
    document.getElementById('confirmJoinGroupBtn').addEventListener('click', () => this.app.handleJoinGroup());

    // 주자 등록
    document.getElementById('confirmRegisterRunnerBtn').addEventListener('click', () => this.app.handleRegisterRunner());

    // 프로필
    this.updateNameBtn.addEventListener('click', () => this.app.handleUpdateName());
    this.leaveGroupBtn.addEventListener('click', () => this.app.handleLeaveGroup());
    this.logoutBtn.addEventListener('click', () => this.app.handleLogout());
    this.deleteAccountBtn.addEventListener('click', () => this.app.handleDeleteAccount());
    this.faqBtn.addEventListener('click', () => this.showModal('faqModal'));
    this.qnaBtn.addEventListener('click', () => this.showModal('faqModal'));
    this.privacyBtn.addEventListener('click', () => this.showModal('privacyModal'));

    // 탭 네비게이션
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // 추적 시작/중지
    this.startTrackingBtn.addEventListener('click', () => {
      if (this.app.trackingTimer) {
        // 추적 중지
        this.app.stopTracking();
      } else {
        // 추적 시작
        this.app.handleStartTracking();
      }
    });

    // 이미지 뷰어 모달 닫기
    const imageViewerModal = document.getElementById('imageViewerModal');
    if (imageViewerModal) {
      imageViewerModal.addEventListener('click', () => {
        this.hideImageViewer();
      });
    }
  }

  showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
  }

  switchTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // 페이지 전환
    if (tabName === 'cheer') {
      this.cheerPage.classList.add('active');
      this.profilePage.classList.remove('active');
    } else if (tabName === 'profile') {
      this.cheerPage.classList.remove('active');
      this.profilePage.classList.add('active');
    }
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  handleShare(groupCode = null) {
    const url = 'https://livetrack-theta.vercel.app/';
    let text = 'RunCheer - 함께 응원하며 마라톤을 완주해요! 🏃‍♂️💨';
    
    // 그룹 코드가 있으면 텍스트에 추가
    if (groupCode) {
      text += `\n\n참가코드: ${groupCode}`;
    }
    
    // Web Share API 사용 (모바일에서 카카오톡 포함 앱 목록 표시)
    if (navigator.share) {
      navigator.share({
        title: 'RunCheer',
        text: text,
        url: url
      }).catch((error) => {
        // 취소한 경우 무시
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          this.fallbackShare(url);
        }
      });
    } else {
      // Web Share API 미지원 시 클립보드 복사
      this.fallbackShare(url);
    }
  }

  fallbackShare(url) {
    // 클립보드에 복사
    navigator.clipboard.writeText(url).then(() => {
      Utils.showToast('링크가 클립보드에 복사되었습니다!', 'success');
    }).catch(() => {
      // 클립보드 복사 실패 시 텍스트로 표시
      Utils.showToast(`링크: ${url}`, 'success');
    });
  }

  updateGroupInfo(group) {
    if (group) {
      this.noGroupMessage.classList.add('hidden');
      this.groupInfo.classList.remove('hidden');
      this.runnersSection.classList.remove('hidden');
      
      document.getElementById('groupName').textContent = group.name;
      document.getElementById('groupCode').innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin:8px 0;">
          <div style="font-size:24px;font-weight:700;color:#3b82f6;font-family:monospace;letter-spacing:2px;">
            ${group.code}
          </div>
          <button id="shareGroupBtn" class="btn-small secondary" style="padding:4px 12px;font-size:11px;">
            📤 공유
          </button>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">이 코드를 주자들에게 공유해주세요</div>
      `;
      
      // 이벤트 이름과 그룹장 정보 표시
      const eventInfo = this.getEventName(group.event_id);
      const leaderInfo = group.creator_name ? ` • 그룹장: ${group.creator_name}` : '';
      let eventInfoHTML = eventInfo + leaderInfo;
      
      // D-Day 표시
      const dday = this.getDDay(group.event_id);
      if (dday !== null) {
        if (dday === 0) {
          eventInfoHTML += '<br><span style="color:#ef4444;font-weight:700;font-size:13px;margin-top:4px;display:inline-block;">🔴 대회 당일입니다</span>';
        } else if (dday > 0) {
          eventInfoHTML += `<br><span style="color:#3b82f6;font-weight:700;font-size:13px;margin-top:4px;display:inline-block;">📅 D-${dday}</span>`;
        } else if (dday < 0) {
          eventInfoHTML += `<br><span style="color:#94a3b8;font-weight:700;font-size:13px;margin-top:4px;display:inline-block;">🏁 대회 종료 (D+${Math.abs(dday)})</span>`;
        }
      }
      
      document.getElementById('groupEvent').innerHTML = eventInfoHTML;
      
      // 공유 버튼 이벤트 리스너 추가
      setTimeout(() => {
        const shareBtn = document.getElementById('shareGroupBtn');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => this.handleShare(group.code));
        }
      }, 0);
      
      // 지도와 결과 섹션 표시
      this.mapSection.classList.remove('hidden');
      this.resultsSection.classList.remove('hidden');
      
      // 지도 초기화 (그룹에 가입하면 자동으로 표시)
      setTimeout(() => {
        this.app.initializeMapForGroup(group.event_id);
      }, 1000);
    } else {
      this.noGroupMessage.classList.remove('hidden');
      this.groupInfo.classList.add('hidden');
      this.runnersSection.classList.add('hidden');
      this.mapSection.classList.add('hidden');
      this.resultsSection.classList.add('hidden');
    }
  }

  updateRunnersList(runners) {
    this.runnersList.innerHTML = '';
    
    // 주자와 응원 분리
    const runnerList = runners.filter(r => r.role === 'runner');
    const supporterList = runners.filter(r => r.role === 'supporter');
    
    // 현재 그룹의 event_id 가져오기
    const currentGroup = this.app.groupManager.currentGroup;
    const eventId = currentGroup ? currentGroup.event_id : 133; // 기본값 JTBC
    
    // 주자 목록
    if (runnerList.length > 0) {
      const runnerHeader = document.createElement('div');
      runnerHeader.style.cssText = 'font-weight:700;font-size:13px;color:#1e293b;margin-bottom:4px;padding:0 4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;';
      runnerHeader.innerHTML = `
        <span>🏃‍♂️ 주자 (${runnerList.length}명)</span>
        <span class="toggle-icon" id="runnerToggle">▼</span>
      `;
      this.runnersList.appendChild(runnerHeader);
      
      // 안내 문구 추가
      const runnerNotice = document.createElement('div');
      runnerNotice.style.cssText = 'font-size:10px;color:#94a3b8;margin-bottom:8px;padding:0 4px;';
      runnerNotice.textContent = '※ 10km 주자는 지원하지 않습니다, 주자는 스마트폰이 필요하지 않습니다';
      this.runnersList.appendChild(runnerNotice);
      
      const runnerContainer = document.createElement('div');
      runnerContainer.id = 'runnerContainer';
      
      runnerList.forEach(runner => {
        const card = document.createElement('div');
        card.className = 'runner-card';
        
        // 프로필 이미지 (카카오)
        const profileImage = runner.profile_image || '/RunCheer.png';
        
        // 레디샷 이미지 (대회 번호로 버전 관리)
        let readyShotImage = runner.photo_url || '/RunCheer.png';
        if (runner.photo_url && runner.photo_url !== '/RunCheer.png') {
          // URL에 event_id를 쿼리 파라미터로 추가하여 대회별 캐싱
          const separator = runner.photo_url.includes('?') ? '&' : '?';
          readyShotImage = `${runner.photo_url}${separator}v=${eventId}`;
        }
        
        // 현재 로그인한 사용자인지 확인
        const currentUser = this.app.authManager.getUser();
        console.log('Runner object:', runner);
        console.log('Current user ID:', currentUser?.id);
        const isMyRunner = currentUser && String(runner.kakao_id) === String(currentUser.id);
        
        card.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center;">
            <img src="${profileImage}" alt="${runner.name} 프로필" class="runner-photo" data-full-image="${profileImage}" style="cursor:pointer;" loading="lazy" />
            <img src="${readyShotImage}" alt="${runner.name} 레디샷" class="runner-photo" data-full-image="${readyShotImage}" style="cursor:pointer;" loading="lazy" />
          </div>
          <div class="runner-info">
            <div class="runner-name">${runner.name}</div>
            <div class="runner-bib">배번: ${runner.bib}${runner.team_name ? ` (${runner.team_name})` : ''}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">프로필 / 레디샷</div>
            ${isMyRunner ? `<button class="btn-small secondary" style="margin-top:8px;padding:4px 8px;font-size:11px;" data-bib="${runner.bib}">📸 레디샷 변경</button>` : ''}
          </div>
        `;
        
        // 이미지 클릭 이벤트
        const images = card.querySelectorAll('.runner-photo');
        images.forEach(img => {
          img.addEventListener('click', () => {
            this.showImageViewer(img.dataset.fullImage);
          });
        });
        
        // 레디샷 변경 버튼 클릭 이벤트 (본인인 경우만 버튼이 있음)
        if (isMyRunner) {
          const changePhotoBtn = card.querySelector('button[data-bib]');
          changePhotoBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.app.handleChangeReadyShot(runner.bib);
          });
        }
        
        runnerContainer.appendChild(card);
      });
      
      this.runnersList.appendChild(runnerContainer);
      
      // 주자 목록 토글 이벤트
      runnerHeader.addEventListener('click', () => {
        const icon = document.getElementById('runnerToggle');
        if (runnerContainer.style.display === 'none') {
          runnerContainer.style.display = 'block';
          icon.classList.remove('collapsed');
        } else {
          runnerContainer.style.display = 'none';
          icon.classList.add('collapsed');
        }
      });
    }
    
    // 응원 목록
    if (supporterList.length > 0) {
      const supporterHeader = document.createElement('div');
      supporterHeader.style.cssText = 'font-weight:700;font-size:13px;color:#1e293b;margin:16px 0 8px 0;padding:0 4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;';
      supporterHeader.innerHTML = `
        <span>📣 응원 (${supporterList.length}명)</span>
        <span class="toggle-icon" id="supporterToggle">▼</span>
      `;
      this.runnersList.appendChild(supporterHeader);
      
      const supporterContainer = document.createElement('div');
      supporterContainer.id = 'supporterContainer';
      
      supporterList.forEach(supporter => {
        const card = document.createElement('div');
        card.className = 'runner-card';
        card.style.background = '#f8fafc';
        
        // 프로필 이미지만 (카카오)
        const profileImage = supporter.profile_image || '/RunCheer.png';
        
        card.innerHTML = `
          <div style="display:flex;gap:8px;align-items:center;">
            <img src="${profileImage}" alt="${supporter.name} 프로필" class="runner-photo" data-full-image="${profileImage}" style="cursor:pointer;" loading="lazy" />
          </div>
          <div class="runner-info">
            <div class="runner-name">${supporter.name}</div>
            <div class="runner-bib" style="color:#64748b;">응원</div>
          </div>
        `;
        
        // 이미지 클릭 이벤트
        const img = card.querySelector('.runner-photo');
        img.addEventListener('click', () => {
          this.showImageViewer(img.dataset.fullImage);
        });
        
        supporterContainer.appendChild(card);
      });
      
      this.runnersList.appendChild(supporterContainer);
      
      // 응원 목록 토글 이벤트
      supporterHeader.addEventListener('click', () => {
        const icon = document.getElementById('supporterToggle');
        if (supporterContainer.style.display === 'none') {
          supporterContainer.style.display = 'block';
          icon.classList.remove('collapsed');
        } else {
          supporterContainer.style.display = 'none';
          icon.classList.add('collapsed');
        }
      });
    }
    
    // 멤버가 없는 경우
    if (runners.length === 0) {
      this.runnersList.innerHTML = '<div class="muted" style="text-align:center;padding:20px;">아직 등록된 멤버가 없습니다.</div>';
    }
  }

  showImageViewer(imageUrl) {
    const modal = document.getElementById('imageViewerModal');
    const img = document.getElementById('imageViewerImg');
    
    if (modal && img) {
      img.src = imageUrl;
      modal.classList.add('active');
    }
  }

  hideImageViewer() {
    const modal = document.getElementById('imageViewerModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  updateMyGroupInfo(group, isLeader) {
    console.log('=== updateMyGroupInfo 호출 ===');
    console.log('Group:', group);
    console.log('isLeader:', isLeader);
    
    const container = document.getElementById('myGroupInfo');
    if (group) {
      const leaderBadge = isLeader ? '<span style="background:#22c55e;color:white;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:8px;font-weight:600">👑 그룹장</span>' : '';
      
      container.innerHTML = `
        <div class="group-card">
          <div class="group-header">
            <div class="group-name">${group.name}${leaderBadge}</div>
          </div>
          <div style="text-align:center;margin:12px 0;">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;">
              <div style="font-size:28px;font-weight:700;color:#3b82f6;font-family:monospace;letter-spacing:3px;">
                ${group.code}
              </div>
              <button id="shareGroupBtnProfile" class="btn-small secondary" style="padding:4px 12px;font-size:11px;">
                📤 공유
              </button>
            </div>
            <div style="font-size:11px;color:#94a3b8;">이 코드를 주자들에게 공유해주세요</div>
          </div>
          <div class="muted" style="font-size:12px;text-align:center;">
            ${this.getEventName(group.event_id)}
            ${group.creator_name ? ` • 그룹장: ${group.creator_name}` : ''}
          </div>
        </div>
      `;
      
      // 공유 버튼 이벤트 리스너 추가
      setTimeout(() => {
        const shareBtn = document.getElementById('shareGroupBtnProfile');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => this.handleShare(group.code));
        }
      }, 0);
      
      // 그룹장이면 "그룹 삭제" 버튼, 멤버면 "그룹 탈퇴" 버튼
      this.leaveGroupBtn.textContent = isLeader ? '그룹 삭제' : '그룹 탈퇴';
      this.leaveGroupBtn.classList.remove('hidden');
      
      console.log('버튼 텍스트:', this.leaveGroupBtn.textContent);
      
      // 버튼 스타일 변경 (그룹장은 danger)
      if (isLeader) {
        this.leaveGroupBtn.classList.add('danger');
        this.leaveGroupBtn.classList.remove('secondary');
      } else {
        this.leaveGroupBtn.classList.add('secondary');
        this.leaveGroupBtn.classList.remove('danger');
      }
    } else {
      container.innerHTML = '<p class="muted text-center">가입된 그룹이 없습니다.</p>';
      this.leaveGroupBtn.classList.add('hidden');
    }
  }

  getEventName(eventId) {
    // eventId를 정수로 변환
    const id = parseInt(eventId, 10);
    const events = {
      133: '2025 JTBC 서울마라톤',
      132: '2025 춘천마라톤'
    };
    return events[id] || '알 수 없는 대회';
  }

  getEventDate(eventId) {
    const id = parseInt(eventId, 10);
    const eventDates = {
      133: '2025-11-02',
      132: '2025-10-26'
    };
    return eventDates[id] || null;
  }

  isEventToday(eventId) {
    const eventDate = this.getEventDate(eventId);
    if (!eventDate) return false;
    
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                     String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(today.getDate()).padStart(2, '0');
    
    return eventDate === todayStr;
  }

  getDDay(eventId) {
    const eventDate = this.getEventDate(eventId);
    if (!eventDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [year, month, day] = eventDate.split('-').map(Number);
    const event = new Date(year, month - 1, day);
    event.setHours(0, 0, 0, 0);
    
    const diffTime = event - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

// ============================================
// 메인 애플리케이션 클래스
// ============================================
class RunCheerApp {
  constructor() {
    this.authManager = new AuthManager();
    this.groupManager = new GroupManager();
    this.imageCache = new ImageCache();
    this.ui = new UIManager(this);
    this.pendingGroup = null; // 주자 등록 대기 중인 그룹
    this.currentMap = null; // 네이버 지도 인스턴스
    this.mapMarkers = []; // 지도 마커 배열
    this.gpxPoints = []; // GPX 경로 포인트
    this.coursePath = null; // 코스 경로 Polyline
    this.checkpointMarkers = []; // 체크포인트 마커 배열
    this.trackingBibs = []; // 추적 중인 배번 목록
    this.trackingEventId = null; // 추적 중인 이벤트 ID
    this.trackingTimer = null; // 180초 갱신 타이머
    this.mapUpdateTimer = null; // 15초 마커 업데이트 타이머
    this.countdownTimer = null; // 카운트다운 타이머
    this.remainingSeconds = 180; // 남은 시간(초)
    
    this.init();
  }

  async init() {
    // 페이지 로드 시 인가 코드 처리
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    // redirect로 돌아온 경우 로딩 페이지 표시
    if (code) {
      this.ui.showPage('loadingPage');
    }
    
    const user = await this.authManager.handleRedirect();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      await this.onLoginSuccess();
      return;
    }

    // 로그인 상태 확인
    this.checkLoginStatus();
  }

  async checkLoginStatus() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.authManager.user = user;
        
        // 서버에서 사용자 존재 확인 (회원탈퇴 체크)
        try {
          await APIService.getUser(user.id);
          console.log('User verified in server');
          await this.onLoginSuccess();
        } catch (error) {
          console.error('User verification failed:', error);
          // 사용자가 서버에 없음 (회원탈퇴됨 또는 DB 오류)
          // 500 에러인 경우 서버 문제일 수 있으므로 일단 진행
          if (error.message && error.message.includes('500')) {
            console.warn('Server error, but continuing with cached user');
            await this.onLoginSuccess();
          } else {
            console.warn('User not found in server, clearing local data');
            localStorage.removeItem('user');
            this.authManager.logout();
            this.imageCache.clear();
            Utils.showToast('다시 로그인해주세요.', 'info');
            this.showLoginPage();
          }
        }
      } catch (e) {
        console.error('Invalid user data:', e);
        localStorage.removeItem('user');
        this.showLoginPage();
      }
    } else {
      this.showLoginPage();
    }
  }

  showLoginPage() {
    this.ui.showPage('loginPage');
  }

  async handleLogin() {
    try {
      // 로딩 페이지 표시
      this.ui.showPage('loadingPage');
      
      // authorize는 페이지를 리다이렉트하므로 아래 코드는 실행되지 않음
      await this.authManager.login();
    } catch (error) {
      console.error('Login failed:', error);
      Utils.showToast('로그인에 실패했습니다.', 'error');
      // 에러 시 다시 로그인 페이지로
      this.showLoginPage();
    }
  }

  async onLoginSuccess() {
    this.ui.showPage('mainApp');
    
    // 응원 탭을 기본으로 활성화
    this.ui.switchTab('cheer');
    
    // DB에서 사용자 정보 로드 (최신 정보)
    const user = this.authManager.getUser();
    console.log('onLoginSuccess - user:', user);
    
    try {
      // DB에서 최신 사용자 정보 가져오기
      const dbUser = await APIService.getUser(user.id);
      
      // DB에 저장된 이름 사용
      const nickname = dbUser.name || '사용자';
      const profileImage = dbUser.profile_image || '';
      
      document.getElementById('profileName').value = nickname;
      
      // 프로필 이미지 설정
      const profileImageEl = document.getElementById('profileImage');
      if (profileImageEl && profileImage) {
        profileImageEl.src = profileImage;
        profileImageEl.style.display = 'block';
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
      // DB 조회 실패 시 카카오 정보 사용
      const nickname = user.properties?.nickname 
        || user.kakao_account?.profile?.nickname 
        || user.name 
        || '사용자';
      
      const profileImage = user.properties?.profile_image 
        || user.kakao_account?.profile?.profile_image_url 
        || user.profile_image
        || '';
      
      document.getElementById('profileName').value = nickname;
      
      const profileImageEl = document.getElementById('profileImage');
      if (profileImageEl && profileImage) {
        profileImageEl.src = profileImage;
        profileImageEl.style.display = 'block';
      }
    }
    
    // 그룹 정보 로드
    await this.loadUserGroup();
    
    // 그룹 개수 업데이트
    await this.updateGroupCount();
  }

  async loadUserGroup() {
    try {
      const user = this.authManager.getUser();
      const group = await APIService.getUserGroup(user.id);
      
      if (group) {
        this.groupManager.currentGroup = group;
        
        // 그룹장 여부 확인 (타입 변환 후 비교)
        const userId = String(user.id);
        const creatorId = String(group.creator_kakao_id);
        const isLeader = userId === creatorId;
        
        console.log('=== 그룹장 판별 ===');
        console.log('User ID:', user.id, '(type:', typeof user.id, ')');
        console.log('Creator Kakao ID:', group.creator_kakao_id, '(type:', typeof group.creator_kakao_id, ')');
        console.log('User ID (String):', userId);
        console.log('Creator ID (String):', creatorId);
        console.log('Is Leader:', isLeader);
        
        this.ui.updateGroupInfo(group);
        this.ui.updateMyGroupInfo(group, isLeader);
        await this.loadGroupRunners();
      }
    } catch (error) {
      // 404는 그룹이 없는 정상 상태
      if (error.message.includes('404')) {
        console.log('No group joined yet');
        this.ui.updateGroupInfo(null);
        this.ui.updateMyGroupInfo(null, false);
      } else {
        // 다른 에러는 로그만 출력
        console.error('Failed to load group:', error);
        this.ui.updateGroupInfo(null);
        this.ui.updateMyGroupInfo(null, false);
      }
    }
    
    // 그룹 개수 업데이트
    await this.updateGroupCount();
  }

  async updateGroupCount() {
    try {
      const count = await APIService.getGroupCount();
      const displayEl = document.getElementById('groupCountDisplay');
      if (displayEl) {
        displayEl.textContent = count;
      }
      
      // 그룹 생성 버튼 숨기기
      const createGroupBtn = document.getElementById('createGroupBtn');
      if (createGroupBtn) {
        createGroupBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('Failed to load group count:', error);
    }
  }

  async handleCreateGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    const eventId = document.getElementById('newGroupEvent').value;
    
    if (!name || !eventId) {
      Utils.showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }
    
    // 그룹 정보를 임시 저장 (아직 생성하지 않음)
    this.pendingGroup = { name, eventId };
    
    this.ui.hideModal('createGroupModal');
    
    // 주자 정보 등록 모달의 설명 텍스트 변경
    const descriptionEl = document.getElementById('registerRunnerDescription');
    if (descriptionEl) {
      descriptionEl.textContent = '👑 그룹장의 주자 정보를 입력해주세요. (배번과 사진)';
    }
    
    // 주자 정보 등록 모달 표시
    this.ui.showModal('registerRunnerModal');
    Utils.showToast('👑 그룹장의 주자 정보를 입력하면 그룹이 생성됩니다.', 'info');
  }

  async handleJoinGroup() {
    const code = document.getElementById('joinGroupCode').value.trim().toUpperCase();
    
    if (!code || code.length !== 4) {
      Utils.showToast('올바른 그룹 코드를 입력해주세요.', 'error');
      return;
    }
    
    const btn = document.getElementById('confirmJoinGroupBtn');
    const originalText = Utils.showLoading(btn);
    
    try {
      // 그룹 정보 확인
      const group = await APIService.getGroup(code);
      
      // pendingGroup에 그룹 코드 저장 (주자 등록 시 이미지 업로드에 사용)
      this.pendingGroup = {
        code: group.code,
        name: group.name,
        eventId: group.event_id
      };
      
      Utils.showToast('그룹을 찾았습니다!', 'success');
      this.ui.hideModal('joinGroupModal');
      
      // 주자 정보 등록 모달의 설명 텍스트 변경
      const descriptionEl = document.getElementById('registerRunnerDescription');
      if (descriptionEl) {
        descriptionEl.textContent = '그룹 참여를 위해 역할을 선택하고 정보를 등록해주세요.';
      }
      
      // 주자 정보 등록 모달 표시
      this.ui.showModal('registerRunnerModal');
      
    } catch (error) {
      console.error('Failed to join group:', error);
      Utils.showToast('그룹을 찾을 수 없습니다.', 'error');
    } finally {
      Utils.hideLoading(btn, originalText);
    }
  }

  async handleRegisterRunner() {
    const role = document.querySelector('input[name="memberRole"]:checked').value;
    const bib = document.getElementById('runnerBib').value.trim();
    const imagePreview = document.getElementById('imagePreview');
    
    // 주자인 경우 배번과 사진 필수 - 전역 변수에 저장된 파일 또는 미리보기 확인
    const hasImage = selectedPhotoFile !== null || !imagePreview.classList.contains('hidden');
    if (role === 'runner' && (!bib || !hasImage)) {
      Utils.showToast('배번과 사진을 모두 입력해주세요.', 'error');
      return;
    }
    
    const btn = document.getElementById('confirmRegisterRunnerBtn');
    const originalText = Utils.showLoading(btn);
    
    try {
      const user = this.authManager.getUser();
      let photoUrl = null;
      
      // pendingGroup이 있으면 그룹 생성부터 시작
      if (this.pendingGroup && !this.pendingGroup.code) {
        // 그룹 코드 생성
        let code;
        let attempts = 0;
        const MAX_ATTEMPTS = 10;
        
        while (attempts < MAX_ATTEMPTS) {
          code = Utils.generateGroupCode();
          try {
            await APIService.getGroup(code);
            attempts++;
          } catch (e) {
            // 그룹이 없으면 사용 가능
            break;
          }
        }
        
        if (attempts >= MAX_ATTEMPTS) {
          throw new Error('그룹 코드 생성에 실패했습니다.');
        }
        
        // 주자인 경우에만 이미지 업로드
        if (role === 'runner') {
          const file = selectedPhotoFile; // 전역 변수에서 가져오기
          const compressedBlob = await Utils.compressImage(file);
          const imageResult = await APIService.uploadImage(compressedBlob, code, user.id);
          photoUrl = imageResult.url;
        }
        
        // 그룹 + 멤버를 한 번에 생성
        const groupData = {
          code,
          name: this.pendingGroup.name,
          eventId: parseInt(this.pendingGroup.eventId, 10),
          creatorKakaoId: user.id,
          role,
          bib: role === 'runner' ? bib : null,
          photoUrl: role === 'runner' ? photoUrl : null
        };
        
        const group = await APIService.createGroupWithMember(groupData);
        this.groupManager.currentGroup = group;
        this.pendingGroup = null;
        
        Utils.showToast(`그룹이 생성되었습니다! 코드: ${group.code}`, 'success');
      } else {
        // 기존 그룹에 멤버 등록
        const groupCode = this.pendingGroup.code;
        
        if (role === 'runner') {
          // 주자인 경우 이미지 업로드
          const file = selectedPhotoFile; // 전역 변수에서 가져오기
          const compressedBlob = await Utils.compressImage(file);
          const imageResult = await APIService.uploadImage(compressedBlob, groupCode, user.id);
          photoUrl = imageResult.url;
        }
        
        // 그룹 참여 API 호출
        const joinData = {
          code: groupCode,
          kakaoId: user.id,
          name: user.properties.nickname,
          role,
          bib: role === 'runner' ? bib : null,
          photoUrl: role === 'runner' ? photoUrl : null
        };
        
        await APIService.joinGroup(joinData);
        this.pendingGroup = null;
        Utils.showToast(role === 'runner' ? '주자로 그룹에 참여했습니다!' : '응원으로 그룹에 참여했습니다!', 'success');
      }
      
      this.ui.hideModal('registerRunnerModal');
      
      // 입력 필드 초기화
      document.getElementById('runnerBib').value = '';
      document.getElementById('runnerPhoto').value = '';
      document.getElementById('runnerRole').checked = true;
      
      // 이미지 미리보기 초기화
      const preview = document.getElementById('imagePreview');
      const placeholder = document.getElementById('uploadPlaceholder');
      const uploadArea = document.getElementById('imageUploadArea');
      preview.src = '';
      preview.classList.add('hidden');
      placeholder.classList.remove('hidden');
      uploadArea.classList.remove('has-image');
      
      // 전역 파일 변수 초기화
      selectedPhotoFile = null;
      
      handleRoleChange();
      
      // UI 업데이트
      await this.loadUserGroup();
      
      // 그룹 개수 업데이트
      await this.updateGroupCount();
      
    } catch (error) {
      console.error('Failed to register runner:', error);
      Utils.showToast(error.message || '등록에 실패했습니다.', 'error');
    } finally {
      Utils.hideLoading(btn, originalText);
    }
  }

  async handleCancelRegisterRunner() {
    // pendingGroup 초기화만 (DB 작업 없음)
    if (this.pendingGroup) {
      this.pendingGroup = null;
      Utils.showToast('그룹 생성이 취소되었습니다.', 'info');
    }
    
    // 입력 필드 초기화
    document.getElementById('runnerBib').value = '';
    document.getElementById('runnerPhoto').value = '';
    
    this.ui.hideModal('registerRunnerModal');
  }

  async loadGroupRunners() {
    try {
      const runners = await this.groupManager.getRunners();
      this.ui.updateRunnersList(runners);
    } catch (error) {
      console.error('Failed to load runners:', error);
    }
  }

  async handleUpdateName() {
    const name = document.getElementById('profileName').value.trim();
    
    if (!name) {
      Utils.showToast('이름을 입력해주세요.', 'error');
      return;
    }
    
    // 한글과 영어만 허용 (공백 포함)
    const namePattern = /^[a-zA-Z가-힣\s]+$/;
    if (!namePattern.test(name)) {
      Utils.showToast('이름은 한글과 영어만 입력 가능합니다.', 'error');
      return;
    }
    
    if (name.length > 50) {
      Utils.showToast('이름은 50자 이내로 입력해주세요.', 'error');
      return;
    }
    
    const btn = this.ui.updateNameBtn;
    const originalText = Utils.showLoading(btn);
    
    try {
      const user = this.authManager.getUser();
      await APIService.updateUserName(user.id, name);
      
      Utils.showToast('이름이 변경되었습니다.', 'success');
    } catch (error) {
      console.error('Failed to update name:', error);
      Utils.showToast('이름 변경에 실패했습니다.', 'error');
    } finally {
      Utils.hideLoading(btn, originalText);
    }
  }

  async handleLeaveGroup() {
    const group = this.groupManager.currentGroup;
    if (!group) return;
    
    const user = this.authManager.getUser();
    // 타입 불일치 방지: 둘 다 문자열로 변환하여 비교
    const isLeader = String(group.creator_kakao_id) === String(user.id);
    
    console.log('=== handleLeaveGroup 시작 ===');
    console.log('현재 그룹:', group);
    console.log('현재 사용자:', user);
    console.log('creator_kakao_id:', group.creator_kakao_id, typeof group.creator_kakao_id);
    console.log('user.id:', user.id, typeof user.id);
    console.log('isLeader:', isLeader);
    
    if (isLeader) {
      // 그룹장: 그룹 삭제
      if (!confirm('👑 그룹장 권한으로 그룹을 삭제하시겠습니까?\n\n⚠️ 모든 멤버가 그룹에서 제외되며, 그룹 데이터가 완전히 삭제됩니다.')) {
        console.log('그룹 삭제 취소됨');
        return;
      }
      
      try {
        console.log('=== 그룹 삭제 시작 ===');
        console.log('그룹 정보:', {
          code: group.code,
          name: group.name,
          creator_kakao_id: group.creator_kakao_id,
          user_id: user.id
        });
        console.log('API 호출 전...');
        
        const result = await APIService.deleteGroup(group.code);
        
        console.log('=== 그룹 삭제 완료 ===');
        console.log('삭제 결과:', result);
        
        this.groupManager.currentGroup = null;
        Utils.showToast('✅ 그룹이 삭제되었습니다.', 'success');
        this.ui.updateGroupInfo(null);
        this.ui.updateMyGroupInfo(null, false);
        this.ui.updateRunnersList([]); // 주자 목록 초기화
        
        // 페이지 새로고침으로 상태 완전 초기화
        console.log('1초 후 페이지 새로고침...');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('=== 그룹 삭제 실패 ===');
        console.error('에러 상세:', error);
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
        Utils.showToast('❌ 그룹 삭제에 실패했습니다: ' + error.message, 'error');
      }
    } else {
      // 멤버: 그룹 탈퇴
      if (!confirm('정말 그룹을 탈퇴하시겠습니까?')) return;
      
      try {
        await this.groupManager.leaveGroup(user.id);
        
        Utils.showToast('그룹에서 탈퇴했습니다.', 'success');
        this.ui.updateGroupInfo(null);
        this.ui.updateMyGroupInfo(null, false);
        this.ui.updateRunnersList([]); // 주자 목록 초기화
        
        // 그룹 개수 업데이트
        await this.updateGroupCount();
      } catch (error) {
        console.error('Failed to leave group:', error);
        Utils.showToast('그룹 탈퇴에 실패했습니다.', 'error');
      }
    }
  }

  handleLogout() {
    if (!confirm('로그아웃하시겠습니까?')) return;
    
    this.authManager.logout();
    localStorage.removeItem('user');
    this.showLoginPage();
  }

  async handleChangeReadyShot(bib) {
    // 파일 선택 input 생성
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // 파일 크기 체크 (5MB)
      if (file.size > CONFIG.IMAGE_MAX_SIZE) {
        Utils.showToast('이미지 크기는 5MB 이하여야 합니다.', 'error');
        return;
      }
      
      try {
        // 로딩 표시
        const statusEl = document.getElementById('status');
        if (statusEl) {
          statusEl.textContent = '레디샷 업로드 중...';
        }
        
        // 이미지 압축
        const compressedBlob = await Utils.compressImage(file);
        
        // 그룹 정보 확인
        const group = this.groupManager.currentGroup;
        if (!group) {
          throw new Error('그룹 정보를 찾을 수 없습니다.');
        }
        
        const user = this.authManager.getUser();
        if (!user) {
          throw new Error('로그인 정보를 찾을 수 없습니다.');
        }
        
        // API를 통해 이미지 업로드 및 DB 업데이트
        const result = await APIService.uploadImage(compressedBlob, group.code, user.id);
        
        // 업로드된 이미지 URL로 photo_url 업데이트
        const updateData = {
          groupCode: group.code,
          kakaoId: user.id,
          bib: bib,
          photoUrl: result.url
        };
        
        await APIService.request('/groups/update-photo', {
          method: 'POST',
          body: JSON.stringify(updateData)
        });
        
        Utils.showToast('레디샷이 변경되었습니다!', 'success');
        
        // 주자 목록 새로고침
        await this.loadUserGroup();
        
      } catch (error) {
        console.error('Failed to change ready shot:', error);
        Utils.showToast('레디샷 변경에 실패했습니다.', 'error');
      }
    };
    
    input.click();
  }

  async handleDeleteAccount() {
    if (!confirm('정말 회원탈퇴하시겠습니까? 모든 데이터가 삭제되며 카카오 연동도 해제됩니다.')) return;
    
    try {
      const user = this.authManager.getUser();
      
      // 1. 카카오 연결 끊기 (다음 로그인 시 다시 동의 받기 위함)
      if (window.Kakao && Kakao.API) {
        try {
          await new Promise((resolve, reject) => {
            Kakao.API.request({
              url: '/v1/user/unlink',
              success: function(response) {
                console.log('Kakao unlink success:', response);
                resolve(response);
              },
              fail: function(error) {
                console.log('Kakao unlink failed:', error);
                resolve(); // 실패해도 계속 진행
              }
            });
          });
        } catch (e) {
          console.log('Kakao unlink error:', e);
        }
      }
      
      // 2. 카카오 로그아웃
      if (window.Kakao && Kakao.Auth) {
        try {
          await Kakao.Auth.logout();
        } catch (e) {
          console.log('Kakao logout skipped:', e);
        }
      }
      
      // 3. 서버에서 사용자 삭제
      await APIService.deleteUser(user.id);
      
      // 4. 로컬 데이터 정리
      this.authManager.user = null;
      localStorage.clear();
      this.imageCache.clear();
      
      Utils.showToast('회원탈퇴가 완료되었습니다. 다음 로그인 시 다시 동의가 필요합니다.', 'success');
      
      // 5. 페이지 새로고침으로 완전히 초기화
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to delete account:', error);
      Utils.showToast('회원탈퇴에 실패했습니다.', 'error');
    }
  }

  async handleStartTracking() {
    const group = this.groupManager.currentGroup;
    if (!group) {
      console.error('그룹 정보를 불러올 수 없습니다.');
      return;
    }

    // L5E9 또는 3174 그룹은 언제든 추적 가능 (테스트 그룹)
    if (group.code !== 'L5E9' && group.code !== '3174') {
      // 2025년 11월 2일 오전 6시 이전에는 추적 불가
      const now = new Date();
      const raceStartDate = new Date('2025-11-02T06:00:00+09:00');
      
      if (now < raceStartDate) {
        alert('그룹 추적 시작은 JTBC 마라톤 당일 오전 6시부터 가능합니다.');
        return;
      }
    }

    console.log('Starting tracking for group:', group);
    console.log('Event ID:', group.event_id);

    // 지도 섹션 표시
    const mapSection = document.getElementById('mapSection');
    const resultsSection = document.getElementById('resultsSection');
    mapSection.classList.remove('hidden');
    resultsSection.classList.remove('hidden');
    
    // 주자 목록 가져오기
    try {
      const runners = await this.groupManager.getGroupRunners(group.code);
      
      console.log('Runners loaded:', runners);
      
      if (!runners || runners.length === 0) {
        console.log('등록된 주자가 없습니다.');
        return;
      }
      
      console.log(`${runners.length}명의 주자 추적을 시작합니다.`);
      
      // 주자 목록 캐싱 (마커 업데이트 시 재사용)
      this.cachedRunners = runners.reduce((acc, runner) => {
        if (runner.bib) {
          acc[runner.bib] = runner; // bib을 키로 저장
        }
        return acc;
      }, {});
      
      // 이미지 프리로드 (브라우저 캐시에 미리 저장)
      this.preloadImages(runners);
      
      // 주자 배번 목록 저장 (DB 필드명은 bib)
      this.trackingBibs = runners.map(r => r.bib).filter(b => b); // undefined 제거
      this.trackingEventId = group.event_id;
      this.trackingGroupCode = group.code; // 그룹 코드 저장
      
      console.log('Tracking bibs:', this.trackingBibs);
      console.log('Cached runners:', Object.keys(this.cachedRunners).length);
      
      // 지도 초기화
      setTimeout(() => {
        this.initializeTrackingMap(group.event_id, runners);
        // 첫 추적 시작
        this.startLiveTracking();
      }, 100);
      
    } catch (error) {
      console.error('Failed to start tracking:', error);
    }
  }

  async startLiveTracking() {
    if (!this.trackingEventId || !this.trackingBibs || this.trackingBibs.length === 0) {
      console.error('추적 정보가 없습니다.');
      return;
    }

    console.log('Starting live tracking for', this.trackingBibs.length, 'runners');

    // 버튼 업데이트
    const btn = document.getElementById('startTrackingBtn');
    if (btn) {
      btn.textContent = '⏸️ 그룹 추적 중지';
      btn.className = 'danger btn-small';
    }

    // 새로고침 인디케이터 표시
    this.startCountdown();

    // 첫 데이터 로드
    await this.updateTrackingData();

    // 180초마다 갱신 (Function 비용 절감)
    if (this.trackingTimer) {
      clearInterval(this.trackingTimer);
    }
    this.trackingTimer = setInterval(() => {
      this.updateTrackingData();
    }, 180000); // 180초

    // 15초마다 마커 위치 업데이트 (예상 위치, 클라이언트 작업만 - 비용 무관)
    if (this.mapUpdateTimer) {
      clearInterval(this.mapUpdateTimer);
    }
    this.mapUpdateTimer = setInterval(() => {
      this.updateAllMarkers();
    }, 15000); // 15초
  }

  async updateTrackingData() {
    if (!this.trackingEventId || !this.trackingBibs || this.trackingBibs.length === 0) return;

    console.log('Updating tracking data...');
    
    // 카운트다운 리셋 (180초)
    this.remainingSeconds = 180;
    this.updateCountdown();
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `데이터 갱신 중... (${new Date().toLocaleTimeString('ko-KR')})`;
    }
    
    // 정렬 정보 숨기기
    const sortInfoEl = document.getElementById('sortInfo');
    if (sortInfoEl) {
      sortInfoEl.style.display = 'none';
    }

    // 완주하지 않은 주자들만 필터링
    const activeRunners = [...this.trackingBibs].filter(bib => {
      const existingMarker = this.mapMarkers.find(m => m.bib === bib);
      if (existingMarker && existingMarker.playerData) {
        const estimated = this.estimateNow(existingMarker.playerData);
        if (estimated.status === '완주') {
          console.log(`✅ 완주한 주자 추적 중단: ${bib} (${existingMarker.playerData.name})`);
          return false;
        }
      }
      return true;
    });

    // 완주자 제거
    this.trackingBibs = activeRunners;

    if (activeRunners.length === 0) {
      console.log('🎉 모든 주자 완주! 추적 종료');
      if (statusEl) {
        statusEl.textContent = '모든 주자 완주! 🎉';
      }
      return;
    }

    try {
      // 🚀 배치 API로 한 번에 조회 (Function 호출 1회로 감소!)
      const bibsParam = activeRunners.join(',');
      const groupCodeParam = this.trackingGroupCode ? `&groupCode=${encodeURIComponent(this.trackingGroupCode)}` : '';
      const response = await fetch(`/api/proxy-batch?bibs=${encodeURIComponent(bibsParam)}&eventId=${this.trackingEventId}${groupCodeParam}`);
      
      if (!response.ok) {
        throw new Error(`Batch API failed: ${response.status}`);
      }

      const batchResult = await response.json();
      console.log(`📦 Batch API: ${batchResult.count}명 조회 완료 (Function 1회 실행)`);

      // 각 주자 데이터 처리
      for (const result of batchResult.results) {
        if (result.error) {
          console.error(`Failed to fetch player ${result.bib}:`, result.error);
          continue;
        }

        const playerData = result.data;
        
        // 10km 코스 주자는 추적 제외
        if (playerData.course && playerData.course.distance === '10km') {
          console.log(`⏭️ 10km 코스 주자 추적 제외: ${result.bib} (${playerData.name})`);
          this.trackingBibs = this.trackingBibs.filter(b => b !== result.bib);
          continue;
        }
        
        // 완주 여부 확인
        const estimated = this.estimateNow(playerData);
        if (estimated.status === '완주') {
          console.log(`✅ 완주 확인 - 추적 중단: ${result.bib} (${playerData.name})`);
          this.trackingBibs = this.trackingBibs.filter(b => b !== result.bib);
        }
        
        this.updatePlayerMarker(result.bib, playerData);
        console.log(`Updated player ${result.bib}:`, playerData.name);
      }
    } catch (error) {
      console.error('Batch update failed, falling back to individual requests:', error);
      
      // 배치 API 실패 시 기존 방식으로 폴백
      for (const bib of activeRunners) {
        try {
          const groupCodeParam = this.trackingGroupCode ? `&groupCode=${encodeURIComponent(this.trackingGroupCode)}` : '';
          const response = await fetch(`/api/proxy?path=${encodeURIComponent(`event/${this.trackingEventId}/player/${bib}`)}${groupCodeParam}`);
          if (response.ok) {
            const playerData = await response.json();
            
            // 10km 코스 주자는 추적 제외
            if (playerData.course && playerData.course.distance === '10km') {
              console.log(`⏭️ 10km 코스 주자 추적 제외: ${bib} (${playerData.name})`);
              this.trackingBibs = this.trackingBibs.filter(b => b !== bib);
              continue;
            }
            
            const estimated = this.estimateNow(playerData);
            if (estimated.status === '완주') {
              console.log(`✅ 완주 확인 - 추적 중단: ${bib} (${playerData.name})`);
              this.trackingBibs = this.trackingBibs.filter(b => b !== bib);
            }
            
            this.updatePlayerMarker(bib, playerData);
            console.log(`Updated player ${bib}:`, playerData.name);
          }
        } catch (error) {
          console.error(`Failed to fetch player ${bib}:`, error);
        }
      }
    }

    if (statusEl) {
      statusEl.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
    }
    
    // 정렬 정보 표시
    if (sortInfoEl) {
      sortInfoEl.style.display = 'block';
    }
    
    // 모든 마커를 겹침 감지하여 재배치
    this.updateAllMarkersWithOffset();
  }

  updatePlayerMarker(bib, playerData) {
    // 예상 위치 계산
    const estimated = this.estimateNow(playerData);
    
    // 테이블은 항상 업데이트 (records 없어도 '대기' 상태로 표시)
    this.updatePlayerTable(bib, playerData, estimated);
    
    // 마커는 위치 정보가 있을 때만 업데이트
    if (!this.currentMap || !this.gpxPoints || this.gpxPoints.length === 0) return;
    if (!estimated || estimated.estimated === 0) return;

    const pos = Utils.getPositionOnRoute(this.gpxPoints, estimated.estimated);
    if (!pos) return;

    // 기존 마커가 있으면 위치 업데이트, 없으면 생성
    const existingMarker = this.mapMarkers.find(m => m.bib === bib);
    
    if (existingMarker) {
      // 위치만 업데이트
      existingMarker.position = pos;
      existingMarker.playerData = playerData;
      existingMarker.estimated = estimated;
      // 실제 마커 배치는 updateAllMarkersWithOffset에서 일괄 처리
    } else {
      // 캐시된 주자 정보 가져오기 (사진 정보 포함)
      const cachedRunner = this.cachedRunners ? this.cachedRunners[bib] : null;
      
      this.mapMarkers.push({ 
        bib, 
        position: pos,
        playerData, 
        cachedRunner,
        estimated,
        dotMarker: null,
        labelMarker: null,
        line: null,
        infoWindow: null
      });
    }
  }

  // 모든 마커를 겹침 감지하여 재배치
  updateAllMarkersWithOffset() {
    const OVERLAP_THRESHOLD = 0.05; // 50m 이내를 겹침으로 판단 (km 단위)
    
    // 위치별로 그룹화
    const positionGroups = [];
    
    this.mapMarkers.forEach(marker => {
      if (!marker.position) return;
      
      // 기존 그룹에 속하는지 확인
      let foundGroup = positionGroups.find(group => {
        const groupPos = group[0].position;
        const distance = Utils.calcDistance(
          groupPos.lat(), groupPos.lng(),
          marker.position.lat(), marker.position.lng()
        );
        return distance < OVERLAP_THRESHOLD;
      });
      
      if (foundGroup) {
        foundGroup.push(marker);
      } else {
        positionGroups.push([marker]);
      }
    });
    
    // 각 그룹별로 마커 배치
    positionGroups.forEach(group => {
      const centerPos = group[0].position;
      const count = group.length;
      
      group.forEach((marker, index) => {
        // 기존 마커/선 제거
        if (marker.dotMarker) marker.dotMarker.setMap(null);
        if (marker.labelMarker) marker.labelMarker.setMap(null);
        if (marker.line) marker.line.setMap(null);
        
        // 1. 중심점에 작은 점 마커 생성
        if (index === 0) { // 첫 번째만 점 마커 생성
          // 완주 여부 확인
          const isFinished = marker.estimated && marker.estimated.status === '완주';
          const markerColor = isFinished ? '#ef4444' : '#4285f4'; // 완주: 빨강, 진행중: 파랑
          
          marker.dotMarker = new naver.maps.Marker({
            position: centerPos,
            map: this.currentMap,
            icon: {
              content: `<div style="width:24px;height:24px;background:${markerColor};border:4px solid #fff;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.5);"></div>`,
              anchor: new naver.maps.Point(14, 14)
            },
            zIndex: 1000
          });
        }
        
        // 2. 레이블 위치 계산 (부채꼴 배치)
        let angle;
        if (count === 1) {
          angle = -90; // 위쪽
        } else {
          // 여러 명이면 부채꼴로 펼침 (-135도 ~ -45도 범위)
          const startAngle = -135;
          const endAngle = -45;
          const angleStep = (endAngle - startAngle) / (count - 1);
          angle = startAngle + (angleStep * index);
        }
        
        const angleRad = (angle * Math.PI) / 180;
        
        // 미터 단위로 오프셋 계산 (줌 레벨과 무관하게 고정 거리)
        const LABEL_DISTANCE_METERS = 0.05; // 50m를 km로 변환
        const R = 6371; // 지구 반경 (km)
        
        // 위도/경도로 오프셋 계산
        const offsetLat = (LABEL_DISTANCE_METERS / R) * (180 / Math.PI) * Math.sin(angleRad);
        const offsetLng = (LABEL_DISTANCE_METERS / R) * (180 / Math.PI) * Math.cos(angleRad) / Math.cos(centerPos.lat() * Math.PI / 180);
        
        const labelPos = new naver.maps.LatLng(
          centerPos.lat() + offsetLat,
          centerPos.lng() + offsetLng
        );
        
        // 완주 여부 확인
        const isFinished = marker.estimated && marker.estimated.status === '완주';
        const lineColor = isFinished ? '#ef4444' : '#4285f4'; // 완주: 빨강, 진행중: 파랑
        
        // 3. 선 그리기
        marker.line = new naver.maps.Polyline({
          map: this.currentMap,
          path: [centerPos, labelPos],
          strokeColor: lineColor,
          strokeOpacity: 0.8,
          strokeWeight: 6,
          zIndex: 999
        });
        
        // 4. 레이블 마커 생성
        const cachedRunner = marker.cachedRunner;
        const estimated = marker.estimated;
        const playerData = marker.playerData;
        const bib = marker.bib;
        
        // 레이블 배경색
        const labelBgColor = isFinished ? 'rgba(239,68,68,0.95)' : 'rgba(59,130,246,0.95)';
        const labelHoverColor = isFinished ? 'rgba(220,38,38,1)' : 'rgba(37,99,235,1)';
        
        // 레이블의 중앙이 labelPos에 오도록 transform 사용
        marker.labelMarker = new naver.maps.Marker({
          position: labelPos,
          map: this.currentMap,
          icon: {
            content: `<div class="player-label" style="white-space:nowrap;transform:translate(-50%, -50%);background:${labelBgColor}">${playerData.name}</div>`,
            anchor: new naver.maps.Point(0, 0)
          },
          zIndex: 1001
        });
        
        // 5. InfoWindow 생성
        let readyPhoto = cachedRunner ? cachedRunner.photo_url : null;
        const profilePhoto = cachedRunner ? cachedRunner.profile_image : null;
        
        if (readyPhoto && readyPhoto !== '/RunCheer.png') {
          const separator = readyPhoto.includes('?') ? '&' : '?';
          readyPhoto = `${readyPhoto}${separator}v=${this.trackingEventId}`;
        }
        
        // 마지막 구간 페이스 계산 (스플릿과 동일한 방식)
        let lastPace = '-';
        const records = (playerData.records || []).sort((a, b) => a.point.distance - b.point.distance);
        if (records.length > 1) {
          const lastRec = records[records.length - 1];
          const prevRec = records[records.length - 2];
          const dist = lastRec.point.distance - prevRec.point.distance;
          const prevSec = this.timeToSeconds(prevRec.time_point);
          const sec = this.timeToSeconds(lastRec.time_point) - prevSec;
          lastPace = this.calcPace(dist, sec); // 이미 M'SS" 형식으로 반환됨
        }
        
        const createInfoContent = () => `
          <div onclick="if(window.currentInfoWindow)window.currentInfoWindow.close()" style="padding:12px;background:#fff;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.3);min-width:150px;max-width:200px;cursor:pointer">
            <div style="font-weight:700;margin-bottom:8px;color:#333;font-size:14px;text-align:center">${playerData.name}(${bib})</div>
            <div style="font-size:12px;color:#666;margin-bottom:4px;">마지막위치: ${estimated.name}</div>
            <div style="font-size:12px;color:#666;margin-bottom:8px;">페이스: ${lastPace}</div>
            <div style="text-align:center;display:flex;flex-direction:column;gap:8px;align-items:center">
              ${profilePhoto ? `
                <img src="${profilePhoto}" alt="프로필" style="width:120px;height:120px;border-radius:8px;object-fit:cover;box-shadow:0 2px 4px rgba(0,0,0,0.2);" loading="lazy" onerror="this.style.display='none';" />
              ` : ''}
              ${readyPhoto && readyPhoto !== '/RunCheer.png' ? `
                <img src="${readyPhoto}" alt="레디샷" style="width:120px;height:120px;border-radius:8px;object-fit:cover;box-shadow:0 2px 4px rgba(0,0,0,0.2);" loading="lazy" onerror="this.style.display='none';" />
              ` : ''}
            </div>
          </div>
        `;
        
        marker.infoWindow = new naver.maps.InfoWindow({ content: createInfoContent() });
        
        // 레이블 클릭 이벤트
        naver.maps.Event.addListener(marker.labelMarker, 'click', () => {
          console.log(`마커 클릭 - 배번: ${bib}, 프로필: ${profilePhoto}, 레디샷: ${readyPhoto}`);
          
          if (marker.infoWindow.getMap()) {
            marker.infoWindow.close();
            window.currentInfoWindow = null;
          } else {
            if (window.currentInfoWindow) window.currentInfoWindow.close();
            marker.infoWindow.open(this.currentMap, marker.labelMarker);
            window.currentInfoWindow = marker.infoWindow;
          }
        });
      });
    });
  }

  updatePlayerTable(bib, playerData, estimated) {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) return;

    // 기존 행 찾기 (main과 splits 2개)
    let trMain = tbody.querySelector(`tr.player-main[data-bib="${bib}"]`);
    let trSplits = trMain ? trMain.nextElementSibling : null;
    
    if (!trMain) {
      // 새 행 생성
      trMain = document.createElement('tr');
      trMain.className = 'player-main';
      trMain.setAttribute('data-bib', bib);
      
      trSplits = document.createElement('tr');
      trSplits.className = 'player-splits';
      
      tbody.appendChild(trMain);
      tbody.appendChild(trSplits);
    }

    // 완주 여부에 따라 스타일 적용
    if (estimated.status === '완주') {
      trMain.classList.add('finished');
    } else {
      trMain.classList.remove('finished');
    }

    // 팀명 표시
    const teamName = playerData.team_name ? `<br>(${playerData.team_name})` : '';

    // Main 행 내용 업데이트
    trMain.innerHTML = `
      <td>${playerData.name}<br>(#${bib})${teamName}</td>
      <td>${estimated.status}</td>
      <td>${estimated.d}</td>
      <td>${estimated.name}</td>
    `;

    // Splits 행 내용 업데이트
    trSplits.innerHTML = `<td colspan="4" style="padding:8px 12px">${this.renderSplits(playerData)}</td>`;
    
    // 정렬 (가나다순)
    this.sortPlayerTable();
  }

  renderSplits(playerData) {
    const records = (playerData.records || []).sort((a, b) => a.point.distance - b.point.distance);
    const netTime = this.cleanTime(playerData.result_nettime);
    const pace = this.cleanTime(playerData.pace_nettime);
    
    let splitsHTML = records.map((r, i) => {
      let paceStr = '';
      if (i > 0) {
        const prevDist = records[i - 1].point.distance;
        const dist = r.point.distance - prevDist;
        const prevSec = this.timeToSeconds(records[i - 1].time_point);
        const sec = this.timeToSeconds(r.time_point) - prevSec;
        paceStr = ` (${this.calcPace(dist, sec)})`;
      }
      return `<div>${r.point.name || ''} ${r.point.distance}km ${this.cleanTime(r.time_point)}${paceStr}</div>`;
    }).join('');
    
    // 완주한 경우에만 최종기록 표시
    if (netTime && pace) {
      splitsHTML += `<div style="margin-top:8px;font-weight:700;color:#4285f4">최종기록: ${netTime} (${pace})</div>`;
    }
    
    return `<div class="splits">${splitsHTML}</div>`;
  }

  cleanTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.split('.')[0];
  }

  calcPace(distKm, sec) {
    if (!distKm || distKm <= 0) return '';
    const minPerKm = sec / 60 / distKm;
    const m = Math.floor(minPerKm);
    const s = Math.round((minPerKm - m) * 60);
    return `${m}'${s.toString().padStart(2, '0')}"`;
  }

  sortPlayerTable() {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) return;

    // 모든 player-main 행 수집
    const rows = Array.from(tbody.querySelectorAll('tr.player-main'));
    
    // 정렬: 미완주자 → 완주자, 그 안에서 가나다순
    rows.sort((a, b) => {
      // 완주 여부 확인 (✅ 아이콘으로 판단)
      const aFinished = a.innerHTML.includes('✅ 완주');
      const bFinished = b.innerHTML.includes('✅ 완주');
      
      // 미완주자가 먼저 오도록
      if (aFinished !== bFinished) {
        return aFinished ? 1 : -1; // a가 완주면 뒤로, b가 완주면 a를 앞으로
      }
      
      // 같은 완주 상태면 이름순 (가나다순)
      const aName = a.querySelector('td').textContent.split('\n')[0].trim().replace(/^\d+\.\s*/, '');
      const bName = b.querySelector('td').textContent.split('\n')[0].trim().replace(/^\d+\.\s*/, '');
      return aName.localeCompare(bName, 'ko');
    });

    // 순서대로 다시 추가
    rows.forEach((row, idx) => {
      const splits = row.nextElementSibling;
      
      // 순번 추가
      const firstCell = row.querySelector('td');
      const originalContent = firstCell.innerHTML;
      const contentWithoutNumber = originalContent.replace(/^\d+\.\s*/, '');
      firstCell.innerHTML = `${idx + 1}. ${contentWithoutNumber}`;
      
      tbody.appendChild(row);
      if (splits && splits.classList.contains('player-splits')) {
        tbody.appendChild(splits);
      }
    });
  }

  estimateNow(playerData) {
    const records = (playerData.records || []).sort((a, b) => a.point.distance - b.point.distance);
    if (!records.length) return { status: '대기', d: 0, name: '', estimated: 0 };

    const lastRec = records[records.length - 1];
    const d = parseFloat(lastRec.point.distance);
    const name = lastRec.point.name;
    const time = lastRec.time_point;
    const date = playerData.event?.date;
    
    if (!date || !time) return { status: '대기', d, name, estimated: d };

    const lastTime = new Date(`${date}T${time}`);
    const now = new Date();
    const elapsedSec = (now - lastTime) / 1000;

    let estimatedDist = d;
    if (elapsedSec > 0 && !playerData.result_nettime) {
      let paceSec = 390; // 기본 6:30 페이스
      
      // 스플릿 마지막 구간 페이스 계산 (마커와 동일)
      if (records.length > 1) {
        const prevRec = records[records.length - 2];
        const dist = lastRec.point.distance - prevRec.point.distance;
        const prevSec = this.timeToSeconds(prevRec.time_point);
        const sec = this.timeToSeconds(lastRec.time_point) - prevSec;
        if (dist > 0 && sec > 0) {
          paceSec = sec / dist; // 마지막 구간 페이스
        }
      }
      
      if (paceSec > 0) {
        const kmPerSec = 1 / paceSec;
        const movedKm = kmPerSec * elapsedSec;
        const courseDistance = parseFloat(playerData.course?.distance || '42.195');
        
        // 다음 체크포인트 찾기
        let nextCheckpointDistance = courseDistance;
        if (playerData.course?.points) {
          const checkpoints = playerData.course.points.sort((a, b) => a.distance - b.distance);
          for (const checkpoint of checkpoints) {
            if (parseFloat(checkpoint.distance) > d) {
              nextCheckpointDistance = parseFloat(checkpoint.distance);
              break;
            }
          }
        }
        
        // 예상 위치 계산 - 다음 체크포인트를 넘지 않도록 제한
        estimatedDist = Math.min(d + movedKm, nextCheckpointDistance, courseDistance);
      }
    }

    return {
      status: playerData.result_nettime ? '완주' : '주행',
      d,
      name,
      estimated: estimatedDist
    };
  }

  timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
  }

  updateAllMarkers() {
    // 저장된 플레이어 데이터로 마커 위치 업데이트
    this.mapMarkers.forEach(({ bib, playerData }) => {
      if (playerData) {
        this.updatePlayerMarker(bib, playerData);
      }
    });
    
    // 모든 마커를 겹침 감지하여 재배치
    this.updateAllMarkersWithOffset();
  }
  
  stopTracking() {
    if (this.trackingTimer) {
      clearInterval(this.trackingTimer);
      this.trackingTimer = null;
    }
    if (this.mapUpdateTimer) {
      clearInterval(this.mapUpdateTimer);
      this.mapUpdateTimer = null;
    }
    
    // 카운트다운 중지
    this.stopCountdown();
    
    // 버튼 업데이트
    const btn = document.getElementById('startTrackingBtn');
    if (btn) {
      btn.textContent = '🎯 그룹 추적 시작';
      btn.className = 'success btn-small';
    }
    
    // 상태 메시지 업데이트
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = '추적이 중지되었습니다.';
    }
    
    console.log('Tracking stopped');
  }

  preloadImages(runners) {
    // 이미지를 미리 로드해서 브라우저 캐시에 저장
    let loadedCount = 0;
    let totalImages = 0;
    
    runners.forEach(runner => {
      const images = [runner.profile_image, runner.photo_url].filter(url => 
        url && url !== '/RunCheer.png'
      );
      
      totalImages += images.length;
      
      images.forEach(url => {
        const img = new Image();
        img.onload = () => {
          loadedCount++;
          console.log(`✅ 이미지 캐시됨 (${loadedCount}/${totalImages}): ${url.substring(0, 50)}...`);
        };
        img.onerror = () => {
          loadedCount++;
          console.log(`❌ 이미지 로드 실패 (${loadedCount}/${totalImages}): ${url.substring(0, 50)}...`);
        };
        img.src = url;
      });
    });
    
    if (totalImages > 0) {
      console.log(`🖼️ ${totalImages}개의 이미지를 프리로드합니다...`);
    }
  }

  startCountdown() {
    this.remainingSeconds = 180;
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
      indicator.classList.add('active');
    }
    this.updateCountdown();
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }
    this.countdownTimer = setInterval(() => this.updateCountdown(), 1000);
  }

  stopCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
      indicator.classList.remove('active');
    }
  }

  updateCountdown() {
    const circumference = 2 * Math.PI * 11;
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
      progressBar.style.strokeDasharray = circumference;
    }
    
    this.remainingSeconds--;
    if (this.remainingSeconds < 0) {
      this.remainingSeconds = 180;
    }
    
    if (progressBar) {
      const offset = circumference * (1 - this.remainingSeconds / 180);
      progressBar.style.strokeDashoffset = offset;
    }
    
    const countdown = document.getElementById('countdown');
    if (countdown) {
      countdown.textContent = `${this.remainingSeconds}초`;
    }
  }

  initializeTrackingMap(eventId, runners) {
    console.log('Initializing map for event:', eventId);
    
    if (!window.naver || !window.naver.maps) {
      console.error('Naver Maps API not loaded');
      Utils.showToast('지도 API가 로드되지 않았습니다.', 'error');
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    console.log('Map container found:', mapContainer);

    // 대회별 중심점
    const eventCenters = {
      133: { lat: 37.5665, lng: 126.9780 }, // JTBC 서울마라톤
      132: { lat: 37.8813, lng: 127.7299 }  // 춘천마라톤
    };

    const center = eventCenters[eventId] || eventCenters[133];
    
    // 기존 지도가 없으면 생성
    if (!this.currentMap) {
      console.log('Creating new map with center:', center);
      this.currentMap = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom: 13,
        mapTypeControl: true
      });
      console.log('Map created:', this.currentMap);
      
      // 지도 초기화 대기 후 코스 경로 로드
      setTimeout(() => {
        console.log('Loading GPX course after delay in initializeTrackingMap');
        this.loadGPXCourse(eventId, this.currentMap);
        // GPX 로드 후 지도 강제 리렌더링
        setTimeout(() => {
          if (this.currentMap) {
            this.currentMap.panBy(0, 0); // 지도를 움직여서 강제 리렌더링
          }
        }, 500);
      }, 500);
    } else {
      console.log('Using existing map');
    }

    // 기존 마커 제거 (체크포인트 제외)
    this.mapMarkers.forEach((markerObj) => {
      if (markerObj.dotMarker) markerObj.dotMarker.setMap(null);
      if (markerObj.labelMarker) markerObj.labelMarker.setMap(null);
      if (markerObj.line) markerObj.line.setMap(null);
    });
    this.mapMarkers = [];

    console.log('Map ready for tracking', runners.length, 'runners');
    
    // 상태 업데이트
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `추적 준비 완료. ${runners.length}명의 주자 데이터를 불러오는 중...`;
    }
  }

  async loadGPXCourse(eventId, map) {
    let gpxFile = null;
    let checkpoints = [];
    
    if (eventId === 133) {
      // 2025 JTBC 서울마라톤
      gpxFile = '/course-jtbc2025.gpx';
      checkpoints = [
        {name: '출발', distance: 0.00},
        {name: '5K', distance: 5.00},
        {name: '10K', distance: 10.00},
        {name: '15K', distance: 15.00},
        {name: '20K', distance: 20.00},
        {name: 'Half', distance: 21.10},
        {name: '25K', distance: 25.00},
        {name: '30K', distance: 30.00},
        {name: '35K', distance: 35.00},
        {name: '40K', distance: 40.00}
      ];
    } else if (eventId === 132) {
      // 2025 춘천마라톤
      gpxFile = '/course-chuncheon-2025.gpx';
      checkpoints = [
        {name: '출발', distance: 0.00},
        {name: '반환점', distance: 4.00},
        {name: '5K', distance: 5.00},
        {name: '10K', distance: 10.00},
        {name: '15K', distance: 15.00},
        {name: '20K', distance: 20.00},
        {name: 'Half', distance: 21.10},
        {name: '25K', distance: 25.00},
        {name: '30K', distance: 30.00},
        {name: '35K', distance: 35.00},
        {name: '40K', distance: 40.00}
      ];
    }
    
    if (!gpxFile) return;
    
    try {
      const response = await fetch(gpxFile);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const trkpts = xml.querySelectorAll('trkpt');
      const path = [];
      
      trkpts.forEach(pt => {
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        if (lat && lon) path.push(new naver.maps.LatLng(lat, lon));
      });
      
      if (path.length > 0) {
        // GPX 포인트 저장
        this.gpxPoints = path;
        
        // 기존 코스 경로 제거
        if (this.coursePath) {
          this.coursePath.setMap(null);
        }
        
        // 코스 경로 그리기
        this.coursePath = new naver.maps.Polyline({
          path: path,
          strokeColor: '#FF0000',
          strokeOpacity: 0.6,
          strokeWeight: 4,
          map: map
        });
        
        // 지도 범위 조정
        const bounds = new naver.maps.LatLngBounds();
        path.forEach(p => bounds.extend(p));
        map.fitBounds(bounds);
        
        // 기존 체크포인트 마커 제거
        if (this.checkpointMarkers) {
          this.checkpointMarkers.forEach(m => m.setMap(null));
        }
        this.checkpointMarkers = [];
        
        // 체크포인트 마커 추가
        checkpoints.forEach(cp => {
          const pos = Utils.getPositionOnRoute(path, cp.distance);
          if (pos) {
            const marker = new naver.maps.Marker({
              position: pos,
              map: map,
              icon: {
                content: `<div style="background:#2a3f5f;color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">${cp.name}</div>`,
                anchor: new naver.maps.Point(0, 25)
              }
            });
            this.checkpointMarkers.push(marker);
          }
        });
        
        // GPX 마지막 지점에 도착 마커 추가
        if (path.length > 0) {
          const finishPos = path[path.length - 1];
          const finishMarker = new naver.maps.Marker({
            position: finishPos,
            map: map,
            icon: {
              content: `<div style="background:#2a3f5f;color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);">도착</div>`,
              anchor: new naver.maps.Point(0, 25)
            },
            zIndex: 1000
          });
          this.checkpointMarkers.push(finishMarker);
        }
        
        console.log(`GPX 코스 로드 완료: ${path.length} 포인트, ${checkpoints.length} 체크포인트`);
      }
    } catch (error) {
      console.error('GPX 로드 실패:', error);
    }
  }

  initializeMapForGroup(eventId) {
    console.log('Initializing map for group, event:', eventId);
    
    if (!window.naver || !window.naver.maps) {
      console.error('Naver Maps API not loaded');
      return;
    }

    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // 기존 지도가 있으면 재사용, 없으면 새로 생성
    if (this.currentMap) {
      console.log('Map already exists, skipping creation');
      return;
    }

    console.log('Map container found:', mapContainer);

    // 대회별 중심점
    const eventCenters = {
      133: { lat: 37.5665, lng: 126.9780 }, // JTBC 서울마라톤
      132: { lat: 37.8813, lng: 127.7299 }  // 춘천마라톤
    };

    const center = eventCenters[eventId] || eventCenters[133];
    
    console.log('Creating map with center:', center);

    // 지도 생성
    this.currentMap = new naver.maps.Map('map', {
      center: new naver.maps.LatLng(center.lat, center.lng),
      zoom: 13,
      mapTypeControl: true
    });

    console.log('Map created:', this.currentMap);

    // 지도 초기화 대기 후 코스 경로 로드
    setTimeout(() => {
      console.log('Loading GPX course after delay');
      this.loadGPXCourse(eventId, this.currentMap);
      // GPX 로드 후 지도 강제 리렌더링
      setTimeout(() => {
        if (this.currentMap) {
          this.currentMap.panBy(0, 0); // 지도를 움직여서 강제 리렌더링
        }
      }, 500);
    }, 500);

    // 상태 업데이트
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = '지도가 로드되었습니다. "그룹 추적 시작" 버튼을 눌러 주자를 추적하세요.';
    }
  }
}

// ============================================
// 전역 함수
// ============================================
function closeModal(modalId) {
  // 주자 등록 모달을 닫을 때 pendingGroup 처리
  if (modalId === 'registerRunnerModal' && window.app && window.app.pendingGroup) {
    window.app.handleCancelRegisterRunner();
  } else {
    document.getElementById(modalId).classList.remove('active');
  }
}

// 전역 변수로 선택된 파일 저장
let selectedPhotoFile = null;

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    // 파일 선택 취소 시 - 기존 미리보기 및 파일 유지
    return;
  }
  
  if (file.size > CONFIG.IMAGE_MAX_SIZE) {
    alert('이미지 크기는 5MB를 초과할 수 없습니다.');
    event.target.value = '';
    return;
  }
  
  // 파일을 전역 변수에 저장
  selectedPhotoFile = file;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const uploadArea = document.getElementById('imageUploadArea');
    
    preview.src = e.target.result;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    uploadArea.classList.add('has-image');
  };
  reader.readAsDataURL(file);
}

function handleRoleChange() {
  const isRunner = document.getElementById('runnerRole').checked;
  const runnerFields = document.getElementById('runnerFields');
  const runnerRoleLabel = document.getElementById('runnerRoleLabel');
  const supporterRoleLabel = document.getElementById('supporterRoleLabel');
  
  if (isRunner) {
    runnerFields.style.display = 'block';
    runnerRoleLabel.classList.add('selected');
    supporterRoleLabel.classList.remove('selected');
  } else {
    runnerFields.style.display = 'none';
    supporterRoleLabel.classList.add('selected');
    runnerRoleLabel.classList.remove('selected');
  }
}

// ============================================
// 경고 팝업 관리
// ============================================
window.showWarningPopup = function() {
  const warningModal = document.getElementById('warningModal');
  const dismissed = localStorage.getItem('warningDismissedUntil');
  
  // 하루 동안 보지 않기 체크
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    if (Date.now() < dismissedTime) {
      return; // 아직 안 보기 기간
    }
  }
  
  // 그룹이 있거나 참여한 사용자는 표시 안 함
  if (window.app && window.app.groupManager.currentGroup) {
    return;
  }
  
  warningModal.classList.add('active');
};

window.closeWarning = function() {
  const warningModal = document.getElementById('warningModal');
  warningModal.classList.remove('active');
};

window.dismissWarningForDay = function() {
  // 24시간 후 시간 저장
  const dismissUntil = Date.now() + (24 * 60 * 60 * 1000);
  localStorage.setItem('warningDismissedUntil', dismissUntil.toString());
  window.closeWarning();
};

// ============================================
// 앱 초기화
// ============================================
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new RunCheerApp();
  window.app = app; // 전역 접근 가능하도록
  
  // 로그인 후 팝업 표시 (약간의 딜레이)
  setTimeout(() => {
    if (app.authManager.getUser()) {
      window.showWarningPopup();
    }
  }, 1000);
});

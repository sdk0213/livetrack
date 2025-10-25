// ============================================
// RunCheer Application - 객체지향 구조
// ============================================

// 환경 설정
const CONFIG = {
  KAKAO_JS_KEY: '1c986b10c0401ffb6c00df1ccddef006', // 카카오 개발자 콘솔에서 발급받은 JavaScript 키
  API_BASE: '/api',
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  IMAGE_QUALITY: 0.8,
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
          
          // 최대 크기 제한
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          
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
    const response = await fetch(`${CONFIG.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    // 204 No Content는 JSON 파싱하지 않음
    if (response.status === 204) {
      return null;
    }

    return response.json();
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
    return this.request('/groups/join', {
      method: 'POST',
      body: JSON.stringify(groupData)
    });
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
        try {
          await APIService.getUser(userInfo.id);
          console.log('Existing user found');
        } catch (e) {
          // 신규 사용자 생성
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
            throw new Error('사용자 생성에 실패했습니다. 다시 시도해주세요.');
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
        redirectUri: 'https://livetrack-theta.vercel.app/test_kakao.html'
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

  async registerRunner(kakaoId, bib, photoBlob) {
    if (!this.currentGroup) {
      throw new Error('그룹에 참여하지 않았습니다.');
    }

    // 이미지 업로드
    const imageResult = await APIService.uploadImage(
      photoBlob,
      this.currentGroup.code,
      kakaoId
    );

    // 주자 정보 등록
    const runnerData = {
      code: this.currentGroup.code,
      kakaoId,
      bib,
      photoUrl: imageResult.url
    };

    return APIService.joinGroup(runnerData);
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
    this.createGroupBtn.addEventListener('click', () => this.showModal('createGroupModal'));
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

  updateGroupInfo(group) {
    if (group) {
      this.noGroupMessage.classList.add('hidden');
      this.groupInfo.classList.remove('hidden');
      this.runnersSection.classList.remove('hidden');
      
      document.getElementById('groupName').textContent = group.name;
      document.getElementById('groupCode').innerHTML = `
        <div style="font-size:24px;font-weight:700;color:#3b82f6;font-family:monospace;letter-spacing:2px;margin:8px 0;">${group.code}</div>
        <div style="font-size:11px;color:#94a3b8;margin-top:4px;">이 코드를 주자들에게 공유해주세요</div>
      `;
      
      // 이벤트 이름과 그룹장 정보 표시
      const eventInfo = this.getEventName(group.event_id);
      const leaderInfo = group.creator_name ? ` • 그룹장: ${group.creator_name}` : '';
      document.getElementById('groupEvent').textContent = eventInfo + leaderInfo;
      
      // 지도와 결과 섹션 표시
      this.mapSection.classList.remove('hidden');
      this.resultsSection.classList.remove('hidden');
      
      // 지도 초기화 (그룹에 가입하면 자동으로 표시)
      setTimeout(() => {
        this.app.initializeMapForGroup(group.event_id);
      }, 100);
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
    
    runners.forEach(runner => {
      const card = document.createElement('div');
      card.className = 'runner-card';
      
      const cachedImage = this.app.imageCache.get(runner.kakao_id);
      const imageUrl = cachedImage || runner.photo_url;
      
      if (!cachedImage && runner.photo_url) {
        this.app.imageCache.set(runner.kakao_id, runner.photo_url);
      }
      
      card.innerHTML = `
        <img src="${imageUrl}" alt="${runner.name}" class="runner-photo" />
        <div class="runner-info">
          <div class="runner-name">${runner.name}</div>
          <div class="runner-bib">배번: ${runner.bib}${runner.team_name ? ` (${runner.team_name})` : ''}</div>
        </div>
      `;
      
      this.runnersList.appendChild(card);
    });
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
            <div style="font-size:28px;font-weight:700;color:#3b82f6;font-family:monospace;letter-spacing:3px;">${group.code}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:6px;">이 코드를 주자들에게 공유해주세요</div>
          </div>
          <div class="muted" style="font-size:12px;text-align:center;">
            ${this.getEventName(group.event_id)}
            ${group.creator_name ? ` • 그룹장: ${group.creator_name}` : ''}
          </div>
        </div>
      `;
      
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
    this.trackingTimer = null; // 60초 갱신 타이머
    this.mapUpdateTimer = null; // 15초 마커 업데이트 타이머
    this.countdownTimer = null; // 카운트다운 타이머
    this.remainingSeconds = 60; // 남은 시간(초)
    
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
          await this.onLoginSuccess();
        } catch (error) {
          // 사용자가 서버에 없음 (회원탈퇴됨)
          console.warn('User not found in server, clearing local data');
          localStorage.removeItem('user');
          this.authManager.logout();
          this.imageCache.clear();
          Utils.showToast('다시 로그인해주세요.', 'info');
          this.showLoginPage();
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
      const group = await this.groupManager.joinGroup(code);
      
      Utils.showToast('그룹에 참여했습니다!', 'success');
      this.ui.hideModal('joinGroupModal');
      
      // 주자 정보 등록 모달의 설명 텍스트 변경
      const descriptionEl = document.getElementById('registerRunnerDescription');
      if (descriptionEl) {
        descriptionEl.textContent = '그룹 참여를 위해 배번과 사진을 등록해주세요.';
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
    const bib = document.getElementById('runnerBib').value.trim();
    const photoInput = document.getElementById('runnerPhoto');
    
    if (!bib || !photoInput.files.length) {
      Utils.showToast('배번과 사진을 모두 입력해주세요.', 'error');
      return;
    }
    
    const btn = document.getElementById('confirmRegisterRunnerBtn');
    const originalText = Utils.showLoading(btn);
    
    try {
      const user = this.authManager.getUser();
      const file = photoInput.files[0];
      
      // 이미지 압축
      const compressedBlob = await Utils.compressImage(file);
      
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
        
        // 이미지 업로드
        const imageResult = await APIService.uploadImage(compressedBlob, code, user.id);
        
        // 그룹 + 멤버를 한 번에 생성
        const groupData = {
          code,
          name: this.pendingGroup.name,
          eventId: parseInt(this.pendingGroup.eventId, 10),
          creatorKakaoId: user.id,
          bib,
          photoUrl: imageResult.url
        };
        
        const group = await APIService.createGroupWithMember(groupData);
        this.groupManager.currentGroup = group;
        this.pendingGroup = null;
        
        Utils.showToast(`그룹이 생성되었습니다! 코드: ${group.code}`, 'success');
      } else {
        // 기존 그룹에 주자 등록
        await this.groupManager.registerRunner(user.id, bib, compressedBlob);
        this.pendingGroup = null;
        Utils.showToast('주자 정보가 등록되었습니다!', 'success');
      }
      
      this.ui.hideModal('registerRunnerModal');
      
      // 입력 필드 초기화
      document.getElementById('runnerBib').value = '';
      document.getElementById('runnerPhoto').value = '';
      
      // UI 업데이트
      await this.loadUserGroup();
      
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
    const isLeader = group.creator_kakao_id === user.id;
    
    if (isLeader) {
      // 그룹장: 그룹 삭제
      if (!confirm('👑 그룹장 권한으로 그룹을 삭제하시겠습니까?\n\n⚠️ 모든 멤버가 그룹에서 제외되며, 그룹 데이터가 완전히 삭제됩니다.')) return;
      
      try {
        await APIService.deleteGroup(group.code);
        
        this.groupManager.currentGroup = null;
        Utils.showToast('✅ 그룹이 삭제되었습니다.', 'success');
        this.ui.updateGroupInfo(null);
        this.ui.updateMyGroupInfo(null, false);
        this.ui.updateRunnersList([]); // 주자 목록 초기화
      } catch (error) {
        console.error('Failed to delete group:', error);
        Utils.showToast('❌ 그룹 삭제에 실패했습니다.', 'error');
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
      
      // 주자 배번 목록 저장
      this.trackingBibs = runners.map(r => r.bib_number);
      this.trackingEventId = group.event_id;
      
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

    // 60초마다 갱신
    if (this.trackingTimer) {
      clearInterval(this.trackingTimer);
    }
    this.trackingTimer = setInterval(() => {
      this.updateTrackingData();
    }, 60000); // 60초

    // 15초마다 마커 위치 업데이트 (예상 위치)
    if (this.mapUpdateTimer) {
      clearInterval(this.mapUpdateTimer);
    }
    this.mapUpdateTimer = setInterval(() => {
      this.updateAllMarkers();
    }, 15000); // 15초
  }

  async updateTrackingData() {
    if (!this.trackingEventId || !this.trackingBibs) return;

    console.log('Updating tracking data...');
    
    // 카운트다운 리셋
    this.remainingSeconds = 60;
    this.updateCountdown();
    
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = `데이터 갱신 중... (${new Date().toLocaleTimeString('ko-KR')})`;
    }

    for (const bib of this.trackingBibs) {
      try {
        const response = await fetch(`/api/proxy?path=${encodeURIComponent(`event/${this.trackingEventId}/player/${bib}`)}`);
        if (response.ok) {
          const playerData = await response.json();
          this.updatePlayerMarker(bib, playerData);
          console.log(`Updated player ${bib}:`, playerData.name);
        }
      } catch (error) {
        console.error(`Failed to fetch player ${bib}:`, error);
      }
    }

    if (statusEl) {
      statusEl.textContent = `마지막 업데이트: ${new Date().toLocaleTimeString('ko-KR')}`;
    }
  }

  updatePlayerMarker(bib, playerData) {
    if (!this.currentMap || !this.gpxPoints || this.gpxPoints.length === 0) return;

    // 예상 위치 계산
    const estimated = this.estimateNow(playerData);
    if (!estimated || estimated.estimated === 0) return;

    const pos = Utils.getPositionOnRoute(this.gpxPoints, estimated.estimated);
    if (!pos) return;

    // 기존 마커가 있으면 위치 업데이트, 없으면 생성
    const existingMarker = this.mapMarkers.find(m => m.bib === bib);
    
    if (existingMarker) {
      existingMarker.marker.setPosition(pos);
      existingMarker.label.setPosition(pos);
    } else {
      // 새 마커 생성
      const marker = new naver.maps.Marker({
        position: pos,
        map: this.currentMap,
        icon: {
          content: `<div style="width:12px;height:12px;background:#5cc8ff;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
          anchor: new naver.maps.Point(9, 9)
        }
      });

      const label = new naver.maps.Marker({
        position: pos,
        map: this.currentMap,
        icon: {
          content: `<div class="player-label">${playerData.name}</div>`,
          anchor: new naver.maps.Point(0, 30)
        }
      });

      const infoContent = `<div style="padding:10px;background:#fff;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.3);min-width:150px">
        <div style="font-weight:700;margin-bottom:5px;color:#333">${playerData.name}</div>
        <div style="font-size:12px;color:#666">배번: ${bib}</div>
        <div style="font-size:12px;color:#666">마지막 통과: ${estimated.name}</div>
        <div style="font-size:12px;color:#666">통과 거리: ${estimated.d}km</div>
        <div style="font-size:12px;color:#4285f4;font-weight:bold">📍 예상 위치: ${estimated.estimated.toFixed(2)}km</div>
      </div>`;
      
      const infoWindow = new naver.maps.InfoWindow({ content: infoContent });
      
      naver.maps.Event.addListener(marker, 'click', () => {
        if (infoWindow.getMap()) {
          infoWindow.close();
        } else {
          infoWindow.open(this.currentMap, marker);
        }
      });

      this.mapMarkers.push({ bib, marker, label, infoWindow, playerData });
    }
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
      if (playerData.pace_nettime) {
        const paceStr = playerData.pace_nettime.split('.')[0];
        paceSec = this.timeToSeconds(paceStr);
      }
      if (paceSec > 0) {
        const kmPerSec = 1 / paceSec;
        const movedKm = kmPerSec * elapsedSec;
        const courseDistance = parseFloat(playerData.course?.distance || '42.195');
        estimatedDist = Math.min(d + movedKm, courseDistance);
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

  startCountdown() {
    this.remainingSeconds = 60;
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
      this.remainingSeconds = 60;
    }
    
    if (progressBar) {
      const offset = circumference * (1 - this.remainingSeconds / 60);
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
      
      // 코스 경로 로드
      this.loadGPXCourse(eventId, this.currentMap);
    } else {
      console.log('Using existing map');
    }

    // 기존 마커 제거 (체크포인트 제외)
    this.mapMarkers.forEach(({ marker, label }) => {
      if (marker) marker.setMap(null);
      if (label) label.setMap(null);
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
        {name: '40K', distance: 40.00},
        {name: '도착', distance: 42.195}
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
        {name: '40K', distance: 40.00},
        {name: '도착', distance: 42.20}
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

    // 코스 경로 로드
    this.loadGPXCourse(eventId, this.currentMap);

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

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > CONFIG.IMAGE_MAX_SIZE) {
    alert('이미지 크기는 5MB를 초과할 수 없습니다.');
    event.target.value = '';
    return;
  }
  
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

// ============================================
// 앱 초기화
// ============================================
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new RunCheerApp();
  window.app = app; // 전역 접근 가능하도록
});

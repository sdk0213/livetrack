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

    return response.json();
  }

  // 사용자 관련
  static async getUser(kakaoId) {
    return this.request(`/users/${kakaoId}`);
  }

  static async createUser(userData) {
    return this.request('/users', {
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

  static async getGroup(code) {
    return this.request(`/groups/${code}`);
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
    const formData = new FormData();
    formData.append('image', blob);
    formData.append('groupCode', groupCode);
    formData.append('kakaoId', kakaoId);

    const response = await fetch(`${CONFIG.API_BASE}/images/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    return response.json();
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
        
        // 서버에 사용자 정보 저장
        try {
          await APIService.getUser(userInfo.id);
        } catch (e) {
          // 신규 사용자
          const userData = {
            kakaoId: userInfo.id,
            name: userInfo.properties?.nickname || userInfo.kakao_account?.profile?.nickname || '사용자',
            profileImage: userInfo.properties?.profile_image || userInfo.kakao_account?.profile?.profile_image_url || ''
          };
          console.log('Creating user with data:', userData);
          await APIService.createUser(userData);
        }
        
        return userInfo;
      } catch (error) {
        console.error('Failed to get user info:', error);
        alert('로그인 처리 중 오류가 발생했습니다.');
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
      eventId,
      creatorKakaoId,
      createdAt: new Date().toISOString()
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

    // 추적 시작
    this.startTrackingBtn.addEventListener('click', () => this.app.handleStartTracking());
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
      
      document.getElementById('groupName').textContent = group.name;
      document.getElementById('groupCode').textContent = `코드: ${group.code}`;
      document.getElementById('groupEvent').textContent = this.getEventName(group.eventId);
      
      this.runnersSection.classList.remove('hidden');
    } else {
      this.noGroupMessage.classList.remove('hidden');
      this.groupInfo.classList.add('hidden');
      this.runnersSection.classList.add('hidden');
    }
  }

  updateRunnersList(runners) {
    this.runnersList.innerHTML = '';
    
    runners.forEach(runner => {
      const card = document.createElement('div');
      card.className = 'runner-card';
      
      const cachedImage = this.app.imageCache.get(runner.kakaoId);
      const imageUrl = cachedImage || runner.photoUrl;
      
      if (!cachedImage && runner.photoUrl) {
        this.app.imageCache.set(runner.kakaoId, runner.photoUrl);
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

  updateMyGroupInfo(group) {
    const container = document.getElementById('myGroupInfo');
    if (group) {
      container.innerHTML = `
        <div class="group-card">
          <div class="group-header">
            <div class="group-name">${group.name}</div>
            <div class="group-code">코드: ${group.code}</div>
          </div>
          <div class="muted" style="font-size:12px">${this.getEventName(group.eventId)}</div>
        </div>
      `;
      this.leaveGroupBtn.classList.remove('hidden');
    } else {
      container.innerHTML = '<p class="muted text-center">가입된 그룹이 없습니다.</p>';
      this.leaveGroupBtn.classList.add('hidden');
    }
  }

  getEventName(eventId) {
    const events = {
      133: '2025 JTBC 서울마라톤',
      132: '2025 춘천마라톤'
    };
    return events[eventId] || '알 수 없는 대회';
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
    
    this.init();
  }

  async init() {
    // 페이지 로드 시 인가 코드 처리
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
    // 임시: 로컬스토리지에서 확인
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        this.authManager.user = JSON.parse(savedUser);
        await this.onLoginSuccess();
      } catch (e) {
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
    const originalText = Utils.showLoading(this.ui.kakaoLoginBtn);
    
    try {
      // authorize는 페이지를 리다이렉트하므로 여기는 실행되지 않음
      await this.authManager.login();
    } catch (error) {
      console.error('Login failed:', error);
      Utils.showToast('로그인에 실패했습니다.', 'error');
    } finally {
      Utils.hideLoading(this.ui.kakaoLoginBtn, originalText);
    }
  }

  async onLoginSuccess() {
    this.ui.showPage('mainApp');
    
    // 사용자 정보 로드
    const user = this.authManager.getUser();
    console.log('onLoginSuccess - user:', user);
    
    const nickname = user.properties?.nickname 
      || user.kakao_account?.profile?.nickname 
      || user.name 
      || '사용자';
    
    document.getElementById('profileName').value = nickname;
    
    // 그룹 정보 로드
    await this.loadUserGroup();
  }

  async loadUserGroup() {
    try {
      const user = this.authManager.getUser();
      const group = await APIService.getUserGroup(user.id);
      
      if (group) {
        this.groupManager.currentGroup = group;
        this.ui.updateGroupInfo(group);
        this.ui.updateMyGroupInfo(group);
        await this.loadGroupRunners();
      }
    } catch (error) {
      console.error('Failed to load group:', error);
      // 그룹이 없는 경우는 정상
      this.ui.updateGroupInfo(null);
      this.ui.updateMyGroupInfo(null);
    }
  }

  async handleCreateGroup() {
    const name = document.getElementById('newGroupName').value.trim();
    const eventId = document.getElementById('newGroupEvent').value;
    
    if (!name || !eventId) {
      Utils.showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }
    
    const btn = document.getElementById('confirmCreateGroupBtn');
    const originalText = Utils.showLoading(btn);
    
    try {
      const user = this.authManager.getUser();
      const group = await this.groupManager.createGroup(name, eventId, user.id);
      
      Utils.showToast(`그룹이 생성되었습니다! 코드: ${group.code}`, 'success');
      this.ui.hideModal('createGroupModal');
      
      // 주자 정보 등록 모달 표시
      this.ui.showModal('registerRunnerModal');
      
    } catch (error) {
      console.error('Failed to create group:', error);
      Utils.showToast('그룹 생성에 실패했습니다.', 'error');
    } finally {
      Utils.hideLoading(btn, originalText);
    }
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
      
      // 주자 등록
      await this.groupManager.registerRunner(user.id, bib, compressedBlob);
      
      Utils.showToast('주자 정보가 등록되었습니다!', 'success');
      this.ui.hideModal('registerRunnerModal');
      
      // UI 업데이트
      await this.loadUserGroup();
      
    } catch (error) {
      console.error('Failed to register runner:', error);
      Utils.showToast('주자 등록에 실패했습니다.', 'error');
    } finally {
      Utils.hideLoading(btn, originalText);
    }
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
    if (!confirm('정말 그룹을 탈퇴하시겠습니까?')) return;
    
    try {
      const user = this.authManager.getUser();
      await this.groupManager.leaveGroup(user.id);
      
      Utils.showToast('그룹에서 탈퇴했습니다.', 'success');
      this.ui.updateGroupInfo(null);
      this.ui.updateMyGroupInfo(null);
    } catch (error) {
      console.error('Failed to leave group:', error);
      Utils.showToast('그룹 탈퇴에 실패했습니다.', 'error');
    }
  }

  handleLogout() {
    if (!confirm('로그아웃하시겠습니까?')) return;
    
    this.authManager.logout();
    localStorage.removeItem('user');
    this.showLoginPage();
  }

  async handleDeleteAccount() {
    if (!confirm('정말 회원탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.')) return;
    
    try {
      const user = this.authManager.getUser();
      await APIService.deleteUser(user.id);
      
      this.authManager.logout();
      localStorage.removeItem('user');
      this.imageCache.clear();
      
      Utils.showToast('회원탈퇴가 완료되었습니다.', 'success');
      this.showLoginPage();
    } catch (error) {
      console.error('Failed to delete account:', error);
      Utils.showToast('회원탈퇴에 실패했습니다.', 'error');
    }
  }

  async handleStartTracking() {
    // TODO: 기존 추적 로직 구현
    Utils.showToast('추적 기능은 곧 구현됩니다.', 'info');
  }
}

// ============================================
// 전역 함수
// ============================================
function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
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

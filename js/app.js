// Study Quest: 코어 게임 로직 및 UI 인터랙션 관리자

class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  play(type) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'click':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.05);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        osc.start(t);
        osc.stop(t + 0.05);
        break;

      case 'correct':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, t + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, t + 0.24); // C6
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.start(t);
        osc.stop(t + 0.4);
        break;

      case 'wrong':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(140, t + 0.25);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
        break;

      case 'levelUp':
        osc.type = 'triangle';
        [440, 554, 659, 880, 1108].forEach((freq, idx) => {
          osc.frequency.setValueAtTime(freq, t + idx * 0.09);
        });
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.start(t);
        osc.stop(t + 0.6);
        break;

      case 'attack':
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.start(t);
        osc.stop(t + 0.12);
        break;

      case 'coin':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
        break;
    }
  }
}

class StudyQuestApp {
  constructor() {
    this.sfx = new SoundFX();
    this.state = this.loadState();
    this.currentView = 'home';
    this.currentSubject = null;
    this.currentQuizIndex = 0;
    this.activeMonster = null;
    this.monsterCurrentHp = 100;
    this.timerInterval = null;
    this.timerSeconds = 0;
    this.isTimerRunning = false;
    this.villageMap = null;
    this.villageViewMode = localStorage.getItem('study_quest_home_mode') || '2d';
  }

  loadState() {
    try {
      const saved = localStorage.getItem('study_quest_saved_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.pet) parsed.pet = { name: "아기 드래곤 퐁이", icon: "🐲", active: true };
        if (!parsed.wrongNotes) parsed.wrongNotes = [];
        return parsed;
      }
    } catch (e) {
      console.warn('저장된 데이터를 불러오는 중 오류가 발생했습니다:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_GAME_DATA));
  }

  saveState() {
    try {
      localStorage.setItem('study_quest_saved_v1', JSON.stringify(this.state));
    } catch (e) {
      console.error('데이터 저장 실패:', e);
    }
    this.renderHeaderStats();
  }

  init() {
    this.renderHeaderStats();
    this.setupNavigation();
    this.navigateTo('home');
    this.setupTimerControls();
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('[data-nav]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-nav');
        this.sfx.play('click');
        this.navigateTo(view);
      });
    });

    const soundBtn = document.getElementById('btn-sound-toggle');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.sfx.enabled = !this.sfx.enabled;
        soundBtn.innerHTML = this.sfx.enabled ? '🔊 사운드 ON' : '🔇 사운드 OFF';
        soundBtn.classList.toggle('muted', !this.sfx.enabled);
        if (this.sfx.enabled) this.sfx.play('coin');
      });
    }
  }

  navigateTo(view, payload = null) {
    if (this.villageMap) {
      this.villageMap.destroy();
      this.villageMap = null;
    }
    this.currentView = view;

    // 네비게이션 액티브 상태 갱신
    document.querySelectorAll('[data-nav]').forEach(el => {
      if (el.getAttribute('data-nav') === view) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    const contentArea = document.getElementById('view-container');
    if (!contentArea) return;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (view) {
      case 'home':
        this.renderHome(contentArea);
        break;
      case 'subjects':
        this.renderSubjects(contentArea);
        break;
      case 'quiz':
        this.renderQuiz(contentArea, payload);
        break;
      case 'battle':
        this.renderBattle(contentArea, payload);
        break;
      case 'quests':
        this.renderQuests(contentArea);
        break;
      case 'inventory':
        this.renderInventory(contentArea);
        break;
      case 'stats':
        this.renderStats(contentArea);
        break;
      case 'settings':
        this.renderSettings(contentArea);
        break;
      default:
        this.renderHome(contentArea);
    }
    this.renderHeaderStats();
  }

  renderHeaderStats() {
    const p = this.state.player;
    const levelEl = document.getElementById('header-level');
    const expText = document.getElementById('header-exp-text');
    const expBar = document.getElementById('header-exp-bar');
    const goldEl = document.getElementById('header-gold');
    const gemsEl = document.getElementById('header-gems');
    const streakEl = document.getElementById('header-streak');

    if (levelEl) levelEl.textContent = `Lv.${p.level}`;
    if (expText) expText.textContent = `${p.exp} / ${p.maxExp} EXP`;
    if (expBar) expBar.style.width = `${Math.min(100, Math.floor((p.exp / p.maxExp) * 100))}%`;
    if (goldEl) goldEl.textContent = p.gold.toLocaleString();
    if (gemsEl) gemsEl.textContent = p.gems.toLocaleString();
    if (streakEl) streakEl.textContent = `${p.streakDays}일 연속`;
  }

  addExp(amount) {
    const p = this.state.player;
    // 장신구 보너스 확인
    const acc = this.state.inventory.find(i => i.id === this.state.equipped.accessory);
    if (acc && acc.expBonus) {
      amount = Math.round(amount * (1 + acc.expBonus));
    }

    p.exp += amount;
    this.showToast(`✨ +${amount} EXP 획득!`, 'exp');

    while (p.exp >= p.maxExp) {
      p.exp -= p.maxExp;
      p.level += 1;
      p.maxExp = Math.round(p.maxExp * 1.35);
      p.maxHp += 20;
      p.hp = p.maxHp;
      p.atk += 5;
      p.def += 3;
      p.gold += 100;
      this.sfx.play('levelUp');
      this.showLevelUpModal(p.level);
    }
    this.saveState();
  }

  addGold(amount) {
    this.state.player.gold += amount;
    this.sfx.play('coin');
    this.showToast(`💰 +${amount} 골드 획득!`, 'gold');
    this.saveState();
  }

  showToast(message, type = 'normal') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  showLevelUpModal(newLevel) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay levelup-modal active';
    modal.innerHTML = `
      <div class="modal-card bounce-in">
        <div class="levelup-badge">LEVEL UP!</div>
        <div class="levelup-sparkles">🌟 ⚔️ 🌟</div>
        <h2 class="levelup-title">축하합니다! 레벨 ${newLevel} 달성!</h2>
        <p class="levelup-desc">지식의 힘이 깊어져 수호자의 능력치가 대폭 상승했습니다!</p>
        <div class="stat-boost-grid">
          <div class="stat-boost-item"><span>최대 체력</span> <strong>+20</strong></div>
          <div class="stat-boost-item"><span>공격력</span> <strong>+5</strong></div>
          <div class="stat-boost-item"><span>방어력</span> <strong>+3</strong></div>
          <div class="stat-boost-item"><span>보너스 보상</span> <strong>+100 골드</strong></div>
        </div>
        <button class="btn btn-primary btn-glow" id="btn-close-levelup">모험 계속하기</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('btn-close-levelup').addEventListener('click', () => {
      this.sfx.play('click');
      modal.remove();
    });
  }

  // ================= 1. 게임 마을 홈 뷰 =================
  renderHome(container) {
    if (this.villageMap) {
      this.villageMap.destroy();
      this.villageMap = null;
    }

    const p = this.state.player;
    const activeQuests = this.state.quests.slice(0, 2);
    const is2D = this.villageViewMode === '2d';

    container.innerHTML = `
      <div class="home-view-grid">
        ${is2D ? `
          <!-- 2D 실시간 RPG 마을 맵 섹션 -->
          <div class="village-2d-section card rpg-card">
            <div class="village-2d-header">
              <div class="village-2d-title-group">
                <span class="village-badge">⚔️ 2D 실시간 마을 모험</span>
                <div class="village-2d-title">
                  <h3>아카데미 왕국 마을</h3>
                </div>
              </div>
              <div class="village-2d-controls-hint">
                <span class="control-key-badge">방향키 / WASD / 터치</span> 로 이동
                <span class="control-key-badge">Space / 클릭</span> 으로 건물 입장
              </div>
              <div class="village-mode-toggles" style="display: flex; gap: 8px;">
                <button class="btn btn-sm btn-secondary" id="btn-toggle-time" title="낮/밤 모드 전환">
                  ☀️ 낮 / 🌙 밤
                </button>
                <button class="btn btn-sm btn-secondary" id="btn-toggle-dpad" title="가상 D-패드 조이스틱 켜기/끄기">
                  🎮 조이스틱 ON/OFF
                </button>
                <button class="btn btn-sm btn-secondary" id="btn-toggle-village-mode" title="뷰 모드 전환">
                  🖼️ 클래식 배너로 보기
                </button>
              </div>
            </div>

            <div class="village-canvas-wrapper" id="village-canvas-wrapper">
              <canvas id="village-canvas" width="960" height="540"></canvas>

              <!-- 모바일 / 터치 가상 D-Pad 컨트롤러 및 액션 버튼 (데스크톱 기본 숨김) -->
              <div class="village-touch-controls desktop-hidden" id="village-touch-controls">
                <div class="d-pad">
                  <button class="d-btn d-up" data-dir="up" aria-label="위로 이동">▲</button>
                  <div class="d-middle">
                    <button class="d-btn d-left" data-dir="left" aria-label="왼쪽으로 이동">◀</button>
                    <div class="d-center"></div>
                    <button class="d-btn d-right" data-dir="right" aria-label="오른쪽으로 이동">▶</button>
                  </div>
                  <button class="d-btn d-down" data-dir="down" aria-label="아래로 이동">▼</button>
                </div>
                <button class="action-btn" id="village-action-btn">
                  <span class="action-btn-icon">⚡</span>
                  <span class="action-btn-text">입장 / 대화</span>
                </button>
              </div>

              <!-- 하단 상호작용 알림 툴팁 바 -->
              <div class="village-interact-bar hidden" id="village-interact-bar">
                <span class="interact-icon" id="village-interact-icon">📚</span>
                <span class="interact-text" id="village-interact-text">아카데미에 입장하려면 [Space] 또는 여기를 누르세요!</span>
              </div>
            </div>
          </div>
        ` : `
          <!-- 클래식 메인 마을 배너 -->
          <div class="village-hero-card">
            <div class="hero-bg-overlay"></div>
            <img src="assets/images/village_bg.jpg" alt="Study Quest Village" class="village-bg-img" />
            <div class="village-hero-content">
              <div class="tag-badge">🛡️ 지식의 아카데미 영지</div>
              <h1 class="village-title">환영합니다, ${p.name} 수호자님!</h1>
              <p class="village-subtitle">오늘도 배움의 퀘스트를 달성하고 나태의 마물을 물리치세요.</p>
              <div class="hero-action-buttons">
                <button class="btn btn-primary btn-glow btn-lg" id="btn-quick-study">
                  <span>📚 오늘의 퀴즈 학습</span>
                </button>
                <button class="btn btn-danger btn-glow btn-lg" id="btn-quick-battle">
                  <span>⚔️ 몬스터 토벌 출정</span>
                </button>
                <button class="btn btn-secondary btn-lg" id="btn-toggle-village-mode">
                  <span>🗺️ 2D 마을 탐험하기</span>
                </button>
              </div>
            </div>
          </div>
        `}

        <!-- 3열 반응형 섹션 (캐릭터 정보, 퀘스트, 빠른 통계) -->
        <div class="home-sub-grid">
          <!-- 캐릭터 카드 -->
          <div class="card rpg-card character-preview-card">
            <div class="card-header">
              <h3><span class="icon">👤</span> 내 캐릭터</h3>
              <span class="badge badge-accent">${p.title}</span>
            </div>
            <div class="character-display">
              <div class="avatar-wrapper">
                <img src="assets/images/hero.jpg" alt="캐릭터 아바타" class="hero-avatar-img" />
                <span class="avatar-level-badge">Lv.${p.level}</span>
              </div>
              <div class="character-meta">
                <h4 class="hero-name">${p.name}</h4>
                <div class="exp-bar-container">
                  <div class="exp-info">
                    <span>경험치</span>
                    <span>${p.exp} / ${p.maxExp} EXP (${Math.floor((p.exp / p.maxExp) * 100)}%)</span>
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill exp-fill" style="width: ${(p.exp / p.maxExp) * 100}%"></div>
                  </div>
                </div>
                <div class="hero-combat-stats">
                  <div class="combat-stat-pill">❤️ HP ${p.hp}/${p.maxHp}</div>
                  <div class="combat-stat-pill">⚔️ ATK ${p.atk}</div>
                  <div class="combat-stat-pill">🛡️ DEF ${p.def}</div>
                </div>
              </div>
            </div>
            <button class="btn btn-secondary btn-block mt-2" data-nav="inventory">
              🎒 장비 & 인벤토리 관리
            </button>
          </div>

          <!-- 오늘의 퀘스트 카드 -->
          <div class="card rpg-card quests-preview-card">
            <div class="card-header">
              <h3><span class="icon">📜</span> 오늘의 퀘스트</h3>
              <button class="btn-text" data-nav="quests">전체보기 &rarr;</button>
            </div>
            <div class="quest-list">
              ${activeQuests.map(q => `
                <div class="quest-item ${q.completed ? 'ready' : ''}">
                  <div class="quest-icon">${q.icon}</div>
                  <div class="quest-details">
                    <div class="quest-title-row">
                      <strong>${q.title}</strong>
                      <span class="quest-progress-badge ${q.completed ? 'badge-success' : 'badge-neutral'}">
                        ${q.completed ? '완료!' : `${q.current}/${q.target}`}
                      </span>
                    </div>
                    <p class="quest-desc">${q.desc}</p>
                    <div class="progress-bar mini-bar">
                      <div class="progress-fill" style="width: ${Math.min(100, (q.current / q.target) * 100)}%"></div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="btn btn-secondary btn-block mt-2" data-nav="quests">
              ✨ 퀘스트 보상 수령하러 가기
            </button>
          </div>

          <!-- 오늘 학습 브리핑 카드 -->
          <div class="card rpg-card study-summary-card">
            <div class="card-header">
              <h3><span class="icon">📊</span> 오늘의 학습 성취</h3>
              <button class="btn-text" data-nav="stats">통계보기 &rarr;</button>
            </div>
            <div class="summary-stats-grid">
              <div class="summary-stat-box">
                <span class="summary-label">오늘 공부 시간</span>
                <span class="summary-value" id="home-study-mins">${p.studyMinutesToday}분</span>
              </div>
              <div class="summary-stat-box">
                <span class="summary-label">풀이 문제 수</span>
                <span class="summary-value">${p.totalQuestions}개</span>
              </div>
              <div class="summary-stat-box">
                <span class="summary-label">정답률</span>
                <span class="summary-value text-accent">${p.totalQuestions > 0 ? Math.round((p.correctQuestions / p.totalQuestions) * 100) : 0}%</span>
              </div>
              <div class="summary-stat-box">
                <span class="summary-label">연속 출석</span>
                <span class="summary-value text-warning">🔥 ${p.streakDays}일차</span>
              </div>
            </div>
            <button class="btn btn-accent btn-block mt-2" data-nav="stats">
              ⏱️ 학습 타이머 열기
            </button>
          </div>
        </div>
      </div>
    `;

    // 2D 캔버스 초기화
    if (is2D) {
      const canvas = document.getElementById('village-canvas');
      if (canvas && window.VillageMap2D) {
        this.villageMap = new VillageMap2D(canvas, this);
      }
    }

    // 낮 / 밤 모드 토글
    document.getElementById('btn-toggle-time')?.addEventListener('click', () => {
      if (this.villageMap) {
        this.villageMap.timeOfDay = this.villageMap.timeOfDay === 'day' ? 'night' : 'day';
        localStorage.setItem('study_quest_time_of_day', this.villageMap.timeOfDay);
        this.sfx.play('click');
        this.showToast(this.villageMap.timeOfDay === 'night' ? '🌙 마을에 은은한 밤이 찾아왔습니다. 반딧불이가 날아다닙니다!' : '☀️ 마을에 화사한 아침 햇살이 비춥니다!', 'normal');
      }
    });

    // 조이스틱 토글
    document.getElementById('btn-toggle-dpad')?.addEventListener('click', () => {
      const controls = document.getElementById('village-touch-controls');
      if (controls) {
        controls.classList.toggle('desktop-hidden');
        this.sfx.play('click');
      }
    });

    // 뷰 모드 토글
    document.getElementById('btn-toggle-village-mode')?.addEventListener('click', () => {
      this.villageViewMode = this.villageViewMode === '2d' ? 'classic' : '2d';
      localStorage.setItem('study_quest_home_mode', this.villageViewMode);
      this.sfx.play('click');
      this.renderHome(container);
    });

    document.getElementById('btn-quick-study')?.addEventListener('click', () => {
      this.sfx.play('click');
      this.navigateTo('subjects');
    });

    document.getElementById('btn-quick-battle')?.addEventListener('click', () => {
      this.sfx.play('click');
      this.navigateTo('battle');
    });

    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        this.sfx.play('click');
        this.navigateTo(el.getAttribute('data-nav'));
      });
    });
  }

  // ================= 2. 과목 선택 뷰 =================
  renderSubjects(container) {
    const subjects = this.state.subjects;
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2>📚 학습 과목 선택</h2>
          <p class="section-desc">도전할 과목을 선택하고 스테이지 퀘스트 문제를 해결하세요.</p>
        </div>
      </div>
      <div class="subject-card-grid">
        ${Object.keys(subjects).map(subKey => {
          const sub = subjects[subKey];
          return `
            <div class="card rpg-card subject-card" style="border-top: 4px solid ${sub.color}">
              <div class="subject-header">
                <span class="subject-icon">${sub.icon}</span>
                <div class="subject-title-area">
                  <h3>${sub.name}</h3>
                  <span class="badge" style="background:${sub.color}22; color:${sub.color}">중등 기본</span>
                </div>
              </div>
              <p class="subject-desc">${sub.desc}</p>
              <div class="stage-info-box">
                <div class="stage-label">
                  <span>진행 스테이지</span>
                  <strong>Stage ${sub.currentStage} / ${sub.totalStages}</strong>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(sub.currentStage / sub.totalStages) * 100}%; background: ${sub.color}"></div>
                </div>
                <span class="question-count-text">준비된 퀴즈: ${sub.questions.length}문항</span>
              </div>
              <div class="subject-action-area">
                <button class="btn btn-primary btn-block btn-study-start" data-subject="${subKey}">
                  ✍️ ${sub.name} 퀴즈 시작 (+EXP)
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-study-start').forEach(btn => {
      btn.addEventListener('click', () => {
        const subKey = btn.getAttribute('data-subject');
        this.sfx.play('click');
        this.navigateTo('quiz', { subject: subKey, index: 0 });
      });
    });
  }

  // ================= 3. 학습 문제 (퀴즈) 뷰 =================
  renderQuiz(container, payload) {
    const subKey = payload?.subject || 'math';
    const sub = this.state.subjects[subKey];
    const index = payload?.index || 0;
    const question = sub.questions[index];

    if (!question) {
      // 모든 문제를 다 푼 경우
      this.renderQuizCompletion(container, sub);
      return;
    }

    container.innerHTML = `
      <div class="quiz-container">
        <div class="quiz-header-bar">
          <button class="btn btn-sm btn-secondary" id="btn-back-subjects">&larr; 과목 목록</button>
          <div class="quiz-progress-indicator">
            <span class="subject-badge" style="background:${sub.color}33; color:${sub.color}">${sub.icon} ${sub.name}</span>
            <span>문항 <strong>${index + 1}</strong> / ${sub.questions.length}</span>
          </div>
          <div class="quiz-reward-preview">🎁 보상: +20 EXP, +30G</div>
        </div>

        <div class="card rpg-card question-box">
          <div class="question-number-pill">QUESTION #${index + 1}</div>
          <h2 class="question-text">${question.question.replace(/\n/g, '<br>')}</h2>
        </div>

        <div class="options-grid">
          ${question.options.map((opt, optIdx) => `
            <button class="quiz-option-card" data-opt="${optIdx}">
              <span class="option-marker">${['①', '②', '③', '④'][optIdx]}</span>
              <span class="option-text">${opt}</span>
            </button>
          `).join('')}
        </div>

        <!-- 해설 결과 패널 (처음엔 숨김) -->
        <div class="card rpg-card explanation-panel hidden" id="explanation-panel">
          <div class="explanation-status" id="explanation-status"></div>
          <p class="explanation-text" id="explanation-text">${question.explanation}</p>
          <button class="btn btn-primary btn-block mt-3" id="btn-next-question">
            ${index + 1 < sub.questions.length ? '다음 문제로 진행 &rarr;' : '과목 스테이지 완료하기 🏆'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btn-back-subjects')?.addEventListener('click', () => {
      this.sfx.play('click');
      this.navigateTo('subjects');
    });

    const optionCards = container.querySelectorAll('.quiz-option-card');
    const expPanel = document.getElementById('explanation-panel');
    const expStatus = document.getElementById('explanation-status');
    const nextBtn = document.getElementById('btn-next-question');

    let answered = false;

    optionCards.forEach(card => {
      card.addEventListener('click', () => {
        if (answered) return;
        answered = true;

        const selectedIdx = parseInt(card.getAttribute('data-opt'), 10);
        const isCorrect = selectedIdx === question.answer;

        this.state.player.totalQuestions += 1;

        if (isCorrect) {
          card.classList.add('correct');
          this.sfx.play('correct');
          this.state.player.correctQuestions += 1;
          this.addExp(20);
          this.addGold(30);

          // 퀘스트 진행도 갱신
          this.updateQuestProgress(subKey, 1);

          expStatus.innerHTML = `
            <span class="status-icon text-success">🎉 정답입니다!</span>
            <span class="status-reward">+20 EXP & +30 골드 지급 완료!</span>
          `;
        } else {
          card.classList.add('wrong');
          this.sfx.play('wrong');
          // 정답 카드 표시
          optionCards[question.answer]?.classList.add('correct');
          expStatus.innerHTML = `
            <span class="status-icon text-danger">⚠️ 아쉽습니다! 오답입니다.</span>
            <span class="status-reward">정답 해설을 꼼꼼히 확인해 보세요!</span>
          `;
        }

        this.saveState();
        expPanel.classList.remove('hidden');
        expPanel.scrollIntoView({ behavior: 'smooth' });
      });
    });

    nextBtn?.addEventListener('click', () => {
      this.sfx.play('click');
      this.navigateTo('quiz', { subject: subKey, index: index + 1 });
    });
  }

  renderQuizCompletion(container, sub) {
    this.sfx.play('levelUp');
    container.innerHTML = `
      <div class="card rpg-card text-center completion-card">
        <div class="trophy-icon">🏆</div>
        <h2>${sub.name} 스테이지 학습 완료!</h2>
        <p class="completion-desc">준비된 모든 문항을 성실하게 해결하셨습니다.<br>성장한 지식으로 몬스터 토벌에 나서거나 다른 과목에 도전해 보세요!</p>
        <div class="completion-rewards">
          <div class="reward-pill">✨ 보너스 +50 EXP</div>
          <div class="reward-pill">💰 보너스 +100 골드</div>
        </div>
        <div class="d-flex justify-center gap-3 mt-4">
          <button class="btn btn-secondary" id="btn-back-to-subjects">다른 과목 선택</button>
          <button class="btn btn-danger btn-glow" id="btn-go-battle">몬스터 전투 출정 ⚔️</button>
        </div>
      </div>
    `;

    this.addExp(50);
    this.addGold(100);

    document.getElementById('btn-back-to-subjects')?.addEventListener('click', () => {
      this.sfx.play('click');
      this.navigateTo('subjects');
    });
    document.getElementById('btn-go-battle')?.addEventListener('click', () => {
      this.sfx.play('click');
      this.navigateTo('battle');
    });
  }

  // ================= 4. 몬스터 전투 뷰 =================
  renderBattle(container, payload) {
    const monsters = this.state.monsters;
    const selectedMonsterId = payload?.monsterId || monsters[0].id;
    const monster = monsters.find(m => m.id === selectedMonsterId) || monsters[0];
    this.activeMonster = monster;
    this.monsterCurrentHp = monster.maxHp;

    const p = this.state.player;

    container.innerHTML = `
      <div class="battle-arena-container">
        <!-- 상단 몬스터 선택 탭 -->
        <div class="monster-select-tabs">
          ${monsters.map(m => `
            <button class="monster-tab-btn ${m.id === monster.id ? 'active' : ''}" data-monid="${m.id}">
              <span>${m.icon} ${m.name} (Lv.${m.level})</span>
            </button>
          `).join('')}
        </div>

        <!-- 전투 전장 디스플레이 -->
        <div class="battle-stage-card card rpg-card">
          <div class="battle-stage-bg"></div>

          <!-- 몬스터 영역 -->
          <div class="battle-entity monster-entity" id="monster-entity">
            <div class="entity-status-card">
              <div class="d-flex justify-between">
                <strong>${monster.name}</strong>
                <span class="badge badge-danger">Lv.${monster.level}</span>
              </div>
              <div class="progress-bar hp-bar">
                <div class="progress-fill hp-fill" id="monster-hp-bar" style="width: 100%"></div>
              </div>
              <div class="hp-text" id="monster-hp-text">${this.monsterCurrentHp} / ${monster.maxHp} HP</div>
            </div>
            <div class="entity-sprite-box monster-sprite" id="monster-sprite">
              <div class="monster-avatar-big" style="color:${monster.color}">
                ${monster.icon}
              </div>
              <div class="floating-damage" id="monster-damage"></div>
            </div>
          </div>

          <!-- VS 배너 -->
          <div class="battle-vs-divider">VS</div>

          <!-- 플레이어 수호자 영역 -->
          <div class="battle-entity player-entity" id="player-entity">
            <div class="entity-sprite-box player-sprite" id="player-sprite">
              <img src="assets/images/hero.jpg" alt="Hero" class="battle-hero-img" />
              <div class="floating-damage" id="player-damage"></div>
            </div>
            <div class="entity-status-card">
              <div class="d-flex justify-between">
                <strong>${p.name}</strong>
                <span class="badge badge-accent">Lv.${p.level}</span>
              </div>
              <div class="progress-bar hp-bar">
                <div class="progress-fill hp-fill" id="player-hp-bar" style="width: ${(p.hp / p.maxHp) * 100}%"></div>
              </div>
              <div class="hp-text" id="player-hp-text">${p.hp} / ${p.maxHp} HP</div>
            </div>
          </div>
        </div>

        <!-- 전투 커맨드 / 퀴즈 공격 영역 -->
        <div class="card rpg-card battle-command-panel">
          <div class="battle-instruction">
            <h3>⚔️ 학습 마법 영창</h3>
            <p>문제를 맞히면 수호자가 강력한 마법 공격을 시전합니다! (틀리면 몬스터의 반격을 받습니다)</p>
          </div>
          <div id="battle-quiz-box" class="battle-quiz-area">
            <!-- 동적 퀴즈 주입 -->
          </div>
        </div>
      </div>
    `;

    // 몬스터 탭 이벤트
    container.querySelectorAll('.monster-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.sfx.play('click');
        this.navigateTo('battle', { monsterId: btn.getAttribute('data-monid') });
      });
    });

    this.spawnBattleQuestion();
  }

  spawnBattleQuestion() {
    const quizArea = document.getElementById('battle-quiz-box');
    if (!quizArea || !this.activeMonster) return;

    // 해당 몬스터의 과목 문제 가져오기
    const subKey = this.activeMonster.subject || 'math';
    const sub = this.state.subjects[subKey];
    const randomIndex = Math.floor(Math.random() * sub.questions.length);
    const q = sub.questions[randomIndex];

    quizArea.innerHTML = `
      <div class="battle-question-text">
        <span class="badge" style="background:${sub.color}33; color:${sub.color}">${sub.icon} ${sub.name} 영창 퀴즈</span>
        <h4 class="mt-2">${q.question.replace(/\n/g, '<br>')}</h4>
      </div>
      <div class="battle-options-grid">
        ${q.options.map((opt, idx) => `
          <button class="btn btn-secondary battle-opt-btn" data-opt="${idx}">
            ${['①', '②', '③', '④'][idx]} ${opt}
          </button>
        `).join('')}
      </div>
    `;

    let actionTaken = false;
    quizArea.querySelectorAll('.battle-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (actionTaken) return;
        actionTaken = true;

        const chosen = parseInt(btn.getAttribute('data-opt'), 10);
        const isCorrect = chosen === q.answer;

        if (isCorrect) {
          btn.classList.add('correct');
          this.executePlayerAttack(q);
        } else {
          btn.classList.add('wrong');
          this.executeMonsterAttack(q);
        }
      });
    });
  }

  executePlayerAttack(q) {
    this.sfx.play('attack');
    const p = this.state.player;
    const damage = Math.round(p.atk * 1.5 + Math.random() * 10);
    this.monsterCurrentHp = Math.max(0, this.monsterCurrentHp - damage);

    // 몬스터 피격 이펙트
    const monSprite = document.getElementById('monster-sprite');
    const monDmg = document.getElementById('monster-damage');
    if (monSprite) {
      monSprite.classList.add('hit-shake');
      setTimeout(() => monSprite.classList.remove('hit-shake'), 400);
    }
    if (monDmg) {
      monDmg.textContent = `-${damage} CRITICAL!`;
      monDmg.classList.add('show-dmg');
      setTimeout(() => monDmg.classList.remove('show-dmg'), 800);
    }

    // 몬스터 체력 갱신
    const hpBar = document.getElementById('monster-hp-bar');
    const hpText = document.getElementById('monster-hp-text');
    if (hpBar) hpBar.style.width = `${(this.monsterCurrentHp / this.activeMonster.maxHp) * 100}%`;
    if (hpText) hpText.textContent = `${this.monsterCurrentHp} / ${this.activeMonster.maxHp} HP`;

    if (this.monsterCurrentHp <= 0) {
      setTimeout(() => this.showVictoryModal(), 600);
    } else {
      setTimeout(() => this.spawnBattleQuestion(), 1000);
    }
  }

  executeMonsterAttack(q) {
    this.sfx.play('wrong');
    const p = this.state.player;
    const damage = Math.max(5, this.activeMonster.atk - Math.floor(p.def / 2));
    p.hp = Math.max(1, p.hp - damage);

    // 플레이어 피격 이펙트
    const playerSprite = document.getElementById('player-sprite');
    const playerDmg = document.getElementById('player-damage');
    if (playerSprite) {
      playerSprite.classList.add('hit-shake');
      setTimeout(() => playerSprite.classList.remove('hit-shake'), 400);
    }
    if (playerDmg) {
      playerDmg.textContent = `-${damage}`;
      playerDmg.classList.add('show-dmg');
      setTimeout(() => playerDmg.classList.remove('show-dmg'), 800);
    }

    const playerHpBar = document.getElementById('player-hp-bar');
    const playerHpText = document.getElementById('player-hp-text');
    if (playerHpBar) playerHpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
    if (playerHpText) playerHpText.textContent = `${p.hp} / ${p.maxHp} HP`;

    this.showToast(`몬스터의 반격! -${damage} 피해를 입었습니다. (정답: ${q.options[q.answer]})`, 'danger');
    this.saveState();

    setTimeout(() => this.spawnBattleQuestion(), 1500);
  }

  showVictoryModal() {
    this.sfx.play('levelUp');
    const mon = this.activeMonster;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `
      <div class="modal-card bounce-in text-center">
        <div class="victory-banner">VICTORY!</div>
        <h2>${mon.name} 토벌 성공!</h2>
        <p class="mt-2 text-muted">훌륭합니다! 올바른 학습 마법으로 몬스터를 정화했습니다.</p>
        <div class="loot-box mt-3">
          <h4>전리품 획득</h4>
          <div class="loot-items">
            <span class="loot-tag">✨ +${mon.reward.exp} EXP</span>
            <span class="loot-tag">💰 +${mon.reward.gold} 골드</span>
            ${mon.reward.gems ? `<span class="loot-tag">💎 +${mon.reward.gems} 보석</span>` : ''}
          </div>
        </div>
        <button class="btn btn-primary btn-glow mt-4" id="btn-victory-claim">마을로 귀환하기</button>
      </div>
    `;
    document.body.appendChild(modal);

    this.addExp(mon.reward.exp);
    this.addGold(mon.reward.gold);
    if (mon.reward.gems) {
      this.state.player.gems += mon.reward.gems;
    }

    // 몬스터 토벌 퀘스트 진행도 갱신
    this.updateQuestProgress('battle', 1);

    document.getElementById('btn-victory-claim')?.addEventListener('click', () => {
      this.sfx.play('click');
      modal.remove();
      this.navigateTo('home');
    });
  }

  // ================= 5. 퀘스트 뷰 =================
  renderQuests(container) {
    const quests = this.state.quests;
    container.innerHTML = `
      <div class="section-header">
        <div>
          <h2>📜 오늘의 퀘스트</h2>
          <p class="section-desc">학습 미션을 수행하고 풍성한 경험치와 장비 강화 골드를 수령하세요.</p>
        </div>
      </div>
      <div class="quests-grid">
        ${quests.map(q => `
          <div class="card rpg-card quest-card ${q.claimed ? 'claimed' : q.completed ? 'ready' : ''}">
            <div class="quest-card-top">
              <span class="quest-large-icon">${q.icon}</span>
              <div class="quest-main-info">
                <h3>${q.title}</h3>
                <p class="quest-desc">${q.desc}</p>
              </div>
              <div class="quest-status-badge">
                ${q.claimed ? '<span class="badge badge-neutral">수령 완료</span>' : 
                  q.completed ? '<span class="badge badge-success">달성 완료!</span>' : 
                  `<span class="badge badge-accent">${q.current} / ${q.target}</span>`}
              </div>
            </div>

            <div class="progress-bar mt-2">
              <div class="progress-fill" style="width: ${Math.min(100, (q.current / q.target) * 100)}%"></div>
            </div>

            <div class="quest-rewards-bar mt-3">
              <div class="reward-tags">
                <span class="reward-pill">✨ +${q.reward.exp} EXP</span>
                <span class="reward-pill">💰 +${q.reward.gold} G</span>
                ${q.reward.gems ? `<span class="reward-pill">💎 +${q.reward.gems} 보석</span>` : ''}
              </div>
              <div>
                ${q.claimed ? `
                  <button class="btn btn-secondary btn-sm" disabled>완료됨</button>
                ` : q.completed ? `
                  <button class="btn btn-primary btn-glow btn-sm btn-claim-quest" data-qid="${q.id}">
                    🎁 보상 받기
                  </button>
                ` : `
                  <button class="btn btn-secondary btn-sm" data-nav="subjects">
                    도전하기 &rarr;
                  </button>
                `}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.btn-claim-quest').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.getAttribute('data-qid');
        this.claimQuest(qid);
      });
    });

    container.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        this.sfx.play('click');
        this.navigateTo(el.getAttribute('data-nav'));
      });
    });
  }

  updateQuestProgress(subject, amount) {
    this.state.quests.forEach(q => {
      if (q.subject === subject && !q.completed) {
        q.current += amount;
        if (q.current >= q.target) {
          q.current = q.target;
          q.completed = true;
          this.showToast(`🎉 퀘스트 달성! [${q.title}]`, 'quest');
        }
      }
    });
    this.saveState();
  }

  claimQuest(qid) {
    const q = this.state.quests.find(item => item.id === qid);
    if (!q || !q.completed || q.claimed) return;

    q.claimed = true;
    this.sfx.play('coin');
    this.addExp(q.reward.exp);
    this.addGold(q.reward.gold);
    if (q.reward.gems) {
      this.state.player.gems += q.reward.gems;
    }
    this.saveState();
    this.renderQuests(document.getElementById('view-container'));
  }

  // ================= 6. 인벤토리 및 장비 뷰 =================
  renderInventory(container) {
    const inv = this.state.inventory;
    const eq = this.state.equipped;

    const wpn = inv.find(i => i.id === eq.weapon);
    const arm = inv.find(i => i.id === eq.armor);
    const acc = inv.find(i => i.id === eq.accessory);

    container.innerHTML = `
      <div class="inventory-layout">
        <!-- 좌측: 현재 장착 장비 및 캐릭터 스탯 -->
        <div class="card rpg-card equipped-panel">
          <div class="card-header">
            <h3><span class="icon">🛡️</span> 장착 장비</h3>
          </div>
          <div class="equipped-slots-grid">
            <div class="equip-slot">
              <span class="slot-type">무기</span>
              <div class="slot-item-card">
                <span class="slot-icon">${wpn ? wpn.icon : '⚔️'}</span>
                <div>
                  <strong>${wpn ? wpn.name : '미장착'}</strong>
                  <div class="text-sm text-accent">${wpn ? wpn.stat : '-'}</div>
                </div>
              </div>
            </div>

            <div class="equip-slot">
              <span class="slot-type">갑옷/교복</span>
              <div class="slot-item-card">
                <span class="slot-icon">${arm ? arm.icon : '🥋'}</span>
                <div>
                  <strong>${arm ? arm.name : '미장착'}</strong>
                  <div class="text-sm text-accent">${arm ? arm.stat : '-'}</div>
                </div>
              </div>
            </div>

            <div class="equip-slot">
              <span class="slot-type">장신구</span>
              <div class="slot-item-card">
                <span class="slot-icon">${acc ? acc.icon : '💍'}</span>
                <div>
                  <strong>${acc ? acc.name : '미장착'}</strong>
                  <div class="text-sm text-accent">${acc ? acc.stat : '-'}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="character-preview-center mt-3">
            <img src="assets/images/hero.jpg" alt="Hero" class="inventory-hero-img" />
          </div>
        </div>

        <!-- 우측: 가방 인벤토리 아이템 그리드 -->
        <div class="card rpg-card bag-panel">
          <div class="card-header">
            <h3><span class="icon">🎒</span> 보관함 아이템</h3>
            <span class="badge badge-neutral">${inv.length}종 보유</span>
          </div>
          <div class="item-grid">
            ${inv.map(item => {
              const isEquipped = item.id === eq.weapon || item.id === eq.armor || item.id === eq.accessory;
              return `
                <div class="item-card grade-${item.grade} ${isEquipped ? 'is-equipped' : ''}" data-itemid="${item.id}">
                  <span class="item-icon-big">${item.icon}</span>
                  <div class="item-name">${item.name}</div>
                  <div class="item-stat-badge">${item.stat}</div>
                  ${isEquipped ? '<span class="equipped-tag">장착중</span>' : ''}
                  ${item.count ? `<span class="item-count-badge">x${item.count}</span>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- 아이템 상세 정보 및 버튼 -->
          <div class="item-detail-box" id="item-detail-box">
            <p class="text-center text-muted">아이템을 클릭하면 세부 정보와 장착/사용 메뉴가 나타납니다.</p>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => {
        const itemId = card.getAttribute('data-itemid');
        this.sfx.play('click');
        this.showItemDetail(itemId);
      });
    });
  }

  showItemDetail(itemId) {
    const item = this.state.inventory.find(i => i.id === itemId);
    const detailBox = document.getElementById('item-detail-box');
    if (!item || !detailBox) return;

    const eq = this.state.equipped;
    const isEquipped = item.id === eq.weapon || item.id === eq.armor || item.id === eq.accessory;

    detailBox.innerHTML = `
      <div class="d-flex justify-between align-center">
        <div class="d-flex align-center gap-2">
          <span style="font-size: 2rem;">${item.icon}</span>
          <div>
            <h4>${item.name}</h4>
            <span class="badge badge-accent">${item.stat}</span>
          </div>
        </div>
        <div>
          ${item.type === 'consumable' ? `
            <button class="btn btn-primary btn-sm" id="btn-use-item">🧪 사용하기</button>
          ` : isEquipped ? `
            <button class="btn btn-secondary btn-sm" id="btn-unequip-item">장착 해제</button>
          ` : `
            <button class="btn btn-primary btn-sm btn-glow" id="btn-equip-item">⚔️ 장착하기</button>
          `}
        </div>
      </div>
      <p class="mt-2 text-muted text-sm">${item.desc}</p>
    `;

    document.getElementById('btn-equip-item')?.addEventListener('click', () => {
      this.sfx.play('coin');
      if (item.type === 'weapon') eq.weapon = item.id;
      if (item.type === 'armor') eq.armor = item.id;
      if (item.type === 'accessory') eq.accessory = item.id;
      this.saveState();
      this.renderInventory(document.getElementById('view-container'));
      this.showToast(`[${item.name}] 장착 완료!`, 'normal');
    });

    document.getElementById('btn-unequip-item')?.addEventListener('click', () => {
      this.sfx.play('click');
      if (item.type === 'weapon') eq.weapon = null;
      if (item.type === 'armor') eq.armor = null;
      if (item.type === 'accessory') eq.accessory = null;
      this.saveState();
      this.renderInventory(document.getElementById('view-container'));
      this.showToast(`장착 해제되었습니다.`, 'normal');
    });

    document.getElementById('btn-use-item')?.addEventListener('click', () => {
      if (item.type === 'consumable' && item.count > 0) {
        this.sfx.play('coin');
        item.count -= 1;
        this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 50);
        if (item.count <= 0) {
          this.state.inventory = this.state.inventory.filter(i => i.id !== item.id);
        }
        this.saveState();
        this.renderInventory(document.getElementById('view-container'));
        this.showToast(`포션을 사용하여 HP 50 회복!`, 'normal');
      }
    });
  }

  // ================= 7. 학습 기록 & 타이머 뷰 =================
  renderStats(container) {
    const p = this.state.player;
    const history = this.state.studyStats.history;

    container.innerHTML = `
      <div class="stats-layout">
        <!-- 상단 공부 타이머 모듈 -->
        <div class="card rpg-card timer-card">
          <div class="timer-header">
            <h3><span class="icon">⏱️</span> 집중 공부 타이머</h3>
            <span class="badge badge-accent">실시간 학습 시간 측정</span>
          </div>
          <div class="timer-display" id="study-stopwatch">
            ${this.formatTime(this.timerSeconds)}
          </div>
          <div class="timer-controls">
            <button class="btn btn-primary btn-glow" id="btn-timer-toggle">
              ${this.isTimerRunning ? '⏸️ 일시정지' : '▶️ 공부 시작하기'}
            </button>
            <button class="btn btn-secondary" id="btn-timer-reset">
              🔄 초기화
            </button>
            <button class="btn btn-success" id="btn-timer-finish">
              ✨ 공부 완료 및 EXP 정산
            </button>
          </div>
        </div>

        <!-- 학습 통계 카드 2열 -->
        <div class="stats-detail-grid mt-4">
          <div class="card rpg-card">
            <h3><span class="icon">📈</span> 최근 학습 시간 추이</h3>
            <div class="chart-bars-container mt-3">
              ${history.map(h => `
                <div class="chart-bar-group">
                  <div class="chart-bar-wrapper">
                    <div class="chart-bar-fill" style="height: ${Math.min(100, (h.minutes / 60) * 100)}%"></div>
                  </div>
                  <span class="chart-bar-value">${h.minutes}분</span>
                  <span class="chart-bar-label">${h.date}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card rpg-card">
            <h3><span class="icon">🎯</span> 정답률 및 문제 풀이 현황</h3>
            <div class="accuracy-circle-box mt-3">
              <div class="accuracy-score">
                <span class="number">${p.totalQuestions > 0 ? Math.round((p.correctQuestions / p.totalQuestions) * 100) : 0}%</span>
                <span class="label">종합 정답률</span>
              </div>
              <div class="stats-breakdown-list">
                <div class="breakdown-item">
                  <span>총 풀이한 문제</span>
                  <strong>${p.totalQuestions} 문제</strong>
                </div>
                <div class="breakdown-item">
                  <span>정답 맞춘 문제</span>
                  <strong class="text-success">${p.correctQuestions} 문제</strong>
                </div>
                <div class="breakdown-item">
                  <span>오답 복습 필요</span>
                  <strong class="text-danger">${p.totalQuestions - p.correctQuestions} 문제</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindTimerButtons();
  }

  formatTime(totalSec) {
    const mins = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const secs = (totalSec % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  setupTimerControls() {
    // 백그라운드 타이머 지속
  }

  bindTimerButtons() {
    const toggleBtn = document.getElementById('btn-timer-toggle');
    const resetBtn = document.getElementById('btn-timer-reset');
    const finishBtn = document.getElementById('btn-timer-finish');
    const display = document.getElementById('study-stopwatch');

    toggleBtn?.addEventListener('click', () => {
      this.sfx.play('click');
      if (this.isTimerRunning) {
        clearInterval(this.timerInterval);
        this.isTimerRunning = false;
        toggleBtn.textContent = '▶️ 공부 재개하기';
      } else {
        this.isTimerRunning = true;
        toggleBtn.textContent = '⏸️ 일시정지';
        this.timerInterval = setInterval(() => {
          this.timerSeconds++;
          if (display) display.textContent = this.formatTime(this.timerSeconds);
        }, 1000);
      }
    });

    resetBtn?.addEventListener('click', () => {
      this.sfx.play('click');
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
      this.timerSeconds = 0;
      if (display) display.textContent = '00:00';
      if (toggleBtn) toggleBtn.textContent = '▶️ 공부 시작하기';
    });

    finishBtn?.addEventListener('click', () => {
      this.sfx.play('coin');
      const earnedMins = Math.max(1, Math.floor(this.timerSeconds / 60));
      clearInterval(this.timerInterval);
      this.isTimerRunning = false;
      this.timerSeconds = 0;
      if (display) display.textContent = '00:00';

      this.state.player.studyMinutesToday += earnedMins;
      const expReward = earnedMins * 10;
      const goldReward = earnedMins * 15;
      this.addExp(expReward);
      this.addGold(goldReward);
      this.showToast(`⏱️ ${earnedMins}분 공부 완료! +${expReward} EXP, +${goldReward} 골드 지급!`, 'quest');
      this.saveState();
      this.renderStats(document.getElementById('view-container'));
    });
  }

  // ================= 8. 설정 뷰 =================
  renderSettings(container) {
    container.innerHTML = `
      <div class="card rpg-card max-w-600 mx-auto">
        <div class="card-header">
          <h3><span class="icon">⚙️</span> 게임 및 계정 설정</h3>
        </div>
        <div class="settings-list">
          <div class="setting-item">
            <div>
              <strong>효과음 사운드</strong>
              <p class="text-sm text-muted">게임 효과음 및 배경 피드백 사운드 활성화</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="btn-setting-sound">
              ${this.sfx.enabled ? '🔊 활성화' : '🔇 음소거'}
            </button>
          </div>

          <div class="setting-item">
            <div>
              <strong>수호자 닉네임 변경</strong>
              <p class="text-sm text-muted">게임 내 표시되는 캐릭터 이름</p>
            </div>
            <div class="d-flex gap-2">
              <input type="text" id="input-player-name" class="input-dark" value="${this.state.player.name}" />
              <button class="btn btn-primary btn-sm" id="btn-save-name">저장</button>
            </div>
          </div>

          <div class="setting-item">
            <div>
              <strong>데이터 초기화</strong>
              <p class="text-sm text-muted">모든 진행 상태(레벨, 인벤토리, 퀘스트)를 초기 상태로 리셋합니다.</p>
            </div>
            <button class="btn btn-danger btn-sm" id="btn-reset-data">초기화</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-setting-sound')?.addEventListener('click', (e) => {
      this.sfx.enabled = !this.sfx.enabled;
      e.target.textContent = this.sfx.enabled ? '🔊 활성화' : '🔇 음소거';
      if (this.sfx.enabled) this.sfx.play('coin');
    });

    document.getElementById('btn-save-name')?.addEventListener('click', () => {
      const input = document.getElementById('input-player-name');
      if (input && input.value.trim()) {
        this.state.player.name = input.value.trim();
        this.saveState();
        this.sfx.play('coin');
        this.showToast(`닉네임이 '${this.state.player.name}'(으)로 변경되었습니다.`, 'normal');
      }
    });

    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
      if (confirm('정말로 게임 데이터를 초기화하시겠습니까? (이전 진행 기록이 삭제됩니다)')) {
        localStorage.removeItem('study_quest_saved_v1');
        this.state = JSON.parse(JSON.stringify(DEFAULT_GAME_DATA));
        this.saveState();
        this.sfx.play('click');
        this.showToast('데이터가 초기화되었습니다.', 'normal');
        this.navigateTo('home');
      }
    });
  }
}

// 애플리케이션 부트스트랩
document.addEventListener('DOMContentLoaded', () => {
  window.app = new StudyQuestApp();
  window.app.init();
});

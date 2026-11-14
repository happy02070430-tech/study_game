// Study Quest: 2D 반응형 탑다운 RPG 마을 시스템 (VillageMap2D)

// Canvas roundRect 안전 폴리필
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    if (!radii) radii = 0;
    let r = Array.isArray(radii) ? radii : [radii, radii, radii, radii];
    if (r.length === 1) r = [r[0], r[0], r[0], r[0]];
    const [tl, tr, br, bl] = r;
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + tr);
    this.lineTo(x + w, y + h - br);
    this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    this.lineTo(x + bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - bl);
    this.lineTo(x, y + tl);
    this.quadraticCurveTo(x, y, x + tl, y);
    this.closePath();
    return this;
  };
}

class VillageMap2D {
  constructor(canvas, app) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.app = app;
    this.running = false;
    this.lastTime = 0;
    this.animFrameId = null;

    // 가상 해상도 (16:9 비율 유지)
    this.virtualWidth = 960;
    this.virtualHeight = 540;

    // 플레이어 상태
    const savedPos = this.loadPlayerPos();
    this.player = {
      x: savedPos ? savedPos.x : 480,
      y: savedPos ? savedPos.y : 290,
      radius: 18,
      speed: 220,
      dir: savedPos ? savedPos.dir : 'down',
      isMoving: false,
      walkCycle: 0,
      particles: []
    };

    // 타겟 이동 (마우스/터치 클릭 이동)
    this.targetPos = null;

    // 키 입력 상태
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false
    };

    // 현재 근접한 상호작용 대상
    this.activeInteractable = null;

    // 건물 정의
    this.buildings = [
      {
        id: 'academy',
        name: '학습 아카데미',
        subtitle: '과목 선택 및 퀴즈 학습',
        nav: 'subjects',
        icon: '📚',
        x: 100,
        y: 60,
        w: 160,
        h: 120,
        doorX: 180,
        doorY: 180,
        color: '#2563eb',
        roofColor: '#1d4ed8',
        wallColor: '#1e293b'
      },
      {
        id: 'battle',
        name: '토벌 던전 게이트',
        subtitle: '나태의 마물 토벌 전투',
        nav: 'battle',
        icon: '⚔️',
        x: 700,
        y: 60,
        w: 160,
        h: 120,
        doorX: 780,
        doorY: 180,
        color: '#dc2626',
        roofColor: '#991b1b',
        wallColor: '#2b1818'
      },
      {
        id: 'stats',
        name: '지혜의 시계탑',
        subtitle: '공부 시간 타이머 & 통계',
        nav: 'stats',
        icon: '⏱️',
        x: 430,
        y: 40,
        w: 100,
        h: 130,
        doorX: 480,
        doorY: 170,
        color: '#d97706',
        roofColor: '#b45309',
        wallColor: '#332313'
      },
      {
        id: 'inventory',
        name: '명장 대장간 & 상점',
        subtitle: '장비 장착 및 가방 관리',
        nav: 'inventory',
        icon: '🎒',
        x: 100,
        y: 350,
        w: 160,
        h: 120,
        doorX: 180,
        doorY: 350,
        color: '#7c3aed',
        roofColor: '#5b21b6',
        wallColor: '#241b38'
      },
      {
        id: 'quests',
        name: '모험가 길드 게시판',
        subtitle: '오늘의 퀘스트 및 보상',
        nav: 'quests',
        icon: '📜',
        x: 700,
        y: 350,
        w: 160,
        h: 120,
        doorX: 780,
        doorY: 350,
        color: '#059669',
        roofColor: '#047857',
        wallColor: '#132e27'
      }
    ];

    // 중앙 분수대
    this.fountain = {
      x: 480,
      y: 280,
      radius: 36,
      particles: []
    };

    // NPC (현자 부엉이 오울리)
    this.npc = {
      id: 'owl',
      name: '현자 부엉이 오울리',
      icon: '🦉',
      x: 480,
      y: 375,
      radius: 20,
      quotes: [
        '환영하네! 배움의 모험을 떠날 준비가 되었는가?',
        '매일 조금씩 꾸준히 문제를 풀면 엄청난 보물이 기다린다네!',
        '수학 5문제를 풀고 골드를 모아 새 장비를 장착해보게!',
        '공부 타이머를 켜두고 집중하면 집중력 반지의 힘이 발휘되지.',
        '마을 구석구석에 숨겨진 보물상자와 황금 코인을 찾아보게!'
      ],
      quoteIndex: 0,
      showBubble: false,
      bubbleTimer: 0
    };

    // 필드 보물상자
    this.chests = [
      { id: 'c1', x: 60, y: 70, w: 32, h: 26, opened: false, gold: 40, gems: 2 },
      { id: 'c2', x: 900, y: 70, w: 32, h: 26, opened: false, gold: 50, gems: 3 },
      { id: 'c3', x: 900, y: 470, w: 32, h: 26, opened: false, gold: 35, gems: 1 }
    ];
    this.loadChests();

    // 길거리 리스폰 코인들
    this.coins = [
      { id: 1, x: 320, y: 160, collected: false, respawnTimer: 0 },
      { id: 2, x: 640, y: 160, collected: false, respawnTimer: 0 },
      { id: 3, x: 320, y: 390, collected: false, respawnTimer: 0 },
      { id: 4, x: 640, y: 390, collected: false, respawnTimer: 0 },
      { id: 5, x: 480, y: 480, collected: false, respawnTimer: 0 }
    ];

    // 필드 배회 몬스터 (충돌 시 즉석 퀴즈 배틀)
    this.inBattle = false;
    this.monsters = [
      {
        id: 'm1',
        name: '초보 나태 슬라임',
        icon: '🟢',
        homeX: 250,
        homeY: 270,
        x: 250,
        y: 270,
        radius: 18,
        hp: 30,
        maxHp: 30,
        angle: 0,
        respawnTimer: 0
      },
      {
        id: 'm2',
        name: '어둠의 꼬마 박쥐',
        icon: '🦇',
        homeX: 720,
        homeY: 270,
        x: 720,
        y: 270,
        radius: 18,
        hp: 40,
        maxHp: 40,
        angle: Math.PI,
        respawnTimer: 0
      },
      {
        id: 'm3',
        name: '호기심 아기여우',
        icon: '🦊',
        homeX: 480,
        homeY: 480,
        x: 480,
        y: 480,
        radius: 18,
        hp: 35,
        maxHp: 35,
        angle: Math.PI / 2,
        respawnTimer: 0
      }
    ];

    // 마법 펫 (플레이어를 따르고 코인을 자동 수집)
    this.pet = {
      x: this.player.x - 25,
      y: this.player.y + 10,
      radius: 12,
      anim: 0,
      name: '퐁이',
      icon: '🐲'
    };

    // 피버 모드 타이머
    this.feverTimer = 0;

    // 낮 / 밤 모드
    this.timeOfDay = localStorage.getItem('study_quest_time_of_day') || 'day';

    // 밤 반딧불이
    this.fireflies = Array.from({ length: 16 }, () => ({
      x: Math.random() * this.virtualWidth,
      y: Math.random() * this.virtualHeight,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      alpha: Math.random(),
      pulse: Math.random() * 5
    }));

    // 오답 정화 지하 감옥 비석
    this.jail = {
      id: 'jail',
      name: '오답 정화 지하 감옥',
      x: 885,
      y: 190,
      w: 55,
      h: 55
    };

    // 장식물 (나무, 꽃, 가로등)
    this.decorations = this.generateDecorations();

    // 이펙트 파티클
    this.sparkles = [];

    // 이벤트 리스너 바인딩
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundResize = this.resize.bind(this);

    this.init();
  }

  generateDecorations() {
    return [
      // 외곽 및 마을 나무들
      { type: 'tree', x: 40, y: 250, size: 28 },
      { type: 'tree', x: 920, y: 250, size: 28 },
      { type: 'tree', x: 320, y: 50, size: 24 },
      { type: 'tree', x: 640, y: 50, size: 24 },
      { type: 'tree', x: 50, y: 490, size: 26 },
      { type: 'tree', x: 340, y: 480, size: 24 },
      { type: 'tree', x: 620, y: 480, size: 24 },
      // 가로등
      { type: 'lamp', x: 340, y: 220 },
      { type: 'lamp', x: 620, y: 220 },
      { type: 'lamp', x: 340, y: 340 },
      { type: 'lamp', x: 620, y: 340 },
      // 화단/꽃들
      { type: 'flower', x: 290, y: 280, color: '#f43f5e' },
      { type: 'flower', x: 300, y: 295, color: '#fbbf24' },
      { type: 'flower', x: 670, y: 280, color: '#38bdf8' },
      { type: 'flower', x: 660, y: 295, color: '#ec4899' },
      { type: 'flower', x: 420, y: 420, color: '#fbbf24' },
      { type: 'flower', x: 540, y: 420, color: '#a855f7' }
    ];
  }

  init() {
    this.resize();
    window.addEventListener('resize', this.boundResize);
    // keydown을 window + document 양쪽에 등록 (포커스 문제 방어)
    window.addEventListener('keydown', this.boundKeyDown, { capture: true });
    window.addEventListener('keyup', this.boundKeyUp, { capture: true });
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);

    // Canvas에 포커스 가능하게 설정
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.style.outline = 'none';
    // 클릭 시 canvas로 포커스 복귀
    this.canvas.addEventListener('click', () => this.canvas.focus());
    this.canvas.addEventListener('touchstart', () => this.canvas.focus(), { passive: true });
    // 약간 딜레이 후 초기 포커스 (DOM 완전 로드 대기)
    setTimeout(() => { try { this.canvas.focus(); } catch(e){} }, 100);

    this.setupTouchControls();
    this.start();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = rect.width || this.virtualWidth;
    const targetH = Math.min(rect.width * (9 / 16), 560);

    this.canvas.style.width = `${targetW}px`;
    this.canvas.style.height = `${targetH}px`;
    this.canvas.width = targetW * dpr;
    this.canvas.height = targetH * dpr;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale((targetW / this.virtualWidth) * dpr, (targetH / this.virtualHeight) * dpr);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (timestamp) => {
      if (!this.running) return;
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  destroy() {
    this.stop();
    this.savePlayerPos();
    window.removeEventListener('resize', this.boundResize);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
  }

  loadPlayerPos() {
    try {
      const data = sessionStorage.getItem('study_quest_pos');
      if (data) return JSON.parse(data);
    } catch (e) {}
    return null;
  }

  savePlayerPos() {
    try {
      sessionStorage.setItem('study_quest_pos', JSON.stringify({
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        dir: this.player.dir
      }));
    } catch (e) {}
  }

  loadChests() {
    try {
      const saved = localStorage.getItem('study_quest_chests');
      if (saved) {
        const openedIds = JSON.parse(saved);
        this.chests.forEach(c => {
          if (openedIds.includes(c.id)) c.opened = true;
        });
      }
    } catch (e) {}
  }

  saveChests() {
    try {
      const openedIds = this.chests.filter(c => c.opened).map(c => c.id);
      localStorage.setItem('study_quest_chests', JSON.stringify(openedIds));
    } catch (e) {}
  }

  handleKeyDown(e) {
    // 텍스트 입력창 포커스 중일 때는 이동 방지 (BUTTON, SELECT 등은 허용)
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    let handled = true;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = true;
        this.targetPos = null;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = true;
        this.targetPos = null;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = true;
        this.targetPos = null;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = true;
        this.targetPos = null;
        break;
      case 'Space':
      case 'Enter':
      case 'KeyE':
        this.interact();
        break;
      default:
        handled = false;
    }
    if (handled && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = false;
        break;
    }
  }

  handlePointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.virtualWidth / rect.width;
    const scaleY = this.virtualHeight / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // 만약 건물이나 NPC, 상자를 직접 클릭했다면 해당 지점으로 이동하거나 즉시 상호작용
    let clickedObject = null;
    for (const b of this.buildings) {
      if (clickX >= b.x && clickX <= b.x + b.w && clickY >= b.y && clickY <= b.y + b.h) {
        clickedObject = b;
        break;
      }
    }
    if (!clickedObject) {
      const distNpc = Math.hypot(clickX - this.npc.x, clickY - this.npc.y);
      if (distNpc < 35) clickedObject = this.npc;
    }
    if (!clickedObject) {
      for (const c of this.chests) {
        if (Math.hypot(clickX - (c.x + c.w / 2), clickY - (c.y + c.h / 2)) < 30) {
          clickedObject = c;
          break;
        }
      }
    }

    if (clickedObject) {
      // 상호작용 가능한 거리 내인지 확인
      const targetInteractX = clickedObject.doorX || clickedObject.x;
      const targetInteractY = clickedObject.doorY || clickedObject.y;
      const dist = Math.hypot(this.player.x - targetInteractX, this.player.y - targetInteractY);

      if (dist < 75) {
        this.activeInteractable = clickedObject;
        this.interact();
        return;
      } else {
        this.targetPos = { x: targetInteractX, y: targetInteractY };
      }
    } else {
      this.targetPos = { x: clickX, y: clickY };
    }
  }

  setupTouchControls() {
    const container = document.getElementById('village-touch-controls');
    if (!container) return;

    const setupBtn = (selector, key) => {
      const btn = container.querySelector(selector);
      if (!btn) return;
      const start = (e) => {
        e.preventDefault();
        this.keys[key] = true;
        this.targetPos = null;
      };
      const end = (e) => {
        e.preventDefault();
        this.keys[key] = false;
      };
      btn.addEventListener('pointerdown', start);
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('pointerleave', end);
    };

    setupBtn('.d-up', 'up');
    setupBtn('.d-down', 'down');
    setupBtn('.d-left', 'left');
    setupBtn('.d-right', 'right');

    const actBtn = document.getElementById('village-action-btn');
    if (actBtn) {
      actBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.interact();
      });
    }

    const interactBar = document.getElementById('village-interact-bar');
    if (interactBar) {
      interactBar.addEventListener('click', () => {
        this.interact();
      });
    }
  }

  interact() {
    if (!this.activeInteractable) return;
    const target = this.activeInteractable;

    if (target.nav) {
      this.app.sfx.play('click');
      this.savePlayerPos();
      this.app.navigateTo(target.nav);
    } else if (target.id === 'owl') {
      this.app.sfx.play('correct');
      this.npc.showBubble = true;
      this.npc.bubbleTimer = 5;
      this.npc.quoteIndex = (this.npc.quoteIndex + 1) % this.npc.quotes.length;
      this.app.showToast(`🦉 오울리: "${this.npc.quotes[this.npc.quoteIndex]}"`, 'accent');
    } else if (target.gold !== undefined) {
      // 보물상자
      if (!target.opened) {
        target.opened = true;
        this.saveChests();
        this.app.sfx.play('coin');
        this.app.state.player.gold += target.gold;
        this.app.state.player.gems += target.gems;
        this.app.saveState();
        this.app.renderHeaderStats();

        // 반짝이 파티클 폭발
        for (let i = 0; i < 20; i++) {
          this.sparkles.push({
            x: target.x + target.w / 2,
            y: target.y + target.h / 2,
            vx: (Math.random() - 0.5) * 150,
            vy: (Math.random() - 0.5) * 150 - 50,
            color: Math.random() > 0.5 ? '#fbbf24' : '#ec4899',
            size: Math.random() * 4 + 2,
            alpha: 1,
            life: 1.2
          });
        }
        this.app.showToast(`🎁 보물상자 발견! 골드 +${target.gold} 💰, 보석 +${target.gems} 💎 획득!`, 'accent');
        this.updateInteractBar();
      }
    } else if (target.id === 'fountain') {
      this.wishAtFountain();
    } else if (target.id === 'jail') {
      this.openWrongNotesModal();
    }
  }

  wishAtFountain() {
    if (this.app.state.player.gold < 10) {
      this.app.showToast('🪙 골드가 부족합니다! (소원을 빌려면 10골드가 필요합니다)', 'warning');
      return;
    }
    this.app.state.player.gold -= 10;
    this.app.sfx.play('coin');
    setTimeout(() => this.app.sfx.play('levelUp'), 250);

    // 분수 요정 스파클 폭발
    for (let i = 0; i < 30; i++) {
      this.sparkles.push({
        x: this.fountain.x + (Math.random() - 0.5) * 30,
        y: this.fountain.y - 15 + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 160,
        vy: -Math.random() * 120 - 40,
        color: ['#38bdf8', '#fbbf24', '#ec4899'][Math.floor(Math.random() * 3)],
        size: Math.random() * 5 + 3,
        alpha: 1,
        life: 1.5
      });
    }

    const buffs = [
      {
        text: '⚡ "질풍의 걸음": 25초간 피버 스피드 발동!',
        action: () => { this.feverTimer = 25; }
      },
      {
        text: '💎 "분수의 요정": 행운의 보석 +2개를 획득했습니다!',
        action: () => { this.app.state.player.gems += 2; }
      },
      {
        text: '🛡️ "생명의 가호": 플레이어 체력이 가득 회복되었습니다!',
        action: () => { this.app.state.player.hp = this.app.state.player.maxHp; }
      }
    ];

    const chosen = buffs[Math.floor(Math.random() * buffs.length)];
    chosen.action();
    this.app.saveState();
    this.app.renderHeaderStats();
    this.app.showToast(`⛲ 분수대 소원: ${chosen.text}`, 'accent');
  }

  openWrongNotesModal() {
    const list = this.app.state.wrongNotes || [];
    if (list.length === 0) {
      this.app.sfx.play('click');
      this.app.showToast('🔒 오답 정화 감옥에 갇힌 마물이 없습니다! 아주 훌륭합니다. 👍', 'accent');
      return;
    }

    this.app.sfx.play('attack');
    const modal = document.createElement('div');
    modal.className = 'field-battle-backdrop';

    const renderJailContent = () => {
      if (list.length === 0) {
        modal.innerHTML = `
          <div class="field-battle-modal" style="padding: 30px; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 12px;">✨</div>
            <h3>모든 오답 마물을 정화했습니다!</h3>
            <p style="color: #94a3b8; margin: 10px 0 20px;">더 이상 복습할 오답이 없습니다. 완벽한 지식을 갖추셨군요!</p>
            <button class="btn btn-primary" id="btn-close-jail">마을로 돌아가기</button>
          </div>
        `;
        document.getElementById('btn-close-jail')?.addEventListener('click', () => modal.remove());
        return;
      }

      const currentQ = list[0];
      modal.innerHTML = `
        <div class="field-battle-modal">
          <div class="field-battle-header">
            <div>
              <span class="wrong-jail-badge">🔒 오답 감옥 (${list.length}마리 수감)</span>
              <strong style="margin-left: 8px;">마물 정화 퀴즈</strong>
            </div>
            <button class="btn-text" id="btn-close-jail" style="font-size: 1.3rem;">&times;</button>
          </div>
          <div class="field-quiz-content" style="padding-top: 20px;">
            <div class="field-quiz-question-box">
              <div style="font-size: 0.8rem; color: #f87171; margin-bottom: 6px;">[${currentQ.subjectName} 오답 복습 - 맞히면 정화!]</div>
              ${currentQ.question}
            </div>
            <div class="field-quiz-options-grid">
              ${currentQ.options.map((opt, idx) => `
                <button class="field-option-btn" data-idx="${idx}">${idx + 1}. ${opt}</button>
              `).join('')}
            </div>
            <div class="field-battle-result hidden" id="jail-quiz-result"></div>
          </div>
        </div>
      `;

      document.getElementById('btn-close-jail')?.addEventListener('click', () => modal.remove());

      const btns = modal.querySelectorAll('.field-option-btn');
      const resBox = document.getElementById('jail-quiz-result');

      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.disabled = true);
          const sel = parseInt(btn.getAttribute('data-idx'));
          const isCorrect = sel === currentQ.answer;

          if (isCorrect) {
            btn.classList.add('correct');
            this.app.sfx.play('correct');
            setTimeout(() => this.app.sfx.play('coin'), 300);

            list.shift();
            this.app.state.wrongNotes = list;
            this.app.addExp(35);
            this.app.state.player.gems += 1;
            this.app.saveState();
            this.app.renderHeaderStats();

            resBox.className = 'field-battle-result success';
            resBox.innerHTML = `
              <strong>✨ 오답 마물 정화 성공!</strong>
              <p>보상으로 <strong>+35 EXP</strong>와 <strong>+1 보석 💎</strong>을 획득했습니다.</p>
            `;
            resBox.classList.remove('hidden');

            setTimeout(() => renderJailContent(), 1600);
          } else {
            btn.classList.add('wrong');
            if (btns[currentQ.answer]) btns[currentQ.answer].classList.add('correct');
            this.app.sfx.play('wrong');

            resBox.className = 'field-battle-result fail';
            resBox.innerHTML = `
              <strong>💥 아직 정화되지 않았습니다.</strong>
              <p style="margin-top: 4px; font-size: 0.85rem; color: #cbd5e1;"><strong>해설:</strong> ${currentQ.explanation}</p>
              <button class="btn btn-secondary btn-sm mt-2" id="btn-next-retry" style="width: 100%;">닫기</button>
            `;
            resBox.classList.remove('hidden');
            document.getElementById('btn-next-retry')?.addEventListener('click', () => modal.remove());
          }
        });
      });
    };

    renderJailContent();
    document.body.appendChild(modal);
  }

  startFieldEncounter(monster) {
    if (this.inBattle) return;
    this.inBattle = true;
    this.targetPos = null;
    this.keys.up = false;
    this.keys.down = false;
    this.keys.left = false;
    this.keys.right = false;

    this.app.sfx.play('attack');

    const subjectKeys = ['math', 'english', 'korean'];
    const subKey = subjectKeys[Math.floor(Math.random() * subjectKeys.length)];
    const subObj = this.app.state.subjects[subKey];
    const qList = subObj.questions;
    const q = qList[Math.floor(Math.random() * qList.length)];

    const modal = document.createElement('div');
    modal.className = 'field-battle-backdrop';
    modal.innerHTML = `
      <div class="field-battle-modal">
        <div class="field-battle-header">
          <span class="village-badge">⚔️ 야생 몬스터 조우!</span>
          <button class="btn-text" id="btn-flee-battle" style="color: var(--danger); font-size: 0.9rem;">🏃 도망치기</button>
        </div>
        <div class="field-battle-arena">
          <div class="field-combatant">
            <span class="avatar-icon">🛡️</span>
            <strong>${this.app.state.player.name}</strong>
            <span class="badge badge-accent">Lv.${this.app.state.player.level} (HP ${this.app.state.player.hp})</span>
          </div>
          <div class="field-battle-vs">VS</div>
          <div class="field-combatant">
            <span class="avatar-icon">${monster.icon}</span>
            <strong>${monster.name}</strong>
            <span class="badge badge-danger">HP ${monster.hp}</span>
          </div>
        </div>
        <div class="field-quiz-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-size: 0.8rem; color: #38bdf8;">[${subObj.name} 퀴즈를 맞혀 공격하세요!]</div>
            <button class="btn-pet-hint" id="btn-pet-hint">🐾 퐁이의 힌트 (50:50)</button>
          </div>
          <div class="field-quiz-question-box">
            ${q.question}
          </div>
          <div class="field-quiz-options-grid">
            ${q.options.map((opt, idx) => `
              <button class="field-option-btn" data-idx="${idx}">
                ${idx + 1}. ${opt}
              </button>
            `).join('')}
          </div>
          <div class="field-battle-result hidden" id="field-battle-result"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBattle = () => {
      modal.remove();
      this.inBattle = false;
      this.lastTime = performance.now();
    };

    document.getElementById('btn-flee-battle')?.addEventListener('click', () => {
      this.app.sfx.play('click');
      closeBattle();
    });

    // 펫 50:50 힌트 사용
    let hintUsed = false;
    document.getElementById('btn-pet-hint')?.addEventListener('click', () => {
      if (hintUsed) return;
      hintUsed = true;
      const hintBtn = document.getElementById('btn-pet-hint');
      if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.textContent = '🐾 힌트 사용완료';
      }
      this.app.sfx.play('coin');
      const wrongIndices = [];
      q.options.forEach((_, idx) => {
        if (idx !== q.answer) wrongIndices.push(idx);
      });
      wrongIndices.sort(() => Math.random() - 0.5);
      const toDisable = wrongIndices.slice(0, 2);
      toDisable.forEach(idx => {
        if (optionBtns[idx]) {
          optionBtns[idx].disabled = true;
          optionBtns[idx].style.opacity = '0.25';
          optionBtns[idx].style.textDecoration = 'line-through';
        }
      });
      this.app.showToast('🐲 퐁이가 헷갈리는 보기 2개를 지워주었습니다!', 'accent');
    });

    const optionBtns = modal.querySelectorAll('.field-option-btn');
    const resultBox = document.getElementById('field-battle-result');

    optionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        optionBtns.forEach(b => b.disabled = true);
        const selected = parseInt(btn.getAttribute('data-idx'));
        const isCorrect = selected === q.answer;

        if (isCorrect) {
          btn.classList.add('correct');
          this.app.sfx.play('correct');
          setTimeout(() => this.app.sfx.play('coin'), 300);

          const expReward = 20;
          const goldReward = 25;
          this.app.addExp(expReward);
          this.app.addGold(goldReward);
          this.app.state.player.totalQuestions++;
          this.app.state.player.correctQuestions++;
          this.app.saveState();
          this.app.renderHeaderStats();

          // 피버 모드 발동 (20초)
          this.feverTimer = 20;
          this.app.showToast('🔥 피버 모드 발동! 이동속도 +40% 증가!', 'accent');

          monster.respawnTimer = 45;

          resultBox.className = 'field-battle-result success';
          resultBox.innerHTML = `
            <strong>🎉 정답입니다! 몬스터를 격퇴했습니다!</strong>
            <p>보상으로 <strong>+${expReward} EXP</strong>와 <strong>+${goldReward} 골드</strong>를 획득했습니다.</p>
          `;
          resultBox.classList.remove('hidden');

          setTimeout(closeBattle, 1800);
        } else {
          btn.classList.add('wrong');
          if (optionBtns[q.answer]) optionBtns[q.answer].classList.add('correct');
          this.app.sfx.play('wrong');

          const dmg = 10;
          this.app.state.player.hp = Math.max(1, this.app.state.player.hp - dmg);
          this.app.state.player.totalQuestions++;

          // 오답 노트 지하 감옥에 추가
          if (!this.app.state.wrongNotes) this.app.state.wrongNotes = [];
          if (!this.app.state.wrongNotes.some(item => item.question === q.question)) {
            this.app.state.wrongNotes.push({
              subjectName: subObj.name,
              question: q.question,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation
            });
            this.app.showToast('⚠️ 틀린 문제가 [오답 정화 지하 감옥]에 갇혔습니다! 복습해서 보석을 획득하세요.', 'warning');
          }

          this.app.saveState();
          this.app.renderHeaderStats();

          resultBox.className = 'field-battle-result fail';
          resultBox.innerHTML = `
            <strong>💥 오답입니다! 몬스터의 반격으로 ${dmg} 피해를 입었습니다.</strong>
            <p style="margin-top: 4px; font-size: 0.85rem; color: #cbd5e1;"><strong>해설:</strong> ${q.explanation}</p>
            <button class="btn btn-secondary btn-sm mt-2" id="btn-close-fail" style="width: 100%;">마을로 돌아가기</button>
          `;
          resultBox.classList.remove('hidden');

          document.getElementById('btn-close-fail')?.addEventListener('click', closeBattle);
        }
      });
    });
  }

  update(dt) {
    // 피버 모드 타이머 및 속도
    if (this.feverTimer > 0) {
      this.feverTimer -= dt;
      this.player.speed = 310;
      if (Math.random() < 0.25) {
        this.sparkles.push({
          x: this.player.x + (Math.random() - 0.5) * 16,
          y: this.player.y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 40,
          vy: -Math.random() * 40 - 20,
          color: Math.random() > 0.5 ? '#f59e0b' : '#ef4444',
          size: Math.random() * 4 + 2,
          alpha: 1,
          life: 0.5
        });
      }
    } else {
      this.player.speed = 220;
    }

    let dx = 0;
    let dy = 0;

    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    // 타겟 지점 이동 로직
    if (this.targetPos) {
      const distTarget = Math.hypot(this.targetPos.x - this.player.x, this.targetPos.y - this.player.y);
      if (distTarget > 6) {
        dx = (this.targetPos.x - this.player.x) / distTarget;
        dy = (this.targetPos.y - this.player.y) / distTarget;
      } else {
        this.targetPos = null;
      }
    }

    const isMoving = dx !== 0 || dy !== 0;
    this.player.isMoving = isMoving;

    if (isMoving) {
      // 대각선 이동 시 속도 정규화
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;

      if (Math.abs(dx) > Math.abs(dy)) {
        this.player.dir = dx > 0 ? 'right' : 'left';
      } else {
        this.player.dir = dy > 0 ? 'down' : 'up';
      }

      const nextX = this.player.x + dx * this.player.speed * dt;
      const nextY = this.player.y + dy * this.player.speed * dt;

      // 충돌 처리 (경계 및 건물/분수)
      if (!this.checkCollision(nextX, this.player.y)) {
        this.player.x = nextX;
      }
      if (!this.checkCollision(this.player.x, nextY)) {
        this.player.y = nextY;
      }

      this.player.walkCycle += dt * 10;

      // 걷는 발자국 먼지 파티클
      if (Math.random() < 0.25) {
        this.player.particles.push({
          x: this.player.x + (Math.random() - 0.5) * 8,
          y: this.player.y + 12,
          radius: Math.random() * 3 + 2,
          alpha: 0.6,
          life: 0.4
        });
      }
    } else {
      this.player.walkCycle = 0;
    }

    // 발자국 파티클 업데이트
    for (let i = this.player.particles.length - 1; i >= 0; i--) {
      const p = this.player.particles[i];
      p.life -= dt;
      p.alpha = Math.max(0, p.life / 0.4);
      p.radius += dt * 2;
      if (p.life <= 0) this.player.particles.splice(i, 1);
    }

    // 스파클 파티클 업데이트
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      sp.alpha = Math.max(0, sp.life / 1.2);
      if (sp.life <= 0) this.sparkles.splice(i, 1);
    }

    // 분수 물방울 파티클
    if (Math.random() < 0.3) {
      this.fountain.particles.push({
        x: this.fountain.x + (Math.random() - 0.5) * 12,
        y: this.fountain.y - 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 40 - 20,
        alpha: 0.8,
        life: 0.6
      });
    }
    for (let i = this.fountain.particles.length - 1; i >= 0; i--) {
      const fp = this.fountain.particles[i];
      fp.x += fp.vx * dt;
      fp.y += fp.vy * dt;
      fp.vy += 120 * dt; // 중력
      fp.life -= dt;
      fp.alpha = Math.max(0, fp.life / 0.6);
      if (fp.life <= 0) this.fountain.particles.splice(i, 1);
    }

    // 코인 획득 및 리스폰 검사
    this.coins.forEach(coin => {
      if (!coin.collected) {
        const distCoin = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
        if (distCoin < this.player.radius + 12) {
          coin.collected = true;
          coin.respawnTimer = 25; // 25초 후 리스폰
          this.app.sfx.play('coin');
          this.app.state.player.gold += 5;
          this.app.saveState();
          this.app.renderHeaderStats();

          for (let i = 0; i < 8; i++) {
            this.sparkles.push({
              x: coin.x,
              y: coin.y,
              vx: (Math.random() - 0.5) * 80,
              vy: (Math.random() - 0.5) * 80 - 20,
              color: '#fbbf24',
              size: 3,
              alpha: 1,
              life: 0.6
            });
          }
        }
      } else {
        coin.respawnTimer -= dt;
        if (coin.respawnTimer <= 0) {
          coin.collected = false;
        }
      }
    });

    // NPC 말풍선 타이머
    if (this.npc.showBubble) {
      this.npc.bubbleTimer -= dt;
      if (this.npc.bubbleTimer <= 0) {
        this.npc.showBubble = false;
      }
    }

    // 몬스터 배회 및 충돌 검사
    if (!this.inBattle) {
      this.monsters.forEach(m => {
        if (m.respawnTimer > 0) {
          m.respawnTimer -= dt;
          return;
        }
        m.angle += dt * 0.9;
        m.x = m.homeX + Math.cos(m.angle) * 35;
        m.y = m.homeY + Math.sin(m.angle * 1.6) * 18;

        const dist = Math.hypot(this.player.x - m.x, this.player.y - m.y);
        if (dist < this.player.radius + m.radius) {
          this.startFieldEncounter(m);
        }
      });
    }

    // 마법 펫(퐁이) 위치 업데이트 & 코인 자석 수집
    this.pet.anim += dt * 6;
    let targetCoin = null;
    let minCoinDist = 125;
    this.coins.forEach(c => {
      if (!c.collected) {
        const d = Math.hypot(this.player.x - c.x, this.player.y - c.y);
        if (d < minCoinDist) {
          minCoinDist = d;
          targetCoin = c;
        }
      }
    });

    if (targetCoin) {
      const cDist = Math.hypot(targetCoin.x - this.pet.x, targetCoin.y - this.pet.y);
      if (cDist > 12) {
        this.pet.x += ((targetCoin.x - this.pet.x) / cDist) * 330 * dt;
        this.pet.y += ((targetCoin.y - this.pet.y) / cDist) * 330 * dt;
      } else {
        targetCoin.collected = true;
        targetCoin.respawnTimer = 25;
        this.app.sfx.play('coin');
        this.app.state.player.gold += 5;
        this.app.saveState();
        this.app.renderHeaderStats();
        this.app.showToast('🐲 퐁이가 반짝이는 코인을 주웠습니다! +5G 💰', 'normal');
        for (let i = 0; i < 6; i++) {
          this.sparkles.push({
            x: targetCoin.x,
            y: targetCoin.y,
            vx: (Math.random() - 0.5) * 70,
            vy: (Math.random() - 0.5) * 70,
            color: '#fbbf24',
            size: 3,
            alpha: 1,
            life: 0.5
          });
        }
      }
    } else {
      const offsetDir = this.player.dir === 'right' ? -24 : (this.player.dir === 'left' ? 24 : 0);
      const targetX = this.player.x + offsetDir;
      const targetY = this.player.y + 12;
      const distToPlayer = Math.hypot(targetX - this.pet.x, targetY - this.pet.y);
      if (distToPlayer > 8) {
        this.pet.x += ((targetX - this.pet.x) / distToPlayer) * 250 * dt;
        this.pet.y += ((targetY - this.pet.y) / distToPlayer) * 250 * dt;
      }
    }

    // 밤 반딧불이
    if (this.timeOfDay === 'night') {
      this.fireflies.forEach(f => {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.pulse += dt * 3;
        f.alpha = 0.3 + Math.sin(f.pulse) * 0.4;
        if (f.x < 10) f.x = this.virtualWidth - 10;
        if (f.x > this.virtualWidth - 10) f.x = 10;
        if (f.y < 10) f.y = this.virtualHeight - 10;
        if (f.y > this.virtualHeight - 10) f.y = 10;
      });
    }

    // 근접 상호작용 검사
    this.checkNearbyInteractable();
  }

  checkCollision(x, y) {
    const r = this.player.radius;

    // 맵 경계 충돌
    if (x - r < 20 || x + r > this.virtualWidth - 20 || y - r < 20 || y + r > this.virtualHeight - 20) {
      return true;
    }

    // 건물 본체 충돌 (문 근처 제외)
    for (const b of this.buildings) {
      const margin = 10;
      if (x + r > b.x - margin && x - r < b.x + b.w + margin &&
          y + r > b.y - margin && y - r < b.y + b.h + margin) {
        // 문 앞 진입 영역인 경우 문 통과는 허용하지 않고 문 앞에서 멈추게 함
        return true;
      }
    }

    // 중앙 분수대 충돌
    const distFountain = Math.hypot(x - this.fountain.x, y - this.fountain.y);
    if (distFountain < this.fountain.radius + r - 5) {
      return true;
    }

    return false;
  }

  checkNearbyInteractable() {
    let closest = null;
    let minDistance = 75;

    // 1. 건물 문 체크
    for (const b of this.buildings) {
      const dist = Math.hypot(this.player.x - b.doorX, this.player.y - b.doorY);
      if (dist < minDistance) {
        minDistance = dist;
        closest = b;
      }
    }

    // 2. NPC 체크
    const distNpc = Math.hypot(this.player.x - this.npc.x, this.player.y - this.npc.y);
    if (distNpc < minDistance) {
      minDistance = distNpc;
      closest = this.npc;
    }

    // 3. 보물상자 체크
    for (const c of this.chests) {
      if (!c.opened) {
        const distChest = Math.hypot(this.player.x - (c.x + c.w / 2), this.player.y - (c.y + c.h / 2));
        if (distChest < minDistance) {
          minDistance = distChest;
          closest = c;
        }
      }
    }

    // 4. 분수대 소원 체크
    const distFountain = Math.hypot(this.player.x - this.fountain.x, this.player.y - this.fountain.y);
    if (distFountain < 58 && distFountain < minDistance) {
      minDistance = distFountain;
      closest = { id: 'fountain', name: '지혜의 행운 분수', subtitle: '소원 빌기 (10G)', icon: '⛲' };
    }

    // 5. 오답 정화 감옥 체크
    const distJail = Math.hypot(this.player.x - (this.jail.x + this.jail.w / 2), this.player.y - (this.jail.y + this.jail.h / 2));
    if (distJail < 65 && distJail < minDistance) {
      minDistance = distJail;
      const count = (this.app.state.wrongNotes || []).length;
      closest = { id: 'jail', name: '오답 정화 지하 감옥', subtitle: `마물 ${count}마리 수감 중`, icon: '🔒' };
    }

    if (this.activeInteractable !== closest) {
      this.activeInteractable = closest;
      this.updateInteractBar();
    }
  }

  updateInteractBar() {
    const bar = document.getElementById('village-interact-bar');
    const iconEl = document.getElementById('village-interact-icon');
    const textEl = document.getElementById('village-interact-text');
    const actBtn = document.getElementById('village-action-btn');

    if (!bar || !iconEl || !textEl) return;

    if (this.activeInteractable) {
      bar.classList.remove('hidden');
      const target = this.activeInteractable;

      if (target.nav) {
        iconEl.textContent = target.icon;
        textEl.innerHTML = `<strong>${target.name}</strong> - <em>[Space]</em> 또는 클릭하여 입장하기 (${target.subtitle})`;
        if (actBtn) actBtn.classList.add('glow');
      } else if (target.id === 'owl') {
        iconEl.textContent = '🦉';
        textEl.innerHTML = `<strong>${target.name}</strong> - <em>[Space]</em> 또는 클릭하여 조언 듣기`;
        if (actBtn) actBtn.classList.add('glow');
      } else if (target.gold !== undefined) {
        iconEl.textContent = '🎁';
        textEl.innerHTML = `<strong>신비한 보물상자</strong> - <em>[Space]</em> 또는 클릭하여 열기!`;
        if (actBtn) actBtn.classList.add('glow');
      } else if (target.id === 'fountain') {
        iconEl.textContent = '⛲';
        textEl.innerHTML = `<strong>${target.name}</strong> - <em>[Space]</em> 동전 던지고 행운 버프 받기 (10G)`;
        if (actBtn) actBtn.classList.add('glow');
      } else if (target.id === 'jail') {
        iconEl.textContent = '🔒';
        const cnt = (this.app.state.wrongNotes || []).length;
        textEl.innerHTML = `<strong>${target.name}</strong> - <em>[Space]</em> 오답 마물 정화하고 보석 받기 (${cnt}마리)`;
        if (actBtn) actBtn.classList.add('glow');
      }
    } else {
      bar.classList.add('hidden');
      if (actBtn) actBtn.classList.remove('glow');
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 1. 잔디 필드 배경
    this.renderGround(ctx);

    // 2. 돌길 (Cobblestone Paths)
    this.renderPaths(ctx);

    // 3. 장식물 (가로등, 꽃, 나무 바닥 레이어)
    this.renderEnvironmentBack(ctx);

    // 4. 중앙 분수대
    this.renderFountain(ctx);

    // 5. 필드 코인 & 보물상자
    this.renderFieldItems(ctx);

    // 6. 건물 렌더링
    this.buildings.forEach(b => this.renderBuilding(ctx, b));

    // 6-1. 오답 정화 지하 감옥 비석
    this.renderJail(ctx);

    // 7. NPC 렌더링
    this.renderNPC(ctx);

    // 8. 필드 몬스터 렌더링
    this.renderMonsters(ctx);

    // 8-1. 마법 펫(퐁이) 렌더링
    this.renderPet(ctx);

    // 9. 플레이어 캐릭터 렌더링
    this.renderPlayer(ctx);

    // 10. 환경 앞 레이어 (나무 캐노피, 가로등 빛 효과)
    this.renderEnvironmentFront(ctx);

    // 10. 파티클 이펙트
    this.renderParticles(ctx);

    // 11. 타겟 이동 마커
    if (this.targetPos) {
      this.renderTargetMarker(ctx);
    }
  }

  renderGround(ctx) {
    const isNight = this.timeOfDay === 'night';
    // 배경 기본 잔디 / 밤하늘 그라데이션
    const grad = ctx.createLinearGradient(0, 0, 0, this.virtualHeight);
    if (isNight) {
      grad.addColorStop(0, '#0a1626');
      grad.addColorStop(0.5, '#0d1f35');
      grad.addColorStop(1, '#08121f');
    } else {
      grad.addColorStop(0, '#143823');
      grad.addColorStop(0.5, '#1b432a');
      grad.addColorStop(1, '#133521');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.virtualWidth, this.virtualHeight);

    // 잔디 체크 패턴 텍스처
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    const tileSize = 40;
    for (let x = 0; x < this.virtualWidth; x += tileSize) {
      for (let y = 0; y < this.virtualHeight; y += tileSize) {
        if ((Math.floor(x / tileSize) + Math.floor(y / tileSize)) % 2 === 0) {
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // 외곽 경계 담장 라인
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, this.virtualWidth - 20, this.virtualHeight - 20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, this.virtualWidth - 20, this.virtualHeight - 20);
  }

  renderPaths(ctx) {
    ctx.save();
    ctx.fillStyle = '#3f434a';
    ctx.strokeStyle = '#2b2e34';
    ctx.lineWidth = 2;

    // 중앙 원형 광장
    ctx.beginPath();
    ctx.arc(480, 280, 100, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 돌길 연결 (중앙 광장 -> 각 건물 문 앞)
    const paths = [
      // 아카데미
      { startX: 480, startY: 280, endX: 180, endY: 180 },
      // 몬스터 던전
      { startX: 480, startY: 280, endX: 780, endY: 180 },
      // 시계탑
      { startX: 480, startY: 280, endX: 480, endY: 170 },
      // 대장간
      { startX: 480, startY: 280, endX: 180, endY: 350 },
      // 퀘스트 길드
      { startX: 480, startY: 280, endX: 780, endY: 350 },
      // 남쪽 출구 도로
      { startX: 480, startY: 280, endX: 480, endY: 530 }
    ];

    paths.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(p.startX, p.startY);
      ctx.lineTo(p.endX, p.endY);
      ctx.lineWidth = 32;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#383c44';
      ctx.stroke();

      // 자갈 돌 포인트
      ctx.lineWidth = 24;
      ctx.strokeStyle = '#4b515d';
      ctx.stroke();
    });

    ctx.restore();
  }

  renderFountain(ctx) {
    const f = this.fountain;

    // 분수 바닥 그림자
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.arc(f.x, f.y + 4, f.radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // 분수대 테두리 돌
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.stroke();

    // 분수 맑은 물
    const waterGrad = ctx.createRadialGradient(f.x, f.y, 4, f.x, f.y, f.radius - 6);
    waterGrad.addColorStop(0, '#67e8f9');
    waterGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.radius - 6, 0, Math.PI * 2);
    ctx.fill();

    // 중앙 분수 기둥
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // 물줄기 파티클
    f.particles.forEach(p => {
      ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  renderBuilding(ctx, b) {
    const isNearby = this.activeInteractable === b;

    ctx.save();
    // 건물 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(b.x + 6, b.y + 10, b.w, b.h, 12);
    ctx.fill();

    // 건물 외벽 본체
    ctx.fillStyle = b.wallColor;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y + 25, b.w, b.h - 25, [0, 0, 10, 10]);
    ctx.fill();
    ctx.strokeStyle = isNearby ? '#fbbf24' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = isNearby ? 3 : 1.5;
    ctx.stroke();

    // 건물 지붕 (경사 삼각형/사다리꼴 형태)
    const roofGrad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 35);
    roofGrad.addColorStop(0, b.color);
    roofGrad.addColorStop(1, b.roofColor);
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(b.x - 8, b.y + 30);
    ctx.lineTo(b.x + b.w / 2, b.y);
    ctx.lineTo(b.x + b.w + 8, b.y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = isNearby ? '#fef08a' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 문 (Door)
    const doorW = 28;
    const doorH = 34;
    const doorLeft = b.doorX - doorW / 2;
    const doorTop = b.y + b.h - doorH;

    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(doorLeft, doorTop, doorW, doorH);
    ctx.strokeStyle = isNearby ? '#fbbf24' : '#78350f';
    ctx.lineWidth = 2;
    ctx.strokeRect(doorLeft, doorTop, doorW, doorH);

    // 문 매트 (입구 발판)
    ctx.fillStyle = isNearby ? 'rgba(251, 191, 36, 0.4)' : 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(doorLeft - 4, b.y + b.h, doorW + 8, 8);

    // 창문들 (따뜻한 실내 빛)
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(b.x + 22, b.y + 45, 20, 20);
    ctx.fillRect(b.x + b.w - 42, b.y + 45, 20, 20);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 22, b.y + 45, 20, 20);
    ctx.strokeRect(b.x + b.w - 42, b.y + 45, 20, 20);

    // 건물 간판 (이름 & 아이콘)
    const signY = b.y - 12;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = isNearby ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = isNearby ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(b.x + 8, signY, b.w - 16, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 12px "Outfit", "Noto Sans KR", sans-serif';
    ctx.fillStyle = isNearby ? '#fef08a' : '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${b.icon} ${b.name}`, b.x + b.w / 2, signY + 12);

    // 시계탑 전용 시계 다이얼 렌더링
    if (b.id === 'stats') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + 26, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 시곗바늘
      const now = Date.now() / 1000;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y + 26);
      ctx.lineTo(b.x + b.w / 2 + Math.cos(now) * 8, b.y + 26 + Math.sin(now) * 8);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 근접 시 문 앞 인디케이터
    if (isNearby) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(b.doorX, b.doorY - 20);
      ctx.lineTo(b.doorX - 6, b.doorY - 28);
      ctx.lineTo(b.doorX + 6, b.doorY - 28);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  renderJail(ctx) {
    const j = this.jail;
    const isNearby = this.activeInteractable && this.activeInteractable.id === 'jail';
    const wrongCount = (this.app.state.wrongNotes || []).length;

    ctx.save();
    // 감옥 바닥 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(j.x + j.w / 2, j.y + j.h + 2, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 석조 지하 감옥 아치
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(j.x, j.y, j.w, j.h, [16, 16, 4, 4]);
    ctx.fill();
    ctx.strokeStyle = isNearby ? '#f87171' : '#475569';
    ctx.lineWidth = isNearby ? 2.5 : 1.5;
    ctx.stroke();

    // 철창 창살
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(j.x + 6, j.y + 12, j.w - 12, j.h - 14);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (let bx = j.x + 12; bx <= j.x + j.w - 12; bx += 8) {
      ctx.beginPath();
      ctx.moveTo(bx, j.y + 12);
      ctx.lineTo(bx, j.y + j.h - 2);
      ctx.stroke();
    }

    // 해골/자물쇠 아이콘
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wrongCount > 0 ? '🔒' : '✨', j.x + j.w / 2, j.y + 26);

    // 오답 마물 수 배지
    ctx.fillStyle = wrongCount > 0 ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)';
    ctx.beginPath();
    ctx.roundRect(j.x - 8, j.y - 14, j.w + 16, 15, 4);
    ctx.fill();

    ctx.font = 'bold 8.5px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(wrongCount > 0 ? `오답 마물 ${wrongCount}` : '정화 완료', j.x + j.w / 2, j.y - 6);

    ctx.restore();
  }

  renderNPC(ctx) {
    const npc = this.npc;
    const isNearby = this.activeInteractable === npc;

    ctx.save();
    // 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(npc.x, npc.y + 14, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 부엉이 몸체
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
    ctx.fill();

    // 배
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(npc.x, npc.y + 4, 12, 0, Math.PI * 2);
    ctx.fill();

    // 눈 (큰 올빼미 눈과 안경)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(npc.x - 7, npc.y - 4, 6, 0, Math.PI * 2);
    ctx.arc(npc.x + 7, npc.y - 4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 동공
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(npc.x - 7, npc.y - 4, 3, 0, Math.PI * 2);
    ctx.arc(npc.x + 7, npc.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    // 부리
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(npc.x, npc.y - 1);
    ctx.lineTo(npc.x - 4, npc.y + 4);
    ctx.lineTo(npc.x + 4, npc.y + 4);
    ctx.closePath();
    ctx.fill();

    // 학사모
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(npc.x - 14, npc.y - 20, 28, 4);
    ctx.fillRect(npc.x - 7, npc.y - 24, 14, 4);

    // 이름 태그
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(npc.x - 36, npc.y - 38, 72, 16, 4);
    ctx.fill();
    ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('현자 오울리', npc.x, npc.y - 30);

    // 말풍선 대사
    if (npc.showBubble) {
      const text = npc.quotes[npc.quoteIndex];
      ctx.font = '11px "Noto Sans KR", sans-serif';
      const textWidth = ctx.measureText(text).width;
      const bw = Math.min(textWidth + 24, 280);
      const bh = 32;
      const bx = npc.x - bw / 2;
      const by = npc.y - 78;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      // 말풍선 꼬리
      ctx.beginPath();
      ctx.moveTo(npc.x - 5, by + bh);
      ctx.lineTo(npc.x, by + bh + 8);
      ctx.lineTo(npc.x + 5, by + bh);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, npc.x, by + bh / 2);
    }

    ctx.restore();
  }

  renderMonsters(ctx) {
    const now = Date.now() / 200;
    this.monsters.forEach(m => {
      if (m.respawnTimer > 0) return;

      const bob = Math.sin(now + m.angle) * 4;
      const my = m.y + bob;

      ctx.save();
      // 몬스터 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y + 12, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 몬스터 아이콘
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.icon, m.x, my);

      // 몬스터 이름 & HP 바
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(m.x - 30, my - 24, 60, 13, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // HP 게이지
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(m.x - 28, my - 15, 56, 2.5);

      ctx.font = 'bold 8px "Noto Sans KR", sans-serif';
      ctx.fillStyle = '#fca5a5';
      ctx.fillText(m.name, m.x, my - 19);

      ctx.restore();
    });
  }

  renderPet(ctx) {
    const pet = this.pet;
    const bob = Math.sin(pet.anim) * 4;
    const py = pet.y + bob;

    ctx.save();
    // 펫 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(pet.x, pet.y + 10, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 펫 아기 드래곤 아이콘
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pet.icon, pet.x, py);

    // 펫 이름 배지
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(pet.x - 20, py - 20, 40, 12, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 8px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#fbcfe8';
    ctx.fillText(pet.name, pet.x, py - 14);

    ctx.restore();
  }

  renderFieldItems(ctx) {
    ctx.save();

    // 1. 코인들
    const now = Date.now() / 150;
    this.coins.forEach(coin => {
      if (!coin.collected) {
        const coinBob = Math.sin(now + coin.id) * 3;
        const cy = coin.y + coinBob;

        // 코인 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(coin.x, coin.y + 8, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 황금 코인
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(coin.x, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = '#78350f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', coin.x, cy);
      }
    });

    // 2. 보물상자
    this.chests.forEach(c => {
      const isNearby = this.activeInteractable === c;

      // 상자 그림자
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(c.x + 2, c.y + 4, c.w, c.h);

      if (!c.opened) {
        // 닫힌 보물상자
        ctx.fillStyle = '#78350f';
        ctx.fillRect(c.x, c.y, c.w, c.h);
        ctx.strokeStyle = isNearby ? '#fef08a' : '#d97706';
        ctx.lineWidth = isNearby ? 2.5 : 1.5;
        ctx.strokeRect(c.x, c.y, c.w, c.h);

        // 금색 잠금장치 버클
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(c.x + c.w / 2 - 4, c.y + c.h / 2 - 3, 8, 8);

        if (isNearby) {
          ctx.font = 'bold 10px sans-serif';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.fillText('🎁 열기 (Space)', c.x + c.w / 2, c.y - 8);
        }
      } else {
        // 열린 상자
        ctx.fillStyle = '#451a03';
        ctx.fillRect(c.x, c.y + 8, c.w, c.h - 8);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(c.x, c.y, c.w, 8); // 열린 뚜껑
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 1;
        ctx.strokeRect(c.x, c.y + 8, c.w, c.h - 8);
      }
    });

    ctx.restore();
  }

  renderEnvironmentBack(ctx) {
    ctx.save();
    this.decorations.forEach(d => {
      if (d.type === 'flower') {
        // 꽃
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.type === 'lamp') {
        // 가로등 기둥
        ctx.fillStyle = '#334155';
        ctx.fillRect(d.x - 3, d.y - 28, 6, 28);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(d.x - 8, d.y - 36, 16, 8);
      }
    });
    ctx.restore();
  }

  renderEnvironmentFront(ctx) {
    ctx.save();
    this.decorations.forEach(d => {
      if (d.type === 'tree') {
        // 나무 밑둥
        ctx.fillStyle = '#78350f';
        ctx.fillRect(d.x - 6, d.y - 12, 12, 24);

        // 나무 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(d.x, d.y + 12, d.size, d.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 잎사귀 (레이어드 서클)
        const treeGrad = ctx.createRadialGradient(d.x - 5, d.y - 30, 4, d.x, d.y - 25, d.size);
        treeGrad.addColorStop(0, '#22c55e');
        treeGrad.addColorStop(1, '#15803d');
        ctx.fillStyle = treeGrad;
        ctx.beginPath();
        ctx.arc(d.x, d.y - 26, d.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (d.type === 'lamp') {
        // 가로등 불빛 램프 헤드
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(d.x, d.y - 32, 5, 0, Math.PI * 2);
        ctx.fill();

        // 따뜻한 조명 빛무리 효과
        const lampLight = ctx.createRadialGradient(d.x, d.y - 32, 2, d.x, d.y - 32, 55);
        lampLight.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
        lampLight.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = lampLight;
        ctx.beginPath();
        ctx.arc(d.x, d.y - 32, 55, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 밤 반딧불이 빛무리 렌더링
    if (this.timeOfDay === 'night') {
      this.fireflies.forEach(f => {
        ctx.fillStyle = `rgba(254, 240, 138, ${f.alpha})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(254, 240, 138, ${f.alpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  }

  renderPlayer(ctx) {
    const p = this.player;
    const isMoving = p.isMoving;
    const bob = isMoving ? Math.sin(p.walkCycle) * 3 : 0;
    const footSwing = isMoving ? Math.cos(p.walkCycle) * 6 : 0;

    ctx.save();
    ctx.translate(p.x, p.y);

    // 피버 모드 불꽃 오라
    if (this.feverTimer > 0) {
      const now = Date.now() / 150;
      const auraPulse = Math.sin(now) * 4;
      const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 36 + auraPulse);
      aura.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
      aura.addColorStop(0.6, 'rgba(239, 68, 68, 0.35)');
      aura.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 36 + auraPulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // 1. 캐릭터 바닥 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 14, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. 발 / 신발 (걷는 애니메이션)
    ctx.fillStyle = '#475569';
    // 왼발
    ctx.beginPath();
    ctx.ellipse(-7, 12 - footSwing, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 오른발
    ctx.beginPath();
    ctx.ellipse(7, 12 + footSwing, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. 망토 (방향에 따라 뒤 또는 옆으로 펄럭임)
    const capeWiggle = isMoving ? Math.sin(p.walkCycle) * 4 : 0;
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    if (p.dir === 'up') {
      // 위를 볼 때 등 망토 전체 표시
      ctx.roundRect(-12 + capeWiggle, -6 + bob, 24, 20, 4);
    } else {
      ctx.roundRect(-14 + capeWiggle, -4 + bob, 8, 16, 3);
    }
    ctx.fill();

    // 4. 몸통 (갑옷)
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-10, -6 + bob, 20, 16, 4);
    ctx.fill();

    // 황금 장식 벨트
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-8, 6 + bob, 16, 3);

    // 5. 머리 및 투구/머리카락
    ctx.fillStyle = '#fde047'; // 금발
    ctx.beginPath();
    ctx.arc(0, -14 + bob, 12, 0, Math.PI * 2);
    ctx.fill();

    // 투구 / 기사 머리띠
    ctx.fillStyle = '#475569';
    ctx.fillRect(-11, -22 + bob, 22, 7);
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(-3, -27 + bob, 6, 8); // 투구 깃털

    // 6. 얼굴 표정 (방향별)
    ctx.fillStyle = '#1e293b';
    if (p.dir === 'down') {
      // 정면 눈
      ctx.beginPath();
      ctx.arc(-4, -13 + bob, 2, 0, Math.PI * 2);
      ctx.arc(4, -13 + bob, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.dir === 'left') {
      ctx.beginPath();
      ctx.arc(-7, -13 + bob, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.dir === 'right') {
      ctx.beginPath();
      ctx.arc(7, -13 + bob, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // 'up'일 때는 뒤통수이므로 눈 안 그림

    // 7. 장비 (무기 & 방패)
    if (p.dir === 'left') {
      // 방패 좌측
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.roundRect(-16, -2 + bob, 7, 14, 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // 검 우측
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(11, -10 + bob, 4, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(8, -1 + bob, 10, 3); // 가드
      ctx.fillStyle = '#78350f';
      ctx.fillRect(12, 8 + bob, 2, 4); // 손잡이
    }

    // 8. 플레이어 머리 위 닉네임 & 레벨 배지
    const pData = this.app.state.player;
    const isFever = this.feverTimer > 0;
    ctx.fillStyle = isFever ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.85)';
    ctx.beginPath();
    ctx.roundRect(-46, -44 + bob, 92, 16, 4);
    ctx.fill();
    ctx.strokeStyle = isFever ? '#f59e0b' : 'rgba(99, 102, 241, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 9px "Outfit", "Noto Sans KR", sans-serif';
    ctx.fillStyle = isFever ? '#fef08a' : '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isFever ? `🔥 FEVER Lv.${pData.level}` : `Lv.${pData.level} ${pData.name}`, 0, -36 + bob);

    ctx.restore();
  }

  renderParticles(ctx) {
    // 발자국 먼지
    this.player.particles.forEach(p => {
      ctx.fillStyle = `rgba(203, 213, 225, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // 스파클 / 골드 반짝이
    this.sparkles.forEach(s => {
      ctx.fillStyle = s.color || '#fbbf24';
      ctx.globalAlpha = s.alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  renderTargetMarker(ctx) {
    const tp = this.targetPos;
    const now = Date.now() / 200;
    const ringRadius = 10 + Math.sin(now) * 3;

    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

window.VillageMap2D = VillageMap2D;

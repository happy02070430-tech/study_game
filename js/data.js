// Study Quest 게임 데이터 및 초기 상태 정의
const DEFAULT_GAME_DATA = {
  player: {
    name: "견습 수호자",
    title: "성실한 탐구자",
    level: 1,
    exp: 35,
    maxExp: 100,
    hp: 100,
    maxHp: 100,
    atk: 25,
    def: 15,
    gold: 240,
    gems: 10,
    streakDays: 4,
    totalQuestions: 18,
    correctQuestions: 15,
    studyMinutesToday: 35
  },
  pet: {
    name: "아기 드래곤 퐁이",
    icon: "🐲",
    active: true
  },
  wrongNotes: [],
  buff: null,
  equipped: {
    weapon: "wpn_01",
    armor: "arm_01",
    accessory: "acc_01"
  },
  inventory: [
    {
      id: "wpn_01",
      type: "weapon",
      name: "지식의 마법 깃펜",
      grade: "rare",
      icon: "✒️",
      stat: "+15 공격력",
      atkBonus: 15,
      desc: "정답을 적을 때마다 신비로운 빛을 내뿜는 마법 깃펜.",
      price: 150
    },
    {
      id: "wpn_02",
      type: "weapon",
      name: "룬 문자 목검",
      grade: "common",
      icon: "🗡️",
      stat: "+8 공격력",
      atkBonus: 8,
      desc: "초보 모험가들이 흔히 사용하는 단단한 목검.",
      price: 80
    },
    {
      id: "arm_01",
      type: "armor",
      name: "아카데미 수호 교복",
      grade: "rare",
      icon: "🥋",
      stat: "+20 방어력 / +30 HP",
      defBonus: 20,
      hpBonus: 30,
      desc: "마법 결계가 깃들어 있어 오답의 충격을 줄여주는 교복.",
      price: 180
    },
    {
      id: "acc_01",
      type: "accessory",
      name: "집중의 청금석 반지",
      grade: "epic",
      icon: "💍",
      stat: "+10% EXP 보너스",
      expBonus: 0.1,
      desc: "공부할 때 잡념을 없애고 집중력을 극대화하는 신비로운 반지.",
      price: 350
    },
    {
      id: "pot_01",
      type: "consumable",
      name: "피로회복 에너지 물약",
      grade: "common",
      icon: "🧪",
      stat: "HP 50 회복",
      count: 3,
      desc: "전투 중 소모된 체력을 즉시 50 회복합니다.",
      price: 40
    }
  ],
  quests: [
    {
      id: "q_01",
      title: "수학의 기초 다지기",
      desc: "수학 퀴즈를 5문제 이상 풀어보세요.",
      subject: "math",
      target: 5,
      current: 3,
      reward: { exp: 40, gold: 100 },
      completed: false,
      claimed: false,
      icon: "📐"
    },
    {
      id: "q_02",
      title: "영어 단어의 비밀",
      desc: "영어 퀴즈 5문제를 해결하세요.",
      subject: "english",
      target: 5,
      current: 5,
      reward: { exp: 50, gold: 120, gems: 2 },
      completed: true,
      claimed: false,
      icon: "🔤"
    },
    {
      id: "q_03",
      title: "국어 문해력 훈련",
      desc: "국어 퀴즈 3문제를 해결하세요.",
      subject: "korean",
      target: 3,
      current: 1,
      reward: { exp: 30, gold: 80 },
      completed: false,
      claimed: false,
      icon: "📖"
    },
    {
      id: "q_04",
      title: "나태의 몬스터 토벌",
      desc: "몬스터 전투에서 승리하여 마을의 평화를 지키세요.",
      subject: "battle",
      target: 1,
      current: 0,
      reward: { exp: 80, gold: 200, gems: 5 },
      completed: false,
      claimed: false,
      icon: "👾"
    }
  ],
  monsters: [
    {
      id: "mon_01",
      name: "나태의 젤리 슬라임",
      level: 1,
      hp: 100,
      maxHp: 100,
      atk: 10,
      icon: "🟢",
      svgType: "slime",
      color: "#10b981",
      desc: "공부를 미루고 뒹굴거리는 습관이 뭉쳐 탄생한 말랑한 슬라임.",
      reward: { exp: 50, gold: 100 },
      subject: "math"
    },
    {
      id: "mon_02",
      name: "망각의 다크 고블린",
      level: 2,
      hp: 160,
      maxHp: 160,
      atk: 18,
      icon: "👺",
      svgType: "goblin",
      color: "#f59e0b",
      desc: "어제 외운 영단어를 머릿속에서 훔쳐 달아나는 짓궂은 고블린.",
      reward: { exp: 85, gold: 160, gems: 2 },
      subject: "english"
    },
    {
      id: "mon_03",
      name: "오답의 불꽃 드래곤",
      level: 3,
      hp: 240,
      maxHp: 240,
      atk: 25,
      icon: "🐲",
      svgType: "dragon",
      color: "#ef4444",
      desc: "국어 지문을 건성으로 읽게 만드는 치명적인 불꽃 드래곤.",
      reward: { exp: 140, gold: 250, gems: 5 },
      subject: "korean"
    }
  ],
  subjects: {
    korean: {
      id: "korean",
      name: "국어",
      icon: "📖",
      color: "#3b82f6",
      bgGradient: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
      desc: "문해력, 어휘, 문법 마법을 연마하는 지혜의 영역",
      totalStages: 3,
      currentStage: 1,
      questions: [
        {
          id: "kr_01",
          question: "다음 중 단어의 품사가 '형용사'인 것은 무엇일까요?",
          options: ["공부하다", "아름답다", "달리다", "책상"],
          answer: 1,
          explanation: "'아름답다'는 대상의 상태나 성질을 나타내므로 형용사입니다. ('공부하다', '달리다'는 동사, '책상'은 명사)"
        },
        {
          id: "kr_02",
          question: "문장에서 동작이나 상태의 주체가 되는 성분은?",
          options: ["주어", "서술어", "목적어", "보어"],
          answer: 0,
          explanation: "'누가/무엇이'에 해당하는 문장의 주체는 '주어'입니다."
        },
        {
          id: "kr_03",
          question: "다음 밑줄 친 표현 중 맞춤법이 올바른 것은?",
          options: ["시간이 늧었다", "숙제를 다 마쳤다", "내일 봬요 (X)", "빨리 가께요"],
          answer: 1,
          explanation: "'마쳤다'가 올바른 표준 표기입니다. (늦었다, 갈게요 가 맞습니다)"
        },
        {
          id: "kr_04",
          question: "시(詩)에서 감각적이고 생생한 느낌을 주기 위해 사용하는 심상 중 '새들의 지저귐'에 해당하는 것은?",
          options: ["시각적 심상", "청각적 심상", "후각적 심상", "촉각적 심상"],
          answer: 1,
          explanation: "소리를 표현하는 심상은 '청각적 심상'입니다."
        }
      ]
    },
    english: {
      id: "english",
      name: "영어",
      icon: "🔤",
      color: "#8b5cf6",
      bgGradient: "linear-gradient(135deg, #4c1d95, #8b5cf6)",
      desc: "글로벌 모험가들과 소통하는 마법의 언어 영역",
      totalStages: 3,
      currentStage: 1,
      questions: [
        {
          id: "en_01",
          question: "다음 빈칸에 들어갈 알맞은 단어는? \n\"She _____ to school every weekday.\"",
          options: ["go", "goes", "going", "gone"],
          answer: 1,
          explanation: "주어가 3인칭 단수(She)이고 현재 습관이므로 동사원형에 -es를 붙인 'goes'가 정답입니다."
        },
        {
          id: "en_02",
          question: "단어 'Knowledge'의 한국어 뜻으로 가장 적절한 것은?",
          options: ["도전", "지식", "모험", "우정"],
          answer: 1,
          explanation: "Knowledge는 '지식, 앎'을 뜻합니다."
        },
        {
          id: "en_03",
          question: "\"I am interested _____ learning science.\" 빈칸에 알맞은 전치사는?",
          options: ["at", "on", "in", "with"],
          answer: 2,
          explanation: "'be interested in ~' (~에 흥미가 있다)는 필수 숙어 표현입니다."
        },
        {
          id: "en_04",
          question: "다음 중 과거 시제 형태가 잘못 짝지어진 것은?",
          options: ["make - made", "see - saw", "buy - bought", "take - taked"],
          answer: 3,
          explanation: "take의 과거형은 'took'입니다. (taked는 잘못된 형태)"
        }
      ]
    },
    math: {
      id: "math",
      name: "수학",
      icon: "📐",
      color: "#ec4899",
      bgGradient: "linear-gradient(135deg, #831843, #ec4899)",
      desc: "논리적 법칙과 수의 질서를 탐구하는 마법 기하학",
      totalStages: 3,
      currentStage: 1,
      questions: [
        {
          id: "ma_01",
          question: "다음 계산의 결과는? \n(-5) + (+12) = ?",
          options: ["-7", "+7", "-17", "+17"],
          answer: 1,
          explanation: "부호가 다른 두 수의 덧셈은 절댓값이 큰 수의 부호를 취하고 차를 구하므로 +7입니다."
        },
        {
          id: "ma_02",
          question: "일차방정식 2x + 6 = 16 의 해(x)는?",
          options: ["x = 3", "x = 5", "x = 6", "x = 10"],
          answer: 1,
          explanation: "2x = 16 - 6 = 10 이므로 양변을 2로 나누면 x = 5 입니다."
        },
        {
          id: "ma_03",
          question: "삼각형의 세 내각의 크기의 합은 몇 도(°)일까요?",
          options: ["90°", "180°", "270°", "360°"],
          answer: 1,
          explanation: "모든 평면 삼각형의 내각의 총합은 항상 180°입니다."
        },
        {
          id: "ma_04",
          question: "(-3) × (-4) 의 계산 결과는?",
          options: ["-12", "+12", "-7", "+7"],
          answer: 1,
          explanation: "음수와 음수를 곱하면 양수가 되므로 (+12)입니다."
        }
      ]
    }
  },
  studyStats: {
    history: [
      { date: "10/07", minutes: 30, questions: 12, correct: 10 },
      { date: "10/08", minutes: 45, questions: 15, correct: 13 },
      { date: "10/09", minutes: 20, questions: 8, correct: 7 },
      { date: "10/10", minutes: 35, questions: 18, correct: 15 }
    ]
  }
};


/**
 * 우리학급 1인 1역할 배정 도우미
 * script.js 전체 교체 코드
 *
 * 기능
 * 1. 학생명단 및 역할목록 편집
 * 2. 무작위 역할 배정
 * 3. 카드/표 출력
 * 4. 역할 교환
 * 5. A4 인쇄
 * 6. Google Sheets 불러오기 (JSONP)
 * 7. Google Sheets 저장 및 결과 검증
 *
 * 실제 학생 개인정보는 공개 JSONP에 사용하지 마세요.
 */

// ==============================================
// 1. 기본 데이터
// ==============================================

const DEFAULT_STUDENTS = [
  '김민준', '이서아', '박도윤', '최하은',
  '정예준', '강지우', '조시우', '윤서연',
  '장하준', '임지아', '한은우', '송수아'
];

const DEFAULT_ROLES = [
  {
    name: '칠판 지우미',
    tag: '교실정돈',
    icon: '🧹',
    desc: '수업 후 칠판을 깨끗이 닦고 분필 가루를 털어요'
  },
  {
    name: '우유·급식 도우미',
    tag: '급식위생',
    icon: '🥛',
    desc: '우유 상자를 챙기고 급식 줄을 차례대로 안내해요'
  },
  {
    name: '에너지 지킴이',
    tag: '환경안전',
    icon: '💡',
    desc: '쉬는 시간 소등과 교실 환기 창문을 챙겨요'
  },
  {
    name: '줄서기 대장',
    tag: '질서지도',
    icon: '🚶',
    desc: '특별실 이동할 때 앞장서서 바른 줄을 인솔해요'
  },
  {
    name: '식사 정리 도우미',
    tag: '급식위생',
    icon: '🍱',
    desc: '식판을 깨끗이 비우고 주변 자리를 정돈해요'
  },
  {
    name: '알림장·학습지 배부',
    tag: '학습지원',
    icon: '📑',
    desc: '선생님 말씀과 유인물을 친구들에게 배부해요'
  },
  {
    name: '학급 도서관 사서',
    tag: '학습지원',
    icon: '📚',
    desc: '교실 책장의 학급문고를 정리해요'
  },
  {
    name: '체육기구 관리',
    tag: '체육활동',
    icon: '⚽',
    desc: '체육 시간 공과 줄넘기를 안전하게 관리해요'
  },
  {
    name: '분리수거 대장',
    tag: '환경안전',
    icon: '♻️',
    desc: '종이와 플라스틱을 분리수거하도록 안내해요'
  },
  {
    name: '반려식물 사랑이',
    tag: '환경안전',
    icon: '🌱',
    desc: '교실 화분에 물을 주고 식물을 돌봐요'
  },
  {
    name: '컴퓨터·방송 도우미',
    tag: '미디어',
    icon: '💻',
    desc: '방송과 교실 컴퓨터 전원을 관리해요'
  },
  {
    name: '보건·위생 지킴이',
    tag: '보건위생',
    icon: '🧼',
    desc: '손 씻기와 교실 위생을 살펴요'
  }
];

const STORAGE_KEYS = {
  STUDENTS: 'daum_class_students_v1',
  ROLES: 'daum_class_roles_v1',
  RESULTS: 'daum_class_results_v1',
  CLASS_TITLE: 'daum_class_title_v1',
  APPS_SCRIPT_URL: 'daum_class_apps_script_url_v1',
  LAST_DATE: 'daum_class_last_date_v1'
};

let students = [];
let roles = [];
let assignments = [];
let currentTab = 'all';
let toastTimer = null;
let studentNumbers = {};

// ==============================================
// 2. 공통 함수
// ==============================================

function el(id) {
  return document.getElementById(id);
}

function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function showToast(message) {
  const toast = el('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden');

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 4500);
}

function getTagByRoleName(name) {
  name = String(name || '');

  if (/급식|우유|식사/.test(name)) return '급식위생';
  if (/환경|분리|식물|환기|불끄기/.test(name)) return '환경안전';
  if (/사서|알림장|학습/.test(name)) return '학습지원';
  if (/컴퓨터|방송/.test(name)) return '미디어';
  if (/체육/.test(name)) return '체육활동';

  return '학급봉사';
}

// ==============================================
// 3. 학생/역할 데이터 정규화
// ==============================================

function normalizeStudent(student) {
  if (typeof student === 'string') {
    return student.trim();
  }

  if (student && typeof student === 'object') {
    return String(
      student.name ??
      student.student ??
      student.이름 ??
      ''
    ).trim();
  }

  return '';
}

function normalizeRole(role) {
  if (typeof role === 'string') {
    return {
      name: role.trim(),
      tag: getTagByRoleName(role),
      icon: '🌟',
      desc: ''
    };
  }

  if (!role || typeof role !== 'object') {
    return null;
  }

  const name = String(
    role.name ?? role.role ?? role.역할 ?? ''
  ).trim();

  if (!name) return null;

  return {
    name,
    tag: String(
      role.tag || getTagByRoleName(name)
    ),
    icon: String(role.icon || '🌟'),
    desc: String(role.desc || '')
  };
}

function normalizeAssignment(item) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const student = normalizeStudent(
    item.student ?? item.name
  );

  const role = typeof item.role === 'object'
    ? normalizeRole(item.role)
    : normalizeRole({
        name: item.role,
        tag: item.tag,
        icon: item.icon,
        desc: item.desc
      });

  if (!student || !role) return null;

  return {
    student,
    role: role.name,
    tag: role.tag,
    icon: role.icon,
    desc: role.desc
  };
}

// ==============================================
// 4. 초기화
// ==============================================

document.addEventListener('DOMContentLoaded', () => {
  initTodayDate();
  loadData();
  bindEvents();
  renderAll();
});

function initTodayDate() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  const text =
    `${now.getFullYear()}. ` +
    `${String(now.getMonth() + 1).padStart(2, '0')}. ` +
    `${String(now.getDate()).padStart(2, '0')} ` +
    `(${days[now.getDay()]})`;

  if (el('daumTodayDate')) {
    el('daumTodayDate').textContent = text;
  }

  if (el('printDateText')) {
    el('printDateText').textContent =
      `${now.getFullYear()}년 ` +
      `${now.getMonth() + 1}월 ${now.getDate()}일`;
  }
}

function loadData() {
  const savedStudents = safeParse(
    localStorage.getItem(STORAGE_KEYS.STUDENTS),
    DEFAULT_STUDENTS
  );

  students = (Array.isArray(savedStudents)
    ? savedStudents
    : DEFAULT_STUDENTS)
    .map(normalizeStudent)
    .filter(Boolean);

  const savedRoles = safeParse(
    localStorage.getItem(STORAGE_KEYS.ROLES),
    DEFAULT_ROLES
  );

  roles = (Array.isArray(savedRoles)
    ? savedRoles
    : DEFAULT_ROLES)
    .map(normalizeRole)
    .filter(Boolean);

  const savedAssignments = safeParse(
    localStorage.getItem(STORAGE_KEYS.RESULTS),
    []
  );

  assignments = (Array.isArray(savedAssignments)
    ? savedAssignments
    : [])
    .map(normalizeAssignment)
    .filter(Boolean);

  if (!assignments.length) {
    matchDefaults();
  }

  const title =
    localStorage.getItem(STORAGE_KEYS.CLASS_TITLE) ||
    '3학년 2반';

  if (el('classTitleInput')) {
    el('classTitleInput').value = title;
  }

  updateClassTitle(title);

  const url = localStorage.getItem(
    STORAGE_KEYS.APPS_SCRIPT_URL
  );

  if (url && el('appsScriptUrl')) {
    el('appsScriptUrl').value = url;
  }

  updateSheetStatusUI(Boolean(url));

  const date = localStorage.getItem(
    STORAGE_KEYS.LAST_DATE
  );

  if (date && el('lastAssignedInfo')) {
    el('lastAssignedInfo').textContent =
      `배정 완료: ${date}`;
  }

  saveLocalData();
  syncInputsToState();
}

function saveLocalData() {
  localStorage.setItem(
    STORAGE_KEYS.STUDENTS,
    JSON.stringify(students)
  );

  localStorage.setItem(
    STORAGE_KEYS.ROLES,
    JSON.stringify(roles)
  );

  localStorage.setItem(
    STORAGE_KEYS.RESULTS,
    JSON.stringify(assignments)
  );
}

function updateClassTitle(title) {
  if (el('printClassTitle')) {
    el('printClassTitle').textContent =
      `${title} 1인 1역할 배정표`;
  }

  if (el('asideClassName')) {
    el('asideClassName').textContent = title;
  }
}

// ==============================================
// 5. 기본 역할 배정
// ==============================================

function matchDefaults() {
  assignments = [];

  const count = Math.min(
    students.length,
    roles.length
  );

  for (let i = 0; i < count; i++) {
    assignments.push({
      student: students[i],
      role: roles[i].name,
      tag: roles[i].tag,
      icon: roles[i].icon,
      desc: roles[i].desc
    });
  }
}

function syncInputsToState() {
  if (el('studentListInput')) {
    el('studentListInput').value =
      students.join('\n');
  }

  if (el('roleListInput')) {
    el('roleListInput').value = roles.map(r =>
      `${r.icon} ${r.name}` +
      (r.desc ? ` - ${r.desc}` : '')
    ).join('\n');
  }

  const counters = {
    studentCountBadge: students.length,
    roleCountBadge: roles.length,
    editStudentCount: students.length,
    editRoleCount: roles.length,
    asideStudentCount: `${students.length}명`,
    asideRoleCount: `${roles.length}개`
  };

  Object.entries(counters).forEach(([id, value]) => {
    if (el(id)) el(id).textContent = value;
  });
}

// ==============================================
// 6. 버튼 이벤트
// ==============================================

function bindEvents() {
  function on(id, fn) {
    if (el(id)) {
      el(id).addEventListener('click', fn);
    }
  }

  on('btnAssign', handleRandomAssignment);
  on('btnQuickAssign', handleRandomAssignment);
  on('btnPrint', handlePrint);
  on('btnQuickPrint', handlePrint);

  on('btnSaveEditedList', handleSaveEditedList);
  on('btnShuffleStudents', handleShuffleStudentInput);

  on('btnRestoreRoles', () => {
    roles = DEFAULT_ROLES.map(r => ({ ...r }));
    syncInputsToState();
    showToast('추천 역할 12개를 불러왔습니다.');
  });

  on('btnResetDefault', handleResetDefault);

  on('btnLoadSheet', handleLoadFromGoogleSheet);
  on('btnSaveSheet', handleSaveToGoogleSheet);

  on('btnOpenSheetSettings', openSheetModal);
  on('btnAsideOpenSettings', openSheetModal);

  on('btnCloseModal', closeSheetModal);
  on('btnCloseModalBtn', closeSheetModal);
  on('btnSaveAppsScriptUrl', saveAppsScriptUrl);

  if (el('classTitleInput')) {
    el('classTitleInput').addEventListener(
      'input',
      e => {
        const title = e.target.value.trim() || '우리학급';

        updateClassTitle(title);

        localStorage.setItem(
          STORAGE_KEYS.CLASS_TITLE,
          title
        );
      }
    );
  }

  document.querySelectorAll('.tab-item')
    .forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-item')
          .forEach(t => t.classList.remove('active'));

        tab.classList.add('active');
        handleTabSwitch(tab.dataset.tab);
      });
    });
}

// ==============================================
// 7. 탭 화면 전환
// ==============================================

function handleTabSwitch(tabKey) {
  currentTab = tabKey;

  const cards = el('cardGridView');
  const table = el('tableView');
  const manage = el('managePanel');

  if (!cards || !table || !manage) return;

  cards.classList.toggle(
    'hidden',
    tabKey === 'table'
  );

  table.classList.toggle(
    'hidden',
    tabKey !== 'table'
  );

  manage.classList.toggle(
    'hidden',
    tabKey !== 'manage'
  );

  if (tabKey === 'manage') {
    manage.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

// ==============================================
// 8. 무작위 역할 배정
// ==============================================

function handleRandomAssignment() {
  if (!students.length || !roles.length) {
    showToast('학생명단과 역할목록을 입력하세요.');
    return;
  }

  const overlay = el('shuffleOverlay');
  const fill = el('progressBarFill');
  const quote = el('shuffleQuote');

  const quotes = [
    '공정하게 역할을 배정하고 있습니다.',
    '우리 반 친구들의 역할을 찾는 중입니다.',
    '멋진 학급 도우미를 선정하고 있습니다.'
  ];

  if (quote) {
    quote.textContent =
      quotes[Math.floor(Math.random() * quotes.length)];
  }

  if (!overlay || !fill) {
    performShuffle();
    return;
  }

  overlay.classList.remove('hidden');
  fill.style.width = '0%';

  let progress = 0;

  const timer = setInterval(() => {
    progress = Math.min(progress + 12, 100);
    fill.style.width = `${progress}%`;

    if (progress >= 100) {
      clearInterval(timer);
      overlay.classList.add('hidden');
      performShuffle();
    }
  }, 60);
}

function performShuffle() {
  const shuffledRoles = [...roles];

  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffledRoles[i], shuffledRoles[j]] =
      [shuffledRoles[j], shuffledRoles[i]];
  }

  assignments = [];

  const count = Math.min(
    students.length,
    shuffledRoles.length
  );

  for (let i = 0; i < count; i++) {
    const role = shuffledRoles[i];

    assignments.push({
      student: students[i],
      role: role.name,
      tag: role.tag,
      icon: role.icon,
      desc: role.desc
    });
  }

  const now = new Date();

  const dateStr =
    `${now.getFullYear()}.` +
    `${String(now.getMonth() + 1).padStart(2, '0')}.` +
    `${String(now.getDate()).padStart(2, '0')} ` +
    `${String(now.getHours()).padStart(2, '0')}:` +
    `${String(now.getMinutes()).padStart(2, '0')}`;

  if (el('lastAssignedInfo')) {
    el('lastAssignedInfo').textContent =
      `배정 완료: ${dateStr}`;
  }

  localStorage.setItem(
    STORAGE_KEYS.LAST_DATE,
    dateStr
  );

  saveLocalData();
  renderAll();
  playDaumChime();

  showToast('새로운 역할 배정이 완료되었습니다!');

  if (currentTab === 'manage') {
    handleTabSwitch('all');

    document.querySelectorAll('.tab-item')
      .forEach(tab => {
        tab.classList.toggle(
          'active',
          tab.dataset.tab === 'all'
        );
      });
  }
}

// ==============================================
// 9. 효과음
// ==============================================

function playDaumChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    [587.33, 880].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const start = ctx.currentTime + index * 0.12;

      gain.gain.setValueAtTime(0.12, start);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        start + 0.3
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + 0.31);
    });
  } catch (error) {
    console.warn('효과음 사용 불가:', error);
  }
}

// ==============================================
// 10. 카드/표 렌더링
// ==============================================

function renderAll() {
  renderCardGrid();
  renderTable();
}

function renderCardGrid() {
  const container = el('cardsGrid');
  if (!container) return;

  container.innerHTML = '';

  if (!assignments.length) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">
        <p style="font-size:2rem;">📋</p>
        <p>역할 배정하기 버튼을 눌러주세요.</p>
      </div>
    `;
    return;
  }

  const colors = [
    'tag-blue',
    'tag-green',
    'tag-orange',
    'tag-purple'
  ];

  assignments.forEach((item, index) => {
    const card = document.createElement('div');

    card.className = 'daum-role-card';

    card.innerHTML = `
      <div>
        <div class="card-meta-line">
          <span class="card-tag ${colors[index % colors.length]}">
            ${escapeHTML(item.tag || '역할')}
          </span>
          <span class="card-num">No. ${index + 1}</span>
        </div>

        <div class="card-main-info">
          <div class="card-role-emoji">
            ${escapeHTML(item.icon || '🌟')}
          </div>

          <div class="card-student-box">
            <span class="card-student-label">담당 학생</span>
            <div class="card-student-name">
              ${escapeHTML(item.student)}
            </div>
          </div>
        </div>

        <div class="card-role-body">
          <span class="card-role-name">
            ${escapeHTML(item.role)}
          </span>
          <p class="card-role-desc">
            ${escapeHTML(item.desc)}
          </p>
        </div>
      </div>

      <div class="card-swap-bar no-print">
        <button class="btn-card-swap"
          onclick="swapWithNext(${index})">
          <i class="fa-solid fa-arrows-rotate"></i>
          교환
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

function renderTable() {
  const tbody = el('tableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  assignments.forEach((item, index) => {
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td class="tbl-student">
        ${escapeHTML(item.student)}
      </td>
      <td class="tbl-role">
        ${escapeHTML(item.icon)}
        ${escapeHTML(item.role)}
      </td>
      <td>${escapeHTML(item.desc)}</td>
    `;

    tbody.appendChild(tr);
  });
}

// ==============================================
// 11. 역할 교환
// ==============================================

window.swapWithNext = function(index) {
  if (assignments.length < 2) return;

  const next = (index + 1) % assignments.length;

  const keys = ['role', 'tag', 'icon', 'desc'];

  keys.forEach(key => {
    const temp = assignments[index][key];

    assignments[index][key] =
      assignments[next][key];

    assignments[next][key] = temp;
  });

  saveLocalData();
  renderAll();

  showToast('두 학생의 역할을 교환했습니다.');
};

// ==============================================
// 12. 명단과 역할 편집
// ==============================================

function handleSaveEditedList() {
  const studentText = el('studentListInput').value;
  const roleText = el('roleListInput').value;

  const parsedStudents = studentText
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const parsedRoles = roleText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separator = line.indexOf(' - ');

      const main = separator >= 0
        ? line.slice(0, separator).trim()
        : line;

      const desc = separator >= 0
        ? line.slice(separator + 3).trim()
        : '';

      const emojiMatch = main.match(
        /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u
      );

      const icon = emojiMatch
        ? emojiMatch[0]
        : '🌟';

      const name = emojiMatch
        ? main.slice(icon.length).trim()
        : main.trim();

      return normalizeRole({
        name,
        icon,
        desc,
        tag: getTagByRoleName(name)
      });
    })
    .filter(Boolean);

  if (!parsedStudents.length) {
    showToast('학생 이름을 입력하세요.');
    return;
  }

  if (!parsedRoles.length) {
    showToast('역할을 입력하세요.');
    return;
  }

  students = parsedStudents;
  roles = parsedRoles;

  saveLocalData();
  syncInputsToState();
  performShuffle();

  showToast('수정한 명단과 역할을 적용했습니다.');
}

function handleShuffleStudentInput() {
  for (let i = students.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [students[i], students[j]] =
      [students[j], students[i]];
  }

  if (el('studentListInput')) {
    el('studentListInput').value =
      students.join('\n');
  }

  showToast('학생 순서를 섞었습니다.');
}

function handleResetDefault() {
  if (!confirm('기본 데이터로 초기화할까요?')) {
    return;
  }

  students = [...DEFAULT_STUDENTS];
  roles = DEFAULT_ROLES.map(r => ({ ...r }));
  studentNumbers = {};

  localStorage.removeItem(STORAGE_KEYS.RESULTS);
  localStorage.removeItem(STORAGE_KEYS.LAST_DATE);
  localStorage.removeItem(STORAGE_KEYS.CLASS_TITLE);

  if (el('classTitleInput')) {
    el('classTitleInput').value = '3학년 2반';
  }

  updateClassTitle('3학년 2반');

  matchDefaults();
  saveLocalData();
  syncInputsToState();
  renderAll();

  showToast('기본 데이터로 복원했습니다.');
}

// ==============================================
// 13. 인쇄
// ==============================================

function handlePrint() {
  const title = el('classTitleInput')
    ?.value.trim() || '우리학급';

  updateClassTitle(title);
  window.print();
}

// ==============================================
// 14. Google Apps Script URL 설정
// ==============================================

function openSheetModal() {
  el('sheetsModal')?.classList.remove('hidden');
}

function closeSheetModal() {
  el('sheetsModal')?.classList.add('hidden');
}

function saveAppsScriptUrl() {
  const url = el('appsScriptUrl').value.trim();

  if (
    url &&
    !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url)
  ) {
    showToast('올바른 Apps Script /exec URL을 입력하세요.');
    return;
  }

  localStorage.setItem(
    STORAGE_KEYS.APPS_SCRIPT_URL,
    url
  );

  closeSheetModal();
  updateSheetStatusUI(Boolean(url));

  showToast(
    url ? 'URL 등록 완료. 연결 테스트는 명단 불러오기로 진행하세요.'
        : 'URL 등록을 해제했습니다.'
  );
}

function updateSheetStatusUI(hasUrl) {
  const status = el('asideSheetStatus');

  if (!status) return;

  if (hasUrl) {
    status.innerHTML = `
      <span class="status-dot"
        style="background:#f59e0b"></span>
      <span>연동 상태: URL 등록됨 (연결 미확인)</span>
    `;
  } else {
    status.innerHTML = `
      <span class="status-dot"
        style="background:#94a3b8"></span>
      <span>연동 상태: URL 미등록</span>
    `;
  }
}

function setSheetConnected() {
  const status = el('asideSheetStatus');

  if (!status) return;

  status.innerHTML = `
    <span class="status-dot"
      style="background:#10b981"></span>
    <span>연동 상태: 시트 데이터 조회 성공</span>
  `;
}

function getSheetUrl() {
  return localStorage.getItem(
    STORAGE_KEYS.APPS_SCRIPT_URL
  ) || '';
}

// ==============================================
// 15. JSONP - 구글 시트 불러오기
// ==============================================

function loadSheetJSONP(url) {
  return new Promise((resolve, reject) => {
    const callbackName =
      'role01Cb_' + Date.now() + '_' +
      Math.random().toString(36).slice(2);

    const script = document.createElement('script');
    let finished = false;

    const timer = setTimeout(() => {
      finish(new Error(
        '연결 시간 초과: 웹앱 URL과 배포 권한을 확인하세요.'
      ));
    }, 15000);

    function finish(error, data) {
      if (finished) return;

      finished = true;
      clearTimeout(timer);

      script.remove();
      delete window[callbackName];

      if (error) reject(error);
      else resolve(data);
    }

    window[callbackName] = data => {
      finish(null, data);
    };

    script.onerror = () => {
      finish(new Error(
        '스크립트 연결 실패: URL, 배포 설정 또는 브라우저 차단을 확인하세요.'
      ));
    };

    const separator = url.includes('?') ? '&' : '?';

    script.src =
      url + separator +
      'callback=' + encodeURIComponent(callbackName) +
      '&t=' + Date.now();

    document.head.appendChild(script);
  });
}

// ==============================================
// 16. 구글 스프레드시트 명단 불러오기
// ==============================================

async function handleLoadFromGoogleSheet() {
  const url = getSheetUrl();

  if (!url) {
    showToast('먼저 Apps Script URL을 등록하세요.');
    openSheetModal();
    return;
  }

  showToast('구글 시트에서 명단을 불러오는 중...');

  try {
    const data = await loadSheetJSONP(url);

    if (data.status !== 'success') {
      throw new Error(
        data.message || 'Apps Script 응답 오류'
      );
    }

    if (!Array.isArray(data.students)) {
      throw new Error('학생명단 형식이 올바르지 않습니다.');
    }

    const loadedStudents = data.students
      .map(normalizeStudent)
      .filter(Boolean);

    if (!loadedStudents.length) {
      throw new Error('구글 시트에 학생이 없습니다.');
    }

    const loadedRoles = Array.isArray(data.roles)
      ? data.roles.map(normalizeRole).filter(Boolean)
      : [];

    students = loadedStudents;

    if (loadedRoles.length) {
      roles = loadedRoles;
    }

    // 실제 시트 번호 보관
    studentNumbers = {};

    data.students.forEach((s, index) => {
      const name = normalizeStudent(s);

      if (name) {
        studentNumbers[name] =
          s && typeof s === 'object'
            ? String(s.num ?? index + 1)
            : String(index + 1);
      }
    });

    // 현재 명단에 맞게 재배정
    // 기존 잘못된 object 데이터 제거
    assignments = [];

    saveLocalData();
    syncInputsToState();
    performShuffle();

    setSheetConnected();

    showToast(
      `학생 ${students.length}명, 역할 ${roles.length}개 불러오기 완료!`
    );

  } catch (error) {
    console.error('시트 불러오기 오류:', error);

    showToast('불러오기 실패: ' + error.message);

    updateSheetStatusUI(true);
  }
}

// ==============================================
// 17. Google Sheets 저장
// ==============================================

async function handleSaveToGoogleSheet() {
  const url = getSheetUrl();

  if (!url) {
    showToast('Apps Script URL을 등록하세요.');
    return;
  }

  if (!assignments.length) {
    showToast('먼저 역할을 배정하세요.');
    return;
  }

  const requestId =
    'role01_' + Date.now() + '_' +
    Math.random().toString(36).slice(2);

  const payload = {
    action: 'saveResults',
    requestId,
    assignments: assignments.map((item, index) => ({
      num: studentNumbers[item.student] || index + 1,
      name: normalizeStudent(item.student),
      role: String(item.role || ''),
      desc: String(item.desc || '')
    }))
  };

  showToast('구글 시트에 저장 요청 중...');

  const saveButton = el('btnSaveSheet');

  if (saveButton) saveButton.disabled = true;

  try {
    // Apps Script POST 요청
    // no-cors 응답은 직접 읽을 수 없으므로
    // 이어서 GET으로 실제 저장 결과 검증
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });

    let verified = false;

    for (let attempt = 0; attempt < 4; attempt++) {
      await new Promise(resolve =>
        setTimeout(resolve, 1200)
      );

      const result = await loadSheetJSONP(url);

      if (
        result.status === 'success' &&
        Array.isArray(result.results) &&
        result.results.length === payload.assignments.length &&
        result.results.every(
          row => String(row.requestId) === requestId
        )
      ) {
        verified = true;
        break;
      }
    }

    if (!verified) {
      throw new Error(
        '시트에서 저장 결과가 확인되지 않았습니다.'
      );
    }

    setSheetConnected();

    showToast('구글 스프레드시트 저장 확인 완료!');

  } catch (error) {
    console.error('구글 시트 저장 오류:', error);

    showToast(
      '저장 확인 실패: ' + error.message
    );

  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

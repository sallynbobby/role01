/**
 * 우리학급 1인 1역할 배정 도우미 - script.js
 * Daum 포털 스타일 인터페이스 및 동작 로직
 */

// 1. 기본 예시 데이터 (학생 12명 & 추천 역할 12개)
const DEFAULT_STUDENTS = [
  '김민준',
  '이서아',
  '박도윤',
  '최하은',
  '정예준',
  '강지우',
  '조시우',
  '윤서연',
  '장하준',
  '임지아',
  '한은우',
  '송수아',
];

const DEFAULT_ROLES = [
  { name: '칠판 지우미', tag: '교실정돈', icon: '🧹', desc: '수업 후 칠판을 깨끗이 닦고 분필 가루를 털어요' },
  { name: '우유·급식 도우미', tag: '급식위생', icon: '🥛', desc: '우유 상자를 챙기고 급식 줄을 차례대로 안내해요' },
  { name: '에너지 지킴이', tag: '환경안전', icon: '💡', desc: '쉬는 시간 소등과 교실 환기 창문을 챙겨요' },
  { name: '줄서기 대장', tag: '질서지도', icon: '🚶', desc: '특별실 이동할 때 앞장서서 바른 줄을 인솔해요' },
  { name: '식사 정리 도우미', tag: '급식위생', icon: '🍱', desc: '식판을 깨끗이 비우고 주변 자리를 정돈해요' },
  { name: '알림장·학습지 배부', tag: '학습지원', icon: '📑', desc: '선생님 말씀과 유인물을 친구들에게 신속히 배부해요' },
  { name: '학급 도서관 사서', tag: '학습지원', icon: '📚', desc: '교실 책장의 학급문고를 십진분류 순서로 정리해요' },
  { name: '체육기구 관리', tag: '체육활동', icon: '⚽', desc: '체육 시간 공과 줄넘기를 안전하게 대여 및 반납해요' },
  { name: '분리수거 대장', tag: '환경안전', icon: '♻️', desc: '종이와 플라스틱을 바르게 분리수거하도록 안내해요' },
  { name: '반려식물 사랑이', tag: '환경안전', icon: '🌱', desc: '교실 화분에 물을 주고 따뜻한 햇빛을 보살펴요' },
  { name: '컴퓨터·방송 도우미', tag: '미디어', icon: '💻', desc: '아침 방송 켜기와 컴퓨터 화면 전원을 관리해요' },
  { name: '보건·위생 지킴이', tag: '보건위생', icon: '🧼', desc: '손 씻기 비누와 교실 소독 티슈를 깔끔히 살펴요' },
];

// 로컬 스토리지 키
const STORAGE_KEYS = {
  STUDENTS: 'daum_class_students_v1',
  ROLES: 'daum_class_roles_v1',
  RESULTS: 'daum_class_results_v1',
  CLASS_TITLE: 'daum_class_title_v1',
  APPS_SCRIPT_URL: 'daum_class_apps_script_url_v1',
  LAST_DATE: 'daum_class_last_date_v1',
};

// State
let students = [];
let roles = [];
let assignments = []; // Array of { student, role, tag, icon, desc }
let currentTab = 'all'; // 'all' (카드), 'table' (표), 'manage' (관리)

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTodayDate();
  loadData();
  bindEvents();
  renderAll();
});

/**
 * Daum 상단 오늘 날짜 표시 (예: 2026. 10. 17 (토))
 */
function initTodayDate() {
  const now = new Date();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const formatted = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(
    now.getDate()
  ).padStart(2, '0')} (${dayNames[now.getDay()]})`;

  const el = document.getElementById('daumTodayDate');
  if (el) el.textContent = formatted;

  const printEl = document.getElementById('printDateText');
  if (printEl) printEl.textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

/**
 * 로컬스토리지 또는 기본값 로드
 */
function loadData() {
  const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  students = savedStudents ? JSON.parse(savedStudents) : [...DEFAULT_STUDENTS];

  const savedRoles = localStorage.getItem(STORAGE_KEYS.ROLES);
  roles = savedRoles ? JSON.parse(savedRoles) : JSON.parse(JSON.stringify(DEFAULT_ROLES));

  const savedTitle = localStorage.getItem(STORAGE_KEYS.CLASS_TITLE);
  const title = savedTitle || '3학년 2반';
  document.getElementById('classTitleInput').value = title;
  document.getElementById('printClassTitle').textContent = `${title} 1인 1역할 배정표`;
  const asideTitleEl = document.getElementById('asideClassName');
  if (asideTitleEl) asideTitleEl.textContent = title;

  const savedUrl = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL);
  if (savedUrl) {
    document.getElementById('appsScriptUrl').value = savedUrl;
    updateSheetStatusUI(true);
  }

  const savedResults = localStorage.getItem(STORAGE_KEYS.RESULTS);
  if (savedResults) {
    assignments = JSON.parse(savedResults);
    const savedDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
    if (savedDate) {
      document.getElementById('lastAssignedInfo').innerHTML = `
        <i class="fa-solid fa-circle-check" style="color: #246beb;"></i> 배정 완료: ${savedDate}
      `;
      document.getElementById('printDateText').textContent = savedDate;
    }
  } else {
    // 초기 1:1 순차 매칭
    matchDefaults();
  }

  syncInputsToState();
}

/**
 * 기본 1:1 매칭
 */
function matchDefaults() {
  assignments = [];
  const count = Math.min(students.length, roles.length);
  for (let i = 0; i < count; i++) {
    assignments.push({
      student: students[i],
      role: roles[i].name,
      tag: roles[i].tag || '역할',
      icon: roles[i].icon || '🌟',
      desc: roles[i].desc || '우리 반을 위해 힘차게 봉사해요!',
    });
  }
}

/**
 * 입력창 및 통계 위젯 동기화
 */
function syncInputsToState() {
  document.getElementById('studentListInput').value = students.join('\n');
  document.getElementById('roleListInput').value = roles
    .map((r) => `${r.icon ? r.icon + ' ' : ''}${r.name}${r.desc ? ' - ' + r.desc : ''}`)
    .join('\n');

  document.getElementById('studentCountBadge').textContent = students.length;
  document.getElementById('roleCountBadge').textContent = roles.length;
  document.getElementById('editStudentCount').textContent = students.length;
  document.getElementById('editRoleCount').textContent = roles.length;

  const asideStud = document.getElementById('asideStudentCount');
  if (asideStud) asideStud.textContent = `${students.length}명`;
  const asideRole = document.getElementById('asideRoleCount');
  if (asideRole) asideRole.textContent = `${roles.length}개`;
}

// ==========================================================================
// Event Listeners
// ==========================================================================
function bindEvents() {
  // [🎲 역할 배정하기] 검색창 스타일 버튼 & 위젯 버튼
  document.getElementById('btnAssign').addEventListener('click', handleRandomAssignment);
  const quickAssignBtn = document.getElementById('btnQuickAssign');
  if (quickAssignBtn) quickAssignBtn.addEventListener('click', handleRandomAssignment);

  // [🖨️ A4 인쇄] 서브 네비 및 위젯 버튼
  document.getElementById('btnPrint').addEventListener('click', handlePrint);
  const quickPrintBtn = document.getElementById('btnQuickPrint');
  if (quickPrintBtn) quickPrintBtn.addEventListener('click', handlePrint);

  // 탭 네비게이션 ([전체 배정 카드] / [목록(표) 보기] / [명단 & 역할 편집])
  document.querySelectorAll('.tab-item').forEach((tab) => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-item').forEach((t) => t.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      const tabKey = target.dataset.tab;
      handleTabSwitch(tabKey);
    });
  });

  // 관리 패널 내부 액션
  document.getElementById('btnSaveEditedList').addEventListener('click', handleSaveEditedList);
  document.getElementById('btnShuffleStudents').addEventListener('click', handleShuffleStudentInput);
  document.getElementById('btnRestoreRoles').addEventListener('click', () => {
    roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
    syncInputsToState();
    showToast('Daum 추천 12개 학급 역할로 채웠습니다.');
  });

  // 초기화 버튼
  document.getElementById('btnResetDefault').addEventListener('click', handleResetDefault);

  // 학급명 수정 실시간 동기화
  const classInput = document.getElementById('classTitleInput');
  classInput.addEventListener('input', (e) => {
    const val = e.target.value.trim() || '우리학급';
    document.getElementById('printClassTitle').textContent = `${val} 1인 1역할 배정표`;
    const asideTitleEl = document.getElementById('asideClassName');
    if (asideTitleEl) asideTitleEl.textContent = val;
    localStorage.setItem(STORAGE_KEYS.CLASS_TITLE, val);
  });

  // 구글 스프레드시트 관련 버튼
  document.getElementById('btnLoadSheet').addEventListener('click', handleLoadFromGoogleSheet);
  document.getElementById('btnSaveSheet').addEventListener('click', handleSaveToGoogleSheet);
  document.getElementById('btnOpenSheetSettings').addEventListener('click', openSheetModal);

  const asideSettingsBtn = document.getElementById('btnAsideOpenSettings');
  if (asideSettingsBtn) asideSettingsBtn.addEventListener('click', openSheetModal);

  // 모달 닫기 및 URL 저장
  document.getElementById('btnCloseModal').addEventListener('click', closeSheetModal);
  document.getElementById('btnCloseModalBtn').addEventListener('click', closeSheetModal);
  document.getElementById('btnSaveAppsScriptUrl').addEventListener('click', saveAppsScriptUrl);
}

// ==========================================================================
// Tab Switching Logic
// ==========================================================================
function handleTabSwitch(tabKey) {
  currentTab = tabKey;
  const cardSection = document.getElementById('cardGridView');
  const tableSection = document.getElementById('tableView');
  const manageSection = document.getElementById('managePanel');

  if (tabKey === 'all') {
    cardSection.classList.remove('hidden');
    tableSection.classList.add('hidden');
    manageSection.classList.add('hidden');
  } else if (tabKey === 'table') {
    cardSection.classList.add('hidden');
    tableSection.classList.remove('hidden');
    manageSection.classList.add('hidden');
  } else if (tabKey === 'manage') {
    cardSection.classList.remove('hidden');
    tableSection.classList.add('hidden');
    manageSection.classList.remove('hidden');
    manageSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==========================================================================
// Core: Random Assignment (무작위 1:1 매칭)
// ==========================================================================
function handleRandomAssignment() {
  if (students.length === 0 || roles.length === 0) {
    showToast('⚠️ 학생 명단과 역할 목록을 먼저 입력해 주세요.');
    return;
  }

  // Daum 포털 프로그레스 오버레이 실행
  const overlay = document.getElementById('shuffleOverlay');
  const progressFill = document.getElementById('progressBarFill');
  const quoteEl = document.getElementById('shuffleQuote');

  const quotes = [
    '공정하고 신속하게 1:1 무작위 배정 연산 중...',
    '우리 반 친구들의 적재적소 역할을 매칭하고 있습니다.',
    '책임과 봉사로 빛날 학급 도우미를 선정 중입니다.',
    '잠시만 기다려주세요, 매칭 결과가 곧 공개됩니다!',
  ];
  quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  overlay.classList.remove('hidden');
  progressFill.style.width = '0%';

  let progress = 0;
  const interval = setInterval(() => {
    progress += 12;
    progressFill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
      overlay.classList.add('hidden');
      performShuffle();
    }
  }, 60);
}

function performShuffle() {
  // Fisher-Yates 무작위 셔플
  const shuffledRoles = [...roles];
  for (let i = shuffledRoles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
  }

  const count = Math.min(students.length, shuffledRoles.length);
  assignments = [];

  for (let i = 0; i < count; i++) {
    assignments.push({
      student: students[i],
      role: shuffledRoles[i].name,
      tag: shuffledRoles[i].tag || getTagByRoleName(shuffledRoles[i].name),
      icon: shuffledRoles[i].icon || '🌟',
      desc: shuffledRoles[i].desc || '우리 반을 위해 솔선수범 봉사해요!',
    });
  }

  // 배정 일시 갱신
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  document.getElementById('lastAssignedInfo').innerHTML = `
    <i class="fa-solid fa-circle-check" style="color: #246beb;"></i> 배정 완료: ${dateStr}
  `;
  document.getElementById('printDateText').textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  // 저장
  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(assignments));
  localStorage.setItem(STORAGE_KEYS.LAST_DATE, dateStr);

  renderAll();
  playDaumChime();
  showToast('🎉 새로운 1인 1역할 배정이 완료되었습니다!');

  // 'all' 탭으로 전환
  if (currentTab === 'manage') {
    handleTabSwitch('all');
    document.querySelectorAll('.tab-item').forEach((t) => {
      if (t.dataset.tab === 'all') t.classList.add('active');
      else t.classList.remove('active');
    });
  }
}

function getTagByRoleName(name) {
  if (name.includes('급식') || name.includes('우유') || name.includes('식사')) return '급식위생';
  if (name.includes('지킴이') || name.includes('환경') || name.includes('분리') || name.includes('식물')) return '환경안전';
  if (name.includes('사서') || name.includes('알림장') || name.includes('학습')) return '학습지원';
  if (name.includes('컴퓨터') || name.includes('방송')) return '미디어';
  if (name.includes('체육')) return '체육활동';
  return '학급봉사';
}

/**
 * Daum 알림 차임벨 효과음 (Web Audio API)
 */
function playDaumChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [587.33, 880.0]; // D5, A5 맑은 2음 벨
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.31);
    });
  } catch {
    // Graceful fallback
  }
}

// ==========================================================================
// Rendering: Daum Portal News Feed Card Grid
// ==========================================================================
function renderAll() {
  renderCardGrid();
  renderTable();
}

function renderCardGrid() {
  const container = document.getElementById('cardsGrid');
  container.innerHTML = '';

  if (assignments.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#999999;">
        <p style="font-size:2rem; margin-bottom:10px;">📋</p>
        <p>[역할 배정하기] 버튼을 눌러 역할을 배정하세요.</p>
      </div>
    `;
    return;
  }

  const tagStyles = ['tag-blue', 'tag-green', 'tag-orange', 'tag-purple'];

  assignments.forEach((item, index) => {
    const tagClass = tagStyles[index % tagStyles.length];
    const card = document.createElement('div');
    card.className = 'daum-role-card';

    card.innerHTML = `
      <div>
        <div class="card-meta-line">
          <span class="card-tag ${tagClass}">${item.tag || '역할'}</span>
          <span class="card-num">No. ${index + 1}</span>
        </div>
        <div class="card-main-info">
          <div class="card-role-emoji">${item.icon}</div>
          <div class="card-student-box">
            <span class="card-student-label">담당 학생</span>
            <div class="card-student-name">${item.student}</div>
          </div>
        </div>
        <div class="card-role-body">
          <span class="card-role-name">${item.role}</span>
          <p class="card-role-desc">${item.desc}</p>
        </div>
      </div>
      <div class="card-swap-bar no-print">
        <button class="btn-card-swap" onclick="swapWithNext(${index})" title="다음 학생과 역할 맞바꾸기">
          <i class="fa-solid fa-arrows-rotate"></i> 교환
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  assignments.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td class="tbl-student">${item.student}</td>
      <td class="tbl-role">${item.icon} ${item.role}</td>
      <td>${item.desc}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * 인접 학생과 역할 맞바꾸기
 */
window.swapWithNext = function (index) {
  if (assignments.length < 2) return;
  const nextIdx = (index + 1) % assignments.length;

  const tempRole = assignments[index].role;
  const tempTag = assignments[index].tag;
  const tempIcon = assignments[index].icon;
  const tempDesc = assignments[index].desc;

  assignments[index].role = assignments[nextIdx].role;
  assignments[index].tag = assignments[nextIdx].tag;
  assignments[index].icon = assignments[nextIdx].icon;
  assignments[index].desc = assignments[nextIdx].desc;

  assignments[nextIdx].role = tempRole;
  assignments[nextIdx].tag = tempTag;
  assignments[nextIdx].icon = tempIcon;
  assignments[nextIdx].desc = tempDesc;

  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(assignments));
  renderAll();
  showToast(`🔄 [${assignments[index].student}]님과 [${assignments[nextIdx].student}]님의 역할을 교환했습니다.`);
};

// ==========================================================================
// Management & Edit Handlers
// ==========================================================================
function handleSaveEditedList() {
  const studentText = document.getElementById('studentListInput').value;
  const roleText = document.getElementById('roleListInput').value;

  const parsedStudents = studentText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const parsedRoles = roleText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('-');
      const mainPart = parts[0].trim();
      const descPart = parts.length > 1 ? parts.slice(1).join('-').trim() : '';

      const emojiMatch = mainPart.match(
        /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/
      );
      let icon = '🌟';
      let name = mainPart;

      if (emojiMatch) {
        icon = emojiMatch[0];
        name = mainPart.replace(icon, '').trim();
      }

      return {
        name: name || '도우미',
        tag: getTagByRoleName(name),
        icon: icon,
        desc: descPart || '우리 반을 위해 힘차게 봉사해요!',
      };
    });

  if (parsedStudents.length === 0) {
    showToast('⚠️ 학생 이름을 최소 1명 이상 입력해 주세요.');
    return;
  }
  if (parsedRoles.length === 0) {
    showToast('⚠️ 역할을 최소 1개 이상 입력해 주세요.');
    return;
  }

  students = parsedStudents;
  roles = parsedRoles;

  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));

  syncInputsToState();
  performShuffle();
  showToast(`✅ 학생 ${students.length}명, 역할 ${roles.length}개가 적용되었습니다.`);
}

function handleShuffleStudentInput() {
  for (let i = students.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [students[i], students[j]] = [students[j], students[i]];
  }
  document.getElementById('studentListInput').value = students.join('\n');
  showToast('학생 명단 순서를 섞었습니다.');
}

function handleResetDefault() {
  if (!confirm('초기 기본값(Daum 기본 12명, 12개 역할)으로 되돌리시겠습니까?')) return;
  students = [...DEFAULT_STUDENTS];
  roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
  document.getElementById('classTitleInput').value = '3학년 2반';
  document.getElementById('printClassTitle').textContent = '3학년 2반 1인 1역할 배정표';
  const asideTitleEl = document.getElementById('asideClassName');
  if (asideTitleEl) asideTitleEl.textContent = '3학년 2반';

  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ROLES);
  localStorage.removeItem(STORAGE_KEYS.RESULTS);
  localStorage.removeItem(STORAGE_KEYS.CLASS_TITLE);
  localStorage.removeItem(STORAGE_KEYS.LAST_DATE);

  syncInputsToState();
  matchDefaults();
  renderAll();
  showToast('초기 기본 데이터로 복원되었습니다.');
}

// ==========================================================================
// A4 Print Feature
// ==========================================================================
function handlePrint() {
  const classVal = document.getElementById('classTitleInput').value.trim() || '우리학급';
  document.getElementById('printClassTitle').textContent = `${classVal} 1인 1역할 배정표`;
  window.print();
}

// ==========================================================================
// Google Sheets Apps Script Integration
// ==========================================================================
function openSheetModal() {
  document.getElementById('sheetsModal').classList.remove('hidden');
}

function closeSheetModal() {
  document.getElementById('sheetsModal').classList.add('hidden');
}

function saveAppsScriptUrl() {
  const url = document.getElementById('appsScriptUrl').value.trim();
  localStorage.setItem(STORAGE_KEYS.APPS_SCRIPT_URL, url);
  closeSheetModal();
  updateSheetStatusUI(Boolean(url));
  showToast('💾 스프레드시트 연동 URL이 저장되었습니다.');
}

function updateSheetStatusUI(isConnected) {
  const statusEl = document.getElementById('asideSheetStatus');
  if (statusEl) {
    if (isConnected) {
      statusEl.innerHTML = '<span class="status-dot" style="background:#10b981;"></span> <span>연동 상태: 웹 앱 URL 등록됨</span>';
    } else {
      statusEl.innerHTML = '<span class="status-dot" style="background:#94a3b8;"></span> <span>연동 상태: URL 미등록</span>';
    }
  }
}

async function handleLoadFromGoogleSheet() {
  const url = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || document.getElementById('appsScriptUrl').value.trim();

  if (!url) {
    showToast('💡 연동할 Google Apps Script 웹앱 URL을 먼저 입력해 주세요.');
    openSheetModal();
    return;
  }

  showToast('🔄 스프레드시트에서 명단을 가져오는 중...');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const result = await response.json();

    if (result && Array.isArray(result.students) && result.students.length > 0) {
      students = result.students;
      if (Array.isArray(result.roles) && result.roles.length > 0) {
        roles = result.roles;
      }
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles));
      syncInputsToState();
      performShuffle();
      showToast('🎉 시트에서 명단을 성공적으로 불러왔습니다!');
    } else {
      showToast('ℹ️ 시트 데이터를 확인했습니다.');
    }
  } catch (error) {
    console.warn('Apps Script GET error:', error);
    showToast('⚠️ 시트 연결 대기 중: 배포 URL 및 권한을 확인해 주세요.');
  }
}

async function handleSaveToGoogleSheet() {
  const url = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || document.getElementById('appsScriptUrl').value.trim();

  if (!url) {
    showToast('💡 연동할 Google Apps Script 웹앱 URL을 먼저 입력해 주세요.');
    openSheetModal();
    return;
  }

  if (assignments.length === 0) {
    showToast('⚠️ 먼저 [역할 배정하기]를 실행해 주세요.');
    return;
  }

  const payload = {
    classTitle: document.getElementById('classTitleInput').value.trim(),
    date: new Date().toISOString(),
    results: assignments,
  };

  showToast('💾 스프레드시트에 배정 결과를 전송하는 중...');

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    showToast('🎉 스프레드시트에 저장 요청을 완료했습니다!');
  } catch (error) {
    console.warn('Apps Script POST error:', error);
    showToast('⚠️ 시트 저장 요청 실패: 설정을 확인해 주세요.');
  }
}

// ==========================================================================
// Toast Notification
// ==========================================================================
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

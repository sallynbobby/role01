/**
 * 우리학급 1인 1역할 배정 도우미 - script.js
 * 초등학교 교실 맞춤형 무작위 매칭, A4 인쇄, 구글 스프레드시트 연동 준비 로직
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
  { name: '칠판 지우미', icon: '🧹', desc: '수업 후 칠판을 반짝반짝 깨끗하게 닦아요' },
  { name: '우유·급식 도우미', icon: '🥛', desc: '우유 상자를 챙기고 급식 줄을 차례대로 안내해요' },
  { name: '에너지 지킴이', icon: '💡', desc: '쉬는 시간 소등과 교실 환기 창문을 챙겨요' },
  { name: '줄서기 대장', icon: '🚶', desc: '특별실 이동할 때 앞장서서 바른 줄을 만들어요' },
  { name: '식사 정리 도우미', icon: '🍱', desc: '식판을 깨끗이 비우고 주변 자리를 정돈해요' },
  { name: '알림장·학습지 배부', icon: '📑', desc: '선생님 말씀과 유인물을 친구들에게 나눠줘요' },
  { name: '학급 도서관 사서', icon: '📚', desc: '교실 책장의 책들을 번호대로 가지런히 정리해요' },
  { name: '체육기구 관리', icon: '⚽', desc: '체육 시간 공과 줄넘기를 안전하게 챙겨와요' },
  { name: '분리수거 대장', icon: '♻️', desc: '종이와 플라스틱을 바르게 분리배출하도록 도와요' },
  { name: '반려식물 사랑이', icon: '🌱', desc: '교실 화분에 촉촉하게 물을 주고 사랑을 줘요' },
  { name: '컴퓨터·방송 도우미', icon: '💻', desc: '아침 방송 켜기와 컴퓨터 화면 전원을 관리해요' },
  { name: '보건·위생 지킴이', icon: '🧼', desc: '손 씻기 비누와 교실 소독 티슈를 깔끔히 살펴요' },
];

// 로컬 스토리지 키
const STORAGE_KEYS = {
  STUDENTS: 'class_role_students_v1',
  ROLES: 'class_role_roles_v1',
  RESULTS: 'class_role_results_v1',
  CLASS_TITLE: 'class_role_title_v1',
  APPS_SCRIPT_URL: 'class_role_apps_script_url_v1',
  LAST_DATE: 'class_role_last_date_v1',
};

// State
let students = [];
let roles = [];
let assignments = []; // Array of { student, role, icon, desc }
let currentView = 'card'; // 'card' or 'table'

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  bindEvents();
  updatePrintHeaderDate();
  renderAll();
});

/**
 * 로컬스토리지 또는 기본값 로드
 */
function loadData() {
  const savedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  students = savedStudents ? JSON.parse(savedStudents) : [...DEFAULT_STUDENTS];

  const savedRoles = localStorage.getItem(STORAGE_KEYS.ROLES);
  roles = savedRoles ? JSON.parse(savedRoles) : [...DEFAULT_ROLES];

  const savedTitle = localStorage.getItem(STORAGE_KEYS.CLASS_TITLE);
  if (savedTitle) {
    document.getElementById('classTitleInput').value = savedTitle;
    document.getElementById('printClassTitle').textContent = `${savedTitle} 1인 1역할 배정표`;
  }

  const savedUrl = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL);
  if (savedUrl) {
    document.getElementById('appsScriptUrl').value = savedUrl;
  }

  const savedResults = localStorage.getItem(STORAGE_KEYS.RESULTS);
  if (savedResults) {
    assignments = JSON.parse(savedResults);
    const savedDate = localStorage.getItem(STORAGE_KEYS.LAST_DATE);
    if (savedDate) {
      document.getElementById('lastAssignedInfo').innerHTML = `
        <i class="fa-solid fa-circle-check" style="color:#10b981;"></i> 최근 배정: ${savedDate}
      `;
      document.getElementById('printDateText').textContent = savedDate;
    }
  } else {
    // 초기 기본 매칭 세팅
    matchDefaults();
  }

  syncInputsToState();
}

/**
 * 초기 1:1 순차 매칭
 */
function matchDefaults() {
  assignments = [];
  const count = Math.min(students.length, roles.length);
  for (let i = 0; i < count; i++) {
    assignments.push({
      student: students[i],
      role: roles[i].name,
      icon: roles[i].icon || '🌟',
      desc: roles[i].desc || '우리 반을 위해 힘차게 도와요!',
    });
  }
}

/**
 * 화면 입력창 상태 동기화
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
}

// ==========================================================================
// Event Listeners
// ==========================================================================
function bindEvents() {
  // [🎲 역할 배정하기] 버튼
  document.getElementById('btnAssign').addEventListener('click', handleRandomAssignment);

  // [🖨️ 교실 게시판 A4 인쇄] 버튼
  document.getElementById('btnPrint').addEventListener('click', handlePrint);

  // [📝 편집 패널 토글]
  document.getElementById('btnToggleManage').addEventListener('click', toggleManagePanel);

  // 편집창 저장 버튼
  document.getElementById('btnSaveEditedList').addEventListener('click', handleSaveEditedList);

  // 학생 순서 섞기
  document.getElementById('btnShuffleStudents').addEventListener('click', handleShuffleStudentInput);

  // 기본 역할 복원
  document.getElementById('btnRestoreRoles').addEventListener('click', () => {
    roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
    syncInputsToState();
    showToast('기본 추천 12개 역할로 채웠습니다! [편집 내용 적용하기]를 눌러주세요.');
  });

  // 전체 초기화
  document.getElementById('btnResetDefault').addEventListener('click', handleResetDefault);

  // 학급명 수정 실시간 동기화
  const classInput = document.getElementById('classTitleInput');
  classInput.addEventListener('input', (e) => {
    const val = e.target.value.trim() || '우리학급';
    document.getElementById('printClassTitle').textContent = `${val} 1인 1역할 배정표`;
    localStorage.setItem(STORAGE_KEYS.CLASS_TITLE, val);
  });

  // 보기 전환 칩 (카드형 / 표형)
  document.querySelectorAll('.mode-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.mode-chip').forEach((c) => c.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');
      const viewMode = target.dataset.view;
      switchView(viewMode);
    });
  });

  // 구글 스프레드시트 관련 버튼
  document.getElementById('btnLoadSheet').addEventListener('click', handleLoadFromGoogleSheet);
  document.getElementById('btnSaveSheet').addEventListener('click', handleSaveToGoogleSheet);
  document.getElementById('btnOpenSheetSettings').addEventListener('click', openSheetModal);

  // 모달 닫기
  document.getElementById('btnCloseModal').addEventListener('click', closeSheetModal);
  document.getElementById('btnCloseModalBtn').addEventListener('click', closeSheetModal);
  document.getElementById('btnSaveAppsScriptUrl').addEventListener('click', saveAppsScriptUrl);
}

// ==========================================================================
// Core: Random Assignment (무작위 1:1 매칭)
// ==========================================================================
function handleRandomAssignment() {
  if (students.length === 0 || roles.length === 0) {
    showToast('⚠️ 학생과 역할 목록을 먼저 입력해 주세요!');
    return;
  }

  // 1. 흥미진진한 셔플 오버레이 표시 (초등학생용 효과)
  const overlay = document.getElementById('shuffleOverlay');
  const progressFill = document.getElementById('progressBarFill');
  const quoteEl = document.getElementById('shuffleQuote');

  const quotes = [
    '누가 어떤 멋진 일을 맡게 될까요? 🌟',
    '우리 반을 빛낼 12명의 영웅들! 🚀',
    '책임감 뿜뿜! 서로 돕는 행복 교실 🌈',
    '두근두근 주사위를 굴리고 있어요! 🎲',
  ];
  quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];

  overlay.classList.remove('hidden');
  progressFill.style.width = '0%';

  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    progressFill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
      overlay.classList.add('hidden');
      performShuffle();
    }
  }, 70); // 총 약 0.7초의 경쾌한 애니메이션
}

/**
 * 실제 매칭 연산 및 사운드/시각효과
 */
function performShuffle() {
  // Fisher-Yates 셔플 알고리즘
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
      icon: shuffledRoles[i].icon || '🌟',
      desc: shuffledRoles[i].desc || '우리 반을 위해 솔선수범해요!',
    });
  }

  // 배정 시간 갱신
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 ${String(
    now.getMinutes()
  ).padStart(2, '0')}분`;

  document.getElementById('lastAssignedInfo').innerHTML = `
    <i class="fa-solid fa-circle-check" style="color:#10b981;"></i> 배정 완료: ${dateStr}
  `;
  document.getElementById('printDateText').textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  // 저장
  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(assignments));
  localStorage.setItem(STORAGE_KEYS.LAST_DATE, dateStr);

  // 렌더링
  renderAll(true);
  playChimeSound();
  showToast('🎉 짜잔! 새로운 1인 1역할이 골고루 배정되었습니다!');
}

/**
 * 브라우저 Web Audio API 기반 귀여운 팡파레 효과음 (외부 파일 없이 순수 JS)
 */
function playChimeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

      gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.08);
      osc.stop(ctx.currentTime + idx * 0.08 + 0.36);
    });
  } catch {
    // 오디오 미지원 환경 graceful degradation
  }
}

// ==========================================================================
// Rendering
// ==========================================================================
function renderAll(animate = false) {
  renderCardGrid(animate);
  renderTable();
}

/**
 * 12명 카드 그리드 렌더링
 */
function renderCardGrid(animate = false) {
  const container = document.getElementById('cardsGrid');
  container.innerHTML = '';

  if (assignments.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align:center; padding: 40px; color:#94a3b8;">
        <p style="font-size:1.5rem; margin-bottom:10px;">🎒</p>
        <p>[🎲 역할 배정하기] 버튼을 눌러 역할을 배정해 보세요!</p>
      </div>
    `;
    return;
  }

  assignments.forEach((item, index) => {
    const themeIdx = index % 6; // 6가지 산뜻한 파스텔 테마 순환
    const card = document.createElement('div');
    card.className = `role-card theme-${themeIdx} ${animate ? 'card-enter' : ''}`;
    if (animate) {
      card.style.animationDelay = `${index * 0.04}s`;
    }

    card.innerHTML = `
      <div>
        <div class="card-top-bar">
          <span class="card-num-badge">번호 ${index + 1}</span>
          <span class="card-icon" role="img" aria-label="${item.role}">${item.icon}</span>
        </div>
        <div class="student-section">
          <div class="student-label">담당 학생</div>
          <div class="student-name">${item.student}</div>
        </div>
        <div class="role-section">
          <div class="role-title">
            <span>${item.role}</span>
          </div>
          <div class="role-desc">${item.desc}</div>
        </div>
      </div>
      <div class="card-quick-actions no-print">
        <button class="btn-card-action" onclick="swapWithNext(${index})" title="다음 학생과 역할 바꾸기">
          <i class="fa-solid fa-arrow-right-arrow-left"></i>
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

/**
 * 교실 알림장/게시판용 표 뷰 렌더링
 */
function renderTable() {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';

  assignments.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${index + 1}</strong></td>
      <td class="tbl-student">${item.student}</td>
      <td class="tbl-role">${item.icon} ${item.role}</td>
      <td class="tbl-pledge">${item.desc}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * 인접 학생과 빠른 역할 교환
 */
window.swapWithNext = function (index) {
  if (assignments.length < 2) return;
  const nextIdx = (index + 1) % assignments.length;
  const tempRole = assignments[index].role;
  const tempIcon = assignments[index].icon;
  const tempDesc = assignments[index].desc;

  assignments[index].role = assignments[nextIdx].role;
  assignments[index].icon = assignments[nextIdx].icon;
  assignments[index].desc = assignments[nextIdx].desc;

  assignments[nextIdx].role = tempRole;
  assignments[nextIdx].icon = tempIcon;
  assignments[nextIdx].desc = tempDesc;

  localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(assignments));
  renderAll(false);
  showToast(`🔁 [${assignments[index].student}]님과 [${assignments[nextIdx].student}]님의 역할을 교환했습니다.`);
};

/**
 * 카드형 <-> 표형 뷰 스위치
 */
function switchView(viewMode) {
  currentView = viewMode;
  const cardSection = document.getElementById('cardGridView');
  const tableSection = document.getElementById('tableView');

  if (viewMode === 'card') {
    cardSection.classList.remove('hidden');
    tableSection.classList.add('hidden');
  } else {
    cardSection.classList.add('hidden');
    tableSection.classList.remove('hidden');
  }
}

// ==========================================================================
// Print Feature (교실 게시판 부착용 A4 인쇄)
// ==========================================================================
function handlePrint() {
  updatePrintHeaderDate();
  const classVal = document.getElementById('classTitleInput').value.trim() || '우리학급';
  document.getElementById('printClassTitle').textContent = `${classVal} 1인 1역할 배정표`;

  // 브라우저 기본 인쇄 다이얼로그 호출 (@media print가 A4 세로에 맞게 자동 정렬)
  window.print();
}

function updatePrintHeaderDate() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
  const el = document.getElementById('printDateText');
  if (el) el.textContent = dateStr;
}

// ==========================================================================
// Management Panel
// ==========================================================================
function toggleManagePanel() {
  const panel = document.getElementById('managePanel');
  const btnText = document.getElementById('manageToggleText');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    btnText.textContent = '❌ 편집 닫기';
  } else {
    panel.classList.add('hidden');
    btnText.textContent = '📝 학생/역할 편집';
  }
}

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
      // 이모지 및 설명 분리 파싱
      const parts = line.split('-');
      const mainPart = parts[0].trim();
      const descPart = parts.length > 1 ? parts.slice(1).join('-').trim() : '';

      // 첫 글자 이모지 확인
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
        icon: icon,
        desc: descPart || '우리 반을 위해 힘차게 도와요!',
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
  toggleManagePanel();
  showToast(`✅ 학생 ${students.length}명, 역할 ${roles.length}개가 적용되었습니다!`);
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
  if (!confirm('초기 기본값(학생 12명, 역할 12개)으로 되돌리시겠습니까?')) return;
  students = [...DEFAULT_STUDENTS];
  roles = JSON.parse(JSON.stringify(DEFAULT_ROLES));
  document.getElementById('classTitleInput').value = '3학년 2반';
  document.getElementById('printClassTitle').textContent = '3학년 2반 1인 1역할 배정표';

  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.ROLES);
  localStorage.removeItem(STORAGE_KEYS.RESULTS);
  localStorage.removeItem(STORAGE_KEYS.CLASS_TITLE);
  localStorage.removeItem(STORAGE_KEYS.LAST_DATE);

  syncInputsToState();
  matchDefaults();
  renderAll(true);
  showToast('기본 예시 데이터로 깨끗하게 초기화되었습니다.');
}

// ==========================================================================
// Google Spreadsheet Apps Script Integration Hooks
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
  showToast('💾 스프레드시트 연동 URL이 저장되었습니다!');
}

/**
 * [🔄 시트 불러오기]
 */
async function handleLoadFromGoogleSheet() {
  const url = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || document.getElementById('appsScriptUrl').value.trim();

  if (!url) {
    showToast('💡 연동할 Google Apps Script 웹앱 URL을 먼저 입력해 주세요.');
    openSheetModal();
    return;
  }

  showToast('🔄 스프레드시트에서 학생 및 역할 명단을 불러오는 중...');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
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
      showToast('ℹ️ 시트 데이터를 확인했습니다. 올바른 형식인지 점검해 주세요.');
    }
  } catch (error) {
    console.warn('Apps Script GET fallback / notice:', error);
    showToast('⚠️ 시트 연결 대기 중: Apps Script 배포 URL 및 CORS 권한을 확인해 주세요.');
  }
}

/**
 * [💾 시트에 결과 저장]
 */
async function handleSaveToGoogleSheet() {
  const url = localStorage.getItem(STORAGE_KEYS.APPS_SCRIPT_URL) || document.getElementById('appsScriptUrl').value.trim();

  if (!url) {
    showToast('💡 연동할 Google Apps Script 웹앱 URL을 먼저 입력해 주세요.');
    openSheetModal();
    return;
  }

  if (assignments.length === 0) {
    showToast('⚠️ 먼저 [역할 배정하기]를 눌러 배정을 완료해 주세요.');
    return;
  }

  const payload = {
    classTitle: document.getElementById('classTitleInput').value.trim(),
    date: new Date().toISOString(),
    results: assignments,
  };

  showToast('💾 스프레드시트에 배정 결과를 전송하는 중...');

  try {
    // Google Apps Script는 보통 redirect를 거치므로 mode: no-cors 또는 redirect follow 지원
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      mode: 'no-cors',
    });

    showToast('🎉 구글 스프레드시트에 배정 결과 전송 요청을 완료했습니다!');
  } catch (error) {
    console.warn('Apps Script POST error:', error);
    showToast('⚠️ 시트 저장 요청 실패: 네트워크 및 배포 설정을 확인해 주세요.');
  }
}

// ==========================================================================
// Toast Helper
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

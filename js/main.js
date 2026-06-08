// ==================== НАСТРОЙКИ ====================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxm_j_1Pcjdn0-Cx_LCWUX03-QOzIcEt5lUyf5555IjQuex2R04ftFNzGhGbtHRpNbN/exec';
const SHEET_ID = '1CeJjGHytehxVIxSxY_j_mx84EvGzKJNA5x9y9n-MSBs';
const API_KEY = 'AIzaSyCB_5jPpU-GtKmmzx8FTTu33WtbNntxGvg';

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let tournamentData = {
    groups: { A: { teams: [], matches: [] }, B: { teams: [], matches: [] } },
    playoffs: {
        upperFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
        lowerSemi: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
        lowerFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
        grandFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' }
    }
};

let scheduleData = {
    periodStart: null, periodEnd: null,
    qfStart: null, qfEnd: null,
    sfStart: null, sfEnd: null,
    final: null,
    prizePool: ''
};

let prizeData = {
    1: '',
    2: '',
    3: '',
    4: '',
    5: '',
    6: '',
    7: '',
    8: ''
};

let isAdmin = false;
let remainingTeamsAll = [];
let currentDrawStep = 0;
let groupATeamsList = [];
let groupBTeamsList = [];
let timerInterval = null;

let tempPlayoffDates = {
    upperFinal: '',
    lowerSemi: '',
    lowerFinal: '',
    grandFinal: ''
};

let tempPlayoffStreamUrls = {
    upperFinal: '',
    lowerSemi: '',
    lowerFinal: '',
    grandFinal: ''
};

// ==================== ОТСЛЕЖИВАНИЕ ИЗМЕНЕНИЙ В МАТЧАХ ====================

// Функция для отслеживания изменений в полях матча группы
function trackMatchChanges(group, matchId) {
    const score1Input = document.getElementById(`${group}_score1_${matchId}`);
    const score2Input = document.getElementById(`${group}_score2_${matchId}`);
    const points1Input = document.getElementById(`${group}_points1_${matchId}`);
    const points2Input = document.getElementById(`${group}_points2_${matchId}`);
    const dateInput = document.getElementById(`${group}_date_${matchId}`);
    const streamUrlInput = document.getElementById(`${group}_streamUrl_${matchId}`);
    // Ищем кнопку по группе И ID
    const updateBtn = document.querySelector(`.match-update-btn[data-group="${group}"][data-match-id="${matchId}"]`);
    
    if (!updateBtn) {
        console.warn(`Кнопка не найдена для группы ${group}, матч ${matchId}`);
        return;
    }
    
    function checkChanges() {
        const matches = tournamentData.groups[group].matches;
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        
        const hasChanges = 
            (parseInt(score1Input?.value) || 0) !== match.score1 ||
            (parseInt(score2Input?.value) || 0) !== match.score2 ||
            (parseInt(points1Input?.value) || 0) !== match.points1 ||
            (parseInt(points2Input?.value) || 0) !== match.points2 ||
            (dateInput?.value || '') !== (match.date ? formatDateForInput(match.date) : '') ||
            (streamUrlInput?.value || '') !== (match.streamUrl || '');
        
        if (hasChanges) {
            updateBtn.classList.add('has-changes');
        } else {
            updateBtn.classList.remove('has-changes');
        }
    }
    
    if (score1Input) score1Input.addEventListener('input', checkChanges);
    if (score2Input) score2Input.addEventListener('input', checkChanges);
    if (points1Input) points1Input.addEventListener('input', checkChanges);
    if (points2Input) points2Input.addEventListener('input', checkChanges);
    if (dateInput) dateInput.addEventListener('change', checkChanges);
    if (streamUrlInput) streamUrlInput.addEventListener('input', checkChanges);
    
    checkChanges();
}

// Функция для отслеживания изменений в полях плей-офф
function trackPlayoffChanges(matchId) {
    const score1Input = document.getElementById(`${matchId}_score1`);
    const score2Input = document.getElementById(`${matchId}_score2`);
    const points1Input = document.getElementById(`${matchId}_points1`);
    const points2Input = document.getElementById(`${matchId}_points2`);
    const dateInput = document.getElementById(`${matchId}_date`);
    const streamUrlInput = document.getElementById(`${matchId}_streamUrl`);
    const updateBtn = document.getElementById(`update-${matchId}`);
    
    if (!updateBtn) return;
    
    function checkChanges() {
        const match = tournamentData.playoffs[matchId];
        if (!match) return;
        
        const hasChanges = 
            (parseInt(score1Input?.value) || 0) !== (match.team1Score || 0) ||
            (parseInt(score2Input?.value) || 0) !== (match.team2Score || 0) ||
            (parseInt(points1Input?.value) || 0) !== (match.team1Points || 0) ||
            (parseInt(points2Input?.value) || 0) !== (match.team2Points || 0) ||
            (dateInput?.value || '') !== (match.date ? formatDateForInput(match.date) : '') ||
            (streamUrlInput?.value || '') !== (match.streamUrl || '');
        
        if (hasChanges) {
            updateBtn.classList.add('has-changes');
        } else {
            updateBtn.classList.remove('has-changes');
        }
    }
    
    if (score1Input) score1Input.addEventListener('input', checkChanges);
    if (score2Input) score2Input.addEventListener('input', checkChanges);
    if (points1Input) points1Input.addEventListener('input', checkChanges);
    if (points2Input) points2Input.addEventListener('input', checkChanges);
    if (dateInput) dateInput.addEventListener('change', checkChanges);
    if (streamUrlInput) streamUrlInput.addEventListener('input', checkChanges);
    
    checkChanges();
}

// ==================== ЗВУКИ ====================
let soundEnabled = true;
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume();
    }
}

function playSound(type) {
    if (!soundEnabled) return;
    try {
        initAudio();
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        if (type === 'click') { osc.frequency.value = 180; gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
        else if (type === 'success') { osc.frequency.value = 120; gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
        else if (type === 'error') { osc.frequency.value = 100; osc.type = 'sawtooth'; gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
        else if (type === 'draw') { osc.frequency.value = 140; gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.2, now + 0.1); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5); osc.start(now); osc.stop(now + 0.5); }
    } catch(e) { console.log('Sound error:', e); }
}

function addSoundToggle() {
    const header = document.querySelector('header');
    if (header && !document.getElementById('sound-toggle')) {
        const btn = document.createElement('button');
        btn.id = 'sound-toggle';
        btn.textContent = '🔊';
        btn.style.position = 'absolute';
        btn.style.right = '1rem';
        btn.style.top = '1rem';
        btn.style.background = 'transparent';
        btn.style.border = '1px solid #2a2a2a';
        btn.style.color = '#aaaaaa';
        btn.style.padding = '0.375rem 0.75rem';
        btn.style.borderRadius = '4px';
        btn.style.fontSize = '1rem';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            btn.textContent = soundEnabled ? '🔊' : '🔇';
            if (soundEnabled) playSound('click');
        });
        header.style.position = 'relative';
        header.appendChild(btn);
    }
}

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    str = String(str);
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function getAvatarHtml(teamName) {
    if (!teamName || teamName === 'TBD' || teamName === '') return '';
    const avatarUrl = window.teamAvatars ? window.teamAvatars[teamName] : '';
    // Всегда создаём img, даже без ссылки (чтобы место было зарезервировано)
    if (!avatarUrl) {
        return `<img src="" class="team-avatar" alt="${escapeHtml(teamName)}" style="visibility: hidden;">`;
    }
    return `<img src="${avatarUrl}" class="team-avatar" alt="${escapeHtml(teamName)}" onerror="this.style.display='none'">`;
}

async function saveAvatarsToSheet() {
    if (!isAdmin) {
        showStatus('Требуется авторизация администратора', 'error');
        playSound('error');
        return;
    }
    
    const avatarsData = {};
    for (let i = 1; i <= 8; i++) {
        const nameInput = document.getElementById(`team${i}`);
        const avatarInput = document.getElementById(`team${i}_avatar`);
        if (nameInput) {
            avatarsData[i] = {
                name: nameInput.value.trim(),
                avatar: avatarInput ? avatarInput.value.trim() : ''
            };
        }
    }
    
    showStatus('Сохранение аватаров...', 'success');
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'saveAvatars',
                data: JSON.stringify(avatarsData)
            }).toString()
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.teamAvatars = {};
            for (let i = 1; i <= 8; i++) {
                const name = avatarsData[i]?.name;
                const avatar = avatarsData[i]?.avatar;
                if (name && avatar) {
                    window.teamAvatars[name] = avatar;
                }
            }
            playSound('success');
            showStatus('Аватары сохранены!', 'success');
        } else {
            showStatus('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            playSound('error');
        }
    } catch(e) {
        console.error('Save avatars error:', e);
        playSound('error');
        showStatus('Ошибка сохранения: ' + e.message, 'error');
    }
}

function showStatus(msg, type) {
    const d = document.getElementById('sync-status');
    if (!d) return;
    d.innerHTML = `<div class="status-${type}">${msg}</div>`;
    setTimeout(() => { if (d.innerHTML.includes(msg)) d.innerHTML = ''; }, 3000);
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function addDrawAnimation(element) {
    if (!element) return;
    element.classList.add('draw-animation');
    setTimeout(() => element.classList.remove('draw-animation'), 400);
}

// ==================== ФОРМАТИРОВАНИЕ ДАТ ДЛЯ UTC ====================
// Для отображения ТОЛЬКО даты (без времени) - для периода, группового этапа, плей-офф
function formatDateOnly(dateTimeStr) {
    if (!dateTimeStr) return '—';
    const match = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
        const [_, year, month, day] = match;
        return `${day}.${month}.${year}`;
    }
    return dateTimeStr;
}

// Для отображения даты С временем - только для Гранд-финала
function formatDateTimeFull(dateTimeStr) {
    if (!dateTimeStr) return '—';
    const match = dateTimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
        const [_, year, month, day, hours, minutes] = match;
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    }
    return dateTimeStr;
}

// Для отображения в карточках матчей
function formatDateDisplay(dateStr) {
    if (!dateStr) return 'Дата не назначена';
    const [datePart, timePart] = dateStr.split('T');
    if (!datePart || !timePart) return dateStr;
    const [year, month, day] = datePart.split('-');
    const [hours, minutes] = timePart.split(':');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
}

// Для редактора (input datetime-local)
function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
    if (match) {
        return `${match[1]}T${match[2]}`;
    }
    return '';
}

// Универсальное отображение (для обратной совместимости)
function formatUTCDisplay(dateTimeStr) {
    if (!dateTimeStr) return '—';
    return formatDateTimeFull(dateTimeStr);
}

// ==================== ПРОВЕРКА ЗАВЕРШЕНИЯ ГРУППОВОГО ЭТАПА ====================
function isGroupStageCompleted(group) {
    const matches = tournamentData.groups[group].matches || [];
    if (matches.length === 0) return false;
    const allMatchesCompleted = matches.every(match => match.winner && match.winner !== '');
    return allMatchesCompleted;
}

function areBothGroupsCompleted() {
    return isGroupStageCompleted('A') && isGroupStageCompleted('B');
}

// ==================== ПРИЗОВОЙ ФОНД ====================
async function loadPrizes() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getPrizes`);
        const data = await response.json();
        if (data && data.prizes) {
            prizeData = data.prizes;
            for (let i = 1; i <= 8; i++) {
                const input = document.getElementById(`prize-${i}`);
                if (input && prizeData[i]) {
                    input.value = prizeData[i];
                }
            }
        }
    } catch (error) {
        console.log('loadPrizes error:', error);
    }
}

async function savePrizes() {
    if (!isAdmin) {
        showStatus('Требуется авторизация администратора', 'error');
        playSound('error');
        return;
    }
    
    const newPrizeData = {};
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`prize-${i}`);
        if (input) {
            newPrizeData[i] = input.value.trim();
        }
    }
    
    showStatus('Сохранение призов...', 'success');
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'prizes',
                data: JSON.stringify(newPrizeData)
            }).toString()
        });
        
        const result = await response.json();
        console.log('Prizes save result:', result);
        
        if (result.success) {
            prizeData = newPrizeData;
            playSound('success');
            showStatus('Призы сохранены!', 'success');
            renderResults();
            
            // ✅ СБРАСЫВАЕМ ПОДСВЕТКУ КНОПКИ ПРИЗОВ
            saveOriginalPrizes();
            updatePrizesButtonColor();
        } else {
            showStatus('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
            playSound('error');
        }
    } catch(e) {
        console.error('Save prizes error:', e);
        playSound('error');
        showStatus('Ошибка сохранения: ' + e.message, 'error');
    }
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================
async function loadSchedule() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Schedule!A2:C20?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values && data.values.length > 0) {
            for (let row of data.values) {
                const eventName = row[0];
                let startValue = row[1] || '—';
                let endValue = row[2] || '—';
                startValue = startValue.toString().trim();
                endValue = endValue.toString().trim();
                
                // Функция для парсинга даты из таблицы
                function parseDateFromSheet(value) {
                    if (!value || value === '—') return '';
                    
                    // Убираем апостроф если есть
                    let cleanValue = String(value);
                    if (cleanValue.startsWith("'")) {
                        cleanValue = cleanValue.substring(1);
                    }
                    
                    // Если уже в ISO формате с T
                    const isoMatch = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
                    if (isoMatch) {
                        return cleanValue;
                    }
                    
                    // Если только дата в ISO формате
                    const dateOnlyMatch = cleanValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    if (dateOnlyMatch) {
                        return cleanValue + 'T00:00';
                    }
                    
                    // Старый формат "01.06.2026" или "10.06.2026 20:00"
                    const match = cleanValue.match(/(\d{2})\.(\d{2})\.(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
                    if (match) {
                        const [_, day, month, year, hours = '00', minutes = '00'] = match;
                        return `${year}-${month}-${day}T${hours}:${minutes}`;
                    }
                    
                    return '';
                }
                
                // Функция для отображения даты
                function formatDisplay(value) {
                    if (!value || value === '—') return '—';
                    const converted = parseDateFromSheet(value);
                    if (converted && converted.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)) {
                        const [datePart, timePart] = converted.split('T');
                        const [year, month, day] = datePart.split('-');
                        const [hours, minutes] = timePart.split(':');
                        // Для дат без времени (00:00) показываем только дату
                        if (hours === '00' && minutes === '00') {
                            return `${day}.${month}.${year}`;
                        }
                        return `${day}.${month}.${year} ${hours}:${minutes}`;
                    }
                    return value;
                }
                
                if (eventName === 'Период турнира') {
                    const parsedStart = parseDateFromSheet(startValue);
                    const parsedEnd = parseDateFromSheet(endValue);
                    document.getElementById('tournament-period-start').textContent = formatDisplay(startValue);
                    document.getElementById('tournament-period-end').textContent = formatDisplay(endValue);
                    scheduleData.periodStart = parsedStart;
                    scheduleData.periodEnd = parsedEnd;
                } else if (eventName === 'Групповой этап') {
                    const parsedStart = parseDateFromSheet(startValue);
                    const parsedEnd = parseDateFromSheet(endValue);
                    document.getElementById('qf-period-start').textContent = formatDisplay(startValue);
                    document.getElementById('qf-period-end').textContent = formatDisplay(endValue);
                    scheduleData.qfStart = parsedStart;
                    scheduleData.qfEnd = parsedEnd;
                } else if (eventName === 'Плей-офф') {
                    const parsedStart = parseDateFromSheet(startValue);
                    const parsedEnd = parseDateFromSheet(endValue);
                    document.getElementById('sf-period-start').textContent = formatDisplay(startValue);
                    document.getElementById('sf-period-end').textContent = formatDisplay(endValue);
                    scheduleData.sfStart = parsedStart;
                    scheduleData.sfEnd = parsedEnd;
                } else if (eventName === 'Гранд-финал') {
                    const parsedStart = parseDateFromSheet(startValue);
                    document.getElementById('final-datetime').textContent = formatDisplay(startValue);
                    scheduleData.final = parsedStart;
                } else if (eventName === 'Призовой фонд') {
                    document.getElementById('prize-pool').textContent = startValue;
                    scheduleData.prizePool = startValue;
                }
            }
        }
        
        console.log('Schedule data after conversion:', {
            periodStart: scheduleData.periodStart,
            periodEnd: scheduleData.periodEnd,
            qfStart: scheduleData.qfStart,
            qfEnd: scheduleData.qfEnd,
            sfStart: scheduleData.sfStart,
            sfEnd: scheduleData.sfEnd,
            final: scheduleData.final
        });
        
        checkPastDates();
        startCountdownTimer();
        updateGroupStageAnimation();
    } catch (e) { console.log('Schedule load error:', e); }
}

function checkPastDates() {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    function parseDateToUTC(dateStr) {
        if (!dateStr || dateStr === '—') return null;
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (match) {
            const [_, year, month, day, hours, minutes] = match;
            const d = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes)));
            return isNaN(d.getTime()) ? null : d;
        }
        return null;
    }

    function checkElement(elementId, dateValue, isEndDate = false, startDateValue = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.classList.remove('past', 'past-start');
        if (!dateValue || dateValue === '—') return;
        
        const dateToCheck = parseDateToUTC(dateValue);
        if (!dateToCheck) return;
        
        const checkDateOnly = new Date(Date.UTC(
            dateToCheck.getUTCFullYear(),
            dateToCheck.getUTCMonth(),
            dateToCheck.getUTCDate()
        ));
        
        if (isEndDate) {
            if (checkDateOnly < todayUTC) {
                element.classList.add('past');
            }
        } else {
            let isStageCompleted = false;
            if (startDateValue && startDateValue !== '—') {
                const endDate = parseDateToUTC(startDateValue);
                if (endDate) {
                    const endDateOnly = new Date(Date.UTC(
                        endDate.getUTCFullYear(),
                        endDate.getUTCMonth(),
                        endDate.getUTCDate()
                    ));
                    isStageCompleted = endDateOnly < todayUTC;
                }
            }
            if (isStageCompleted) {
                element.classList.add('past');
            } else if (checkDateOnly < todayUTC) {
                element.classList.add('past-start');
            }
        }
    }

    checkElement('tournament-period-start', scheduleData.periodStart, false, scheduleData.periodEnd);
    checkElement('tournament-period-end', scheduleData.periodEnd, true);
    checkElement('qf-period-start', scheduleData.qfStart, false, scheduleData.qfEnd);
    checkElement('qf-period-end', scheduleData.qfEnd, true);
    checkElement('sf-period-start', scheduleData.sfStart, false, scheduleData.sfEnd);
    checkElement('sf-period-end', scheduleData.sfEnd, true);
    checkElement('final-datetime', scheduleData.final, true);
}

function fillScheduleEditor() {
    document.getElementById('edit-period-start').value = scheduleData.periodStart || '';
    document.getElementById('edit-period-end').value = scheduleData.periodEnd || '';
    document.getElementById('edit-qf-start').value = scheduleData.qfStart || '';
    document.getElementById('edit-qf-end').value = scheduleData.qfEnd || '';
    document.getElementById('edit-sf-start').value = scheduleData.sfStart || '';
    document.getElementById('edit-sf-end').value = scheduleData.sfEnd || '';
    document.getElementById('edit-final').value = scheduleData.final || '';
    document.getElementById('edit-prize-pool').value = scheduleData.prizePool || '';
    
    // Сохраняем исходные значения после заполнения редактора
    saveOriginalSchedule();
    updateScheduleButtonColor();
}

function updateGroupStageAnimation() {
    // Безопасно проверяем, загружены ли данные расписания
    if (!scheduleData || !scheduleData.qfStart || !scheduleData.qfEnd) {
        console.log('updateGroupStageAnimation: данные расписания еще не загружены');
        return;
    }
    
    const now = new Date();
    const nowUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    ));
    
    function parseDateToUTC(dateStr) {
        if (!dateStr) return null;
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (match) {
            const [_, year, month, day, hours, minutes] = match;
            return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes)));
        }
        return null;
    }
    
    const qfStartDate = parseDateToUTC(scheduleData.qfStart);
    const qfEndDate = parseDateToUTC(scheduleData.qfEnd);
    
    // Безопасно проверяем, существуют ли DOM-элементы
    const groupAHeader = document.getElementById('group-A-matches-header');
    const groupBHeader = document.getElementById('group-B-matches-header');
    
    // Если заголовки еще не отрендерены, выходим
    if (!groupAHeader || !groupBHeader) {
        console.log('updateGroupStageAnimation: заголовки групп еще не найдены в DOM');
        return;
    }
    
    // Общий период группового этапа активен
    const isGroupStageActive = qfStartDate && qfEndDate && nowUTC >= qfStartDate && nowUTC <= qfEndDate;
    
    // Проверяем, завершены ли матчи в каждой группе
    const isGroupACompleted = isGroupStageCompleted('A');
    const isGroupBCompleted = isGroupStageCompleted('B');
    
    // ГРУППА A: анимация активна только если:
    // 1. Общий период группового этапа активен И
    // 2. Матчи группы A НЕ завершены
    if (isGroupStageActive && !isGroupACompleted) {
        groupAHeader.classList.add('active');
        console.log('🎬 Группа A: анимация ВКЛЮЧЕНА (этап активен, матчи не завершены)');
    } else {
        groupAHeader.classList.remove('active');
        if (isGroupACompleted) {
            console.log('⏸ Группа A: анимация ВЫКЛЮЧЕНА (матчи завершены)');
        } else {
            console.log('⏸ Группа A: анимация ВЫКЛЮЧЕНА (этап не активен)');
        }
    }
    
    // ГРУППА B: анимация активна только если:
    // 1. Общий период группового этапа активен И
    // 2. Матчи группы B НЕ завершены
    if (isGroupStageActive && !isGroupBCompleted) {
        groupBHeader.classList.add('active');
        console.log('🎬 Группа B: анимация ВКЛЮЧЕНА (этап активен, матчи не завершены)');
    } else {
        groupBHeader.classList.remove('active');
        if (isGroupBCompleted) {
            console.log('⏸ Группа B: анимация ВЫКЛЮЧЕНА (матчи завершены)');
        } else {
            console.log('⏸ Группа B: анимация ВЫКЛЮЧЕНА (этап не активен)');
        }
    }
}

// ==================== АНИМАЦИЯ ДЛЯ ПЛЕЙ-ОФФ ====================

function updatePlayoffAnimation() {
    // Получаем все матчи плей-офф
    const upperFinal = tournamentData.playoffs.upperFinal;
    const lowerSemi = tournamentData.playoffs.lowerSemi;
    const lowerFinal = tournamentData.playoffs.lowerFinal;
    const grandFinal = tournamentData.playoffs.grandFinal;
    
    // Функция проверки: есть ли 2 команды и нет победителя
    function shouldBeActive(match) {
        if (!match) return false;
        const hasTwoTeams = match.team1 && match.team1 !== '' && match.team1 !== 'TBD' &&
                           match.team2 && match.team2 !== '' && match.team2 !== 'TBD';
        const noWinner = !match.winner || match.winner === '';
        return hasTwoTeams && noWinner;
    }
    
    // Получаем заголовки блоков
    const upperBracketHeader = document.querySelector('.upper-bracket h3');
    const lowerBracketHeader = document.querySelector('.lower-bracket h3');
    const finalBracketHeader = document.querySelector('.final-bracket h3');
    
    // Обёртки для заголовков (добавляем div с классом playoff-bracket-header)
    function ensureWrapper(header, bracketClass) {
        if (!header) return null;
        
        let wrapper = header.parentElement;
        if (!wrapper.classList.contains('playoff-bracket-header')) {
            wrapper = document.createElement('div');
            wrapper.className = 'playoff-bracket-header';
            header.parentNode.insertBefore(wrapper, header);
            wrapper.appendChild(header);
        }
        return wrapper;
    }
    
    // Верхняя сетка
    if (upperBracketHeader) {
        const wrapper = ensureWrapper(upperBracketHeader, 'upper');
        if (shouldBeActive(upperFinal)) {
            wrapper.classList.add('active');
        } else {
            wrapper.classList.remove('active');
        }
    }
    
    // Нижняя сетка (проверяем semi ИЛИ final)
    if (lowerBracketHeader) {
        const wrapper = ensureWrapper(lowerBracketHeader, 'lower');
        const isActive = shouldBeActive(lowerSemi) || shouldBeActive(lowerFinal);
        if (isActive) {
            wrapper.classList.add('active');
        } else {
            wrapper.classList.remove('active');
        }
    }
    
    // Гранд-финал
    if (finalBracketHeader) {
        const wrapper = ensureWrapper(finalBracketHeader, 'final');
        if (shouldBeActive(grandFinal)) {
            wrapper.classList.add('active');
        } else {
            wrapper.classList.remove('active');
        }
    }
}

// ==================== ОТСЛЕЖИВАНИЕ ИЗМЕНЕНИЙ РАСПИСАНИЯ И ПРИЗОВ ====================

// Сохраняем исходные значения расписания
let originalScheduleData = {
    periodStart: '', periodEnd: '',
    qfStart: '', qfEnd: '',
    sfStart: '', sfEnd: '',
    final: '', prizePool: ''
};

// Сохраняем исходные значения призов
let originalPrizeData = {1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: ''};

// Функция сохранения текущих значений расписания как "исходные"
function saveOriginalSchedule() {
    originalScheduleData = {
        periodStart: scheduleData.periodStart || '',
        periodEnd: scheduleData.periodEnd || '',
        qfStart: scheduleData.qfStart || '',
        qfEnd: scheduleData.qfEnd || '',
        sfStart: scheduleData.sfStart || '',
        sfEnd: scheduleData.sfEnd || '',
        final: scheduleData.final || '',
        prizePool: scheduleData.prizePool || ''
    };
}

// Функция сохранения текущих значений призов как "исходные"
function saveOriginalPrizes() {
    for (let i = 1; i <= 8; i++) {
        originalPrizeData[i] = prizeData[i] || '';
    }
}

// Проверка изменений в расписании (из полей ввода)
function checkScheduleChanges() {
    const periodStart = document.getElementById('edit-period-start')?.value || '';
    const periodEnd = document.getElementById('edit-period-end')?.value || '';
    const qfStart = document.getElementById('edit-qf-start')?.value || '';
    const qfEnd = document.getElementById('edit-qf-end')?.value || '';
    const sfStart = document.getElementById('edit-sf-start')?.value || '';
    const sfEnd = document.getElementById('edit-sf-end')?.value || '';
    const final = document.getElementById('edit-final')?.value || '';
    const prizePool = document.getElementById('edit-prize-pool')?.value || '';
    
    return periodStart !== originalScheduleData.periodStart ||
           periodEnd !== originalScheduleData.periodEnd ||
           qfStart !== originalScheduleData.qfStart ||
           qfEnd !== originalScheduleData.qfEnd ||
           sfStart !== originalScheduleData.sfStart ||
           sfEnd !== originalScheduleData.sfEnd ||
           final !== originalScheduleData.final ||
           prizePool !== originalScheduleData.prizePool;
}

// Проверка изменений в призах
function checkPrizesChanges() {
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`prize-${i}`);
        if (input) {
            const currentValue = input.value.trim();
            if (currentValue !== (originalPrizeData[i] || '')) {
                return true;
            }
        }
    }
    return false;
}

// Обновление цвета кнопки расписания
function updateScheduleButtonColor() {
    const btn = document.getElementById('save-schedule');
    if (btn) {
        if (checkScheduleChanges()) {
            btn.classList.add('has-changes');
        } else {
            btn.classList.remove('has-changes');
        }
    }
}

// Обновление цвета кнопки призов
function updatePrizesButtonColor() {
    const btn = document.getElementById('save-prizes');
    if (btn) {
        if (checkPrizesChanges()) {
            btn.classList.add('has-changes');
        } else {
            btn.classList.remove('has-changes');
        }
    }
}

// Инициализация отслеживания для полей расписания
function initScheduleTracking() {
    saveOriginalSchedule();
    
    const fields = ['edit-period-start', 'edit-period-end', 'edit-qf-start', 'edit-qf-end', 
                    'edit-sf-start', 'edit-sf-end', 'edit-final', 'edit-prize-pool'];
    
    const onInputChange = () => {
        // Обновляем scheduleData из полей ввода
        scheduleData.periodStart = document.getElementById('edit-period-start')?.value || '';
        scheduleData.periodEnd = document.getElementById('edit-period-end')?.value || '';
        scheduleData.qfStart = document.getElementById('edit-qf-start')?.value || '';
        scheduleData.qfEnd = document.getElementById('edit-qf-end')?.value || '';
        scheduleData.sfStart = document.getElementById('edit-sf-start')?.value || '';
        scheduleData.sfEnd = document.getElementById('edit-sf-end')?.value || '';
        scheduleData.final = document.getElementById('edit-final')?.value || '';
        scheduleData.prizePool = document.getElementById('edit-prize-pool')?.value || '';
        
        updateScheduleButtonColor();
    };
    
    fields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.addEventListener('input', onInputChange);
            element.addEventListener('change', onInputChange);
        }
    });
    
    updateScheduleButtonColor();
}

// Инициализация отслеживания для полей призов
function initPrizesTracking() {
    saveOriginalPrizes();
    
    const onInputChange = () => {
        updatePrizesButtonColor();
    };
    
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`prize-${i}`);
        if (input) {
            input.addEventListener('input', onInputChange);
            input.addEventListener('change', onInputChange);
        }
    }
    
    updatePrizesButtonColor();
}

// ==================== ТАЙМЕР ====================
function startCountdownTimer() {
    // Очищаем старый интервал, если есть
    if (timerInterval) clearInterval(timerInterval);
    
    const timerDiv = document.getElementById('countdown-timer');
    const timerSpan = document.getElementById('next-match-timer');
    if (!timerDiv || !timerSpan) return;

    function parseDate(dateStr) {
        if (!dateStr || dateStr === '—') return null;
        let dateTimeStr = dateStr;
        if (dateTimeStr.length === 16) {
            dateTimeStr = dateTimeStr + ':00';
        }
        const d = new Date(dateTimeStr + 'Z');
        return isNaN(d.getTime()) ? null : d;
    }

    function getNextMatchInfo() {
        const nowUTC = new Date();
        let nextMatch = null, nextDate = null;
        
        const qfDate = parseDate(scheduleData.qfStart);
        if (qfDate && qfDate > nowUTC && (!nextDate || qfDate < nextDate)) {
            nextDate = qfDate;
            nextMatch = { name: 'Групповой этап', date: qfDate };
        }
        
        const sfDate = parseDate(scheduleData.sfStart);
        if (sfDate && sfDate > nowUTC && (!nextDate || sfDate < nextDate)) {
            nextDate = sfDate;
            nextMatch = { name: 'Плей-офф', date: sfDate };
        }
        
        const finalDate = parseDate(scheduleData.final);
        if (finalDate && finalDate > nowUTC && (!nextDate || finalDate < nextDate)) {
            nextDate = finalDate;
            nextMatch = { name: 'Гранд-финал', date: finalDate };
        }
        
        return nextMatch;
    }

    function updateTimer() {
        const nextMatch = getNextMatchInfo();
        if (!nextMatch) { 
            timerDiv.style.display = 'none'; 
            return; 
        }
        
        const nowUTC = new Date();
        const diff = nextMatch.date - nowUTC;
        
        if (diff <= 0) {
            timerSpan.textContent = nextMatch.name + ' — В ЭФИРЕ!';
            timerDiv.style.display = 'flex';
            return;
        }
        
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        
        let timerText = '';
        if (days > 0) timerText += days + 'д ';
        if (hours > 0 || days > 0) timerText += hours + 'ч ';
        timerText += minutes + 'м ' + seconds + 'с';
        
        timerSpan.textContent = nextMatch.name + ': ' + timerText;
        timerDiv.style.display = 'flex';
    }
    
    updateTimer();
    updateGroupStageAnimation();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateDrawSectionVisibility() {
    const drawSection = document.querySelector('.draw-section');
    if (!drawSection) return;
    
    const hasTeamsInGroups = (tournamentData.groups.A.teams && tournamentData.groups.A.teams.length > 0) ||
                             (tournamentData.groups.B.teams && tournamentData.groups.B.teams.length > 0);
    
    const isDrawCompleted = (tournamentData.groups.A.teams && tournamentData.groups.A.teams.length === 4) &&
                            (tournamentData.groups.B.teams && tournamentData.groups.B.teams.length === 4);
    
    if (isDrawCompleted && hasTeamsInGroups) {
        drawSection.classList.add('hidden');
    } else {
        drawSection.classList.remove('hidden');
    }
}

async function loadDrawStatus() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getDrawStatus`);
        const data = await response.json();
        let drawCompleted = data.drawCompleted || false;
        
        const hasTeamsInGroups = (tournamentData.groups.A.teams && tournamentData.groups.A.teams.length > 0) ||
                                 (tournamentData.groups.B.teams && tournamentData.groups.B.teams.length > 0);
        
        const isDrawCompleted = drawCompleted || 
                                (tournamentData.groups.A.teams && tournamentData.groups.A.teams.length === 4 && 
                                 tournamentData.groups.B.teams && tournamentData.groups.B.teams.length === 4);
        
        const drawSection = document.querySelector('.draw-section');
        if (drawSection) {
            if (isDrawCompleted) {
                drawSection.classList.add('hidden');
                const saveDrawBtn = document.getElementById('save-draw');
                if (saveDrawBtn) saveDrawBtn.style.display = 'none';
            } else {
                drawSection.classList.remove('hidden');
            }
        }
        
        return isDrawCompleted;
    } catch (error) { 
        console.log('loadDrawStatus error:', error);
        return false; 
    }
}

async function loadTournamentData() {
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getTournamentData`);
        const data = await response.json();
        if (data && data.tournamentData) {
            // ОЧИЩАЕМ НЕКОРРЕКТНЫЕ ДАННЫЕ
            const rawData = data.tournamentData;
            
            // Проверяем и очищаем группы
            if (!rawData.groups) rawData.groups = { A: { teams: [], matches: [] }, B: { teams: [], matches: [] } };
            if (!rawData.groups.A) rawData.groups.A = { teams: [], matches: [] };
            if (!rawData.groups.B) rawData.groups.B = { teams: [], matches: [] };
            if (!rawData.groups.A.teams) rawData.groups.A.teams = [];
            if (!rawData.groups.B.teams) rawData.groups.B.teams = [];
            if (!rawData.groups.A.matches) rawData.groups.A.matches = [];
            if (!rawData.groups.B.matches) rawData.groups.B.matches = [];
            
            // ОЧИЩАЕМ НЕКОРРЕКТНЫЕ ЗНАЧЕНИЯ В КОМАНДАХ
            rawData.groups.A.teams = rawData.groups.A.teams.map(t => t === null || t === undefined ? '' : String(t));
            rawData.groups.B.teams = rawData.groups.B.teams.map(t => t === null || t === undefined ? '' : String(t));
            
            // ОЧИЩАЕМ МАТЧИ
            if (rawData.groups.A.matches) {
                rawData.groups.A.matches = rawData.groups.A.matches.filter(m => m && typeof m === 'object').map(m => ({
                    ...m,
                    team1: m.team1 ? String(m.team1) : 'TBD',
                    team2: m.team2 ? String(m.team2) : 'TBD',
                    winner: m.winner ? String(m.winner) : '',
                    streamUrl: m.streamUrl || '',
                    date: m.date || '',
                    score1: m.score1 || 0,
                    score2: m.score2 || 0,
                    points1: m.points1 || 0,
                    points2: m.points2 || 0
                }));
            }
            
            if (rawData.groups.B.matches) {
                rawData.groups.B.matches = rawData.groups.B.matches.filter(m => m && typeof m === 'object').map(m => ({
                    ...m,
                    team1: m.team1 ? String(m.team1) : 'TBD',
                    team2: m.team2 ? String(m.team2) : 'TBD',
                    winner: m.winner ? String(m.winner) : '',
                    streamUrl: m.streamUrl || '',
                    date: m.date || '',
                    score1: m.score1 || 0,
                    score2: m.score2 || 0,
                    points1: m.points1 || 0,
                    points2: m.points2 || 0
                }));
            }
            
            // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА ПЛЕЙ-ОФФ
            if (!rawData.playoffs) {
                rawData.playoffs = {};
            }
            
            const matches = ['upperFinal', 'lowerSemi', 'lowerFinal', 'grandFinal'];
            matches.forEach(match => {
                if (!rawData.playoffs[match]) {
                    rawData.playoffs[match] = {};
                }
                
                // Очищаем команды (если пришло число 0)
                if (rawData.playoffs[match].team1 === 0 || rawData.playoffs[match].team1 === '0') {
                    rawData.playoffs[match].team1 = '';
                }
                if (rawData.playoffs[match].team2 === 0 || rawData.playoffs[match].team2 === '0') {
                    rawData.playoffs[match].team2 = '';
                }
                if (rawData.playoffs[match].winner === 0 || rawData.playoffs[match].winner === '0') {
                    rawData.playoffs[match].winner = '';
                }
                
                // Очищаем дату (если пришло число 0 или неправильный формат)
                if (rawData.playoffs[match].date === 0 || rawData.playoffs[match].date === '0') {
                    rawData.playoffs[match].date = '';
                }
                // Если дата в формате "11.06.2026 6:47" - конвертируем
                if (rawData.playoffs[match].date && typeof rawData.playoffs[match].date === 'string') {
                    const dateMatch = rawData.playoffs[match].date.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2})/);
                    if (dateMatch) {
                        const [_, day, month, year, hours, minutes] = dateMatch;
                        const hh = hours.padStart(2, '0');
                        rawData.playoffs[match].date = `${year}-${month}-${day}T${hh}:${minutes}`;
                    }
                }
                
                // Очищаем URL (если пришло число)
                if (rawData.playoffs[match].streamUrl === 0 || rawData.playoffs[match].streamUrl === '0') {
                    rawData.playoffs[match].streamUrl = '';
                }
                
                // Устанавливаем значения по умолчанию
                rawData.playoffs[match].team1Score = rawData.playoffs[match].team1Score || 0;
                rawData.playoffs[match].team2Score = rawData.playoffs[match].team2Score || 0;
                rawData.playoffs[match].team1Points = rawData.playoffs[match].team1Points || 0;
                rawData.playoffs[match].team2Points = rawData.playoffs[match].team2Points || 0;
            });
            
            tournamentData = rawData;

            // Загружаем аватары
            const avatars = data.avatars || {};
            window.teamAvatars = avatars;
            console.log('Загружены аватары:', window.teamAvatars);

            // Сохраняем оригинальные данные для отслеживания изменений
            window._originalGroupAMatches = JSON.parse(JSON.stringify(tournamentData.groups.A.matches || []));
            window._originalGroupBMatches = JSON.parse(JSON.stringify(tournamentData.groups.B.matches || []));
            window._originalPlayoffs = {
                upperFinal: JSON.parse(JSON.stringify(tournamentData.playoffs.upperFinal)),
                lowerSemi: JSON.parse(JSON.stringify(tournamentData.playoffs.lowerSemi)),
                lowerFinal: JSON.parse(JSON.stringify(tournamentData.playoffs.lowerFinal)),
                grandFinal: JSON.parse(JSON.stringify(tournamentData.playoffs.grandFinal))
            };

            // Восстанавливаем временные ссылки из загруженных данных
            tempPlayoffStreamUrls.upperFinal = tournamentData.playoffs.upperFinal?.streamUrl || '';
            tempPlayoffStreamUrls.lowerSemi = tournamentData.playoffs.lowerSemi?.streamUrl || '';
            tempPlayoffStreamUrls.lowerFinal = tournamentData.playoffs.lowerFinal?.streamUrl || '';
            tempPlayoffStreamUrls.grandFinal = tournamentData.playoffs.grandFinal?.streamUrl || '';

            tempPlayoffDates.upperFinal = tournamentData.playoffs.upperFinal?.date || '';
            tempPlayoffDates.lowerSemi = tournamentData.playoffs.lowerSemi?.date || '';
            tempPlayoffDates.lowerFinal = tournamentData.playoffs.lowerFinal?.date || '';
            tempPlayoffDates.grandFinal = tournamentData.playoffs.grandFinal?.date || '';

            console.log('Восстановлены данные плей-офф из Google Sheets:', { tempPlayoffStreamUrls, tempPlayoffDates });
            
            groupATeamsList = [...(tournamentData.groups.A.teams || [])];
            groupBTeamsList = [...(tournamentData.groups.B.teams || [])];
            
            // ОЧИЩАЕМ ПУСТЫЕ КОМАНДЫ
            groupATeamsList = groupATeamsList.filter(t => t && t !== '');
            groupBTeamsList = groupBTeamsList.filter(t => t && t !== '');
            
            tournamentData.groups.A.teams = groupATeamsList;
            tournamentData.groups.B.teams = groupBTeamsList;
            
            updateTeamsInputStatus();
            
            if (groupATeamsList.length === 4 && groupBTeamsList.length === 4) {
                currentDrawStep = 4;
                remainingTeamsAll = [];
            }
            
            // Вызываем все необходимые функции для обновления интерфейса
            renderGroups();
            renderPlayoffs();
            updateDrawStatus();
            updateDrawButtons();
            updatePlayoffsBracket();
            updatePlayoffAnimation();
            updateDrawSectionVisibility();
            return true;
        }
        return false;
    } catch (error) { 
        console.log('loadTournamentData error:', error);
        return false; 
    }
}

// Функция для очистки некорректных данных в плей-офф
function sanitizePlayoffsData(playoffs) {
    const matches = ['upperFinal', 'lowerSemi', 'lowerFinal', 'grandFinal'];
    
    matches.forEach(match => {
        if (playoffs[match]) {
            // Если winner === 0 или '0' - очищаем
            if (playoffs[match].winner === 0 || playoffs[match].winner === '0') {
                playoffs[match].winner = '';
            }
            // Если date === 0 или некорректная дата - очищаем
            if (playoffs[match].date === 0 || playoffs[match].date === '0' || 
                (typeof playoffs[match].date === 'number')) {
                playoffs[match].date = '';
            }
            // Если streamUrl === 0 - очищаем
            if (playoffs[match].streamUrl === 0 || playoffs[match].streamUrl === '0') {
                playoffs[match].streamUrl = '';
            }
            // Приводим все счёта и очки к числам
            playoffs[match].team1Score = Number(playoffs[match].team1Score) || 0;
            playoffs[match].team2Score = Number(playoffs[match].team2Score) || 0;
            playoffs[match].team1Points = Number(playoffs[match].team1Points) || 0;
            playoffs[match].team2Points = Number(playoffs[match].team2Points) || 0;
        }
    });
    
    return playoffs;
}

// ==================== ОБНОВЛЕНИЕ ПЛЕЙ-ОФФ ====================
function getGroupWinners(group) {
    const teams = group.teams || [];
    const matches = group.matches || [];
    const teamsWithStats = teams.map(teamName => {
        let wins = 0, totalPoints = 0;
        matches.forEach(match => {
            if (match.team1 === teamName && match.winner === teamName) { wins++; totalPoints += (match.points1 || 0); }
            if (match.team2 === teamName && match.winner === teamName) { wins++; totalPoints += (match.points2 || 0); }
        });
        return { name: teamName, wins: wins || 0, points: totalPoints || 0 };
    });
    teamsWithStats.sort((a, b) => b.wins - a.wins || b.points - a.points);
    return teamsWithStats;
}

function cleanTBDFromPlayoffs() {
    const playoffs = tournamentData.playoffs;
    
    if (!playoffs.upperFinal.winner) {
        if (playoffs.grandFinal.team1 === playoffs.upperFinal.team1 || 
            playoffs.grandFinal.team1 === playoffs.upperFinal.team2) {
            playoffs.grandFinal.team1 = '';
        }
        if (playoffs.lowerFinal.team1 === playoffs.upperFinal.team1 || 
            playoffs.lowerFinal.team1 === playoffs.upperFinal.team2) {
            playoffs.lowerFinal.team1 = '';
        }
    }
    
    if (!playoffs.lowerSemi.winner) {
        if (playoffs.lowerFinal.team2 === playoffs.lowerSemi.team1 || 
            playoffs.lowerFinal.team2 === playoffs.lowerSemi.team2) {
            playoffs.lowerFinal.team2 = '';
        }
    }
    
    if (!playoffs.lowerFinal.winner) {
        if (playoffs.grandFinal.team2 === playoffs.lowerFinal.team1 || 
            playoffs.grandFinal.team2 === playoffs.lowerFinal.team2) {
            playoffs.grandFinal.team2 = '';
        }
    }
    
    if (playoffs.upperFinal.team1 === 'TBD') playoffs.upperFinal.team1 = '';
    if (playoffs.upperFinal.team2 === 'TBD') playoffs.upperFinal.team2 = '';
    if (playoffs.upperFinal.winner === 'TBD') playoffs.upperFinal.winner = '';
    
    if (playoffs.lowerSemi.team1 === 'TBD') playoffs.lowerSemi.team1 = '';
    if (playoffs.lowerSemi.team2 === 'TBD') playoffs.lowerSemi.team2 = '';
    if (playoffs.lowerSemi.winner === 'TBD') playoffs.lowerSemi.winner = '';
    
    if (playoffs.lowerFinal.team1 === 'TBD') playoffs.lowerFinal.team1 = '';
    if (playoffs.lowerFinal.team2 === 'TBD') playoffs.lowerFinal.team2 = '';
    if (playoffs.lowerFinal.winner === 'TBD') playoffs.lowerFinal.winner = '';
    
    if (playoffs.grandFinal.team1 === 'TBD') playoffs.grandFinal.team1 = '';
    if (playoffs.grandFinal.team2 === 'TBD') playoffs.grandFinal.team2 = '';
    if (playoffs.grandFinal.winner === 'TBD') playoffs.grandFinal.winner = '';
}

function updatePlayoffsBracket() {
    console.log('=== updatePlayoffsBracket called ===');
    
    // Сохраняем существующие даты и ссылки ДО того, как они будут сброшены
    const savedDates = {
        upperFinal: tournamentData.playoffs.upperFinal?.date || '',
        lowerSemi: tournamentData.playoffs.lowerSemi?.date || '',
        lowerFinal: tournamentData.playoffs.lowerFinal?.date || '',
        grandFinal: tournamentData.playoffs.grandFinal?.date || ''
    };
    
    const savedStreamUrls = {
        upperFinal: tournamentData.playoffs.upperFinal?.streamUrl || '',
        lowerSemi: tournamentData.playoffs.lowerSemi?.streamUrl || '',
        lowerFinal: tournamentData.playoffs.lowerFinal?.streamUrl || '',
        grandFinal: tournamentData.playoffs.grandFinal?.streamUrl || ''
    };
    
    const savedScores = {
        upperFinal: { score1: tournamentData.playoffs.upperFinal?.team1Score || 0, score2: tournamentData.playoffs.upperFinal?.team2Score || 0 },
        lowerSemi: { score1: tournamentData.playoffs.lowerSemi?.team1Score || 0, score2: tournamentData.playoffs.lowerSemi?.team2Score || 0 },
        lowerFinal: { score1: tournamentData.playoffs.lowerFinal?.team1Score || 0, score2: tournamentData.playoffs.lowerFinal?.team2Score || 0 },
        grandFinal: { score1: tournamentData.playoffs.grandFinal?.team1Score || 0, score2: tournamentData.playoffs.grandFinal?.team2Score || 0 }
    };
    
    const savedPoints = {
        upperFinal: { points1: tournamentData.playoffs.upperFinal?.team1Points || 0, points2: tournamentData.playoffs.upperFinal?.team2Points || 0 },
        lowerSemi: { points1: tournamentData.playoffs.lowerSemi?.team1Points || 0, points2: tournamentData.playoffs.lowerSemi?.team2Points || 0 },
        lowerFinal: { points1: tournamentData.playoffs.lowerFinal?.team1Points || 0, points2: tournamentData.playoffs.lowerFinal?.team2Points || 0 },
        grandFinal: { points1: tournamentData.playoffs.grandFinal?.team1Points || 0, points2: tournamentData.playoffs.grandFinal?.team2Points || 0 }
    };
    
    const groupACompleted = isGroupStageCompleted('A');
    const groupBCompleted = isGroupStageCompleted('B');
    
    console.log('Group A completed:', groupACompleted);
    console.log('Group B completed:', groupBCompleted);
    
    const groupAWinners = getGroupWinners(tournamentData.groups.A);
    const groupBWinners = getGroupWinners(tournamentData.groups.B);
    
    console.log('Group A winners:', groupAWinners);
    console.log('Group B winners:', groupBWinners);
    
    cleanTBDFromPlayoffs();
    
    // ========== ВЕРХНЯЯ СЕТКА (UPPER FINAL) ==========
    if (groupACompleted && groupAWinners[0] && groupAWinners[0].name) {
        tournamentData.playoffs.upperFinal.team1 = groupAWinners[0].name;
    } else if (!groupACompleted) {
        tournamentData.playoffs.upperFinal.team1 = '';
    }
    
    if (groupBCompleted && groupBWinners[0] && groupBWinners[0].name) {
        tournamentData.playoffs.upperFinal.team2 = groupBWinners[0].name;
    } else if (!groupBCompleted) {
        tournamentData.playoffs.upperFinal.team2 = '';
    }
    
    // ========== НИЖНЯЯ СЕТКА (LOWER SEMI) ==========
    if (groupACompleted && groupAWinners[1] && groupAWinners[1].name) {
        tournamentData.playoffs.lowerSemi.team1 = groupAWinners[1].name;
    } else if (!groupACompleted) {
        tournamentData.playoffs.lowerSemi.team1 = '';
    }
    
    if (groupBCompleted && groupBWinners[1] && groupBWinners[1].name) {
        tournamentData.playoffs.lowerSemi.team2 = groupBWinners[1].name;
    } else if (!groupBCompleted) {
        tournamentData.playoffs.lowerSemi.team2 = '';
    }
    
    // ВОССТАНАВЛИВАЕМ СОХРАНЁННЫЕ ДАННЫЕ (даты, ссылки, счета, очки)
    tournamentData.playoffs.upperFinal.date = savedDates.upperFinal || tempPlayoffDates.upperFinal;
    tournamentData.playoffs.upperFinal.team1Score = savedScores.upperFinal.score1;
    tournamentData.playoffs.upperFinal.team2Score = savedScores.upperFinal.score2;
    tournamentData.playoffs.upperFinal.team1Points = savedPoints.upperFinal.points1;
    tournamentData.playoffs.upperFinal.team2Points = savedPoints.upperFinal.points2;
    
    tournamentData.playoffs.lowerSemi.date = savedDates.lowerSemi || tempPlayoffDates.lowerSemi;
    tournamentData.playoffs.lowerSemi.team1Score = savedScores.lowerSemi.score1;
    tournamentData.playoffs.lowerSemi.team2Score = savedScores.lowerSemi.score2;
    tournamentData.playoffs.lowerSemi.team1Points = savedPoints.lowerSemi.points1;
    tournamentData.playoffs.lowerSemi.team2Points = savedPoints.lowerSemi.points2;
    
    tournamentData.playoffs.lowerFinal.date = savedDates.lowerFinal || tempPlayoffDates.lowerFinal;
    tournamentData.playoffs.lowerFinal.team1Score = savedScores.lowerFinal.score1;
    tournamentData.playoffs.lowerFinal.team2Score = savedScores.lowerFinal.score2;
    tournamentData.playoffs.lowerFinal.team1Points = savedPoints.lowerFinal.points1;
    tournamentData.playoffs.lowerFinal.team2Points = savedPoints.lowerFinal.points2;
    
    tournamentData.playoffs.grandFinal.date = savedDates.grandFinal || tempPlayoffDates.grandFinal;
    tournamentData.playoffs.grandFinal.team1Score = savedScores.grandFinal.score1;
    tournamentData.playoffs.grandFinal.team2Score = savedScores.grandFinal.score2;
    tournamentData.playoffs.grandFinal.team1Points = savedPoints.grandFinal.points1;
    tournamentData.playoffs.grandFinal.team2Points = savedPoints.grandFinal.points2;

    // Восстанавливаем ссылки из временных
    tournamentData.playoffs.upperFinal.streamUrl = savedStreamUrls.upperFinal || tempPlayoffStreamUrls.upperFinal;
    tournamentData.playoffs.lowerSemi.streamUrl = savedStreamUrls.lowerSemi || tempPlayoffStreamUrls.lowerSemi;
    tournamentData.playoffs.lowerFinal.streamUrl = savedStreamUrls.lowerFinal || tempPlayoffStreamUrls.lowerFinal;
    tournamentData.playoffs.grandFinal.streamUrl = savedStreamUrls.grandFinal || tempPlayoffStreamUrls.grandFinal;

    // Синхронизируем временные даты
    tempPlayoffDates.upperFinal = tournamentData.playoffs.upperFinal.date;
    tempPlayoffDates.lowerSemi = tournamentData.playoffs.lowerSemi.date;
    tempPlayoffDates.lowerFinal = tournamentData.playoffs.lowerFinal.date;
    tempPlayoffDates.grandFinal = tournamentData.playoffs.grandFinal.date;
    
    // ========== ОБРАБОТКА ПОБЕДИТЕЛЕЙ ==========
    const upperFinal = tournamentData.playoffs.upperFinal;
    const lowerSemi = tournamentData.playoffs.lowerSemi;
    const lowerFinal = tournamentData.playoffs.lowerFinal;
    const grandFinal = tournamentData.playoffs.grandFinal;
    
    // 1. ПОБЕДИТЕЛЬ ВЕРХНЕГО ФИНАЛА -> ГРАНД-ФИНАЛ
    if (upperFinal.winner && upperFinal.winner !== '') {
        grandFinal.team1 = upperFinal.winner;
        console.log('Победитель верхнего финала идёт в гранд-финал:', upperFinal.winner);
        
        const upperLoser = upperFinal.team1 === upperFinal.winner ? upperFinal.team2 : upperFinal.team1;
        if (upperLoser && upperLoser !== '') {
            lowerFinal.team1 = upperLoser;
            console.log('Проигравший верхнего финала идёт в финал нижней сетки:', upperLoser);
        }
    }
    
    // 2. ПОБЕДИТЕЛЬ ПОЛУФИНАЛА НИЖНЕЙ СЕТКИ -> ФИНАЛ НИЖНЕЙ СЕТКИ
    if (lowerSemi.winner && lowerSemi.winner !== '') {
        lowerFinal.team2 = lowerSemi.winner;
        console.log('Победитель полуфинала нижней сетки идёт в финал нижней сетки:', lowerSemi.winner);
    }
    
    // 3. ПОБЕДИТЕЛЬ ФИНАЛА НИЖНЕЙ СЕТКИ -> ГРАНД-ФИНАЛ
    if (lowerFinal.winner && lowerFinal.winner !== '') {
        grandFinal.team2 = lowerFinal.winner;
        console.log('Победитель финала нижней сетки идёт в гранд-финал:', lowerFinal.winner);
    }
    
    console.log('=== ТЕКУЩЕЕ СОСТОЯНИЕ ПЛЕЙ-ОФФ ===');
    console.log('UPPER FINAL:', tournamentData.playoffs.upperFinal.team1, 'vs', tournamentData.playoffs.upperFinal.team2, '| Победитель:', tournamentData.playoffs.upperFinal.winner, '| Дата:', tournamentData.playoffs.upperFinal.date);
    console.log('LOWER SEMI:', tournamentData.playoffs.lowerSemi.team1, 'vs', tournamentData.playoffs.lowerSemi.team2, '| Победитель:', tournamentData.playoffs.lowerSemi.winner, '| Дата:', tournamentData.playoffs.lowerSemi.date);
    console.log('LOWER FINAL:', tournamentData.playoffs.lowerFinal.team1, 'vs', tournamentData.playoffs.lowerFinal.team2, '| Победитель:', tournamentData.playoffs.lowerFinal.winner, '| Дата:', tournamentData.playoffs.lowerFinal.date);
    console.log('GRAND FINAL:', tournamentData.playoffs.grandFinal.team1, 'vs', tournamentData.playoffs.grandFinal.team2, '| Победитель:', tournamentData.playoffs.grandFinal.winner, '| Дата:', tournamentData.playoffs.grandFinal.date);
    
    renderPlayoffs();
    renderResults();
    updatePlayoffAnimation();
}

// ==================== ИНИЦИАЛИЗАЦИЯ МАТЧЕЙ ГРУПП ====================
function initGroupMatches() {
    const groupATeams = tournamentData.groups.A.teams || [];
    const groupBTeams = tournamentData.groups.B.teams || [];
    
    if (groupATeams.length === 4 && tournamentData.groups.A.matches.length === 0) {
        tournamentData.groups.A.matches = [
            { id: 1, team1: groupATeams[0], team2: groupATeams[1], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 1, streamUrl: '', date: '' },
            { id: 2, team1: groupATeams[2], team2: groupATeams[3], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 2, streamUrl: '', date: '' },
            { id: 3, team1: groupATeams[0], team2: groupATeams[2], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 3, streamUrl: '', date: '' },
            { id: 4, team1: groupATeams[1], team2: groupATeams[3], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 3, streamUrl: '', date: '' },
            { id: 5, team1: groupATeams[0], team2: groupATeams[3], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 4, streamUrl: '', date: '' },
            { id: 6, team1: groupATeams[1], team2: groupATeams[2], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 1, streamUrl: '', date: '' }
        ];
    }
    
    if (groupBTeams.length === 4 && tournamentData.groups.B.matches.length === 0) {
        tournamentData.groups.B.matches = [
            { id: 1, team1: groupBTeams[0], team2: groupBTeams[1], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 2, streamUrl: '', date: '' },
            { id: 2, team1: groupBTeams[2], team2: groupBTeams[3], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 1, streamUrl: '', date: '' },
            { id: 3, team1: groupBTeams[0], team2: groupBTeams[2], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 4, streamUrl: '', date: '' },
            { id: 4, team1: groupBTeams[1], team2: groupBTeams[3], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 4, streamUrl: '', date: '' },
            { id: 5, team1: groupBTeams[0], team2: groupBTeams[3], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 3, streamUrl: '', date: '' },
            { id: 6, team1: groupBTeams[1], team2: groupBTeams[2], score1: 0, score2: 0, points1: 0, points2: 0, winner: '', stream: 2, streamUrl: '', date: '' }
        ];
    }
}

function getLiveStatus(matchDate, matchWinner) {
    if (!matchDate) return { isLive: false, isFinished: false };
    
    const now = new Date();
    const nowUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds()
    ));
    
    let matchTimeStr = matchDate;
    if (matchTimeStr.length === 16) {
        matchTimeStr = matchTimeStr + ':00';
    }
    const matchTime = new Date(matchTimeStr + 'Z');
    
    if (isNaN(matchTime.getTime())) return { isLive: false, isFinished: false };
    
    const diffMinutes = (nowUTC - matchTime) / (1000 * 60);
    
    if (matchTime > nowUTC) return { isLive: false, isFinished: false };
    if (diffMinutes < 60 && (!matchWinner || matchWinner === '')) return { isLive: true, isFinished: false };
    return { isLive: false, isFinished: true };
}

function getScoreClass(score) {
    if (score === 1) return 'match-score-win';
    if (score === 0) return 'match-score-loss';
    return '';
}

function getTeamRankings(group) {
    const teams = tournamentData.groups[group].teams || [];
    const matches = tournamentData.groups[group].matches || [];
    const teamsWithStats = teams.map(teamName => {
        if (!teamName || teamName === '') return { name: '—', wins: 0, points: 0 };
        
        let wins = 0, totalPoints = 0;
        matches.forEach(match => {
            if (match.team1 === teamName && match.winner === teamName) { wins++; totalPoints += (match.points1 || 0); }
            if (match.team2 === teamName && match.winner === teamName) { wins++; totalPoints += (match.points2 || 0); }
        });
        return { name: teamName, wins: wins || 0, points: totalPoints || 0 };
    }).filter(team => team.name !== '—');
    
    teamsWithStats.sort((a, b) => b.wins - a.wins || b.points - a.points);
    return teamsWithStats;
}

function getRankClass(rank) {
    if (rank === 0) return 'rank-1';
    if (rank === 1) return 'rank-2';
    return '';
}

// ==================== ПРОВЕРКА ЗАВЕРШЕНИЯ ТУРНИРА ====================
function isTournamentCompleted() {
    const grandFinal = tournamentData.playoffs.grandFinal;
    return grandFinal.winner && grandFinal.winner !== '' && grandFinal.winner !== 'TBD';
}

// ==================== ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ТУРНИРА ====================
function renderResults() {
    const resultsSection = document.querySelector('.results-section');
    const resultsList = document.getElementById('results-list');
    
    if (!resultsList) return;
    
    const tournamentCompleted = isTournamentCompleted();
    
    if (!tournamentCompleted) {
        if (resultsSection) resultsSection.style.display = 'none';
        return;
    }
    
    if (resultsSection) resultsSection.style.display = 'block';
    
    // Собираем статистику по всем командам за весь турнир
    const teamStats = [];
    
    // Функция для подсчета статистики команды в группе
    const processGroup = (groupName) => {
        const group = tournamentData.groups[groupName];
        if (!group || !group.teams) return;
        
        group.teams.forEach(teamName => {
            if (!teamName || teamName === '') return;
            
            let wins = 0;
            let totalPoints = 0;
            
            if (group.matches) {
                group.matches.forEach(match => {
                    // Проверяем, участвует ли команда в матче
                    if (match.team1 === teamName) {
                        // Добавляем очки команды (даже если проиграла)
                        totalPoints += (match.points1 || 0);
                        // Проверяем победу
                        if (match.winner === teamName) wins++;
                    }
                    if (match.team2 === teamName) {
                        // Добавляем очки команды (даже если проиграла)
                        totalPoints += (match.points2 || 0);
                        // Проверяем победу
                        if (match.winner === teamName) wins++;
                    }
                });
            }
            
            teamStats.push({
                name: teamName,
                wins: wins,
                points: totalPoints
            });
        });
    };
    
    processGroup('A');
    processGroup('B');
    
    // Функция для обновления статистики команды (добавляем очки и победы из плей-офф)
    const updateTeamStats = (teamName, winsToAdd, pointsToAdd) => {
        const team = teamStats.find(t => t.name === teamName);
        if (team) {
            team.wins += winsToAdd;
            team.points += pointsToAdd;
        }
    };
    
    // Функция для добавления очков проигравшей команде
    const addLoserPoints = (match, loserTeamName) => {
        const team = teamStats.find(t => t.name === loserTeamName);
        if (team && match) {
            let loserPoints = 0;
            if (match.team1 === loserTeamName) {
                loserPoints = match.team1Points || 0;
            } else if (match.team2 === loserTeamName) {
                loserPoints = match.team2Points || 0;
            }
            team.points += loserPoints;
        }
    };
    
    // Обработка плей-офф
    const playoffs = tournamentData.playoffs;
    
    // Верхний финал
    if (playoffs.upperFinal.team1 && playoffs.upperFinal.team1 !== 'TBD' && playoffs.upperFinal.team1 !== '') {
        if (playoffs.upperFinal.winner === playoffs.upperFinal.team1) {
            updateTeamStats(playoffs.upperFinal.team1, 1, playoffs.upperFinal.team1Points || 0);
            addLoserPoints(playoffs.upperFinal, playoffs.upperFinal.team2);
        } else if (playoffs.upperFinal.winner === playoffs.upperFinal.team2) {
            updateTeamStats(playoffs.upperFinal.team2, 1, playoffs.upperFinal.team2Points || 0);
            addLoserPoints(playoffs.upperFinal, playoffs.upperFinal.team1);
        } else if (!playoffs.upperFinal.winner) {
            // Если победитель еще не определен, добавляем очки обеим командам
            updateTeamStats(playoffs.upperFinal.team1, 0, playoffs.upperFinal.team1Points || 0);
            updateTeamStats(playoffs.upperFinal.team2, 0, playoffs.upperFinal.team2Points || 0);
        }
    }
    
    // Полуфинал нижней сетки
    if (playoffs.lowerSemi.team1 && playoffs.lowerSemi.team1 !== 'TBD' && playoffs.lowerSemi.team1 !== '') {
        if (playoffs.lowerSemi.winner === playoffs.lowerSemi.team1) {
            updateTeamStats(playoffs.lowerSemi.team1, 1, playoffs.lowerSemi.team1Points || 0);
            addLoserPoints(playoffs.lowerSemi, playoffs.lowerSemi.team2);
        } else if (playoffs.lowerSemi.winner === playoffs.lowerSemi.team2) {
            updateTeamStats(playoffs.lowerSemi.team2, 1, playoffs.lowerSemi.team2Points || 0);
            addLoserPoints(playoffs.lowerSemi, playoffs.lowerSemi.team1);
        } else if (!playoffs.lowerSemi.winner) {
            updateTeamStats(playoffs.lowerSemi.team1, 0, playoffs.lowerSemi.team1Points || 0);
            updateTeamStats(playoffs.lowerSemi.team2, 0, playoffs.lowerSemi.team2Points || 0);
        }
    }
    
    // Финал нижней сетки
    if (playoffs.lowerFinal.team1 && playoffs.lowerFinal.team1 !== 'TBD' && playoffs.lowerFinal.team1 !== '') {
        if (playoffs.lowerFinal.winner === playoffs.lowerFinal.team1) {
            updateTeamStats(playoffs.lowerFinal.team1, 1, playoffs.lowerFinal.team1Points || 0);
            addLoserPoints(playoffs.lowerFinal, playoffs.lowerFinal.team2);
        } else if (playoffs.lowerFinal.winner === playoffs.lowerFinal.team2) {
            updateTeamStats(playoffs.lowerFinal.team2, 1, playoffs.lowerFinal.team2Points || 0);
            addLoserPoints(playoffs.lowerFinal, playoffs.lowerFinal.team1);
        } else if (!playoffs.lowerFinal.winner) {
            updateTeamStats(playoffs.lowerFinal.team1, 0, playoffs.lowerFinal.team1Points || 0);
            updateTeamStats(playoffs.lowerFinal.team2, 0, playoffs.lowerFinal.team2Points || 0);
        }
    }
    
    // Гранд-финал
    if (playoffs.grandFinal.team1 && playoffs.grandFinal.team1 !== 'TBD' && playoffs.grandFinal.team1 !== '') {
        if (playoffs.grandFinal.winner === playoffs.grandFinal.team1) {
            updateTeamStats(playoffs.grandFinal.team1, 1, playoffs.grandFinal.team1Points || 0);
            addLoserPoints(playoffs.grandFinal, playoffs.grandFinal.team2);
        } else if (playoffs.grandFinal.winner === playoffs.grandFinal.team2) {
            updateTeamStats(playoffs.grandFinal.team2, 1, playoffs.grandFinal.team2Points || 0);
            addLoserPoints(playoffs.grandFinal, playoffs.grandFinal.team1);
        } else if (!playoffs.grandFinal.winner) {
            updateTeamStats(playoffs.grandFinal.team1, 0, playoffs.grandFinal.team1Points || 0);
            updateTeamStats(playoffs.grandFinal.team2, 0, playoffs.grandFinal.team2Points || 0);
        }
    }
    
    // Удаляем команды с нулевыми показателями (если нужно)
    // Пересортировка
    teamStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.points - a.points;
    });
    
    // Помечаем чемпиона и финалиста для правильного порядка
    const grandFinalWinner = tournamentData.playoffs.grandFinal.winner;
    const grandFinalLoser = tournamentData.playoffs.grandFinal.team1 === grandFinalWinner ? 
        tournamentData.playoffs.grandFinal.team2 : tournamentData.playoffs.grandFinal.team1;
    
    if (grandFinalWinner && grandFinalWinner !== '' && grandFinalWinner !== 'TBD') {
        const winnerIndex = teamStats.findIndex(t => t.name === grandFinalWinner);
        if (winnerIndex > 0) {
            const winner = teamStats.splice(winnerIndex, 1)[0];
            teamStats.unshift(winner);
        }
    }
    
    if (grandFinalLoser && grandFinalLoser !== '' && grandFinalLoser !== 'TBD') {
        const loserIndex = teamStats.findIndex(t => t.name === grandFinalLoser);
        if (loserIndex > 0 && loserIndex !== 1) {
            const loser = teamStats.splice(loserIndex, 1)[0];
            teamStats.splice(1, 0, loser);
        }
    }
    
    // Формируем HTML
    let html = '';
    
    for (let i = 0; i < Math.min(teamStats.length, 8); i++) {
        const team = teamStats[i];
        const place = i + 1;
        const prize = prizeData[place] || '—';
        
        let rankClass = '';
        let medalIcon = '';
        
        if (place === 1) {
            rankClass = 'rank-1-row';
            medalIcon = '🏆';
        } else if (place === 2) {
            rankClass = 'rank-2-row';
            medalIcon = '🥈';
        } else if (place === 3) {
            rankClass = 'rank-3-row';
            medalIcon = '🥉';
        } else {
            rankClass = 'rank-other';
        }
        
        html += `
            <div class="result-row ${rankClass}">
                <div class="result-place">${place}</div>
                <div class="result-team">${getAvatarHtml(team.name)}${escapeHtml(team.name)}</div>
                <div class="result-wins">${team.wins}</div>
                <div class="result-points">${team.points.toLocaleString()}</div>
                <div class="result-prize">
                    ${escapeHtml(prize)} 
                    ${medalIcon ? `<span class="prize-icon">${medalIcon}</span>` : ''}
                </div>
            </div>
        `;
    }
    
    resultsList.innerHTML = html;
}

// ==================== ОТРИСОВКА ГРУПП ====================
function renderGroups() {
    const container = document.getElementById('groupsContainer');
    if (!container) return;
    
    if (!tournamentData || !tournamentData.groups) {
        container.innerHTML = '<div class="loading">Загрузка данных...</div>';
        return;
    }
    
    const groups = ['A', 'B'];
    container.innerHTML = groups.map(group => {
        if (!tournamentData.groups[group]) {
            return `<div class="group-card"><div class="group-header"><h3>ГРУППА ${group}</h3></div><div class="group-matches">Нет данных</div></div>`;
        }
        
        const rankings = getTeamRankings(group);
        const matches = tournamentData.groups[group].matches || [];
        const isGroupCompleted = isGroupStageCompleted(group);
        const hasTeams = tournamentData.groups[group].teams && tournamentData.groups[group].teams.length > 0;
        
        // Если нет команд - показываем заглушку как в плей-офф
        if (!hasTeams) {
            return `
                <div class="group-card">
                    <div class="group-header">
                        <h3>ГРУППА ${group}</h3>
                        <p>ожидание жеребьёвки</p>
                    </div>
                    <div class="group-placeholder">
                        <div class="placeholder-text">Команды будут распределены после жеребьёвки</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="group-card">
                <div class="group-header">
                    <h3>ГРУППА ${group}${isGroupCompleted ? ' ✓' : ''}</h3>
                    <p>каждый с каждым — 3 матча на команду</p>
                </div>
                <table class="group-teams-table">
                    <thead>
                        <tr>
                            <th style="text-align: left">КОМАНДА</th>
                            <th style="text-align: center">ПОБЕДЫ</th>
                            <th>ОЧКИ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rankings.map((team, idx) => {
                            if (!team || !team.name) return '';
                            const rankClass = getRankClass(idx);
                            const isEliminated = isGroupCompleted && idx >= 2;
                            const eliminationText = isEliminated ? ' — вылет' : '';
                            
                            return `
                                <tr class="${rankClass}">
                                    <td style="text-align: left; font-weight: 700; font-size: 0.95rem;">
                                        ${getAvatarHtml(team.name)}${escapeHtml(team.name)}${eliminationText}
                                    </td>
                                    <td style="text-align: center">
                                        <span class="${team.wins > 0 ? 'stat-wins' : 'stat-wins-zero'}">${team.wins}</span>
                                    </td>
                                    <td style="text-align: right; padding-right: 1rem;">
                                        <span class="stat-points">${(team.points || 0).toLocaleString()}</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                <div class="group-matches">
                    <div class="group-matches-header" id="group-${group}-matches-header">
                        <h4>МАТЧИ ГРУППЫ ${group}</h4>
                    </div>
                    <div class="matches-list">
                        ${matches.map((match, idx) => renderMatchCard(group, match, idx)).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    if (isAdmin) attachMatchHandlers();
}

function renderMatchCard(group, match, idx) {
    const safeMatch = {
        id: match.id,
        team1: match.team1 || 'TBD',
        team2: match.team2 || 'TBD',
        score1: match.score1 !== undefined ? match.score1 : 0,
        score2: match.score2 !== undefined ? match.score2 : 0,
        points1: match.points1 !== undefined ? match.points1 : 0,
        points2: match.points2 !== undefined ? match.points2 : 0,
        winner: match.winner || '',
        date: match.date || '',
        streamUrl: match.streamUrl || ''
    };
    
    const isWinner1 = safeMatch.winner === safeMatch.team1;
    const isWinner2 = safeMatch.winner === safeMatch.team2;
    const winnerClass1 = isWinner1 ? 'match-winner' : '';
    const winnerClass2 = isWinner2 ? 'match-winner' : '';
    
    const liveStatus = getLiveStatus(safeMatch.date, safeMatch.winner);
    const isLiveNow = liveStatus.isLive;
    
    const hasStreamUrl = safeMatch.streamUrl && safeMatch.streamUrl !== '';
    
    let liveBtnClass = '';
    if (!hasStreamUrl) {
        liveBtnClass = 'match-live-btn-finished';
    } else if (isLiveNow) {
        liveBtnClass = 'match-live-btn';
    } else {
        liveBtnClass = 'match-live-btn-dimmed';
    }
    
    const streamLink = hasStreamUrl ? safeMatch.streamUrl : '#';
    const pulseAnimation = (isLiveNow && hasStreamUrl) ? 'live-pulse' : '';
    
    const score1Class = safeMatch.score1 === 1 ? 'match-score-win' : 'match-score-loss';
    const score2Class = safeMatch.score2 === 1 ? 'match-score-win' : 'match-score-loss';
    
    // Условный рендер аватара
    const team1AvatarHtml = (safeMatch.team1 && safeMatch.team1 !== 'TBD') ? getAvatarHtml(safeMatch.team1) : '';
    const team2AvatarHtml = (safeMatch.team2 && safeMatch.team2 !== 'TBD') ? getAvatarHtml(safeMatch.team2) : '';
    
    // Режим просмотра (зритель)
    const viewerHtml = `
        <div class="match-teams-row">
            <div class="match-team match-team-left ${winnerClass1}">
                ${team1AvatarHtml}
                <span class="match-team-name">${escapeHtml(safeMatch.team1)}</span>
            </div>
            <div class="match-vs ${isLiveNow ? 'match-vs-live' : ''}">VS</div>
            <div class="match-team match-team-right ${winnerClass2}">
                <span class="match-team-name">${escapeHtml(safeMatch.team2)}</span>
                ${team2AvatarHtml}
            </div>
        </div>
        <div class="match-scores-row">
            <span class="match-score-left ${score1Class}">${safeMatch.score1}</span>
            <span class="match-score-divider">:</span>
            <span class="match-score-right ${score2Class}">${safeMatch.score2}</span>
        </div>
        <div class="match-points-row">
            <span class="match-points-left">${safeMatch.points1.toLocaleString()}</span>
            <span class="match-points-divider">:</span>
            <span class="match-points-right">${safeMatch.points2.toLocaleString()}</span>
        </div>
    `;
    
    // Режим администратора
    const adminHtml = `
        <div class="match-teams-row">
            <div class="match-team match-team-left">
                <span class="match-team-name">${escapeHtml(safeMatch.team1)}</span>
            </div>
            <div class="match-vs">VS</div>
            <div class="match-team match-team-right">
                <span class="match-team-name">${escapeHtml(safeMatch.team2)}</span>
            </div>
        </div>
        <div class="match-admin-controls">
            <div class="match-input-group">
                <span class="match-admin-label">СЧЁТ 1</span>
                <input type="number" id="${group}_score1_${safeMatch.id}" class="match-score-input" value="${safeMatch.score1}" min="0" max="1" step="1">
            </div>
            <div class="match-input-group">
                <span class="match-admin-label">СЧЁТ 2</span>
                <input type="number" id="${group}_score2_${safeMatch.id}" class="match-score-input" value="${safeMatch.score2}" min="0" max="1" step="1">
            </div>
            <div class="match-input-group">
                <span class="match-admin-label">ОЧКИ 1</span>
                <input type="number" id="${group}_points1_${safeMatch.id}" class="match-points-input" value="${safeMatch.points1}" min="0" max="100000" step="1">
            </div>
            <div class="match-input-group">
                <span class="match-admin-label">ОЧКИ 2</span>
                <input type="number" id="${group}_points2_${safeMatch.id}" class="match-points-input" value="${safeMatch.points2}" min="0" max="100000" step="1">
            </div>
            <div class="match-input-group">
                <span class="match-admin-label">ДАТА</span>
                <input type="datetime-local" id="${group}_date_${safeMatch.id}" class="match-date-input" value="${safeMatch.date ? formatDateForInput(safeMatch.date) : ''}">
            </div>
            <div class="match-input-group">
                <span class="match-admin-label">LINK</span>
                <input type="text" id="${group}_streamUrl_${safeMatch.id}" class="match-stream-input" placeholder="https://..." value="${escapeHtml(safeMatch.streamUrl)}">
            </div>
            <button class="match-update-btn" data-group="${group}" data-match-id="${safeMatch.id}">✓ СОХРАНИТЬ</button>
        </div>
    `;
    
    return `
        <div class="match-card">
            <div class="match-info">
                <div class="match-datetime">${formatDateDisplay(safeMatch.date)}</div>
                <a href="${streamLink}" target="_blank" class="${liveBtnClass} ${pulseAnimation}">LIVE</a>
            </div>
            ${isAdmin ? adminHtml : viewerHtml}
        </div>
    `;
}

function attachMatchHandlers() {
    document.querySelectorAll('.match-update-btn').forEach(btn => {
        btn.removeEventListener('click', handleMatchUpdate);
        btn.addEventListener('click', handleMatchUpdate);
        
        const group = btn.dataset.group;
        const matchId = parseInt(btn.dataset.matchId);
        if (group && matchId) {
            trackMatchChanges(group, matchId);
        }
    });
    
    if (isAdmin) {
        document.querySelectorAll('.match-stream-input').forEach(input => {
            input.removeEventListener('change', handleStreamUrlChange);
            input.addEventListener('change', handleStreamUrlChange);
        });
        document.querySelectorAll('.match-date-input').forEach(input => {
            input.removeEventListener('change', handleDateChange);
            input.addEventListener('change', handleDateChange);
        });
    }
}

function handleDateChange(e) {
    const idParts = e.target.id.split('_');
    const group = idParts[0];
    const matchId = parseInt(idParts[2]);
    
    if (isNaN(matchId)) return;
    
    const matches = tournamentData.groups[group].matches;
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex !== -1) {
        const newDate = e.target.value;
        if (newDate) {
            const dateObj = new Date(newDate);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                tournamentData.groups[group].matches[matchIndex].date = `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        }
    }
}

function handleStreamUrlChange(e) {
    const idParts = e.target.id.split('_');
    const group = idParts[0];
    const matchId = parseInt(idParts[2]);
    
    if (isNaN(matchId)) return;
    
    const matches = tournamentData.groups[group].matches;
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex !== -1) {
        tournamentData.groups[group].matches[matchIndex].streamUrl = e.target.value;
    }
}

function handleMatchUpdate(e) {
    const group = e.currentTarget.dataset.group;
    const matchId = parseInt(e.currentTarget.dataset.matchId);
    
    if (isNaN(matchId)) {
        console.error('Invalid match ID');
        return;
    }
    
    const matches = tournamentData.groups[group].matches;
    const matchIndex = matches.findIndex(m => m.id === matchId);
    
    if (matchIndex === -1) {
        console.error('Match not found:', matchId);
        return;
    }
    
    const score1Input = document.getElementById(`${group}_score1_${matchId}`);
    const score2Input = document.getElementById(`${group}_score2_${matchId}`);
    const points1Input = document.getElementById(`${group}_points1_${matchId}`);
    const points2Input = document.getElementById(`${group}_points2_${matchId}`);
    const dateInput = document.getElementById(`${group}_date_${matchId}`);
    const streamUrlInput = document.getElementById(`${group}_streamUrl_${matchId}`);
    
    if (!score1Input || !score2Input || !points1Input || !points2Input) {
        console.error('Input fields not found for match:', matchId);
        return;
    }
    
    let score1 = parseInt(score1Input.value) || 0;
    let score2 = parseInt(score2Input.value) || 0;
    const points1 = parseInt(points1Input.value) || 0;
    const points2 = parseInt(points2Input.value) || 0;
    
    score1 = Math.min(score1, 1);
    score2 = Math.min(score2, 1);
    
    // Сохраняем дату
    if (dateInput && dateInput.value) {
        const dateObj = new Date(dateInput.value);
        if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            const hours = String(dateObj.getHours()).padStart(2, '0');
            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
            tournamentData.groups[group].matches[matchIndex].date = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }
    
    // Сохраняем ссылку
    if (streamUrlInput) {
        tournamentData.groups[group].matches[matchIndex].streamUrl = streamUrlInput.value;
    }
    
    tournamentData.groups[group].matches[matchIndex].score1 = score1;
    tournamentData.groups[group].matches[matchIndex].score2 = score2;
    tournamentData.groups[group].matches[matchIndex].points1 = points1;
    tournamentData.groups[group].matches[matchIndex].points2 = points2;
    
    if (score1 > score2) {
        tournamentData.groups[group].matches[matchIndex].winner = tournamentData.groups[group].matches[matchIndex].team1;
    } else if (score2 > score1) {
        tournamentData.groups[group].matches[matchIndex].winner = tournamentData.groups[group].matches[matchIndex].team2;
    } else {
        tournamentData.groups[group].matches[matchIndex].winner = '';
    }
    
    // Сохраняем в Google Sheets
    saveMatchToSheet(group, matchId);
    
    updatePlayoffsBracket();
    renderGroups();
    renderPlayoffs();
    updateGroupStageAnimation();
    playSound('click');
}

// Новая функция для сохранения одного матча в Google Sheets
async function saveMatchToSheet(group, matchId) {
    try {
        const matches = tournamentData.groups[group].matches;
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'tournament',
                data: JSON.stringify({ groups: tournamentData.groups, playoffs: tournamentData.playoffs })
            }).toString()
        });
        
        console.log(`Match ${group}_${matchId} saved to Google Sheets`);
        
        // Убираем подсветку с кнопки (ищем по группе И ID)
        const updateBtn = document.querySelector(`.match-update-btn[data-group="${group}"][data-match-id="${matchId}"]`);
        if (updateBtn) updateBtn.classList.remove('has-changes');
        
    } catch(e) {
        console.error('Save match error:', e);
    }
}

// ==================== ОТРИСОВКА ПЛЕЙ-ОФФ ====================
function renderPlayoffMatchCard(match, matchId, extraClass = '') {
    const safeMatch = {
        team1: match.team1 || 'TBD',
        team2: match.team2 || 'TBD',
        team1Score: match.team1Score !== undefined ? match.team1Score : 0,
        team2Score: match.team2Score !== undefined ? match.team2Score : 0,
        team1Points: match.team1Points !== undefined ? match.team1Points : 0,
        team2Points: match.team2Points !== undefined ? match.team2Points : 0,
        winner: match.winner || '',
        date: match.date || '',
        streamUrl: match.streamUrl || ''
    };
    
    const isWinner1 = safeMatch.winner === safeMatch.team1;
    const isWinner2 = safeMatch.winner === safeMatch.team2;
    const winnerClass1 = isWinner1 ? 'playoff-winner-text' : '';
    const winnerClass2 = isWinner2 ? 'playoff-winner-text' : '';
    
    const isTBDTeam1 = safeMatch.team1 === 'TBD' || safeMatch.team1 === '';
    const isTBDTeam2 = safeMatch.team2 === 'TBD' || safeMatch.team2 === '';
    
    const score1Class = safeMatch.team1Score === 1 ? 'playoff-score-win' : 'playoff-score-loss';
    const score2Class = safeMatch.team2Score === 1 ? 'playoff-score-win' : 'playoff-score-loss';
    
    // Проверяем основную дату, потом временную
    let effectiveDate = safeMatch.date;
    if (!effectiveDate && tempPlayoffDates[matchId]) {
        effectiveDate = tempPlayoffDates[matchId];
    }
    const showDate = effectiveDate && effectiveDate !== '' ? formatDateDisplay(effectiveDate) : 'Дата не назначена';
    
    // Проверяем основную ссылку, потом временную
    let effectiveStreamUrl = safeMatch.streamUrl;
    if (!effectiveStreamUrl && tempPlayoffStreamUrls[matchId]) {
        effectiveStreamUrl = tempPlayoffStreamUrls[matchId];
    }
    const hasStreamUrl = effectiveStreamUrl && effectiveStreamUrl !== '';
    const streamLink = hasStreamUrl ? effectiveStreamUrl : '#';
    
    const liveStatus = getLiveStatus(effectiveDate, safeMatch.winner);
    const isLiveNow = liveStatus.isLive;
    
    let liveBtnClass = '';
    if (!hasStreamUrl) {
        liveBtnClass = 'match-live-btn-finished';
    } else if (isLiveNow) {
        liveBtnClass = 'match-live-btn';
    } else {
        liveBtnClass = 'match-live-btn-dimmed';
    }
    
    const pulseAnimation = (isLiveNow && hasStreamUrl) ? 'live-pulse' : '';
    const vsAnimationClass = isLiveNow ? 'match-vs-live' : '';
    
    // Условный рендер аватара
    const team1AvatarHtml = !isTBDTeam1 ? getAvatarHtml(safeMatch.team1) : '';
    const team2AvatarHtml = !isTBDTeam2 ? getAvatarHtml(safeMatch.team2) : '';
    
    const adminControls = isAdmin ? `
        <div class="playoff-admin-controls">
            <input type="number" id="${matchId}_score1" class="playoff-score-input" value="${safeMatch.team1Score}" min="0" max="1" step="1" placeholder="Счёт 1">
            <span style="color: #ccaa66;">:</span>
            <input type="number" id="${matchId}_score2" class="playoff-score-input" value="${safeMatch.team2Score}" min="0" max="1" step="1" placeholder="Счёт 2">
            <input type="number" id="${matchId}_points1" class="playoff-points-input" value="${safeMatch.team1Points}" min="0" max="100000" step="1" placeholder="Очки 1">
            <span style="color: #ccaa66;">:</span>
            <input type="number" id="${matchId}_points2" class="playoff-points-input" value="${safeMatch.team2Points}" min="0" max="100000" step="1" placeholder="Очки 2">
            <input type="datetime-local" id="${matchId}_date" class="match-date-input" value="${formatDateForInput(effectiveDate)}" style="width: 160px;">
            <input type="text" id="${matchId}_streamUrl" class="match-stream-input" placeholder="LIVE URL" value="${escapeHtml(effectiveStreamUrl)}" style="width: 120px;">
            <button id="update-${matchId}" class="playoff-update-btn">СОХРАНИТЬ</button>
        </div>
    ` : '';
    
    const winnerHtml = (safeMatch.winner && !isTBDTeam1 && !isTBDTeam2) ? 
        `<div class="playoff-winner">ПОБЕДИТЕЛЬ: ${escapeHtml(safeMatch.winner)}</div>` : '';
    
    return `
        <div class="playoff-match-card ${extraClass}">
            <div class="match-header">
                <span class="match-datetime">${showDate}</span>
                <a href="${streamLink}" target="_blank" class="live-btn ${liveBtnClass} ${pulseAnimation}">LIVE</a>
            </div>
            <div class="match-content">
                <div class="playoff-teams-row">
                    <div class="playoff-team playoff-team-left ${winnerClass1}">
                        ${team1AvatarHtml}
                        <span class="playoff-team-name ${isTBDTeam1 ? 'tbd-team' : ''}">${escapeHtml(safeMatch.team1)}</span>
                    </div>
                    <div class="playoff-vs ${vsAnimationClass}">VS</div>
                    <div class="playoff-team playoff-team-right ${winnerClass2}">
                        <span class="playoff-team-name ${isTBDTeam2 ? 'tbd-team' : ''}">${escapeHtml(safeMatch.team2)}</span>
                        ${team2AvatarHtml}
                    </div>
                </div>
                <div class="playoff-scores-row">
                    <span class="playoff-score-left ${score1Class}">${safeMatch.team1Score}</span>
                    <span class="playoff-score-divider">:</span>
                    <span class="playoff-score-right ${score2Class}">${safeMatch.team2Score}</span>
                </div>
                <div class="playoff-points-row">
                    <span class="playoff-points-left">${safeMatch.team1Points.toLocaleString()}</span>
                    <span class="playoff-points-divider">:</span>
                    <span class="playoff-points-right">${safeMatch.team2Points.toLocaleString()}</span>
                </div>
                ${winnerHtml}
                ${adminControls}
            </div>
        </div>
    `;
}

function attachPlayoffHandlers() {
    const matches = ['upperFinal', 'lowerSemi', 'lowerFinal', 'grandFinal'];
    
    matches.forEach(matchId => {
        const updateBtn = document.getElementById(`update-${matchId}`);
        if (updateBtn) {
            updateBtn.removeEventListener('click', () => handlePlayoffUpdate(matchId));
            updateBtn.addEventListener('click', () => handlePlayoffUpdate(matchId));
            
            // Отслеживаем изменения для этого матча
            trackPlayoffChanges(matchId);
        }
    });
}

function handlePlayoffUpdate(matchId) {
    const score1Input = document.getElementById(`${matchId}_score1`);
    const score2Input = document.getElementById(`${matchId}_score2`);
    const points1Input = document.getElementById(`${matchId}_points1`);
    const points2Input = document.getElementById(`${matchId}_points2`);
    const dateInput = document.getElementById(`${matchId}_date`);
    const streamUrlInput = document.getElementById(`${matchId}_streamUrl`);
    
    if (!tournamentData.playoffs[matchId]) {
        tournamentData.playoffs[matchId] = {
            team1: 'TBD',
            team2: 'TBD',
            team1Score: 0,
            team2Score: 0,
            team1Points: 0,
            team2Points: 0,
            winner: '',
            date: '',
            streamUrl: ''
        };
    }
    
    if (score1Input && score2Input) {
        let score1 = parseInt(score1Input.value) || 0;
        let score2 = parseInt(score2Input.value) || 0;
        score1 = Math.min(score1, 1);
        score2 = Math.min(score2, 1);
        tournamentData.playoffs[matchId].team1Score = score1;
        tournamentData.playoffs[matchId].team2Score = score2;
    }
    
    if (points1Input && points2Input) {
        tournamentData.playoffs[matchId].team1Points = parseInt(points1Input.value) || 0;
        tournamentData.playoffs[matchId].team2Points = parseInt(points2Input.value) || 0;
    }
    
    if (dateInput && dateInput.value) {
        tournamentData.playoffs[matchId].date = dateInput.value;
        tempPlayoffDates[matchId] = dateInput.value;
    }
    
    if (streamUrlInput) {
        tournamentData.playoffs[matchId].streamUrl = streamUrlInput.value;
        tempPlayoffStreamUrls[matchId] = streamUrlInput.value;
    }
    
    if (tournamentData.playoffs[matchId].team1 && tournamentData.playoffs[matchId].team1 !== 'TBD' &&
        tournamentData.playoffs[matchId].team1 !== '' &&
        tournamentData.playoffs[matchId].team2 && tournamentData.playoffs[matchId].team2 !== 'TBD' &&
        tournamentData.playoffs[matchId].team2 !== '') {
        
        const score1 = tournamentData.playoffs[matchId].team1Score;
        const score2 = tournamentData.playoffs[matchId].team2Score;
        
        if (score1 > score2) {
            tournamentData.playoffs[matchId].winner = tournamentData.playoffs[matchId].team1;
        } else if (score2 > score1) {
            tournamentData.playoffs[matchId].winner = tournamentData.playoffs[matchId].team2;
        } else {
            tournamentData.playoffs[matchId].winner = '';
        }
    }
    
    // Сохраняем в Google Sheets
    savePlayoffToSheet(matchId);
    
    updatePlayoffsBracket();
    renderPlayoffs();
    updatePlayoffAnimation();
    
    playSound('click');
}

// Новая функция для сохранения одного матча плей-офф
async function savePlayoffToSheet(matchId) {
    try {
        const playoffsToSave = {
            upperFinal: tournamentData.playoffs.upperFinal,
            lowerSemi: tournamentData.playoffs.lowerSemi,
            lowerFinal: tournamentData.playoffs.lowerFinal,
            grandFinal: tournamentData.playoffs.grandFinal
        };
        
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'tournament',
                data: JSON.stringify({ groups: tournamentData.groups, playoffs: playoffsToSave })
            }).toString()
        });
        
        console.log(`Playoff ${matchId} saved to Google Sheets`);
        
        // Убираем подсветку с кнопки
        const updateBtn = document.getElementById(`update-${matchId}`);
        if (updateBtn) updateBtn.classList.remove('has-changes');
        
    } catch(e) {
        console.error('Save playoff error:', e);
    }
}

async function savePlayoffsToSheet() {
    try {
        // Создаём копию данных плей-офф с гарантированными полями
        const playoffsToSave = {
            upperFinal: {
                team1: tournamentData.playoffs.upperFinal?.team1 || 'TBD',
                team2: tournamentData.playoffs.upperFinal?.team2 || 'TBD',
                team1Score: tournamentData.playoffs.upperFinal?.team1Score || 0,
                team2Score: tournamentData.playoffs.upperFinal?.team2Score || 0,
                team1Points: tournamentData.playoffs.upperFinal?.team1Points || 0,
                team2Points: tournamentData.playoffs.upperFinal?.team2Points || 0,
                winner: tournamentData.playoffs.upperFinal?.winner || '',
                date: tournamentData.playoffs.upperFinal?.date || '',
                streamUrl: tournamentData.playoffs.upperFinal?.streamUrl || ''
            },
            lowerSemi: {
                team1: tournamentData.playoffs.lowerSemi?.team1 || 'TBD',
                team2: tournamentData.playoffs.lowerSemi?.team2 || 'TBD',
                team1Score: tournamentData.playoffs.lowerSemi?.team1Score || 0,
                team2Score: tournamentData.playoffs.lowerSemi?.team2Score || 0,
                team1Points: tournamentData.playoffs.lowerSemi?.team1Points || 0,
                team2Points: tournamentData.playoffs.lowerSemi?.team2Points || 0,
                winner: tournamentData.playoffs.lowerSemi?.winner || '',
                date: tournamentData.playoffs.lowerSemi?.date || '',
                streamUrl: tournamentData.playoffs.lowerSemi?.streamUrl || ''
            },
            lowerFinal: {
                team1: tournamentData.playoffs.lowerFinal?.team1 || 'TBD',
                team2: tournamentData.playoffs.lowerFinal?.team2 || 'TBD',
                team1Score: tournamentData.playoffs.lowerFinal?.team1Score || 0,
                team2Score: tournamentData.playoffs.lowerFinal?.team2Score || 0,
                team1Points: tournamentData.playoffs.lowerFinal?.team1Points || 0,
                team2Points: tournamentData.playoffs.lowerFinal?.team2Points || 0,
                winner: tournamentData.playoffs.lowerFinal?.winner || '',
                date: tournamentData.playoffs.lowerFinal?.date || '',
                streamUrl: tournamentData.playoffs.lowerFinal?.streamUrl || ''
            },
            grandFinal: {
                team1: tournamentData.playoffs.grandFinal?.team1 || 'TBD',
                team2: tournamentData.playoffs.grandFinal?.team2 || 'TBD',
                team1Score: tournamentData.playoffs.grandFinal?.team1Score || 0,
                team2Score: tournamentData.playoffs.grandFinal?.team2Score || 0,
                team1Points: tournamentData.playoffs.grandFinal?.team1Points || 0,
                team2Points: tournamentData.playoffs.grandFinal?.team2Points || 0,
                winner: tournamentData.playoffs.grandFinal?.winner || '',
                date: tournamentData.playoffs.grandFinal?.date || '',
                streamUrl: tournamentData.playoffs.grandFinal?.streamUrl || ''
            }
        };
        
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'tournament',
                data: JSON.stringify({ groups: tournamentData.groups, playoffs: playoffsToSave })
            }).toString()
        });
        console.log('Playoffs data saved to Google Sheets');
    } catch(e) {
        console.error('Save playoffs error:', e);
    }
}

function renderPlayoffs() {
    const upperBracketDiv = document.getElementById('upper-bracket-matches');
    const lowerSemiDiv = document.getElementById('lower-semi-match');
    const lowerFinalDiv = document.getElementById('lower-final-match');
    const finalDiv = document.getElementById('final-match');
    
    if (upperBracketDiv) {
        const upperFinal = tournamentData.playoffs.upperFinal;
        upperBracketDiv.innerHTML = renderPlayoffMatchCard(upperFinal, 'upperFinal', 'upper-final');
    }
    
    if (lowerSemiDiv) {
        const lowerSemi = tournamentData.playoffs.lowerSemi;
        // Для полуфинала нижней сетки используем класс 'half-final'
        lowerSemiDiv.innerHTML = renderPlayoffMatchCard(lowerSemi, 'lowerSemi', 'half-final');
    }
    
    if (lowerFinalDiv) {
        const lowerFinal = tournamentData.playoffs.lowerFinal;
        // Для финала нижней сетки используем класс 'lower-final' (зеленый градиент)
        lowerFinalDiv.innerHTML = renderPlayoffMatchCard(lowerFinal, 'lowerFinal', 'lower-final');
    }
    
    if (finalDiv) {
        const grandFinal = tournamentData.playoffs.grandFinal;
        let html = renderPlayoffMatchCard(grandFinal, 'grandFinal', 'grand-final');
        
        if (grandFinal.winner && grandFinal.winner !== '' && grandFinal.winner !== 'TBD') {
            html += `
                <div class="trophy-container">
                    <img src="image/GUP.png" alt="Champion Trophy" class="trophy-image">
                    <div class="winner-name">ЧЕМПИОН: ${escapeHtml(grandFinal.winner)}</div>
                </div>
            `;
        }
        
        finalDiv.innerHTML = html;
    }
    
    if (isAdmin) attachPlayoffHandlers();
    
    updatePlayoffAnimation();
}

// ==================== ЖЕРЕБЬЁВКА ====================
function updateDrawButtons() {
    const btn1 = document.getElementById('draw-group-a1');
    const btn2 = document.getElementById('draw-group-b1');
    const btn3 = document.getElementById('draw-group-a2');
    const btn4 = document.getElementById('draw-group-b2');
    
    if (!isAdmin) {
        const allBtns = [btn1, btn2, btn3, btn4];
        allBtns.forEach(btn => { if (btn) btn.disabled = true; });
        return;
    }
    
    // Проверяем, заполнены ли все 8 команд
    let allTeamsFilled = true;
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`team${i}`);
        if (!input || !input.value.trim()) {
            allTeamsFilled = false;
            break;
        }
    }
    
    // Если команды не заполнены - все кнопки disabled
    if (!allTeamsFilled) {
        const allBtns = [btn1, btn2, btn3, btn4];
        allBtns.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.classList.remove('active', 'completed', 'waiting');
                btn.classList.add('waiting');
            }
        });
        return;
    }
    
    // Устанавливаем состояния в зависимости от шага (только если команды заполнены)
    if (btn1) {
        if (currentDrawStep >= 1) {
            btn1.classList.add('completed');
            btn1.classList.remove('active', 'waiting');
            btn1.disabled = true;
        } else {
            btn1.classList.add('active');
            btn1.classList.remove('completed', 'waiting');
            btn1.disabled = false;
        }
    }
    
    if (btn2) {
        if (currentDrawStep >= 2) {
            btn2.classList.add('completed');
            btn2.classList.remove('active', 'waiting');
            btn2.disabled = true;
        } else if (currentDrawStep >= 1) {
            btn2.classList.add('active');
            btn2.classList.remove('completed', 'waiting');
            btn2.disabled = false;
        } else {
            btn2.classList.add('waiting');
            btn2.classList.remove('active', 'completed');
            btn2.disabled = true;
        }
    }
    
    if (btn3) {
        if (currentDrawStep >= 3) {
            btn3.classList.add('completed');
            btn3.classList.remove('active', 'waiting');
            btn3.disabled = true;
        } else if (currentDrawStep >= 2) {
            btn3.classList.add('active');
            btn3.classList.remove('completed', 'waiting');
            btn3.disabled = false;
        } else {
            btn3.classList.add('waiting');
            btn3.classList.remove('active', 'completed');
            btn3.disabled = true;
        }
    }
    
    if (btn4) {
        if (currentDrawStep >= 4) {
            btn4.classList.add('completed');
            btn4.classList.remove('active', 'waiting');
            btn4.disabled = true;
        } else if (currentDrawStep >= 3) {
            btn4.classList.add('active');
            btn4.classList.remove('completed', 'waiting');
            btn4.disabled = false;
        } else {
            btn4.classList.add('waiting');
            btn4.classList.remove('active', 'completed');
            btn4.disabled = true;
        }
    }
}

function updateDrawStatus() {
    const statusDiv = document.getElementById('draw-status');
    if (!statusDiv) return;
    let html = '<strong>Распределение по группам:</strong>';
    html += `<div class="pair"><span class="pair-number">Группа A:</span> ${groupATeamsList.length ? groupATeamsList.join(', ') : 'пока пусто'}</div>`;
    html += `<div class="pair"><span class="pair-number">Группа B:</span> ${groupBTeamsList.length ? groupBTeamsList.join(', ') : 'пока пусто'}</div>`;
    html += `<p style="margin-top: 0.75rem; color: #ccaa66;">Осталось команд: ${remainingTeamsAll.length}</p>`;
    if (currentDrawStep === 4) html += `<p style="margin-top: 0.75rem; color: #6aaf6a;">Жеребьёвка завершена! Нажмите "Сохранить жеребьёвку".</p>`;
    statusDiv.innerHTML = html;
}

function performDrawToGroup(group, stepNumber) {
    console.log('=== performDrawToGroup ===', group, stepNumber);
    
    if (!isAdmin) { 
        showStatus('Требуется авторизация администратора', 'error'); 
        playSound('error'); 
        return false; 
    }
    
    // Если жеребьёвка уже завершена
    if (currentDrawStep === 4) {
        showStatus('Жеребьёвка уже завершена!', 'error');
        playSound('error');
        return false;
    }
    
    // Проверяем, правильный ли сейчас шаг
    if (stepNumber !== currentDrawStep + 1) {
        showStatus(`Сейчас не ваш ход! Ожидается шаг ${currentDrawStep + 1}`, 'error');
        playSound('error');
        return false;
    }
    
    // *** ПРАВИЛЬНОЕ ОПРЕДЕЛЕНИЕ КНОПКИ ***
    let btnSuffix = '';
    if (stepNumber === 1) btnSuffix = 'a1';
    else if (stepNumber === 2) btnSuffix = 'b1';
    else if (stepNumber === 3) btnSuffix = 'a2';
    else if (stepNumber === 4) btnSuffix = 'b2';
    const btnId = `draw-group-${btnSuffix}`;
    const btn = document.getElementById(btnId);
    console.log('Ищем кнопку:', btnId, 'найдена:', !!btn);
    
    // Первый шаг - инициализация
    if (stepNumber === 1 && remainingTeamsAll.length === 0) {
        console.log('Шаг 1: Инициализация');
        const teams = [];
        for (let i = 1; i <= 8; i++) {
            const input = document.getElementById(`team${i}`);
            const name = input ? input.value.trim() : '';
            if (!name) {
                showStatus(`Команда ${i} не заполнена!`, 'error');
                playSound('error');
                return false;
            }
            teams.push(name);
        }
        remainingTeamsAll = shuffleArray([...teams]);
        groupATeamsList = [];
        groupBTeamsList = [];
        console.log('Команды перемешаны:', remainingTeamsAll);
    }
    
    // Проверяем, есть ли команды для распределения
    if (remainingTeamsAll.length < 2) {
        showStatus('Недостаточно команд для жеребьёвки', 'error');
        playSound('error');
        return false;
    }
    
    // Берём две команды
    const team1 = remainingTeamsAll.shift();
    const team2 = remainingTeamsAll.shift();
    console.log(`Добавляем ${team1} и ${team2} в группу ${group}`);
    
    if (group === 'A') {
        groupATeamsList.push(team1, team2);
    } else {
        groupBTeamsList.push(team1, team2);
    }
    
    // Обновляем текущий шаг
    currentDrawStep = stepNumber;
    console.log(`Шаг ${stepNumber} выполнен. Осталось команд: ${remainingTeamsAll.length}`);
    
    // Отмечаем кнопку как выполненную
    if (btn) {
        btn.classList.remove('active', 'waiting');
        btn.classList.add('completed');
        btn.disabled = true;
    }
    
    // Активируем следующую кнопку
    let nextBtnId = null;
    if (stepNumber === 1) nextBtnId = 'draw-group-b1';
    else if (stepNumber === 2) nextBtnId = 'draw-group-a2';
    else if (stepNumber === 3) nextBtnId = 'draw-group-b2';
    
    if (nextBtnId) {
        const nextBtn = document.getElementById(nextBtnId);
        if (nextBtn) {
            nextBtn.classList.remove('waiting');
            nextBtn.classList.add('active');
            nextBtn.disabled = false;
            console.log(`Активирована кнопка: ${nextBtnId}`);
        }
    }
    
    // Обновляем интерфейс
    updateTeamsInputStatus();
    updateDrawStatus();
    updateDrawButtons();
    
    // Проверяем завершение
    if (groupATeamsList.length === 4 && groupBTeamsList.length === 4) {
        console.log('Жеребьёвка завершена!');
        tournamentData.groups.A.teams = [...groupATeamsList];
        tournamentData.groups.B.teams = [...groupBTeamsList];
        initGroupMatches();
        updatePlayoffsBracket();
        renderGroups();
        renderPlayoffs();
        currentDrawStep = 4;
        
        const saveDrawBtn = document.getElementById('save-draw');
        if (saveDrawBtn) {
            saveDrawBtn.style.display = 'inline-block';
            saveDrawBtn.classList.add('draw-save-ready');
        }
        
        showStatus('Жеребьёвка завершена!', 'success');
        playSound('success');
    } else {
        showStatus(`Команды добавлены в группу ${group}`, 'success');
        playSound('success');
    }
    
    return true;
}

async function saveDrawToSheet() {
    if (!isAdmin) { showStatus('Требуется авторизация администратора', 'error'); playSound('error'); return; }
    if (currentDrawStep !== 4) { showStatus('Жеребьёвка не завершена!', 'error'); playSound('error'); return; }
    
    showStatus('Сохранение жеребьёвки...', 'success');
    
    try {
        const response1 = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'drawStatus',
                data: JSON.stringify({ drawCompleted: true })
            }).toString()
        });
        const result1 = await response1.json();
        console.log('Draw status saved:', result1);
        
        const response2 = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'tournament',
                data: JSON.stringify({ groups: tournamentData.groups, playoffs: tournamentData.playoffs })
            }).toString()
        });
        const result2 = await response2.json();
        console.log('Tournament saved:', result2);
        
        if (result1.success && result2.success) {
            playSound('success');
            showStatus('Жеребьёвка сохранена!', 'success');
            const drawSection = document.querySelector('.draw-section');
            if (drawSection) drawSection.classList.add('hidden');
            updateGroupStageAnimation();
        } else {
            showStatus('Ошибка сохранения', 'error');
            playSound('error');
        }
    } catch(e) {
        console.error('saveDrawToSheet error:', e);
        playSound('error');
        showStatus('Ошибка сохранения: ' + e.message, 'error');
    }
}

function clearAllTeams() {
    if (!isAdmin) { showStatus('Требуется авторизация администратора', 'error'); playSound('error'); return; }
    if (confirm('Очистить все названия команд?')) {
        playSound('click');
        
        // Очищаем поля ввода
        for (let i = 1; i <= 8; i++) { 
            const input = document.getElementById(`team${i}`); 
            if (input) {
                input.value = '';
                input.classList.remove('used');
                input.disabled = false;
            }
        }
        
        // Сбрасываем состояние жеребьёвки
        remainingTeamsAll = [];
        groupATeamsList = [];
        groupBTeamsList = [];
        currentDrawStep = 0;
        tournamentData.groups.A.teams = [];
        tournamentData.groups.B.teams = [];
        tournamentData.groups.A.matches = [];
        tournamentData.groups.B.matches = [];
        tournamentData.playoffs = {
            upperFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
            lowerSemi: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
            lowerFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
            grandFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' }
        };
        
        // Сбрасываем классы кнопок жеребьёвки
        const allBtns = ['draw-group-a1', 'draw-group-b1', 'draw-group-a2', 'draw-group-b2'];
        allBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.remove('completed', 'active', 'waiting');
                btn.classList.add('waiting');
                btn.disabled = true;
            }
        });
        
        // Прячем кнопку сохранения
        const saveDrawBtn = document.getElementById('save-draw');
        if (saveDrawBtn) {
            saveDrawBtn.style.display = 'none';
            saveDrawBtn.classList.remove('draw-save-ready');
        }
        
        updateDrawStatus();
        renderGroups();
        renderPlayoffs();
        
        showStatus('Все названия команд очищены', 'success');
    }
}

// Функция для проверки заполнения команд и обновления кнопок
function checkTeamsAndUpdateButtons() {
    if (!isAdmin) return;
    
    let allTeamsFilled = true;
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`team${i}`);
        if (!input || !input.value.trim()) {
            allTeamsFilled = false;
            break;
        }
    }
    
    // Если все команды заполнены и жеребьёвка ещё не начата, активируем первую кнопку
    if (allTeamsFilled && currentDrawStep === 0 && remainingTeamsAll.length === 0) {
        const btn1 = document.getElementById('draw-group-a1');
        if (btn1) {
            btn1.disabled = false;
            btn1.classList.remove('waiting', 'completed');
            btn1.classList.add('active');
        }
    } else if (!allTeamsFilled) {
        // Если не все команды заполнены - все кнопки disabled
        const allBtns = ['draw-group-a1', 'draw-group-b1', 'draw-group-a2', 'draw-group-b2'];
        allBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = true;
                btn.classList.remove('active', 'completed');
                btn.classList.add('waiting');
            }
        });
    }
    
    updateDrawButtons();
}

// Функция для обновления состояния полей ввода команд
function updateTeamsInputStatus() {
    // Собираем все распределённые команды
    const distributedTeams = [...groupATeamsList, ...groupBTeamsList];
    
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`team${i}`);
        if (!input) continue;
        
        const teamName = input.value.trim();
        
        // Если команда уже распределена - делаем поле недоступным и добавляем класс
        if (teamName && distributedTeams.includes(teamName)) {
            input.classList.add('used');
            input.disabled = true;
        } else {
            input.classList.remove('used');
            input.disabled = false;
        }
    }
}

function resetDraw() {
    if (!isAdmin) { showStatus('Требуется авторизация администратора', 'error'); playSound('error'); return; }
    if (confirm('Сброс жеребьёвки очистит все распределение команд по группам. Продолжить?')) {
        playSound('click');
        
        remainingTeamsAll = [];
        groupATeamsList = [];
        groupBTeamsList = [];
        currentDrawStep = 0;
        tournamentData.groups.A.teams = [];
        tournamentData.groups.B.teams = [];
        tournamentData.groups.A.matches = [];
        tournamentData.groups.B.matches = [];
        tournamentData.playoffs = {
            upperFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
            lowerSemi: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
            lowerFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
            grandFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' }
        };
        
        // Очищаем статус жеребьёвки в Google Sheets
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'drawStatus',
                data: JSON.stringify({ drawCompleted: false })
            }).toString()
        }).catch(e => console.log('Reset draw status error:', e));
        
        // Очищаем турнирные данные в Google Sheets
        fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'tournament',
                data: JSON.stringify({ groups: { A: { teams: [], matches: [] }, B: { teams: [], matches: [] } }, playoffs: tournamentData.playoffs })
            }).toString()
        }).catch(e => console.log('Reset tournament error:', e));
        
        // Сбрасываем классы всех кнопок жеребьёвки
        const allBtns = ['draw-group-a1', 'draw-group-b1', 'draw-group-a2', 'draw-group-b2'];
        allBtns.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.classList.remove('completed', 'active', 'waiting');
                btn.classList.add('waiting');
                btn.disabled = true;
            }
        });
        
        // Первая кнопка становится активной
        const firstBtn = document.getElementById('draw-group-a1');
        if (firstBtn) {
            firstBtn.classList.remove('waiting');
            firstBtn.classList.add('active');
            firstBtn.disabled = false;
        }
        
        // Прячем и сбрасываем кнопку сохранения
        const saveDrawBtn = document.getElementById('save-draw');
        if (saveDrawBtn) {
            saveDrawBtn.style.display = 'none';
            saveDrawBtn.classList.remove('draw-save-ready');
        }
        
        // Сбрасываем стили полей ввода команд
        for (let i = 1; i <= 8; i++) {
            const input = document.getElementById(`team${i}`);
            if (input) {
                input.classList.remove('used');
                input.disabled = false;
            }
        }
        
        updateDrawButtons();
        updateDrawStatus();
        renderGroups();
        renderPlayoffs();
        
        // Показываем блок жеребьёвки
        const drawSection = document.querySelector('.draw-section');
        if (drawSection) drawSection.classList.remove('hidden');
        
        showStatus('Жеребьёвка сброшена.', 'success');
    }
}

// ==================== ПОЛНЫЙ СБРОС ТУРНИРА ====================
async function fullResetTournament() {
    if (!isAdmin) { showStatus('Требуется авторизация администратора', 'error'); playSound('error'); return; }
    if (confirm('ПОЛНЫЙ СБРОС ТУРНИРА\n\nЭто действие:\n- Удалит все названия команд\n- Обнулит все счета и очки\n- Очистит победителей\n- Сбросит расписание\n- Очистит аватары команд\n- Покажет блок жеребьёвки\n\nПродолжить?')) {
        showStatus('Полный сброс турнира...', 'success');
        
        tournamentData = {
            groups: { A: { teams: [], matches: [] }, B: { teams: [], matches: [] } },
            playoffs: {
                upperFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
                lowerSemi: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
                lowerFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' },
                grandFinal: { team1: '', team2: '', team1Score: 0, team2Score: 0, team1Points: 0, team2Points: 0, winner: '', date: '', streamUrl: '' }
            }
        };
        
        remainingTeamsAll = [];
        groupATeamsList = [];
        groupBTeamsList = [];
        currentDrawStep = 0;
        
        for (let i = 1; i <= 8; i++) { 
            const input = document.getElementById(`team${i}`); 
            if (input) input.value = '';
            const avatarInput = document.getElementById(`team${i}_avatar`);
            if (avatarInput) avatarInput.value = '';
        }
        
        // Очищаем глобальный объект аватаров
        window.teamAvatars = {};
        
        scheduleData = {
            periodStart: null, periodEnd: null,
            qfStart: null, qfEnd: null,
            sfStart: null, sfEnd: null,
            final: null,
            prizePool: ''
        };
        
        prizeData = {
            1: '', 2: '', 3: '', 4: '', 5: '', 6: '', 7: '', 8: ''
        };
        
        const periodStartEl = document.getElementById('tournament-period-start');
        const periodEndEl = document.getElementById('tournament-period-end');
        const qfStartEl = document.getElementById('qf-period-start');
        const qfEndEl = document.getElementById('qf-period-end');
        const sfStartEl = document.getElementById('sf-period-start');
        const sfEndEl = document.getElementById('sf-period-end');
        const finalEl = document.getElementById('final-datetime');
        const prizeEl = document.getElementById('prize-pool');
        
        if (periodStartEl) periodStartEl.textContent = '—';
        if (periodEndEl) periodEndEl.textContent = '—';
        if (qfStartEl) qfStartEl.textContent = '—';
        if (qfEndEl) qfEndEl.textContent = '—';
        if (sfStartEl) sfStartEl.textContent = '—';
        if (sfEndEl) sfEndEl.textContent = '—';
        if (finalEl) finalEl.textContent = '—';
        if (prizeEl) prizeEl.textContent = '—';
        
        for (let i = 1; i <= 8; i++) {
            const prizeInput = document.getElementById(`prize-${i}`);
            if (prizeInput) prizeInput.value = '';
        }
        
        for (let i = 1; i <= 8; i++) {
            const input = document.getElementById(`team${i}`);
            if (input) {
                input.classList.remove('used');
                input.disabled = false;
            }
        }
        
        const drawSection = document.querySelector('.draw-section');
        if (drawSection) drawSection.classList.remove('hidden');
        
        const saveDrawBtn = document.getElementById('save-draw');
        if (saveDrawBtn) saveDrawBtn.style.display = 'none';
        
        // Сброс статуса жеребьёвки
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'drawStatus',
                data: JSON.stringify({ drawCompleted: false })
            }).toString()
        }).catch(e => console.log('Reset draw status error:', e));
        
        // Сброс турнирных данных
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'tournament',
                data: JSON.stringify({ groups: { A: { teams: [], matches: [] }, B: { teams: [], matches: [] } }, playoffs: tournamentData.playoffs })
            }).toString()
        }).catch(e => console.log('Reset tournament error:', e));
        
        // Сброс расписания
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'schedule',
                data: JSON.stringify({ period: { start: '', end: '' }, qf: { start: '', end: '' }, sf: { start: '', end: '' }, final: '', prizePool: '' })
            }).toString()
        }).catch(e => console.log('Reset schedule error:', e));
        
        // Сброс призов
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'prizes',
                data: JSON.stringify(prizeData)
            }).toString()
        }).catch(e => console.log('Reset prizes error:', e));
        
        // ========== ДОБАВЛЕН СБРОС АВАТАРОВ ==========
        // Очищаем таблицу аватаров в Google Sheets
        const emptyAvatarsData = {};
        for (let i = 1; i <= 8; i++) {
            emptyAvatarsData[i] = { name: '', avatar: '' };
        }
        
        await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'saveAvatars',
                data: JSON.stringify(emptyAvatarsData)
            }).toString()
        }).catch(e => console.log('Reset avatars error:', e));
        
        renderGroups();
        renderPlayoffs();
        updateDrawButtons();
        updateDrawStatus();
        checkPastDates();
        
        playSound('success');
        showStatus('Полный сброс выполнен!', 'success');
    }
}

// ==================== АДМИН-ПАНЕЛЬ ====================
function initAdmin() {
    const unlockBtn = document.getElementById('unlock-admin');
    const passInput = document.getElementById('admin-pass');
    const saveBtn = document.getElementById('save-changes');
    const fullResetBtn = document.getElementById('full-reset-btn');
    const body = document.body;
    
    if (!unlockBtn || !passInput) return;
    
    unlockBtn.addEventListener('click', async () => {
        const enteredPass = passInput.value;
        
        if (!enteredPass) {
            showStatus('Введите пароль', 'error');
            playSound('error');
            return;
        }
        
        try {
            showStatus('Проверка пароля...', 'success');
            
            const response = await fetch(`${SCRIPT_URL}?action=checkPassword&pass=${encodeURIComponent(enteredPass)}`);
            const data = await response.json();
            
            if (data.success) {
                playSound('success');
                isAdmin = true;
                body.classList.remove('viewer-mode');
                body.classList.add('admin-mode');
                const adminControls = document.getElementById('admin-controls');
                const editScheduleBtn = document.getElementById('edit-schedule-btn');
                if (adminControls) adminControls.style.display = 'block';
                if (editScheduleBtn) editScheduleBtn.style.display = 'inline-block';
                updateDrawButtons();
                checkTeamsAndUpdateButtons();
                
                if (!document.getElementById('reset-draw-btn')) {
                    const resetDrawBtn = document.createElement('button');
                    resetDrawBtn.id = 'reset-draw-btn';
                    resetDrawBtn.className = 'btn-secondary';
                    resetDrawBtn.style.marginTop = '10px';
                    resetDrawBtn.style.width = '100%';
                    resetDrawBtn.textContent = 'Сбросить жеребьёвку';
                    resetDrawBtn.addEventListener('click', resetDraw);
                    const adminControlsDiv = document.getElementById('admin-controls');
                    if (adminControlsDiv) adminControlsDiv.appendChild(resetDrawBtn);
                }

                // Кнопка сохранения аватаров
                if (!document.getElementById('save-avatars')) {
                    const saveAvatarsBtn = document.createElement('button');
                    saveAvatarsBtn.id = 'save-avatars';
                    saveAvatarsBtn.className = 'btn-primary';
                    saveAvatarsBtn.style.marginTop = '10px';
                    saveAvatarsBtn.style.width = '100%';
                    saveAvatarsBtn.textContent = 'Сохранить аватары';
                    saveAvatarsBtn.addEventListener('click', saveAvatarsToSheet);
                    const adminControlsDiv = document.getElementById('admin-controls');
                    if (adminControlsDiv) adminControlsDiv.appendChild(saveAvatarsBtn);
                }
                
                showStatus('Доступ администратора активирован', 'success');
                passInput.value = '';
                renderGroups();
                renderPlayoffs();
            } else {
                playSound('error');
                showStatus('Неверный пароль', 'error');
                passInput.value = '';
            }
        } catch (err) {
            console.error('Password check error:', err);
            playSound('error');
            showStatus('Ошибка проверки пароля: ' + err.message, 'error');
            passInput.value = '';
        }
    });
    
    if (fullResetBtn) fullResetBtn.addEventListener('click', fullResetTournament);
    
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            console.log('Save button clicked, isAdmin:', isAdmin);
            
            if (!isAdmin) { 
                showStatus('Требуется авторизация администратора. Нажмите Ctrl+Shift+A и введите пароль 1756', 'error'); 
                playSound('error'); 
                return; 
            }
            
            showStatus('Сохранение...', 'success');
            
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        action: 'tournament',
                        data: JSON.stringify({ groups: tournamentData.groups, playoffs: tournamentData.playoffs })
                    }).toString()
                });
                
                const result = await response.json();
                console.log('Save result:', result);
                
                if (result.success) {
                    playSound('success');
                    showStatus('Сохранено!', 'success');
                } else {
                    showStatus('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
                    playSound('error');
                }
            } catch(e) {
                console.error('Save error:', e);
                playSound('error');
                showStatus('Ошибка сохранения: ' + e.message, 'error');
            }
        });
    }
    
    const editScheduleBtn = document.getElementById('edit-schedule-btn');
    if (editScheduleBtn) {
        editScheduleBtn.addEventListener('click', () => {
            if (!isAdmin) {
                showStatus('Сначала авторизуйтесь как администратор (Ctrl+Shift+A)', 'error');
                playSound('error');
                return;
            }
            const editor = document.getElementById('schedule-editor');
            if (editor) {
                fillScheduleEditor();
                editor.style.display = editor.style.display === 'none' ? 'block' : 'none';
                // ✅ Если редактор открыт, активируем отслеживание изменений
                if (editor.style.display === 'block') {
                    initScheduleTracking();
                }
            }
        });
    }
    
    const saveScheduleBtn = document.getElementById('save-schedule');
    if (saveScheduleBtn) {
        saveScheduleBtn.addEventListener('click', async () => {
            console.log('Save schedule button clicked, isAdmin:', isAdmin);
            
            if (!isAdmin) { 
                showStatus('Требуется авторизация администратора. Нажмите Ctrl+Shift+A и введите пароль 1756', 'error'); 
                playSound('error'); 
                return; 
            }
            
            const periodStart = document.getElementById('edit-period-start')?.value || '';
            const periodEnd = document.getElementById('edit-period-end')?.value || '';
            const qfStart = document.getElementById('edit-qf-start')?.value || '';
            const qfEnd = document.getElementById('edit-qf-end')?.value || '';
            const sfStart = document.getElementById('edit-sf-start')?.value || '';
            const sfEnd = document.getElementById('edit-sf-end')?.value || '';
            const final = document.getElementById('edit-final')?.value || '';
            const prizePoolValue = document.getElementById('edit-prize-pool')?.value || '';
            
            const scheduleDataToSave = { 
                period: { start: periodStart, end: periodEnd }, 
                qf: { start: qfStart, end: qfEnd }, 
                sf: { start: sfStart, end: sfEnd }, 
                final: final, 
                prizePool: prizePoolValue 
            };
            
            console.log('Schedule data to save:', scheduleDataToSave);
            showStatus('Сохранение расписания...', 'success');
            
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        action: 'schedule',
                        data: JSON.stringify(scheduleDataToSave)
                    }).toString()
                });
                
                const result = await response.json();
                console.log('Schedule save result:', result);
                
                if (result.success) {
                    playSound('success');
                    showStatus('Расписание сохранено!', 'success');
                    
                    scheduleData.qfStart = qfStart;
                    scheduleData.qfEnd = qfEnd;
                    scheduleData.sfStart = sfStart;
                    scheduleData.sfEnd = sfEnd;
                    scheduleData.final = final;
                    scheduleData.prizePool = prizePoolValue;
                    scheduleData.periodStart = periodStart;
                    scheduleData.periodEnd = periodEnd;
                    
                    document.getElementById('qf-period-start').textContent = formatDateOnly(qfStart);
                    document.getElementById('qf-period-end').textContent = formatDateOnly(qfEnd);
                    document.getElementById('sf-period-start').textContent = formatDateOnly(sfStart);
                    document.getElementById('sf-period-end').textContent = formatDateOnly(sfEnd);
                    document.getElementById('final-datetime').textContent = formatDateTimeFull(final);
                    document.getElementById('tournament-period-start').textContent = formatDateOnly(periodStart);
                    document.getElementById('tournament-period-end').textContent = formatDateOnly(periodEnd);
                    document.getElementById('prize-pool').textContent = prizePoolValue || '—';
                    
                    startCountdownTimer();
                    checkPastDates();
                    updateGroupStageAnimation();

                    // ✅ СБРАСЫВАЕМ ПОДСВЕТКУ КНОПКИ РАСПИСАНИЯ
                    saveOriginalSchedule();
                    updateScheduleButtonColor();
                    
                    const editor = document.getElementById('schedule-editor');
                    if (editor) editor.style.display = 'none';
                } else {
                    showStatus('Ошибка: ' + (result.error || 'Неизвестная ошибка'), 'error');
                    playSound('error');
                }
            } catch(e) {
                console.error('Schedule save error:', e);
                showStatus('Ошибка сохранения: ' + e.message, 'error');
                playSound('error');
            }
        });
    }
    
    const savePrizesBtn = document.getElementById('save-prizes');
    if (savePrizesBtn) {
        savePrizesBtn.addEventListener('click', savePrizes);
    }
    
    const exitBtn = document.getElementById('admin-exit-btn');
    if (exitBtn) {
        exitBtn.removeEventListener('click', exitAdminMode);
        exitBtn.addEventListener('click', exitAdminMode);
    }
}

// ==================== ЗАПУСК ====================
async function start() {
    console.log('Call of Dragons Tournament Loaded');
    addSoundToggle();
    await loadSchedule();
    await loadTournamentData();
    await loadDrawStatus();
    await loadPrizes();
    
    updateDrawSectionVisibility();
    
    renderGroups();
    updateGroupStageAnimation();
    renderPlayoffs();
    renderResults();
    updatePlayoffAnimation();
    
    const btnA1 = document.getElementById('draw-group-a1');
    const btnB1 = document.getElementById('draw-group-b1');
    const btnA2 = document.getElementById('draw-group-a2');
    const btnB2 = document.getElementById('draw-group-b2');
    if (btnA1) btnA1.addEventListener('click', () => performDrawToGroup('A', 1));
    if (btnB1) btnB1.addEventListener('click', () => performDrawToGroup('B', 2));
    if (btnA2) btnA2.addEventListener('click', () => performDrawToGroup('A', 3));
    if (btnB2) btnB2.addEventListener('click', () => performDrawToGroup('B', 4));
    
    const saveDrawBtn = document.getElementById('save-draw');
    if (saveDrawBtn) saveDrawBtn.addEventListener('click', saveDrawToSheet);
    
    const clearTeamsBtn = document.getElementById('clear-teams');
    if (clearTeamsBtn) clearTeamsBtn.addEventListener('click', clearAllTeams);
    
    const forceRefreshBtn = document.getElementById('force-refresh');
    if (forceRefreshBtn) forceRefreshBtn.addEventListener('click', () => location.reload());
    
    // Добавляем слушатели на поля ввода команд для обновления состояния кнопок
    for (let i = 1; i <= 8; i++) {
        const input = document.getElementById(`team${i}`);
        if (input) {
            input.addEventListener('input', checkTeamsAndUpdateButtons);
            input.addEventListener('change', checkTeamsAndUpdateButtons);
        }
    }
    
    initAdmin();
    initScheduleTracking();
    initPrizesTracking();
    updateDrawButtons();
    updateDrawStatus();
    startCountdownTimer();

    
    // Показываем карточки после полной загрузки всех ресурсов (аватаров)
    window.addEventListener('load', () => {
        console.log('✅ Страница полностью загружена, карточки показаны');
    });
    
    document.body.addEventListener('click', () => { if (audioContext?.state === 'suspended') audioContext.resume(); }, { once: true });
}

function showAdminBlock() {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        const notification = document.createElement('div');
        notification.className = 'admin-notification';
        notification.innerHTML = '🔓 Админ-панель разблокирована. Введите пароль.';
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) notification.remove();
        }, 3000);
        adminPanel.scrollIntoView({ behavior: 'smooth' });
    }
}

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') {
        e.preventDefault();
        showAdminBlock();
    }
});

function exitAdminMode() {
    if (!isAdmin) return;
    performExitActions();
}

function performExitActions() {
    playSound('click');
    
    isAdmin = false;
    
    const body = document.body;
    body.classList.remove('admin-mode');
    body.classList.add('viewer-mode');
    
    const editScheduleBtn = document.getElementById('edit-schedule-btn');
    if (editScheduleBtn) editScheduleBtn.style.display = 'none';
    
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) adminPanel.style.display = 'none';
    
    const adminControls = document.getElementById('admin-controls');
    if (adminControls) adminControls.style.display = 'none';
    
    renderGroups();
    renderPlayoffs();
    
    updateDrawButtons();
    
    showStatus('Выход из режима администратора', 'success');
}

function updateUTCTime() {
    const utcElement = document.getElementById('utc-time');
    const utcHeaderElement = document.getElementById('utc-time-header');
    
    const now = new Date();
    const day = String(now.getUTCDate()).padStart(2, '0');
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const year = now.getUTCFullYear();
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    
    const timeString = `UTC: ${day}.${month}.${year} ${hours}:${minutes}`;
    
    if (utcElement) utcElement.innerHTML = timeString;
    if (utcHeaderElement) utcHeaderElement.innerHTML = timeString;
}

setInterval(updateUTCTime, 10000);
updateUTCTime();

window.addEventListener('DOMContentLoaded', start);
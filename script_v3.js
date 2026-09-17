// ==============================================
// 1. CẤU HÌNH DAY.JS & PLUGINS
// ==============================================
dayjs.extend(window.dayjs_plugin_utc);
dayjs.extend(window.dayjs_plugin_timezone);

// ==============================================
// 2. THEME SWITCHER (DARK MODE / LIGHT MODE)
// ==============================================
function initTheme() {
    const savedTheme = localStorage.getItem('timeSync_theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(theme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('timeSync_theme', theme);
    const icon = theme === 'dark' ? '☀️' : '🌙';
    document.querySelectorAll('.theme-toggle-btn .theme-icon').forEach(el => el.textContent = icon);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
}

const btnThemeLogin = document.getElementById('theme-toggle-login');
if (btnThemeLogin) btnThemeLogin.addEventListener('click', toggleTheme);
const btnThemeHeader = document.getElementById('theme-toggle-header');
if (btnThemeHeader) btnThemeHeader.addEventListener('click', toggleTheme);

initTheme();

// ==============================================
// 3. NON-BLOCKING UI: TOAST & ASYNC CONFIRM MODAL
// ==============================================
const Toast = {
    show(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconSvg = '';
        if (type === 'success') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        } else if (type === 'error') {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        } else {
            iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        }
        
        toast.innerHTML = `<span class="toast-icon">${iconSvg}</span><span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

function customConfirm(message, title = 'Xác nhận') {
    return new Promise((resolve) => {
        const modal = document.getElementById('custom-confirm-modal');
        const titleEl = document.getElementById('custom-confirm-title');
        const msgEl = document.getElementById('custom-confirm-message');
        const btnOk = document.getElementById('custom-confirm-ok');
        const btnCancel = document.getElementById('custom-confirm-cancel');
        
        if (!modal) return resolve(confirm(message));
        
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        modal.style.display = 'flex';
        
        function cleanup(result) {
            modal.style.display = 'none';
            btnOk.removeEventListener('click', onOk);
            btnCancel.removeEventListener('click', onCancel);
            window.removeEventListener('keydown', onKey);
            modal.removeEventListener('click', onBackdrop);
            resolve(result);
        }
        function onOk(e) { e.stopPropagation(); cleanup(true); }
        function onCancel(e) { e.stopPropagation(); cleanup(false); }
        function onKey(e) {
            if (e.key === 'Escape') cleanup(false);
            if (e.key === 'Enter') cleanup(true);
        }
        function onBackdrop(e) {
            if (e.target === modal) cleanup(false);
        }
        
        btnOk.addEventListener('click', onOk);
        btnCancel.addEventListener('click', onCancel);
        window.addEventListener('keydown', onKey);
        modal.addEventListener('click', onBackdrop);
    });
}

// ==============================================
// 4. BIẾN TRẠNG THÁI NGƯỜI DÙNG & ĐIỀU HƯỚNG
// ==============================================
let currentUser = null;
let clockInterval = null;

const timezones = {
    'vn': 'Asia/Ho_Chi_Minh',
    'de': 'Europe/Berlin',
    'ma': 'America/New_York',
    'nv': 'America/Los_Angeles'
};

const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const userBtns = document.querySelectorAll('.user-btn');
const currentUserDisplay = document.getElementById('current-user-display');
const logoutBtn = document.getElementById('logout-btn');

userBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const tz = btn.dataset.tz;
        
        currentUser = { name, tz };
        localStorage.setItem('timeSyncUser', JSON.stringify(currentUser));
        showApp();
    });
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('timeSyncUser');
    currentUser = null;
    showLogin();
});

function showLogin() {
    loginScreen.classList.add('active');
    appScreen.classList.remove('active');
    if (clockInterval) clearInterval(clockInterval);
}

function showApp() {
    loginScreen.classList.remove('active');
    appScreen.classList.add('active');
    currentUserDisplay.textContent = `Xin chào, ${currentUser.name}`;
    
    const userTzDisplay = document.getElementById('user-tz-display');
    if (userTzDisplay) {
        let regionName = "Việt Nam";
        if(currentUser.tz === 'Europe/Berlin') regionName = "Bayern, Đức";
        if(currentUser.tz === 'America/New_York') regionName = "Massachusetts, Mỹ";
        if(currentUser.tz === 'America/Los_Angeles') regionName = "Nevada, Mỹ";
        userTzDisplay.textContent = `${currentUser.tz} (${regionName})`;
    }
    
    startClocks();
    initConverter();
    
    if(document.getElementById('planning').classList.contains('active')){
        loadScheduleBoard();
    }
    if(document.getElementById('gallery') && document.getElementById('gallery').classList.contains('active')){
        applyGalleryFilters(false);
    }
}

// ==============================================
// 5. KHỞI TẠO FLATPICKR GLOBALLY
// ==============================================
window.isUpdatingConverter = false;
try {
    flatpickr("#plan-start", { disableMobile: true, enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, altInput: true, altInputClass: 'flatpickr-input altInput', altFormat: "d/m/Y H:i" });
    flatpickr("#plan-end", { disableMobile: true, enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, altInput: true, altInputClass: 'flatpickr-input altInput', altFormat: "d/m/Y H:i" });
    
    flatpickr(".converter-fp", {
        disableMobile: true,
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        time_24hr: true,
        altInput: true,
        altInputClass: 'flatpickr-input altInput',
        altFormat: "d/m/Y H:i",
        onChange: function(selectedDates, dateStr, instance) {
            if (window.isUpdatingConverter || selectedDates.length === 0) return;
            window.isUpdatingConverter = true;
            
            try {
                const triggerRow = instance.element.closest('.converter-row');
                const sourceTz = triggerRow.dataset.tz;
                
                const chosenDate = selectedDates[0];
                const year = chosenDate.getFullYear();
                const month = chosenDate.getMonth() + 1;
                const day = chosenDate.getDate();
                const hours = chosenDate.getHours();
                const minutes = chosenDate.getMinutes();
                
                const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
                const sourceDayjs = dayjs.tz(isoString, sourceTz);
                
                document.querySelectorAll('.converter-row').forEach(row => {
                    if (row === triggerRow) return;
                    
                    const targetTz = row.dataset.tz;
                    const targetDayjs = sourceDayjs.tz(targetTz);
                    const targetInput = row.querySelector('.converter-fp');
                    
                    if (targetInput && targetInput._flatpickr) {
                        const fakeDate = new Date(
                            parseInt(targetDayjs.format("YYYY"), 10),
                            parseInt(targetDayjs.format("MM"), 10) - 1,
                            parseInt(targetDayjs.format("DD"), 10),
                            parseInt(targetDayjs.format("HH"), 10),
                            parseInt(targetDayjs.format("mm"), 10)
                        );
                        targetInput._flatpickr.setDate(fakeDate, false);
                    }
                });
            } catch(e) {
                console.error("Lỗi quy đổi giờ:", e);
                Toast.show("Lỗi quy đổi giờ: " + e.message, "error");
            } finally {
                window.isUpdatingConverter = false;
            }
        }
    });
} catch(e) {
    console.error("Lỗi khởi tạo Flatpickr:", e);
}

const savedUser = localStorage.getItem('timeSyncUser');
if (savedUser) {
    try {
        currentUser = JSON.parse(savedUser);
        showApp();
    } catch(e) {
        console.error("Lỗi parse user", e);
    }
}

const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const targetId = btn.dataset.target;
        document.getElementById(targetId).classList.add('active');
        
        if(targetId === 'planning'){
            loadScheduleBoard();
        } else if (targetId === 'gallery') {
            if (typeof loadGallery === 'function') loadGallery();
        }
        if (typeof updateBackToTopVisibility === 'function') {
            updateBackToTopVisibility();
        }
    });
});

function startClocks() {
    updateClocks();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(updateClocks, 1000);
}

function updateClocks() {
    const now = dayjs();
    for (const [key, tz] of Object.entries(timezones)) {
        const timeAtTz = now.tz(tz);
        const card = document.getElementById(`clock-${key}`);
        if (card) {
            card.querySelector('.time').textContent = timeAtTz.format('HH:mm:ss');
            card.querySelector('.date').textContent = timeAtTz.format('DD/MM/YYYY');
        }
    }
}

function initConverter() {
    window.isUpdatingConverter = true;
    const now = dayjs();
    
    document.querySelectorAll('.converter-row').forEach(row => {
        const tz = row.dataset.tz;
        const input = row.querySelector('.converter-fp');
        
        if (input && input._flatpickr) {
            try {
                const targetDayjs = now.tz(tz);
                const fakeDate = new Date(
                    parseInt(targetDayjs.format("YYYY"), 10),
                    parseInt(targetDayjs.format("MM"), 10) - 1,
                    parseInt(targetDayjs.format("DD"), 10),
                    parseInt(targetDayjs.format("HH"), 10),
                    parseInt(targetDayjs.format("mm"), 10)
                );
                input._flatpickr.setDate(fakeDate, false);
            } catch (e) {
                console.error("Error setting date:", e);
            }
        }
    });
    
    window.isUpdatingConverter = false;
}

// ==============================================
// 6. XỬ LÝ PLANNING & GOOGLE SHEETS
// ==============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbyHsOl7TjPdeyo8kZ-_4I4iICVt9n-jceTrW6p2qtb4fM4ZCHveFR21wBgRGPTx_a5oBw/exec';

const userColors = {
    'Trung': '#ef4444', 'Q.Minh': '#f97316', 'An': '#eab308', 
    'Hiếu': '#22c55e', 'Đạt': '#14b8a6', 'G.Minh': '#3b82f6', 
    'Bửu': '#8b5cf6', 'Khang': '#ec4899'
};

document.getElementById('btn-submit-plan').addEventListener('click', async () => {
    const startVal = document.getElementById('plan-start').value;
    const endVal = document.getElementById('plan-end').value;
    const msg = document.getElementById('plan-status-msg');
    
    if (!startVal || !endVal) {
        msg.textContent = 'Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!';
        msg.className = 'status-msg error';
        Toast.show('Vui lòng chọn thời gian bắt đầu và kết thúc!', 'error');
        return;
    }
    
    try {
        const startIso = startVal.replace(' ', 'T') + ':00';
        const endIso = endVal.replace(' ', 'T') + ':00';
        
        const startObj = dayjs(startIso).tz(currentUser.tz, true);
        const endObj = dayjs(endIso).tz(currentUser.tz, true);
        
        if (endObj.isBefore(startObj) || endObj.isSame(startObj)) {
            msg.textContent = 'Giờ kết thúc phải sau giờ bắt đầu!';
            msg.className = 'status-msg error';
            Toast.show('Giờ kết thúc phải sau giờ bắt đầu!', 'error');
            return;
        }
        
        msg.textContent = 'Đang lưu lên Google Sheets...';
        msg.className = 'status-msg';
        
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add',
                name: currentUser.name,
                startTime: startObj.utc().format(),
                endTime: endObj.utc().format()
            })
        });
        
        msg.textContent = 'Đã lưu lịch thành công!';
        msg.className = 'status-msg success';
        Toast.show('Đã lưu lịch rảnh thành công!', 'success');
        loadScheduleBoard();
        
    } catch (err) {
        console.error(err);
        msg.textContent = 'Đã có lỗi hoặc mạng chậm, vui lòng Tải lại bảng để kiểm tra.';
        msg.className = 'status-msg error';
        Toast.show('Lỗi mạng khi lưu lịch!', 'error');
        loadScheduleBoard();
    }
});

async function deleteSchedule(id) {
    const confirmed = await customConfirm('Bạn có chắc chắn muốn xóa khoảng thời gian này không?', 'Xóa lịch rảnh');
    if (!confirmed) return;
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                name: currentUser.name,
                id: id
            })
        });
        Toast.show('Đã xóa khoảng thời gian thành công!', 'success');
        loadScheduleBoard();
    } catch(err) {
        Toast.show('Có lỗi xảy ra khi xóa lịch!', 'error');
    }
}

window.deleteSchedule = deleteSchedule;

function renderTimelineFromData(rawData) {
    const myListEl = document.getElementById('my-schedule-list');
    const timelineEl = document.getElementById('custom-timeline');
    if (!myListEl || !timelineEl) return;
    
    const nowUTC = dayjs().utc();
    const futureData = rawData.filter(item => dayjs(item.endTime).isAfter(nowUTC));
    
    if (!futureData || futureData.length === 0) {
        timelineEl.innerHTML = '<p style="text-align:center; color: var(--text-muted); padding:2rem 0;">Chưa có ai đăng ký lịch rảnh trong tương lai.</p>';
        myListEl.innerHTML = '<p style="color: var(--text-muted);">Bạn chưa có lịch rảnh nào.</p>';
        return;
    }
    
    timelineEl.innerHTML = '';
    
    let minStart = null;
    let maxEnd = null;
    futureData.forEach(item => {
        const start = dayjs(item.startTime).tz(currentUser.tz);
        const end = dayjs(item.endTime).tz(currentUser.tz);
        if(!minStart || start.isBefore(minStart)) minStart = start;
        if(!maxEnd || end.isAfter(maxEnd)) maxEnd = end;
    });
    
    minStart = minStart.startOf('hour');
    maxEnd = maxEnd.add(1, 'hour').startOf('hour'); 
    
    const totalHours = maxEnd.diff(minStart, 'hour');
    const PIXELS_PER_HOUR = 80;
    const totalWidth = totalHours * PIXELS_PER_HOUR;
    const LABEL_WIDTH = 120;
    
    timelineEl.style.width = (totalWidth + LABEL_WIDTH) + 'px';
    
    const axisRow = document.createElement('div');
    axisRow.style.display = 'flex';
    axisRow.style.borderBottom = '2px solid var(--border)';
    axisRow.style.position = 'sticky';
    axisRow.style.top = '0';
    axisRow.style.background = 'var(--bg-subtle)';
    axisRow.style.zIndex = '10';
    
    const corner = document.createElement('div');
    corner.style.width = LABEL_WIDTH + 'px';
    corner.style.flexShrink = '0';
    corner.style.borderRight = '1px solid var(--border)';
    corner.style.position = 'sticky';
    corner.style.left = '0';
    corner.style.background = 'var(--bg-subtle)';
    corner.style.zIndex = '11';
    axisRow.appendChild(corner);
    
    for(let i = 0; i <= totalHours; i++) {
        const timePoint = minStart.add(i, 'hour');
        const tick = document.createElement('div');
        tick.style.width = PIXELS_PER_HOUR + 'px';
        tick.style.flexShrink = '0';
        tick.style.borderLeft = '1px solid var(--border)';
        tick.style.padding = '4px 2px';
        tick.style.fontSize = '0.8rem';
        tick.style.color = 'var(--text-secondary)';
        tick.style.boxSizing = 'border-box';
        
        const timeStr = timePoint.format('HH:mm');
        const dateStr = timePoint.format('DD/MM');
        
        if (timeStr === '00:00') {
            tick.style.fontWeight = 'bold';
            tick.style.color = '#ef4444';
            tick.style.background = 'var(--danger-bg)';
            tick.style.borderLeft = '2px solid #ef4444';
        }
        
        tick.innerHTML = `<div>${timeStr}</div><div style="font-size:0.7rem; color: var(--text-muted);">${dateStr}</div>`;
        axisRow.appendChild(tick);
    }
    timelineEl.appendChild(axisRow);
    
    const uniqueNames = [...new Set(futureData.map(d => d.name))];
    uniqueNames.forEach(name => {
        const personRow = document.createElement('div');
        personRow.style.display = 'flex';
        personRow.style.borderBottom = '1px solid var(--border)';
        personRow.style.position = 'relative';
        
        const nameCol = document.createElement('div');
        nameCol.textContent = name;
        nameCol.style.width = LABEL_WIDTH + 'px';
        nameCol.style.flexShrink = '0';
        nameCol.style.borderRight = '1px solid var(--border)';
        nameCol.style.padding = '0.5rem';
        nameCol.style.fontWeight = '600';
        nameCol.style.position = 'sticky';
        nameCol.style.left = '0';
        nameCol.style.background = 'var(--bg-surface)';
        nameCol.style.zIndex = '5';
        nameCol.style.display = 'flex';
        nameCol.style.alignItems = 'center';
        nameCol.style.color = 'var(--text-main)';
        personRow.appendChild(nameCol);
        
        const track = document.createElement('div');
        track.style.position = 'relative';
        track.style.width = totalWidth + 'px';
        track.style.background = `repeating-linear-gradient(to right, transparent, transparent ${PIXELS_PER_HOUR-1}px, var(--border) ${PIXELS_PER_HOUR-1}px, var(--border) ${PIXELS_PER_HOUR}px)`;
        
        const personData = futureData.filter(d => d.name === name);
        personData.forEach(block => {
            const start = dayjs(block.startTime).tz(currentUser.tz);
            const end = dayjs(block.endTime).tz(currentUser.tz);
            
            const startDiff = start.diff(minStart, 'minute') / 60;
            const duration = end.diff(start, 'minute') / 60;
            
            const blockEl = document.createElement('div');
            blockEl.style.position = 'absolute';
            blockEl.style.left = (startDiff * PIXELS_PER_HOUR) + 'px';
            blockEl.style.width = (duration * PIXELS_PER_HOUR) + 'px';
            blockEl.style.top = '10%';
            blockEl.style.height = '80%';
            blockEl.style.background = userColors[name] || '#6b7280';
            blockEl.style.borderRadius = '6px';
            blockEl.style.cursor = 'pointer';
            blockEl.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
            
            blockEl.title = `${name} rảnh:\nTừ: ${start.format('HH:mm DD/MM')}\nĐến: ${end.format('HH:mm DD/MM')}`;
            
            track.appendChild(blockEl);
        });
        
        personRow.appendChild(track);
        timelineEl.appendChild(personRow);
    });
    
    const crosshair = document.createElement('div');
    crosshair.style.position = 'absolute';
    crosshair.style.top = '0';
    crosshair.style.bottom = '0';
    crosshair.style.height = '100%';
    crosshair.style.width = '2px';
    crosshair.style.background = 'rgba(239, 68, 68, 0.85)';
    crosshair.style.zIndex = '30';
    crosshair.style.display = 'none';
    crosshair.style.pointerEvents = 'none';
    
    const crosshairLabel = document.createElement('div');
    crosshairLabel.style.position = 'absolute';
    crosshairLabel.style.top = '6px';
    crosshairLabel.style.left = '8px';
    crosshairLabel.style.background = '#ef4444';
    crosshairLabel.style.color = 'white';
    crosshairLabel.style.padding = '3px 8px';
    crosshairLabel.style.fontSize = '0.785rem';
    crosshairLabel.style.fontWeight = '700';
    crosshairLabel.style.borderRadius = '6px';
    crosshairLabel.style.whiteSpace = 'nowrap';
    crosshairLabel.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
    crosshairLabel.style.pointerEvents = 'none';
    crosshair.appendChild(crosshairLabel);
    
    timelineEl.appendChild(crosshair);
    
    timelineEl.addEventListener('mousemove', (e) => {
        const rect = timelineEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        
        if(mouseX > LABEL_WIDTH) {
            crosshair.style.display = 'block';
            crosshair.style.left = mouseX + 'px';
            
            const hoursFromStart = (mouseX - LABEL_WIDTH) / PIXELS_PER_HOUR;
            const hoverTime = minStart.add(hoursFromStart, 'hour');
            crosshairLabel.textContent = hoverTime.format('HH:mm (DD/MM)');
        } else {
            crosshair.style.display = 'none';
        }
    });
    
    timelineEl.addEventListener('touchstart', (e) => {
        const rect = timelineEl.getBoundingClientRect();
        const touch = e.touches[0];
        const mouseX = touch.clientX - rect.left;
        
        if(mouseX > LABEL_WIDTH) {
            crosshair.style.display = 'block';
            crosshair.style.left = mouseX + 'px';
            
            const hoursFromStart = (mouseX - LABEL_WIDTH) / PIXELS_PER_HOUR;
            const hoverTime = minStart.add(hoursFromStart, 'hour');
            crosshairLabel.textContent = hoverTime.format('HH:mm (DD/MM)');
        } else {
            crosshair.style.display = 'none';
        }
    }, {passive: true});
    
    timelineEl.addEventListener('mouseleave', () => { crosshair.style.display = 'none'; });

    const myData = futureData.filter(item => item.name === currentUser.name);
    myListEl.innerHTML = '';
    
    if (myData.length === 0) {
        myListEl.innerHTML = '<p style="color: var(--text-muted);">Bạn chưa có lịch rảnh nào.</p>';
    } else {
        myData.sort((a,b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf());
        myData.forEach(item => {
            const startLocal = dayjs(item.startTime).tz(currentUser.tz);
            const endLocal = dayjs(item.endTime).tz(currentUser.tz);
            
            const div = document.createElement('div');
            div.className = 'schedule-item';
            div.innerHTML = `
                <div class="s-time" style="font-weight: 500;">
                    ${startLocal.format('HH:mm [ngày] DD/MM')} &nbsp; ➔ &nbsp; ${endLocal.format('HH:mm [ngày] DD/MM')}
                </div>
                <button class="btn-danger" onclick="deleteSchedule('${item.id}')">Xóa</button>
            `;
            myListEl.appendChild(div);
        });
    }
}

// Stale-while-revalidate Schedule Loading
async function loadScheduleBoard() {
    const myListEl = document.getElementById('my-schedule-list');
    const timelineEl = document.getElementById('custom-timeline');
    
    // 1. Optimistic render from cache if available
    const cachedSchedule = localStorage.getItem('timeSync_schedule_cache');
    if (cachedSchedule) {
        try {
            const parsed = JSON.parse(cachedSchedule);
            renderTimelineFromData(parsed);
        } catch(e) {
            console.error("Lỗi đọc cache schedule:", e);
        }
    } else {
        if (myListEl) myListEl.innerHTML = '<p>Đang tải dữ liệu...</p>';
        if (timelineEl) timelineEl.innerHTML = '<p style="text-align:center; padding: 2rem; color: var(--text-muted);">Đang vẽ biểu đồ...</p>';
    }
    
    // 2. Fetch fresh data in background
    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();
        
        localStorage.setItem('timeSync_schedule_cache', JSON.stringify(rawData));
        renderTimelineFromData(rawData);
    } catch (err) {
        console.error(err);
        if (!cachedSchedule) {
            if (timelineEl) timelineEl.innerHTML = '<p class="status-msg error">Lỗi tải dữ liệu. Hãy kiểm tra kết nối mạng.</p>';
        }
    }
}

document.getElementById('btn-refresh-board').addEventListener('click', () => {
    Toast.show('Đang làm mới bảng lịch...', 'info');
    loadScheduleBoard();
});

// ==============================================
// 7. XỬ LÝ REACTIONS (LƯỢT THÍCH / THẢ TIM TÁCH BIỆT TỪNG NGƯỜI)
// ==============================================
function getLikesMap() {
    try {
        const raw = JSON.parse(localStorage.getItem('timeSync_likes') || '{}');
        // Tương thích ngược: chuyển đổi dữ liệu cũ nếu chưa có mảng users
        for (const k in raw) {
            if (raw[k] && !Array.isArray(raw[k].users)) {
                raw[k].users = raw[k].liked && currentUser?.name ? [currentUser.name] : [];
                raw[k].count = raw[k].users.length || (raw[k].count || 0);
            }
        }
        return raw;
    } catch(e) {
        return {};
    }
}

function saveLikesMap(map) {
    localStorage.setItem('timeSync_likes', JSON.stringify(map));
}

function toggleLike(imgId, e) {
    if (e) e.stopPropagation();
    if (!currentUser || !currentUser.name) {
        Toast.show("Vui lòng đăng nhập chọn tên trước khi thả tim!", "warning");
        return;
    }
    
    const likesMap = getLikesMap();
    let current = likesMap[imgId];
    if (!current || !Array.isArray(current.users)) {
        current = {
            users: current && current.liked ? [currentUser.name] : [],
            count: current ? (current.count || 0) : 0
        };
    }
    
    const userIndex = current.users.indexOf(currentUser.name);
    let nowLiked = false;
    if (userIndex !== -1) {
        // Đã thả tim -> Hủy tim của người này
        current.users.splice(userIndex, 1);
        nowLiked = false;
    } else {
        // Chưa thả tim -> Thêm tim của người này
        current.users.push(currentUser.name);
        nowLiked = true;
    }
    current.count = current.users.length;
    current.liked = nowLiked;
    
    likesMap[imgId] = current;
    saveLikesMap(likesMap);
    
    // Cập nhật giao diện lập tức (Grid & Lightbox)
    updateLikeUI(imgId, nowLiked, current.count, current.users);
    
    // Đồng bộ danh sách tim lên Google Apps Script
    fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'likeMedia',
            id: imgId,
            user: currentUser.name,
            liked: nowLiked
        })
    }).catch(err => console.warn('Lỗi đồng bộ like lên server:', err));
}

// Danh mục thông tin chi tiết thành viên (Flag, Region, Color)
const userDirectory = {
    'Trung': { flag: '🇻🇳', region: 'Việt Nam · UTC+7', color: '#ef4444' },
    'Q.Minh': { flag: '🇻🇳', region: 'Việt Nam · UTC+7', color: '#f97316' },
    'An': { flag: '🇻🇳', region: 'Việt Nam · UTC+7', color: '#eab308' },
    'Hiếu': { flag: '🇩🇪', region: 'Bayern, Đức · UTC+2', color: '#22c55e' },
    'Đạt': { flag: '🇩🇪', region: 'Bayern, Đức · UTC+2', color: '#14b8a6' },
    'G.Minh': { flag: '🇺🇸', region: 'Massachusetts, Mỹ · UTC-4', color: '#3b82f6' },
    'Bửu': { flag: '🇺🇸', region: 'Nevada, Mỹ · UTC-7', color: '#8b5cf6' },
    'Khang': { flag: '🇻🇳', region: 'Việt Nam · UTC+7', color: '#ec4899' }
};

function formatHeartedSummary(users) {
    if (!users || !users.length) return 'Chưa có ai thả tim';
    if (users.length === 1) return `Thả tim bởi <strong>${users[0]}</strong>`;
    if (users.length === 2) return `Thả tim bởi <strong>${users[0]}</strong> và <strong>${users[1]}</strong>`;
    if (users.length === 3) return `Thả tim bởi <strong>${users[0]}</strong>, <strong>${users[1]}</strong> và <strong>${users[2]}</strong>`;
    return `Thả tim bởi <strong>${users[0]}</strong>, <strong>${users[1]}</strong> và <strong>${users.length - 2} người khác</strong>`;
}

function formatCardHeartedSummary(users) {
    if (!users || !users.length) return '';
    if (users.length === 1) return users[0];
    if (users.length === 2) return `${users[0]}, ${users[1]}`;
    return `${users[0]}, ${users[1]} +${users.length - 2}`;
}

// Quản lý Modal "Hearted by" (Danh sách người đã thả tim)
let currentHeartedModalId = null;
const heartedByModal = document.getElementById('hearted-by-modal');
const heartedBySubtitle = document.getElementById('hearted-by-subtitle');
const heartedByList = document.getElementById('hearted-by-list');
const heartedByClose = document.getElementById('hearted-by-close');
const heartedByDoneBtn = document.getElementById('hearted-by-done-btn');

function openHeartedByModal(imgId) {
    currentHeartedModalId = imgId;
    renderHeartedByModalContent(imgId);
    if (heartedByModal) heartedByModal.style.display = 'flex';
}

function closeHeartedByModal() {
    currentHeartedModalId = null;
    if (heartedByModal) heartedByModal.style.display = 'none';
}

if (heartedByClose) heartedByClose.addEventListener('click', closeHeartedByModal);
if (heartedByDoneBtn) heartedByDoneBtn.addEventListener('click', closeHeartedByModal);
if (heartedByModal) {
    heartedByModal.addEventListener('click', (e) => {
        if (e.target === heartedByModal) closeHeartedByModal();
    });
}

function renderHeartedByModalContent(imgId) {
    if (!heartedByList) return;
    const likesMap = getLikesMap();
    const likeData = likesMap[imgId] || { count: 0, users: [] };
    const users = Array.isArray(likeData.users) ? likeData.users : [];
    
    if (heartedBySubtitle) {
        heartedBySubtitle.textContent = `${users.length} thành viên`;
    }
    
    if (!users.length) {
        heartedByList.innerHTML = `
            <div class="hearted-by-empty">
                <span style="font-size: 2rem;">🤍</span>
                <p>Chưa có ai thả tim cho bức ảnh/video này.<br>Hãy là người đầu tiên thả tim nhé!</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    users.forEach(userName => {
        const info = userDirectory[userName] || { flag: '👤', region: 'Thành viên nhóm', color: '#6366f1' };
        const initial = userName ? userName.charAt(0).toUpperCase() : '?';
        html += `
            <div class="hearted-user-row">
                <div class="hearted-user-left">
                    <div class="hearted-user-avatar" style="background-color: ${info.color};">
                        ${initial}
                    </div>
                    <div class="hearted-user-info">
                        <div class="hearted-user-name">
                            <span>${userName}</span>
                            <span class="hearted-user-flag">${info.flag}</span>
                        </div>
                        <div class="hearted-user-region">${info.region}</div>
                    </div>
                </div>
                <span class="hearted-user-badge">❤️ Đã thích</span>
            </div>
        `;
    });
    heartedByList.innerHTML = html;
}

function updateLikeUI(imgId, isLiked, count, users) {
    const userList = Array.isArray(users) ? users : [];
    const tooltipText = userList.length > 0 
        ? `Đã thả tim: ${userList.join(', ')}` 
        : 'Thả tim';
        
    // Cập nhật tất cả các nút like của ảnh này trên Gallery Grid
    document.querySelectorAll(`[data-like-id="${imgId}"]`).forEach(btn => {
        if (isLiked) {
            btn.classList.add('heart-liked');
        } else {
            btn.classList.remove('heart-liked');
        }
        const heartSvg = btn.querySelector('.heart-icon');
        if (heartSvg) {
            heartSvg.setAttribute('fill', isLiked ? '#ef4444' : 'none');
            heartSvg.setAttribute('stroke', isLiked ? '#ef4444' : 'currentColor');
        }
        const countEl = btn.querySelector('.like-count');
        if (countEl) countEl.textContent = count;
        btn.title = tooltipText;
    });
    
    // Cập nhật thẻ tóm tắt Hearted By trên thẻ Gallery
    const cardSummaryEl = document.querySelector(`[data-hearted-summary-id="${imgId}"]`);
    if (cardSummaryEl) {
        if (userList.length > 0) {
            cardSummaryEl.style.display = 'inline-flex';
            const nameSpan = cardSummaryEl.querySelector('.hearted-names');
            if (nameSpan) nameSpan.textContent = formatCardHeartedSummary(userList);
        } else {
            cardSummaryEl.style.display = 'none';
        }
    }
    
    // Cập nhật Lightbox nếu đang mở bức ảnh này
    const lightboxLikeBtn = document.getElementById('lightbox-like-btn');
    const lightboxLikeCount = document.getElementById('lightbox-like-count');
    const lightboxHeartedBar = document.getElementById('lightbox-hearted-bar');
    const lightboxHeartedText = document.getElementById('lightbox-hearted-text');
    
    if (activeLightboxIndex !== -1) {
        const list = filteredImages.length ? filteredImages : allImages;
        if (list[activeLightboxIndex]?.id === imgId) {
            if (lightboxLikeBtn) {
                if (isLiked) {
                    lightboxLikeBtn.classList.add('heart-liked');
                } else {
                    lightboxLikeBtn.classList.remove('heart-liked');
                }
                lightboxLikeBtn.title = tooltipText;
            }
            if (lightboxLikeCount) lightboxLikeCount.textContent = count;
            
            if (lightboxHeartedBar && lightboxHeartedText) {
                lightboxHeartedBar.style.display = 'inline-flex';
                lightboxHeartedText.innerHTML = formatHeartedSummary(userList);
            }
        }
    }
    
    // Cập nhật modal Hearted By nếu đang mở cho ảnh này
    if (currentHeartedModalId === imgId) {
        renderHeartedByModalContent(imgId);
    }
}

// ==============================================
// 8. IMMERSIVE PHOTO LIGHTBOX
// ==============================================
let activeLightboxIndex = -1;
const lightboxModal = document.getElementById('lightbox-modal');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxUploader = document.getElementById('lightbox-uploader');
const lightboxTime = document.getElementById('lightbox-time');
const lightboxLikeBtn = document.getElementById('lightbox-like-btn');
const lightboxLikeCount = document.getElementById('lightbox-like-count');
const lightboxDownload = document.getElementById('lightbox-download');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');
const lightboxVideoContainer = document.getElementById('lightbox-video-container');
const lightboxVideoFrame = document.getElementById('lightbox-video-frame');
const lightboxNativeVideo = document.getElementById('lightbox-native-video');

function openLightbox(index) {
    const list = filteredImages.length ? filteredImages : allImages;
    if (!list || index < 0 || index >= list.length) return;
    activeLightboxIndex = index;
    
    const img = list[index];
    let savedVideoIds = [];
    try {
        savedVideoIds = JSON.parse(localStorage.getItem('timeSync_video_ids') || '[]');
    } catch(e) {}
    const isVideo = img.type === 'video' || savedVideoIds.includes(img.id);
    const directImageUrl = "https://lh3.googleusercontent.com/d/" + img.id;
    const directStreamUrl = "https://drive.google.com/uc?export=download&id=" + img.id;
    const timeFormatted = dayjs(img.timestamp).tz(currentUser.tz).format('HH:mm · DD/MM/YYYY');
    
    if (isVideo) {
        if (lightboxImg) lightboxImg.style.display = 'none';
        if (lightboxVideoContainer) lightboxVideoContainer.style.display = 'flex';
        
        const driveViewUrl = "https://drive.google.com/file/d/" + img.id + "/view";
        const driveDownloadUrl = "https://drive.google.com/uc?export=download&id=" + img.id;
        const drivePreviewUrl = "https://drive.google.com/file/d/" + img.id + "/preview";
        
        const openDriveBtn = document.getElementById('lightbox-open-drive-btn');
        if (openDriveBtn) openDriveBtn.href = driveViewUrl;
        
        const downloadVideoBtn = document.getElementById('lightbox-download-video-btn');
        if (downloadVideoBtn) downloadVideoBtn.href = driveDownloadUrl;
        
        if (lightboxNativeVideo) {
            lightboxNativeVideo.style.display = 'none';
            lightboxNativeVideo.src = '';
        }
        
        if (lightboxVideoFrame) {
            lightboxVideoFrame.style.display = 'block';
            if (lightboxVideoFrame.src !== drivePreviewUrl) {
                lightboxVideoFrame.src = drivePreviewUrl;
            }
        }
        
        lightboxDownload.href = driveViewUrl;
        lightboxDownload.title = "Mở xem video trên Google Drive";
    } else {
        if (lightboxVideoContainer) lightboxVideoContainer.style.display = 'none';
        if (lightboxNativeVideo) {
            lightboxNativeVideo.pause();
            lightboxNativeVideo.src = '';
        }
        if (lightboxVideoFrame) lightboxVideoFrame.src = '';
        if (lightboxImg) {
            lightboxImg.style.display = 'block';
            lightboxImg.src = directImageUrl;
        }
        lightboxDownload.href = directImageUrl;
        lightboxDownload.title = "Mở file gốc trong tab mới";
    }
    
    lightboxUploader.textContent = img.name;
    lightboxTime.textContent = timeFormatted;
    
    const likesMap = getLikesMap();
    const likeData = likesMap[img.id] || { count: 0, users: [] };
    const users = Array.isArray(likeData.users) ? likeData.users : (likeData.liked && currentUser?.name ? [currentUser.name] : []);
    const isLiked = currentUser?.name ? users.includes(currentUser.name) : Boolean(likeData.liked);
    const likeCount = users.length || likeData.count || 0;
    const tooltipText = users.length > 0 ? `Đã thả tim: ${users.join(', ')}` : 'Thả tim';
    
    lightboxLikeCount.textContent = likeCount;
    if (isLiked) {
        lightboxLikeBtn.classList.add('heart-liked');
    } else {
        lightboxLikeBtn.classList.remove('heart-liked');
    }
    lightboxLikeBtn.title = tooltipText;
    
    // Cập nhật thanh danh sách Hearted By trong Lightbox
    const lightboxHeartedBar = document.getElementById('lightbox-hearted-bar');
    const lightboxHeartedText = document.getElementById('lightbox-hearted-text');
    if (lightboxHeartedBar && lightboxHeartedText) {
        lightboxHeartedBar.style.display = 'inline-flex';
        lightboxHeartedText.innerHTML = formatHeartedSummary(users);
    }
    
    lightboxModal.style.display = 'flex';
}

function closeLightbox() {
    activeLightboxIndex = -1;
    lightboxModal.style.display = 'none';
    if (lightboxImg) lightboxImg.src = '';
    if (lightboxNativeVideo) {
        lightboxNativeVideo.pause();
        lightboxNativeVideo.src = '';
    }
    if (lightboxVideoFrame) lightboxVideoFrame.src = '';
}

// Bắt sự kiện xem danh sách Hearted By từ Lightbox
const lightboxHeartedBar = document.getElementById('lightbox-hearted-bar');
if (lightboxHeartedBar) {
    lightboxHeartedBar.addEventListener('click', (e) => {
        const list = filteredImages.length ? filteredImages : allImages;
        if (activeLightboxIndex !== -1 && list[activeLightboxIndex]) {
            openHeartedByModal(list[activeLightboxIndex].id);
        }
    });
}
if (lightboxLikeCount) {
    lightboxLikeCount.style.cursor = 'pointer';
    lightboxLikeCount.title = 'Xem danh sách người đã thả tim';
    lightboxLikeCount.addEventListener('click', (e) => {
        e.stopPropagation();
        const list = filteredImages.length ? filteredImages : allImages;
        if (activeLightboxIndex !== -1 && list[activeLightboxIndex]) {
            openHeartedByModal(list[activeLightboxIndex].id);
        }
    });
}

function nextLightboxImage() {
    const list = filteredImages.length ? filteredImages : allImages;
    if (!list.length) return;
    let nextIndex = activeLightboxIndex + 1;
    if (nextIndex >= list.length) nextIndex = 0;
    openLightbox(nextIndex);
}

function prevLightboxImage() {
    const list = filteredImages.length ? filteredImages : allImages;
    if (!list.length) return;
    let prevIndex = activeLightboxIndex - 1;
    if (prevIndex < 0) prevIndex = list.length - 1;
    openLightbox(prevIndex);
}

if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
if (lightboxNext) lightboxNext.addEventListener('click', nextLightboxImage);
if (lightboxPrev) lightboxPrev.addEventListener('click', prevLightboxImage);

if (lightboxModal) {
    lightboxModal.querySelector('.lightbox-backdrop')?.addEventListener('click', closeLightbox);
}

if (lightboxLikeBtn) {
    lightboxLikeBtn.addEventListener('click', () => {
        const list = filteredImages.length ? filteredImages : allImages;
        if (activeLightboxIndex !== -1 && list[activeLightboxIndex]) {
            toggleLike(list[activeLightboxIndex].id);
        }
    });
}

window.addEventListener('keydown', (e) => {
    if (lightboxModal && lightboxModal.style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') nextLightboxImage();
        if (e.key === 'ArrowLeft') prevLightboxImage();
    }
});

// ==============================================
// 9. XỬ LÝ GALLERY (THƯ VIỆN ẢNH)
// ==============================================
const btnUpload = document.getElementById('btn-upload-image');
const fileInput = document.getElementById('gallery-upload-input');
const btnRefreshGallery = document.getElementById('btn-refresh-gallery');
const galleryGrid = document.getElementById('gallery-grid');
const galleryStatusMsg = document.getElementById('gallery-status-msg');

function showGalleryMsg(msg, isError = false) {
    if(!galleryStatusMsg) return;
    galleryStatusMsg.textContent = msg;
    galleryStatusMsg.className = isError ? 'status-msg error' : 'status-msg success';
}

if (btnUpload && fileInput) {
    btnUpload.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showGalleryMsg("Đang nén ảnh...", false);
        Toast.show("Đang nén ảnh để tải lên...", "info");
        
        try {
            const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
            showGalleryMsg("Đang tải ảnh lên hệ thống...", false);
            Toast.show("Đang tải ảnh lên Google Drive...", "info");
            
            const payload = {
                action: 'uploadImage',
                name: currentUser.name,
                filename: file.name,
                mimeType: file.type,
                base64: compressedBase64.split(',')[1]
            };
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (result.success) {
                showGalleryMsg("Đã tải ảnh lên thành công!", false);
                Toast.show("Đã tải ảnh lên thành công!", "success");
                loadGallery();
            } else {
                showGalleryMsg("Lỗi: " + result.error, true);
                Toast.show("Lỗi tải ảnh: " + result.error, "error");
            }
        } catch (error) {
            console.error(error);
            showGalleryMsg("Đã xảy ra lỗi khi tải ảnh.", true);
            Toast.show("Đã xảy ra lỗi khi tải ảnh lên!", "error");
        }
        
        fileInput.value = '';
    });
}

// ==============================================
// 9.1 XỬ LÝ UPLOAD VIDEO (RESUMABLE UPLOAD LÊN DRIVE)
// ==============================================
const btnUploadVideo = document.getElementById('btn-upload-video');
const videoFileInput = document.getElementById('gallery-video-upload-input');
const videoUploadModal = document.getElementById('video-upload-modal');
const videoUploadFilename = document.getElementById('video-upload-filename');
const videoProgressBar = document.getElementById('video-progress-bar');
const videoProgressPercent = document.getElementById('video-progress-percent');
const videoProgressStatus = document.getElementById('video-progress-status');

if (btnUploadVideo && videoFileInput) {
    btnUploadVideo.addEventListener('click', () => videoFileInput.click());
    
    videoFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Giới hạn dung lượng tối đa 35MB cho tải trực tiếp lên Google Drive qua Web App
        const MAX_SIZE_MB = 35;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            Toast.show(`Video vượt quá giới hạn (${MAX_SIZE_MB}MB)! Để tải lên ổn định qua Drive, vui lòng chọn clip dưới ${MAX_SIZE_MB}MB.`, 'error');
            videoFileInput.value = '';
            return;
        }
        
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        if (videoUploadFilename) videoUploadFilename.textContent = `${file.name} (${sizeMb} MB)`;
        if (videoProgressBar) videoProgressBar.style.width = '5%';
        if (videoProgressPercent) videoProgressPercent.textContent = '5%';
        if (videoProgressStatus) videoProgressStatus.textContent = 'Đang đọc dữ liệu video...';
        if (videoUploadModal) videoUploadModal.style.display = 'flex';
        
        // Cảnh báo người dùng nếu vô tình tắt trang
        const beforeUnloadHandler = (ev) => {
            ev.preventDefault();
            ev.returnValue = '';
        };
        window.addEventListener('beforeunload', beforeUnloadHandler);
        
        try {
            // Bước 1: Đọc file video thành chuỗi Base64
            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const readPercent = Math.round((event.loaded / event.total) * 35);
                        if (videoProgressBar) videoProgressBar.style.width = `${readPercent}%`;
                        if (videoProgressPercent) videoProgressPercent.textContent = `${readPercent}%`;
                        const readMb = (event.loaded / (1024 * 1024)).toFixed(1);
                        if (videoProgressStatus) videoProgressStatus.textContent = `Đang xử lý file: ${readMb} MB / ${sizeMb} MB`;
                    }
                };
                reader.onload = () => {
                    const res = reader.result;
                    const base64 = res.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = () => reject(new Error('Không thể đọc dữ liệu video từ thiết bị'));
                reader.readAsDataURL(file);
            });
            
            if (videoProgressStatus) videoProgressStatus.textContent = 'Đang truyền dữ liệu lên Google Drive...';
            if (videoProgressBar) videoProgressBar.style.width = '45%';
            if (videoProgressPercent) videoProgressPercent.textContent = '45%';
            
            // Bước 2: Tải lên Google Drive bằng fetch() (tự động theo dõi redirect 302 an toàn)
            const payload = JSON.stringify({
                action: 'uploadImage',
                name: currentUser.name,
                filename: file.name,
                mimeType: file.type || 'video/mp4',
                mediaType: 'video',
                base64: base64Data
            });
            
            // Hiệu ứng tiến trình mượt mà khi dữ liệu đang truyền tải
            let uploadProgress = 45;
            const progressTimer = setInterval(() => {
                if (uploadProgress < 92) {
                    uploadProgress += Math.floor(Math.random() * 4) + 2;
                    if (uploadProgress > 92) uploadProgress = 92;
                    if (videoProgressBar) videoProgressBar.style.width = `${uploadProgress}%`;
                    if (videoProgressPercent) videoProgressPercent.textContent = `${uploadProgress}%`;
                    if (videoProgressStatus) videoProgressStatus.textContent = `Đang đồng bộ vào Google Drive: ${uploadProgress}%...`;
                }
            }, 350);
            
            const response = await fetch(API_URL, {
                method: 'POST',
                body: payload
            });
            
            clearInterval(progressTimer);
            if (videoProgressBar) videoProgressBar.style.width = '100%';
            if (videoProgressPercent) videoProgressPercent.textContent = '100%';
            if (videoProgressStatus) videoProgressStatus.textContent = 'Đang hoàn tất lưu vào thư viện...';
            
            const resData = await response.json();
            if (!resData.success) {
                throw new Error(resData.error || 'Lỗi khi lưu video lên Google Apps Script');
            }
            
            // Lưu ID của video vào danh sách video đã tải
            if (resData.id) {
                let savedIds = [];
                try {
                    savedIds = JSON.parse(localStorage.getItem('timeSync_video_ids') || '[]');
                } catch(e) {}
                if (!savedIds.includes(resData.id)) {
                    savedIds.push(resData.id);
                    localStorage.setItem('timeSync_video_ids', JSON.stringify(savedIds));
                }
            }
            
            Toast.show('Đã tải video lên Google Drive thành công!', 'success');
            setTimeout(() => {
                if (videoUploadModal) videoUploadModal.style.display = 'none';
                loadGallery();
            }, 600);
            
        } catch (error) {
            console.error('Lỗi tải video:', error);
            Toast.show('Lỗi tải video: ' + error.message, 'error');
            if (videoUploadModal) videoUploadModal.style.display = 'none';
        } finally {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            videoFileInput.value = '';
        }
    });
}

if (btnRefreshGallery) {
    btnRefreshGallery.addEventListener('click', () => {
        Toast.show("Đang làm mới thư viện ảnh...", "info");
        loadGallery();
    });
}

function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

let allImages = [];
let filteredImages = [];
let currentImageIndex = 0;
const IMAGES_PER_PAGE = 20;

// Filter & Sort Logic for Gallery
function applyGalleryFilters(resetTimelineToNewest = false) {
    if (!galleryGrid) return;
    
    const filterTimeline = document.getElementById('filter-timeline');
    const filterAdvanced = document.getElementById('filter-advanced');
    const filterUser = document.getElementById('filter-user');
    const filterUserContainer = document.getElementById('filter-user-container');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    // Nếu chọn một filter advanced, Timeline mặc định chuyển về Newest
    if (resetTimelineToNewest && filterTimeline) {
        filterTimeline.value = 'newest';
    }
    
    const timelineVal = filterTimeline ? filterTimeline.value : 'newest';
    const advancedVal = filterAdvanced ? filterAdvanced.value : 'all';
    const userVal = filterUser ? filterUser.value : '';
    
    // Toggle dropdown chọn thành viên (người đăng / người thả tim)
    if (filterUserContainer) {
        if (advancedVal === 'posted_by' || advancedVal === 'hearted_by') {
            filterUserContainer.style.display = 'inline-flex';
            const filterUserLabel = document.getElementById('filter-user-label-text');
            if (filterUserLabel) {
                filterUserLabel.textContent = advancedVal === 'hearted_by' ? 'Người thả tim:' : 'Người đăng:';
            }
        } else {
            filterUserContainer.style.display = 'none';
        }
    }
    
    let result = [...allImages];
    
    // 1. Áp dụng Advanced Filter
    if (advancedVal === 'posted_by') {
        if (userVal) {
            result = result.filter(img => img.name === userVal);
        } else {
            result = [];
        }
    } else if (advancedVal === 'hearted_by') {
        if (userVal) {
            const likesMap = getLikesMap();
            result = result.filter(img => {
                const item = likesMap[img.id];
                return item && Array.isArray(item.users) && item.users.includes(userVal);
            });
        } else {
            result = [];
        }
    } else if (advancedVal === 'my_hearted') {
        const likesMap = getLikesMap();
        result = result.filter(img => {
            const item = likesMap[img.id];
            if (!item) return false;
            if (Array.isArray(item.users)) {
                return currentUser?.name ? item.users.includes(currentUser.name) : false;
            }
            return Boolean(item.liked);
        });
    }
    
    // 2. Áp dụng Timeline Sort
    if (timelineVal === 'oldest') {
        result.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } else {
        // Mặc định: Newest
        result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    filteredImages = result;
    currentImageIndex = 0;
    galleryGrid.innerHTML = '';
    
    if (filteredImages.length === 0) {
        let emptyMsg = 'Chưa có ảnh/video nào trong thư viện.';
        if (advancedVal === 'my_hearted') {
            emptyMsg = 'Bạn chưa thả tim cho ảnh/video nào. Hãy bấm biểu tượng trái tim trên ảnh để lưu lại!';
        } else if (advancedVal === 'posted_by') {
            if (userVal) {
                emptyMsg = `Chưa có ảnh/video nào được đăng bởi <strong>${userVal}</strong>.`;
            } else {
                emptyMsg = 'Vui lòng chọn một thành viên trong danh sách để xem ảnh/video.';
            }
        } else if (advancedVal === 'hearted_by') {
            if (userVal) {
                emptyMsg = `Chưa có ảnh/video nào được thả tim bởi <strong>${userVal}</strong>.`;
            } else {
                emptyMsg = 'Vui lòng chọn một thành viên trong danh sách để xem ảnh/video họ đã thả tim.';
            }
        }
        galleryGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted); padding: 2rem 1rem;">${emptyMsg}</p>`;
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }
    
    renderNextImages();
}

// Stale-while-revalidate Gallery Loading
async function loadGallery() {
    if (!galleryGrid) return;
    
    const loadMoreContainer = document.getElementById('load-more-container');
    const cachedImages = localStorage.getItem('timeSync_gallery_cache');
    
    // 1. Optimistically render from cache if available
    if (cachedImages) {
        try {
            const parsed = JSON.parse(cachedImages);
            if (parsed && parsed.length > 0) {
                allImages = parsed;
                applyGalleryFilters(false);
            }
        } catch(e) {
            console.error("Lỗi đọc cache gallery:", e);
        }
    } else {
        galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted);">Đang tải ảnh...</p>';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    }
    
    // 2. Fetch fresh data in background
    try {
        const response = await fetch(API_URL + "?action=getGallery");
        const images = await response.json();
        
        if (!images || images.length === 0) {
            allImages = [];
            filteredImages = [];
            if (!cachedImages) {
                galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted);">Chưa có ảnh nào trong thư viện.</p>';
            }
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }
        
        allImages = images;
        localStorage.setItem('timeSync_gallery_cache', JSON.stringify(images));
        
        // Đồng bộ danh sách tim từ Google Sheet vào likesMap
        const likesMap = getLikesMap();
        images.forEach(img => {
            if (img.likes && Array.isArray(img.likes)) {
                likesMap[img.id] = {
                    users: img.likes,
                    count: img.likes.length,
                    liked: currentUser?.name ? img.likes.includes(currentUser.name) : false
                };
            }
        });
        saveLikesMap(likesMap);
        
        applyGalleryFilters(false);
        
    } catch (error) {
        console.error(error);
        if (!cachedImages) {
            galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--danger);">Không thể tải thư viện ảnh.</p>';
        }
    }
}

function renderNextImages() {
    if (!galleryGrid) return;
    const list = filteredImages;
    if (!list.length) return;
    
    const likesMap = getLikesMap();
    const nextLimit = Math.min(currentImageIndex + IMAGES_PER_PAGE, list.length);
    
    for (let i = currentImageIndex; i < nextLimit; i++) {
        const img = list[i];
        let savedVideoIds = [];
        try {
            savedVideoIds = JSON.parse(localStorage.getItem('timeSync_video_ids') || '[]');
        } catch(e) {}
        const isVideo = img.type === 'video' || savedVideoIds.includes(img.id);
        const timeFormatted = dayjs(img.timestamp).tz(currentUser.tz).format('HH:mm · DD/MM/YYYY');
        const directImageUrl = "https://lh3.googleusercontent.com/d/" + img.id;
        const likeData = likesMap[img.id] || { count: 0, users: [] };
        const users = Array.isArray(likeData.users) ? likeData.users : (likeData.liked && currentUser?.name ? [currentUser.name] : []);
        const isLiked = currentUser?.name ? users.includes(currentUser.name) : Boolean(likeData.liked);
        const likeCount = users.length || likeData.count || 0;
        const tooltipText = users.length > 0 ? `Đã thả tim: ${users.join(', ')}` : 'Thả tim';
        const capturedIndex = i;
        
        const videoBadgeHtml = isVideo ? `<span class="video-badge">▶ Video</span>` : '';
        const videoPlayCenterHtml = isVideo ? `
            <div class="video-play-center" title="Phát video">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
        ` : '';
        
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.innerHTML = `
            <img src="${directImageUrl}" alt="${isVideo ? 'Video' : 'Photo'} by ${img.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/1e293b/fff?text=${isVideo ? 'Video' : 'Lỗi+tải+ảnh'}'">
            ${videoBadgeHtml}
            ${videoPlayCenterHtml}
            <div class="gallery-actions-top">
                <button class="btn-like-overlay ${isLiked ? 'heart-liked' : ''}" data-like-id="${img.id}" title="${tooltipText}">
                    <svg class="heart-icon" width="14" height="14" viewBox="0 0 24 24" fill="${isLiked ? '#ef4444' : 'none'}" stroke="${isLiked ? '#ef4444' : 'currentColor'}" stroke-width="2.2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                    <span class="like-count">${likeCount}</span>
                </button>
                <button class="btn-delete-img" data-id="${img.id}" title="Xóa mục này">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="gallery-overlay">
                <div class="gallery-info">
                    <div class="gallery-uploader">${img.name}</div>
                    <div class="gallery-time">${timeFormatted}</div>
                    <div class="gallery-hearted-summary" data-hearted-summary-id="${img.id}" style="${users.length > 0 ? '' : 'display: none;'}" title="Xem danh sách người đã thả tim">
                        <span class="heart-mini">❤️</span>
                        <span class="hearted-names">${formatCardHeartedSummary(users)}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Like click handler (Heart icon toggles like)
        const likeBtn = div.querySelector('.btn-like-overlay');
        if (likeBtn) {
            likeBtn.addEventListener('click', (e) => {
                toggleLike(img.id, e);
            });
        }
        
        // Click like count directly opens Hearted By modal
        const likeCountEl = div.querySelector('.like-count');
        if (likeCountEl) {
            likeCountEl.addEventListener('click', (e) => {
                e.stopPropagation();
                openHeartedByModal(img.id);
            });
        }
        
        // Click hearted summary chip opens Hearted By modal
        const summaryBtn = div.querySelector('.gallery-hearted-summary');
        if (summaryBtn) {
            summaryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openHeartedByModal(img.id);
            });
        }
        
        // Delete click handler (Custom Async Modal)
        div.querySelector('.btn-delete-img').addEventListener('click', async (e) => {
            e.stopPropagation();
            const confirmed = await customConfirm('Bạn có chắc chắn muốn xóa mục này không? Tất cả mọi người đều không thấy nữa.', 'Xóa media');
            if (!confirmed) return;
            
            div.style.opacity = '0.4';
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'deleteImage', id: img.id })
                });
                const resData = await res.json();
                if(resData.success) {
                    div.remove();
                    allImages = allImages.filter(item => item.id !== img.id);
                    filteredImages = filteredImages.filter(item => item.id !== img.id);
                    localStorage.setItem('timeSync_gallery_cache', JSON.stringify(allImages));
                    Toast.show('Đã xóa ảnh thành công!', 'success');
                    
                    if (filteredImages.length === 0) {
                        applyGalleryFilters(false);
                    }
                } else {
                    Toast.show("Lỗi khi xóa: " + resData.error, 'error');
                    div.style.opacity = '1';
                }
            } catch (error) {
                Toast.show("Lỗi mạng khi xóa ảnh!", 'error');
                div.style.opacity = '1';
            }
        });
        
        // Click to open Lightbox (Immersive Viewer)
        div.addEventListener('click', () => {
            openLightbox(capturedIndex);
        });
        
        galleryGrid.appendChild(div);
    }
    
    currentImageIndex = nextLimit;
    
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        if (currentImageIndex >= list.length) {
            loadMoreContainer.style.display = 'none';
        } else {
            loadMoreContainer.style.display = 'block';
        }
    }
}

const btnLoadMore = document.getElementById('btn-load-more');
if (btnLoadMore) {
    btnLoadMore.addEventListener('click', renderNextImages);
}

// Gắn sự kiện cho các bộ lọc Gallery
const filterTimeline = document.getElementById('filter-timeline');
if (filterTimeline) {
    filterTimeline.addEventListener('change', () => applyGalleryFilters(false));
}

const filterAdvanced = document.getElementById('filter-advanced');
if (filterAdvanced) {
    filterAdvanced.addEventListener('change', () => {
        // Khi chọn một filter advanced, Timeline mặc định chuyển về Newest
        applyGalleryFilters(true);
    });
}

const filterUser = document.getElementById('filter-user');
if (filterUser) {
    filterUser.addEventListener('change', () => applyGalleryFilters(false));
}

// ==============================================
// 10. BACK TO TOP (CUỘN LÊN ĐẦU TRANG)
// ==============================================
const btnBackToTop = document.getElementById('btn-back-to-top');

function updateBackToTopVisibility() {
    if (!btnBackToTop) return;
    const galleryTab = document.getElementById('gallery');
    const isGalleryActive = galleryTab && galleryTab.classList.contains('active');
    
    if (isGalleryActive && window.scrollY > 300) {
        btnBackToTop.classList.add('visible');
    } else {
        btnBackToTop.classList.remove('visible');
    }
}

window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });

if (btnBackToTop) {
    btnBackToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

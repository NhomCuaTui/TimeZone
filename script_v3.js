// Cấu hình Day.js để dùng plugin múi giờ
dayjs.extend(window.dayjs_plugin_utc);
dayjs.extend(window.dayjs_plugin_timezone);

// Biến lưu trữ người dùng hiện tại
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
        if(currentUser.tz === 'Europe/Berlin') regionName = "Đức";
        if(currentUser.tz === 'America/New_York') regionName = "Massachusetts, Mỹ";
        if(currentUser.tz === 'America/Los_Angeles') regionName = "Nevada, Mỹ";
        userTzDisplay.textContent = `${currentUser.tz} (${regionName})`;
    }
    
    startClocks();
    initConverter();
    
    if(document.getElementById('planning').classList.contains('active')){
        loadScheduleBoard();
    }
}

// Khởi tạo bộ chọn ngày giờ cho tab Planning (chỉ chạy 1 lần khi script tải)
try {
    flatpickr("#plan-start", { disableMobile: true, enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, altInput: true, altInputClass: 'flatpickr-input altInput', altFormat: "d/m/Y H:i" });
    flatpickr("#plan-end", { disableMobile: true, enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, altInput: true, altInputClass: 'flatpickr-input altInput', altFormat: "d/m/Y H:i" });
} catch(e) {
    console.error("Lỗi Planning Flatpickr:", e);
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
        }
    });
});

function startClocks() {
    updateClocks();
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

// ==============================================
// 4. XỬ LÝ TIME CONVERTER (Dùng lại Flatpickr nguyên mẫu)
// ==============================================
let converterFpInstances = [];

function initConverter() {
    converterFpInstances.forEach(item => { if(item.fp && item.fp.destroy) item.fp.destroy(); });
    converterFpInstances = [];
    const now = dayjs();
    let isUpdating = false;
    
    document.querySelectorAll('.converter-row').forEach(row => {
        const tz = row.dataset.tz;
        const input = row.querySelector('.converter-fp');
        if (!input) return;
        
        const targetDayjs = now.tz(tz);
        const fakeDate = new Date(
            targetDayjs.year(),
            targetDayjs.month(),
            targetDayjs.date(),
            targetDayjs.hour(),
            targetDayjs.minute()
        );
        
        try {
            const fp = flatpickr(input, {
                disableMobile: true,
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                time_24hr: true,
                altInput: true,
                altInputClass: 'flatpickr-input altInput',
                altFormat: "d/m/Y H:i", // GIỐNG HỆT NHƯ BÊN PLANNING
                defaultDate: fakeDate,  // SỬ DỤNG DATE OBJECT
                onChange: function(selectedDates, dateStr, instance) {
                    if (isUpdating || selectedDates.length === 0) return;
                    isUpdating = true;
                    
                    try {
                        const localDate = selectedDates[0];
                        const yyyy = localDate.getFullYear();
                        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(localDate.getDate()).padStart(2, '0');
                        const hh = String(localDate.getHours()).padStart(2, '0');
                        const min = String(localDate.getMinutes()).padStart(2, '0');

                        const isoString = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
                        const realDayjs = dayjs(isoString).tz(tz);
                        
                        converterFpInstances.forEach(item => {
                            if (item.row !== row) {
                                const targetTzDayjs = realDayjs.tz(item.tz);
                                const otherFakeDate = new Date(
                                    targetTzDayjs.year(),
                                    targetTzDayjs.month(),
                                    targetTzDayjs.date(),
                                    targetTzDayjs.hour(),
                                    targetTzDayjs.minute()
                                );
                                item.fp.setDate(otherFakeDate, false);
                            }
                        });
                    } catch(e) {
                        console.error("Lỗi quy đổi giờ:", e);
                    } finally {
                        isUpdating = false;
                    }
                }
            });
            
            converterFpInstances.push({ tz: tz, fp: fp, row: row });
        } catch (e) {
            console.error("Flatpickr Error: ", e);
        }
    });
}

// ==============================================
// 5. XỬ LÝ PLANNING & GOOGLE SHEETS
// ==============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbw9_obYD9-zOhE_YHlbjFK-WCLATgd4o0xghVz1RrmFzJCAHmaYE4ZZ_-CdRbgrL23T2Q/exec';

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
        return;
    }
    
    try {
        const startIso = startVal.replace(' ', 'T') + ':00';
        const endIso = endVal.replace(' ', 'T') + ':00';
        
        const startObj = dayjs(startIso).tz(currentUser.tz);
        const endObj = dayjs(endIso).tz(currentUser.tz);
        
        if (endObj.isBefore(startObj) || endObj.isSame(startObj)) {
            msg.textContent = 'Giờ kết thúc phải sau giờ bắt đầu!';
            msg.className = 'status-msg error';
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
        loadScheduleBoard();
        
    } catch (err) {
        console.error(err);
        msg.textContent = 'Đã có lỗi hoặc mạng chậm, vui lòng Tải lại bảng để kiểm tra.';
        msg.className = 'status-msg error';
        loadScheduleBoard();
    }
});

async function deleteSchedule(id) {
    if(!confirm('Bạn có chắc muốn xóa khoảng thời gian này?')) return;
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'delete',
                name: currentUser.name,
                id: id
            })
        });
        loadScheduleBoard();
    } catch(err) {
        alert('Có lỗi xảy ra khi xóa!');
    }
}

window.deleteSchedule = deleteSchedule;

async function loadScheduleBoard() {
    const myListEl = document.getElementById('my-schedule-list');
    const timelineEl = document.getElementById('custom-timeline');
    
    myListEl.innerHTML = '<p>Đang tải dữ liệu...</p>';
    timelineEl.innerHTML = '<p style="text-align:center; padding: 2rem;">Đang vẽ biểu đồ...</p>';
    
    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();
        
        const nowUTC = dayjs().utc();
        const futureData = rawData.filter(item => dayjs(item.endTime).isAfter(nowUTC));
        
        if (!futureData || futureData.length === 0) {
            timelineEl.innerHTML = '<p style="text-align:center; color:#6b7280; padding:2rem 0;">Chưa có ai đăng ký lịch rảnh trong tương lai.</p>';
            myListEl.innerHTML = '<p style="color:#6b7280;">Bạn chưa có lịch rảnh nào.</p>';
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
        axisRow.style.borderBottom = '2px solid #d1d5db';
        axisRow.style.position = 'sticky';
        axisRow.style.top = '0';
        axisRow.style.background = '#f9fafb';
        axisRow.style.zIndex = '10';
        
        const corner = document.createElement('div');
        corner.style.width = LABEL_WIDTH + 'px';
        corner.style.flexShrink = '0';
        corner.style.borderRight = '1px solid #d1d5db';
        corner.style.position = 'sticky';
        corner.style.left = '0';
        corner.style.background = '#f9fafb';
        corner.style.zIndex = '11';
        axisRow.appendChild(corner);
        
        for(let i = 0; i <= totalHours; i++) {
            const timePoint = minStart.add(i, 'hour');
            const tick = document.createElement('div');
            tick.style.width = PIXELS_PER_HOUR + 'px';
            tick.style.flexShrink = '0';
            tick.style.borderLeft = '1px solid #d1d5db';
            tick.style.padding = '4px 2px';
            tick.style.fontSize = '0.8rem';
            tick.style.color = '#4b5563';
            tick.style.boxSizing = 'border-box';
            
            const timeStr = timePoint.format('HH:mm');
            const dateStr = timePoint.format('DD/MM');
            
            if (timeStr === '00:00') {
                tick.style.fontWeight = 'bold';
                tick.style.color = '#b91c1c';
                tick.style.background = '#fee2e2';
                tick.style.borderLeft = '2px solid #b91c1c';
            }
            
            tick.innerHTML = `<div>${timeStr}</div><div style="font-size:0.7rem;">${dateStr}</div>`;
            axisRow.appendChild(tick);
        }
        timelineEl.appendChild(axisRow);
        
        const uniqueNames = [...new Set(futureData.map(d => d.name))];
        uniqueNames.forEach(name => {
            const personRow = document.createElement('div');
            personRow.style.display = 'flex';
            personRow.style.borderBottom = '1px solid #e5e7eb';
            personRow.style.position = 'relative';
            
            const nameCol = document.createElement('div');
            nameCol.textContent = name;
            nameCol.style.width = LABEL_WIDTH + 'px';
            nameCol.style.flexShrink = '0';
            nameCol.style.borderRight = '1px solid #d1d5db';
            nameCol.style.padding = '0.5rem';
            nameCol.style.fontWeight = '600';
            nameCol.style.position = 'sticky';
            nameCol.style.left = '0';
            nameCol.style.background = 'white';
            nameCol.style.zIndex = '5';
            nameCol.style.display = 'flex';
            nameCol.style.alignItems = 'center';
            personRow.appendChild(nameCol);
            
            const track = document.createElement('div');
            track.style.position = 'relative';
            track.style.width = totalWidth + 'px';
            track.style.background = `repeating-linear-gradient(to right, transparent, transparent ${PIXELS_PER_HOUR-1}px, #e5e7eb ${PIXELS_PER_HOUR-1}px, #e5e7eb ${PIXELS_PER_HOUR}px)`;
            
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
        crosshair.style.width = '2px';
        crosshair.style.background = 'rgba(239, 68, 68, 0.7)';
        crosshair.style.zIndex = '20';
        crosshair.style.display = 'none';
        crosshair.style.pointerEvents = 'none';
        
        const crosshairLabel = document.createElement('div');
        crosshairLabel.style.position = 'absolute';
        crosshairLabel.style.top = '5px';
        crosshairLabel.style.left = '6px';
        crosshairLabel.style.background = '#ef4444';
        crosshairLabel.style.color = 'white';
        crosshairLabel.style.padding = '4px 8px';
        crosshairLabel.style.fontSize = '0.85rem';
        crosshairLabel.style.fontWeight = 'bold';
        crosshairLabel.style.borderRadius = '4px';
        crosshairLabel.style.whiteSpace = 'nowrap';
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
            myListEl.innerHTML = '<p style="color:#6b7280;">Bạn chưa có lịch rảnh nào.</p>';
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
        
    } catch (err) {
        timelineEl.innerHTML = '<p class="status-msg error">Lỗi tải dữ liệu. Hãy kiểm tra kết nối mạng.</p>';
        console.error(err);
    }
}

document.getElementById('btn-refresh-board').addEventListener('click', loadScheduleBoard);

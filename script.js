// Cấu hình Day.js để dùng plugin múi giờ
dayjs.extend(window.dayjs_plugin_utc);
dayjs.extend(window.dayjs_plugin_timezone);

// Biến lưu trữ người dùng hiện tại
let currentUser = null;
let clockInterval = null;

// Khai báo các múi giờ tương ứng với 4 khu vực
const timezones = {
    'vn': 'Asia/Ho_Chi_Minh',
    'de': 'Europe/Berlin',
    'ma': 'America/New_York', // Massachusett dùng EST/EDT
    'nv': 'America/Los_Angeles' // Nevada dùng PST/PDT
};

// ==============================================
// 1. XỬ LÝ ĐĂNG NHẬP (CHỌN TÊN)
// ==============================================
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const userBtns = document.querySelectorAll('.user-btn');
const currentUserDisplay = document.getElementById('current-user-display');
const logoutBtn = document.getElementById('logout-btn');

// Bắt sự kiện khi click vào tên
userBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const name = btn.dataset.name;
        const tz = btn.dataset.tz;
        
        currentUser = { name, tz };
        localStorage.setItem('timeSyncUser', JSON.stringify(currentUser)); // Lưu vào trình duyệt để lần sau vào không phải chọn lại
        
        showApp();
    });
});

// Nút Đổi người
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
    
    // Hiển thị múi giờ cho tab Planning
    const userTzDisplay = document.getElementById('user-tz-display');
    if (userTzDisplay) {
        let regionName = "Việt Nam";
        if(currentUser.tz === 'Europe/Berlin') regionName = "Đức";
        if(currentUser.tz === 'America/New_York') regionName = "Massachusetts, Mỹ";
        if(currentUser.tz === 'America/Los_Angeles') regionName = "Nevada, Mỹ";
        userTzDisplay.textContent = `${currentUser.tz} (${regionName})`;
    }
    
    // Khởi động đồng hồ
    startClocks();
    
    // Đặt giá trị mặc định cho converter
    initConverter();
    
    // Tự động tải bảng lịch nếu đang ở tab planning
    if(document.getElementById('planning').classList.contains('active')){
        loadScheduleBoard();
    }
}

// Khi vừa load trang, kiểm tra xem đã "đăng nhập" trước đó chưa
const savedUser = localStorage.getItem('timeSyncUser');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showApp();
}

// ==============================================
// 2. XỬ LÝ CHUYỂN TAB
// ==============================================
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Xóa class active ở tất cả
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        // Thêm class active vào tab vừa chọn
        btn.classList.add('active');
        const targetId = btn.dataset.target;
        document.getElementById(targetId).classList.add('active');
        
        // Nếu qua tab Planning thì tải lại dữ liệu mới nhất
        if(targetId === 'planning'){
            loadScheduleBoard();
        }
    });
});

// ==============================================
// 3. XỬ LÝ GLOBAL TIME (4 ĐỒNG HỒ REAL-TIME)
// ==============================================
function startClocks() {
    updateClocks(); // Cập nhật ngay lập tức không cần chờ 1 giây
    clockInterval = setInterval(updateClocks, 1000); // Lặp lại mỗi giây
}

function updateClocks() {
    const now = dayjs(); // Lấy giờ chuẩn hiện tại của thiết bị
    
    for (const [key, tz] of Object.entries(timezones)) {
        // Ép thời gian đó sang từng múi giờ
        const timeAtTz = now.tz(tz);
        
        const card = document.getElementById(`clock-${key}`);
        if (card) {
            card.querySelector('.time').textContent = timeAtTz.format('HH:mm:ss');
            card.querySelector('.date').textContent = timeAtTz.format('DD/MM/YYYY');
        }
    }
}

// ==============================================
// 4. XỬ LÝ TIME CONVERTER
// ==============================================
function initConverter() {
    const now = dayjs();
    const rows = document.querySelectorAll('.converter-row');
    
    rows.forEach(row => {
        const tz = row.dataset.tz;
        
        // Đặt giờ hiện tại cho dòng
        updateRowInputs(row, now.tz(tz));
        
        // Lắng nghe sự thay đổi trên từng ô input của dòng này
        const inputs = row.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                handleRowChange(row);
            });
            // Tự động thêm số 0 đằng trước (ví dụ gõ 5 thành 05) khi click chuột ra ngoài
            input.addEventListener('blur', (e) => {
                if (e.target.value.length === 1 && !e.target.classList.contains('t-year')) {
                    e.target.value = e.target.value.padStart(2, '0');
                }
            });
        });
    });
}

function updateRowInputs(row, dayjsObj) {
    row.querySelector('.t-day').value = dayjsObj.format('DD');
    row.querySelector('.t-month').value = dayjsObj.format('MM');
    row.querySelector('.t-year').value = dayjsObj.format('YYYY');
    row.querySelector('.t-hour').value = dayjsObj.format('HH');
    row.querySelector('.t-minute').value = dayjsObj.format('mm');
    row.querySelector('.t-second').value = dayjsObj.format('ss');
}

function handleRowChange(sourceRow) {
    const sourceTz = sourceRow.dataset.tz;
    
    // Đọc giá trị từ các ô
    const y = sourceRow.querySelector('.t-year').value;
    const m = sourceRow.querySelector('.t-month').value;
    const d = sourceRow.querySelector('.t-day').value;
    const h = sourceRow.querySelector('.t-hour').value;
    const min = sourceRow.querySelector('.t-minute').value;
    const s = sourceRow.querySelector('.t-second').value;
    
    // Kiểm tra xem có ô nào bị trống không
    if (!y || !m || !d || !h || !min || !s) return;
    
    // Tạo chuỗi chuẩn: YYYY-MM-DDTHH:mm:ss
    const timeStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${min.padStart(2, '0')}:${s.padStart(2, '0')}`;
    
    // Ép chuỗi đó vào múi giờ của vùng đang nhập
    const parsedTime = dayjs.tz(timeStr, sourceTz);
    
    // Nếu gõ ngày bậy bạ (như 32/13/2024) thì bỏ qua
    if (!parsedTime.isValid()) return;
    
    // Cập nhật kết quả cho 3 vùng còn lại
    document.querySelectorAll('.converter-row').forEach(row => {
        if (row !== sourceRow) {
            const targetTz = row.dataset.tz;
            updateRowInputs(row, parsedTime.tz(targetTz));
        }
    });
}

// ==============================================
// 5. XỬ LÝ PLANNING & GOOGLE SHEETS
// ==============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbztu8jIHgYSBJqJaWKPK3NjYz5_vZiHM2VMDISPF9f_Ncw12hew-3Jqe8MTQPdvBY6pUw/exec';

document.getElementById('btn-submit-plan').addEventListener('click', async () => {
    const startVal = document.getElementById('plan-start').value;
    const endVal = document.getElementById('plan-end').value;
    const msg = document.getElementById('plan-status-msg');
    
    if (!startVal || !endVal) {
        msg.textContent = 'Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc!';
        msg.className = 'status-msg error';
        return;
    }
    
    // Ép giờ người dùng nhập về chuẩn UTC (Quốc tế) để đồng bộ mọi quốc gia
    const startUTC = dayjs.tz(startVal, currentUser.tz).utc().format();
    const endUTC = dayjs.tz(endVal, currentUser.tz).utc().format();
    
    msg.textContent = 'Đang lưu lên Google Sheets...';
    msg.className = 'status-msg';
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                name: currentUser.name,
                startTime: startUTC,
                endTime: endUTC
            }),
            // mode: 'no-cors' không đọc được response json, dùng form bình thường fetch mặc định
        });
        
        // Cập nhật giao diện ngay
        msg.textContent = 'Đã lưu lịch thành công!';
        msg.className = 'status-msg success';
        loadScheduleBoard();
        
    } catch (err) {
        msg.textContent = 'Có lỗi xảy ra nhưng dữ liệu có thể đã được lưu (Do chính sách bảo mật Google). Vui lòng Tải lại bảng để kiểm tra.';
        msg.className = 'status-msg error';
        loadScheduleBoard(); // Vẫn tải lại để xem đã lên chưa
    }
});

async function loadScheduleBoard() {
    const listEl = document.getElementById('schedule-list');
    const overlapEl = document.getElementById('overlap-result');
    
    listEl.innerHTML = '<p style="text-align:center">Đang tải dữ liệu từ Google Sheets...</p>';
    overlapEl.innerHTML = '';
    
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color:#6b7280">Chưa có ai đăng ký lịch rảnh.</p>';
            return;
        }
        
        listEl.innerHTML = '';
        let maxStart = null;
        let minEnd = null;
        
        data.forEach(item => {
            // Lấy UTC từ Server, chuyển ngược về múi giờ của người đang xem web
            const startLocal = dayjs(item.startTime).tz(currentUser.tz);
            const endLocal = dayjs(item.endTime).tz(currentUser.tz);
            
            // Vẽ giao diện từng người
            const div = document.createElement('div');
            div.className = 'schedule-item';
            div.innerHTML = `
                <div class="s-name">${item.name}</div>
                <div class="s-time">${startLocal.format('HH:mm - DD/MM/YY')} ➔ ${endLocal.format('HH:mm - DD/MM/YY')}</div>
            `;
            listEl.appendChild(div);
            
            // Tính toán giao điểm (Overlap)
            if (!maxStart || dayjs(item.startTime).isAfter(dayjs(maxStart))) {
                maxStart = item.startTime;
            }
            if (!minEnd || dayjs(item.endTime).isBefore(dayjs(minEnd))) {
                minEnd = item.endTime;
            }
        });
        
        // Hiển thị kết quả tính toán giao điểm (chỉ khi có >= 2 người)
        if (data.length > 1) {
            if (dayjs(maxStart).isBefore(dayjs(minEnd))) {
                const overlapStartLocal = dayjs(maxStart).tz(currentUser.tz);
                const overlapEndLocal = dayjs(minEnd).tz(currentUser.tz);
                overlapEl.innerHTML = `
                    <div class="overlap-success">
                        <strong>🎉 Nhóm có điểm giao chung:</strong><br>
                        Gọi nhau từ: <b>${overlapStartLocal.format('HH:mm - DD/MM/YYYY')}</b><br>
                        Đến hết lúc: <b>${overlapEndLocal.format('HH:mm - DD/MM/YYYY')}</b>
                    </div>
                `;
            } else {
                overlapEl.innerHTML = `
                    <div class="overlap-fail">
                        <strong>❌ Rất tiếc, các thành viên hiện không có khoảng thời gian nào trùng nhau.</strong>
                    </div>
                `;
            }
        }
        
    } catch (err) {
        listEl.innerHTML = '<p class="status-msg error">Không thể tải dữ liệu. Lỗi mạng hoặc Google Sheets chưa phản hồi.</p>';
    }
}

document.getElementById('btn-refresh-board').addEventListener('click', loadScheduleBoard);

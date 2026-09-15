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
    
    // Khởi động đồng hồ
    startClocks();
    
    // Đặt giá trị mặc định cho converter
    initConverter();
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

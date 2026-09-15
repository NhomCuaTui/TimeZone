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
const timeInputs = document.querySelectorAll('.time-input');

function initConverter() {
    // Đặt giờ hiện tại cho tất cả các ô input theo đúng múi giờ của vùng đó
    const now = dayjs();
    timeInputs.forEach(input => {
        const tz = input.dataset.tz;
        // Format bắt buộc của thẻ <input type="datetime-local"> là YYYY-MM-DDTHH:mm
        input.value = now.tz(tz).format('YYYY-MM-DDTHH:mm');
    });
}

// Bắt sự kiện khi người dùng sửa đổi giờ ở BẤT KỲ ô nào
timeInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        const changedValue = e.target.value;
        const sourceTz = e.target.dataset.tz;
        
        if (!changedValue) return; // Bỏ qua nếu người dùng xóa trắng ô

        // Phân tích thời gian người dùng vừa nhập, gắn nó với múi giờ của ô đó
        // Ví dụ: Nhập 8h sáng ở ô VN, hệ thống sẽ hiểu là 8h sáng giờ VN
        const parsedTime = dayjs.tz(changedValue, sourceTz);

        // Cập nhật lại 3 ô còn lại
        timeInputs.forEach(otherInput => {
            if (otherInput !== e.target) {
                const targetTz = otherInput.dataset.tz;
                // Ép giờ vừa đổi sang múi giờ của ô đích và hiển thị
                otherInput.value = parsedTime.tz(targetTz).format('YYYY-MM-DDTHH:mm');
            }
        });
    });
});

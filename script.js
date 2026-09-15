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
const API_URL = 'https://script.google.com/macros/s/AKfycbw9_obYD9-zOhE_YHlbjFK-WCLATgd4o0xghVz1RrmFzJCAHmaYE4ZZ_-CdRbgrL23T2Q/exec';

// Tải thư viện Google Charts
google.charts.load('current', {'packages':['timeline']});

// Màu sắc cố định cho từng người
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
    
    // Kiểm tra giờ kết thúc phải sau giờ bắt đầu
    const startObj = dayjs.tz(startVal, currentUser.tz);
    const endObj = dayjs.tz(endVal, currentUser.tz);
    if(endObj.isBefore(startObj)) {
        msg.textContent = 'Giờ kết thúc phải sau giờ bắt đầu!';
        msg.className = 'status-msg error';
        return;
    }
    
    const startUTC = startObj.utc().format();
    const endUTC = endObj.utc().format();
    
    msg.textContent = 'Đang lưu lên Google Sheets...';
    msg.className = 'status-msg';
    
    try {
        await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'add',
                name: currentUser.name,
                startTime: startUTC,
                endTime: endUTC
            })
        });
        
        msg.textContent = 'Đã lưu lịch thành công!';
        msg.className = 'status-msg success';
        loadScheduleBoard();
        
    } catch (err) {
        msg.textContent = 'Đã gửi yêu cầu lưu, vui lòng Tải lại bảng để kiểm tra.';
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

// Bắt buộc Google Charts render vào window object để gọi từ HTML nếu cần
window.deleteSchedule = deleteSchedule;

async function loadScheduleBoard() {
    const myListEl = document.getElementById('my-schedule-list');
    const chartDiv = document.getElementById('chart_div');
    
    myListEl.innerHTML = '<p>Đang tải dữ liệu...</p>';
    chartDiv.innerHTML = '<p style="text-align:center;">Đang vẽ biểu đồ...</p>';
    
    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();
        
        // Lọc bỏ các lịch trong quá khứ (EndTime < Now)
        const nowUTC = dayjs().utc();
        const futureData = rawData.filter(item => {
            return dayjs(item.endTime).isAfter(nowUTC);
        });
        
        if (!futureData || futureData.length === 0) {
            chartDiv.innerHTML = '<p style="text-align:center; color:#6b7280; padding:2rem 0;">Chưa có ai đăng ký lịch rảnh trong tương lai.</p>';
            myListEl.innerHTML = '<p style="color:#6b7280;">Bạn chưa có lịch rảnh nào.</p>';
            return;
        }
        
        // --- 1. VẼ BIỂU ĐỒ GOOGLE CHARTS ---
        google.charts.setOnLoadCallback(() => {
            const chart = new google.visualization.Timeline(chartDiv);
            const dataTable = new google.visualization.DataTable();
            
            dataTable.addColumn({ type: 'string', id: 'Tên' });
            dataTable.addColumn({ type: 'string', id: 'Màu' }); // Dummy cột để custom color dễ hơn nếu cần, nhưng Timeline map theo Tên
            dataTable.addColumn({ type: 'date', id: 'Start' });
            dataTable.addColumn({ type: 'date', id: 'End' });
            
            const chartRows = [];
            const activeColors = [];
            
            // Nhóm màu sắc theo những người thực sự có lịch để biểu đồ gán đúng màu
            const uniqueNamesInChart = [...new Set(futureData.map(d => d.name))];
            uniqueNamesInChart.forEach(name => {
                activeColors.push(userColors[name] || '#9ca3af'); // Màu mặc định xám nếu thiếu
            });

            futureData.forEach(item => {
                // Parse UTC và chuyển về giờ địa phương của người xem để hiển thị lên trục tọa độ biểu đồ
                const startLocal = dayjs(item.startTime).tz(currentUser.tz).toDate();
                const endLocal = dayjs(item.endTime).tz(currentUser.tz).toDate();
                
                chartRows.push([
                    item.name,
                    item.name, // Dùng tên làm label tooltip
                    startLocal,
                    endLocal
                ]);
            });
            
            dataTable.addRows(chartRows);
            
            const options = {
                timeline: { showRowLabels: true },
                colors: activeColors,
                hAxis: {
                    format: 'HH:mm (dd/MM)'
                },
                height: (uniqueNamesInChart.length * 50) + 70 // Tự động co giãn chiều cao
            };
            
            chart.draw(dataTable, options);
        });
        
        // --- 2. RENDER DANH SÁCH LỊCH CỦA CÁ NHÂN (ĐỂ XÓA) ---
        const myData = futureData.filter(item => item.name === currentUser.name);
        myListEl.innerHTML = '';
        
        if (myData.length === 0) {
            myListEl.innerHTML = '<p style="color:#6b7280;">Bạn chưa có lịch rảnh nào.</p>';
        } else {
            // Sort theo thời gian bắt đầu
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
        chartDiv.innerHTML = '<p class="status-msg error">Lỗi tải dữ liệu. Hãy kiểm tra kết nối mạng.</p>';
    }
}

document.getElementById('btn-refresh-board').addEventListener('click', loadScheduleBoard);

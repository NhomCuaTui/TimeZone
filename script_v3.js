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
}

// ==============================================
// 3. KHỞI TẠO TẤT CẢ FLATPICKR GLOBALLY (CHỈ 1 LẦN)
// ==============================================
window.isUpdatingConverter = false;
try {
    // 1. Planning Flatpickrs
    flatpickr("#plan-start", { disableMobile: true, enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, altInput: true, altInputClass: 'flatpickr-input altInput', altFormat: "d/m/Y H:i" });
    flatpickr("#plan-end", { disableMobile: true, enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true, altInput: true, altInputClass: 'flatpickr-input altInput', altFormat: "d/m/Y H:i" });
    
    // 2. Converter Flatpickrs (GIỐNG HỆT PLANNING)
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
                const input = instance.element;
                const row = input.closest('.converter-row');
                const tz = row.dataset.tz;
                
                const localDate = selectedDates[0];
                const yyyy = localDate.getFullYear();
                const mm = String(localDate.getMonth() + 1).padStart(2, '0');
                const dd = String(localDate.getDate()).padStart(2, '0');
                const hh = String(localDate.getHours()).padStart(2, '0');
                const min = String(localDate.getMinutes()).padStart(2, '0');

                const isoString = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
                const realDayjs = dayjs(isoString).tz(tz, true);
                
                document.querySelectorAll('.converter-row').forEach(otherRow => {
                    if (otherRow !== row) {
                        const otherTz = otherRow.dataset.tz;
                        const otherInput = otherRow.querySelector('.converter-fp');
                        if (otherInput && otherInput._flatpickr) {
                            const targetTzDayjs = realDayjs.tz(otherTz);
                            const otherFakeDate = new Date(
                                parseInt(targetTzDayjs.format("YYYY"), 10),
                                parseInt(targetTzDayjs.format("MM"), 10) - 1,
                                parseInt(targetTzDayjs.format("DD"), 10),
                                parseInt(targetTzDayjs.format("HH"), 10),
                                parseInt(targetTzDayjs.format("mm"), 10)
                            );
                            otherInput._flatpickr.setDate(otherFakeDate, false);
                        }
                    }
                });
            } catch(e) {
                console.error("Lỗi quy đổi giờ:", e);
                alert("LỖI QUY ĐỔI GIỜ: " + e.message);
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
// 4. XỬ LÝ TIME CONVERTER (CHỈ SET VALUE, KHÔNG INIT LẠI)
// ==============================================
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
        
        const startObj = dayjs(startIso).tz(currentUser.tz, true);
        const endObj = dayjs(endIso).tz(currentUser.tz, true);
        
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

// ==============================================
// 6. XỬ LÝ GALLERY (THƯ VIỆN ẢNH)
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
        
        try {
            const compressedBase64 = await compressImage(file, 1200, 1200, 0.8);
            showGalleryMsg("Đang tải ảnh lên hệ thống...", false);
            
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
                loadGallery();
            } else {
                showGalleryMsg("Lỗi: " + result.error, true);
            }
        } catch (error) {
            console.error(error);
            showGalleryMsg("Đã xảy ra lỗi khi tải ảnh.", true);
        }
        
        fileInput.value = '';
    });
}

if (btnRefreshGallery) {
    btnRefreshGallery.addEventListener('click', loadGallery);
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
let currentImageIndex = 0;
const IMAGES_PER_PAGE = 20;

async function loadGallery() {
    if (!galleryGrid) return;
    galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Đang tải ảnh...</p>';
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) loadMoreContainer.style.display = 'none';
    
    try {
        const response = await fetch(API_URL + "?action=getGallery");
        const images = await response.json();
        
        if (!images || images.length === 0) {
            galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted);">Chưa có ảnh nào trong thư viện.</p>';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }
        
        images.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        allImages = images;
        currentImageIndex = 0;
        galleryGrid.innerHTML = '';
        
        renderNextImages();
        
    } catch (error) {
        galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--danger);">Không thể tải thư viện ảnh.</p>';
    }
}

function renderNextImages() {
    if (!galleryGrid || !allImages.length) return;
    
    const nextLimit = Math.min(currentImageIndex + IMAGES_PER_PAGE, allImages.length);
    
    for (let i = currentImageIndex; i < nextLimit; i++) {
        const img = allImages[i];
        const timeFormatted = dayjs(img.timestamp).tz(currentUser.tz).format('HH:mm DD/MM/YYYY');
        const directImageUrl = "https://lh3.googleusercontent.com/d/" + img.id;
        
        const div = document.createElement('div');
        div.className = 'gallery-item';
        div.innerHTML = `
            <img src="${directImageUrl}" alt="Photo by ${img.name}" loading="lazy" onerror="this.src='https://placehold.co/400x400/1e293b/fff?text=Lỗi+tải+ảnh'">
            <div class="gallery-overlay">
                <button class="btn-delete-img" data-id="${img.id}" title="Xóa ảnh này">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="gallery-info">
                    <div class="gallery-uploader">${img.name}</div>
                    <div class="gallery-time">${timeFormatted}</div>
                </div>
            </div>
        `;
        
        div.querySelector('.btn-delete-img').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm('Bạn có chắc chắn muốn xóa ảnh này không? Tất cả mọi người đều không thấy nữa.')) return;
            
            div.style.opacity = '0.5';
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'deleteImage', id: img.id })
                });
                const resData = await res.json();
                if(resData.success) {
                    div.remove();
                } else {
                    alert("Lỗi khi xóa: " + resData.error);
                    div.style.opacity = '1';
                }
            } catch (error) {
                alert("Lỗi mạng khi xóa ảnh!");
                div.style.opacity = '1';
            }
        });
        
        div.addEventListener('click', () => {
            window.open(directImageUrl, '_blank');
        });
        
        galleryGrid.appendChild(div);
    }
    
    currentImageIndex = nextLimit;
    
    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        if (currentImageIndex >= allImages.length) {
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

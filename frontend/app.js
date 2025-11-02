// ==================================================================
// == QUAN TRỌNG: HÃY ĐẢM BẢO 3 DÒNG NÀY LÀ CỦA BẠN ==
// ==================================================================
const SUPABASE_URL = 'https://iezcijerbmsgsxilsixo.supabase.co'; // Giữ nguyên URL của bạn
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllemNpamVyYm1zZ3N4aWxzaXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDg5MjAsImV4cCI6MjA3NzEyNDkyMH0.g_VIc4KIpJhKutJ3rBCbKB02gKcjhmaGMsvbG9rjcUk'; // Giữ nguyên Key ANNON của bạn
const API_BASE_URL = 'https://trondetn-api.onrender.com'; // Giữ nguyên URL API Render của bạn
// ==================================================================

const { createClient } = window.supabase;

let supabase;
try {
    if (SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
        console.warn("app.js: Supabase URL chưa được cấu hình.");
    }
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error("Lỗi khởi tạo Supabase:", error.message);
}

// --- Hàm chung ---
function showMessage(element, message, isError = false) {
    if (element) {
        element.textContent = message;
        element.className = isError ? 'error' : 'success';
    }
}

// --- Xử lý Session ---
async function checkUserSession() {
    if (!supabase) return;

    const { data: { session }, error } = await supabase.auth.getSession();
    
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/';
    
    if (session) { // Đã đăng nhập
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        } else {
            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) userEmailEl.textContent = session.user.email;
        }
    } else { // Chưa đăng nhập
        if (!isAuthPage && window.location.pathname.endsWith('dashboard.html')) {
             window.location.href = 'index.html';
        }
    }
}

// --- (SỬA LẠI HOÀN TOÀN) Xử lý Đăng ký ---
async function handleSignUp(msgEl) {
    // 1. Lấy tất cả dữ liệu từ form
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const dobDay = document.getElementById('dob-day').value;
    const dobMonth = document.getElementById('dob-month').value;
    const dobYear = document.getElementById('dob-year').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;

    // 2. Kiểm tra (Validation)
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showMessage(msgEl, 'Lỗi: Vui lòng điền đầy đủ các trường bắt buộc.', true);
        return;
    }
    if (password !== confirmPassword) {
        showMessage(msgEl, 'Lỗi: Mật khẩu và xác nhận mật khẩu không khớp.', true);
        return;
    }
    if (password.length < 6) {
        showMessage(msgEl, 'Lỗi: Mật khẩu phải có ít nhất 6 ký tự.', true);
        return;
    }

    // 3. Tạo ngày sinh (DOB)
    const dob = `${dobYear}-${dobMonth}-${dobDay}`;

    // 4. Bắt đầu quá trình đăng ký
    showMessage(msgEl, 'Đang xử lý...', false);

    try {
        // (SỬA) Gửi TẤT CẢ thông tin lên AUTH
        // Trigger của Supabase (Bước 1) sẽ tự động sao chép qua bảng 'profiles'
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                // "data" là nơi Supabase cho phép chúng ta đính kèm
                // thông tin Họ, Tên, v.v.
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    gender: gender,
                    dob: dob
                }
            }
        });

        if (error) {
            throw error; // Ném lỗi (sẽ được bắt ở dưới)
        }
        
        // 5. Thành công
        showMessage(msgEl, 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', false);

    } catch (error) {
        // 6. Xử lý tất cả các lỗi
        if (error.message === 'User already registered') {
            showMessage(msgEl, 'Lỗi đăng ký: Tài khoản này đã đăng ký, vui lòng chuyển sang đăng nhập.', true);
        } else {
            showMessage(msgEl, `Lỗi: ${error.message}`, true);
        }
    }
}


// --- Xử lý Đăng nhập ---
async function handleLogin(email, password, msgEl) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        if (error.message === 'Email not confirmed') {
            showMessage(msgEl, 'Lỗi đăng nhập: Email chưa xác thực. Vui lòng kiểm tra email của bạn.', true);
        } else if (error.message === 'Invalid login credentials') {
            showMessage(msgEl, 'Lỗi đăng nhập: Sai email hoặc mật khẩu.', true);
        } else {
            showMessage(msgEl, `Lỗi đăng nhập: ${error.message}`, true);
        }
    } else {
        window.location.href = 'dashboard.html';
    }
}

// --- Xử lý Đăng xuất ---
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert(`Lỗi đăng xuất: ${error.message}`);
    else window.location.href = 'index.html';
}

// --- Xử lý Upload (Giai đoạn 1) ---
async function handleFileUpload(file, msgEl, btnEl, spinnerEl) {
    if (API_BASE_URL.includes('YOUR_RENDER_API_URL')) {
         showMessage(msgEl, 'Lỗi: API Backend chưa được cấu hình trong app.js', true);
         return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showMessage(msgEl, 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', true);
        window.location.href = 'index.html';
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    showMessage(msgEl, 'Đang tải lên và xử lý...', false);
    btnEl.disabled = true;
    spinnerEl.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(msgEl, `${result.message}. Đã lưu ${result.questions_saved} câu hỏi.`, false);
        } else {
            showMessage(msgEl, `Lỗi: ${result.error || 'Lỗi không xác định từ server'}`, true);
        }
        
    } catch (error) {
        showMessage(msgEl, `Lỗi kết nối API: ${error.message}`, true);
    } finally {
        btnEl.disabled = false;
        spinnerEl.style.display = 'none';
        document.getElementById('file-input').value = '';
    }
}

// --- Xử lý Xóa Kho ---
async function handleClearDatabase(msgEl, btnEl) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showMessage(msgEl, 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', true);
        return;
    }

    showMessage(msgEl, 'Đang xóa dữ liệu cũ...', false);
    btnEl.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/clear`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showMessage(msgEl, result.message, false);
        } else {
            showMessage(msgEl, `Lỗi: ${result.error}`, true);
        }
        
    } catch (error) {
        showMessage(msgEl, `Lỗi kết nối API: ${error.message}. Thử lại.`, true);
    } finally {
        btnEl.disabled = false;
    }
}

// --- Xử lý Trộn đề (Giai đoạn 2) ---
async function handleMixRequest(msgEl, btnEl, downloadBtnEl) {
    const numTests = document.getElementById('num-tests-input').value;
    const baseName = document.getElementById('base-name-input').value || 'VLT';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showMessage(msgEl, 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', true);
        return;
    }

    showMessage(msgEl, 'Đang trộn đề... Việc này có thể mất một phút...', false);
    btnEl.disabled = true;
    downloadBtnEl.style.display = 'none'; 

    try {
        const response = await fetch(`${API_BASE_URL}/mix`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                num_tests: numTests,
                base_name: baseName
            })
        });

        if (response.ok) {
            const contentDisposition = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
            let downloadName = `Bo_de_tron_${baseName}.zip`; 
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    downloadName = filenameMatch[1];
                }
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            downloadBtnEl.href = downloadUrl;
            downloadBtnEl.download = downloadName; 
            
            downloadBtnEl.style.display = 'inline-block';
            showMessage(msgEl, `Đã trộn xong ${numTests} đề! Nhấn nút 'Tải về' để lưu.`, false);

        } else {
            const result = await response.json();
            showMessage(msgEl, `Lỗi: ${result.error || 'Lỗi không xác định từ server'}`, true);
        }

    } catch (error) {
        showMessage(msgEl, `Lỗi kết nối API: ${error.message}. Vui lòng đợi 30 giây và thử lại.`, true);
    } finally {
        btnEl.disabled = false; 
    }
}

// --- (MỚI) Hàm điền ngày tháng năm sinh ---
function populateDateOfBirth() {
    const daySelect = document.getElementById('dob-day');
    const monthSelect = document.getElementById('dob-month');
    const yearSelect = document.getElementById('dob-year');

    if (!daySelect || !monthSelect || !yearSelect) return; // Chỉ chạy nếu ở trang register.html

    // Điền Ngày (mặc định 1)
    daySelect.options.add(new Option('Ngày', '01'));
    for (let i = 1; i <= 31; i++) {
        daySelect.options.add(new Option(i, (i < 10 ? '0' + i : i))); // Thêm '0' cho ngày < 10
    }
    // Điền Tháng (mặc định 1)
    monthSelect.options.add(new Option('Tháng', '01'));
    for (let i = 1; i <= 12; i++) {
        monthSelect.options.add(new Option(i, (i < 10 ? '0' + i : i))); // Thêm '0' cho tháng < 10
    }
    // Điền Năm (mặc định 2000)
    const currentYear = new Date().getFullYear();
    yearSelect.options.add(new Option('Năm', '2000'));
    for (let i = currentYear - 18; i >= currentYear - 100; i--) { // Giới hạn tuổi (ví dụ: > 18)
        yearSelect.options.add(new Option(i, i));
    }
}


// --- Gán sự kiện khi DOM tải xong ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); // Kiểm tra session
    populateDateOfBirth(); // (MỚI) Điền ngày tháng năm sinh

    // --- Gán sự kiện cho 2 trang riêng biệt ---
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const authMessage = document.getElementById('auth-message');
    
    // Chỉ gán sự kiện ĐĂNG NHẬP (trên trang index.html)
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password, authMessage);
        });
    }
    
    // Chỉ gán sự kiện ĐĂNG KÝ (trên trang register.html)
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            // Chỉ cần truyền vào msgEl, hàm sẽ tự lấy các giá trị
            handleSignUp(authMessage); 
        });
    }

    // --- Trang Dashboard (dashboard.html) ---
    const logoutBtn = document.getElementById('logout-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const uploadMessage = document.getElementById('upload-message');
    const uploadSpinner = document.getElementById('upload-spinner');
    const clearDbBtn = document.getElementById('clear-db-btn');
    const mixBtn = document.getElementById('mix-btn');
    const downloadBtn = document.getElementById('download-btn');
    const mixMessage = document.getElementById('mix-message');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            const file = fileInput.files[0];
            if (!file) {
                showMessage(uploadMessage, 'Vui lòng chọn một tệp .docx', true);
                return;
            }
            handleFileUpload(file, uploadMessage, uploadBtn, uploadSpinner);
        });
    }

    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
            if (!confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ kho câu hỏi hiện tại không? Hành động này không thể hoàn tác.')) {
                return;
            }
            handleClearDatabase(uploadMessage, clearDbBtn);
        });
    }
    
    if (mixBtn) {
        mixBtn.addEventListener('click', () => {
            handleMixRequest(mixMessage, mixBtn, downloadBtn);
        });
    }
});

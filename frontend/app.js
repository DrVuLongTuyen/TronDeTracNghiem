// ==================================================================
// == CẤU HÌNH SUPABASE VÀ API (ĐÃ LÀM Ở GIAI ĐOẠN 1) ==
// ==================================================================
const SUPABASE_URL = 'https://iezcijerbmsgsxilsixo.supabase.co'; // Giữ nguyên URL của bạn
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlleGNpamllemJtc2dzeGlsc2l4byIsIm9sZSI6ImFub24iLCJpYXQiOjE3MjkzODIzODMsImV4cCI6MjA0NDk1ODM4M30.zMv_s09Rk_nK-X-sS8oYhDo-MvyOVP0Eafk-X5F0mIY'; // Giữ nguyên Key ANNON của bạn
const API_BASE_URL = 'https://trondetn-api.onrender.com'; // Giữ nguyên URL API Render của bạn
// ==================================================================

let supabase;
try {
    if (SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
        console.warn("app.js: Supabase URL chưa được cấu hình.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

    if (session) { // Đã đăng nhập
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        } else {
            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) userEmailEl.textContent = session.user.email;
        }
    } else { // Chưa đăng nhập
        if (!isAuthPage) {
            window.location.href = 'index.html';
        }
    }
}

// --- Xử lý Đăng nhập / Đăng ký ---
async function handleSignUp(email, password, msgEl) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        showMessage(msgEl, `Lỗi đăng ký: ${error.message}`, true);
    } else {
        showMessage(msgEl, 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', false);
    }
}

async function handleLogin(email, password, msgEl) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        showMessage(msgEl, `Lỗi đăng nhập: ${error.message}`, true);
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

// --- (MỚI) Xử lý Trộn đề (Giai đoạn 2) ---
async function handleMixRequest(msgEl, btnEl, downloadBtnEl) {
    const numTests = document.getElementById('num-tests-input').value;
    const baseName = document.getElementById('base-name-input').value || 'VLT';

    // Lấy token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showMessage(msgEl, 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', true);
        return;
    }

    showMessage(msgEl, 'Đang trộn đề... Việc này có thể mất một phút...', false);
    btnEl.disabled = true;
    downloadBtnEl.style.display = 'none'; // Ẩn nút tải về cũ

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
            // Nhận file .zip về
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            // Cập nhật link cho nút tải về
            downloadBtnEl.href = downloadUrl;
            downloadBtnEl.download = `Bo_${numTests}_de_tron_${baseName}.zip`;

            // Hiển thị nút tải về
            downloadBtnEl.style.display = 'inline-block';
            showMessage(msgEl, `Đã trộn xong ${numTests} đề! Nhấn nút 'Tải về' để lưu.`, false);

        } else {
            // Xử lý lỗi từ server (ví dụ: không có câu hỏi)
            const result = await response.json();
            showMessage(msgEl, `Lỗi: ${result.error || 'Lỗi không xác định từ server'}`, true);
        }

    } catch (error) {
        // Xử lý lỗi mạng (như API "ngủ")
        showMessage(msgEl, `Lỗi kết nối API: ${error.message}. Vui lòng đợi 30 giây và thử lại.`, true);
    } finally {
        btnEl.disabled = false; // Kích hoạt lại nút "Bắt đầu trộn"
    }
}


// --- Gán sự kiện khi DOM tải xong ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); // Kiểm tra session mỗi khi tải trang

    // --- Trang Đăng nhập (index.html) ---
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const authMessage = document.getElementById('auth-message');

    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password, authMessage);
        });
    }
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleSignUp(email, password, authMessage);
        });
    }

    // --- Trang Dashboard (dashboard.html) ---
    const logoutBtn = document.getElementById('logout-btn');

    // (Giai đoạn 1)
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const uploadMessage = document.getElementById('upload-message');
    const uploadSpinner = document.getElementById('upload-spinner');

    // (Giai đoạn 2)
    const mixBtn = document.getElementById('mix-btn');
    const downloadBtn = document.getElementById('download-btn');
    const mixMessage = document.getElementById('mix-message');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Gán sự kiện cho Giai đoạn 1
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

    // Gán sự kiện cho Giai đoạn 2
    if (mixBtn) {
        mixBtn.addEventListener('click', () => {
            handleMixRequest(mixMessage, mixBtn, downloadBtn);
        });
    }
});

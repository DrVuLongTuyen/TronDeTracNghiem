// ==================================================================
// == QUAN TRỌNG: THAY THẾ 2 GIÁ TRỊ DƯỚI ĐÂY (Ở BƯỚC 4.5) ==
// ==================================================================
const SUPABASE_URL = 'https://iezcijerbmsgsxilsixo.supabase.co'; // Sẽ thay thế ở Bước 4.5
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllemNpamVyYm1zZ3N4aWxzaXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDg5MjAsImV4cCI6MjA3NzEyNDkyMH0.g_VIc4KIpJhKutJ3rBCbKB02gKcjhmaGMsvbG9rjcUk'; // Sẽ thay thế ở Bước 4.5

// GIÁ TRỊ NÀY SẼ ĐƯỢC THAY THẾ SAU KHI DEPLOY BACKEND (Ở BƯỚC 6)
const API_BASE_URL = 'https://trondetn-api.onrender.com'; 
// ==================================================================

let supabase;
try {
    if (SUPABASE_URL.includes('https://iezcijerbmsgsxilsixo.supabase.co')) {
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

// --- Xử lý Upload ---
async function handleFileUpload(file, msgEl, btnEl, spinnerEl) {
    if (API_BASE_URL.includes('https://trondetn-api.onrender.com')) {
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
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            },
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
        document.getElementById('file-input').value = ''; // Xóa tệp đã chọn
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
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const uploadMessage = document.getElementById('upload-message');
    const uploadSpinner = document.getElementById('upload-spinner');

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

});



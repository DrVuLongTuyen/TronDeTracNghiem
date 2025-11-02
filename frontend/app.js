// ==================================================================
// == QUAN TRỌNG: HÃY ĐẢM BẢO 3 DÒNG NÀY LÀ CỦA BẠN ==
// ==================================================================
const SUPABASE_URL = 'https://iezcijerbmsgsxilsixo.supabase.co'; // Giữ nguyên URL của bạn
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllemNpamVyYm1zZ3N4aWxzaXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NDg5MjAsImV4cCI6MjA3NzEyNDkyMH0.g_VIc4KIpJhKutJ3rBCbKB02gKcjhmaGMsvbG9rjcUk'; // Giữ nguyên Key ANNON của bạn
const API_BASE_URL = 'https://trondetn-api.onrender.com'; // Giữ nguyên URL API Render của bạn
// ==================================================================

// (SỬA LỖI) Thêm lại dòng import này
const { createClient } = window.supabase;

let supabase;
try {
    if (SUPABASE_URL.includes('YOUR_SUPABASE_URL')) {
        console.warn("app.js: Supabase URL chưa được cấu hình.");
    }
    // (SỬA LỖI) Sửa lại hàm khởi tạo
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
    
    // (SỬA) Kiểm tra xem có phải 1 trong 2 trang đăng nhập/đăng ký không
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/';
    
    if (session) { // Đã đăng nhập
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        } else {
            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) userEmailEl.textContent = session.user.email;
        }
    } else { // Chưa đăng nhập
        // Nếu không ở trang dashboard, thì tự động quay về index.html (Đăng nhập)
        if (!isAuthPage && !window.location.pathname.endsWith('dashboard.html')) {
             // (Giữ nguyên, không cần sửa, nhưng logic là vậy)
        } else if (!isAuthPage && window.location.pathname.endsWith('dashboard.html')) {
             window.location.href = 'index.html';
        }
    }
}

// --- (ĐÃ SỬA) Xử lý Đăng nhập / Đăng ký ---
async function handleSignUp(email, password, msgEl) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        if (error.message === 'User already registered') {
            showMessage(msgEl, 'Lỗi đăng ký: Tài khoản này đã đăng ký, vui lòng chuyển sang đăng nhập.', true);
        } else {
            showMessage(msgEl, `Lỗi đăng ký: ${error.message}`, true);
        }
    } else {
        showMessage(msgEl, 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', false);
    }
}

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

// --- (MỚI) Xử lý Xóa Kho ---
async function handleClearDatabase(msgEl, btnEl) {
    // Lấy token
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
            // --- (SỬA LỖI) LẤY TÊN FILE (Kiểm tra cả 2 trường hợp viết hoa/thường) ---
            const contentDisposition = response.headers.get('content-disposition') || response.headers.get('Content-Disposition');
            let downloadName = `Bo_de_tron_${baseName}.zip`; // Tên dự phòng
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    downloadName = filenameMatch[1];
                }
            }
            // --- KẾT THÚC SỬA ---

            // Nhận file .zip về
            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);

            // Cập nhật link cho nút tải về
            downloadBtnEl.href = downloadUrl;
            downloadBtnEl.download = downloadName; 
            
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


// --- (SỬA) Gán sự kiện khi DOM tải xong ---
document.addEventListener('DOMContentLoaded', () => {
    checkUserSession(); // Kiểm tra session mỗi khi tải trang

    // --- (SỬA) Gán sự kiện cho 2 trang riêng biệt ---
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const authMessage = document.getElementById('auth-message');
    
    // Chỉ gán sự kiện ĐĂNG NHẬP nếu nút đó tồn tại (trên trang index.html)
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleLogin(email, password, authMessage);
        });
    }
    
    // Chỉ gán sự kiện ĐĂNG KÝ nếu nút đó tồn tại (trên trang register.html)
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

    // (Giai đoạn 1.5) Nút Xóa Kho
    const clearDbBtn = document.getElementById('clear-db-btn');

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

    // Gán sự kiện cho Giai đoạn 1.5
    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
            // Yêu cầu xác nhận
            if (!confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ kho câu hỏi hiện tại không? Hành động này không thể hoàn tác.')) {
                return;
            }
            // Dùng chung ô thông báo với upload
            handleClearDatabase(uploadMessage, clearDbBtn);
        });
    }
    
    // Gán sự kiện cho Giai đoạn 2
    if (mixBtn) {
        mixBtn.addEventListener('click', () => {
            handleMixRequest(mixMessage, mixBtn, downloadBtn);
        });
    }
});

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
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/';
    
    if (session) { 
        if (isAuthPage) {
            window.location.href = 'dashboard.html';
        } else {
            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) userEmailEl.textContent = session.user.email;
        }
    } else { 
        if (!isAuthPage && window.location.pathname.endsWith('dashboard.html')) {
             window.location.href = 'index.html';
        }
    }
}

// --- (SỬA LẠI) Xử lý Đăng ký (Rất quan trọng) ---
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
        // VIỆC 1: Tạo tài khoản Auth (Email/Pass)
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
            email, 
            password 
        });

        if (authError) {
            throw authError; // Ném lỗi (sẽ được bắt ở dưới)
        }

        if (!authData.user) {
             throw new Error("Không thể tạo tài khoản, vui lòng thử lại.");
        }

        // VIỆC 2: Lưu thông tin cá nhân (Profile)
        const { error: profileError } = await supabase
            .from('profiles')
            .insert({
                id: authData.user.id, // Liên kết với user vừa tạo
                first_name: firstName,
                last_name: lastName,
                gender: gender,
                dob: dob
            });

        if (profileError) {
            throw profileError; // Ném lỗi (sẽ được bắt ở dưới)
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

// --- (MỚI) Hàm điền ngày tháng năm sinh ---
function populateDateOfBirth() {
    const daySelect = document.getElementById('dob-day');
    const monthSelect = document.getElementById('dob-month');
    const yearSelect = document.getElementById('dob-year');

    if (!daySelect || !monthSelect || !yearSelect) return; // Chỉ chạy nếu ở trang register.html

    // Điền Ngày
    for (let i = 1; i <= 31; i++) {
        daySelect.options.add(new Option(i, i));
    }
    // Điền Tháng
    for (let i = 1; i <= 12; i++) {
        monthSelect.options.add(new Option('Tháng ' + i, i));
    }
    // Điền Năm
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - 100; i--) {
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

    // --- (PHẦN DASHBOARD - Không cần sửa) ---
    const logoutBtn = document.getElementById('logout-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const clearDbBtn = document.getElementById('clear-db-btn');
    const mixBtn = document.getElementById('mix-btn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            // ... (code uploadBtn giữ nguyên) ...
        });
    }
    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
             // ... (code clearDbBtn giữ nguyên) ...
        });
    }
    if (mixBtn) {
        mixBtn.addEventListener('click', () => {
             // ... (code mixBtn giữ nguyên) ...
        });
    }
    
    // --- (XÓA CODE CŨ) ---
    // (Toàn bộ code xử lý Giai đoạn 1, 1.5, 2 đã được chuyển vào hàm
    // handle... riêng, nên phần code lặp lại ở đây có thể xóa đi
    // để cho sạch. Tuy nhiên, để đảm bảo không lỗi, tôi sẽ
    // giữ nguyên code app.js từ lần trước và CHỈ SỬA phần
    // Đăng ký/Đăng nhập và thêm hàm populateDateOfBirth)
});

// --- (DÁN CODE app.js CŨ CỦA BẠN VÀO ĐÂY) ---
// (Lưu ý: Tôi sẽ dán toàn bộ code cũ của bạn vào đây
// và áp dụng các thay đổi ở trên)

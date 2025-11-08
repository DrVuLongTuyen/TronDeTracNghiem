// ====== TỆP APP.JS CHÍNH (ĐÃ CHIA NHỎ) ======
import { SUPABASE_URL, SUPABASE_ANON_KEY, createClient } from './constants.js';
import { showMessage, populateDateOfBirth } from './ui.js';
import { checkUserSession } from './session.js';
// (SỬA V30) Import thêm handleChangePassword
import { handleLogin, handleSignUp, handleLogout, handleChangePassword } from './auth.js';
import { handleFileUpload, handleClearDatabase, handleMixRequest, handleLogoUpload, fetchQuestions } from './api.js';

// --- 1. Khởi tạo Supabase ---
let supabase;
try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
    console.error("Lỗi khởi tạo Supabase:", error.message);
    alert("Lỗi nghiêm trọng: Không thể tải thư viện Supabase. Vui lòng kiểm tra kết nối mạng.");
}

// --- 2. Gán sự kiện khi DOM tải xong ---
document.addEventListener('DOMContentLoaded', () => {
    if (!supabase) return; 
    
    checkUserSession(supabase); 
    populateDateOfBirth();      

    // --- Gán sự kiện cho trang Đăng nhập / Đăng ký ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authMessage = document.getElementById('auth-message');
    
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            handleLogin(supabase, authMessage);
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            handleSignUp(supabase, authMessage); 
        });
    }
    
    // --- (MỚI V30) Gán sự kiện cho trang Đổi Mật khẩu ---
    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // dùng authMessage (vì ID giống nhau)
            handleChangePassword(supabase, authMessage); 
        });
    }
    // === KẾT THÚC V30 ===

    
    // --- Gán sự kiện cho trang Dashboard ---
    const logoutBtn = document.getElementById('logout-btn');
    const uploadBtn = document.getElementById('upload-btn');
    // ... (Toàn bộ code gán sự kiện dashboard giữ nguyên) ...
    const fileInput = document.getElementById('file-input');
    const uploadMessage = document.getElementById('upload-message');
    const uploadSpinner = document.getElementById('upload-spinner');
    const clearDbBtn = document.getElementById('clear-db-btn');
    const mixBtn = document.getElementById('mix-btn');
    const downloadBtn = document.getElementById('download-btn');
    const mixMessage = document.getElementById('mix-message');

    const logoNoneRadio = document.getElementById('logo_none');
    const logoCustomRadio = document.getElementById('logo_custom');
    const logoUploadArea = document.getElementById('logo-upload-area');
    const logoInput = document.getElementById('logo-input');
    const uploadLogoBtn = document.getElementById('upload-logo-btn');
    const logoSpinner = document.getElementById('logo-spinner');
    const logoMessage = document.getElementById('logo-message');

    if (document.getElementById('question-list')) {
        fetchQuestions(supabase);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => handleLogout(supabase));
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            const file = fileInput.files[0];
            if (!file) {
                showMessage(uploadMessage, 'Vui lòng chọn một tệp .docx', true);
                return;
            }
            handleFileUpload(supabase, file, uploadMessage, uploadBtn, uploadSpinner);
        });
    }

    if (clearDbBtn) {
        clearDbBtn.addEventListener('click', () => {
            if (!confirm('Bạn có chắc chắn muốn XÓA TOÀN BỘ kho câu hỏi hiện tại không? Hành động này không thể hoàn tác.')) {
                return;
            }
            handleClearDatabase(supabase, uploadMessage, clearDbBtn);
        });
    }
    
    if (mixBtn) {
        mixBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            handleMixRequest(supabase, mixMessage, mixBtn, downloadBtn);
        });
    }

    function toggleLogoUploadArea() {
        if (logoCustomRadio && logoUploadArea) {
            logoUploadArea.style.display = logoCustomRadio.checked ? 'block' : 'none';
        }
    }
    
    if (logoNoneRadio) {
        logoNoneRadio.addEventListener('change', toggleLogoUploadArea);
    }
    if (logoCustomRadio) {
        logoCustomRadio.addEventListener('change', toggleLogoUploadArea);
    }

    if (uploadLogoBtn) {
        uploadLogoBtn.addEventListener('click', () => {
            const file = logoInput.files[0];
            if (!file) {
                showMessage(logoMessage, 'Vui lòng chọn một tệp logo .png hoặc .jpg', true);
                return;
            }
            handleLogoUpload(supabase, file, logoMessage, uploadLogoBtn, logoSpinner);
        });
    }

    toggleLogoUploadArea();
});

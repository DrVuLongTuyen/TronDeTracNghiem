// ====== TỆP APP.JS CHÍNH (ĐÃ CHIA NHỎ) ======
import { SUPABASE_URL, SUPABASE_ANON_KEY, createClient } from './constants.js';
import { showMessage, populateDateOfBirth } from './ui.js';
import { checkUserSession } from './session.js';
import { handleLogin, handleSignUp, handleLogout } from './auth.js';
// (MỚI V21) Import thêm handleLogoUpload
import { handleFileUpload, handleClearDatabase, handleMixRequest, handleLogoUpload } from './api.js';

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
    if (!supabase) return; // Nếu Supabase lỗi, không làm gì cả
    
    checkUserSession(supabase); // Kiểm tra session
    populateDateOfBirth();      // Điền ngày tháng năm sinh (chỉ chạy ở trang register)

    // --- Gán sự kiện cho trang Đăng nhập / Đăng ký ---
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const authMessage = document.getElementById('auth-message');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault(); // (MỚI V21) Ngăn form submit
            handleLogin(supabase, authMessage);
        });
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', (e) => {
            e.preventDefault(); // (MỚI V21) Ngăn form submit
            handleSignUp(supabase, authMessage); 
        });
    }

    // --- Gán sự kiện cho trang Dashboard ---
    const logoutBtn = document.getElementById('logout-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');
    const uploadMessage = document.getElementById('upload-message');
    const uploadSpinner = document.getElementById('upload-spinner');
    const clearDbBtn = document.getElementById('clear-db-btn');
    const mixBtn = document.getElementById('mix-btn');
    const downloadBtn = document.getElementById('download-btn');
    const mixMessage = document.getElementById('mix-message');

    // (MỚI V21) Lấy các element của khu vực Logo
    const logoNoneRadio = document.getElementById('logo_none');
    const logoCustomRadio = document.getElementById('logo_custom');
    const logoUploadArea = document.getElementById('logo-upload-area');
    const logoInput = document.getElementById('logo-input');
    const uploadLogoBtn = document.getElementById('upload-logo-btn');
    const logoSpinner = document.getElementById('logo-spinner');
    const logoMessage = document.getElementById('logo-message');


    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => handleLogout(supabase));
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', (e) => {
            e.preventDefault(); // (MỚI V21) Ngăn form submit
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
            e.preventDefault(); // (MỚI V21) Ngăn form submit
            handleMixRequest(supabase, mixMessage, mixBtn, downloadBtn);
        });
    }

    // --- (MỚI V21) Gán sự kiện cho Khu vực Logo ---
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

    // (MỚI V21) Chạy 1 lần khi tải trang
    toggleLogoUploadArea();
});

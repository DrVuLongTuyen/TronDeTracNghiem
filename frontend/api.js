// ====== TỆP APP.JS CHÍNH (ĐÃ CHIA NHỎ) ======
// Tệp này chỉ làm 2 việc: 
// 1. Khởi tạo Supabase
// 2. Gán sự kiện (click) cho các nút bấm

import { SUPABASE_URL, SUPABASE_ANON_KEY, createClient } from './constants.js';
import { showMessage, populateDateOfBirth } from './ui.js';
import { checkUserSession } from './session.js';
import { handleLogin, handleSignUp, handleLogout } from './auth.js';
import { handleFileUpload, handleClearDatabase, handleMixRequest } from './api.js';

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
        loginBtn.addEventListener('click', () => {
            handleLogin(supabase, authMessage);
        });
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => handleLogout(supabase));
    }
    
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
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
        mixBtn.addEventListener('click', () => {
            handleMixRequest(supabase, mixMessage, mixBtn, downloadBtn);
        });
    }
});

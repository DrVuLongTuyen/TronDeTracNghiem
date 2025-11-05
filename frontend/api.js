// Tệp này chứa các hàm gọi API Backend (trên Render)
import { API_BASE_URL } from './constants.js';
import { showMessage } from './ui.js';

/**
 * Lấy session token an toàn
 * @param {object} supabase - Đối tượng Supabase client
 * @returns {string|null} Access token
 */
async function getSessionToken(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        // (Đây là hàm showMessage toàn cục, không phải từ ui.js)
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = 'index.html';
        return null;
    }
    return session.access_token;
}

/**
 * Xử lý Tải tệp .docx lên
 * @param {object} supabase - Đối tượng Supabase client
 * @param {File} file - Tệp .docx
 * @param {HTMLElement} msgEl - Element hiển thị thông báo
 * @param {HTMLElement} btnEl - Nút bấm
 * @param {HTMLElement} spinnerEl - Spinner loading
 */
export async function handleFileUpload(supabase, file, msgEl, btnEl, spinnerEl) {
    const token = await getSessionToken(supabase);
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);
    
    showMessage(msgEl, 'Đang tải lên và xử lý...', false);
    btnEl.disabled = true;
    spinnerEl.style.display = 'inline-block';

    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
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

/**
 * Xử lý Xóa kho câu hỏi
 * @param {object} supabase - Đối tượng Supabase client
 * @param {HTMLElement} msgEl - Element hiển thị thông báo
 * @param {HTMLElement} btnEl - Nút bấm
 */
export async function handleClearDatabase(supabase, msgEl, btnEl) {
    const token = await getSessionToken(supabase);
    if (!token) return;

    showMessage(msgEl, 'Đang xóa dữ liệu cũ...', false);
    btnEl.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/clear`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
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

/**
 * Xử lý Trộn đề
 * @param {object} supabase - Đối tượng Supabase client
 * @param {HTMLElement} msgEl - Element hiển thị thông báo
 * @param {HTMLElement} btnEl - Nút "Bắt đầu trộn"
 * @param {HTMLElement} downloadBtnEl - Nút "Tải về"
 */
export async function handleMixRequest(supabase, msgEl, btnEl, downloadBtnEl) {
    // 1. Lấy thông tin Giai đoạn 2 (Trộn đề)
    const numTests = document.getElementById('num-tests-input').value;
    const baseNameEl = document.getElementById('base-name-input');
    const baseName = baseNameEl.value.toUpperCase() || baseNameEl.placeholder;

    // 2. Lấy 7 thông tin Giai đoạn 3 (Header)
    const schoolNameEl = document.getElementById('school-name');
    const examNameEl = document.getElementById('exam-name');
    const classNameEl = document.getElementById('class-name');
    const subjectNameEl = document.getElementById('subject-name');

    const headerData = {
        school_name: schoolNameEl.value.toUpperCase() || schoolNameEl.placeholder,
        exam_name: examNameEl.value.toUpperCase() || examNameEl.placeholder,
        class_name: classNameEl.value.toUpperCase() || classNameEl.placeholder,
        subject_name: subjectNameEl.value || subjectNameEl.placeholder,
        exam_iteration: document.getElementById('exam-iteration').value,
        exam_time: document.getElementById('exam-time').value,
        allow_documents: document.getElementById('allow-documents').checked
    };

    // 3. Lấy token
    const token = await getSessionToken(supabase);
    if (!token) return;

    showMessage(msgEl, 'Đang trộn đề... Việc này có thể mất một phút...', false);
    btnEl.disabled = true;
    downloadBtnEl.style.display = 'none'; 

    try {
        const response = await fetch(`${API_BASE_URL}/mix`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                num_tests: numTests,
                base_name: baseName,
                header_data: headerData
            })
        });

        if (response.ok) {
            // *** SỬA LỖI (BƯỚC 6) ***
            // Chỉ đọc 'Content-Disposition' (viết hoa chuẩn)
            const contentDisposition = response.headers.get('Content-Disposition');
            let downloadName = `Bo_de_tron_${baseName}.zip`; 
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                if (filenameMatch && filenameMatch.length > 1) {
                    downloadName = filenameMatch[1];
                }
            }
            // *** KẾT THÚC SỬA LỖI ***

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

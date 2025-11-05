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
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = 'index.html';
        return null;
    }
    return session.access_token;
}

// === (YÊU CẦU 15B) HÀM ĐÁNH THỨC MÁY CHỦ ===
let isServerAwake = false; // Biến cờ để chỉ đánh thức 1 lần

/**
 * Đánh thức Render (Backend) và Supabase (Database)
 * @param {HTMLElement} msgEl - Element để hiển thị thông báo "Đang đánh thức..."
 */
async function wakeUpServer(msgEl) {
    if (isServerAwake) {
        return true; // Máy chủ đã thức, bỏ qua
    }

    showMessage(msgEl, 'Đang đánh thức máy chủ... Việc này có thể mất 1-2 phút...', false);
    
    try {
        const response = await fetch(`${API_BASE_URL}/wake`, {
            method: 'GET',
            // Đặt timeout (ví dụ 3 phút = 180000 ms)
            // Lưu ý: fetch API gốc không hỗ trợ timeout, nhưng trình duyệt thường có timeout riêng
        });
        
        // Không quan trọng kết quả 200 hay 503, chỉ cần nó trả lời là thành công
        isServerAwake = true; // Đánh dấu đã thức
        showMessage(msgEl, 'Máy chủ đã thức! Đang xử lý yêu cầu của bạn...', false);
        return true;

    } catch (error) {
        showMessage(msgEl, `Lỗi đánh thức máy chủ: ${error.message}. Vui lòng tải lại trang và thử lại.`, true);
        return false;
    }
}
// === KẾT THÚC YÊU CẦU 15B ===


/**
 * Xử lý Tải tệp .docx lên
 */
export async function handleFileUpload(supabase, file, msgEl, btnEl, spinnerEl) {
    // (FIX 15B) Đánh thức trước
    btnEl.disabled = true;
    spinnerEl.style.display = 'inline-block';
    const awake = await wakeUpServer(msgEl);
    if (!awake) {
        btnEl.disabled = false;
        spinnerEl.style.display = 'none';
        return;
    }
    // Kết thúc đánh thức

    const token = await getSessionToken(supabase);
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);
    
    showMessage(msgEl, 'Đang tải lên và xử lý tệp...', false);

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
 */
export async function handleClearDatabase(supabase, msgEl, btnEl) {
    // (FIX 15B) Đánh thức trước
    btnEl.disabled = true;
    const awake = await wakeUpServer(msgEl);
    if (!awake) {
        btnEl.disabled = false;
        return;
    }
    // Kết thúc đánh thức

    const token = await getSessionToken(supabase);
    if (!token) return;

    showMessage(msgEl, 'Máy chủ đã thức! Đang xóa dữ liệu cũ...', false);

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
 */
export async function handleMixRequest(supabase, msgEl, btnEl, downloadBtnEl) {
    // (FIX 15B) Đánh thức trước
    btnEl.disabled = true;
    downloadBtnEl.style.display = 'none';
    const awake = await wakeUpServer(msgEl);
    if (!awake) {
        btnEl.disabled = false;
        return;
    }
    // Kết thúc đánh thức

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

    showMessage(msgEl, 'Máy chủ đã thức! Đang trộn đề...', false);

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
            const contentDisposition = response.headers.get('Content-Disposition');
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

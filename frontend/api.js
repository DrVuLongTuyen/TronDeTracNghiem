// Tệp này chứa các hàm gọi API Backend (trên Render) và Supabase Storage
import { API_BASE_URL } from './constants.js';
import { showMessage } from './ui.js';

/**
 * Lấy session token an toàn
 * @param {object} supabase - Đối tượng Supabase client
 * @returns {object|null} Toàn bộ đối tượng session
 */
async function getSession(supabase) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        alert('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        window.location.href = 'index.html';
        return null;
    }
    return session;
}

// === (MỚI V21) HÀM TẢI LOGO LÊN SUPABASE STORAGE ===
/**
 * Tải logo tùy chỉnh của người dùng lên Supabase Storage
 * @param {object} supabase - Đối tượng Supabase client
 * @param {File} file - Tệp logo
 * @param {HTMLElement} msgEl - Element hiển thị thông báo
 * @param {HTMLElement} btnEl - Nút bấm
 * @param {HTMLElement} spinnerEl - Spinner loading
 */
export async function handleLogoUpload(supabase, file, msgEl, btnEl, spinnerEl) {
    const session = await getSession(supabase);
    if (!session) return;

    // Lấy user ID để làm tên tệp, ví dụ: logos/USER_ID.png
    // Điều này đảm bảo mỗi user chỉ có 1 logo
    const userId = session.user.id;
    const fileExt = file.name.split('.').pop();
    const filePath = `logos/${userId}.${fileExt}`;

    showMessage(msgEl, 'Đang tải logo lên...', false);
    btnEl.disabled = true;
    spinnerEl.style.display = 'inline-block';

    try {
        // Tải lên Supabase Storage
        const { data, error } = await supabase
            .storage
            .from('logos') // Tên Bucket
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true // Ghi đè nếu tệp đã tồn tại
            });

        if (error) throw error;

        showMessage(msgEl, 'Tải logo lên thành công!', false);
        document.getElementById('logo-input').value = ''; // Xóa input

    } catch (error) {
        showMessage(msgEl, `Lỗi tải logo: ${error.message}`, true);
    } finally {
        btnEl.disabled = false;
        spinnerEl.style.display = 'none';
    }
}


// === (YÊU CẦU 15B) HÀM ĐÁNH THỨC MÁY CHỦ ===
let isServerAwake = false; 

async function wakeUpServer(msgEl) {
    if (isServerAwake) {
        return true; 
    }
    showMessage(msgEl, 'Đang đánh thức máy chủ... Việc này có thể mất 1-2 phút...', false);
    try {
        await fetch(`${API_BASE_URL}/wake`, { method: 'GET' });
        isServerAwake = true; 
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
    btnEl.disabled = true;
    spinnerEl.style.display = 'inline-block';
    const awake = await wakeUpServer(msgEl);
    if (!awake) {
        btnEl.disabled = false;
        spinnerEl.style.display = 'none';
        return;
    }
    
    const session = await getSession(supabase);
    if (!session) return;
    const token = session.access_token;

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
    btnEl.disabled = true;
    const awake = await wakeUpServer(msgEl);
    if (!awake) {
        btnEl.disabled = false;
        return;
    }
    
    const session = await getSession(supabase);
    if (!session) return;
    const token = session.access_token;

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
    btnEl.disabled = true;
    downloadBtnEl.style.display = 'none';
    const awake = await wakeUpServer(msgEl);
    if (!awake) {
        btnEl.disabled = false;
        return;
    }

    // === (SỬA LỖI V21) THÊM LOGIC LẤY LỰA CHỌN LOGO ===
    const logoPreference = document.querySelector('input[name="logo_pref"]:checked').value;
    // === KẾT THÚC SỬA LỖI V21 ===

    const numTests = document.getElementById('num-tests-input').value;
    const baseNameEl = document.getElementById('base-name-input');
    const baseName = baseNameEl.value.toUpperCase() || baseNameEl.placeholder;

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

    const session = await getSession(supabase);
    if (!session) return;
    const token = session.access_token;

    showMessage(msgEl, 'Máy chủ đã thức! Đang trộn đề...', false);

    try {
        const response = await fetch(`${API_BASE_URL}/mix`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            // (SỬA LỖI V21) Gửi thêm logo_preference
            body: JSON.stringify({
                num_tests: numTests,
                base_name: baseName,
                header_data: headerData,
                logo_preference: logoPreference // Gửi lựa chọn của user
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

// Tệp này chứa các hàm gọi API Backend (trên Render) và Supabase Storage
import { API_BASE_URL } from './constants.js';
import { showMessage, displayQuestions } from './ui.js'; // (SỬA V23) import displayQuestions

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

// === (MỚI GĐ 5.2) HÀM LẤY KHO CÂU HỎI ===
export async function fetchQuestions(supabase) {
    const session = await getSession(supabase);
    if (!session) return;
    
    const token = session.access_token;

    try {
        const response = await fetch(`${API_BASE_URL}/questions`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const questions = await response.json();
            displayQuestions(questions); // Gọi hàm UI để hiển thị
        } else {
            // Hiển thị lỗi ngay tại danh sách câu hỏi
            displayQuestions(null); 
            console.error("Lỗi tải câu hỏi:", response.statusText);
        }
    } catch (error) {
        displayQuestions(null);
        console.error("Lỗi kết nối khi tải câu hỏi:", error.message);
    }
}

// === HÀM TẢI LOGO (V22) ===
export async function handleLogoUpload(supabase, file, msgEl, btnEl, spinnerEl) {
    const session = await getSession(supabase);
    if (!session) return;

    const userId = session.user.id;
    const filePath = `${userId}`; 

    showMessage(msgEl, 'Đang tải logo lên...', false);
    btnEl.disabled = true;
    spinnerEl.style.display = 'inline-block';

    try {
        const { data, error } = await supabase
            .storage
            .from('logos')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        showMessage(msgEl, 'Tải logo lên thành công!', false);
        document.getElementById('logo-input').value = ''; 

    } catch (error) {
        showMessage(msgEl, `Lỗi tải logo: ${error.message}`, true);
    } finally {
        btnEl.disabled = false;
        spinnerEl.style.display = 'none';
    }
}


// === HÀM ĐÁNH THỨC MÁY CHỦ (KHÔNG ĐỔI) ===
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
// === KẾT THÚC HÀM ĐÁNH THỨC ===


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
            // (MỚI GĐ 5.2) Tải lại danh sách câu hỏi sau khi upload thành công
            await fetchQuestions(supabase); 
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
            // (MỚI GĐ 5.2) Tải lại danh sách câu hỏi (rỗng)
            await fetchQuestions(supabase);
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

    const logoPreference = document.querySelector('input[name="logo_pref"]:checked').value;
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
            body: JSON.stringify({
                num_tests: numTests,
                base_name: baseName,
                header_data: headerData,
                logo_preference: logoPreference 
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

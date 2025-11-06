// Tệp này chứa các hàm cập nhật giao diện (UI)

/**
 * Hiển thị thông báo lên một element
 * @param {HTMLElement} element - Element để hiển thị (ví dụ: authMessage)
 * @param {string} message - Nội dung thông báo
 * @param {boolean} isError - true nếu là lỗi (màu đỏ)
 */
export function showMessage(element, message, isError = false) {
    if (element) {
        element.textContent = message;
        element.className = isError ? 'error' : 'success';
    }
}

/**
 * Điền ngày/tháng/năm vào các ô select của trang đăng ký
 */
export function populateDateOfBirth() {
    const daySelect = document.getElementById('dob-day');
    const monthSelect = document.getElementById('dob-month');
    const yearSelect = document.getElementById('dob-year');

    // Chỉ chạy nếu các element này tồn tại (tức là đang ở trang register.html)
    if (!daySelect || !monthSelect || !yearSelect) return; 

    // (Code này giữ nguyên, không đổi)
    const defaultDay = daySelect.value;
    const defaultMonth = monthSelect.value;
    const defaultYear = yearSelect.value;

    daySelect.innerHTML = '';
    monthSelect.innerHTML = '';
    yearSelect.innerHTML = '';
    
    daySelect.options.add(new Option('Ngày', ''));
    for (let i = 1; i <= 31; i++) {
        daySelect.options.add(new Option(i, (i < 10 ? '0' + i : i))); 
    }
    
    monthSelect.options.add(new Option('Tháng', ''));
    for (let i = 1; i <= 12; i++) {
        monthSelect.options.add(new Option(i, (i < 10 ? '0' + i : i))); 
    }
    
    const currentYear = new Date().getFullYear();
    yearSelect.options.add(new Option('Năm', ''));
    for (let i = currentYear - 18; i >= currentYear - 100; i--) { 
        yearSelect.options.add(new Option(i, i));
    }

    daySelect.value = defaultDay;
    monthSelect.value = defaultMonth;
    yearSelect.value = defaultYear;
}

// === (MỚI GĐ 5.2) HÀM HIỂN THỊ KHO CÂU HỎI ===
/**
 * Lấy dữ liệu câu hỏi (JSON) và hiển thị ra dashboard
 * @param {Array} questions - Mảng các đối tượng câu hỏi từ API
 */
export function displayQuestions(questions) {
    const listElement = document.getElementById('question-list');
    const loadingElement = document.getElementById('loading-questions');
    
    if (!listElement || !loadingElement) return;

    // Xóa nội dung "Đang tải..."
    loadingElement.style.display = 'none';
    listElement.innerHTML = ''; // Xóa danh sách cũ

    if (!questions || questions.length === 0) {
        listElement.innerHTML = '<li><i>(Chưa có câu hỏi nào trong kho)</i></li>';
        return;
    }

    // Tạo các thẻ <li> cho từng câu hỏi
    questions.forEach(q => {
        const li = document.createElement('li');
        
        // Cắt bớt text nếu quá dài
        const questionText = q.question_text.length > 100 
            ? q.question_text.substring(0, 100) + '...' 
            : q.question_text;
            
        li.innerHTML = `<strong>[${q.group_tag}]</strong> ${questionText}`;
        listElement.appendChild(li);
    });
}

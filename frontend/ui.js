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

    daySelect.options.add(new Option('Ngày', '01'));
    for (let i = 1; i <= 31; i++) {
        daySelect.options.add(new Option(i, (i < 10 ? '0' + i : i))); 
    }
    
    monthSelect.options.add(new Option('Tháng', '01'));
    for (let i = 1; i <= 12; i++) {
        monthSelect.options.add(new Option(i, (i < 10 ? '0' + i : i))); 
    }
    
    const currentYear = new Date().getFullYear();
    yearSelect.options.add(new Option('Năm', '2000'));
    for (let i = currentYear - 18; i >= currentYear - 100; i--) { 
        yearSelect.options.add(new Option(i, i));
    }
}

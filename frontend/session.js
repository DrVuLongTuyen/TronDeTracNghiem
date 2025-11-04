// Tệp này chứa hàm kiểm tra session của người dùng

/**
 * Kiểm tra session và điều hướng trang
 * @param {object} supabase - Đối tượng Supabase client
 */
export async function checkUserSession(supabase) {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    
    const isAuthPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('register.html') || window.location.pathname === '/';
    
    if (session) { // Đã đăng nhập
        if (isAuthPage) {
            window.location.href = 'dashboard.html'; // Đang ở trang auth -> Chuyển đến dashboard
        } else {
            // Nếu ở dashboard, điền email
            const userEmailEl = document.getElementById('user-email');
            if (userEmailEl) userEmailEl.textContent = session.user.email;
        }
    } else { // Chưa đăng nhập
        // Nếu ở trang dashboard -> Đuổi về trang đăng nhập
        if (!isAuthPage && window.location.pathname.endsWith('dashboard.html')) {
             window.location.href = 'index.html';
        }
    }
}

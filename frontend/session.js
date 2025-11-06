// Tệp này chứa hàm kiểm tra session của người dùng

/**
 * Kiểm tra session và điều hướng trang
 * @param {object} supabase - Đối tượng Supabase client
 */
export async function checkUserSession(supabase) {
    if (!supabase) return;

    const { data: { session } } = await supabase.auth.getSession();
    
    const isAuthPage = window.location.pathname.endsWith('index.html') || 
                       window.location.pathname.endsWith('register.html') || 
                       window.location.pathname === '/';
    
    if (session) { // Đã đăng nhập
        if (isAuthPage) {
            window.location.href = 'dashboard.html'; // Đang ở trang auth -> Chuyển đến dashboard
        } else {
            // (SỬA LỖI V28) Lấy tên người dùng thay vì email
            const greetingEl = document.getElementById('user-greeting');
            if (greetingEl) {
                // Thử lấy tên từ 'profiles'
                try {
                    const { data: profile, error } = await supabase
                        .from('profiles')
                        .select('first_name, last_name')
                        .eq('id', session.user.id)
                        .single();

                    if (error) throw error; // Ném lỗi để fallback
                    
                    if (profile) {
                        const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
                        // Chèn HTML với style mới
                        greetingEl.innerHTML = `Xin chào, <span class="user-name-style">${fullName || session.user.email}</span>!`;
                    } else {
                        // Dự phòng (Nếu trigger bị lỗi): Hiển thị email
                        greetingEl.innerHTML = `Xin chào, <span class="user-name-style">${session.user.email}</span>!`;
                    }
                } catch (error) {
                    // Dự phòng (Nếu không lấy được profile): Hiển thị email
                    console.error("Lỗi khi lấy profile:", error.message);
                    greetingEl.innerHTML = `Xin chào, <span class="user-name-style">${session.user.email}</span>!`;
                }
            }
        }
    } else { // Chưa đăng nhập
        // Nếu ở trang dashboard -> Đuổi về trang đăng nhập
        if (!isAuthPage && window.location.pathname.endsWith('dashboard.html')) {
             window.location.href = 'index.html';
        }
    }
}

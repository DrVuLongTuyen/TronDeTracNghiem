// Tệp này chứa các hàm liên quan đến Xác thực (Authentication)
import { showMessage } from './ui.js';

/**
 * Xử lý Đăng ký
 * @param {object} supabase - Đối tượng Supabase client
 * @param {HTMLElement} msgEl - Element để hiển thị thông báo
 */
export async function handleSignUp(supabase, msgEl) {
    // 1. Lấy tất cả dữ liệu từ form
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const dobDay = document.getElementById('dob-day').value;
    const dobMonth = document.getElementById('dob-month').value;
    const dobYear = document.getElementById('dob-year').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;

    // 2. Kiểm tra (Validation)
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        showMessage(msgEl, 'Lỗi: Vui lòng điền đầy đủ các trường bắt buộc.', true);
        return;
    }
    if (password !== confirmPassword) {
        showMessage(msgEl, 'Lỗi: Mật khẩu và xác nhận mật khẩu không khớp.', true);
        return;
    }
    if (password.length < 6) {
        showMessage(msgEl, 'Lỗi: Mật khẩu phải có ít nhất 6 ký tự.', true);
        return;
    }

    const dob = `${dobYear}-${dobMonth}-${dobDay}`;
    showMessage(msgEl, 'Đang xử lý...', false);

    try {
        // 3. Gửi thông tin lên Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: { // Dữ liệu này sẽ được Trigger (trong
                    first_name: firstName,
                    last_name: lastName,
                    gender: gender,
                    dob: dob
                }
            }
        });

        if (error) throw error;
        
        showMessage(msgEl, 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực.', false);

    } catch (error) {
        if (error.message === 'User already registered') {
            showMessage(msgEl, 'Lỗi đăng ký: Tài khoản này đã đăng ký, vui lòng chuyển sang đăng nhập.', true);
        } else {
            showMessage(msgEl, `Lỗi: ${error.message}`, true);
        }
    }
}

/**
 * Xử lý Đăng nhập
 * @param {object} supabase - Đối tượng Supabase client
 * @param {HTMLElement} msgEl - Element để hiển thị thông báo
 */
export async function handleLogin(supabase, msgEl) {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        if (error.message === 'Email not confirmed') {
            showMessage(msgEl, 'Lỗi đăng nhập: Email chưa xác thực. Vui lòng kiểm tra email của bạn.', true);
        } else if (error.message === 'Invalid login credentials') {
            showMessage(msgEl, 'Lỗi đăng nhập: Sai email hoặc mật khẩu.', true);
        } else {
            showMessage(msgEl, `Lỗi đăng nhập: ${error.message}`, true);
        }
    } else {
        window.location.href = 'dashboard.html'; // Đăng nhập thành công
    }
}

/**
 * Xử lý Đăng xuất
 * @param {object} supabase - Đối tượng Supabase client
 */
export async function handleLogout(supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) alert(`Lỗi đăng xuất: ${error.message}`);
    else window.location.href = 'index.html';
}

/**
 * Xử lý Đổi mật khẩu (MỚI V30)
 * @param {object} supabase - Đối tượng Supabase client
 * @param {HTMLElement} msgEl - Element để hiển thị thông báo
 */
export async function handleChangePassword(supabase, msgEl) {
    // 1. Lấy dữ liệu
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    // 2. Kiểm tra
    if (!oldPassword || !newPassword || !confirmPassword) {
        showMessage(msgEl, 'Lỗi: Vui lòng điền đầy đủ cả 3 trường.', true);
        return;
    }
    if (newPassword !== confirmPassword) {
        showMessage(msgEl, 'Lỗi: Mật khẩu mới và xác nhận không khớp.', true);
        return;
    }
    if (newPassword.length < 6) {
        showMessage(msgEl, 'Lỗi: Mật khẩu mới phải có ít nhất 6 ký tự.', true);
        return;
    }

    showMessage(msgEl, 'Đang xử lý...', false);

    try {
        // 3. (Rất quan trọng) Lấy email user hiện tại
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error("Phiên làm việc không hợp lệ. Vui lòng đăng nhập lại.");
        }
        const email = session.user.email;

        // 4. Xác thực mật khẩu cũ
        // Chúng ta phải đăng nhập lại (trong nền) để chứng minh user biết mật khẩu cũ
        const { error: reauthError } = await supabase.auth.signInWithPassword({
            email: email,
            password: oldPassword
        });

        if (reauthError) {
            showMessage(msgEl, 'Lỗi: Mật khẩu cũ không chính xác.', true);
            return;
        }

        // 5. Nếu mật khẩu cũ đúng, cập nhật mật khẩu mới
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) throw updateError;

        showMessage(msgEl, 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.', false);
        
        // Đăng xuất và chuyển về trang đăng nhập
        setTimeout(() => {
            handleLogout(supabase); 
        }, 2000);

    } catch (error) {
        showMessage(msgEl, `Lỗi: ${error.message}`, true);
    }
}

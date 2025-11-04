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

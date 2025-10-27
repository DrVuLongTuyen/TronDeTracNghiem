# Hướng dẫn sử dụng - Trộn Đề Trắc Nghiệm

Chào mừng bạn đến với dự án Trộn Đề Trắc Nghiệm. Đây là một ứng dụng web giúp các giáo viên, giảng viên... có thể tải lên và quản lý kho câu hỏi trắc nghiệm của mình một cách an toàn và riêng tư.

**Trang web của dự án:** [https://trondetn.vltuyen.com](https://trondetn.vltuyen.com)

## Tính năng hiện tại (Giai đoạn 1)

* **Xác thực người dùng:** Đăng ký tài khoản, đăng nhập, và xác thực qua email. Mỗi người dùng có một kho dữ liệu hoàn toàn độc lập.
* **Upload Đề Gốc:** Tải lên tệp `.docx` chứa các câu hỏi trắc nghiệm đã được định dạng.
* **Phân tích & Lưu trữ:** Hệ thống tự động đọc, phân tích và bóc tách câu hỏi, đáp án, và các thẻ nhóm từ tệp `.docx` và lưu vào cơ sở dữ liệu cá nhân của bạn.

## Tính năng tương lai (Giai đoạn 2)

* Hiển thị, chỉnh sửa kho câu hỏi đã tải lên.
* Thực hiện trộn đề (hoán vị câu hỏi, hoán vị đáp án) dựa trên các thẻ nhóm.
* Tải về (Download) các tệp `.docx` đã được trộn.

---

## Hướng dẫn sử dụng Ứng dụng Web

### 1. Đăng ký tài khoản

1.  Truy cập [https://trondetn.vltuyen.com](https://trondetn.vltuyen.com).
2.  Nhập email của bạn và một mật khẩu.
    * **Lưu ý quan trọng:** Mật khẩu phải có **độ dài tối thiểu 6 ký tự**.
3.  Nhấn nút **"Đăng ký"**.

### 2. Xác thực Email

1.  Sau khi đăng ký, hệ thống sẽ gửi một email xác thực đến địa chỉ bạn đã đăng ký.
2.  Mở hộp thư của bạn, tìm email từ "Supabase Auth" (có thể ở trong mục Spam/Quảng cáo).
3.  Nhấn vào nút **"Confirm your mail"** trong email.
4.  Bạn sẽ được chuyển hướng trở lại trang web, xác nhận rằng tài khoản của bạn đã được kích hoạt.

### 3. Đăng nhập

Sau khi đã xác thực, bạn có thể đăng nhập bằng email và mật khẩu đã tạo.

### 4. Tải lên Đề Gốc

1.  Sau khi đăng nhập, bạn sẽ ở trang "Bảng điều khiển".
2.  Nhấn nút **"Choose File"** (hoặc "Browse...") và chọn tệp `.docx` từ máy tính của bạn (xem hướng dẫn định dạng tệp bên dưới).
3.  Nhấn nút **"Tải lên và xử lý"**.
4.  Chờ trong giây lát. Nếu tệp hợp lệ, hệ thống sẽ báo "Xử lý thành công... Đã lưu X câu hỏi."

---

## Hướng dẫn định dạng tệp Đề Gốc (.docx)

Đây là bước **QUAN TRỌNG NHẤT**. Để hệ thống có thể đọc hiểu tệp của bạn, bạn phải tuân thủ **CHÍNH XÁC** các quy tắc định dạng sau:

### 1. Câu hỏi

* Mỗi câu hỏi phải bắt đầu bằng chữ `Câu ` (có dấu cách) và số thứ tự.
* Ví dụ: `Câu 1.`, `Câu 2:`, `Câu 10.`
* (Hệ thống cũng hỗ trợ `Question 1.`)

### 2. Đáp án

* Các đáp án phải nằm ngay dưới câu hỏi.
* Các đáp án phải bắt đầu bằng `A.`, `B.`, `C.`, `D.` (chữ hoa, có dấu chấm).

### 3. Đáp án đúng (Rất quan trọng)

* Để đánh dấu đâu là đáp án đúng, bạn **BẮT BUỘC** phải dùng tính năng **Gạch chân (Underline)** của Microsoft Word.
* Bạn có thể chỉ gạch chân chữ cái đầu (ví dụ: `A.`) hoặc gạch chân cả dòng đáp án. Hệ thống đều có thể nhận diện được.

### 4. Thẻ Nhóm (Phân loại câu hỏi)

Hệ thống sử dụng các thẻ đặc biệt (viết trên một dòng riêng) để phân loại các nhóm câu hỏi:

* `<g0>`: **Nhóm không trộn**. (Ví dụ: Các câu hỏi của bài nghe, đọc hiểu).
* `<g1>`: **Nhóm chỉ hoán vị câu hỏi**. (Các câu hỏi sẽ đổi thứ tự, nhưng đáp án A,B,C,D giữ nguyên).
* `<g2>`: **Nhóm chỉ hoán vị đáp án**. (Câu hỏi giữ nguyên, nhưng A,B,C,D sẽ đổi vị trí).
* `<g3>`: **Nhóm hoán vị cả câu hỏi và đáp án**. (Đây là nhóm phổ biến nhất).

### 5. Cố định vị trí (Tùy chọn)

Nếu bạn muốn một đáp án hoặc một nhóm câu hỏi *không bao giờ* bị hoán vị, hãy thêm dấu thăng (`#`) vào trước nó.

* `#A.` (Đáp án A này sẽ luôn ở vị trí A, không bị hoán vị với B,C,D).
* `<#g1>` (Nhóm `<g1>` này sẽ luôn ở vị trí này, không bị hoán vị với các nhóm khác).

### 6. Hình ảnh

* Nếu câu hỏi hoặc đáp án có hình ảnh, hãy đảm bảo hình ảnh được đặt ở chế độ **"Inline with Text" (Nằm trong dòng văn bản)** để tránh bị lỗi bố cục khi trộn.

### VÍ DỤ MỘT TỆP .DOCX HỢP LỆ

```
<g3>
PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.

Câu 1. Hình dưới đây mô tả cấu trúc tế bào thực vật. Cấu trúc số mấy chứa nhiễm sắc thể?
A. (1).
B. (2).
C. (3).
D. (4).
[Lưu ý: Bạn phải dùng Word và gạch chân dòng "D. (4)."]

Câu 2. Bào quan nào sau đây trực tiếp tham gia quá trình tiêu hóa nội bào ở trùng giày?
A. Ribosome.
B. Nhân.
C. Lysosome.
D. Bộ máy Golgi.
[Lưu ý: Bạn phải dùng Word và gạch chân dòng "C. Lysosome."]

<g1>
PHẦN II. Câu hỏi chỉ hoán vị câu.

Câu 3. Bào quan nào sau đây là túi chứa sắc tố ở tế bào cánh hoa?
A. Không bào.
B. Nhân.
C. Lysosome.
D. Ti thể.
[Lưu ý: Bạn phải dùng Word và gạch chân dòng "A. Không bào."]

```

## Xử lý sự cố (Troubleshooting)

* **Lỗi: "Lỗi đăng ký..."**: Mật khẩu của bạn có thể dưới 6 ký tự. Vui lòng thử lại với mật khẩu dài hơn.
* **Đăng nhập không được**: Bạn đã nhấn vào link xác thực trong email chưa? Vui lòng kiểm tra email (cả mục Spam).
* **Upload báo lỗi: "Không tìm thấy câu hỏi hợp lệ..."**: Tệp `.docx` của bạn đã định dạng sai. Vui lòng kiểm tra lại 6 quy tắc ở trên, đặc biệt là quy tắc `Câu 1.` và `A.`
* **Upload báo lỗi: "Lỗi: API Backend..."**: Có thể máy chủ Backend đang tạm nghỉ (do là bản Free). Vui lòng đợi 30 giây và nhấn nút "Tải lên" lại.

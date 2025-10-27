import os
import re
import docx
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

# --- Cấu hình ---
app = Flask(__name__)
CORS(app)  # Cho phép Frontend gọi API này

# --- Kết nối Supabase ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Lỗi: SUPABASE_URL hoặc SUPABASE_KEY không được thiết lập.")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Đã kết nối Supabase (Backend Service Role)")
except Exception as e:
    print(f"Lỗi khởi tạo Supabase: {e}")


# --- Hàm phân tích DOCX ---
def parse_test_document(file_stream):
    try:
        doc = docx.Document(file_stream)
    except Exception as e:
        print(f"Lỗi: không thể mở tệp docx. Lỗi: {e}")
        return None, f"Lỗi đọc tệp DOCX: {e}"

    test_structure = []
    current_group = None
    current_question = None

    group_regex = re.compile(r"<(/?#?g\d+)>")
    question_regex = re.compile(r"^(Câu|Question)\s+\d+[\.:]?\s+", re.IGNORECASE)
    answer_regex = re.compile(r"^(#?[A-D])[\.:]?\s+", re.IGNORECASE)

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue

        # 1. Kiểm tra thẻ nhóm
        group_match = group_regex.search(text)
        if group_match:
            group_tag = group_match.group(1)
            is_fixed = '#' in group_tag
            # Loại bỏ / và # để lấy tag chuẩn
            group_type = group_tag.replace('#', '').replace('/', '')

            current_group = {
                "group_tag": group_type,
                "is_fixed": is_fixed,
                "questions": []
            }
            test_structure.append(current_group)
            current_question = None
            continue

        # 2. Kiểm tra câu hỏi
        question_match = question_regex.search(text)
        if question_match:
            if current_group is None:
                # Nếu câu hỏi xuất hiện trước thẻ nhóm, gán nhóm mặc định
                current_group = { "group_tag": "g3", "is_fixed": False, "questions": [] }
                test_structure.append(current_group)

            current_question = {
                "question_text": text,
                "answers": [],
                "correct_answer": None
            }
            current_group["questions"].append(current_question)
            continue

        # 3. Kiểm tra đáp án
        answer_match = answer_regex.search(text)
        if answer_match and current_question is not None:
            answer_prefix = answer_match.group(1).upper().replace('#', '')
            answer_text = text[answer_match.end():].strip()
            is_fixed = '#' in answer_match.group(0)
            is_correct = False

            # Kiểm tra gạch chân
            for run in para.runs:
                if run.font.underline:
                    is_correct = True
                    break

            answer_obj = {
                "prefix": answer_prefix,
                "text": answer_text,
                "is_fixed": is_fixed
            }

            current_question["answers"].append(answer_obj)
            if is_correct:
                current_question["correct_answer"] = answer_prefix
            continue

    return test_structure, None


# --- Định nghĩa API Endpoints ---

@app.route('/')
def home():
    """Endpoint kiểm tra API có hoạt động không"""
    return "Xin chào, API Backend của TronDeTN đang hoạt động!"

@app.route('/upload', methods=['POST'])
def handle_upload():
    """
    Endpoint chính để xử lý upload tệp .docx
    """
    # 1. Xác thực người dùng (Lấy User ID từ Frontend)
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Thiếu token xác thực"}), 401

    jwt_token = auth_header.split(' ')[1]

    try:
        # Giải mã token để lấy thông tin user
        user_data = supabase.auth.get_user(jwt_token)
        user_id = user_data.user.id
    except Exception as e:
        return jsonify({"error": f"Token không hợp lệ hoặc đã hết hạn: {e}"}), 401

    # 2. Kiểm tra tệp
    if 'file' not in request.files:
        return jsonify({"error": "Không có tệp nào được gửi"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Tên tệp rỗng"}), 400

    if not file.filename.endswith('.docx'):
        return jsonify({"error": "Chỉ chấp nhận tệp .docx"}), 400

    # 3. Phân tích tệp
    print(f"Đang xử lý tệp '{file.filename}' cho user: {user_id}")
    parsed_data, error = parse_test_document(file.stream) # Dùng file.stream

    if error:
        return jsonify({"error": error}), 500

    # 4. Lưu kết quả vào Database
    rows_to_insert = []
    for group in parsed_data:
        for question in group["questions"]:
            # Bỏ qua nếu câu hỏi không có đáp án
            if not question["answers"]:
                continue

            row = {
                "user_id": user_id,
                "group_tag": group["group_tag"],
                "group_is_fixed": group["is_fixed"],
                "question_text": question["question_text"],
                "answers": json.dumps(question["answers"], ensure_ascii=False), # Chuyển đổi list thành chuỗi JSON
                "correct_answer": question.get("correct_answer")
            }
            rows_to_insert.append(row)

    try:
        if rows_to_insert:
            data, count = supabase.table('question_banks').insert(rows_to_insert).execute()
        else:
            return jsonify({"error": "Không tìm thấy câu hỏi hợp lệ nào trong tệp"}), 400

    except Exception as e:
        print(f"Lỗi khi lưu vào Supabase: {e}")
        return jsonify({"error": f"Lỗi khi lưu vào DB: {e}"}), 500

    return jsonify({
        "message": f"Xử lý thành công tệp '{file.filename}'",
        "groups_found": len(parsed_data),
        "questions_saved": len(rows_to_insert)
    }), 200

# Chạy ứng dụng (cho Render)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
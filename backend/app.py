import os
import re
import docx
import json
import random # Thư viện mới để xáo trộn
import io       # Thư viện mới để xử lý file trong bộ nhớ
import zipfile  # Thư viện mới để nén file .zip
from docx import Document # Thư viện mới để *tạo* file docx
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from supabase import create_client, Client

# --- Cấu hình ---
app = Flask(__name__)
CORS(app)  # Cho phép Frontend gọi API này

# --- Kết nối Supabase ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Đã kết nối Supabase (Backend Service Role)")


# --- HÀM /UPLOAD (GIAI ĐOẠN 1) - GIỮ NGUYÊN ---

def parse_test_document(file_stream):
    try:
        doc = docx.Document(file_stream)
    except Exception as e:
        return None, f"Lỗi đọc tệp DOCX: {e}"

    test_structure = []
    current_group = None
    current_question = None

    group_regex = re.compile(r"<(/?#?g\d+)>")
    question_regex = re.compile(r"^(Câu|Question)\s+\d+[\.:]?\s+", re.IGNORECASE)
    answer_regex = re.compile(r"^(#?[A-D])[\.:]?\s+", re.IGNORECASE)

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text: continue

        group_match = group_regex.search(text)
        if group_match:
            group_tag = group_match.group(1).replace('#', '').replace('/', '')
            current_group = {"group_tag": group_tag, "is_fixed": '#' in group_tag, "questions": []}
            test_structure.append(current_group)
            current_question = None
            continue

        question_match = question_regex.search(text)
        if question_match:
            if current_group is None:
                current_group = { "group_tag": "g3", "is_fixed": False, "questions": [] }
                test_structure.append(current_group)
            current_question = {"question_text": text, "answers": [], "correct_answer": None}
            current_group["questions"].append(current_question)
            continue

        answer_match = answer_regex.search(text)
        if answer_match and current_question is not None:
            answer_prefix = answer_match.group(1).upper().replace('#', '')
            answer_text = text[answer_match.end():].strip()
            is_fixed = '#' in answer_match.group(0)
            is_correct = any(run.font.underline for run in para.runs)

            answer_obj = {"prefix": answer_prefix, "text": answer_text, "is_fixed": is_fixed}
            current_question["answers"].append(answer_obj)
            if is_correct:
                current_question["correct_answer"] = answer_prefix
            continue
    return test_structure, None

@app.route('/')
def home():
    return "Xin chào, API Backend của TronDeTN đang hoạt động!"

@app.route('/upload', methods=['POST'])
def handle_upload():
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"error": "Thiếu token xác thực"}), 401

    try:
        jwt_token = auth_header.split(' ')[1]
        user_id = supabase.auth.get_user(jwt_token).user.id
    except Exception as e:
        return jsonify({"error": f"Token không hợp lệ: {e}"}), 401

    if 'file' not in request.files: return jsonify({"error": "Không có tệp"}), 400
    file = request.files['file']
    if not file.filename.endswith('.docx'): return jsonify({"error": "Chỉ chấp nhận .docx"}), 400

    parsed_data, error = parse_test_document(file.stream)
    if error: return jsonify({"error": error}), 500

    rows_to_insert = []
    for group in parsed_data:
        for question in group["questions"]:
            if not question["answers"]: continue
            rows_to_insert.append({
                "user_id": user_id,
                "group_tag": group["group_tag"],
                "group_is_fixed": group["is_fixed"],
                "question_text": question["question_text"],
                "answers": json.dumps(question["answers"], ensure_ascii=False),
                "correct_answer": question.get("correct_answer")
            })

    if not rows_to_insert: return jsonify({"error": "Không tìm thấy câu hỏi hợp lệ"}), 400

    try:
        supabase.table('question_banks').insert(rows_to_insert).execute()
    except Exception as e:
        return jsonify({"error": f"Lỗi khi lưu vào DB: {e}"}), 500

    return jsonify({"message": f"Xử lý thành công tệp '{file.filename}'", "questions_saved": len(rows_to_insert)}), 200


# --- ENDPOINT MỚI (GIAI ĐOẠN 2) ---

@app.route('/mix', methods=['POST'])
def handle_mix():
    # 1. Xác thực người dùng
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"error": "Thiếu token xác thực"}), 401

    try:
        jwt_token = auth_header.split(' ')[1]
        user_id = supabase.auth.get_user(jwt_token).user.id
    except Exception as e:
        return jsonify({"error": f"Token không hợp lệ: {e}"}), 401

    # 2. Lấy thông số từ Frontend
    data = request.json
    num_tests = int(data.get('num_tests', 2))
    base_name = data.get('base_name', 'VLT').upper()

    # 3. Lấy toàn bộ câu hỏi của user từ DB
    try:
        response = supabase.table('question_banks').select("*").eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({"error": "Không tìm thấy câu hỏi nào trong kho dữ liệu. Vui lòng upload đề trước."}), 404

        # Phân loại câu hỏi vào các nhóm
        groups = {}
        for q in response.data:
            tag = q['group_tag']
            if tag not in groups:
                groups[tag] = []
            groups[tag].append(q)

    except Exception as e:
        return jsonify({"error": f"Lỗi khi lấy dữ liệu từ DB: {e}"}), 500

    # 4. Tạo file Zip trong bộ nhớ
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:

        # 5. Lặp để tạo số lượng đề
        for i in range(1, num_tests + 1):
            doc = Document() # Tạo một file docx mới
            doc.add_heading(f"ĐỀ KIỂM TRA - MÃ ĐỀ: {base_name}{i:02d}", 0)

            question_counter = 1

            # Sắp xếp các nhóm (ví dụ: g3, g1, g0)
            sorted_group_tags = sorted(groups.keys())

            for tag in sorted_group_tags:
                question_list = groups[tag]

                # Xử lý hoán vị tùy theo thẻ nhóm
                if tag in ['g1', 'g3']:
                    random.shuffle(question_list)

                for q in question_list:
                    # Thêm câu hỏi
                    doc.add_paragraph(f"Câu {question_counter}. {q['question_text'].split('.', 1)[-1].strip()}", style='List Number')
                    question_counter += 1

                    # Lấy đáp án và xử lý
                    answers = json.loads(q['answers'])
                    if tag in ['g2', 'g3']:
                        random.shuffle(answers)

                    # Thêm đáp án
                    answer_prefixes = ['A', 'B', 'C', 'D']
                    for j, ans in enumerate(answers):
                        prefix = answer_prefixes[j]
                        p = doc.add_paragraph(f"{prefix}. {ans['text']}")
                        p.paragraph_format.left_indent = docx.shared.Pt(36) # Thụt lề đáp án

                        # (Tùy chọn) Nếu bạn muốn tô đỏ đáp án đúng
                        # if ans['prefix'] == q['correct_answer']:
                        #    p.runs[0].font.color.rgb = docx.shared.RGBColor(0xFF, 0x00, 0x00)

            # Lưu file docx vào bộ nhớ tạm
            doc_buffer = io.BytesIO()
            doc.save(doc_buffer)
            doc_buffer.seek(0)

            # Thêm file docx từ bộ nhớ tạm vào file Zip
            file_name = f"Ma_de_{base_name}{i:02d}.docx"
            zip_file.writestr(file_name, doc_buffer.read())

    zip_buffer.seek(0)

    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name=f'Bo_{num_tests}_de_tron.zip'
    )

# --- (MỚI) ENDPOINT XÓA KHO CÂU HỎI ---

@app.route('/clear', methods=['DELETE'])
def handle_clear():
    # 1. Xác thực người dùng
    auth_header = request.headers.get('Authorization')
    if not auth_header: return jsonify({"error": "Thiếu token xác thực"}), 401

    try:
        jwt_token = auth_header.split(' ')[1]
        user_id = supabase.auth.get_user(jwt_token).user.id
    except Exception as e:
        return jsonify({"error": f"Token không hợp lệ: {e}"}), 401

    # 2. Xóa dữ liệu
    try:
        # Xóa tất cả các hàng có user_id_
        data, count = supabase.table('question_banks').delete().eq('user_id', user_id).execute()

        num_deleted = 0
        # 'count' trả về một tuple, ta cần phần tử thứ 2 (chỉ số 1)
        if count and len(count) > 1 and count[1]:
            num_deleted = len(count[1])

        return jsonify({"message": f"Đã xóa thành công {num_deleted} câu hỏi cũ."}), 200

    except Exception as e:
        return jsonify({"error": f"Lỗi khi xóa dữ liệu: {e}"}), 500

# Chạy ứng dụng (cho Render)
# (Dòng if __name__... đã có sẵn, bạn dán code mới BÊN TRÊN nó)

# Chạy ứng dụng (cho Render)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))


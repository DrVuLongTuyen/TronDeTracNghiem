import os
import re
import docx
import json
import random 
import io       
import zipfile  
from docx import Document 
from docx.shared import Pt 
from docx.enum.text import WD_ALIGN_PARAGRAPH
from datetime import datetime 
import traceback # Thư viện để in lỗi chi tiết

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
# (QUAN TRỌNG) Import thư viện Supabase chính xác
from supabase import create_client, Client 

# --- Cấu hình ---
app = Flask(__name__)
CORS(app) 

# --- Kết nối Supabase ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print("Đã kết nối Supabase (Backend Service Role)")


# --- HÀM /UPLOAD (ĐÃ SỬA LỖI ĐỌC CÂU HỎI NHIỀU DÒNG) ---

def parse_test_document(file_stream):
    try:
        doc = docx.Document(file_stream)
    except Exception as e:
        return None, f"Lỗi đọc tệp DOCX: {e}"

    test_structure = []
    current_group = None
    current_question = None
    pending_question_text = ""

    group_regex = re.compile(r"<(/?#?g\d+)>")
    question_regex = re.compile(r"^(Câu|Question)\s+\d+[\.:]?\s+", re.IGNORECASE)
    answer_regex = re.compile(r"^(#?[A-Z])[\.:]?\s+", re.IGNORECASE) 

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text: continue
        
        group_match = group_regex.search(text)
        if group_match:
            group_tag = group_match.group(1).replace('#', '').replace('/', '')
            current_group = {"group_tag": group_tag, "is_fixed": '#' in group_tag, "questions": []}
            test_structure.append(current_group)
            current_question = None
            pending_question_text = ""
            continue
            
        question_match = question_regex.search(text)
        if question_match:
            if current_group is None:
                current_group = { "group_tag": "g3", "is_fixed": False, "questions": [] }
                test_structure.append(current_group)
            
            pending_question_text = text 
            current_question = None 
            continue
            
        answer_match = answer_regex.search(text)
        if answer_match:
            if pending_question_text and current_question is None:
                current_question = {"question_text": pending_question_text, "answers": [], "correct_answer": None}
                current_group["questions"].append(current_question)
                pending_question_text = "" 
            
            if current_question is not None:
                answer_prefix = answer_match.group(1).upper().replace('#', '')
                answer_text = text[answer_match.end():].strip()
                is_fixed = '#' in answer_match.group(0)
                is_correct = any(run.font.underline for run in para.runs)
                
                answer_obj = {"prefix": answer_prefix, "text": answer_text, "is_fixed": is_fixed}
                current_question["answers"].append(answer_obj)
                if is_correct:
                    current_question["correct_answer"] = answer_prefix
                continue
        
        if pending_question_text and not group_match and not question_match and not answer_match:
            pending_question_text += "\n" + text 
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


# --- ENDPOINT XÓA KHO CÂU HỎI (ĐÃ SỬA LỖI) ---

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
        response = supabase.table('question_banks').delete().eq('user_id', user_id).execute()
        num_deleted = len(response.data) 
        
        return jsonify({"message": f"Đã xóa thành công {num_deleted} câu hỏi cũ."}), 200
        
    except Exception as e:
        return jsonify({"error": f"Lỗi khi xóa dữ liệu: {e}"}), 500

    
# --- (NÂNG CẤP) ENDPOINT TRỘN ĐỀ (VỚI TRY...EXCEPT) ---

def create_answer_key_doc(answer_key_map, base_name, num_tests):
    doc = Document()
    doc.add_heading("NỘI DUNG ĐÁP ÁN", 0).alignment = WD_ALIGN_PARAGRAPH.CENTER
    doc.add_paragraph() 

    num_questions = 0
    if num_tests > 0 and len(answer_key_map) > 0:
        first_test_code = list(answer_key_map.keys())[0]
        num_questions = len(answer_key_map[first_test_code])
    
    rows_per_col = (num_questions + 1) // 2 
    num_cols = (num_tests + 1) * 2
    table = doc.add_table(rows=rows_per_col + 1, cols=num_cols) 
    table.style = 'Table Grid'
    table.autofit = True

    header_cells = table.rows[0].cells
    for i in range(2): 
        col_offset = i * (num_tests + 1)
        header_cells[col_offset].text = 'Đề\\câu'
        for j in range(num_tests):
            header_cells[col_offset + j + 1].text = f"{base_name}{j+1:02d}"

    for row in range(rows_per_col):
        for col_group in range(2): 
            col_offset = col_group * (num_tests + 1)
            
            question_num = row + (col_group * rows_per_col) + 1
            if question_num > num_questions:
                break 

            table.cell(row + 1, col_offset).text = str(question_num)
            
            for test_idx in range(num_tests):
                test_code = f"{base_name}{test_idx+1:02d}"
                if test_code in answer_key_map and len(answer_key_map[test_code]) > (question_num - 1):
                    answer = answer_key_map[test_code][question_num - 1]
                    table.cell(row + 1, col_offset + test_idx + 1).text = answer

    doc_buffer = io.BytesIO()
    doc.save(doc_buffer)
    doc_buffer.seek(0)
    return doc_buffer

@app.route('/mix', methods=['POST'])
def handle_mix():
    # (QUAN TRỌNG) Thêm khối TRY...EXCEPT lớn để bắt lỗi
    try:
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
            
            groups = {}
            for q in response.data:
                tag = q['group_tag']
                if tag not in groups:
                    groups[tag] = []
                groups[tag].append(q)
                
        except Exception as e:
            return jsonify({"error": f"Lỗi khi lấy dữ liệu từ DB: {e}"}), 500
            
        answer_key_map = {}
            
        # 4. Tạo file Zip trong bộ nhớ
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            
            # 5. Lặp để tạo số lượng đề
            for i in range(1, num_tests + 1):
                test_code = f"{base_name}{i:02d}" 
                answer_key_map[test_code] = [] 
                
                doc = Document() 
                doc.add_heading(f"ĐỀ KIỂM TRA - MÃ ĐỀ: {test_code}", 0)
                
                question_counter = 1
                sorted_group_tags = sorted(groups.keys())
                
                for tag in sorted_group_tags:
                    question_list = groups[tag]
                    
                    if tag in ['g1', 'g3']:
                        random.shuffle(question_list)
                    
                    for q in question_list:
                        question_regex = re.compile(r"^(Câu|Question)\s+\d+[\.:]?\s+", re.IGNORECASE)
                        clean_question_text = question_regex.sub("", q['question_text']).strip()
                        
                        doc.add_paragraph(f"Câu {question_counter}. {clean_question_text}")
                        question_counter += 1
                        
                        answers = json.loads(q['answers'])
                        correct_answer_original_prefix = q['correct_answer'] 
                        
                        if tag in ['g2', 'g3']:
                            random.shuffle(answers)
                        
                        answer_prefixes = ['A', 'B', 'C', 'D']
                        found_correct_answer = False 
                        
                        # Giới hạn chỉ 4 đáp án A,B,C,D
                        for j, ans in enumerate(answers[:4]):
                            new_prefix = answer_prefixes[j] 
                            p = doc.add_paragraph(f"{new_prefix}. {ans['text']}")
                            p.paragraph_format.left_indent = Pt(36) 
                            
                            if ans['prefix'] == correct_answer_original_prefix:
                                answer_key_map[test_code].append(new_prefix)
                                found_correct_answer = True 

                        if not found_correct_answer:
                            answer_key_map[test_code].append('?') 

                doc_buffer = io.BytesIO()
                doc.save(doc_buffer)
                doc_buffer.seek(0)
                
                file_name = f"Ma_de_{test_code}.docx"
                zip_file.writestr(file_name, doc_buffer.read())

            # 6. Tạo tệp đáp án tổng hợp
            answer_key_buffer = create_answer_key_doc(answer_key_map, base_name, num_tests)
            zip_file.writestr(f"Dap_an_Tong_hop_{base_name}.docx", answer_key_buffer.read())

        zip_buffer.seek(0)
        
        current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'Bo_de_tron_{base_name}_{current_time}.zip' 
        )
        
    # (QUAN TRỌNG) Bắt lỗi và trả về thông báo (thay vì làm sập server)
    except Exception as e:
        print("--- LỖI NGHIÊM TRỌNG TRONG /MIX ---")
        print(traceback.format_exc()) # In lỗi chi tiết ra Log của Render
        print("---------------------------------")
        # Trả về lỗi 500 cho người dùng
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {str(e)}. Vui lòng kiểm tra lại file .docx (ví dụ: thiếu đáp án) hoặc liên hệ hỗ trợ."}), 500


# Chạy ứng dụng (cho Render)
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))

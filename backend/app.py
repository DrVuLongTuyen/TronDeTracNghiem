import os
import json
import traceback 
import io
from datetime import datetime 
from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
from supabase import create_client, Client 

from docx_parser import parse_test_document
from docx_builder import build_mixed_test_zip

# --- Cấu hình ---
app = Flask(__name__)
CORS(app, expose_headers=['Content-Disposition'])

# === (FIX V22) SỬA LỖI CRASH LOOP ===
# 1. Khởi tạo supabase = None
supabase: Client = None 

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
DATABASE_ERROR = None # Biến lưu lỗi

if not SUPABASE_URL or not SUPABASE_KEY:
    DATABASE_ERROR = "Lỗi nghiêm trọng: Biến môi trường SUPABASE_URL hoặc SUPABASE_KEY chưa được cài đặt trên Render."
    print(DATABASE_ERROR)
else:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Đã kết nối Supabase (Backend Service Role)")
    except Exception as e:
        DATABASE_ERROR = f"Lỗi khi khởi tạo Supabase client: {e}. Vui lòng kiểm tra lại SUPABASE_KEY (phải là service_role)."
        print(DATABASE_ERROR)
# === KẾT THÚC FIX V22 ===


# === API ENDPOINTS ===

@app.route('/')
def home():
    if DATABASE_ERROR:
        return f"API ĐANG BỊ LỖI KẾT NỐI CSDL: {DATABASE_ERROR}", 500
    return "Xin chào, API Backend của TronDeTN (Phiên bản V22) đang hoạt động!"

@app.route('/wake', methods=['GET'])
def handle_wake():
    # (FIX V22) Kiểm tra CSDL trước
    if DATABASE_ERROR or supabase is None:
        return jsonify({"error": f"Lỗi CSDL: {DATABASE_ERROR}"}), 500
        
    try:
        supabase.table('profiles').select('id', count='exact').limit(1).execute()
        return jsonify({"message": "Đã thức!"}), 200
    except Exception as e:
        return jsonify({"error": f"Đang trong quá trình đánh thức: {e}"}), 503 


def get_user_id_from_token(request):
    # (FIX V22) Kiểm tra CSDL trước
    if DATABASE_ERROR or supabase is None:
        raise Exception(f"Lỗi CSDL: {DATABASE_ERROR}")
        
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise Exception("Thiếu token xác thực")
    
    jwt_token = auth_header.split(' ')[1]
    user_id = supabase.auth.get_user(jwt_token).user.id
    return user_id

@app.route('/upload', methods=['POST'])
def handle_upload():
    try:
        user_id = get_user_id_from_token(request)
        if 'file' not in request.files: return jsonify({"error": "Không có tệp"}), 400
        file = request.files['file']
        parsed_data, error = parse_test_document(file.stream)
        if error: return jsonify({"error": error}), 500
        
        rows_to_insert = []
        for group in parsed_data:
            for question in group["questions"]:
                if not question["answers"]: continue
                rows_to_insert.append({
                    "user_id": user_id, "group_tag": group["group_tag"], "is_fixed": group["is_fixed"],
                    "question_text": question["question_text"], "answers": json.dumps(question["answers"], ensure_ascii=False),
                    "correct_answer": question.get("correct_answer")
                })
        
        if not rows_to_insert: return jsonify({"error": "Không tìm thấy câu hỏi hợp lệ trong tệp."}), 400
        supabase.table('question_banks').insert(rows_to_insert).execute()
        return jsonify({"message": f"Xử lý thành công tệp '{file.filename}'", "questions_saved": len(rows_to_insert)}), 200
        
    except Exception as e:
        print(f"Lỗi trong /upload: {e}")
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {e}"}), 500


@app.route('/clear', methods=['DELETE'])
def handle_clear():
    try:
        user_id = get_user_id_from_token(request)
        response = supabase.table('question_banks').delete().eq('user_id', user_id).execute()
        num_deleted = len(response.data) 
        return jsonify({"message": f"Đã xóa thành công {num_deleted} câu hỏi cũ."}), 200
    except Exception as e:
        print(f"Lỗi trong /clear: {e}")
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {e}"}), 500


@app.route('/mix', methods=['POST'])
def handle_mix():
    try:
        user_id = get_user_id_from_token(request)
        data = request.json
        num_tests = int(data.get('num_tests', 2))
        base_name = data.get('base_name', 'VLT').upper()
        header_data = data.get('header_data', {})
        logo_preference = data.get('logo_preference', 'custom')
        logo_data = None
        
        if logo_preference == "custom":
            try:
                logo_data = supabase.storage.from_('logos').download(f'logos/{user_id}')
                print(f"Đã tìm thấy logo tùy chỉnh cho {user_id}.")
            except Exception as e:
                print(f"Không tìm thấy logo tùy chỉnh cho {user_id}. Dùng mặc định. Lỗi: {e}")
                try:
                    with open('backend/logo_default.png', 'rb') as f:
                        logo_data = f.read()
                except Exception as e_file:
                    print(f"LỖI NGHIÊM TRỌNG: Không đọc được logo_default.png. Bỏ qua logo. Lỗi: {e_file}")
                    logo_data = None
        
        try:
            response = supabase.table('question_banks').select("*").eq('user_id', user_id).execute()
            if not response.data:
                return jsonify({"error": "Không tìm thấy câu hỏi nào trong kho dữ liệu."}), 404
            
            groups = {}
            for q in response.data:
                tag = q['group_tag']
                if tag not in groups:
                    groups[tag] = []
                groups[tag].append(q)
                
        except Exception as e:
            return jsonify({"error": f"Lỗi khi lấy dữ liệu từ DB: {e}"}), 500
            
        zip_buffer = build_mixed_test_zip(groups, num_tests, base_name, header_data, logo_data)
        
        current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
        download_name = f'Bo_de_tron_{base_name}_{current_time}.zip'
        
        response = make_response(send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=download_name
        ))
        response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
        
    except Exception as e:
        print("--- LỖI NGHIÊM TRỌNG TRONG /MIX ---")
        print(traceback.format_exc()) 
        print("---------------------------------")
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {str(e)}."}), 500

# Chạy ứng dụng
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

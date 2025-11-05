import os
import json
import traceback 
from datetime import datetime 
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from supabase import create_client, Client 

# (MỚI) Import các tệp đã chia nhỏ
from docx_parser import parse_test_document
from docx_builder import build_mixed_test_zip

# --- Cấu hình ---
app = Flask(__name__)

# === (SỬA LỖI BƯỚC 16) ===
# Chỉ expose chính xác 'Content-Disposition' (viết hoa) để đồng bộ với api.js
CORS(app, expose_headers=['Content-Disposition']) 
# === KẾT THÚC SỬA LỖI ===

# --- Kết nối Supabase ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Kiểm tra xem key có được tải không
if not SUPABASE_URL or not SUPABASE_KEY:
    print("Lỗi nghiêm trọng: Biến môi trường SUPABASE_URL hoặc SUPABASE_KEY chưa được cài đặt trên Render.")
    # (Tùy chọn) Có thể raise Exception ở đây để dừng app nếu muốn
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Đã kết nối Supabase (Backend Service Role)")
    except Exception as e:
        print(f"Lỗi khi khởi tạo Supabase client: {e}")

# === API ENDPOINTS ===

@app.route('/')
def home():
    return "Xin chào, API Backend của TronDeTN (Phiên bản GĐ4) đang hoạt động!"

def get_user_id_from_token(request):
    """Hàm phụ trợ: Xác thực token và trả về user_id."""
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        raise Exception("Thiếu token xác thực")
    
    jwt_token = auth_header.split(' ')[1]
    
    if not supabase:
        raise Exception("Kết nối Supabase chưa được khởi tạo.")
        
    user_id = supabase.auth.get_user(jwt_token).user.id
    return user_id

@app.route('/upload', methods=['POST'])
def handle_upload():
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
             return jsonify({"error": "Token không hợp lệ"}), 401

        if 'file' not in request.files: return jsonify({"error": "Không có tệp"}), 400
        file = request.files['file']
        if not file.filename.endswith('.docx'): return jsonify({"error": "Chỉ chấp nhận .docx"}), 400

        # Gọi hàm từ docx_parser.py
        parsed_data, error = parse_test_document(file.stream)
        if error: return jsonify({"error": error}), 500
            
        rows_to_insert = []
        for group in parsed_data:
            for question in group["questions"]:
                if not question["answers"]: continue
                rows_to_insert.append({
                    "user_id": user_id, 
                    "group_tag": group["group_tag"], 
                    "is_fixed": group["is_fixed"],
                    "question_text": question["question_text"], 
                    "answers": json.dumps(question["answers"], ensure_ascii=False),
                    "correct_answer": question.get("correct_answer")
                })
        
        if not rows_to_insert: return jsonify({"error": "Không tìm thấy câu hỏi hợp lệ trong tệp. Vui lòng kiểm tra lại định dạng (thiếu gạch chân, sai A. B. C.)."}), 400
        
        try:
            supabase.table('question_banks').insert(rows_to_insert).execute()
        except Exception as e:
            return jsonify({"error": f"Lỗi khi lưu vào DB: {e}"}), 500

        return jsonify({"message": f"Xử lý thành công tệp '{file.filename}'", "questions_saved": len(rows_to_insert)}), 200
        
    except Exception as e:
        print(f"Lỗi trong /upload: {e}")
        # Phân biệt lỗi token
        if "Invalid token" in str(e) or "Thiếu token" in str(e):
            return jsonify({"error": f"Token không hợp lệ hoặc hết hạn: {e}"}), 401
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {e}"}), 500


@app.route('/clear', methods=['DELETE'])
def handle_clear():
    try:
        user_id = get_user_id_from_token(request)
        if not user_id:
             return jsonify({"error": "Token không hợp lệ"}), 401

        try:
            response = supabase.table('question_banks').delete().eq('user_id', user_id).execute()
            num_deleted = len(response.data) 
            return jsonify({"message": f"Đã xóa thành công {num_deleted} câu hỏi cũ."}), 200
        except Exception as e:
            return jsonify({"error": f"Lỗi khi xóa dữ liệu: {e}"}), 500
            
    except Exception as e:
        print(f"Lỗi trong /clear: {e}")
        if "Invalid token" in str(e) or "Thiếu token" in str(e):
            return jsonify({"error": f"Token không hợp lệ hoặc hết hạn: {e}"}), 401
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {e}"}), 500


@app.route('/mix', methods=['POST'])
def handle_mix():
    try:
        # 1. Xác thực người dùng
        user_id = get_user_id_from_token(request)
        if not user_id:
             return jsonify({"error": "Token không hợp lệ"}), 401

        # 2. Lấy thông số từ Frontend
        data = request.json
        num_tests = int(data.get('num_tests', 2))
        base_name = data.get('base_name', 'VLT').upper()
        header_data = data.get('header_data', {})
        
        # 3. Lấy toàn bộ câu hỏi của user từ DB
        try:
            response = supabase.table('question_banks').select("*").eq('user_id', user_id).execute()
            if not response.data:
                return jsonify({"error": "Không tìm thấy câu hỏi nào trong kho dữ liệu. Vui lòng upload đề trước."}), 404
            
            # (Tối ưu) Sắp xếp câu hỏi thành các nhóm
            groups = {}
            for q in response.data:
                tag = q['group_tag']
                if tag not in groups:
                    groups[tag] = []
                groups[tag].append(q)
                
        except Exception as e:
            return jsonify({"error": f"Lỗi khi lấy dữ liệu từ DB: {e}"}), 500
            
        # 4. Gọi hàm từ docx_builder.py
        zip_buffer = build_mixed_test_zip(groups, num_tests, base_name, header_data)
        
        # 5. Tạo tên file .zip (có ngày giờ)
        current_time = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            # (Quan trọng) Tên tệp này sẽ được gửi về frontend
            download_name=f'Bo_de_tron_{base_name}_{current_time}.zip' 
        )
        
    except Exception as e:
        print("--- LỖI NGHIÊM TRỌNG TRONG /MIX ---")
        print(traceback.format_exc()) 
        print("---------------------------------")
        return jsonify({"error": f"Lỗi máy chủ nội bộ: {str(e)}. Vui lòng kiểm tra lại file .docx (ví dụ: thiếu đáp án, sai định dạng) hoặc liên hệ hỗ trợ."}), 500


# Chạy ứng dụng (cho Render)
if __name__ == '__main__':
    # Render sẽ tự động gán PORT qua biến môi trường
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)

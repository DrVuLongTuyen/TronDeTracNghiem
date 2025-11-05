import docx
import re

def parse_test_document(file_stream):
    """
    Đọc và phân tích tệp .docx chứa đề thi trắc nghiệm.
    """
    try:
        doc = docx.Document(file_stream)
    except Exception as e:
        print(f"Lỗi docx_parser: {e}")
        return None, f"Lỗi đọc tệp DOCX: {e}"

    test_structure = []
    current_group = None
    current_question = None
    pending_question_text = "" # Biến đệm cho câu hỏi nhiều dòng

    # Định nghĩa các Regex
    group_regex = re.compile(r"<(/?#?g\d+)>")
    question_regex = re.compile(r"^(Câu|Question)\s+\d+[\.:]?\s+", re.IGNORECASE)
    answer_regex = re.compile(r"^(#?[A-Z])[\.:]?\s+", re.IGNORECASE) 

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text: continue
        
        # 1. Kiểm tra thẻ nhóm
        group_match = group_regex.search(text)
        if group_match:
            group_tag = group_match.group(1).replace('#', '').replace('/', '')
            current_group = {"group_tag": group_tag, "is_fixed": '#' in group_tag, "questions": []}
            test_structure.append(current_group)
            current_question = None
            pending_question_text = "" # Reset
            continue
            
        # 2. Kiểm tra câu hỏi
        question_match = question_regex.search(text)
        if question_match:
            if current_group is None: # Nếu không có nhóm, tự tạo nhóm mặc định
                current_group = { "group_tag": "g3", "is_fixed": False, "questions": [] }
                test_structure.append(current_group)
            
            pending_question_text = text # Lưu vào biến đệm
            current_question = None 
            continue
            
        # 3. Kiểm tra đáp án
        answer_match = answer_regex.search(text)
        if answer_match:
            # Nếu tìm thấy đáp án (A,B,C) VÀ đang có câu hỏi chờ
            if pending_question_text and current_question is None:
                current_question = {"question_text": pending_question_text, "answers": [], "correct_answer": None}
                current_group["questions"].append(current_question)
                pending_question_text = "" # Xóa biến đệm
            
            # Gán đáp án cho câu hỏi hiện tại
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
        
        # 4. Nếu là text thừa (thuộc câu hỏi nhiều dòng)
        if pending_question_text and not group_match and not question_match and not answer_match:
            pending_question_text += "\n" + text # Nối vào câu hỏi đang chờ
            continue

    return test_structure, None

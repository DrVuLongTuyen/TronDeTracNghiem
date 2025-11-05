import docx
import json
import random 
import io       
import zipfile  
from docx import Document 
from docx.shared import Pt, Cm 
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.text import WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import re 

# === HÀM STYLE CHUNG ===
def style_run(run, bold=False, italic=False, size=13):
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    
def style_paragraph(p, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1.15, space_after=0, page_break_before=False, keep_with_next=False, space_before=0):
    p.paragraph_format.alignment = align
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before) 
    p.paragraph_format.page_break_before = page_break_before 
    p.paragraph_format.keep_with_next = keep_with_next 
    p.paragraph_format.widow_control = False 

# === HÀM TẠO ĐƯỜNG KẺ NGANG (BORDER) CHO PARAGRAPH ===
def set_paragraph_border(paragraph):
    pPr = paragraph._p.get_or_add_pPr() 
    pBdr = OxmlElement('w:pBdr')       
    
    topBdr = OxmlElement('w:top')
    topBdr.set(qn('w:val'), 'dotted') 
    topBdr.set(qn('w:sz'), '2')     
    topBdr.set(qn('w:space'), '1')
    topBdr.set(qn('w:color'), 'auto')
    
    pBdr.append(topBdr)
    pPr.append(pBdr)

# === HÀM TẠO FOOTER (LOGIC V7 ĐÃ CHUẨN) ===
def create_footer(doc, total_questions):
    section = doc.sections[0]
    footer = section.footer
    
    section.footer_distance = Cm(1)
    section.different_first_page_header_footer = False
    
    p_footer = footer.paragraphs[0]
    p_footer.clear()
        
    set_paragraph_border(p_footer)
    
    tab_stops = p_footer.paragraph_format.tab_stops
    tab_stops.clear_all() 
    tab_stops.add_tab_stop(Cm(18.9), WD_TAB_ALIGNMENT.RIGHT) 
    
    style_paragraph(p_footer, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1, space_after=0, space_before=Pt(4))
    
    run = p_footer.add_run("Ghi chú: ")
    style_run(run, bold=True, italic=True, size=11)
    
    run = p_footer.add_run(f"Đề thi gồm {total_questions} câu, được in trên ")
    style_run(run, bold=False, italic=True, size=11)
    
    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'begin')
    run._r.append(fldChar)
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'NUMPAGES'
    run._r.append(instrText)
    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar)
    
    run = p_footer.add_run(" trang giấy A4")
    style_run(run, bold=False, italic=True, size=11)
    
    p_footer.add_run("\t")
    
    run = p_footer.add_run("Trang ")
    style_run(run, bold=False, italic=False, size=11)
    
    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'begin')
    run._r.append(fldChar)
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'PAGE'
    run._r.append(instrText)
    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar)

    run = p_footer.add_run("/")
    style_run(run, bold=False, italic=False, size=11)

    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'begin')
    run._r.append(fldChar)
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = 'NUMPAGES'
    run._r.append(instrText)
    fldChar = OxmlElement('w:fldChar')
    fldChar.set(qn('w:fldCharType'), 'end')
    run._r.append(fldChar)


# === HÀM TẠO ĐÁP ÁN (KHÔNG ĐỔI) ===
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
            if question_num > num_questions: break 
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

# === (LOGIC NGẮT TRANG V7) HÀM CHÍNH TẠO FILE ZIP ===
def build_mixed_test_zip(groups, num_tests, base_name, header_data):
    
    question_regex = re.compile(r"^(Câu|Question)\s+\d+[\.:]?\s+", re.IGNORECASE)
    
    school_name = header_data.get('school_name', '').upper()
    exam_name = header_data.get('exam_name', '').upper()
    class_name = header_data.get('class_name', '').upper()
    subject_name = header_data.get('subject_name', '')
    exam_iteration = header_data.get('exam_iteration', '1')
    exam_time = header_data.get('exam_time', '90')
    allow_documents = header_data.get('allow_documents', False)
    
    answer_key_map = {}
            
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        
        for i in range(1, num_tests + 1):
            test_code = f"{base_name}{i:02d}" 
            answer_key_map[test_code] = [] 
            
            doc = Document() 
            
            section = doc.sections[0]
            section.left_margin = Cm(1)
            section.right_margin = Cm(1)
            section.top_margin = Cm(1)
            section.bottom_margin = Cm(1)
            
            # --- TẠO HEADER (Đã chuẩn) ---
            table_header = doc.add_table(rows=1, cols=2)
            table_header.autofit = True
            
            cell_0 = table_header.cell(0, 0)
            cell_0.width = Cm(9) 
            p_school = cell_0.paragraphs[0]
            run_school = p_school.add_run(school_name)
            style_run(run_school, bold=True, size=12)
            style_paragraph(p_school, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1, space_after=0)
            
            cell_1 = table_header.cell(0, 1)
            cell_1.width = Cm(10) 

            p_exam = cell_1.paragraphs[0]
            run_exam = p_exam.add_run(exam_name)
            style_run(run_exam, bold=True, size=12) 
            style_paragraph(p_exam, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1, space_after=0) 
            
            p_class = cell_1.add_paragraph()
            run_class = p_class.add_run(f"LỚP: {class_name}")
            style_run(run_class, bold=True, size=12) 
            style_paragraph(p_class, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1, space_after=0) 
            
            p_subject = cell_1.add_paragraph()
            run_subject = p_subject.add_run(f"Tên học phần: {subject_name} (Lần {exam_iteration})")
            style_run(run_subject, bold=False, size=12) 
            style_paragraph(p_subject, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1, space_after=0) 

            p_time = cell_1.add_paragraph()
            run_time = p_time.add_run(f"Thời gian: {exam_time} phút (không kể thời gian phát đề)")
            style_run(run_time, bold=False, size=12) 
            style_paragraph(p_time, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1, space_after=0) 

            # --- (LOGIC NGẮT TRANG V7) ---
            
            # 1. TẠO "ĐỀ SỐ"
            doc_text = "(HSSV không được sử dụng tài liệu)" if not allow_documents else "(HSSV được sử dụng tài liệu)"
            p_de = doc.add_paragraph()
            run_de = p_de.add_run(f"ĐỀ SỐ: {test_code} ")
            style_run(run_de, bold=True, size=13)
            run_doc = p_de.add_run(doc_text)
            style_run(run_doc, bold=False, size=13)
            # (FIX V7) XÓA keep_with_next. Chỉ thêm dãn đoạn.
            style_paragraph(p_de, line_spacing=1.15, space_after=0, keep_with_next=False, space_before=Pt(6))

            # 2. TẠO "NỘI DUNG ĐỀ THI"
            p_title = doc.add_paragraph()
            run_title = p_title.add_run("NỘI DUNG ĐỀ THI")
            style_run(run_title, bold=True, size=13)
            # (FIX V7) XÓA page_break_before và keep_with_next.
            # Giải pháp an toàn nhất, chấp nhận lỗi ngắt trang (nếu có)
            style_paragraph(p_title, align=WD_ALIGN_PARAGRAPH.CENTER, line_spacing=1.15, space_after=Pt(10), space_before=0, keep_with_next=False, page_break_before=False)
            
            question_counter =

# TỆP MỚI: backend/docx_utils.py
# Chứa các hàm hỗ trợ cấp thấp (styling, border)

from docx.shared import Pt, Cm 
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# === HÀM STYLE CHUNG ===
def style_run(run, bold=False, italic=False, size=13):
    """Áp dụng style Times New Roman, size, bold, italic cho Run."""
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic

def style_paragraph(p, align=WD_ALIGN_PARAGRAPH.LEFT, line_spacing=1.15, space_after=Pt(0), page_break_before=False, keep_with_next=False, space_before=Pt(0)):
    """
    Áp dụng style căn lề, dãn dòng, dãn đoạn, và ngắt trang cho Paragraph.
    (Đã sửa lỗi V16 - Spacing 2481pt)
    """
    p.paragraph_format.alignment = align
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.space_after = space_after # Gán thẳng, không Pt()
    p.paragraph_format.space_before = space_before # Gán thẳng, không Pt()
    p.paragraph_format.page_break_before = page_break_before 
    p.paragraph_format.keep_with_next = keep_with_next 
    p.paragraph_format.widow_control = False 

# === HÀM TẠO BORDER (LOGIC V2/V3) ===
def set_paragraph_border(paragraph):
    """Áp dụng một đường kẻ TOP BORDER (single, 0.5pt) cho paragraph."""
    pPr = paragraph._p.get_or_add_pPr() 
    pBdr = OxmlElement('w:pBdr')       
    
    topBdr = OxmlElement('w:top')
    topBdr.set(qn('w:val'), 'single') 
    topBdr.set(qn('w:sz'), '4') # Size (4 = 0.5 pt)       
    topBdr.set(qn('w:space'), '1')
    topBdr.set(qn('w:color'), 'auto')
    
    pBdr.append(topBdr)
    pPr.append(pBdr)

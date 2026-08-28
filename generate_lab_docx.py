import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np

import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

# Palette: The Thinking Experiment Standards
HEX_TEAL = "0F7E9B"
HEX_TEAL_DARK = "095F76"
HEX_AMBER = "D67B19"
HEX_AMBER_DARK = "B06210"
HEX_LIGHT_BG = "E6F4F8"
HEX_LIGHT_AMBER = "FDF3E8"
HEX_BORDER = "CBD5E1"
HEX_DARK = "123140"
HEX_MUTED = "4B6570"

RGB_TEAL = RGBColor(15, 126, 155)
RGB_AMBER = RGBColor(214, 123, 25)
RGB_DARK = RGBColor(18, 49, 64)
RGB_MUTED = RGBColor(75, 101, 112)

IMG_DIR = "assets_generated"
os.makedirs(IMG_DIR, exist_ok=True)

# -------------------------------------------------------------
# GRAPHICS GENERATION WITH MATPLOTLIB
# -------------------------------------------------------------

def draw_ramp_diagram(filename, scenario_id, tilt="down-right", motion_desc="Speeding Up Away (+)"):
    fig, ax = plt.subplots(figsize=(6.5, 1.6), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 3.2)
    ax.axis('off')

    # Tabletop
    ax.plot([0.5, 9.5], [0.6, 0.6], color="#4B6570", lw=2)

    # Incline track endpoints
    if tilt == "down-right":
        x0, y0 = 1.0, 2.3
        x1, y1 = 9.0, 0.8
        stand_x = 1.6
        stand_top = 2.15
    elif tilt == "up-right":
        x0, y0 = 1.0, 0.8
        x1, y1 = 9.0, 2.3
        stand_x = 8.4
        stand_top = 2.15

    # Incline wedge
    wedge = patches.Polygon([[x0, 0.6], [x1, 0.6], [x1, y1], [x0, y0]], closed=True,
                            facecolor="#E9F4FB", edgecolor="#C8DBE3", lw=1.2)
    ax.add_patch(wedge)

    # Stand
    ax.plot([stand_x, stand_x], [0.6, stand_top], color="#123140", lw=4)
    ax.plot([stand_x - 0.4, stand_x + 0.4], [0.6, 0.6], color="#123140", lw=6)

    # Track Beam
    angle = np.arctan2(y1 - y0, x1 - x0)
    dx = np.cos(angle)
    dy = np.sin(angle)
    ax.plot([x0, x1], [y0, y1], color="#0F7E9B", lw=4.5, solid_capstyle='round')

    # Motion Detector at x0, y0
    sensor_box = patches.Rectangle((x0 - 0.35, y0 - 0.15), 0.35, 0.5,
                                   angle=np.degrees(angle), facecolor="#123140", edgecolor="#095F76", lw=1.5)
    ax.add_patch(sensor_box)
    ax.text(x0 - 0.1, y0 + 0.45, "0 position\n(Motion Detector)", color="#0F7E9B", fontsize=8,
            fontweight='bold', ha='center', va='bottom')

    # Cart placement
    if scenario_id == 1:
        frac = 0.25
        v_dir = 1
    elif scenario_id == 2:
        frac = 0.35
        v_dir = 1
    elif scenario_id == 3:
        frac = 0.75
        v_dir = -1
    elif scenario_id == 4:
        frac = 0.65
        v_dir = -1
    elif scenario_id == 5:
        frac = 0.30
        v_dir = 1

    cart_x = x0 + frac * (x1 - x0)
    cart_y = y0 + frac * (y1 - y0)

    # Cart chassis
    norm_x = -dy
    norm_y = dx
    cx = cart_x + 0.18 * norm_x
    cy = cart_y + 0.18 * norm_y
    cart_rect = patches.Rectangle((cx - 0.45*dx, cy - 0.45*dy), 0.9, 0.35,
                                  angle=np.degrees(angle), facecolor="#0F7E9B", edgecolor="#095F76", lw=1.5)
    ax.add_patch(cart_rect)

    # Wheels
    w1_x = cart_x - 0.25*dx + 0.08*norm_x
    w1_y = cart_y - 0.25*dy + 0.08*norm_y
    w2_x = cart_x + 0.25*dx + 0.08*norm_x
    w2_y = cart_y + 0.25*dy + 0.08*norm_y
    ax.add_patch(patches.Circle((w1_x, w1_y), 0.08, facecolor="#334155"))
    ax.add_patch(patches.Circle((w2_x, w2_y), 0.08, facecolor="#334155"))

    # Velocity arrow on cart
    arr_len = 1.0 * v_dir
    ax.annotate("", xy=(cx + (0.45 + arr_len)*dx, cy + (0.45 + arr_len)*dy + 0.35*norm_y),
                xytext=(cx + 0.45*dx*v_dir, cy + 0.45*dy*v_dir + 0.35*norm_y),
                arrowprops=dict(arrowstyle="->", color="#D67B19", lw=2.2))
    ax.text(cx + 0.45*dx*v_dir, cy + 0.75*norm_y, f"v ({motion_desc})", color="#B06210",
            fontsize=8, fontweight='bold', ha='center')

    # Positive direction label
    ax.annotate("+ Direction", xy=(x1 - 0.2, y1 + 0.4), xytext=(x1 - 1.8, y1 + 0.4),
                arrowprops=dict(arrowstyle="->", color="#D67B19", lw=1.5),
                fontsize=8, fontweight='bold', color="#D67B19", va='center')

    plt.tight_layout(pad=0.2)
    filepath = os.path.join(IMG_DIR, filename)
    plt.savefig(filepath, dpi=300)
    plt.close()
    return filepath

def draw_empty_graph_grid(filename, graph_type="x-t"):
    fig, ax = plt.subplots(figsize=(2.3, 1.45), dpi=300)
    
    ax.set_facecolor('#FFFFFF')
    ax.grid(True, which='both', color='#E2EEF3', linestyle='-', linewidth=0.8)

    if graph_type == "x-t":
        ax.set_xlim(0, 4)
        ax.set_ylim(0, 3)
        ax.set_xlabel("t (s)", fontsize=8, fontweight='bold', color='#123140', labelpad=2)
        ax.set_ylabel("x (m)", fontsize=8, fontweight='bold', color='#123140', labelpad=2)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['left'].set_color('#123140')
        ax.spines['bottom'].set_color('#123140')
        ax.spines['left'].set_linewidth(1.2)
        ax.spines['bottom'].set_linewidth(1.2)
        ax.set_xticks([0, 1, 2, 3, 4])
        ax.set_yticks([0, 1, 2, 3])
        ax.tick_params(colors='#4B6570', labelsize=6.5)

    elif graph_type == "v-t":
        ax.set_xlim(0, 4)
        ax.set_ylim(-2.5, 2.5)
        ax.set_xlabel("t (s)", fontsize=8, fontweight='bold', color='#123140', labelpad=2)
        ax.set_ylabel("v (m/s)", fontsize=8, fontweight='bold', color='#123140', labelpad=2)
        ax.axhline(0, color='#94A3B8', linewidth=1.2)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_position(('data', 0))
        ax.spines['left'].set_color('#123140')
        ax.spines['bottom'].set_color('#94A3B8')
        ax.set_xticks([1, 2, 3, 4])
        ax.set_yticks([-2, -1, 0, 1, 2])
        ax.tick_params(colors='#4B6570', labelsize=6.5)

    elif graph_type == "a-t":
        ax.set_xlim(0, 4)
        ax.set_ylim(-2, 2)
        ax.set_xlabel("t (s)", fontsize=8, fontweight='bold', color='#123140', labelpad=2)
        ax.set_ylabel("a (m/s²)", fontsize=8, fontweight='bold', color='#123140', labelpad=2)
        ax.axhline(0, color='#94A3B8', linewidth=1.2)
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        ax.spines['bottom'].set_position(('data', 0))
        ax.spines['left'].set_color('#123140')
        ax.spines['bottom'].set_color('#94A3B8')
        ax.set_xticks([1, 2, 3, 4])
        ax.set_yticks([-2, -1, 0, 1, 2])
        ax.tick_params(colors='#4B6570', labelsize=6.5)

    plt.tight_layout(pad=0.3)
    filepath = os.path.join(IMG_DIR, filename)
    plt.savefig(filepath, dpi=300)
    plt.close()
    return filepath

def draw_motion_map_template(filename, is_turnaround=False):
    fig, ax = plt.subplots(figsize=(6.8, 1.1 if not is_turnaround else 1.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 3 if is_turnaround else 2)
    ax.axis('off')

    if not is_turnaround:
        # Single track line
        y = 1.0
        ax.plot([1.0, 9.0], [y, y], color='#C8DBE3', linestyle='--', lw=1.5)
        ax.text(1.0, y + 0.35, "0 position (Detector)", color='#0F7E9B', fontsize=8, fontweight='bold', ha='left')
        ax.text(9.0, y + 0.35, "+ Direction", color='#D67B19', fontsize=8, fontweight='bold', ha='right')
        ax.annotate("", xy=(9.0, y), xytext=(8.3, y), arrowprops=dict(arrowstyle="->", color="#D67B19", lw=2))
        ax.text(5.0, y - 0.5, "[ Draw strobe position dots • , velocity arrows → (Amber) , and acceleration arrows → (Teal) ]",
                color='#4B6570', fontsize=7.5, ha='center', style='italic')
    else:
        # Two tracks for turnaround
        y1, y2 = 2.0, 0.8
        ax.plot([1.0, 9.0], [y1, y1], color='#C8DBE3', linestyle='--', lw=1.5)
        ax.text(1.0, y1 + 0.3, "0 position", color='#0F7E9B', fontsize=8, fontweight='bold', ha='left')
        ax.text(9.0, y1 + 0.3, "+ Direction", color='#D67B19', fontsize=8, fontweight='bold', ha='right')
        ax.text(1.0, y1 - 0.35, "Ascent (Moving Up Ramp)", color='#4B6570', fontsize=7.5, fontweight='bold', ha='left')

        ax.plot([1.0, 9.0], [y2, y2], color='#C8DBE3', linestyle='--', lw=1.5)
        ax.text(1.0, y2 - 0.35, "Descent (Moving Down Ramp)", color='#4B6570', fontsize=7.5, fontweight='bold', ha='left')

    plt.tight_layout(pad=0.2)
    filepath = os.path.join(IMG_DIR, filename)
    plt.savefig(filepath, dpi=300)
    plt.close()
    return filepath

# -------------------------------------------------------------
# DOCX GENERATION HELPERS
# -------------------------------------------------------------

def set_cell_background(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=80, bottom=80, left=100, right=100):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color=HEX_BORDER, sz="4", val="single"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'<w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:left w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:right w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'<w:insideV w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def format_doc_header(doc, title, subtitle):
    p_sub = doc.add_paragraph()
    p_sub.paragraph_format.space_after = Pt(1)
    p_sub.paragraph_format.space_before = Pt(0)
    run_sub = p_sub.add_run("THE THINKING EXPERIMENT | UNIFORMLY ACCELERATED PARTICLE MODEL")
    run_sub.font.name = 'Arial'
    run_sub.font.size = Pt(8.5)
    run_sub.font.bold = True
    run_sub.font.color.rgb = RGB_AMBER

    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_after = Pt(2)
    p_title.paragraph_format.space_before = Pt(0)
    run_title = p_title.add_run(title)
    run_title.font.name = 'Arial'
    run_title.font.size = Pt(15)
    run_title.font.bold = True
    run_title.font.color.rgb = RGB_TEAL

    p_desc = doc.add_paragraph()
    p_desc.paragraph_format.space_after = Pt(8)
    p_desc.paragraph_format.space_before = Pt(0)
    run_desc = p_desc.add_run(subtitle)
    run_desc.font.name = 'Arial'
    run_desc.font.size = Pt(9.5)
    run_desc.font.color.rgb = RGB_MUTED

def add_scenario_page(doc, scenario_num, title, setup_desc, tilt, motion_desc, is_turnaround=False, page_break=True):
    if page_break:
        doc.add_page_break()

    # Section Title Header Table
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(7.2)
    cell = tbl.cell(0, 0)
    set_cell_background(cell, HEX_TEAL)
    set_cell_margins(cell, top=80, bottom=80, left=120, right=120)

    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.space_before = Pt(0)
    run_t = p.add_run(f"Scenario {scenario_num}: {title}")
    run_t.font.name = 'Arial'
    run_t.font.size = Pt(11)
    run_t.font.bold = True
    run_t.font.color.rgb = RGBColor(255, 255, 255)

    # Question a: Observation Prompt & Embedded Ramp Setup Diagram
    p_a = doc.add_paragraph()
    p_a.paragraph_format.space_before = Pt(5)
    p_a.paragraph_format.space_after = Pt(3)
    run_a = p_a.add_run(f"a. {setup_desc}")
    run_a.font.name = 'Arial'
    run_a.font.size = Pt(9.5)
    run_a.font.bold = True

    # Render & Add Ramp Image
    ramp_img = draw_ramp_diagram(f"ramp_scen_{scenario_num}.png", scenario_num, tilt, motion_desc)
    p_ramp = doc.add_paragraph()
    p_ramp.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ramp.paragraph_format.space_after = Pt(4)
    p_ramp.paragraph_format.space_before = Pt(0)
    p_ramp.add_run().add_picture(ramp_img, width=Inches(6.2))

    # Question b: Motion Map Box with Clean Axis
    tbl_mm = doc.add_table(rows=2, cols=1)
    tbl_mm.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_mm.autofit = False
    tbl_mm.columns[0].width = Inches(7.2)
    set_table_borders(tbl_mm, HEX_BORDER, sz="4")

    c_mm_hdr = tbl_mm.cell(0, 0)
    set_cell_background(c_mm_hdr, HEX_LIGHT_BG)
    set_cell_margins(c_mm_hdr, top=40, bottom=40, left=80, right=80)
    p_hdr = c_mm_hdr.paragraphs[0]
    p_hdr.paragraph_format.space_after = Pt(0)
    run_h = p_hdr.add_run("b. Motion Map: Draw strobe position dots (•), velocity vectors (→), and acceleration vectors (→).")
    run_h.font.name = 'Arial'
    run_h.font.size = Pt(8.5)
    run_h.font.bold = True
    run_h.font.color.rgb = RGB_TEAL

    c_mm_body = tbl_mm.cell(1, 0)
    set_cell_background(c_mm_body, "FFFFFF")
    set_cell_margins(c_mm_body, top=40, bottom=40, left=40, right=40)
    p_mm = c_mm_body.paragraphs[0]
    p_mm.paragraph_format.space_after = Pt(0)
    p_mm.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    mm_img = draw_motion_map_template(f"mm_scen_{scenario_num}.png", is_turnaround)
    p_mm.add_run().add_picture(mm_img, width=Inches(6.6))

    # Questions c & d Table
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    tbl_cd = doc.add_table(rows=1, cols=2)
    tbl_cd.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_cd.autofit = False
    tbl_cd.columns[0].width = Inches(3.55)
    tbl_cd.columns[1].width = Inches(3.55)
    set_table_borders(tbl_cd, HEX_BORDER, sz="4")

    c1 = tbl_cd.cell(0, 0)
    set_cell_margins(c1, top=50, bottom=50, left=80, right=80)
    p_c = c1.paragraphs[0]
    p_c.paragraph_format.space_after = Pt(0)
    if is_turnaround:
        r_c = p_c.add_run("c. Does velocity direction change?\n[   ] Yes (changes + to -)    [   ] No")
    else:
        r_c = p_c.add_run("c. Is the velocity positive or negative?\n[   ] Positive (+)    [   ] Negative (-)")
    r_c.font.name = 'Arial'
    r_c.font.size = Pt(8.5)
    r_c.font.bold = True

    c2 = tbl_cd.cell(0, 1)
    set_cell_margins(c2, top=50, bottom=50, left=80, right=80)
    p_d = c2.paragraphs[0]
    p_d.paragraph_format.space_after = Pt(0)
    if is_turnaround:
        r_d = p_d.add_run("d. Does acceleration direction change?\n[   ] Yes (reverses)    [   ] No (constant -)")
    else:
        r_d = p_d.add_run("d. Is the acceleration positive or negative?\n[   ] Positive (+)    [   ] Negative (-)")
    r_d.font.name = 'Arial'
    r_d.font.size = Pt(8.5)
    r_d.font.bold = True

    # Kinematic Coordinate Graphs & Slope Analysis (e, f, g, h)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    tbl_efgh = doc.add_table(rows=4, cols=3)
    tbl_efgh.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_efgh.autofit = False
    tbl_efgh.columns[0].width = Inches(2.3)
    tbl_efgh.columns[1].width = Inches(2.3)
    tbl_efgh.columns[2].width = Inches(2.6)
    set_table_borders(tbl_efgh, HEX_BORDER, sz="4")

    # Header Row
    headers = [
        "e. Predict Graphs (Sketch)",
        "f. Record Detector Graphs",
        "g & h. Slope Interpretation"
    ]
    for idx, text in enumerate(headers):
        cell_h = tbl_efgh.cell(0, idx)
        set_cell_background(cell_h, HEX_LIGHT_BG)
        set_cell_margins(cell_h, top=40, bottom=40, left=50, right=50)
        p_h = cell_h.paragraphs[0]
        p_h.paragraph_format.space_after = Pt(0)
        run_th = p_h.add_run(text)
        run_th.font.name = 'Arial'
        run_th.font.size = Pt(8)
        run_th.font.bold = True
        run_th.font.color.rgb = RGB_TEAL

    # Images for empty grids
    img_xt = draw_empty_graph_grid("grid_xt.png", "x-t")
    img_vt = draw_empty_graph_grid("grid_vt.png", "v-t")
    img_at = draw_empty_graph_grid("grid_at.png", "a-t")

    # Row 1: x vs t
    r1_c0 = tbl_efgh.cell(1, 0)
    set_cell_margins(r1_c0, top=20, bottom=20, left=20, right=20)
    r1_c0.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1_c0.paragraphs[0].add_run().add_picture(img_xt, width=Inches(2.1))

    r1_c1 = tbl_efgh.cell(1, 1)
    set_cell_margins(r1_c1, top=20, bottom=20, left=20, right=20)
    r1_c1.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r1_c1.paragraphs[0].add_run().add_picture(img_xt, width=Inches(2.1))

    r1_c2 = tbl_efgh.cell(1, 2)
    set_cell_margins(r1_c2, top=40, bottom=40, left=60, right=60)
    p_g = r1_c2.paragraphs[0]
    p_g.paragraph_format.space_after = Pt(0)
    run_g = p_g.add_run(
        "g. The slope of position-time is:\n"
        "[  ] constant  [  ] increasing  [  ] decreasing\n"
        "and [  ] positive  [  ] negative\n"
        "and represents: __________________"
    )
    run_g.font.name = 'Arial'
    run_g.font.size = Pt(7.5)

    # Row 2: v vs t
    r2_c0 = tbl_efgh.cell(2, 0)
    set_cell_margins(r2_c0, top=20, bottom=20, left=20, right=20)
    r2_c0.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2_c0.paragraphs[0].add_run().add_picture(img_vt, width=Inches(2.1))

    r2_c1 = tbl_efgh.cell(2, 1)
    set_cell_margins(r2_c1, top=20, bottom=20, left=20, right=20)
    r2_c1.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2_c1.paragraphs[0].add_run().add_picture(img_vt, width=Inches(2.1))

    r2_c2 = tbl_efgh.cell(2, 2)
    set_cell_margins(r2_c2, top=40, bottom=40, left=60, right=60)
    p_h_txt = r2_c2.paragraphs[0]
    p_h_txt.paragraph_format.space_after = Pt(0)
    run_h_txt = p_h_txt.add_run(
        "h. The slope of velocity-time is:\n"
        "[  ] constant  [  ] increasing  [  ] decreasing\n"
        "and [  ] positive  [  ] negative\n"
        "and represents: __________________"
    )
    run_h_txt.font.name = 'Arial'
    run_h_txt.font.size = Pt(7.5)

    # Row 3: a vs t
    r3_c0 = tbl_efgh.cell(3, 0)
    set_cell_margins(r3_c0, top=20, bottom=20, left=20, right=20)
    r3_c0.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r3_c0.paragraphs[0].add_run().add_picture(img_at, width=Inches(2.1))

    r3_c1 = tbl_efgh.cell(3, 1)
    set_cell_margins(r3_c1, top=20, bottom=20, left=20, right=20)
    r3_c1.paragraphs[0].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r3_c1.paragraphs[0].add_run().add_picture(img_at, width=Inches(2.1))

    r3_c2 = tbl_efgh.cell(3, 2)
    set_cell_margins(r3_c2, top=40, bottom=40, left=60, right=60)
    p_acc = r3_c2.paragraphs[0]
    p_acc.paragraph_format.space_after = Pt(0)
    run_acc = p_acc.add_run(
        "Acceleration is uniform:\n"
        "• Magnitude: a = g·sin(θ)\n"
        "• Sign: [  ] Positive  [  ] Negative\n"
        "• Direction: Always points down ramp."
    )
    run_acc.font.name = 'Arial'
    run_acc.font.size = Pt(7.5)

def build_student_handout():
    doc = Document()
    for section in doc.sections:
        section.top_margin = Inches(0.4)
        section.bottom_margin = Inches(0.4)
        section.left_margin = Inches(0.45)
        section.right_margin = Inches(0.45)

    format_doc_header(
        doc,
        "Lab Extension: Increasing and Decreasing Speed",
        "Student Inquiry Worksheet | Name: _______________________ Date: ________ Period: ____"
    )

    # 1. Scenario 1
    add_scenario_page(
        doc, 1, "Increasing Speed in the Positive Direction (+v, +a)",
        "Observe the cart starting from rest at x=0.2m and speeding up as it rolls down the ramp away from the detector (+ direction).",
        tilt="down-right", motion_desc="Speeding Up Away (+)", is_turnaround=False, page_break=False
    )

    # 2. Scenario 2
    add_scenario_page(
        doc, 2, "Decreasing Speed in the Positive Direction (+v, -a)",
        "Observe the cart slowing down as it coasts up the ramp away from the detector (+ direction) after an initial push. (Answer while coasting).",
        tilt="up-right", motion_desc="Slowing Down Away (+)", is_turnaround=False, page_break=True
    )

    # 3. Scenario 3
    add_scenario_page(
        doc, 3, "Increasing Speed in the Negative Direction (-v, -a)",
        "Observe the cart starting from rest at the top of the ramp (+ position) and speeding up as it rolls down towards the detector (0 position).",
        tilt="up-right", motion_desc="Speeding Up Towards (-)", is_turnaround=False, page_break=True
    )

    # 4. Scenario 4
    add_scenario_page(
        doc, 4, "Decreasing Speed in the Negative Direction (-v, +a)",
        "Observe the cart slowing down as it coasts up the ramp towards the detector (0 position) after an initial push from the bottom. (Answer while coasting).",
        tilt="down-right", motion_desc="Slowing Down Towards (-)", is_turnaround=False, page_break=True
    )

    # 5. Scenario 5
    add_scenario_page(
        doc, 5, "Up and Down the Ramp (The Turnaround)",
        "Observe the cart pushed up the ramp: moving away (+v), slowing to a momentary stop at apex (v=0), reversing direction, and rolling back down (-v).",
        tilt="up-right", motion_desc="Ascent (+v) → Turnaround (v=0) → Descent (-v)", is_turnaround=True, page_break=True
    )

    out_path = "Uniform_Acceleration_Student_Handout.docx"
    doc.save(out_path)
    print(f"Successfully generated visual handout: {out_path}")

if __name__ == "__main__":
    build_student_handout()

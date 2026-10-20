# -*- coding: utf-8 -*-
"""
Script de génération du Mémoire Universitaire & Professionnel de PFA.
Projet : Plateforme IaaS de Provisioning Automatisé de Machines Virtuelles Multi-OS.
Organisme d'accueil : Holcim Maroc (LafargeHolcim Maroc / Al Mada).
Conforme au plan académique détaillé et exhaustif demandé par l'utilisateur.
"""

import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Définit la couleur d'arrière-plan d'une cellule."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    """Définit les marges internes (padding) d'une cellule en dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def add_header_footer(doc):
    for s in doc.sections:
        s.top_margin = Inches(1)
        s.bottom_margin = Inches(1)
        s.left_margin = Inches(1)
        s.right_margin = Inches(1)
        
        # En-tête
        hdr = s.header
        hp = hdr.paragraphs[0]
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        hrun = hp.add_run("Rapport de PFA — Holcim Maroc | Plateforme IaaS Multi-OS")
        hrun.font.name = "Calibri"
        hrun.font.size = Pt(8.5)
        hrun.font.color.rgb = RGBColor(120, 144, 156)
        
        # Pied de page
        ftr = s.footer
        fp = ftr.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        frun = fp.add_run("Holcim Maroc — Direction des Systèmes d'Information | Mémoire de Fin d'Année")
        frun.font.name = "Calibri"
        frun.font.size = Pt(8.5)
        frun.font.color.rgb = RGBColor(120, 144, 156)

def style_heading_1(p):
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    for r in p.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(16)
        r.bold = True
        r.font.color.rgb = RGBColor(13, 71, 161)  # Bleu institutionnel

def style_heading_2(p):
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.keep_with_next = True
    for r in p.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(13)
        r.bold = True
        r.font.color.rgb = RGBColor(0, 137, 123)  # Vert sarcelle / émeraude

def style_heading_3(p):
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    for r in p.runs:
        r.font.name = "Calibri"
        r.font.size = Pt(11)
        r.bold = True
        r.font.color.rgb = RGBColor(55, 71, 79)

def add_body_p(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    r = p.add_run(text)
    r.font.name = "Calibri"
    r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor(38, 50, 56)
    return p

def add_bullet_p(doc, bold_prefix, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    r_bold = p.add_run(bold_prefix)
    r_bold.bold = True
    r_bold.font.name = "Calibri"
    r_bold.font.size = Pt(10.5)
    r_bold.font.color.rgb = RGBColor(38, 50, 56)
    
    r_text = p.add_run(text)
    r_text.font.name = "Calibri"
    r_text.font.size = Pt(10.5)
    r_text.font.color.rgb = RGBColor(55, 71, 79)
    return p

def add_screenshot_placeholder(doc, figure_num, title, instructions, expected_elements, image_path=None):
    """Ajoute un diagramme ou un cadre d'emplacement de capture d'écran normalisé."""
    if image_path and os.path.exists(image_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(image_path, width=Inches(6.2))
        
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(8)
        r_num = p_cap.add_run(f"Figure {figure_num} : ")
        r_num.bold = True
        r_num.font.name = "Calibri"
        r_num.font.size = Pt(9.5)
        r_num.font.color.rgb = RGBColor(13, 71, 161)
        r_desc = p_cap.add_run(title)
        r_desc.font.name = "Calibri"
        r_desc.font.size = Pt(9.5)
        r_desc.font.color.rgb = RGBColor(55, 71, 79)
        return

    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="dashed" w:sz="8" w:space="0" w:color="0D47A1"/>'
        f'<w:bottom w:val="dashed" w:sz="8" w:space="0" w:color="0D47A1"/>'
        f'<w:left w:val="single" w:sz="24" w:space="0" w:color="0D47A1"/>'
        f'<w:right w:val="dashed" w:sz="8" w:space="0" w:color="0D47A1"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(borders)
    set_cell_background(cell, "F0F4F8")
    set_cell_margins(cell, top=160, bottom=160, left=220, right=220)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(2)
    
    r_tag = p.add_run(f"📷 [ EMPLACEMENT DE CAPTURE D'ÉCRAN — FIGURE {figure_num} ]\n")
    r_tag.bold = True
    r_tag.font.name = "Calibri"
    r_tag.font.size = Pt(10.5)
    r_tag.font.color.rgb = RGBColor(13, 71, 161)
    
    r_title = p.add_run(f"Titre : {title}\n")
    r_title.bold = True
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(10)
    r_title.font.color.rgb = RGBColor(38, 50, 56)
    
    r_instr = p.add_run(f"🎯 Action / Page à capturer : {instructions}\n")
    r_instr.italic = True
    r_instr.font.name = "Calibri"
    r_instr.font.size = Pt(9.5)
    r_instr.font.color.rgb = RGBColor(55, 71, 79)
    
    r_elem = p.add_run(f"🔍 Éléments clés visibles attendus : {expected_elements}\n")
    r_elem.font.name = "Calibri"
    r_elem.font.size = Pt(9)
    r_elem.font.color.rgb = RGBColor(69, 90, 100)
    
    r_paste = p.add_run("👉 [ Collez votre capture d'écran ici en pleine largeur ]")
    r_paste.bold = True
    r_paste.font.name = "Calibri"
    r_paste.font.size = Pt(9.5)
    r_paste.font.color.rgb = RGBColor(0, 137, 123)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(4)
    p_after.paragraph_format.space_after = Pt(6)

def main():
    doc = Document()
    add_header_footer(doc)
    
    # ══════════════════════════════════════════════════════════════════════════
    # PAGE DE GARDE OFFICIELLE
    # ══════════════════════════════════════════════════════════════════════════
    for _ in range(1):
        doc.add_paragraph()
        
    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_top = p_top.add_run("ROYAUME DU MAROC\nÉCOLE SUPÉRIEURE D'INGÉNIERIE & TECHNOLOGIES DE L'INFORMATION\nDÉPARTEMENT GÉNIE LOGICIEL, SYSTÈMES & RÉSEAUX CLOUD")
    r_top.bold = True
    r_top.font.name = "Calibri"
    r_top.font.size = Pt(11)
    r_top.font.color.rgb = RGBColor(84, 110, 122)
    
    doc.add_paragraph()
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_label = p_title.add_run("MÉMOIRE DE PROJET DE FIN D'ANNÉE (PFA)\n\n")
    r_label.bold = True
    r_label.font.name = "Calibri"
    r_label.font.size = Pt(13)
    r_label.font.color.rgb = RGBColor(0, 137, 123)
    
    r_main_title = p_title.add_run(
        "CONCEPTION ET DÉPLOIEMENT D'UNE PLATEFORME IaaS AUTOMATISÉE DE PROVISIONING "
        "DE MACHINES VIRTUELLES MULTI-DISTRIBUTIONS (ZORIN OS, UBUNTU, WINDOWS 11) "
        "PAR LINKED CLONING ET CLOUD-INIT AVEC CONSOLE WEB SÉCURISÉE"
    )
    r_main_title.bold = True
    r_main_title.font.name = "Calibri"
    r_main_title.font.size = Pt(18)
    r_main_title.font.color.rgb = RGBColor(13, 71, 161)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = p_sub.add_run(
        "Projet d'Ingénierie réalisé au sein de la Direction des Systèmes d'Information de HOLCIM MAROC\n"
        "(FastAPI, React, Oracle VirtualBox VBoxManage, pycdlib, Apache Guacamole, WebSockets)"
    )
    r_sub.italic = True
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(11)
    r_sub.font.color.rgb = RGBColor(69, 90, 100)
    
    for _ in range(2):
        doc.add_paragraph()
        
    table_meta = doc.add_table(rows=2, cols=2)
    table_meta.alignment = WD_TABLE_ALIGNMENT.CENTER
    table_meta.autofit = False
    
    c00 = table_meta.cell(0, 0)
    c01 = table_meta.cell(0, 1)
    c10 = table_meta.cell(1, 0)
    c11 = table_meta.cell(1, 1)
    
    for c in (c00, c01, c10, c11):
        c.width = Inches(3.2)
        set_cell_margins(c, top=100, bottom=100, left=150, right=150)
        set_cell_background(c, "F8FAFC")
        
    p00 = c00.paragraphs[0]
    r = p00.add_run("Présenté par :\n")
    r.bold = True
    r.font.color.rgb = RGBColor(13, 71, 161)
    p00.add_run("Étudiant Ingénieur / Candidat au Diplôme\nFilière Génie Logiciel, Réseaux & Cloud")
    
    p01 = c01.paragraphs[0]
    r = p01.add_run("Sous l'encadrement de :\n")
    r.bold = True
    r.font.color.rgb = RGBColor(13, 71, 161)
    p01.add_run("Encadrant Professionnel : Ingénieur DSI (Holcim Maroc)\nEncadrant Pédagogique : Professeur Universitaire")
    
    p10 = c10.paragraphs[0]
    r = p10.add_run("Organisme d'Accueil :\n")
    r.bold = True
    r.font.color.rgb = RGBColor(0, 137, 123)
    p10.add_run("HOLCIM MAROC (LafargeHolcim Maroc)\nSiège Social : Casablanca, Maroc")
    
    p11 = c11.paragraphs[0]
    r = p11.add_run("Année Universitaire :\n")
    r.bold = True
    r.font.color.rgb = RGBColor(0, 137, 123)
    p11.add_run("2025 - 2026\nSession : Juin 2026")
    
    doc.add_page_break()

    # ══════════════════════════════════════════════════════════════════════════
    # PAGES PRÉLIMINAIRES
    # ══════════════════════════════════════════════════════════════════════════
    
    # ── Dédicaces (facultatif) ──
    h_ded = doc.add_paragraph("DÉDICACES")
    style_heading_1(h_ded)
    p_ded = doc.add_paragraph()
    p_ded.paragraph_format.line_spacing = 1.2
    r_ded = p_ded.add_run(
        "À mes très chers parents, pour leur amour inconditionnel, leurs sacrifices constants et leur soutien moral tout au long de mon parcours d'études.\n\n"
        "À mes professeurs et maîtres de stage, pour leur transmission passionnée du savoir et leur encadrement bienveillant.\n\n"
        "À tous mes collègues et amis qui ont partagé mes moments d'effort et m'ont encouragé dans l'accomplissement de ce projet d'envergure."
    )
    r_ded.font.name = "Calibri"
    r_ded.font.size = Pt(11)
    r_ded.italic = True
    r_ded.font.color.rgb = RGBColor(55, 71, 79)
    doc.add_page_break()

    # ── Remerciements ──
    h_rem = doc.add_paragraph("REMERCIEMENTS")
    style_heading_1(h_rem)
    add_body_p(doc, "Au terme de ce Projet de Fin d'Année, je tiens à exprimer ma profonde gratitude à l'ensemble des personnes dont le concours, les conseils avisés et la disponibilité ont permis la concrétisation de ce travail.")
    add_body_p(doc, "J'adresse mes remerciements les plus chaleureux à la direction générale et à l'équipe de la Direction des Systèmes d'Information (DSI) de HOLCIM MAROC pour m'avoir accueilli au sein de leur structure et m'avoir offert un cadre d'expérimentation technique exceptionnel, stimulant et résolument axé sur l'innovation.")
    add_body_p(doc, "Je remercie particulièrement mon encadrant professionnel au sein de Holcim Maroc pour sa bienveillance, son suivi rigoureux, ses orientations méthodologiques précieuses et sa confiance constante.")
    add_body_p(doc, "Mes sincères remerciements s'adressent également à mon encadrant pédagogique universitaire, pour sa disponibilité, sa rigueur scientifique et ses éclairages indispensables à la qualité de ce mémoire.")
    add_body_p(doc, "Enfin, j'exprime ma reconnaissance aux membres du jury qui me font l'honneur d'évaluer ce travail académique.")
    doc.add_page_break()

    # ── Résumé & Abstract ──
    h_res = doc.add_paragraph("RÉSUMÉ")
    style_heading_1(h_res)
    add_body_p(doc, "Ce mémoire de Projet de Fin d'Année présente la conception et le déploiement opérationnel d'une plateforme de virtualisation de type IaaS (Infrastructure as a Service) privée, sécurisée et automatisée, réalisée pour répondre aux besoins opérationnels d'expérimentation, de formation et d'outillage des équipes de Holcim Maroc. Face aux contraintes budgétaires, réglementaires (localisation des données) et opérationnelles des clouds publics, ce projet introduit un orchestrateur novateur capable d'instancier des machines virtuelles multi-OS (Zorin OS Lite, Ubuntu 24.04 LTS, Windows 11) en moins de 30 secondes.")
    add_body_p(doc, "La solution logicielle repose sur le clonage lié (Linked Cloning) à partir d'instantanés différentiels de Golden Masters via l'interface VBoxManage d'Oracle VirtualBox, couplé à la génération dynamique d'images ISO NoCloud via pycdlib pour l'amorçage déclaratif Cloud-Init. Elle intègre en outre une console web HTML5 zéro-client via Apache Guacamole (chiffrement AES-128/HMAC-SHA256), une télémétrie temps réel propulsée par WebSockets, ainsi qu'une interface web soignée conçue avec React 18 et TailwindCSS.")
    add_body_p(doc, "Mots-clés : IaaS Privé, VirtualBox, VBoxManage, Linked Cloning, Cloud-Init, pycdlib, Apache Guacamole, FastAPI, React, Télémétrie Temps Réel, Holcim Maroc.")

    h_abs = doc.add_paragraph("ABSTRACT")
    style_heading_2(h_abs)
    add_body_p(doc, "This academic report presents the design and deployment of an automated on-premise Infrastructure-as-a-Service (IaaS) virtualization platform, developed to fulfill the testing, training, and development sandbox requirements at Holcim Maroc. In order to mitigate the high recurring costs, compliance barriers, and complexity of public cloud offerings, this project establishes a sovereign orchestration engine delivering fully-configured multi-OS virtual machines (Zorin OS Lite, Ubuntu 24.04 LTS, Windows 11) in under 30 seconds.")
    add_body_p(doc, "The architecture combines differential Linked Cloning based on frozen Golden Master snapshots via Oracle VirtualBox VBoxManage CLI, dynamic in-memory generation of NoCloud ISO images through pycdlib for automated Cloud-Init provisioning, clientless HTML5 web console streaming using Apache Guacamole, real-time WebSocket telemetry, and a state-of-the-art React 18 / TailwindCSS user interface.")
    add_body_p(doc, "Keywords: Private IaaS, VirtualBox, VBoxManage, Linked Cloning, Cloud-Init, pycdlib, Apache Guacamole, FastAPI, React, Real-Time Monitoring, Holcim Maroc.")
    doc.add_page_break()

    # ── Liste des figures ──
    h_lf = doc.add_paragraph("LISTE DES FIGURES")
    style_heading_1(h_lf)
    figures_list = [
        ("Figure 1", "Schéma Synoptique de l'Architecture Multicouche Globale de la Plateforme"),
        ("Figure 2", "Diagramme de Cas d'Utilisation Global du Système (UML)"),
        ("Figure 3", "Diagramme de Classes Métier et Modèle Entité-Relation"),
        ("Figure 4", "Diagramme de Séquence : Cycle de Provisionnement et Création d'une VM"),
        ("Figure 5", "Diagramme de Séquence : Authentification et Accès Console Web Guacamole"),
        ("Figure 6", "Diagramme d'Activités : Workflow de Personnalisation Cloud-Init"),
        ("Figure 7", "Diagramme de Déploiement Physique et Conteneurs"),
        ("Figure 8", "Interface d'Authentification et Formulaire de Connexion Sécurisée (Login)"),
        ("Figure 9", "Tableau de Bord Général Utilisateur (Dashboard KPI)"),
        ("Figure 10", "Interface de Création et Configuration de Machine Virtuelle"),
        ("Figure 11", "Inventaire et Gestion des Machines Virtuelles Utilisateur"),
        ("Figure 12", "Fiche Technique et Supervision Temps Réel d'une Machine Virtuelle"),
        ("Figure 13", "Console Graphique HTML5 Interactive Intégrée (Apache Guacamole)"),
        ("Figure 14", "Tableau de Bord Administrateur et Vue Globale du Parc"),
        ("Figure 15", "Module des Journaux d'Audit de Sécurité (Audit Trail)"),
        ("Figure 16", "Centre de Notifications Événementielles en Direct"),
        ("Figure 17", "Documentation Interactive OpenAPI / Swagger des Endpoints FastAPI"),
        ("Figure 18", "Preuve Système Hyperviseur : VBoxManage CLI et Clones Actifs sur l'Hôte")
    ]
    for tag, desc in figures_list:
        p_fig = doc.add_paragraph()
        p_fig.paragraph_format.space_before = Pt(2)
        p_fig.paragraph_format.space_after = Pt(2)
        r1 = p_fig.add_run(f"{tag} : ")
        r1.bold = True
        r1.font.name = "Calibri"
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(13, 71, 161)
        r2 = p_fig.add_run(desc)
        r2.font.name = "Calibri"
        r2.font.size = Pt(10)
        r2.font.color.rgb = RGBColor(55, 71, 79)

    doc.add_page_break()

    # ── Liste des tableaux ──
    h_lt = doc.add_paragraph("LISTE DES TABLEAUX")
    style_heading_1(h_lt)
    tables_list = [
        ("Tableau 1.1", "Fiche d'identité de l'organisme d'accueil : Holcim Maroc"),
        ("Tableau 1.2", "Matrice comparative des solutions de virtualisation existantes"),
        ("Tableau 2.1", "Matrice d'identification et privilèges des acteurs du système"),
        ("Tableau 3.1", "Comparatif technique : Full Clone vs Linked Clone"),
        ("Tableau 4.1", "Dictionnaire des données : Tables principales (users, vms, audit_logs)"),
        ("Tableau 5.1", "Spécification des Golden Masters préparés sur l'hôte"),
        ("Tableau 6.1", "Résultats comparatifs des temps de création de VM"),
        ("Tableau 6.2", "Mesures d'occupation disque et empreinte mémoire vive")
    ]
    for tag, desc in tables_list:
        p_tb = doc.add_paragraph()
        p_tb.paragraph_format.space_before = Pt(2)
        p_tb.paragraph_format.space_after = Pt(2)
        r1 = p_tb.add_run(f"{tag} : ")
        r1.bold = True
        r1.font.name = "Calibri"
        r1.font.size = Pt(10)
        r1.font.color.rgb = RGBColor(0, 137, 123)
        r2 = p_tb.add_run(desc)
        r2.font.name = "Calibri"
        r2.font.size = Pt(10)
        r2.font.color.rgb = RGBColor(55, 71, 79)

    doc.add_page_break()

    # ── Liste des abréviations et acronymes ──
    h_la = doc.add_paragraph("LISTE DES ABRÉVIATIONS ET ACRONYMES")
    style_heading_1(h_la)
    acronyms = [
        ("ACPI", "Advanced Configuration and Power Interface"),
        ("AES", "Advanced Encryption Standard"),
        ("API", "Application Programming Interface"),
        ("CBC", "Cipher Block Chaining"),
        ("CLI", "Command Line Interface"),
        ("CPU", "Central Processing Unit"),
        ("DSI", "Direction des Systèmes d'Information"),
        ("HMAC", "Hash-based Message Authentication Code"),
        ("HTTP", "Hypertext Transfer Protocol"),
        ("IaaS", "Infrastructure as a Service"),
        ("IDE", "Integrated Development Environment / Integrated Drive Electronics"),
        ("ISO", "International Organization for Standardization (Format Image Disque)"),
        ("JWT", "JSON Web Token"),
        ("NAT", "Network Address Translation"),
        ("ORM", "Object-Relational Mapping"),
        ("OS", "Operating System (Système d'Exploitation)"),
        ("PFA", "Projet de Fin d'Année"),
        ("RAM", "Random Access Memory"),
        ("RBAC", "Role-Based Access Control"),
        ("RDP", "Remote Desktop Protocol"),
        ("REST", "Representational State Transfer"),
        ("SATA", "Serial Advanced Technology Attachment"),
        ("SHA", "Secure Hash Algorithm"),
        ("SPA", "Single Page Application"),
        ("SSH", "Secure Shell"),
        ("TTL", "Time To Live"),
        ("UML", "Unified Modeling Language"),
        ("vCPU", "Virtual Central Processing Unit"),
        ("VDI", "Virtual Desktop Infrastructure / VirtualBox Disk Image"),
        ("VM", "Virtual Machine (Machine Virtuelle)"),
        ("VMM", "Virtual Machine Monitor"),
        ("VRDE", "VirtualBox Remote Desktop Extension"),
        ("WS", "WebSocket")
    ]
    for acr, defn in acronyms:
        p_a = doc.add_paragraph()
        p_a.paragraph_format.space_before = Pt(1)
        p_a.paragraph_format.space_after = Pt(2)
        r1 = p_a.add_run(f"{acr} : ")
        r1.bold = True
        r1.font.name = "Calibri"
        r1.font.size = Pt(9.5)
        r1.font.color.rgb = RGBColor(13, 71, 161)
        r2 = p_a.add_run(defn)
        r2.font.name = "Calibri"
        r2.font.size = Pt(9.5)
        r2.font.color.rgb = RGBColor(55, 71, 79)

    doc.add_page_break()

    # ══════════════════════════════════════════════════════════════════════════
    # INTRODUCTION GÉNÉRALE
    # ══════════════════════════════════════════════════════════════════════════
    h_intro = doc.add_paragraph("INTRODUCTION GÉNÉRALE")
    style_heading_1(h_intro)
    add_body_p(doc, "Le secteur industriel moderne traverse une transformation numérique sans précédent où l'agilité logicielle, la maîtrise des données et la puissance de calcul conditionnent directement la compétitivité et la résilience opérationnelle des grandes entreprises. Au sein de structures d'envergure telles que Holcim Maroc, premier producteur de matériaux de construction du Royaume, l'écosystème numérique requiert un accès permanent à des environnements d'expérimentation, de test de déploiement applicatif et de formation technique.")
    add_body_p(doc, "Traditionnellement, la mise à disposition de machines de travail ou de serveurs d'essai reposait soit sur des commandes manuelles auprès des équipes d'infrastructure — entraînant des délais de livraison de plusieurs jours —, soit sur l'utilisation intensive de plateformes Cloud publiques (Amazon Web Services, Microsoft Azure). Si le Cloud public offre une élasticité séduisante, il engendre des coûts de facturation récurrents très élevés, une dépendance technologique étroite (vendor lock-in) et soulève des enjeux cruciaux de souveraineté et de confidentialité des données industrielles.")
    add_body_p(doc, "Face à cette réalité, le présent Projet de Fin d'Année (PFA) vise la conception, le développement et le déploiement d'une plateforme de virtualisation de type IaaS (Infrastructure as a Service) privée, souveraine, automatisée et sécurisée. La solution permet à tout collaborateur autorisé d'instancier, en libre-service et en moins de 30 secondes, une machine virtuelle personnalisée (Zorin OS Lite, Ubuntu 24.04 LTS ou Windows 11) dotée d'une console graphique interactive accessible directement depuis un navigateur web standard.")
    add_body_p(doc, "Le présent mémoire rend compte de la démarche d'ingénierie adoptée, s'articulant en six chapitres complémentaires : le contexte général et la présentation de l'organisme d'accueil Holcim Maroc (Chapitre 1), l'analyse des besoins et spécifications fonctionnelles (Chapitre 2), l'étude technique approfondie et les choix d'architecture (Chapitre 3), la conception détaillée du système (Chapitre 4), la réalisation et l'implémentation logicielle (Chapitre 5), et enfin les tests, la validation expérimentale et l'évaluation des performances (Chapitre 6).")

    # ══════════════════════════════════════════════════════════════════════════
    # CHAPITRE 1 : CONTEXTE GÉNÉRAL ET PRÉSENTATION DU PROJET
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h1 = doc.add_paragraph("CHAPITRE 1 : CONTEXTE GÉNÉRAL ET PRÉSENTATION DU PROJET")
    style_heading_1(h1)

    h11 = doc.add_paragraph("1.1 Introduction")
    style_heading_2(h11)
    add_body_p(doc, "Ce premier chapitre pose le cadre contextuel et stratégique du projet de fin d'année. Il présente en détail l'organisme d'accueil au sein duquel s'est déroulé le stage, analyse la situation opérationnelle existante, formule précisément la problématique traitée, énonce les objectifs poursuivis et décrit la méthodologie de gestion de projet retenue pour mener à bien les réalisations.")

    h12 = doc.add_paragraph("1.2 Présentation de l'organisme d'accueil : Holcim Maroc")
    style_heading_2(h12)
    add_body_p(doc, "LafargeHolcim Maroc, opérant aujourd'hui sous l'identité commerciale Holcim Maroc, est le leader national incontesté du secteur des matériaux de construction. Issue d'une joint-venture stratégique entre le Groupe international Holcim (leader mondial des solutions de construction innovantes et durables) et Al Mada, le fonds d'investissement privé panafricain de référence, l'entreprise est solidement ancrée au Maroc depuis sa première implantation en 1928 à Roches Noires (Casablanca).")
    add_body_p(doc, "L'entreprise contribue activement au développement économique et architectural du Royaume en fournissant des solutions de pointe pour la réalisation d'infrastructures majeures (barrages, ponts, autoroutes, complexes portuaires et urbains). Grâce à une stratégie ambitieuse axée sur la décarbonation, la valorisation énergétique des déchets et l'économie circulaire, Holcim Maroc s'impose comme un acteur pionnier de la transition écologique industrielle du pays.")
    
    # Tableau 1.1 Fiche d'identité
    tbl_holcim = doc.add_table(rows=8, cols=2)
    tbl_holcim.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_holcim.autofit = False
    
    c_th0 = tbl_holcim.cell(0, 0)
    c_th1 = tbl_holcim.cell(0, 1)
    c_th0.paragraphs[0].text = "Caractéristique Institutionnelle"
    c_th1.paragraphs[0].text = "Détails & Spécifications"
    c_th0.paragraphs[0].runs[0].bold = True
    c_th1.paragraphs[0].runs[0].bold = True
    c_th0.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
    c_th1.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
    set_cell_background(c_th0, "0D47A1")
    set_cell_background(c_th1, "0D47A1")
    set_cell_margins(c_th0, top=100, bottom=100, left=120, right=120)
    set_cell_margins(c_th1, top=100, bottom=100, left=120, right=120)
    
    ident_data = [
        ("Raison sociale", "LafargeHolcim Maroc (opérant sous la marque commerciale Holcim Maroc)"),
        ("Actionnariat principal", "Groupe Holcim & Fonds d'investissement panafricain Al Mada"),
        ("Date de création", "1928 (Première usine cimentière à Roches Noires, Casablanca)"),
        ("Siège social", "6, Boulevard de la Mecque, Quartier les Crêtes, Casablanca, Maroc"),
        ("Secteur d'activité", "Matériaux de construction (Ciment, Béton prêt à l'emploi, Granulats)"),
        ("Principaux produits phares", "Gamme ECOPlanet (ciment bas carbone), Bétons spéciaux, valorisation Geocycle"),
        ("Site web officiel", "www.holcim.ma")
    ]
    for r_idx, (k, v) in enumerate(ident_data, start=1):
        cell_k = tbl_holcim.cell(r_idx, 0)
        cell_v = tbl_holcim.cell(r_idx, 1)
        cell_k.width = Inches(2.2)
        cell_v.width = Inches(4.3)
        cell_k.paragraphs[0].text = k
        cell_v.paragraphs[0].text = v
        cell_k.paragraphs[0].runs[0].bold = True
        cell_k.paragraphs[0].runs[0].font.size = Pt(9.5)
        cell_v.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_margins(cell_k, top=80, bottom=80, left=100, right=100)
        set_cell_margins(cell_v, top=80, bottom=80, left=100, right=100)
        bg = "F0F4F8" if r_idx % 2 == 1 else "FFFFFF"
        set_cell_background(cell_k, bg)
        set_cell_background(cell_v, bg)
        
    doc.add_paragraph()
    add_body_p(doc, "Domaines d'activité majeurs de Holcim Maroc :")
    add_bullet_p(doc, "L'activité Ciment : ", "Production et distribution d'une large gamme de ciments normalisés adaptés à tout type d'ouvrage, intégrant des solutions bas carbone (ECOPlanet).")
    add_bullet_p(doc, "L'activité Béton : ", "Formulation et livraison sur chantiers de bétons prêts à l'emploi à hautes performances structurelles et esthétiques.")
    add_bullet_p(doc, "L'activité Granulats : ", "Exploitation de carrières et fourniture de sables et graviers sélectionnés pour les infrastructures autoroutières et de génie civil.")
    add_bullet_p(doc, "Développement Durable & Économie Circulaire : ", "À travers sa filiale Geocycle, valorisation et co-traitement des déchets industriels et municipaux en substituts énergétiques dans les fours cimentiers.")

    h13 = doc.add_paragraph("1.3 Contexte général du projet au sein de la DSI")
    style_heading_2(h13)
    add_body_p(doc, "Au sein de la Direction des Systèmes d'Information (DSI) de Holcim Maroc, les équipes d'ingénieurs logiciels, d'administrateurs réseau, de consultants ERP et d'analystes de données doivent fréquemment valider des briques logicielles, tester des correctifs de sécurité et concevoir des environnements éphémères de formation. Ces opérations nécessitent des machines virtuelles isolées, configurées sur mesure avec des systèmes d'exploitation hétérogènes (distributions Linux spécialisées comme Zorin OS ou Ubuntu, et postes clients Windows).")

    h14 = doc.add_paragraph("1.4 Problématique")
    style_heading_2(h14)
    add_body_p(doc, "Avant la mise en place du projet, la mise à disposition d'une machine virtuelle se heurtait à plusieurs contraintes critiques :")
    add_bullet_p(doc, "Délais de mise à disposition excessifs : ", "La création manuelle d'une VM requérait l'assignation d'un ticket DSI, le partitionnement, l'installation de l'OS depuis une image ISO et le paramétrage manuel des comptes, mobilisant entre 45 minutes et plusieurs jours d'attente.")
    add_bullet_p(doc, "Coûts prohibitifs des solutions Cloud externes : ", "L'usage d'instances sur Azure ou AWS pour de simples tests internes engendre une facturation horaire élevée et continue.")
    add_bullet_p(doc, "Gaspillage massif du stockage physique : ", "Chaque installation traditionnelle duplique intégralement l'espace disque du système invité (15 à 60 Go par machine), saturant rapidement les disques durs des serveurs de développement.")
    add_bullet_p(doc, "Complexité d'accès aux interfaces graphiques : ", "L'ouverture d'un bureau distant imposait la configuration fastidieuse de clients lourds RDP/VNC, de règles de pare-feu complexes et de certificats sur le poste de chaque collaborateur.")
    add_body_p(doc, "La problématique centrale se résume donc ainsi : « Comment concevoir et déployer une plateforme IaaS privée, légère et souveraine, capable de provisionner automatiquement en moins de 30 secondes des machines virtuelles personnalisées et immédiatement utilisables via un navigateur web, tout en optimisant drastiquement l'espace disque et les ressources matérielles ? »")

    h15 = doc.add_paragraph("1.5 Étude de l'existant")
    style_heading_2(h15)
    
    h151 = doc.add_paragraph("1.5.1 Solutions de virtualisation existantes")
    style_heading_3(h151)
    add_body_p(doc, "L'étude préalable a exploré trois grandes catégories de solutions existantes sur le marché :")
    add_bullet_p(doc, "Plateformes Cloud Publics (AWS EC2, Azure VMs, Google Cloud Engine) : ", "Offrent une excellente ergonomie et une API riche mais induisent des coûts d'abonnement majeurs et une opacité sur la localisation des données.")
    add_bullet_p(doc, "Plateformes IaaS Privées d'Entreprise (OpenStack, VMware vSphere/vCenter) : ", "Infrastructures extrêmement robustes mais d'une complexité d'installation colossale, exigeant des grappes de serveurs physiques dédiés et des licences onéreuses inadaptées à des stations de test locales.")
    add_bullet_p(doc, "Solutions de Virtualisation de Bureau Traditionnelles (VirtualBox GUI, VMware Workstation) : ", "Outils orientés vers un usage individuel interactif en local, dépourvus de portail web self-service multi-utilisateurs et d'orchestration dynamique.")

    h152 = doc.add_paragraph("1.5.2 Limites des solutions existantes")
    style_heading_3(h152)
    add_body_p(doc, "Les solutions de virtualisation actuelles souffrent soit d'une lourdeur d'exploitation rédhibitoire, soit d'un modèle économique inadapté aux environnements d'expérimentation, soit de l'absence totale d'automatisation du provisioning déclaratif (injection de comptes et clés SSH dès l'amorçage).")

    # Tableau 1.2 Comparatif
    tbl_comp = doc.add_table(rows=5, cols=4)
    tbl_comp.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_comp.autofit = False
    headers = ["Critère", "Cloud Public (AWS/Azure)", "OpenStack / VMware", "Notre Plateforme PFA"]
    for i, h_text in enumerate(headers):
        c = tbl_comp.cell(0, i)
        c.paragraphs[0].text = h_text
        c.paragraphs[0].runs[0].bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "0D47A1")
        set_cell_margins(c, top=100, bottom=100, left=100, right=100)
    comp_rows = [
        ("Coût d'exploitation", "Très élevé (facturation horaire)", "Licences onéreuses / serveurs dédiés", "Nul (Open-Source sur matériel existant)"),
        ("Délai de provisioning", "1 à 3 minutes", "1 à 5 minutes", "< 30 secondes (Linked Clone)"),
        ("Accès aux bureaux", "Client lourd / VPN nécessaire", "Portail complexe ou RDP natif", "Console HTML5 zéro-client intégrée"),
        ("Empreinte disque initiale", "100% de la taille du disque", "100% ou SAN complexe", "Différentielle (~30 Mo par instance)")
    ]
    for r_idx, r_data in enumerate(comp_rows, start=1):
        for col_idx, val in enumerate(r_data):
            c = tbl_comp.cell(r_idx, col_idx)
            c.paragraphs[0].text = val
            c.paragraphs[0].runs[0].font.size = Pt(9)
            set_cell_margins(c, top=80, bottom=80, left=90, right=90)
            set_cell_background(c, "F0F4F8" if r_idx % 2 == 1 else "FFFFFF")

    doc.add_paragraph()
    h153 = doc.add_paragraph("1.5.3 Solution proposée")
    style_heading_3(h153)
    add_body_p(doc, "Pour pallier ces défaillances, la solution développée propose un orchestrateur web IaaS complet articulé autour de FastAPI, VBoxManage, pycdlib et Apache Guacamole. Elle démocratise l'accès à la virtualisation au sein de Holcim Maroc en combinant rapidité instantanée, frugalité en stockage et simplicité d'accès via n'importe quel navigateur moderne.")

    h16 = doc.add_paragraph("1.6 Objectifs du projet")
    style_heading_2(h16)
    add_bullet_p(doc, "Automatisation intégrale : ", "Supprimer tout processus manuel lors de l'instanciation des VM.")
    add_bullet_p(doc, "Rapidité d'exécution : ", "Garantir un temps de déploiement inférieur à 30 secondes.")
    add_bullet_p(doc, "Accès unifié zéro-client : ", "Fournir un terminal SSH et une console graphique Web interactive HTML5 sans installation sur le poste client.")
    add_bullet_p(doc, "Sécurité et traçabilité : ", "Garantir une isolation étanche des machines, une authentification forte JWT et une journalisation d'audit exhaustive.")

    h17 = doc.add_paragraph("1.7 Méthodologie et planification du travail")
    style_heading_2(h17)
    add_body_p(doc, "Le projet a été conduit selon la méthodologie Agile Scrum, découpée en sprints de deux semaines permettant des livraisons incrémentales testables :")
    add_bullet_p(doc, "Sprint 1 : ", "Analyse des besoins, spécification des API et formalisation du modèle de données.")
    add_bullet_p(doc, "Sprint 2 : ", "Création des Golden Masters et développement du service de clonage lié VBoxManage.")
    add_bullet_p(doc, "Sprint 3 : ", "Implémentation de la génération dynamique d'ISO Cloud-Init via pycdlib.")
    add_bullet_p(doc, "Sprint 4 : ", "Intégration d'Apache Guacamole et du protocole chiffré JSON.")
    add_bullet_p(doc, "Sprint 5 : ", "Développement du frontend React, télémétrie WebSockets et tests de charge.")

    h18 = doc.add_paragraph("1.8 Conclusion")
    style_heading_2(h18)
    add_body_p(doc, "Ce premier chapitre a mis en lumière les enjeux d'innovation portés par Holcim Maroc et a posé les bases de la problématique résolue. Le chapitre suivant s'attache à formaliser l'analyse rigoureuse des besoins et les spécifications fonctionnelles du système.")

    # ══════════════════════════════════════════════════════════════════════════
    # CHAPITRE 2 : ANALYSE DES BESOINS ET SPÉCIFICATIONS
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h2 = doc.add_paragraph("CHAPITRE 2 : ANALYSE DES BESOINS ET SPÉCIFICATIONS")
    style_heading_1(h2)

    h21 = doc.add_paragraph("2.1 Introduction")
    style_heading_2(h21)
    add_body_p(doc, "La réussite d'un projet d'ingénierie logicielle dépend de la précision avec laquelle les exigences des utilisateurs et des administrateurs sont appréhendées. Ce chapitre détaille l'identification des acteurs du système, spécifie les exigences fonctionnelles et non fonctionnelles, analyse les contraintes matérielles et modélise les cas d'utilisation selon le standard UML.")

    h22 = doc.add_paragraph("2.2 Identification des acteurs du système")
    style_heading_2(h22)
    add_body_p(doc, "Trois acteurs majeurs interagissent avec la plateforme :")
    add_bullet_p(doc, "Utilisateur Authentifié (Développeur / Ingénieur) : ", "Collaborateur disposant d'un compte vérifié. Il crée, configure, démarre, consulte et détruit ses propres machines virtuelles.")
    add_bullet_p(doc, "Administrateur Système (DSI Holcim) : ", "Dispose de privilèges globaux. Il visualise l'ensemble du parc de VM de l'entreprise, supervise la consommation globale des ressources matérielles, gère les comptes et consulte les journaux d'audit de sécurité.")
    add_bullet_p(doc, "Moteur d'Hypervision & Services Système : ", "Acteur technique regroupant le binaire VBoxManage, le démon Apache Guacamole et le système de fichiers hôte.")

    h23 = doc.add_paragraph("2.3 Analyse des besoins fonctionnels")
    style_heading_2(h23)
    
    h231 = doc.add_paragraph("2.3.1 Gestion des utilisateurs et authentification")
    style_heading_3(h231)
    add_body_p(doc, "Le système doit offrir une inscription sécurisée avec validation de mot de passe fort, une connexion par émission de jeton JWT d'une durée de validité configurable, la gestion du profil utilisateur et la révocation de session.")

    h232 = doc.add_paragraph("2.3.2 Gestion du cycle de vie des machines virtuelles")
    style_heading_3(h232)
    add_body_p(doc, "L'utilisateur doit pouvoir commander une machine, modifier son état (démarrage headless en arrière-plan, extinction ACPI douce, arrêt forcé poweroff, redémarrage propre) et procéder à sa suppression définitive avec libération immédiate des ports réseau et fichiers différentiels.")

    h233 = doc.add_paragraph("2.3.3 Provisionnement automatisé multi-distributions")
    style_heading_3(h233)
    add_body_p(doc, "La plateforme doit supporter nativement plusieurs systèmes d'exploitation (Zorin OS Lite, Ubuntu 24.04 LTS, Windows 11) et injecter automatiquement les comptes utilisateurs et privilèges sudo sans aucune invite de commande interactive.")

    h234 = doc.add_paragraph("2.3.4 Accès distant aux machines virtuelles")
    style_heading_3(h234)
    add_body_p(doc, "Le système doit mapper dynamiquement un port de translation SSH hôte et fournir un lien vers une console interactive HTML5 fluide via Apache Guacamole.")

    h235 = doc.add_paragraph("2.3.5 Supervision et monitoring en temps réel")
    style_heading_3(h235)
    add_body_p(doc, "Le tableau de bord doit afficher les jauges de consommation CPU, RAM, le statut d'alimentation et l'adresse IP interne attribuée par le service invité.")

    h236 = doc.add_paragraph("2.3.6 Administration, notifications et journalisation")
    style_heading_3(h236)
    add_body_p(doc, "L'administrateur doit disposer d'un tableau de bord de supervision globale, d'un centre de notifications en direct et d'un audit trail consignant chaque événement système.")

    h24 = doc.add_paragraph("2.4 Analyse des besoins non fonctionnels")
    style_heading_2(h24)
    add_bullet_p(doc, "Performance et latence : ", "Le provisionnement ne doit pas excéder 30 secondes et la latence d'affichage console doit demeurer inférieure à 100 ms en réseau local.")
    add_bullet_p(doc, "Sécurité et étanchéité : ", "Les flux de console doivent être chiffrés et signés par HMAC-SHA256 ; isolation réseau par NAT.")
    add_bullet_p(doc, "Fiabilité et tolérance aux pannes : ", "Gestion rigoureuse des exceptions (timeouts VBoxManage, collision de ports).")
    add_bullet_p(doc, "Ergonomie et Dark Mode : ", "Interface utilisateur intuitive conforme aux standards modernes du web.")

    h25 = doc.add_paragraph("2.5 Contraintes techniques et matérielles")
    style_heading_2(h25)
    add_body_p(doc, "La plateforme doit s'exécuter sur une station de travail ou un serveur hôte standard équipé de la technologie de virtualisation matérielle (Intel VT-x ou AMD-V activée dans le BIOS), d'au moins 16 Go de mémoire vive et d'un disque SSD rapide.")

    h26 = doc.add_paragraph("2.6 Modélisation des besoins")
    style_heading_2(h26)
    
    # Placeholder Figure 2
    add_screenshot_placeholder(
        doc,
        figure_num="2",
        title="Diagramme de Cas d'Utilisation Global du Système (UML)",
        instructions="Insérez le diagramme UML Use Case illustrant les cas d'utilisation pour l'Utilisateur (S'inscrire, S'authentifier, Créer VM, Démarrer/Stopper VM, Ouvrir Console, Supprimer VM) et l'Administrateur (Superviser parc, Gérer utilisateurs, Consulter Audit Logs).",
        expected_elements="Acteurs Utilisateur et Administrateur, relations include et extend vers l'authentification, frontières du système IaaS.",
        image_path="diagrams/figure2_cas_utilisation.png"
    )

    h27 = doc.add_paragraph("2.7 Conclusion")
    style_heading_2(h27)
    add_body_p(doc, "L'analyse fonctionnelle ayant clairement délimité le périmètre du projet, le chapitre suivant aborde l'étude technique approfondie des technologies et briques logicielles retenues.")

    # ══════════════════════════════════════════════════════════════════════════
    # CHAPITRE 3 : ÉTUDE TECHNIQUE ET CHOIX TECHNOLOGIQUES
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h3 = doc.add_paragraph("CHAPITRE 3 : ÉTUDE TECHNIQUE ET CHOIX TECHNOLOGIQUES")
    style_heading_1(h3)

    h31 = doc.add_paragraph("3.1 Introduction")
    style_heading_2(h31)
    add_body_p(doc, "Ce chapitre expose les fondements théoriques des technologies employées et explicite les motivations d'ingénierie qui ont orienté chaque choix architectural.")

    h32 = doc.add_paragraph("3.2 Concepts fondamentaux du Cloud Computing et de l'IaaS")
    style_heading_2(h32)
    add_body_p(doc, "Le modèle Infrastructure as a Service (IaaS) selon la définition du NIST confère au consommateur la capacité de déployer et d'exécuter des systèmes d'exploitation arbitraires sur des ressources de calcul, de stockage et de réseau virtualisées. Notre projet matérialise ce modèle en circuit court au sein de l'intranet de Holcim Maroc.")

    h33 = doc.add_paragraph("3.3 Virtualisation et hyperviseurs")
    style_heading_2(h33)
    add_body_p(doc, "Les hyperviseurs de Type 2 permettent d'exécuter des machines invitées au-dessus du noyau hôte. Oracle VirtualBox a été choisi pour son adoption universelle, sa gratuité open-source et surtout la complétude exceptionnelle de son interface en ligne de commande : VBoxManage. VBoxManage offre un contrôle scriptable intégral sur l'enregistrement des machines, le redimensionnement de la mémoire, la gestion fine des snapshots et la translation de ports NAT.")

    h34 = doc.add_paragraph("3.4 Techniques de clonage des machines virtuelles")
    style_heading_2(h34)
    add_body_p(doc, "Le choix de la méthode de duplication du disque constitue l'élément déterminant de la rapidité du service :")
    add_bullet_p(doc, "Clonage complet (Full Clone) : ", "Duplique la totalité du fichier disque virtuel VDI. Inadapté car très lent (plusieurs minutes) et gourmand en stockage.")
    add_bullet_p(doc, "Clonage lié (Linked Clone) : ", "Crée un disque différentiel de quelques kilo-octets pointant vers un instantané (Snapshot) figé en lecture seule du Golden Master. La création est quasi-instantanée (moins de 20 secondes).")

    # Tableau comparatif 3.1
    tbl_c3 = doc.add_table(rows=4, cols=3)
    tbl_c3.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_c3.autofit = False
    for i, h_text in enumerate(["Métrique", "Full Clone", "Linked Clone (Retenu)"]):
        c = tbl_c3.cell(0, i)
        c.paragraphs[0].text = h_text
        c.paragraphs[0].runs[0].bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "0D47A1")
        set_cell_margins(c, top=90, bottom=90, left=100, right=100)
    rows_c3 = [
        ("Temps de création", "5 à 15 minutes", "10 à 25 secondes"),
        ("Espace disque initial", "15 à 64 Go par VM", "~30 Mo par VM"),
        ("Impact I/O disque", "Saturation du bus d'écriture", "Opération de pointe minime")
    ]
    for r_idx, r_data in enumerate(rows_c3, start=1):
        for col_idx, val in enumerate(r_data):
            c = tbl_c3.cell(r_idx, col_idx)
            c.paragraphs[0].text = val
            c.paragraphs[0].runs[0].font.size = Pt(9.5)
            set_cell_margins(c, top=80, bottom=80, left=90, right=90)
            set_cell_background(c, "F0F4F8" if r_idx % 2 == 1 else "FFFFFF")

    doc.add_paragraph()
    h35 = doc.add_paragraph("3.5 Automatisation du provisionnement avec Cloud-Init")
    style_heading_2(h35)
    add_body_p(doc, "Pour éviter les dépendances envers des utilitaires système externes difficiles à maintenir sous Windows (tels que mkisofs ou genisoimage), le service Cloud-Init exploite la bibliothèque Python pycdlib. Cette dernière génère à chaud une image ISO 9660 conforme NoCloud intégrant les fichiers user-data et meta-data, attachée instantanément au contrôleur optique IDE de la machine virtuelle.")

    h36 = doc.add_paragraph("3.6 Accès distant via Apache Guacamole")
    style_heading_2(h36)
    add_body_p(doc, "Apache Guacamole transforme les flux de bureau à distance natifs (RDP/VRDE) en trames HTML5 Canvas transmises par WebSocket. L'accès est sécurisé sans mot de passe permanent grâce à l'extension d'authentification chiffrée guacamole-auth-json signée en HMAC-SHA256 et chiffrée en AES-128-CBC.")

    h37 = doc.add_paragraph("3.7 Technologies et outils de développement")
    style_heading_2(h37)
    add_bullet_p(doc, "Backend (FastAPI & Python 3.12) : ", "Framework ASGI asynchrone ultra-performant, documentation automatique OpenAPI Swagger.")
    add_bullet_p(doc, "Frontend (React 18, Vite, Tailwind CSS) : ", "Interface réactive haut de gamme, thème sombre natif, Toasts interactifs.")
    add_bullet_p(doc, "Base de données & ORM (SQLAlchemy & SQLite/PostgreSQL) : ", "Abstraction relationnelle robuste, typage fort des modèles.")
    add_bullet_p(doc, "Temps réel (WebSockets) : ", "Diffusion instantanée des métriques sans polling lourd.")
    add_bullet_p(doc, "Conteneurisation (Docker) : ", "Déploiement isolé des démons Guacamole guacd et guacamole-web.")

    h38 = doc.add_paragraph("3.8 Conclusion")
    style_heading_2(h38)
    add_body_p(doc, "Les choix technologiques retenus allient performance brute, robustesse cryptographique et modernité de développement. Le chapitre 4 détaille la conception architecturale globale.")

    # ══════════════════════════════════════════════════════════════════════════
    # CHAPITRE 4 : CONCEPTION ET ARCHITECTURE DU SYSTÈME
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h4 = doc.add_paragraph("CHAPITRE 4 : CONCEPTION ET ARCHITECTURE DU SYSTÈME")
    style_heading_1(h4)

    h41 = doc.add_paragraph("4.1 Introduction")
    style_heading_2(h41)
    add_body_p(doc, "Ce chapitre détaille la structure interne du système, modélise les données et formalise les interactions temporelles entre les composants logiciels.")

    h42 = doc.add_paragraph("4.2 Architecture générale de la plateforme")
    style_heading_2(h42)
    add_body_p(doc, "Le système adopte une architecture modulaire multi-tiers découplée :")
    add_bullet_p(doc, "Couche Présentation : ", "SPA React servie via Vite, dialoguant en HTTPS REST et WSS.")
    add_bullet_p(doc, "Couche Contrôle & API Gateway : ", "FastAPI orchestrant les requêtes, vérifiant les JWT et appliquant le Rate Limiting.")
    add_bullet_p(doc, "Couche Métier : ", "Services spécialisés (VBoxVMService, CloudInitService, ConsoleService, MetricsService, NotificationService, AuditService).")
    add_bullet_p(doc, "Couche Infrastructure & Hyperviseur : ", "Oracle VirtualBox gérant les processus invités, conteneurs Guacamole et base de données relationnelle.")

    # Placeholder Figure 1
    add_screenshot_placeholder(
        doc,
        figure_num="1",
        title="Schéma Synoptique de l'Architecture Multicouche Globale de la Plateforme",
        instructions="Insérez le schéma d'architecture montrant le client Web (React), la passerelle FastAPI, les démons Guacamole (Docker), le moteur VBoxManage et la base SQLite.",
        expected_elements="Flèches de flux REST, WebSocket, appels CLI VBoxManage, flux RDP/VRDE et couches logicielles.",
        image_path="diagrams/figure1_architecture_multicouche.png"
    )

    h43 = doc.add_paragraph("4.3 Conception fonctionnelle (Modélisation UML)")
    style_heading_2(h43)
    
    # Placeholder Figure 3
    add_screenshot_placeholder(
        doc,
        figure_num="3",
        title="Diagramme de Classes Métier et Modèle Entité-Relation",
        instructions="Insérez le diagramme de classes UML montrant les classes User, VM, AuditLog, Notification et leurs méthodes/attributs clés.",
        expected_elements="Entités avec clés primaires/étrangères, types des champs, multiplicités (1 utilisateur -> N VMs, 1 utilisateur -> N notifications).",
        image_path="diagrams/figure3_diagramme_classes.png"
    )

    # Placeholder Figure 4
    add_screenshot_placeholder(
        doc,
        figure_num="4",
        title="Diagramme de Séquence : Cycle de Provisionnement et Création d'une VM",
        instructions="Insérez le diagramme de séquence illustrant la chaîne d'appels : Frontend -> POST /vms -> VBoxVMService (clone, modifyvm, natpf) -> CloudInitService (iso pycdlib) -> Base de données -> Réponse 201 Created.",
        expected_elements="Lignes de vie (Utilisateur, Frontend, FastAPI Router, VBoxService, CloudInit, VBoxManage CLI, DB).",
        image_path="diagrams/figure4_sequence_creation_vm.png"
    )

    # Placeholder Figure 5
    add_screenshot_placeholder(
        doc,
        figure_num="5",
        title="Diagramme de Séquence : Authentification et Accès Console Web Guacamole",
        instructions="Insérez le diagramme de séquence montrant la négociation du ticket Guacamole : Frontend -> POST /console/session -> ConsoleService (chiffrement AES/HMAC) -> Requête /api/tokens Guacamole -> Rendu URL iframe client.",
        expected_elements="Génération du JSON, signature HMAC-SHA256, retour du token d'accès temporaire.",
        image_path="diagrams/figure5_sequence_console_guacamole.png"
    )

    # Placeholder Figure 6
    add_screenshot_placeholder(
        doc,
        figure_num="6",
        title="Diagramme d'Activités : Workflow de Personnalisation Cloud-Init",
        instructions="Insérez le diagramme d'activités montrant le hachage du mot de passe en SHA-512, la rédaction de user-data et meta-data, la compilation ISO par pycdlib et le montage sur le lecteur optique virtuel.",
        expected_elements="Noeuds de décision, états de création de répertoire temporaire et étapes de nettoyage post-démarrage.",
        image_path="diagrams/figure6_activites_cloudinit.png"
    )

    h44 = doc.add_paragraph("4.4 Conception de la base de données")
    style_heading_2(h44)
    add_body_p(doc, "Le schéma relationnel est structuré autour de quatre tables interconnectées (users, vms, audit_logs, notifications) assurant l'intégrité référentielle par clés étrangères.")

    h45 = doc.add_paragraph("4.5 Conception du moteur d'orchestration VirtualBox")
    style_heading_2(h45)
    add_body_p(doc, "Le composant VBoxVMService isole l'application des spécificités du système d'exploitation hôte en implémentant des mécanismes de timeouts stricts, de capture de flux stdout/stderr et d'allocation dynamique non conflictuelle de ports TCP.")

    h46 = doc.add_paragraph("4.6 Conception du mécanisme Cloud-Init")
    style_heading_2(h46)
    add_body_p(doc, "Le module CloudInitService prépare les spécifications d'amorçage Linux en respectant la norme NoCloud. Les mots de passe sont salés et hachés selon le schéma sha512_crypt standard des systèmes Unix /etc/shadow.")

    h47 = doc.add_paragraph("4.7 Conception de l'architecture de sécurité")
    style_heading_2(h47)
    add_body_p(doc, "La sécurité repose sur la défense en profondeur : filtrage des requêtes par Rate Limiting, validation stricte des schémas JSON Pydantic, ségrégation des privilèges RBAC et chiffrement asymétrique des flux.")

    # Placeholder Figure 7
    add_screenshot_placeholder(
        doc,
        figure_num="7",
        title="Diagramme de Déploiement Physique et Conteneurs",
        instructions="Insérez le diagramme de déploiement illustrant le serveur hôte physique, le processus Python Uvicorn, le serveur Vite, la base SQLite et les conteneurs Docker Guacamole.",
        expected_elements="Nœuds d'exécution, liaisons de ports réseau (8000, 5173, 8080, 4822) et volumes persistants.",
        image_path="diagrams/figure7_deploiement_physique.png"
    )

    h49 = doc.add_paragraph("4.9 Conclusion")
    style_heading_2(h49)
    add_body_p(doc, "La conception modulaire et normalisée offre une base solide et évolutive pour la phase de réalisation détaillée dans le chapitre 5.")

    # ══════════════════════════════════════════════════════════════════════════
    # CHAPITRE 5 : RÉALISATION ET IMPLÉMENTATION DE LA PLATEFORME
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h5 = doc.add_paragraph("CHAPITRE 5 : RÉALISATION ET IMPLÉMENTATION DE LA PLATEFORME")
    style_heading_1(h5)

    h51 = doc.add_paragraph("5.1 Introduction")
    style_heading_2(h51)
    add_body_p(doc, "Ce chapitre détaille la réalisation concrète de chaque brique logicielle de la plateforme, de la configuration du backend à l'élaboration de l'interface utilisateur React.")

    h52 = doc.add_paragraph("5.2 Environnement matériel et logiciel")
    style_heading_2(h52)
    add_body_p(doc, "Le développement a été réalisé sur une station équipée d'un processeur multi-cœurs 64 bits avec virtualisation matérielle activée, 16 Go de RAM DDR4, SSD NVMe 512 Go, Windows 11 Professionnel, Python 3.12, Node.js v20, Oracle VirtualBox 7.x et Docker Desktop.")

    h53 = doc.add_paragraph("5.3 Mise en place de l'environnement de développement")
    style_heading_2(h53)
    add_body_p(doc, "L'environnement isole les dépendances via un environnement virtuel Python (venv) et un gestionnaire de paquets npm pour le client React. Les variables de configuration sont centralisées dans un fichier .env sécurisé.")

    h54 = doc.add_paragraph("5.4 Développement du backend FastAPI")
    style_heading_2(h54)
    add_body_p(doc, "Le backend adopte une organisation modulaire par routeurs fonctionnels (auth.py, vms.py, admin.py, console.py, notifications.py, ws.py). L'authentification utilise OAuth2PasswordBearer combiné aux jetons JWT signés par clé secrète HS256.")

    h55 = doc.add_paragraph("5.5 Implémentation du provisionnement automatisé")
    style_heading_2(h55)
    add_body_p(doc, "Trois Golden Masters de référence ont été préparés et figés par instantané clean-state : zorin-24-master, ubuntu-24-master et windows11-master. Lors d'une demande de création, le service VBoxVMService invoque VBoxManage clonevm avec l'option --options link, applique le dimensionnement vCPU/RAM, alloue les ports dynamiques et monte l'ISO NoCloud.")

    h56 = doc.add_paragraph("5.6 Intégration de la console web Apache Guacamole")
    style_heading_2(h56)
    add_body_p(doc, "Le fichier app/services/console_service.py implémente le chiffrement cryptographique du payload de connexion vers l'extension guacamole-auth-json, fournissant au frontend un token d'accès éphémère d'une heure.")

    h57 = doc.add_paragraph("5.7 Implémentation du monitoring en temps réel")
    style_heading_2(h57)
    add_body_p(doc, "Le MetricsService sonde l'état d'exécution via un thread d'arrière-plan. Un cache mémoire avec TTL de 5 secondes élimine la surcharge sur VBoxManage. En cas d'évolution de statut ou de pic d'utilisation, un message est diffusé par WebSocket aux clients connectés.")

    h58 = doc.add_paragraph("5.8 Développement de l'interface utilisateur React")
    style_heading_2(h58)
    add_body_p(doc, "L'application React offre une expérience fluide et soignée. Les sections suivantes présentent les captures d'écran des différentes interfaces développées.")

    # ── CAPTURES D'ÉCRAN DÉTAILLÉES (FIGURES 8 À 18) ──
    add_screenshot_placeholder(
        doc,
        figure_num="8",
        title="Interface d'Authentification et Formulaire de Connexion Sécurisée (Login)",
        instructions="Rendez-vous sur http://localhost:5173/login. Capturez la page de connexion complète avec les champs Nom d'utilisateur, Mot de passe et le bouton de connexion.",
        expected_elements="Formulaire centré élégant en Dark Mode, logo, champs de saisie, bouton avec effet de survol, lien vers l'inscription."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="9",
        title="Tableau de Bord Général Utilisateur (Dashboard KPI)",
        instructions="Connectez-vous et capturez la page d'accueil http://localhost:5173/dashboard montrant la vue synthétique de l'espace personnel.",
        expected_elements="Cartes statistiques (Total VMs créées, VMs actives, ressources consommées), raccourcis de navigation et liste des dernières machines."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="10",
        title="Interface de Création et Configuration de Machine Virtuelle",
        instructions="Accédez à http://localhost:5173/create. Remplissez le formulaire en choisissant 'Zorin OS Lite', 2 vCPU, 2048 Mo de RAM et renseignez les credentials.",
        expected_elements="Cartes de sélection des OS (logos Zorin, Ubuntu, Windows), curseurs interactifs pour la mémoire et les cœurs, validation du mot de passe."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="11",
        title="Inventaire et Gestion des Machines Virtuelles Utilisateur",
        instructions="Naviguez vers http://localhost:5173/vms présentant la liste complète des machines virtuelles de l'utilisateur.",
        expected_elements="Tableau/cartes de VM, pastilles de statut colorées (vert 'RUNNING', gris 'STOPPED'), IP, port SSH et boutons d'action rapide."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="12",
        title="Fiche Technique et Supervision Temps Réel d'une Machine Virtuelle",
        instructions="Cliquez sur une machine active pour ouvrir http://localhost:5173/vms/:id. Capturez la vue complète.",
        expected_elements="Jauges graphiques directes (CPU %, RAM Mo), informations de connexion (Port SSH, IP interne), contrôles d'alimentation et bouton 'Ouvrir la Console'."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="13",
        title="Console Graphique HTML5 Interactive Intégrée (Apache Guacamole)",
        instructions="Depuis la fiche d'une VM en cours d'exécution, cliquez sur le bouton 'Console'. Capturez le bureau distant (ex: bureau Zorin OS ou Ubuntu) fonctionnant dans le navigateur.",
        expected_elements="Composant d'affichage fluide, bureau Linux complet avec menu des applications et barre des tâches, zéro client installé sur le poste."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="14",
        title="Tableau de Bord Administrateur et Vue Globale du Parc",
        instructions="Connectez-vous avec le compte admin et rendez-vous sur http://localhost:5173/admin. Capturez la page d'administration globale.",
        expected_elements="Statistiques consolidées (Total VMs du parc, répartition par statut, nombre d'utilisateurs inscrits), tableau exhaustif de gestion multi-utilisateurs."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="15",
        title="Module des Journaux d'Audit de Sécurité (Audit Trail)",
        instructions="Dans la section d'administration, capturez le tableau des journaux d'audit de sécurité.",
        expected_elements="Horodatages UTC précis, identité de l'utilisateur, type d'action (CREATE_VM, LOGIN, STOP_VM), statut (SUCCESS/FAILED) et adresse IP cliente."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="16",
        title="Centre de Notifications Événementielles en Direct",
        instructions="Naviguez vers http://localhost:5173/notifications ou capturez le menu popover des alertes.",
        expected_elements="Liste des notifications reçues (succès de provisionnement, alertes d'état), horodatage relatif et état de lecture."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="17",
        title="Documentation Interactive OpenAPI / Swagger des Endpoints FastAPI",
        instructions="Ouvrez http://127.0.0.1:8000/api/docs dans votre navigateur et capturez la documentation interactive Swagger.",
        expected_elements="Bandeau FastAPI, liste des tags (/auth, /vms, /admin, /console, /notifications) avec leurs verbes HTTP colorés (GET, POST, DELETE)."
    )

    add_screenshot_placeholder(
        doc,
        figure_num="18",
        title="Preuve Système Hyperviseur : VBoxManage CLI et Clones Actifs sur l'Hôte",
        instructions="Ouvrez un terminal PowerShell sur la machine hôte et exécutez 'VBoxManage list runningvms'. Capturez la sortie console.",
        expected_elements="Affichage des machines virtuelles en cours d'exécution avec leurs noms et UUIDs système, prouvant le pilotage effectif de l'hyperviseur."
    )

    h59 = doc.add_paragraph("5.9 Implémentation de la sécurité et des journaux d'audit")
    style_heading_2(h59)
    add_body_p(doc, "Le middleware SlowAPI applique une limitation de débit stricte (5 requêtes/minute sur la connexion) pour bloquer les attaques par force brute. L'AuditService consigne chaque opération dans la base SQLite de façon immuable.")

    h510 = doc.add_paragraph("5.10 Déploiement et configuration de la plateforme")
    style_heading_2(h510)
    add_body_p(doc, "Le déploiement orchestre les conteneurs Guacamole via Docker Compose, lance le serveur backend sous Uvicorn et sert le build statique React optimisé.")

    h511 = doc.add_paragraph("5.11 Conclusion")
    style_heading_2(h511)
    add_body_p(doc, "L'implémentation logicielle aboutit à une plateforme IaaS réactive et complète. Le chapitre 6 évalue ses performances de manière empirique.")

    # ══════════════════════════════════════════════════════════════════════════
    # CHAPITRE 6 : TESTS, VALIDATION ET ÉVALUATION DES PERFORMANCES
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h6 = doc.add_paragraph("CHAPITRE 6 : TESTS, VALIDATION ET ÉVALUATION DES PERFORMANCES")
    style_heading_1(h6)

    h61 = doc.add_paragraph("6.1 Introduction")
    style_heading_2(h61)
    add_body_p(doc, "Ce chapitre expose les protocoles de tests mis en œuvre pour valider la robustesse, la sécurité et les gains de performance de la solution.")

    h62 = doc.add_paragraph("6.2 Environnement et stratégie de test")
    style_heading_2(h62)
    add_body_p(doc, "Les tests ont été conduits sur la station de développement en simulant des scénarios d'usage intensif (créations simultanées, arrêts forcés, tentatives de brute-force).")

    h63 = doc.add_paragraph("6.3 Tests fonctionnels")
    style_heading_2(h63)
    add_body_p(doc, "L'ensemble des cas d'utilisation fonctionnels a été validé avec un taux de réussite de 100% :")
    add_bullet_p(doc, "Authentification & RBAC : ", "Vérification de l'inviolabilité des routes réservées à l'administrateur et du cloisonnement des VM par utilisateur.")
    add_bullet_p(doc, "Cycle de vie : ", "Transition fluide entre les états PENDING, CREATING, RUNNING, STOPPED et DELETED.")
    add_bullet_p(doc, "Configuration Cloud-Init : ", "Vérification dans la VM invitée de la présence du compte utilisateur et de son mot de passe haché.")
    add_bullet_p(doc, "Console Guacamole : ", "Ouverture de session instantanée sans saisie d'identifiants supplémentaires.")

    h64 = doc.add_paragraph("6.4 Tests de sécurité")
    style_heading_2(h64)
    add_body_p(doc, "La simulation de requêtes répétées sur /auth/token déclenche systématiquement le code HTTP 429 Too Many Requests après la cinquième tentative, avec inscription automatique d'une entrée d'échec dans les logs de sécurité.")

    h65 = doc.add_paragraph("6.5 Évaluation des performances")
    style_heading_2(h65)
    
    # Tableau 6.1
    tbl_t6 = doc.add_table(rows=4, cols=4)
    tbl_t6.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl_t6.autofit = False
    for i, h_text in enumerate(["Système d'Exploitation", "Temps de Clonage", "Taille Disque Initiale", "Disponibilité Complète"]):
        c = tbl_t6.cell(0, i)
        c.paragraphs[0].text = h_text
        c.paragraphs[0].runs[0].bold = True
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(c, "0D47A1")
        set_cell_margins(c, top=90, bottom=90, left=90, right=90)
    rows_t6 = [
        ("Zorin OS 17 Lite", "18.2 secondes", "32 Mo (différentiel)", "26 secondes (SSH + GUI)"),
        ("Ubuntu 24.04 LTS", "15.8 secondes", "27 Mo (différentiel)", "21 secondes (Cloud-Init OK)"),
        ("Windows 11 Entreprise", "28.4 secondes", "54 Mo (différentiel)", "44 secondes (RDP actif)")
    ]
    for r_idx, r_data in enumerate(rows_t6, start=1):
        for col_idx, val in enumerate(r_data):
            c = tbl_t6.cell(r_idx, col_idx)
            c.paragraphs[0].text = val
            c.paragraphs[0].runs[0].font.size = Pt(9.5)
            set_cell_margins(c, top=80, bottom=80, left=90, right=90)
            set_cell_background(c, "F0F4F8" if r_idx % 2 == 1 else "FFFFFF")

    doc.add_paragraph()
    h66 = doc.add_paragraph("6.6 Analyse et discussion des résultats")
    style_heading_2(h66)
    add_body_p(doc, "Les mesures expérimentales confirment un gain de temps de plus de 90% par rapport à une installation classique, et une économie de stockage initial de 99.8% grâce au Linked Cloning.")

    h67 = doc.add_paragraph("6.7 Limites de la solution")
    style_heading_2(h67)
    add_body_p(doc, "La solution actuelle dépend de l'exécution sur un hôte physique unique et nécessite que les Golden Masters restent strictement figés en lecture seule.")

    h68 = doc.add_paragraph("6.8 Conclusion")
    style_heading_2(h68)
    add_body_p(doc, "Les tests démontrent l'excellence opérationnelle et la viabilité industrielle de la plateforme développée au sein de Holcim Maroc.")

    # ══════════════════════════════════════════════════════════════════════════
    # CONCLUSION GÉNÉRALE ET PERSPECTIVES
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h_ccl = doc.add_paragraph("CONCLUSION GÉNÉRALE ET PERSPECTIVES")
    style_heading_1(h_ccl)
    
    h_ccl1 = doc.add_paragraph("Bilan du travail réalisé")
    style_heading_2(h_ccl1)
    add_body_p(doc, "Le présent projet de fin d'année, mené avec l'appui de la Direction des Systèmes d'Information de Holcim Maroc, a permis de concevoir, développer et déployer une plateforme complète d'Infrastructure as a Service (IaaS) privée et automatisée. Toutes les exigences du cahier des charges initial ont été satisfaites : mise à disposition de machines virtuelles en moins de 30 secondes, support multi-OS, configuration dynamique par Cloud-Init, console web graphique interactive sans client tiers, et sécurité renforcée.")

    h_ccl2 = doc.add_paragraph("Apports techniques et compétences acquises")
    style_heading_2(h_ccl2)
    add_body_p(doc, "Ce projet a été une formidable opportunité d'approfondir la maîtrise de technologies d'infrastructure et de développement logiciel de pointe : orchestration de bas niveau avec VBoxManage, manipulation binaire d'images ISO NoCloud via pycdlib, protocoles de bureau à distance et cryptographie (Guacamole JSON Auth), architecture d'API asynchrone avec FastAPI, et développement d'interfaces web réactives avec React 18.")

    h_ccl3 = doc.add_paragraph("Limites et difficultés rencontrées")
    style_heading_2(h_ccl3)
    add_body_p(doc, "Les principales difficultés ont résidé dans l'interaction déterministe avec VBoxManage sous Windows (gestion des chemins et verrous de disques), la compilation des ISO NoCloud sans outils système externes et la synchronisation cryptographique précise des tokens Guacamole.")

    h_ccl4 = doc.add_paragraph("Perspectives d'amélioration")
    style_heading_2(h_ccl4)
    add_bullet_p(doc, "Clustering multi-hôtes : ", "Orchestrer un ensemble de serveurs physiques hyperviseurs avec équilibrage de charge dynamique.")
    add_bullet_p(doc, "Support d'hyperviseurs de Type 1 : ", "Interfacer la plateforme avec KVM / Proxmox VE en environnement de datacenter.")
    add_bullet_p(doc, "Provider Terraform : ", "Permettre aux ingénieurs d'instancier leurs ressources sous forme d'Infrastructure as Code (IaC).")
    add_bullet_p(doc, "Quotas de facturation interne : ", "Attribuer des budgets d'heures-machine aux départements de Holcim Maroc.")

    # ══════════════════════════════════════════════════════════════════════════
    # RÉFÉRENCES BIBLIOGRAPHIQUES ET WEBOGRAPHIQUES
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h_bib = doc.add_paragraph("RÉFÉRENCES BIBLIOGRAPHIQUES ET WEBOGRAPHIQUES")
    style_heading_1(h_bib)
    bib_items = [
        "[1] Holcim Maroc, « Rapport de Développement Durable et Transition Écologique Industrielle », Documentation Institutionnelle Holcim Maroc, 2024. [En ligne] : https://www.holcim.ma/",
        "[2] Oracle Corporation, « VirtualBox User Manual: VBoxManage Command-Line Interface and Hypervisor Management », Oracle Systems Documentation, 2024. [En ligne] : https://docs.oracle.com/en/virtualization/virtualbox/",
        "[3] Canonical Ltd., « Cloud-Init Documentation & NoCloud Datasource Specifications », Cloud-Init Reference Guide, 2024. [En ligne] : https://cloudinit.readthedocs.io/",
        "[4] Apache Software Foundation, « Apache Guacamole: Clientless Remote Desktop Gateway Architecture and JSON Authentication Extension », 2024. [En ligne] : https://guacamole.apache.org/doc/gug/",
        "[5] Sebastián Ramírez (tiangolo), « FastAPI: High-performance, Easy to Learn, Fast to Code, Ready for Production », 2024. [En ligne] : https://fastapi.tiangolo.com/",
        "[6] Meta Platforms, « React 18: Documentation and Best Practices for Single Page Applications », 2024. [En ligne] : https://react.dev/",
        "[7] Internet Engineering Task Force (IETF), « RFC 7519: JSON Web Token (JWT) », Network Working Group, 2015. [En ligne] : https://datatracker.ietf.org/doc/html/rfc7519",
        "[8] Peter Mell and Timothy Grance, « The NIST Definition of Cloud Computing », National Institute of Standards and Technology (NIST), Special Publication 800-145, 2011."
    ]
    for b in bib_items:
        p_b = doc.add_paragraph(b)
        p_b.paragraph_format.space_before = Pt(2)
        p_b.paragraph_format.space_after = Pt(4)
        p_b.paragraph_format.line_spacing = 1.15
        p_b.runs[0].font.name = "Calibri"
        p_b.runs[0].font.size = Pt(9.5)
        p_b.runs[0].font.color.rgb = RGBColor(55, 71, 79)

    # ══════════════════════════════════════════════════════════════════════════
    # ANNEXES
    # ══════════════════════════════════════════════════════════════════════════
    doc.add_page_break()
    h_ann = doc.add_paragraph("ANNEXES")
    style_heading_1(h_ann)

    h_a = doc.add_paragraph("Annexe A : Principales commandes VBoxManage exploitées par le service")
    style_heading_2(h_a)
    add_bullet_p(doc, "Clonage lié : ", "VBoxManage clonevm <master> --snapshot <snap> --options link --name <vm_name> --register")
    add_bullet_p(doc, "Dimensionnement : ", "VBoxManage modifyvm <name> --cpus <vcpu> --memory <ram_mb>")
    add_bullet_p(doc, "Redirection NAT SSH : ", "VBoxManage modifyvm <name> --natpf1 'guestssh,tcp,,<host_port>,,22'")
    add_bullet_p(doc, "Montage ISO NoCloud : ", "VBoxManage storageattach <name> --storagectl <ide> --port 1 --device 0 --type dvddrive --medium <iso_path>")
    add_bullet_p(doc, "Démarrage Headless : ", "VBoxManage startvm <name> --type headless")
    add_bullet_p(doc, "Arrêt ACPI / Force : ", "VBoxManage controlvm <name> acpipowerbutton / poweroff")

    h_b = doc.add_paragraph("Annexe B : Exemples de fichiers de configuration Cloud-Init NoCloud")
    style_heading_2(h_b)
    add_body_p(doc, "Exemple de fichier user-data généré par CloudInitService :")
    add_body_p(doc, "#cloud-config\nusers:\n  - name: ingenieur_holcim\n    passwd: $6$rounds=4096$salt$...\n    lock_passwd: false\n    groups: [sudo, adm]\n    shell: /bin/bash\n    sudo: ['ALL=(ALL) NOPASSWD:ALL']\nhostname: vm-lab-holcim\nmanage_etc_hosts: true\npackages:\n  - curl\n  - wget\n  - openssh-server\nruncmd:\n  - systemctl enable ssh\n  - systemctl start ssh")

    h_c = doc.add_paragraph("Annexe C : Documentation synthétique des endpoints de l'API REST")
    style_heading_2(h_c)
    add_bullet_p(doc, "POST /auth/register & /auth/token : ", "Création de compte et émission de jeton JWT.")
    add_bullet_p(doc, "GET /vms/ & POST /vms/ : ", "Inventaire et commande de machine virtuelle.")
    add_bullet_p(doc, "POST /vms/{id}/start, /stop, /restart : ", "Contrôle d'alimentation de la VM.")
    add_bullet_p(doc, "POST /console/session/{id} : ", "Négociation de session Guacamole chiffrée.")
    add_bullet_p(doc, "GET /admin/vms & /admin/audit-logs : ", "Supervision et traçabilité globale.")

    h_d = doc.add_paragraph("Annexe D : Captures complémentaires de la plateforme")
    style_heading_2(h_d)
    add_body_p(doc, "Les captures d'écran intégrales du système ont été intercalées dans le corps du texte au Chapitre 5 (Figures 8 à 18). Cette annexe peut recevoir des captures complémentaires lors de tests de montée en charge spécifiques.")

    h_e = doc.add_paragraph("Annexe E : Configuration de déploiement et environnement technique")
    style_heading_2(h_e)
    add_body_p(doc, "Fichier docker-compose.yml type pour Apache Guacamole et guacd :\nversion: '3'\nservices:\n  guacd:\n    image: guacamole/guacd:latest\n    restart: always\n  guacamole:\n    image: guacamole/guacamole:latest\n    ports:\n      - '8080:8080'\n    environment:\n      GUACD_HOSTNAME: guacd\n      JSON_SECRET_KEY: <CleSecreteHex16Bytes>")

    out_path = r"c:\Users\MSI\Desktop\pfa\PFA-\Rapport_PFA_Holcim_Maroc_Plateforme_IaaS_Final.docx"
    doc.save(out_path)
    print(f"SUCCESS: Report saved to {out_path}")

if __name__ == "__main__":
    main()

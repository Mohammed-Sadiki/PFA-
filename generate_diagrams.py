# -*- coding: utf-8 -*-
"""
Génération des 7 diagrammes d'ingénierie et d'architecture UML pour le rapport PFA Holcim Maroc.
Sauvegarde au format PNG haute résolution dans diagrams/
"""

import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

os.makedirs("diagrams", exist_ok=True)

plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['font.family'] = 'sans-serif'

# ─────────────────────────────────────────────────────────────────────────────
# 1. Figure 1 : Architecture Multicouche Globale
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure1():
    fig, ax = plt.subplots(figsize=(12, 7.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8.5)
    ax.axis('off')
    
    # Titre
    ax.text(6, 8.1, "ARCHITECTURE SYSTÈME MULTICOUCHE — PLATEFORME IAAS HOLCIM", 
            ha='center', va='center', fontsize=14, fontweight='bold', color='#0D47A1')

    # Couche 1: Présentation
    p1 = patches.FancyBboxPatch((0.5, 6.2), 11, 1.4, boxstyle="round,pad=0.1", fc='#E3F2FD', ec='#1565C0', lw=2)
    ax.add_patch(p1)
    ax.text(0.7, 7.3, "COUCHE PRÉSENTATION (FRONTEND SPA REACT 18)", fontsize=10, fontweight='bold', color='#0D47A1')
    
    # Boîtes internes frontend
    boxes_fe = [
        (1.0, 6.4, 2.2, 0.7, "Tableau de Bord / KPI\n(Dashboard, Metrics)", '#BBDEFB'),
        (3.5, 6.4, 2.2, 0.7, "Gestionnaire de VM\n(Create, Lifecycle)", '#BBDEFB'),
        (6.0, 6.4, 2.2, 0.7, "Console Web Iframe\n(Apache Guacamole)", '#BBDEFB'),
        (8.5, 6.4, 2.7, 0.7, "Administration & Audit\n(Users, Security Logs)", '#BBDEFB')
    ]
    for x, y, w, h, t, c in boxes_fe:
        ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05", fc=c, ec='#1976D2', lw=1.2))
        ax.text(x + w/2, y + h/2, t, ha='center', va='center', fontsize=8, fontweight='bold', color='#0D47A1')

    # Flèches vers Backend
    ax.annotate("", xy=(3, 5.2), xytext=(3, 6.2), arrowprops=dict(arrowstyle="<->", color='#0D47A1', lw=2))
    ax.text(3.1, 5.7, "REST HTTPS / JWT", fontsize=8, color='#0D47A1', fontweight='bold')
    
    ax.annotate("", xy=(8, 5.2), xytext=(8, 6.2), arrowprops=dict(arrowstyle="<->", color='#00897B', lw=2))
    ax.text(8.1, 5.7, "WebSockets (Télémétrie & Flux Console)", fontsize=8, color='#00897B', fontweight='bold')

    # Couche 2: API Gateway & Contrôle
    p2 = patches.FancyBboxPatch((0.5, 3.8), 11, 1.4, boxstyle="round,pad=0.1", fc='#E0F2F1', ec='#00897B', lw=2)
    ax.add_patch(p2)
    ax.text(0.7, 4.9, "COUCHE API GATEWAY & LOGIQUE MÉTIER (FASTAPI - ASYNC PYTHON 3.12)", fontsize=10, fontweight='bold', color='#00695C')

    boxes_be = [
        (0.8, 4.0, 2.0, 0.7, "Auth & Sécurité\n(JWT, bcrypt, SlowAPI)", '#B2DFDB'),
        (3.0, 4.0, 2.3, 0.7, "VBoxVMService\n(Orchestration CLI)", '#B2DFDB'),
        (5.5, 4.0, 2.1, 0.7, "CloudInitService\n(pycdlib ISO NoCloud)", '#B2DFDB'),
        (7.8, 4.0, 2.0, 0.7, "ConsoleService\n(AES-128 / HMAC Guac)", '#B2DFDB'),
        (10.0, 4.0, 1.3, 0.7, "Metrics\nService", '#B2DFDB')
    ]
    for x, y, w, h, t, c in boxes_be:
        ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05", fc=c, ec='#00796B', lw=1.2))
        ax.text(x + w/2, y + h/2, t, ha='center', va='center', fontsize=7.5, fontweight='bold', color='#004D40')

    # Flèches vers Infrastructure
    ax.annotate("", xy=(4.1, 2.8), xytext=(4.1, 3.8), arrowprops=dict(arrowstyle="->", color='#37474F', lw=2))
    ax.text(4.2, 3.3, "VBoxManage CLI Calls", fontsize=8, color='#37474F', fontweight='bold')

    ax.annotate("", xy=(8.8, 2.8), xytext=(8.8, 3.8), arrowprops=dict(arrowstyle="<->", color='#E65100', lw=2))
    ax.text(8.9, 3.3, "HTTP POST JSON Auth", fontsize=8, color='#E65100', fontweight='bold')

    ax.annotate("", xy=(1.8, 2.8), xytext=(1.8, 3.8), arrowprops=dict(arrowstyle="<->", color='#5E35B1', lw=2))
    ax.text(1.9, 3.3, "SQLAlchemy ORM", fontsize=8, color='#5E35B1', fontweight='bold')

    # Couche 3: Infrastructure & Persistance
    p3 = patches.FancyBboxPatch((0.5, 0.4), 11, 2.4, boxstyle="round,pad=0.1", fc='#ECEFF1', ec='#455A64', lw=2)
    ax.add_patch(p3)
    ax.text(0.7, 2.5, "COUCHE INFRASTRUCTURE HÔTE & PERSISTANCE", fontsize=10, fontweight='bold', color='#263238')

    boxes_inf = [
        (0.8, 0.6, 2.5, 1.6, "Base de Données\n(SQLite / PostgreSQL)\n\n- users / vms\n- audit_logs\n- notifications", '#CFD8DC'),
        (3.6, 0.6, 4.4, 1.6, "Hyperviseur Oracle VirtualBox\n\n- Golden Masters (Zorin, Ubuntu, Win11)\n- Linked Clones Différentiels (Snapshots)\n- Forwarding NAT Ports (SSH & VRDE)", '#CFD8DC'),
        (8.3, 0.6, 3.0, 1.6, "Conteneurs Docker\n(Apache Guacamole)\n\n- guacd (Démon RDP/VNC)\n- guacamole-web (Portail)\n- auth-json extension", '#FFE0B2')
    ]
    for x, y, w, h, t, c in boxes_inf:
        ax.add_patch(patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05", fc=c, ec='#607D8B' if c!='#FFE0B2' else '#FB8C00', lw=1.2))
        ax.text(x + w/2, y + h/2, t, ha='center', va='center', fontsize=8, fontweight='bold', color='#263238' if c!='#FFE0B2' else '#E65100')

    plt.tight_layout()
    plt.savefig("diagrams/figure1_architecture_multicouche.png", bbox_inches='tight')
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 2. Figure 2 : Diagramme de Cas d'Utilisation UML
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure2():
    fig, ax = plt.subplots(figsize=(11, 8), dpi=300)
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 9)
    ax.axis('off')

    ax.text(5.5, 8.6, "DIAGRAMME DE CAS D'UTILISATION GLOBAL (USE CASE UML)", 
            ha='center', va='center', fontsize=14, fontweight='bold', color='#0D47A1')

    # Frontière système
    sys_box = patches.FancyBboxPatch((3.0, 0.5), 7.5, 7.8, boxstyle="round,pad=0.1", fc='#FAFAFA', ec='#0D47A1', lw=2)
    ax.add_patch(sys_box)
    ax.text(6.75, 8.0, "Système IaaS — Plateforme de Virtualisation Holcim Maroc", ha='center', fontsize=11, fontweight='bold', color='#0D47A1')

    # Acteur 1 : Utilisateur / Ingénieur
    ax.plot([1.2], [5.5], 'o', ms=16, color='#1565C0', mfc='#BBDEFB', mec='#1565C0', mew=2)
    ax.plot([1.2, 1.2], [5.2, 4.4], color='#1565C0', lw=2.5)
    ax.plot([0.7, 1.7], [4.9, 4.9], color='#1565C0', lw=2.5)
    ax.plot([1.2, 0.8], [4.4, 3.6], color='#1565C0', lw=2.5)
    ax.plot([1.2, 1.6], [4.4, 3.6], color='#1565C0', lw=2.5)
    ax.text(1.2, 3.2, "Utilisateur\n(Ingénieur Holcim)", ha='center', fontsize=9.5, fontweight='bold', color='#1565C0')

    # Acteur 2 : Administrateur Système
    ax.plot([1.2], [2.2], 'o', ms=16, color='#C62828', mfc='#FFCDD2', mec='#C62828', mew=2)
    ax.plot([1.2, 1.2], [1.9, 1.1], color='#C62828', lw=2.5)
    ax.plot([0.7, 1.7], [1.6, 1.6], color='#C62828', lw=2.5)
    ax.plot([1.2, 0.8], [1.1, 0.4], color='#C62828', lw=2.5)
    ax.plot([1.2, 1.6], [1.1, 0.4], color='#C62828', lw=2.5)
    ax.text(1.2, 0.1, "Administrateur\n(DSI Holcim)", ha='center', fontsize=9.5, fontweight='bold', color='#C62828')

    # Cas d'utilisation (Bulles elliptiques)
    use_cases = [
        (4.8, 7.2, "S'authentifier (JWT)", '#E3F2FD', '#1565C0'),
        (4.8, 6.2, "Gérer son profil", '#E3F2FD', '#1565C0'),
        (4.8, 5.1, "Commander / Créer une VM (OS, RAM, vCPU)", '#E3F2FD', '#1565C0'),
        (4.8, 4.0, "Contrôler la VM (Start, Stop, Restart)", '#E3F2FD', '#1565C0'),
        (4.8, 2.9, "Accéder à la Console Web (Guacamole)", '#E3F2FD', '#1565C0'),
        (4.8, 1.8, "Superviser les métriques live (CPU/RAM)", '#E3F2FD', '#1565C0'),
        (8.5, 3.5, "Superviser le parc global des VMs", '#FFEBEE', '#C62828'),
        (8.5, 2.3, "Gérer les comptes utilisateurs", '#FFEBEE', '#C62828'),
        (8.5, 1.2, "Consulter les journaux d'audit de sécurité", '#FFEBEE', '#C62828'),
        (8.5, 6.2, "Configurer Cloud-Init (Injection Credentials)", '#E0F2F1', '#00796B')
    ]

    for x, y, text, fc, ec in use_cases:
        ellipse = patches.Ellipse((x, y), 3.2, 0.75, fc=fc, ec=ec, lw=1.5)
        ax.add_patch(ellipse)
        ax.text(x, y, text, ha='center', va='center', fontsize=7.5, fontweight='bold', color=ec)

    # Liaisons Utilisateur -> UC
    for uy in [7.2, 6.2, 5.1, 4.0, 2.9, 1.8]:
        ax.plot([1.7, 3.2], [4.8, uy], color='#1565C0', lw=1.2, ls='-')

    # Liaisons Admin -> UC (Admin a accès aux siens + hérite des droits utilisateur)
    for ay in [3.5, 2.3, 1.2]:
        ax.plot([1.7, 6.9], [1.5, ay], color='#C62828', lw=1.2, ls='-')

    # Relations include
    # Créer VM -> include -> Configurer Cloud-Init
    ax.annotate("<<include>>", xy=(6.9, 6.2), xytext=(6.1, 5.4),
                arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.2, ls='--'),
                fontsize=7.5, color='#00796B', fontweight='bold')
    
    # Créer VM -> include -> S'authentifier
    ax.annotate("<<include>>", xy=(4.8, 6.8), xytext=(4.8, 5.6),
                arrowprops=dict(arrowstyle="->", color='#1565C0', lw=1.2, ls='--'),
                fontsize=7.5, color='#1565C0', fontweight='bold', ha='center')

    plt.tight_layout()
    plt.savefig("diagrams/figure2_cas_utilisation.png", bbox_inches='tight')
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 3. Figure 3 : Diagramme de Classes Métier
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure3():
    fig, ax = plt.subplots(figsize=(11.5, 7.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    ax.text(6, 8.1, "DIAGRAMME DE CLASSES MÉTIER & ENTITÉS DU DOMAINE (UML)", 
            ha='center', va='center', fontsize=14, fontweight='bold', color='#0D47A1')

    # Boîte Classe : User
    def draw_class(x, y, w, h, name, attrs, methods, color_hdr='#0D47A1'):
        # Header
        ax.add_patch(patches.Rectangle((x, y + h - 0.7), w, 0.7, fc=color_hdr, ec='#263238', lw=1.5))
        ax.text(x + w/2, y + h - 0.35, name, ha='center', va='center', fontsize=9.5, fontweight='bold', color='white')
        # Body
        ax.add_patch(patches.Rectangle((x, y), w, h - 0.7, fc='#FAFAFA', ec='#263238', lw=1.5))
        # Attrs
        curr_y = y + h - 0.95
        for a in attrs:
            ax.text(x + 0.15, curr_y, a, fontsize=7.5, color='#263238')
            curr_y -= 0.28
        # Séparateur
        ax.plot([x, x + w], [curr_y, curr_y], color='#90A4AE', lw=1)
        curr_y -= 0.25
        for m in methods:
            ax.text(x + 0.15, curr_y, m, fontsize=7.5, color='#0D47A1', fontstyle='italic')
            curr_y -= 0.28

    # User
    user_attrs = [
        "- id: Integer [PK]",
        "- username: String(50)",
        "- email: String(255)",
        "- hashed_password: String(255)",
        "- is_verified: Boolean",
        "- is_admin: Boolean",
        "- created_at: DateTime"
    ]
    user_methods = [
        "+ verify_password(plain): bool",
        "+ generate_jwt_token(): str"
    ]
    draw_class(0.6, 3.8, 3.2, 3.8, "User", user_attrs, user_methods, '#1565C0')

    # VM
    vm_attrs = [
        "- id: Integer [PK]",
        "- name: String(100) [Unique]",
        "- owner_id: Integer [FK]",
        "- distro: String(50)",
        "- os_type: String(50)",
        "- vcpu: Integer",
        "- ram_mb: Integer",
        "- disk_gb: Integer",
        "- status: VMStatus (Enum)",
        "- ip_address: String(45)",
        "- ssh_port: Integer",
        "- vrde_port: Integer",
        "- created_at: DateTime"
    ]
    vm_methods = [
        "+ start(): void",
        "+ stop(force: bool): void",
        "+ get_metrics(): Dict"
    ]
    draw_class(4.6, 2.5, 3.6, 5.1, "VM", vm_attrs, vm_methods, '#00796B')

    # AuditLog
    audit_attrs = [
        "- id: Integer [PK]",
        "- user_id: Integer [Index]",
        "- username: String(100)",
        "- action: String(100)",
        "- resource_type: String",
        "- status: String(50)",
        "- ip_address: String(50)",
        "- details: Text (JSON)",
        "- created_at: DateTime"
    ]
    audit_methods = [
        "+ log_event(db, action): void"
    ]
    draw_class(9.0, 4.3, 2.6, 3.3, "AuditLog", audit_attrs, audit_methods, '#C62828')

    # Notification
    notif_attrs = [
        "- id: Integer [PK]",
        "- user_id: Integer [FK]",
        "- title: String(200)",
        "- message: Text",
        "- type: String(50)",
        "- is_read: Boolean",
        "- created_at: DateTime"
    ]
    notif_methods = [
        "+ mark_as_read(): void"
    ]
    draw_class(9.0, 0.6, 2.6, 3.1, "Notification", notif_attrs, notif_methods, '#E65100')

    # Associations
    # User -> VM (1 to 0..*)
    ax.plot([3.8, 4.6], [5.8, 5.8], color='#263238', lw=1.5)
    ax.text(3.9, 6.0, "1", fontsize=8, fontweight='bold', color='#1565C0')
    ax.text(4.35, 6.0, "0..*", fontsize=8, fontweight='bold', color='#00796B')
    ax.text(4.1, 5.5, "possède", fontsize=7.5, fontstyle='italic', color='#555')

    # User -> Notification (1 to 0..*)
    ax.plot([2.2, 2.2, 9.0], [3.8, 1.8, 1.8], color='#263238', lw=1.5)
    ax.text(2.3, 3.5, "1", fontsize=8, fontweight='bold', color='#1565C0')
    ax.text(8.7, 2.0, "0..*", fontsize=8, fontweight='bold', color='#E65100')

    # VMStatus Enum
    enum_box = patches.FancyBboxPatch((0.6, 0.6), 2.8, 2.3, boxstyle="round,pad=0.05", fc='#FFFDE7', ec='#FBC02D', lw=1.2)
    ax.add_patch(enum_box)
    ax.text(2.0, 2.6, "<<enumeration>>\nVMStatus", ha='center', va='center', fontsize=8, fontweight='bold', color='#F57F17')
    enum_vals = ["PENDING", "CREATING", "RUNNING", "STOPPED", "ERROR", "DELETED"]
    ey = 2.0
    for ev in enum_vals:
        ax.text(1.0, ey, f"• {ev}", fontsize=7.5, color='#424242')
        ey -= 0.25

    plt.tight_layout()
    plt.savefig("diagrams/figure3_diagramme_classes.png", bbox_inches='tight')
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 4. Figure 4 : Diagramme de Séquence : Création d'une VM
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure4():
    fig, ax = plt.subplots(figsize=(12, 7.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9.5)
    ax.axis('off')

    ax.text(6, 9.1, "DIAGRAMME DE SÉQUENCE UML — PROVISIONING ET CRÉATION D'UNE VM", 
            ha='center', va='center', fontsize=13, fontweight='bold', color='#0D47A1')

    lifelines = [
        (1.2, "Utilisateur\n(Navigateur)", '#1565C0'),
        (3.5, "API Router\n(/vms POST)", '#00796B'),
        (6.0, "VBoxVMService\n(Orchestrateur)", '#E65100'),
        (8.5, "CloudInitService\n(pycdlib)", '#5E35B1'),
        (11.0, "VBoxManage CLI\n& Hyperviseur", '#263238')
    ]

    for x, name, col in lifelines:
        # Header box
        ax.add_patch(patches.FancyBboxPatch((x - 0.9, 8.0), 1.8, 0.8, boxstyle="round,pad=0.05", fc=col, ec=col))
        ax.text(x, 8.4, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='white')
        # Line
        ax.plot([x, x], [0.6, 8.0], color='#B0BEC5', lw=1.2, ls='--')

    # Messages
    msgs = [
        (7.4, 1.2, 3.5, "1: Soumet formulaire (os, vcpu, ram, pwd)", '#1565C0', True),
        (6.8, 3.5, 6.0, "2: clone_and_configure_vm()", '#00796B', True),
        (6.2, 6.0, 11.0, "3: clonevm <master> --options link", '#E65100', True),
        (5.6, 11.0, 6.0, "4: Clone différentiel créé en 12s", '#263238', False),
        (5.0, 6.0, 11.0, "5: modifyvm (cpus, memory, natpf1: ssh, vrde)", '#E65100', True),
        (4.4, 6.0, 8.5, "6: create_cloud_init_iso(user, pass)", '#E65100', True),
        (3.8, 8.5, 8.5, "7: Hash SHA-512 & compile ISO pycdlib", '#5E35B1', True), # Loop
        (3.2, 8.5, 6.0, "8: Retourne chemin ISO cidata.iso", '#5E35B1', False),
        (2.6, 6.0, 11.0, "9: storageattach (montage lecteur optique)", '#E65100', True),
        (2.0, 6.0, 11.0, "10: startvm --type headless", '#E65100', True),
        (1.4, 6.0, 3.5, "11: VM instanciée avec succès", '#00796B', False),
        (0.8, 3.5, 1.2, "12: HTTP 201 Created (VM en RUNNING)", '#1565C0', False)
    ]

    for y, x1, x2, text, col, is_call in msgs:
        if x1 == x2: # self call
            ax.annotate("", xy=(x1, y - 0.25), xytext=(x1 + 0.6, y - 0.1),
                        arrowprops=dict(arrowstyle="->", color=col, lw=1.2))
            ax.plot([x1, x1 + 0.6, x1 + 0.6], [y, y, y - 0.1], color=col, lw=1.2)
            ax.text(x1 + 0.7, y - 0.1, text, fontsize=7.5, color=col, fontweight='bold', va='center')
            style = "->"
            ls = '-' if is_call else '--'
            ax.annotate("", xy=(x2, y), xytext=(x1, y),
                        arrowprops=dict(arrowstyle=style, color=col, lw=1.3, ls=ls))
            mid_x = (x1 + x2) / 2
            ax.text(mid_x, y + 0.12, text, ha='center', fontsize=7.5, color=col, fontweight='bold')

    plt.tight_layout()
    plt.savefig("diagrams/figure4_sequence_creation_vm.png", bbox_inches='tight')
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 5. Figure 5 : Diagramme de Séquence : Console Guacamole
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure5():
    fig, ax = plt.subplots(figsize=(11.5, 7.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 9.0)
    ax.axis('off')

    ax.text(6, 8.6, "DIAGRAMME DE SÉQUENCE UML — ACCÈS CONSOLE WEB APACHE GUACAMOLE", 
            ha='center', va='center', fontsize=13, fontweight='bold', color='#0D47A1')

    lifelines = [
        (1.5, "Client React\n(Navigateur)", '#1565C0'),
        (4.5, "FastAPI Backend\n(ConsoleService)", '#00796B'),
        (8.0, "Apache Guacamole\n(Portail Web / REST)", '#E65100'),
        (10.8, "guacd Démon &\nVirtualBox VRDE", '#263238')
    ]

    for x, name, col in lifelines:
        ax.add_patch(patches.FancyBboxPatch((x - 1.0, 7.5), 2.0, 0.8, boxstyle="round,pad=0.05", fc=col, ec=col))
        ax.text(x, 7.9, name, ha='center', va='center', fontsize=7.5, fontweight='bold', color='white')
        ax.plot([x, x], [0.5, 7.5], color='#B0BEC5', lw=1.2, ls='--')

    steps = [
        (6.8, 1.5, 4.5, "1: Clic 'Ouvrir Console' (POST /console/session/{id})", '#1565C0', True),
        (6.1, 4.5, 4.5, "2: Construit JSON payload (RDP, vrde_port, duration)", '#00796B', True),
        (5.4, 4.5, 4.5, "3: Signature HMAC-SHA256 + Chiffrement AES-128-CBC", '#00796B', True),
        (4.7, 4.5, 8.0, "4: POST /api/tokens (payload chiffré base64)", '#E65100', True),
        (4.0, 8.0, 4.5, "5: Guacamole valide et émet authToken éphémère", '#E65100', False),
        (3.3, 4.5, 1.5, "6: Retourne URL signée client_url avec authToken", '#00796B', False),
        (2.5, 1.5, 8.0, "7: Ouverture Iframe: /#/client/{id}?token=...", '#1565C0', True),
        (1.8, 8.0, 10.8, "8: guacd établit flux RDP/VRDE natif vers VirtualBox", '#263238', True),
        (1.0, 8.0, 1.5, "9: Streaming vidéo bidirectionnel HTML5 Canvas / WS", '#E65100', False)
    ]

    for y, x1, x2, text, col, is_call in steps:
        if x1 == x2:
            ax.annotate("", xy=(x1, y - 0.25), xytext=(x1 + 0.6, y - 0.1),
                        arrowprops=dict(arrowstyle="->", color=col, lw=1.2))
            ax.plot([x1, x1 + 0.6, x1 + 0.6], [y, y, y - 0.1], color=col, lw=1.2)
            ax.text(x1 + 0.7, y - 0.1, text, fontsize=7.5, color=col, fontweight='bold', va='center')
        else:
            style = "->"
            ls = '-' if is_call else '--'
            ax.annotate("", xy=(x2, y), xytext=(x1, y),
                        arrowprops=dict(arrowstyle=style, color=col, lw=1.3, ls=ls))
            mid_x = (x1 + x2) / 2
            ax.text(mid_x, y + 0.12, text, ha='center', fontsize=7.5, color=col, fontweight='bold')

    plt.tight_layout()
    plt.savefig("diagrams/figure5_sequence_console_guacamole.png", bbox_inches='tight')
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 6. Figure 6 : Diagramme d'Activités : Workflow Cloud-Init
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure6():
    fig, ax = plt.subplots(figsize=(10, 8.5), dpi=300)
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis('off')

    ax.text(5, 9.6, "DIAGRAMME D'ACTIVITÉS UML — WORKFLOW CLOUD-INIT (PYCDLIB)", 
            ha='center', va='center', fontsize=13, fontweight='bold', color='#0D47A1')

    # Start node
    ax.plot([5], [9.1], 'o', ms=18, color='#0D47A1')

    # Activités
    acts = [
        (5, 8.2, 4.4, 0.6, "1. Réception demande : Nom VM, Username, Password"),
        (5, 7.2, 4.4, 0.6, "2. Hachage sécurisé du mot de passe en SHA-512\n(passlib.hash.sha512_crypt)"),
        (5, 6.2, 4.4, 0.6, "3. Génération des fichiers NoCloud\nuser-data (#cloud-config) et meta-data"),
        (5, 5.2, 4.4, 0.6, "4. Instanciation du moteur pur Python pycdlib\n(interchange_level=4, Joliet=True, RockRidge)"),
        (5, 4.2, 4.4, 0.6, "5. Compilation de l'image ISO bit-à-bit\nSauvegarde sous temp/<vm_name>-cidata.iso"),
        (5, 3.2, 4.4, 0.6, "6. Montage VBoxManage storageattach\n(Lecteur DVD IDE Port 1 Dev 0)"),
        (5, 2.0, 4.4, 0.7, "7. Boot de la VM & Lecture par le noyau invité :\nCréation compte, sudoers, activation SSH")
    ]

    for x, y, w, h, text in acts:
        box = patches.FancyBboxPatch((x - w/2, y - h/2), w, h, boxstyle="round,pad=0.1", fc='#E0F2F1', ec='#00796B', lw=1.5)
        ax.add_patch(box)
        ax.text(x, y, text, ha='center', va='center', fontsize=8, fontweight='bold', color='#004D40')

    # Flèches
    ax.annotate("", xy=(5, 8.5), xytext=(5, 9.0), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.annotate("", xy=(5, 7.5), xytext=(5, 7.9), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.annotate("", xy=(5, 6.5), xytext=(5, 6.9), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.annotate("", xy=(5, 5.5), xytext=(5, 5.9), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.annotate("", xy=(5, 4.5), xytext=(5, 4.9), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.annotate("", xy=(5, 3.5), xytext=(5, 3.9), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.annotate("", xy=(5, 2.35), xytext=(5, 2.9), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))

    # End node
    ax.annotate("", xy=(5, 1.05), xytext=(5, 1.65), arrowprops=dict(arrowstyle="->", color='#00796B', lw=1.5))
    ax.plot([5], [0.9], 'o', ms=20, color='#0D47A1', mfc='white', mew=2)
    ax.plot([5], [0.9], 'o', ms=12, color='#0D47A1')
    ax.text(5, 0.45, "VM entièrement provisionnée et opérationnelle", ha='center', fontsize=8.5, fontweight='bold', color='#0D47A1')

    plt.tight_layout()
    plt.savefig("diagrams/figure6_activites_cloudinit.png", bbox_inches='tight')
    plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 7. Figure 7 : Diagramme de Déploiement Physique & Conteneurs
# ─────────────────────────────────────────────────────────────────────────────
def gen_figure7():
    fig, ax = plt.subplots(figsize=(11.5, 7.5), dpi=300)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8.5)
    ax.axis('off')

    ax.text(6, 8.1, "DIAGRAMME DE DÉPLOIEMENT SYSTÈME & CONTENEURS (UML)", 
            ha='center', va='center', fontsize=13, fontweight='bold', color='#0D47A1')

    # Nœud 1 : Poste Client Navigateur
    b_client = patches.FancyBboxPatch((0.5, 4.5), 3.2, 3.0, boxstyle="round,pad=0.1", fc='#E3F2FD', ec='#1565C0', lw=2)
    ax.add_patch(b_client)
    ax.text(2.1, 7.2, "<<device>>\nPoste Client Utilisateur", ha='center', fontsize=9, fontweight='bold', color='#0D47A1')
    
    comp_nav = patches.Rectangle((0.8, 5.0), 2.6, 1.7, fc='white', ec='#1976D2', lw=1.2)
    ax.add_patch(comp_nav)
    ax.text(2.1, 5.85, "<<artifact>>\nNavigateur Web Moderne\n(Chrome, Edge, Firefox)\n\nSPA React 18 / HTML5", ha='center', fontsize=7.5, color='#1565C0')

    # Nœud 2 : Serveur Hôte Physical Machine
    b_host = patches.FancyBboxPatch((4.5, 0.5), 7.0, 7.2, boxstyle="round,pad=0.1", fc='#ECEFF1', ec='#37474F', lw=2)
    ax.add_patch(b_host)
    ax.text(8.0, 7.4, "<<device>> Serveur Hôte de Virtualisation (Station Holcim DSI)", ha='center', fontsize=9.5, fontweight='bold', color='#263238')

    # Sous-composants Host
    # FastAPI & Uvicorn
    c_be = patches.Rectangle((4.8, 4.8), 3.1, 2.2, fc='white', ec='#00897B', lw=1.2)
    ax.add_patch(c_be)
    ax.text(6.35, 6.6, "<<process>> Backend API\nFastAPI (Uvicorn)", ha='center', fontsize=8, fontweight='bold', color='#00695C')
    ax.text(6.35, 5.5, "• Port 8000 (REST API)\n• WebSocket Manager\n• VBoxManage Subprocess\n• Base SQLite / DB", ha='center', fontsize=7, color='#37474F')

    # Vite / Static Server
    c_vite = patches.Rectangle((8.1, 4.8), 3.1, 2.2, fc='white', ec='#7B1FA2', lw=1.2)
    ax.add_patch(c_vite)
    ax.text(9.65, 6.6, "<<process>> Frontend Web\nServeur Node/Vite", ha='center', fontsize=8, fontweight='bold', color='#4A148C')
    ax.text(9.65, 5.5, "• Port 5173 (HTTP)\n• Assets React compilés\n• Tailwind CSS Theme\n• Client i18n", ha='center', fontsize=7, color='#37474F')

    # Docker Guacamole
    c_doc = patches.Rectangle((4.8, 1.0), 3.1, 3.4, fc='#FFF3E0', ec='#FB8C00', lw=1.2)
    ax.add_patch(c_doc)
    ax.text(6.35, 4.1, "<<container>>\nDocker Guacamole", ha='center', fontsize=8, fontweight='bold', color='#E65100')
    ax.text(6.35, 2.5, "• guacamole/guacamole:latest\n  (Port 8080 HTTP)\n• guacamole/guacd:latest\n  (Port 4822 Daemon)\n• Module auth-json\n  (Extension AES-128)", ha='center', fontsize=7, color='#BF360C')

    # Oracle VirtualBox VMs
    c_vbox = patches.Rectangle((8.1, 1.0), 3.1, 3.4, fc='#E8F5E9', ec='#43A047', lw=1.2)
    ax.add_patch(c_vbox)
    ax.text(9.65, 4.1, "<<hypervisor>>\nOracle VirtualBox 7.x", ha='center', fontsize=8, fontweight='bold', color='#1B5E20')
    ax.text(9.65, 2.5, "• Golden Masters (VDI Base)\n• Linked Clones (.vbox)\n• Ports SSH NAT (2200+)\n• Ports VRDE RDP (3389+)\n• Lecteur ISO Cloud-Init", ha='center', fontsize=7, color='#1B5E20')

    # Liaisons réseau
    ax.annotate("", xy=(4.8, 6.0), xytext=(3.4, 6.0), arrowprops=dict(arrowstyle="<->", color='#0D47A1', lw=1.5))
    ax.text(4.1, 6.2, "HTTP/REST :8000", fontsize=7, color='#0D47A1', fontweight='bold', ha='center')

    ax.annotate("", xy=(8.1, 6.0), xytext=(3.4, 6.5), arrowprops=dict(arrowstyle="<->", color='#7B1FA2', lw=1.5))
    ax.text(5.5, 7.0, "HTTP :5173", fontsize=7, color='#7B1FA2', fontweight='bold')

    ax.annotate("", xy=(4.8, 3.0), xytext=(3.4, 5.0), arrowprops=dict(arrowstyle="<->", color='#E65100', lw=1.5))
    ax.text(3.6, 3.8, "HTTP/WS :8080\n(Guacamole Web)", fontsize=7, color='#E65100', fontweight='bold')

    # Liaison Guacamole -> VirtualBox
    ax.annotate("", xy=(8.1, 2.5), xytext=(7.9, 2.5), arrowprops=dict(arrowstyle="<->", color='#2E7D32', lw=2))
    ax.text(8.0, 2.7, "RDP/VRDE", fontsize=7.5, color='#2E7D32', fontweight='bold', ha='center')

    plt.tight_layout()
    plt.savefig("diagrams/figure7_deploiement_physique.png", bbox_inches='tight')
    plt.close()

if __name__ == "__main__":
    print("Génération de Figure 1...")
    gen_figure1()
    print("Génération de Figure 2...")
    gen_figure2()
    print("Génération de Figure 3...")
    gen_figure3()
    print("Génération de Figure 4...")
    gen_figure4()
    print("Génération de Figure 5...")
    gen_figure5()
    print("Génération de Figure 6...")
    gen_figure6()
    print("Génération de Figure 7...")
    gen_figure7()
    print("TOUS LES DIAGRAMMES ONT ÉTÉ GÉNÉRÉS AVEC SUCCÈS DANS diagrams/ !")

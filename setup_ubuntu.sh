#!/usr/bin/env bash
# =============================================================================
# setup_ubuntu.sh — Prépare l'environnement VirtualBox sur Ubuntu
# Exécuter en tant qu'utilisateur courant (pas root) :
#   chmod +x setup_ubuntu.sh && ./setup_ubuntu.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log_ok()   { echo -e "${GREEN}[OK]${NC}  $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_err()  { echo -e "${RED}[ERR]${NC}  $*"; }
log_info() { echo -e "      $*"; }

echo "=============================================="
echo "  PFA -- Setup VirtualBox sur Ubuntu"
echo "=============================================="
echo ""

# 1. Verifier VirtualBox
echo "Verification de VirtualBox..."
if command -v VBoxManage &>/dev/null; then
    VBOX_VERSION=$(VBoxManage --version)
    log_ok "VBoxManage trouve : $VBOX_VERSION"
else
    log_warn "VBoxManage introuvable. Installation en cours..."
    sudo apt-get update -qq
    sudo apt-get install -y virtualbox
    log_ok "VirtualBox installe."
fi

# 2. Creer les repertoires necessaires
echo ""
echo "Creation des repertoires VM..."
VM_BASE="/home/vms"
mkdir -p "$VM_BASE/vms"
mkdir -p "$VM_BASE/golden-masters"
mkdir -p "$VM_BASE/cloud-init-temp"
sudo chown -R "$USER:$USER" "$VM_BASE"
log_ok "Repertoires crees sous $VM_BASE"

# 3. Verifier le golden master Ubuntu
echo ""
echo "Verification du Golden Master 'ubuntu-24-master'..."
if VBoxManage showvminfo "ubuntu-24-master" --machinereadable &>/dev/null; then
    log_ok "Golden Master 'ubuntu-24-master' trouve dans VirtualBox."
else
    log_warn "Golden Master 'ubuntu-24-master' NON TROUVE dans VirtualBox."
    log_info "Creez une VM nommee 'ubuntu-24-master', installez Ubuntu 24.04,"
    log_info "puis prenez un snapshot nomme 'clean-template'."
fi

# 4. Installer genisoimage
echo ""
echo "Installation de genisoimage..."
sudo apt-get install -y genisoimage 2>/dev/null && log_ok "genisoimage installe." || log_warn "genisoimage non disponible (pycdlib sera utilise)."

# 5. Resume
echo ""
echo "=============================================="
echo "  Configuration .env recommandee pour Ubuntu :"
echo "=============================================="
echo "VBOXMANAGE_PATH=/usr/bin/VBoxManage"
echo "VM_BASE_DIR=/home/vms/vms"
echo "GOLDEN_MASTER_DIR=/home/vms/golden-masters"
echo "CLOUD_INIT_TEMP=/home/vms/cloud-init-temp"
echo "GOLDEN_MASTER_NAME=ubuntu-24-master"
echo "VM_START_TYPE=headless"
echo ""
log_ok "Setup termine. Relancez : uvicorn app.main:app --reload"

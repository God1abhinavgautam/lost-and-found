// ============ ADMIN CONFIGURATION ============
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfPk6GkibMvMqMMWdFPXNlr6zVjqOzAarAZVnj4CD6VfP7j-JyiptQ_bwpX7_HoAf_/exec';

let currentClaimData = null;
let currentItemData = null;

// ============ DASHBOARD ============
async function loadDashboard() {
    try {
        const itemsResp = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAdminItems' })
        });
        const itemsData = await itemsResp.json();
        
        const claimsResp = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAdminClaims', status: 'Pending' })
        });
        const claimsData = await claimsResp.json();

        const approvedResp = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getApprovedClaims' })
        });
        const approvedData = await approvedResp.json();

        const rejectedResp = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getRejectedClaims' })
        });
        const rejectedData = await rejectedResp.json();

        const lostCount = itemsData.items.filter(i => i.type === 'Lost').length;
        const foundCount = itemsData.items.filter(i => i.type === 'Found').length;
        const pendingCount = claimsData.claims.length;
        const approvedCount = approvedData.claims.length;
        const rejectedCount = rejectedData.claims.length;

        document.getElementById('lostCount').textContent = lostCount;
        document.getElementById('foundCount').textContent = foundCount;
        document.getElementById('pendingCount').textContent = pendingCount;
        document.getElementById('approvedCount').textContent = approvedCount;
        document.getElementById('rejectedCount').textContent = rejectedCount;
        document.getElementById('usersCount').textContent = lostCount + foundCount;

    } catch (error) {
        showAlert('Error loading dashboard: ' + error.message, 'error');
    }
}

// ============ CLAIMS MANAGEMENT ============
async function loadPendingClaims() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAdminClaims', status: 'Pending' })
        });
        const data = await response.json();
        displayAdminClaims(data.claims, 'pending');
    } catch (error) {
        showAlert('Error loading claims: ' + error.message, 'error');
    }
}

async function loadApprovedClaims() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getApprovedClaims' })
        });
        const data = await response.json();
        displayHistoryClaims(data.claims, 'approved');
    } catch (error) {
        showAlert('Error loading approved claims: ' + error.message, 'error');
    }
}

async function loadRejectedClaims() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getRejectedClaims' })
        });
        const data = await response.json();
        displayHistoryClaims(data.claims, 'rejected');
    } catch (error) {
        showAlert('Error loading rejected claims: ' + error.message, 'error');
    }
}

function displayAdminClaims(claims, type) {
    const tbody = document.getElementById('claimsTableBody');
    
    if (!claims || claims.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: #999;">No claims found</td></tr>';
        return;
    }

    tbody.innerHTML = claims.map(claim => `
        <tr>
            <td><strong>${escapeHtml(claim.itemName)}</strong></td>
            <td>${escapeHtml(claim.claimerName)}</td>
            <td>${escapeHtml(claim.claimerEmail)}<br>${claim.claimerPhone}</td>
            <td style="max-width: 200px; font-size: 12px; color: #666;">
                ${escapeHtml(claim.proofOfOwnership.substring(0, 50))}...
            </td>
            <td><span class="status-badge status-${claim.status.toLowerCase()}">${claim.status}</span></td>
            <td>
                ${type === 'pending' ? `
                    <button class="btn btn-sm btn-success" onclick="openApproveModal('${claim.id}', '${escapeHtml(claim.itemName)}')">Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="openRejectModal('${claim.id}', '${escapeHtml(claim.itemName)}')">Reject</button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function displayHistoryClaims(claims, type) {
    const tbody = document.getElementById('historyTableBody');
    
    if (!claims || claims.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #999;">No history found</td></tr>';
        return;
    }

    tbody.innerHTML = claims.map(claim => `
        <tr>
            <td><strong>${escapeHtml(claim.itemName)}</strong></td>
            <td>${escapeHtml(claim.claimerName)}</td>
            <td>${escapeHtml(claim.adminName)}</td>
            <td style="font-size: 12px; color: #666;">${escapeHtml(claim.notes || claim.reason || 'N/A')}</td>
            <td>${new Date(claim.dateApproved || claim.dateRejected).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// ============ MODALS ============
function openApproveModal(claimId, itemName) {
    currentClaimData = { claimId, itemName };
    document.getElementById('approveModalBody').innerHTML = `
        <p>Are you sure you want to approve this claim?</p>
        <p><strong>Item: ${escapeHtml(itemName)}</strong></p>
    `;
    document.getElementById('approveModal').classList.add('show');
}

function closeApproveModal() {
    document.getElementById('approveModal').classList.remove('show');
    currentClaimData = null;
}

async function confirmApprove() {
    if (!currentClaimData) return;
    
    const notes = document.getElementById('approveNotes').value;
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'approveClaim',
                claimId: currentClaimData.claimId,
                adminName: user.name,
                adminEmail: user.email,
                notes: notes
            })
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('Claim approved successfully!', 'success');
            closeApproveModal();
            loadDashboard();
            loadPendingClaims();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

function openRejectModal(claimId, itemName) {
    currentClaimData = { claimId, itemName };
    document.getElementById('rejectModalBody').innerHTML = `
        <p>Are you sure you want to reject this claim?</p>
        <p><strong>Item: ${escapeHtml(itemName)}</strong></p>
    `;
    document.getElementById('rejectModal').classList.add('show');
}

function closeRejectModal() {
    document.getElementById('rejectModal').classList.remove('show');
    currentClaimData = null;
}

async function confirmReject() {
    if (!currentClaimData) return;
    
    const reason = document.getElementById('rejectReason').value;
    if (!reason) {
        showAlert('Please provide a reason for rejection', 'error');
        return;
    }
    
    const user = JSON.parse(localStorage.getItem('user'));
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'rejectClaim',
                claimId: currentClaimData.claimId,
                adminName: user.name,
                adminEmail: user.email,
                reason: reason
            })
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('Claim rejected successfully!', 'success');
            closeRejectModal();
            loadDashboard();
            loadPendingClaims();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ============ ITEMS MANAGEMENT ============
async function loadAdminItems() {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getAdminItems' })
        });
        const data = await response.json();
        displayAdminItems(data.items);
    } catch (error) {
        showAlert('Error loading items: ' + error.message, 'error');
    }
}

function displayAdminItems(items) {
    const tbody = document.getElementById('itemsTableBody');
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: #999;">No items found</td></tr>';
        return;
    }

    tbody.innerHTML = items.map(item => `
        <tr>
            <td><code style="font-size: 11px;">${item.id}</code></td>
            <td><strong>${escapeHtml(item.itemName)}</strong></td>
            <td><span class="badge-${item.type === 'Lost' ? 'lost' : 'found'}">${item.type}</span></td>
            <td>${escapeHtml(item.category)}</td>
            <td style="font-size: 12px;">${escapeHtml(item.email)}</td>
            <td><span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span></td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openEditModal('${item.id}', '${escapeHtml(item.itemName)}', '${escapeHtml(item.category)}')">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAdminItem('${item.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterAdminItems() {
    const searchTerm = document.getElementById('itemSearchInput').value.toLowerCase();
    document.querySelectorAll('#itemsTableBody tr').forEach(row => {
        const itemName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
        row.style.display = itemName.includes(searchTerm) ? '' : 'none';
    });
}

function openEditModal(itemId, itemName, category) {
    currentItemData = { itemId };
    document.getElementById('editItemName').value = itemName;
    document.getElementById('editItemCategory').value = category;
    document.getElementById('editItemDescription').value = '';
    document.getElementById('editItemModal').classList.add('show');
}

function closeEditModal() {
    document.getElementById('editItemModal').classList.remove('show');
    currentItemData = null;
}

async function confirmEditItem() {
    if (!currentItemData) return;
    
    const itemName = document.getElementById('editItemName').value;
    const category = document.getElementById('editItemCategory').value;
    const description = document.getElementById('editItemDescription').value;
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'editItem',
                itemId: currentItemData.itemId,
                itemName: itemName,
                category: category,
                description: description
            })
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('Item updated successfully!', 'success');
            closeEditModal();
            loadAdminItems();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

async function deleteAdminItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deleteItem',
                itemId: itemId
            })
        });
        const data = await response.json();
        
        if (data.success) {
            showAlert('Item deleted successfully!', 'success');
            loadAdminItems();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ============ UTILITIES ============
function showAlert(message, type) {
    const container = document.getElementById('alertsContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
            if (tabName === 'claims') loadPendingClaims();
            if (tabName === 'items') loadAdminItems();
            if (tabName === 'history') loadApprovedClaims();
        });
    });
});

// ============ STUDENT FUNCTIONS ============

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwfPk6GkibMvMqMMWdFPXNlr6zVjqOzAarAZVnj4CD6VfP7j-JyiptQ_bwpX7_HoAf_/exec';
let imageDataStore = {};
let selectedItemForClaim = null;

// Setup Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset.tab) {
            btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
        }
    });

    // Image upload
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
    }

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterItems);
    }

    // Modal close on background click
    document.getElementById('itemModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'itemModal') closeModal();
    });

    document.getElementById('claimModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'claimModal') closeClaimModal();
    });
}

// ============ TAB SWITCHING ============
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
    }

    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (btn) {
        btn.classList.add('active');
    }

    // Reload data for certain tabs
    if (tabName === 'myclaims') {
        loadMyClaims();
    }
}

// ============ IMAGE UPLOAD HANDLER ============
function handleImageUpload(e) {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('imagePreview');

    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            const key = `image_${Date.now()}_${index}`;
            imageDataStore[key] = base64;

            const img = document.createElement('img');
            img.src = base64;
            img.className = 'preview-img';
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
}

// ============ REPORT ITEM ============
async function reportItem() {
    const type = document.getElementById('itemType').value;
    const category = document.getElementById('itemCategory').value;
    const name = document.getElementById('itemName').value.trim();
    const description = document.getElementById('itemDescription').value.trim();
    const date = document.getElementById('itemDate').value;
    const phone = document.getElementById('itemPhone').value.trim();

    // Validation
    if (!type || !category || !name || !description || !date || !phone) {
        showAlert('Please fill all required fields', 'error');
        return;
    }

    try {
        const images = Object.values(imageDataStore).slice(0, 5);

        const payload = {
            action: 'reportItem',
            type,
            category,
            itemName: name,
            description,
            date,
            phone,
            email: currentUser.email,
            images
        };

        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Item reported successfully!', 'success');
            resetReportForm();
            setTimeout(() => loadAllItems(), 1000);
        } else {
            showAlert(result.message || 'Error reporting item', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ============ LOAD ALL ITEMS ============
async function loadAllItems() {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getAllItems'
            })
        });

        const result = await response.json();
        displayItems(result.items || []);
    } catch (error) {
        showAlert('Error loading items', 'error');
    }
}

// ============ DISPLAY ITEMS ============
function displayItems(items) {
    const grid = document.getElementById('itemsGrid');

    if (!items || items.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1;">
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-title">No Items Found</div>
                    <p>Be the first to report a lost or found item!</p>
                </div>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(item => createItemCard(item)).join('');
}

// ============ CREATE ITEM CARD ============
function createItemCard(item) {
    const badge = item.type === 'Found' ? 'badge-found' : 'badge-lost';
    const typeLabel = item.type === 'Found' ? '✅ Found' : '❌ Lost';

    return `
        <div class="item-card">
            <div class="item-card-image">
                ${item.images && item.images.length > 0 
                    ? `<img src="${item.images}" alt="${item.itemName}">`
                    : `<div class="no-image">📦</div>`
                }
                <div class="item-type-badge ${badge}">${typeLabel}</div>
            </div>
            <div class="item-card-content">
                <h3 class="item-card-title">${escapeHtml(item.itemName)}</h3>
                <span class="item-card-category">${item.category}</span>
                <p class="item-card-description">${escapeHtml(item.description)}</p>
                <div class="item-card-meta">
                    <div class="meta-item">📅 ${item.dateReported || 'N/A'}</div>
                    <div class="meta-item">📞 ${item.phone || 'N/A'}</div>
                </div>
                <div class="item-card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewItemDetails('${item.id}')">
                        👁️ Details
                    </button>
                    <button class="btn btn-primary btn-sm" onclick="openClaimModal('${item.id}', '${escapeHtml(item.itemName)}')">
                        ⚖️ Claim
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============ VIEW ITEM DETAILS ============
async function viewItemDetails(itemId) {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getItemDetails',
                itemId
            })
        });

        const result = await response.json();
        const item = result.item;

        let imagesHtml = '';
        if (item.images && item.images.length > 0) {
            imagesHtml = `
                <div style="margin-bottom: 20px;">
                    <h4>📸 Images</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
                        ${item.images.map(img => `<img src="${img}" style="max-width: 100%; border-radius: 8px;">`).join('')}
                    </div>
                </div>
            `;
        }

        const modalBody = document.getElementById('itemModalBody');
        modalBody.innerHTML = `
            ${imagesHtml}
            <div>
                <h4>${item.itemName}</h4>
                <p><strong>Type:</strong> ${item.type}</p>
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Description:</strong> ${item.description}</p>
                <p><strong>Date:</strong> ${item.dateReported || 'N/A'}</p>
                <hr>
                <p><strong>📞 Contact:</strong> ${item.phone || 'N/A'}</p>
                <p><strong>📧 Email:</strong> <a href="mailto:${item.email}">${item.email}</a></p>
            </div>
            <button class="btn btn-primary" onclick="openClaimModal('${item.id}', '${escapeHtml(item.itemName)}'); closeModal();" style="width: 100%; margin-top: 20px;">
                ⚖️ Claim This Item
            </button>
        `;

        document.getElementById('itemModal').classList.add('show');
    } catch (error) {
        showAlert('Error loading details', 'error');
    }
}

function closeModal() {
    document.getElementById('itemModal').classList.remove('show');
}

// ============ CLAIM MODAL ============
function openClaimModal(itemId, itemName) {
    selectedItemForClaim = itemId;
    document.getElementById('modalItemName').value = itemName;
    document.getElementById('claimModal').classList.add('show');
    document.getElementById('claimerName').focus();
}

function closeClaimModal() {
    document.getElementById('claimModal').classList.remove('show');
}

// ============ SUBMIT CLAIM ============
async function submitClaim() {
    const name = document.getElementById('claimerName').value.trim();
    const email = document.getElementById('claimerEmail').value.trim();
    const phone = document.getElementById('claimerPhone').value.trim();
    const proof = document.getElementById('claimProof').value.trim();

    if (!name || !email || !phone || !proof) {
        showAlert('Please fill all fields', 'error');
        return;
    }

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'submitClaim',
                itemId: selectedItemForClaim,
                claimerName: name,
                claimerEmail: email,
                claimerPhone: phone,
                proofOfOwnership: proof
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Claim submitted! Admin will review soon.', 'success');
            closeClaimModal();
            resetClaimForm();
            setTimeout(() => loadMyClaims(), 1000);
        } else {
            showAlert(result.message || 'Error submitting claim', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ============ LOAD MY CLAIMS ============
async function loadMyClaims() {
    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getMyClaimsdetails',
                userEmail: currentUser.email
            })
        });

        const result = await response.json();
        displayMyClaims(result.claims || []);
    } catch (error) {
        showAlert('Error loading claims', 'error');
    }
}

// ============ DISPLAY MY CLAIMS ============
function displayMyClaims(claims) {
    const tbody = document.getElementById('myClaimsTableBody');

    if (!claims || claims.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    <div class="empty-state">
                        <p>No claims yet. <a href="#" onclick="switchTab('browse')">Browse items to claim</a></p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = claims.map(claim => `
        <tr>
            <td><strong>${claim.itemName}</strong></td>
            <td>${claim.category || 'N/A'}</td>
            <td><span class="status-badge status-${claim.status.toLowerCase()}">${claim.status}</span></td>
            <td>${claim.dateClaimed || 'N/A'}</td>
            <td>${claim.status === 'Pending' ? '<button class="btn btn-danger btn-sm" onclick="deleteClaim(\'' + claim.id + '\')">Delete</button>' : '-'}</td>
        </tr>
    `).join('');
}

// ============ DELETE CLAIM ============
async function deleteClaim(claimId) {
    if (!confirm('Are you sure you want to delete this claim?')) return;

    try {
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'deleteClaim',
                claimId
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Claim deleted', 'success');
            loadMyClaims();
        } else {
            showAlert(result.message || 'Error deleting claim', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// ============ FILTER ITEMS ============
function filterItems() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const typeFilter = document.getElementById('typeFilter')?.value || '';
    const categoryFilter = document.getElementById('categoryFilter')?.value || '';

    document.querySelectorAll('.item-card').forEach(card => {
        const title = card.querySelector('.item-card-title').textContent.toLowerCase();
        const category = card.querySelector('.item-card-category').textContent;
        const badge = card.querySelector('.item-type-badge').textContent;

        const matchesSearch = title.includes(searchTerm);
        const matchesType = !typeFilter || badge.includes(typeFilter);
        const matchesCategory = !categoryFilter || category.includes(categoryFilter);

        card.style.display = matchesSearch && matchesType && matchesCategory ? '' : 'none';
    });
}

// ============ UTILITY FUNCTIONS ============
function resetReportForm() {
    document.getElementById('itemType').value = '';
    document.getElementById('itemCategory').value = '';
    document.getElementById('itemName').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemDate').value = '';
    document.getElementById('itemPhone').value = '';
    document.getElementById('imageUpload').value = '';
    document.getElementById('imagePreview').innerHTML = '';
    imageDataStore = {};
}

function resetClaimForm() {
    document.getElementById('claimerName').value = '';
    document.getElementById('claimerEmail').value = '';
    document.getElementById('claimerPhone').value = '';
    document.getElementById('claimProof').value = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showAlert(message, type) {
    const container = document.getElementById('alertsContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    container.appendChild(alert);

    setTimeout(() => alert.remove(), 5000);
}

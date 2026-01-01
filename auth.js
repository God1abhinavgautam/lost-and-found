// ============ AUTHENTICATION SYSTEM ============

let currentUser = null;
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfPk6GkibMvMqMMWdFPXNlr6zVjqOzAarAZVnj4CD6VfP7j-JyiptQ_bwpX7_HoAf_/exec';

// Check if user is already logged in (from localStorage)
function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        initializeApp();
    }
}

// Signup Handler
async function handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const dept = document.getElementById('signupDept').value;
    const password = document.getElementById('signupPassword').value;

    if (!name || !email || !dept || !password) {
        showAlert('Please fill all fields', 'error');
        return;
    }

    if (password.length < 6) {
        showAlert('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'signup',
                name,
                email,
                department: dept,
                password: btoa(password) // Simple base64 encoding
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Account created! Please log in.', 'success');
            setTimeout(() => toggleAuthForm(), 1000);
        } else {
            showAlert(result.message || 'Signup failed', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Login Handler
async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAlert('Please enter email and password', 'error');
        return;
    }

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                email,
                password: btoa(password)
            })
        });

        const result = await response.json();

        if (result.success) {
            currentUser = result.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAlert('✅ Login successful!', 'success');
            setTimeout(() => initializeApp(), 500);
        } else {
            showAlert(result.message || 'Login failed', 'error');
        }
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
    }
}

// Toggle between login and signup forms
function toggleAuthForm() {
    document.getElementById('loginForm').style.display = 
        document.getElementById('loginForm').style.display === 'none' ? 'block' : 'none';
    document.getElementById('signupForm').style.display = 
        document.getElementById('signupForm').style.display === 'none' ? 'block' : 'none';
}

// Initialize app after login
function initializeApp() {
    document.getElementById('authModal').classList.remove('show');
    document.getElementById('mainApp').style.display = 'block';

    // Show admin tab if user is admin
    if (currentUser.role === 'Admin') {
        document.getElementById('adminNavBtn').style.display = 'block';
    }

    // Load initial data
    loadAllItems();
    loadMyClaims();
    setupEventListeners();
}

// Logout Handler
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        currentUser = null;
        localStorage.removeItem('currentUser');
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('authModal').classList.add('show');
        clearAllForms();
    }
}

// Clear all form data
function clearAllForms() {
    document.querySelectorAll('input, textarea, select').forEach(el => {
        if (el.type !== 'hidden') el.value = '';
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', checkAuthStatus);

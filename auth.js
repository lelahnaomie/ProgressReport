// Storage key constants
const REGISTERED_USERS_KEY = 'cpUsers';

// Hardcoded admin credentials
const ADMIN_EMAIL = 'admin@customerpull.com';
const ADMIN_PASSWORD = '12345admin';
const ADMIN_NAME = 'Admin';

// Generate a simple hash for role verification
function generateRoleToken(email, role) {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(7);
    const hash = btoa(`${email}:${role}:${timestamp}:${randomPart}`);
    return hash;
}

// Verify role token
function verifyRoleToken(email, role, token) {
    try {
        const decoded = atob(token);
        const parts = decoded.split(':');
        return parts[0] === email && parts[1] === role;
    } catch {
        return false;
    }
}

// Notification function
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
    };
    toast.innerHTML = `
        <i class="fas fa-${iconMap[type]}"></i>
        <span>${msg}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Toggle function between login and signup
function toggleAuth() {
    const login = document.getElementById('login-box');
    const signup = document.getElementById('signup-box');

    if (login.style.display === 'none') {
        login.style.display = 'block';
        signup.style.display = 'none';
    } else {
        login.style.display = 'none';
        signup.style.display = 'block';
    }
}

// Function to get registered users
function getRegisteredUsers() {
    try {
        const users = localStorage.getItem(REGISTERED_USERS_KEY);
        if (!users || users === 'null') {
            return [];
        }
        const parsed = JSON.parse(users);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Error reading users from localStorage:', error);
        return [];
    }
}

// Function to save users 
function saveRegisteredUsers(users) {
    try {
        if (!Array.isArray(users)) {
            console.error('saveRegisteredUsers: users must be an array');
            return;
        }
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
    } catch (error) {
        console.error('Error saving users to localStorage:', error);
    }
}

// Function to find user by email
function findByEmail(email) {
    try {
        const users = getRegisteredUsers();
        if (!Array.isArray(users)) {
            console.error('Users is not an array:', users);
            return null;
        }
        return users.find(user => user && user.email && user.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
        console.error('Error in findByEmail:', error);
        return null;
    }
}

// Loading state
function setLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Loading...`;
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
}

// Handle login function
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    setLoading(form, true);

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUser', JSON.stringify(result.user));

            showToast(`Welcome back, ${result.user.name}!`, 'success');

            setTimeout(() => {
                if (result.user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'employee-dashboard.html';
                }
            }, 1000);
        } else {
            showToast(result.error || 'Login failed', 'error');
            setLoading(form, false);
        }
    } catch (error) {
        console.error("Login error:", error);
        showToast('Server connection failed.', 'error');
        setLoading(form, false);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const form = e.target;

    setLoading(form, true);

    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        showToast('Please use a different email.', 'error');
        setLoading(form, false);
        return;
    }

    if (password.length < 6) {
        showToast('Password too short (minimum 6 characters).', 'error');
        setLoading(form, false);
        return;
    }

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password })
        });

        const result = await response.json();

        if (response.ok) {
            showToast(`Welcome ${name}! Please log in.`, 'success');

            setTimeout(() => {
                toggleAuth();
                setLoading(form, false);
            }, 1500);
        } else {
            showToast(result.error || 'Registration failed', 'error');
            setLoading(form, false);
        }

    } catch (error) {
        console.error("Connection error:", error);
        showToast('Could not connect to the server.', 'error');
        setLoading(form, false);
    }
}
// Verify user access 
function verifyAccess(requiredRole) {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userStr = localStorage.getItem('currentUser');
    const roleToken = localStorage.getItem('roleToken');

    if (isLoggedIn !== 'true' || !userStr || !roleToken) {
        window.location.href = 'index.html';
        return false;
    }

    try {
        const user = JSON.parse(userStr);

        // Verify role
        if (!verifyRoleToken(user.email, user.role, roleToken)) {
            localStorage.clear();
            window.location.href = 'index.html';
            return false;
        }
        //check users role
        if (user.role !== requiredRole) {
            showToast('Access denied.', 'error');
            setTimeout(() => {
                window.location.href = user.role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
            }, 1500);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Access verification failed:', error);
        localStorage.clear();
        window.location.href = 'index.html';
        return false;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userStr = localStorage.getItem('currentUser');
    const roleToken = localStorage.getItem('roleToken');

    if (isLoggedIn === 'true' && userStr && roleToken) {
        try {
            const user = JSON.parse(userStr);

            if (verifyRoleToken(user.email, user.role, roleToken)) {
                if (user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } else {
                    window.location.href = 'employee-dashboard.html';
                }
            } else {
                localStorage.clear();
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.clear();
        }
    }
});

// Logout function
function logout() {
    localStorage.clear();
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}


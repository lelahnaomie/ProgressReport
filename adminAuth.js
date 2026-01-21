// Storage key constants
const REGISTERED_USERS_KEY = 'cpUsers';

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

// Function to get registered users from localStorage
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

// Function to save users to localStorage
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

//loading state
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
function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    
    // Start Loading
    setLoading(form, true);

    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    const user = findByEmail(email);
    
    if (!user || user.password !== password) {
        showToast(!user ? 'Account not found.' : 'Incorrect password.', 'error');
        setLoading(form, false); 
        return;
    }

    // Set login state 
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify({
        email: user.email,
        name: user.name,
    }));

    showToast(`Welcome back ${user.name}!`, 'success');

    setTimeout(() => {
        window.location.href = 'admin-dashboard.html';
    }, 1500);
}

// Handle signup function
function handleSignup(e) {
    e.preventDefault();
    const form = e.target;

    setLoading(form, true);

    const name = form.querySelector('input[type="text"]').value;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;
    const role = form.querySelector('select[name="role"]').value;

    const existingUser = findByEmail(email);
    if (existingUser) {
        showToast('Account already exists.', 'error');
        setLoading(form, false); 
        setTimeout(() => toggleAuth(), 1000);
        return;
    }

    if (password.length < 6) {
        showToast('Password too short.', 'error');
        setLoading(form, false);
        return;
    }

    //
    const users = getRegisteredUsers();
    users.push({ name, email, password, role, dept: '', createdAt: new Date().toISOString() });
    saveRegisteredUsers(users);

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUser', JSON.stringify({ name, email, role, dept: '' }));

    showToast(`Welcome ${name}!`, 'success');

    setTimeout(() => {
        window.location.href = role === 'admin' ? 'admin-dashboard.html' : 'employee-dashboard.html';
    }, 1500);
}
// Check if user is already logged in on page load
window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userStr = localStorage.getItem('currentUser');
    
    if (isLoggedIn === 'true' && userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user.role) {
                if (user.role === 'admin') {
                    window.location.href = 'admin-dashboard.html';
                } 
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
        }
    }
});

// Debug function
function debugStorage() {
    console.log('All registered users:', getRegisteredUsers());
    console.log('Current user:', localStorage.getItem('currentUser'));
    console.log('Is logged in:', localStorage.getItem('isLoggedIn'));
}

// Expose debug function to window
window.debugStorage = debugStorage;
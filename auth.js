// notification function
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// toggle function between login and signup
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

// handle login function
function handleLogin(e) {
    e.preventDefault();
    
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const role = e.target.querySelector('select[name="role"]').value;
    
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loginTime', new Date().toISOString());
    
    const userData = {
        email: email,
        role: role,
        name: role === 'admin' ? 'admin user' : email.split('@')[0]
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    showToast(`welcome ${userData.name}!`, 'success');
    
    setTimeout(() => {
        if (role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'employee-dashboard.html';
        }
    }, 1000);
}

//  handlesignup
function handleSignup(e) {
    e.preventDefault();
    
    const name = e.target.querySelector('input[type="text"]').value;
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    const role = e.target.querySelector('select[name="role"]').value;
    

    const userData = {
        name: name,
        email: email,
        role: role
    };
    
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loginTime', new Date().toISOString());
    
    showToast(`welcome ${name}! account created successfully.`, 'success');
    
    
    setTimeout(() => {
        if (role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'employee-dashboard.html';
        }
    }, 1000);
}


window.addEventListener('DOMContentLoaded', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (isLoggedIn === 'true' && user.role) {
        if (user.role === 'admin') {
            window.location.href = 'admin-dashboard.html';
        } else {
            window.location.href = 'employee-dashboard.html';
        }
    }
});
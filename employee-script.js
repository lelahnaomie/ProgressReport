// employee dashboard
let allReports = [];
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
let currentReportId = null;

// loading data
document.addEventListener('DOMContentLoaded', () => {
    checkEmployee();
    updateUserHeader();
    loadData();
    setupEventListeners();
});

// chck user(employee)
function checkEmployee() {
    if (!currentUser || currentUser.role !== 'employee') {
        alert('Access denied. Employees only.');
        window.location.href = 'auth.html';
    }
}

// user profile header
function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername) {
        headerUsername.textContent = currentUser.name || 'Staff Member';
    }
}

// data management
function loadData() {
    const storedData = localStorage.getItem('cpReports');
    if (storedData) {
        allReports = JSON.parse(storedData);
        allReports.forEach(r => {
            r.submitDate = new Date(r.submitDate);
        });
    } else {
        allReports = [];
    }
    updateReportsTable();
}

function saveData() {
    localStorage.setItem('cpReports', JSON.stringify(allReports));
}

// form submission
function setupEventListeners() {
    const form = document.getElementById('submissionForm');
    if (form) {
        if (document.getElementById('staffName')) {
            document.getElementById('staffName').value = currentUser.name || '';
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const start = document.getElementById('startDate').value;
            const end = document.getElementById('endDate').value;
            const task = document.getElementById('taskContent').value;
            const dept = document.getElementById('staffDept').value;
            const name = document.getElementById('staffName').value;

        
            if (new Date(end) < new Date(start)) {
                return showToast('End date must be after start date!', 'error');
            }

        
            const newReport = {
                id: Date.now() + Math.random(),
                submitDate: new Date().toISOString(),
                name: name,
                dept: dept,
                start: start,
                end: end,
                task: task,
                status: 'Pending'
            };

            allReports.push(newReport);
            saveData();
            form.reset();
            
            showToast('Report submitted successfully!', 'success');
            loadData(); 
            showSection('my-reports-view', document.querySelector('[onclick*="my-reports-view"]'));
        });
    }
}

// updating ui table
function updateReportsTable() {
    const myReports = allReports.filter(r => r.name === currentUser.name);
    
    const tbody = document.getElementById('my-reports-rows');
    if (tbody) {
        if (myReports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">No reports submitted yet.</td></tr>';
        } else {
            const sorted = [...myReports].sort((a, b) => b.id - a.id);
            tbody.innerHTML = sorted.map(r => `
                <tr onclick="openReport(${r.id})">
                    <td>${new Date(r.submitDate).toLocaleDateString()}</td>
                    <td>${r.start} to ${r.end}</td>
                    <td class="task-cell">${r.task.substring(0, 30)}${r.task.length > 30 ? '...' : ''}</td>
                    <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
                    <td><button class="view-btn" style = 'border: none; background: none; cursor:pointer'><i class="fas fa-eye"></i> View</button></td>
                </tr>
            `).join('');
        }
    }

    // updating statistics
    updateCounter('myTotalReports', myReports.length);
    updateCounter('myApproved', myReports.filter(r => r.status === 'Approved').length);
    updateCounter('myPending', myReports.filter(r => r.status === 'Pending').length);
    updateCounter('myRejected', myReports.filter(r => r.status === 'Rejected').length);
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}
// navigation logic
function showSection(id, el) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    
    if (id === 'my-reports-view') loadData();
}

//handling logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'auth.html';
    }
}


function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


// modal 
function openReport(id) {
    currentReportId = id;
    const r = allReports.find(x => x.id == id);
    if (!r) return;

    document.getElementById('modal-name').textContent = r.name;
    document.getElementById('modal-dept').textContent = r.dept;
    document.getElementById('modal-dates').textContent = `${r.start} to ${r.end}`;
    document.getElementById('modal-status').innerHTML = `<span class="status-badge ${r.status.toLowerCase()}">${r.status}</span>`;
    document.getElementById('modal-task').textContent = r.task;
    
    document.getElementById('reportModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
}

// Close modal on click outside
window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
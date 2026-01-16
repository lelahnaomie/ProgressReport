// Global State
let allReports = [];
let allAssignTasks = []; 
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
let currentReportId = null;

// Pagination state
let currentPage = {
    reports: 1,
    tasks: 1
};
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    checkEmployee();
    updateUserHeader();
    loadData();
    setupEventListeners();
});

//check if user employee
function checkEmployee() {
    if (!currentUser || currentUser.role !== 'employee') {
        alert('Access denied. Employees only.');
        window.location.href = 'auth.html';
    }
}

function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername) {
        headerUsername.textContent = currentUser.name || 'Staff Member';
    }
}

// Data Management
function loadData() {
    const storedReports = localStorage.getItem('cpReports');
    if (storedReports) {
        allReports = JSON.parse(storedReports);
        allReports.forEach(r => r.submitDate = new Date(r.submitDate));
    } else {
        allReports = [];
    }

    const storedTasks = localStorage.getItem('cpAssignedTasks');
    if (storedTasks) {
        allAssignTasks = JSON.parse(storedTasks);
        allAssignTasks.forEach(t => t.submitDate = new Date(t.submitDate));
    } else {
        allAssignTasks = [];
    }

    updateReportsTable();
    updateTaskTable();
}

function saveData() {
    localStorage.setItem('cpReports', JSON.stringify(allReports));
}

function setupEventListeners() {
    const form = document.getElementById('submissionForm');
    if (form) {
        const nameField = document.getElementById('staffName');
        if (nameField) nameField.value = currentUser.name || '';

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const start = document.getElementById('startDate').value;
            const end = document.getElementById('endDate').value;
            const task = document.getElementById('taskContent').value;
            const dept = document.getElementById('staffDept').value;
            const name = nameField ? nameField.value : currentUser.name;

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

// UI Tables  
function updateReportsTable() {
    const myReports = allReports.filter(r => r.name === currentUser.name);
    const tbody = document.getElementById('my-reports-rows');
    
    if (tbody) {
        if (myReports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: #888;">No reports submitted yet.</td></tr>';
        } else {
            const sorted = [...myReports].sort((a, b) => b.id - a.id);
            
            // Pagination logic
            const totalPages = Math.ceil(sorted.length / itemsPerPage);
            const startIndex = (currentPage.reports - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const paginatedData = sorted.slice(startIndex, endIndex);

            tbody.innerHTML = paginatedData.map(r => `
                <tr onclick="openReport(${r.id})">
                    <td>${new Date(r.submitDate).toLocaleDateString()}</td>
                    <td>${r.start} to ${r.end}</td>
                    <td class="task-cell">${r.task.substring(0, 30)}${r.task.length > 30 ? '...' : ''}</td>
                    <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
                    <td><button class="view-btn" style='border: none; background: none; cursor:pointer'><i class="fas fa-eye"></i> View</button></td>
                </tr>
            `).join('');

            // Add pagination controls
            addPaginationControls('my-reports-rows', sorted.length, currentPage.reports, 'reports');
        }
    }

    // Update Statistics 
    updateCounter('myTotalReports', myReports.length);
    updateCounter('myApproved', myReports.filter(r => r.status === 'Approved').length);
    updateCounter('myPending', myReports.filter(r => r.status === 'Pending').length);
    updateCounter('myRejected', myReports.filter(r => r.status === 'Rejected').length);
}

function updateTaskTable() {
    const tbody = document.getElementById('task-row');
    if (!tbody) return;

    const myTasks = allAssignTasks.filter(t => t.assigneeName === currentUser.name);

    if (myTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">No tasks assigned to you yet.</td></tr>';
    } else {
        const sorted = [...myTasks].sort((a, b) => b.id - a.id);

        // Pagination logic
        const totalPages = Math.ceil(sorted.length / itemsPerPage);
        const startIndex = (currentPage.tasks - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = sorted.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedData.map(t => `
            <tr>
                <td>${new Date(t.submitDate).toLocaleDateString()}</td>
                <td>${t.assigneeName}</td>
                <td>${t.dept}</td>
                <td class="task-cell">${t.task}</td>
                <td><span class="status-badge ${t.status.toLowerCase()}">${t.status}</span></td>
                <td><button class="view-btn" onclick="openTaskModal(${t.id})" style='border: none; background: none; cursor:pointer'><i class="fas fa-eye"></i> View</button></td>
            </tr>
        `).join('');

        // Add pagination controls
        addPaginationControls('task-row', sorted.length, currentPage.tasks, 'tasks');
    }

    // Update task statistics
    updateCounter('totalTasks', myTasks.length);
}

function addPaginationControls(tableId, totalItems, currentPageNum, type) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const paginationRow = document.createElement('tr');
    const colspan = type === 'reports' ? '5' : '6';
    
    paginationRow.innerHTML = `
        <td colspan="${colspan}" style="text-align: center; padding: 20px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
                <button onclick="changePage('${type}', ${currentPageNum - 1})" 
                    ${currentPageNum === 1 ? 'disabled' : ''} 
                    style="padding: 8px 12px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <span style="font-weight: 600;">Page ${currentPageNum} of ${totalPages}</span>
                <button onclick="changePage('${type}', ${currentPageNum + 1})" 
                    ${currentPageNum === totalPages ? 'disabled' : ''} 
                    style="padding: 8px 12px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </td>
    `;
    tbody.appendChild(paginationRow);
}

function changePage(type, newPage) {
    const myReports = allReports.filter(r => r.name === currentUser.name);
    const myTasks = allAssignTasks.filter(t => t.assigneeName === currentUser.name);
    
    const totalPages = type === 'reports' 
        ? Math.ceil(myReports.length / itemsPerPage)
        : Math.ceil(myTasks.length / itemsPerPage);

    if (newPage < 1 || newPage > totalPages) return;

    currentPage[type] = newPage;
    
    if (type === 'reports') {
        updateReportsTable();
    } else if (type === 'tasks') {
        updateTaskTable();
    }
}

function updateCounter(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// navigation logic
function showSection(id, el) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    
    if (id === 'my-reports-view' || id === 'empAssign-view') loadData();
}

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
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
}

// notifications 
function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        window.location.href = 'auth.html';
    }
}

// Placeholder for task modal if needed
function openTaskModal(taskId) {
    const task = allAssignTasks.find(t => t.id === taskId);
    if (!task) return;
    
    // You can implement a task modal similar to report modal if needed
    alert(`Task: ${task.task}\nStatus: ${task.status}\nDue: ${task.dueDate}`);
}

window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
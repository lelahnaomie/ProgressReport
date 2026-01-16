// admin dashboard script
let allReports = [];
let currentFilter = 'all';
let currentReportId = null;
let charts = {};
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let allAssignTasks = [];rentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

document.addEventListener('DOMContentLoaded', () => {
    checkAdmin();
    updateUserHeader();
    loadData();
    setupTaskForm();
    initCharts(); 
});

function checkAdmin() {
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'auth.html';
    }
}

function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername) {
        headerUsername.textContent = currentUser.name || 'administrator';
    }
}

function loadData() {
    const storedReports = localStorage.getItem('cpReports');
    allReports = storedReports ? JSON.parse(storedReports) : [];

    const storedTasks = localStorage.getItem('cpAssignedTasks');
    allAssignTasks = storedTasks ? JSON.parse(storedTasks) : [];

    updateAdminTables();
    updateStats();
    if (window.myChart) updateCharts();
}

function saveTasks() {
    localStorage.setItem('cpAssignedTasks', JSON.stringify(allAssignTasks));
}

function saveReports() {
    localStorage.setItem('cpReports', JSON.stringify(allReports));
}

function setupTaskForm() {
    const form = document.getElementById('assignForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const newTask = {
            id: Date.now() + Math.random(),
            submitDate: new Date().toISOString(),
            assigneeName: document.getElementById('assignName').value, 
            dept: document.getElementById('assignDept').value,
            assignedDate: document.getElementById('assignedDate').value,
            dueDate: document.getElementById('dueDate').value,
            task: document.getElementById('assignTask').value,
            status: 'Pending'
        };

        allAssignTasks.push(newTask);
        saveTasks();
        form.reset();
        showToast('task assigned successfully!', 'success');
        loadData();
    });
}

function updateAdminTables() {
    const reportBody = document.getElementById('report-rows');
    if (reportBody) {
        if (allReports.length === 0) {
            reportBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">no reports received.</td></tr>';
        } else {
            const sorted = [...allReports].sort((a, b) => b.id - a.id);
            reportBody.innerHTML = sorted.map(r => `
                <tr>
                    <td>${r.name}</td>
                    <td>${r.dept}</td>
                    <td>${r.start} to ${r.end}</td>
                    <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
                    <td>
                        <button class="action-btn approve" onclick="updateReportStatus(${r.id}, 'Approved')">approve</button>
                        <button class="action-btn reject" onclick="updateReportStatus(${r.id}, 'Rejected')">reject</button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

function updateReportStatus(id, newStatus) {
    const index = allReports.findIndex(r => r.id == id);
    if (index !== -1) {
        allReports[index].status = newStatus;
        saveReports();
        loadData();
        showToast(`report ${newStatus.toLowerCase()}!`, 'success');
    }
}

function updateStats() {
    const totalReportsEl = document.getElementById('totalReports');
    const totalTasksEl = document.getElementById('totalTasks');
    if (totalReportsEl) totalReportsEl.textContent = allReports.length;
    if (totalTasksEl) totalTasksEl.textContent = allAssignTasks.length;
}

function initCharts() {
    const ctx = document.getElementById('adminAnalyticsChart');
    if (!ctx) return;

    window.myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['approved', 'pending', 'rejected'],
            datasets: [{
                label: 'report status overview',
                data: [0, 0, 0],
                backgroundColor: ['#2ecc71', '#f1c40f', '#e74c3c']
            }]
        },
        options: { responsive: true }
    });
    updateCharts();
}

function updateCharts() {
    if (!window.myChart) return;
    const approved = allReports.filter(r => r.status === 'Approved').length;
    const pending = allReports.filter(r => r.status === 'Pending').length;
    const rejected = allReports.filter(r => r.status === 'Rejected').length;

    window.myChart.data.datasets[0].data = [approved, pending, rejected];
    window.myChart.update();
}

function showSection(id, el) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-message">${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function handleLogout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'auth.html';
}

// admin dashboard script
let allReports = [];
let currentFilter = 'all';
let currentReportId = null;
let charts = {};
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let allAssignTasks = [];

// Pagination state
let currentPage = {
    reports: 1,
    leaderboard: 1
};
const itemsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
    checkAdmin();
    updateUserHeader();
    loadData();
    setupTaskForm();
    initCharts(); 
});

// check if user is admin
function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== 'admin') {
        alert('access denied. admin only.');
        window.location.href = 'auth.html';
    }
}

//user profile header
function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername && currentUser) {
        headerUsername.textContent = currentUser.name || 'Employee User';
    }
}

// data management
function loadData() {
    if (localStorage.getItem('cpReports')) {
        allReports = JSON.parse(localStorage.getItem('cpReports'));
        allReports.forEach(r => r.submitDate = new Date(r.submitDate));
    } else {
        allReports = [];
    }

    if (localStorage.getItem('cpAssignedTasks')) {
        allAssignTasks = JSON.parse(localStorage.getItem('cpAssignedTasks'));
        allAssignTasks.forEach(t => t.submitDate = new Date(t.submitDate));
    }
    else{
        allAssignTasks = [];
    }
    updateUI();
}

function saveData() {
    localStorage.setItem('cpReports', JSON.stringify(allReports));
    localStorage.setItem('cpAssignedTasks', JSON.stringify(allAssignTasks));
}

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const iconMap = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    toast.innerHTML = `
        <i class="fas fa-${iconMap[type]}"></i>
        <span class="toast-message">${msg}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// navigation logic
function showSection(id, el) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    
    if (id === 'team-view') updateTeam();
}

// handle logout
function handleLogout() {
    if (confirm('are you sure you want to logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('currentUser');
        showToast('logged out successfully', 'success');
        window.location.href = 'auth.html';
    }
}

function addReport(name, dept, start, end, task, silent = false) {
    allReports.push({
        id: Date.now() + Math.random(),
        submitDate: new Date(),
        name,
        dept,
        start,
        end,
        task,
        status: 'Pending'
    });
    saveData();
    updateUI();
    if (!silent) showToast('report submitted successfully!', 'success');
}

function setupTaskForm() {
    const assignform = document.getElementById('assignForm');
    if (!assignform) return;

    assignform.addEventListener('submit', (e) => {
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
        saveData();
        assignform.reset();
        
        showToast('task assigned successfully!', 'success');
        updateUI();
    });
}

// filtering functions
function filterByTime(type) {
    currentFilter = type;
    currentPage.reports = 1;
    document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`filter-${type}`);
    if (btn) btn.classList.add('active');
    
    updateUI();
}

// updating statistics
function updateStats() {
    const totalEl = document.getElementById('totalReports');
    const pendingEl = document.getElementById('pendingReports');
    const totalTasksEl = document.getElementById('totalTasks');
    const activeEl = document.getElementById('activeEmployees');
    const weekEl = document.getElementById('thisWeek');
    
    if (totalEl) totalEl.textContent = allReports.length;
    if (pendingEl) pendingEl.textContent = allReports.filter(r => r.status === 'Pending').length;
    if (totalTasksEl) totalTasksEl.textContent = allAssignTasks.length;
    if (activeEl) activeEl.textContent = new Set(allReports.map(r => r.name)).size;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (weekEl) weekEl.textContent = allReports.filter(r => r.submitDate >= weekAgo).length;
}

function searchReports() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    currentPage.reports = 1; // Reset to first page when searching
    const filtered = getFiltered().filter(r =>
        r.name.toLowerCase().includes(term) || 
        r.dept.toLowerCase().includes(term) ||
        r.task.toLowerCase().includes(term)
    );
    updateTable(filtered);
}

function getFiltered() {
    if (currentFilter === 'all') return allReports;
    
    const now = new Date();
    
    if (currentFilter === 'daily') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return allReports.filter(r => {
            const reportDate = new Date(r.submitDate);
            reportDate.setHours(0, 0, 0, 0);
            return reportDate.getTime() === today.getTime();
        });
    }
    
    if (currentFilter === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return allReports.filter(r => r.submitDate >= weekAgo);
    }
    
    if (currentFilter === 'monthly') {
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return allReports.filter(r => r.submitDate >= monthAgo);
    }
    
    return allReports;
}

// ui update functions
function updateUI() {
    const filtered = getFiltered();
    updateStats();
    updateTable(filtered);
    updateCharts(filtered);
}

function updateTable(data) {
    const tbody = document.getElementById('report-rows');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);">no reports found</td></tr>';
        return;
    }

    // Pagination logic
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage.reports - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedData.map(r => `
        <tr onclick="openReport(${r.id})">
            <td>${r.submitDate.toLocaleDateString()}</td>
            <td>${r.name}</td>
            <td>${r.dept}</td>
            <td>${r.start} to ${r.end}</td>
            <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
            <td><i class="fas fa-eye"></i></td>
        </tr>
    `).join('');

    // Add pagination controls
    addPaginationControls('report-rows', data.length, currentPage.reports, 'reports');
    addPaginationControls('-rows', data.length, currentPage.reports, 'reports');

}

function addPaginationControls(tableId, totalItems, currentPageNum, type) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const paginationRow = document.createElement('tr');
    paginationRow.innerHTML = `
        <td colspan="6" style="text-align: center; padding: 20px;">
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
    const totalPages = type === 'reports' 
        ? Math.ceil(getFiltered().length / itemsPerPage)
        : Math.ceil(Object.keys(getTeamStats()).length / itemsPerPage);

    if (newPage < 1 || newPage > totalPages) return;

    currentPage[type] = newPage;
    
    if (type === 'reports') {
        const filtered = getFiltered();
        updateTable(filtered);
    } else if (type === 'leaderboard') {
        updateTeam();
    }
}

// chart initialization
function initCharts() {
    const deptCanvas = document.getElementById('deptChart');
    if (deptCanvas) {
        const deptCtx = deptCanvas.getContext('2d');
        charts.dept = new Chart(deptCtx, {
            type: 'doughnut',
            data: {
                labels: ['Development', 'Marketing', 'Design', 'Operations Management'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: ['#149648', '#fcd41d', '#3498db', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const statusCanvas = document.getElementById('statusChart');
    if (statusCanvas) {
        const statusCtx = statusCanvas.getContext('2d');
        charts.status = new Chart(statusCtx, {
            type: 'pie',
            data: {
                labels: ['Approved', 'Pending', 'Rejected'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    const timelineCanvas = document.getElementById('timelineChart');
    if (timelineCanvas) {
        const timelineCtx = timelineCanvas.getContext('2d');
        charts.timeline = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Reports',
                    data: [],
                    borderColor: '#149648',
                    backgroundColor: 'rgba(20, 150, 72, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }
}

// chart update function
function updateCharts(data) {
    if (charts.dept) {
        const deptCounts = ['Development', 'Marketing', 'Design', 'Operations Management'].map(d => 
            data.filter(r => r.dept === d).length
        );
        charts.dept.data.datasets[0].data = deptCounts;
        charts.dept.update();
    }

    if (charts.status) {
        const statusCounts = ['Approved', 'Pending', 'Rejected'].map(s => 
            allReports.filter(r => r.status === s).length
        );
        charts.status.data.datasets[0].data = statusCounts;
        charts.status.update();
    }

    if (charts.timeline) {
        const days = [];
        const counts = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            counts.push(allReports.filter(r => {
                const reportDate = new Date(r.submitDate);
                return reportDate.toDateString() === d.toDateString();
            }).length);
        }
        charts.timeline.data.labels = days;
        charts.timeline.data.datasets[0].data = counts;
        charts.timeline.update();
    }
}

// team view functions
function getTeamStats() {
    const stats = {};
    allReports.forEach(r => {
        if (!stats[r.name]) stats[r.name] = { total: 0, approved: 0, dept: r.dept };
        stats[r.name].total++;
        if (r.status === 'Approved') stats[r.name].approved++;
    });
    return stats;
}

function updateTeam() {
    const stats = getTeamStats();

    let topName = '-', maxReports = 0;
    Object.keys(stats).forEach(name => {
        if (stats[name].total > maxReports) {
            maxReports = stats[name].total;
            topName = name;
        }
    });
    const topPerf = document.getElementById('topPerformer');
    if (topPerf) topPerf.textContent = topName;

    const empCount = Object.keys(stats).length;
    const avgEl = document.getElementById('avgReports');
    if (avgEl) avgEl.textContent = empCount > 0 ? (allReports.length / empCount).toFixed(1) : 0;

    const deptCounts = {};
    allReports.forEach(r => deptCounts[r.dept] = (deptCounts[r.dept] || 0) + 1);
    let topDept = '-', maxDept = 0;
    Object.keys(deptCounts).forEach(d => {
        if (deptCounts[d] > maxDept) {
            maxDept = deptCounts[d];
            topDept = d;
        }
    });
    const topDeptEl = document.getElementById('topDept');
    if (topDeptEl) topDeptEl.textContent = topDept;

    const board = Object.keys(stats).map(name => ({ name, ...stats[name] })).sort((a, b) => b.total - a.total);
    const tbody = document.getElementById('leaderboard-rows');
    if (!tbody) return;

    const totalPages = Math.ceil(board.length / itemsPerPage);
    const startIndex = (currentPage.leaderboard - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedBoard = board.slice(startIndex, endIndex);
    
    tbody.innerHTML = paginatedBoard.map((emp, i) => {
        const actualRank = startIndex + i + 1;
        const perf = emp.total > 0 ? ((emp.approved / emp.total) * 100).toFixed(0) : 0;
        return `
            <tr>
                <td>${actualRank}</td>
                <td>${emp.name}</td>
                <td>${emp.dept}</td>
                <td>${emp.total}</td>
                <td>${emp.approved}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="flex: 1; background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="width: ${perf}%; background: #149648; height: 100%; transition: width 0.3s ease;"></div>
                        </div>
                        <span style="min-width: 40px; font-weight: 600;">${perf}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    addPaginationControls('leaderboard-rows', board.length, currentPage.leaderboard, 'leaderboard');
}

// modal functions
function openReport(id) {
    currentReportId = id;
    const r = allReports.find(x => x.id === id);
    if (!r) return;

    document.getElementById('modal-name').textContent = r.name;
    document.getElementById('modal-dept').textContent = r.dept;
    document.getElementById('modal-dates').textContent = `${r.start} to ${r.end}`;
    document.getElementById('modal-status').innerHTML = `<span class="status-badge ${r.status.toLowerCase()}">${r.status}</span>`;
    document.getElementById('modal-task').textContent = r.task;
    
    const modalActions = document.getElementById('modal-actions');
    if (modalActions) {
        modalActions.style.display = r.status !== 'Pending' ? 'none' : 'flex';
    }
    
    document.getElementById('reportModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function approveReport() {
    const report = allReports.find(r => r.id === currentReportId);
    if (report) {
        report.status = 'Approved';
        saveData();
        updateUI();
        closeModal();
        showToast('report approved successfully!', 'success');
    }
}

function rejectReport() {
    if (confirm('are you sure you want to reject this report?')) {
        const report = allReports.find(r => r.id === currentReportId);
        if (report) {
            report.status = 'Rejected';
            saveData();
            updateUI();
            closeModal();
            showToast('report rejected', 'error');
        }
    }
}

// export functions
function exportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("customerpull report", 14, 20);

    doc.setFontSize(12);
    doc.text(`generated: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`total reports: ${allReports.length}`, 14, 37);
    doc.text(`pending: ${allReports.filter(r => r.status === 'Pending').length}`, 14, 44);

    const data = allReports.map(r => [
        r.submitDate.toLocaleDateString(),
        r.name,
        r.dept,
        r.status,
    ]);

    doc.autoTable({
        head: [['date', 'employee', 'department', 'status']],
        body: data,
        startY: 50,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [20, 150, 72] }
    });

    doc.save("customerpull-report.pdf");
    showToast('pdf exported successfully!', 'success');
}

function exportExcel() {
    const data = allReports.map(r => ({
        Date: r.submitDate.toLocaleDateString(),
        Employee: r.name,
        Department: r.dept,
        'Start Date': r.start,
        'End Date': r.end,
        Status: r.status,
        Task: r.task
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "customerpull-reports.xlsx");
    showToast('excel exported successfully!', 'success');
}

// settings
function saveSettings() {
    const name = document.getElementById('adminName').value;
    const email = document.getElementById('adminEmail').value;
    const dept = document.getElementById('adminDept').value;
    const notif = document.getElementById('notifPref').value;

    localStorage.setItem('adminSettings', JSON.stringify({ name, email, dept, notif }));
    showToast('settings saved successfully!', 'success');
}

function clearAllData() {
    if (confirm('are you sure you want to clear all data? this action cannot be undone!')) {
        localStorage.removeItem('cpReports');
        localStorage.removeItem('cpAssignedTasks');
        allReports = [];
        allAssignTasks = [];
        updateUI();
        showToast('all data cleared!', 'warning');
    }
}

// closing modal
window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
// global state
let allReports = [];
let currentFilter = 'all';
let currentReportId = null;
let charts = {};
let userRole = 'admin'; // 'admin' or 'employee'
let currentUser = null;

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

// check user role and setup ui based on role
function checkUserRole() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{"name": "Admin", "role": "admin"}');
    currentUser = user;
    userRole = user.role || 'admin';
    
    // hide/show sections based on role
    if (userRole === 'employee') {
        // hide admin-only sections
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        // show employee sections
        document.querySelectorAll('.employee-only').forEach(el => el.style.display = 'block');
        // set first visible nav item as active
        const firstNav = document.querySelector('.nav-item:not(.admin-only)');
        if (firstNav) {
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            firstNav.classList.add('active');
            showSection('submit-view', firstNav);
        }
    } else {
        // show admin sections
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
        // hide employee-only sections
        document.querySelectorAll('.employee-only').forEach(el => el.style.display = 'none');
    }
}

// navigation logic
function showSection(id, el) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    
    if (id === 'team-view') updateTeam();
    if (id === 'my-reports-view') updateMyReports();
}

// handle logout
function handleLogout() {
    if (confirm('are you sure you want to logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        showToast('logged out successfully', 'success');
        window.location.href = 'index.html';
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
    updateUI();
}

function saveData() {
    localStorage.setItem('cpReports', JSON.stringify(allReports));
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

// form submission
document.addEventListener('DOMContentLoaded', () => {
    checkUserRole();
    loadData();
    
    const form = document.getElementById('submissionForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('staffName').value;
            const dept = document.getElementById('staffDept').value;
            const start = document.getElementById('startDate').value;
            const end = document.getElementById('endDate').value;
            const task = document.getElementById('taskContent').value;

            if (new Date(end) < new Date(start)) {
                return showToast('end date must be after start date!', 'error');
            }

            addReport(name, dept, start, end, task);
            form.reset();
            
            // redirect based on role
            if (userRole === 'employee') {
                showSection('my-reports-view', document.querySelector('.nav-item[onclick*="my-reports"]'));
            } else {
                showSection('analytics-view', document.querySelector('.nav-item'));
            }
        });
    }
    
    initCharts();
    setupCustomDateFilter();
});

// filtering functions
function filterByTime(type) {
    currentFilter = type;
    document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`filter-${type}`);
    if (btn) btn.classList.add('active');
    
    // hide custom date inputs when switching to preset filters
    const customDateDiv = document.getElementById('customDateFilter');
    if (customDateDiv) {
        customDateDiv.style.display = 'none';
    }
    
    updateUI();
}

function setupCustomDateFilter() {
    const customBtn = document.getElementById('filter-custom');
    if (customBtn) {
        customBtn.addEventListener('click', () => {
            currentFilter = 'custom';
            document.querySelectorAll('.filter-bar button').forEach(b => b.classList.remove('active'));
            customBtn.classList.add('active');
            
            const customDateDiv = document.getElementById('customDateFilter');
            if (customDateDiv) {
                customDateDiv.style.display = 'flex';
            }
        });
    }
}

function applyCustomDateFilter() {
    const startInput = document.getElementById('filterStartDate').value;
    const endInput = document.getElementById('filterEndDate').value;
    
    if (!startInput || !endInput) {
        showToast('please select both start and end dates', 'error');
        return;
    }
    
    const start = new Date(startInput);
    const end = new Date(endInput);
    end.setHours(23, 59, 59, 999);
    
    if (end < start) {
        showToast('end date must be after start date', 'error');
        return;
    }
    
    currentFilter = 'custom';
    updateUI();
    showToast(`showing reports from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 'info');
}

function updateStats(data) {
    const totalEl = document.getElementById('totalReports');
    const pendingEl = document.getElementById('pendingReports');
    const activeEl = document.getElementById('activeEmployees');
    const weekEl = document.getElementById('thisWeek');
    
    if (totalEl) totalEl.textContent = allReports.length;
    if (pendingEl) pendingEl.textContent = allReports.filter(r => r.status === 'Pending').length;
    if (activeEl) activeEl.textContent = new Set(allReports.map(r => r.name)).size;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (weekEl) weekEl.textContent = allReports.filter(r => r.submitDate >= weekAgo).length;
}

function searchReports() {
    const term = document.getElementById('searchInput').value.toLowerCase();
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
    
    if (currentFilter === 'custom') {
        const startInput = document.getElementById('filterStartDate')?.value;
        const endInput = document.getElementById('filterEndDate')?.value;
        
        if (!startInput || !endInput) return allReports;
        
        const start = new Date(startInput);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endInput);
        end.setHours(23, 59, 59, 999);
        
        return allReports.filter(r => {
            const reportDate = new Date(r.submitDate);
            return reportDate >= start && reportDate <= end;
        });
    }
    
    return allReports;
}

// ui update functions
function updateUI() {
    const filtered = getFiltered();
    updateStats(filtered);
    updateTable(filtered);
    updateCharts(filtered);
    if (userRole === 'employee') {
        updateMyReports();
    }
}

function updateTable(data) {
    const tbody = document.getElementById('report-rows');
    if (!tbody) return;
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);">no reports found</td></tr>';
        return;
    }
    tbody.innerHTML = data.map(r => `
        <tr onclick="openReport(${r.id})">
            <td>${r.submitDate.toLocaleDateString()}</td>
            <td>${r.name}</td>
            <td>${r.dept}</td>
            <td>${r.start} to ${r.end}</td>
            <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
            <td><i class="fas fa-eye"></i></td>
        </tr>
    `).join('');
}

// employee my reports view - shows only their reports
function updateMyReports() {
    if (!currentUser || !currentUser.name) return;
    
    const myReports = allReports.filter(r => r.name === currentUser.name);
    const tbody = document.getElementById('my-reports-rows');
    
    if (!tbody) return;
    
    if (myReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-light);">you haven\'t submitted any reports yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = myReports.map(r => `
        <tr onclick="openReport(${r.id})">
            <td>${r.submitDate.toLocaleDateString()}</td>
            <td>${r.start} to ${r.end}</td>
            <td>${r.task.substring(0, 100)}${r.task.length > 100 ? '...' : ''}</td>
            <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
            <td><i class="fas fa-eye"></i></td>
        </tr>
    `).join('');
    
    // update employee stats
    const approved = myReports.filter(r => r.status === 'Approved').length;
    const pending = myReports.filter(r => r.status === 'Pending').length;
    const rejected = myReports.filter(r => r.status === 'Rejected').length;
    
    const totalEl = document.getElementById('myTotalReports');
    const approvedEl = document.getElementById('myApproved');
    const pendingEl = document.getElementById('myPending');
    const rejectedEl = document.getElementById('myRejected');
    
    if (totalEl) totalEl.textContent = myReports.length;
    if (approvedEl) approvedEl.textContent = approved;
    if (pendingEl) pendingEl.textContent = pending;
    if (rejectedEl) rejectedEl.textContent = rejected;
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
    // department chart
    if (charts.dept) {
        const deptCounts = ['Development', 'Marketing', 'Design', 'Operations Management'].map(d => 
            data.filter(r => r.dept === d).length
        );
        charts.dept.data.datasets[0].data = deptCounts;
        charts.dept.update();
    }

    // status chart
    if (charts.status) {
        const statusCounts = ['Approved', 'Pending', 'Rejected'].map(s => 
            allReports.filter(r => r.status === s).length
        );
        charts.status.data.datasets[0].data = statusCounts;
        charts.status.update();
    }

    // timeline chart
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

// team view functions (admin only)
function updateTeam() {
    const stats = {};
    allReports.forEach(r => {
        if (!stats[r.name]) stats[r.name] = { total: 0, approved: 0, dept: r.dept };
        stats[r.name].total++;
        if (r.status === 'Approved') stats[r.name].approved++;
    });

    // top performer
    let topName = '-', maxReports = 0;
    Object.keys(stats).forEach(name => {
        if (stats[name].total > maxReports) {
            maxReports = stats[name].total;
            topName = name;
        }
    });
    const topPerf = document.getElementById('topPerformer');
    if (topPerf) topPerf.textContent = topName;

    // average reports
    const empCount = Object.keys(stats).length;
    const avgEl = document.getElementById('avgReports');
    if (avgEl) avgEl.textContent = empCount > 0 ? (allReports.length / empCount).toFixed(1) : 0;

    // top department
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

    // leaderboard
    const board = Object.keys(stats).map(name => ({ name, ...stats[name] })).sort((a, b) => b.total - a.total);
    const tbody = document.getElementById('leaderboard-rows');
    if (!tbody) return;
    
    tbody.innerHTML = board.map((emp, i) => {
        const perf = emp.total > 0 ? ((emp.approved / emp.total) * 100).toFixed(0) : 0;
        return `
            <tr>
                <td>${i + 1}</td>
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
    
    // only admins can approve/reject, and only if status is pending
    const modalActions = document.getElementById('modal-actions');
    if (modalActions) {
        modalActions.style.display = (r.status !== 'Pending' || userRole === 'employee') ? 'none' : 'flex';
    }
    
    document.getElementById('reportModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
}

function approveReport() {
    if (userRole !== 'admin') {
        showToast('only admins can approve reports', 'error');
        return;
    }
    
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
    if (userRole !== 'admin') {
        showToast('only admins can reject reports', 'error');
        return;
    }
    
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

// export functions (admin only)
function exportPDF() {
    if (userRole !== 'admin') {
        showToast('only admins can export reports', 'error');
        return;
    }
    
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
    if (userRole !== 'admin') {
        showToast('only admins can export reports', 'error');
        return;
    }
    
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
    if (userRole !== 'admin') {
        showToast('only admins can clear data', 'error');
        return;
    }
    
    if (confirm('are you sure you want to clear all data? this action cannot be undone!')) {
        localStorage.removeItem('cpReports');
        allReports = [];
        updateUI();
        showToast('all data cleared!', 'warning');
    }
}

// closing modal
window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
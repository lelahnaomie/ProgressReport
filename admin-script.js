// admin dashboard script
let allReports = [];
let currentFilter = 'all';
let currentReportId = null;
let currentTaskId = null;
let charts = {};
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let allAssignTasks = [];
let allUsers = [];
let validEmployees = [];

let currentPage = {
    reports: 1,
    leaderboard: 1,
    tasks: 1
};
const itemsPerPage = 5;

function setLoading(isLoading, btn, customText = "Loading...") {
    const globalSpinner = document.getElementById('loading-spinner');


    if (globalSpinner) {
        if (isLoading) globalSpinner.classList.remove('hidden');
        else globalSpinner.classList.add('hidden');
    }

    if (btn) {
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
            // Store original text so we don't lose it
            if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${customText}`;
        } else {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
            delete btn.dataset.originalText;
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    checkAdmin();
    updateUserHeader();
    loadUsers();
    loadData();
    setupTaskForm();
    initCharts();
});

// check if user is admin
function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== 'admin') {
        window.location.href = 'index.html';
    }
}

//user profile header
function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername && currentUser) {
        headerUsername.textContent = currentUser.name || 'Admin';
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    sidebar.classList.toggle('show');

    if (!overlay) {
        const newOverlay = document.createElement('div');
        newOverlay.className = 'sidebar-overlay';
        document.body.appendChild(newOverlay);
        newOverlay.addEventListener('click', toggleSidebar);
        newOverlay.classList.add('show');
    } else {
        overlay.classList.toggle('show');
    }
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    });
});

// Toggle dropdown menu
function toggleDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
window.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    checkAdmin();
    updateUserHeader();
    loadData();
    setupEventListeners();
});


// Load all registered users
function loadUsers() {
    const users = localStorage.getItem('cpUsers');
    if (users) {
        allUsers = JSON.parse(users);
    } else {
        allUsers = [];
    }
}

// Get list of employee names for validation
function getEmployeeNames() {
    return allUsers.filter(u => u.role === 'employee').map(u => u.name);
}

// Toggle dropdown menu
function toggleDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
window.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

// data management
async function loadData() {
    setLoading(true);
    try {
        // 1. Fetch Reports from Turso
        const reportRes = await fetch('/api/get-reports?role=admin');
        if (reportRes.ok) {
            const rows = await reportRes.json();
            allReports = rows.map(row => ({
                id: row.id,
                submitDate: new Date(row.submit_date),
                name: row.employee_name || 'Unknown',
                dept: row.department,
                start: row.start_date,
                end: row.end_date,
                task: row.task_summary,
                status: row.status || 'Pending'
            }));
        }

        // 2. Fetch Tasks from Turso
        const taskRes = await fetch('/api/get-tasks');
        if (taskRes.ok) {
            const tRows = await taskRes.json();
            allAssignTasks = tRows.map(row => ({
                id: row.id,
                assignedDate: new Date(row.assigned_date),
                assigneeName: row.assignee_name,
                dept: row.department,
                task: row.task_content,
                status: row.status,
                progress: row.progress || 0,
                dueDate: row.due_date
            }));
        }

        // 3. Fetch Valid Employees (for the validation check)
        const empRes = await fetch('/api/get-employees');
        if (empRes.ok) {
            validEmployees = await empRes.json();
        }

        // Refresh the HTML tables
        updateUI(); 
        updateTasksView();

    } catch (error) {
        console.error("Admin Load Error:", error);
        showToast("Database sync failed", "error");
    } finally {
        setLoading(false);
    }
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
    if (id === 'task-view') updateTasksView();
}

// handle logout
function handleLogout() {
    if (confirm('are you sure you want to logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('currentUser');
        showToast('logged out successfully', 'success');
        window.location.href = 'index.html';
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

    assignform.addEventListener('submit', async (e) => {
        e.preventDefault();

        const assigneeName = document.getElementById('assignName').value.trim();
        const btn = e.submitter;

        // VALIDATION: Check against the list we fetched from the database
        if (!validEmployees.includes(assigneeName)) {
            showToast(`Employee "${assigneeName}" does not exist in the database.`, 'error');
            return;
        }

        const taskData = {
            assignee_name: assigneeName,
            department: document.getElementById('assignDept').value,
            due_date: document.getElementById('dueDate').value,
            task_content: document.getElementById('assignTask').value
        };

        setLoading(true, btn, "Assigning...");

        try {
            const response = await fetch('/api/assign-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (response.ok) {
                showToast('Task assigned and saved to database!', 'success');
                assignform.reset();
                await loadData(); // Refresh the table and the employee list
            } else {
                throw new Error('Failed to assign task');
            }
        } catch (error) {
            console.error(error);
            showToast('Connection error. Task not saved.', 'error');
        } finally {
            setLoading(false, btn);
        }
    });
}

// Update tasks table view
function updateTasksView() {
    const tbody = document.getElementById('task-row');
    if (!tbody) return;

    // Check if there are no tasks
    if (allAssignTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-light);">no tasks assigned yet</td></tr>';
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(allAssignTasks.length / itemsPerPage);
    const startIndex = (currentPage.tasks - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allAssignTasks.slice(startIndex, endIndex);

    // Build table rows
    tbody.innerHTML = paginatedData.map((t, index) => {
        // Determine progress bar color
        const progressColor = t.progress >= 75 ? '#27ae60' :
            t.progress >= 50 ? '#f39c12' : '#e74c3c';

        // Initialize progress if not exists
        const progress = t.progress || 0;

        return `
            <tr onclick="openTaskModal(${t.id})" style="cursor: pointer;">
                <td>${new Date(t.assignedDate).toLocaleDateString()}</td>
                <td>${t.assigneeName}</td>
                <td>${t.dept}</td>
                <td class="task-cell">${t.task.substring(0, 40)}${t.task.length > 40 ? '...' : ''}</td>
                <td>
                    <span class="status-badge ${t.status.toLowerCase()}">${t.status}</span>
                    <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${progress}%; background: ${progressColor}; height: 100%; transition: width 0.3s ease;"></div>
                        </div>
                        <span style="font-size: 0.75rem; color: #666; min-width: 35px;">${progress}%</span>
                    </div>
                </td>
                <td><i class="fas fa-eye"></i></td>
            </tr>
        `;
    }).join('');

    // Add pagination controls if needed
    addPaginationControls('task-row', allAssignTasks.length, currentPage.tasks, 'tasks');
}

// Open task modal with progress tracking
function openTaskModal(taskId) {
    currentTaskId = taskId;
    const task = allAssignTasks.find(t => t.id === taskId);
    if (!task) return;

    // Initialize tracking if not exists
    if (!task.progress) task.progress = 0;
    if (!task.updates) task.updates = [];

    const modal = document.getElementById('reportModal');
    const modalContent = modal.querySelector('.modal-content');

    const progressColor = task.progress >= 75 ? '#27ae60' :
        task.progress >= 50 ? '#f39c12' : '#e74c3c';

    modalContent.innerHTML = `
        <span class="close" onclick="closeModal()">&times;</span>
        <h2>${task.assigneeName}</h2>
        
        <div class="modal-info">
            <div class="modal-info-item">
                <strong>department:</strong>
                <span>${task.dept}</span>
            </div>
            <div class="modal-info-item">
                <strong>assigned:</strong>
                <span>${new Date(task.assignedDate).toLocaleDateString()}</span>
            </div>
            <div class="modal-info-item">
                <strong>due date:</strong>
                <span>${new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
            <div class="modal-info-item">
                <strong>status:</strong>
                <span class="status-badge ${task.status.toLowerCase()}">${task.status}</span>
            </div>
        </div>
        
        <h3>Task Details</h3>
        <div class="task-box">${task.task}</div>
        
        <h3>Progress Tracking</h3>
        <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span style="font-weight: 600;">Current Progress:</span>
                <span style="font-weight: 600; color: ${progressColor}; font-size: 1.2rem;">${task.progress}%</span>
            </div>
            
            <div style="background: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden; margin-bottom: 20px;">
                <div style="width: ${task.progress}%; background: ${progressColor}; height: 100%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    ${task.progress > 15 ? task.progress + '%' : ''}
                </div>
            </div>
            
            <label style="display: block; margin-bottom: 10px; font-weight: 600;">Update Progress:</label>
            <input type="range" id="progressSlider" min="0" max="100" value="${task.progress}" 
                style="width: 100%; height: 8px; margin-bottom: 10px; cursor: pointer;"
                oninput="document.getElementById('progressValue').textContent = this.value + '%'">
            
            <div style="text-align: center; margin-bottom: 15px;">
                <span id="progressValue" style="font-size: 1.1rem; font-weight: 600; color: ${progressColor};">${task.progress}%</span>
            </div>
            
            <button class="btn" onclick="updateTaskProgress(${task.id})" style="width: 100%;">
                <i class="fas fa-save"></i> Update Progress
            </button>
        </div>

        ${task.updates && task.updates.length > 0 ? `
            <h3>Progress History</h3>
            <div style="max-height: 250px; overflow-y: auto; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: white;">
                ${task.updates.map(update => `
                    <div style="padding: 12px; border-left: 4px solid #149648; background: #f8f9fa; margin-bottom: 12px; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong style="color: #149648; font-size: 1.1rem;">${update.progress}%</strong>
                            <span style="color: #666; font-size: 0.85rem;">${new Date(update.date).toLocaleString()}</span>
                        </div>
                        ${update.note ? `<p style="margin: 5px 0 0 0; color: #555;">${update.note}</p>` : ''}
                    </div>
                `).join('')}
            </div>
        ` : '<p style="color: #999; text-align: center; padding: 20px;">No progress updates yet</p>'}

        <div class="action-buttons" style="margin-top: 25px; display: flex; gap: 10px;">
            <button class="btn-approve" onclick="markTaskComplete(${task.id})" style="flex: 1;">
                <i class="fas fa-check"></i> Mark Complete
            </button>
            <button class="btn-reject" onclick="deleteTask(${task.id})" style="flex: 1;">
                <i class="fas fa-trash"></i> Delete Task
            </button>
        </div>
    `;

    modal.style.display = 'block';
}

// Update task progress
function updateTaskProgress(taskId) {
    const task = allAssignTasks.find(t => t.id === taskId);
    if (!task) return;

    const newProgress = parseInt(document.getElementById('progressSlider').value);

    // Update progress
    task.progress = newProgress;

    // Add to history
    task.updates = task.updates || [];
    task.updates.unshift({
        progress: newProgress,
        date: new Date().toISOString(),
        note: `Progress updated to ${newProgress}% by admin`
    });

    // Auto-update status based on progress
    if (newProgress === 100) {
        task.status = 'Completed';
    } else if (newProgress > 0) {
        task.status = 'In Progress';
    } else {
        task.status = 'Pending';
    }

    saveData();
    updateTasksView();
    showToast('Task progress updated successfully!', 'success');

    // Refresh the modal to show updated data
    openTaskModal(taskId);
}

// Mark task as complete
function markTaskComplete(taskId) {
    if (!confirm('Mark this task as 100% complete?')) return;

    const task = allAssignTasks.find(t => t.id === taskId);
    if (!task) return;

    task.status = 'Completed';
    task.progress = 100;
    task.updates = task.updates || [];
    task.updates.unshift({
        progress: 100,
        date: new Date().toISOString(),
        note: 'Task marked as complete by admin'
    });

    saveData();
    updateTasksView();
    closeModal();
    showToast('Task marked as complete!', 'success');
}

// Delete task
function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone!')) return;

    const index = allAssignTasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
        allAssignTasks.splice(index, 1);
        saveData();
        updateTasksView();
        closeModal();
        showToast('Task deleted successfully!', 'warning');
    }
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
    const totalTasksEls = document.querySelectorAll('#totalTasks');
    const activeEl = document.getElementById('activeEmployees');
    const weekEl = document.getElementById('thisWeek');

    if (totalEl) totalEl.textContent = allReports.length;
    if (pendingEl) pendingEl.textContent = allReports.filter(r => r.status === 'Pending').length;

    // Update all elements with id="totalTasks"
    totalTasksEls.forEach(el => {
        if (el) el.textContent = allAssignTasks.length;
    });

    if (activeEl) activeEl.textContent = new Set(allReports.map(r => r.name)).size;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    if (weekEl) weekEl.textContent = allReports.filter(r => r.submitDate >= weekAgo).length;
}

function searchReports() {
    const term = document.getElementById('searchInput').value.toLowerCase();
    currentPage.reports = 1;
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
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-light);">no reports found</td></tr>';
        return;
    }
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage.reports - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    tbody.innerHTML = paginatedData.map((r, index) => `
        <tr onclick="openReport(${r.id})">
          <td>${startIndex + index + 1}</td>
          <td>${r.submitDate.toLocaleDateString()}</td>
          <td>${r.name}</td>
          <td>${r.dept}</td>
          <td>${r.start} to ${r.end}</td>
          <td><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
          <td><i class="fas fa-eye"></i></td>
        </tr>
    `).join('');

    addPaginationControls('report-rows', data.length, currentPage.reports, 'reports');
}

function addPaginationControls(tableId, totalItems, currentPageNum, type) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const paginationRow = document.createElement('tr');

    // Determine colspan based on table
    let colspan = 7; // for reports table
    if (tableId === 'task-row') colspan = 6;
    if (tableId === 'leaderboard-rows') colspan = 6;

    paginationRow.innerHTML = `
        <td colspan="${colspan}" style="text-align: center; padding: 20px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
                <button onclick="changePage('${type}', ${currentPageNum - 1})" 
                    ${currentPageNum === 1 ? 'disabled' : ''} 
                    style="padding: 8px 12px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <span style="font-weight: 600;">Page ${currentPageNum} of ${totalPages}</span>
                <button onclick="changePage('${type}', ${currentPageNum + 1})" 
                    ${currentPageNum === totalPages ? 'disabled' : ''} 
                    style="padding: 8px 12px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </td>
    `;
    tbody.appendChild(paginationRow);
}

function changePage(type, newPage) {
    let totalPages;

    if (type === 'reports') {
        totalPages = Math.ceil(getFiltered().length / itemsPerPage);
    } else if (type === 'leaderboard') {
        totalPages = Math.ceil(Object.keys(getTeamStats()).length / itemsPerPage);
    } else if (type === 'tasks') {
        totalPages = Math.ceil(allAssignTasks.length / itemsPerPage);
    }

    if (newPage < 1 || newPage > totalPages) return;

    currentPage[type] = newPage;

    if (type === 'reports') {
        const filtered = getFiltered();
        updateTable(filtered);
    } else if (type === 'leaderboard') {
        updateTeam();
    } else if (type === 'tasks') {
        updateTasksView();
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
        loadData();
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
                        <div style="flex: 1; background: #e0e0e0; height: 20px; border-radius: 10px;// Continuing from where it was cut off...

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

    const modal = document.getElementById('reportModal');
    const modalContent = modal.querySelector('.modal-content');

    modalContent.innerHTML = `
        <span class="close" onclick="closeModal()">&times;</span>
        <h2 id="modal-name">${r.name}</h2>
        <div class="modal-info">
            <div class="modal-info-item">
                <strong>department:</strong>
                <span id="modal-dept">${r.dept}</span>
            </div>
            <div class="modal-info-item">
                <strong>timeline:</strong>
                <span id="modal-dates">${r.start} to ${r.end}</span>
            </div>
            <div class="modal-info-item">
                <strong>status:</strong>
                <span id="modal-status"><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></span>
            </div>
        </div>
        <h3>Task details</h3>
        <div id="modal-task" class="task-box">${r.task}</div>
        <div class="action-buttons" id="modal-actions" style="display: ${r.status !== 'Pending' ? 'none' : 'flex'}">
            <button class="btn-approve" onclick="approveReport()">
                <i class="fas fa-check"></i>
                Approve
            </button>
            <button class="btn-reject" onclick="rejectReport()">
                <i class="fas fa-times"></i>
                Reject
            </button>
        </div>
    `;

    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
}

async function approveReport() {
    const report = allReports.find(r => r.id === currentReportId);
    if (!report) return;

    try {
        const response = await fetch('/api/update-report-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: report.id, status: 'Approved' })
        });

        if (response.ok) {
            report.status = 'Approved';
            updateUI();
            closeModal();
            showToast('Report approved and synced!', 'success');
        }
    } catch (error) {
        showToast('Failed to update status on server', 'error');
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
    const notif = document.getElementById('notifPref').value;

    localStorage.setItem('adminSettings', JSON.stringify({ name, email, notif }));
    showToast('settings saved successfully!', 'success');
}

function clearAllData() {
    if (confirm('are you sure you want to clear all data? this action cannot be undone!')) {
        localStorage.removeItem('cpReports');
        localStorage.removeItem('cpAssignedTasks');
        allReports = [];
        allAssignTasks = [];
        updateUI();
        updateTasksView();
        showToast('all data cleared!', 'warning');
    }
}

// closing modal
window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
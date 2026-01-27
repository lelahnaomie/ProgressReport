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
    // loadSettings();
});

// check if user is admin
function checkAdmin() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (user.role !== 'admin') {
        window.location.href = 'index.html';
    }
    else {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}
async function loadSettings() {
    if (!currentUser || !currentUser.id) {
        console.error('no current user found');
        return;
    }

    setLoading(true);

    try {
        // fetch fresh admin profile from database
        const profileRes = await fetch(`/api/get-profile?id=${currentUser.id}`);

        if (profileRes.ok) {
            const freshUser = await profileRes.json();

            // update current user with fresh data
            currentUser = { ...currentUser, ...freshUser };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            // fill the settings form fields
            const nameField = document.getElementById('adminName');
            const emailField = document.getElementById('adminEmail');
            const notifField = document.getElementById('notifPref');

            if (nameField) nameField.value = currentUser.name || '';
            if (emailField) emailField.value = currentUser.email || '';

            // load notification preference from localStorage
            const savedSettings = localStorage.getItem('adminSettings');
            if (savedSettings && notifField) {
                const settings = JSON.parse(savedSettings);
                notifField.value = settings.notif || 'all reports';
            }
        } else {
            console.error('failed to fetch admin profile');
        }
    } catch (error) {
        console.error('load settings error:', error);
    } finally {
        setLoading(false);
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
        const empRes = await fetch('/api/get-employees');
        if (empRes.ok) {
            validEmployees = await empRes.json();
        }

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
                dueDate: row.due_date,
                update_note: row.update_note
            }));
        }

        const reportRes = await fetch('/api/reports?action=getReports&user_id=1');
        if (reportRes.ok) {
            const rows = await reportRes.json();
            allReports = rows.map(row => {
                const employee = validEmployees.find(emp => emp.name === row.employee_name);
                const employeeTask = allAssignTasks.find(task => task.assigneeName === row.employee_name);

                let actualDepartment = row.department;
                if (employee && employee.department && employee.department !== 'Not Assigned') {
                    actualDepartment = employee.department;
                } else if (employeeTask && employeeTask.dept && employeeTask.dept !== 'Not Assigned') {
                    actualDepartment = employeeTask.dept;
                }

                return {
                    id: row.id,
                    submitDate: new Date(row.submit_date),
                    name: row.employee_name || 'Unknown',
                    dept: actualDepartment,
                    start: row.start_date,
                    end: row.end_date,
                    task: row.task_summary,
                    status: row.status || 'Pending'
                };
            });
        }

        // Refresh UI
        updateUI();
        updateTasksView();

    } catch (error) {
        console.error("Admin Load Error:", error);
        showToast("Database sync failed", "error");
    } finally {
        setLoading(false);
    }
}
async function loadAdminTasksFromDatabase() {
    setLoading(true);
    try {
        // Calling your API without an assignee_name gets ALL tasks for the Admin
        const res = await fetch('/api/get-tasks');
        if (!res.ok) throw new Error("Failed to fetch tasks");

        const rows = await res.json();

        // Map database columns to your frontend variable names
        allAssignTasks = rows.map(row => ({
            id: row.id,
            assignedDate: row.assigned_date,
            assigneeName: row.assignee_name,
            dept: row.department,
            task: row.task_content,
            status: row.status,
            progress: row.progress || 0,
            dueDate: row.due_date
        }));

        updateTaskTable();
    } catch (error) {
        console.error("Admin sync error:", error);
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
    const section = document.getElementById(id);
    if (section) section.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');

    if (id === 'team-view') updateTeam();
    if (id === 'task-view') updateTasksView();
    if (id === 'settings-view') loadSettings();
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
    if (!silent) showToast('Report submitted successfully!', 'success');
}

function setupTaskForm() {
    const assignform = document.getElementById('assignForm');
    if (!assignform) return;

    assignform.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.submitter;

        const assigneeName = document.getElementById('assignName').value.trim();
        const department = document.getElementById('assignDept').value;
        const dueDate = document.getElementById('dueDate').value;
        const taskContent = document.getElementById('assignTask').value;

        const taskData = {
            assignee_name: assigneeName,
            department: department,
            due_date: dueDate,
            task_content: taskContent
        };

        setLoading(true, btn, "Saving...");

        try {
            const taskResponse = await fetch('/api/assign-task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (!taskResponse.ok) {
                throw new Error('Failed to save task to database');
            }

            const employeeRes = await fetch(`/api/get-employees`);
            if (employeeRes.ok) {
                const employees = await employeeRes.json();
                const employee = employees.find(emp => emp.name === assigneeName);

                if (employee) {
                    if (!employee.department || employee.department === 'Not Assigned') {
                        console.log(`Updating ${assigneeName}'s department to ${department}`);

                        const updateProfileRes = await fetch('/api/update-profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: employee.id,
                                department: department
                            })
                        });

                        if (updateProfileRes.ok) {
                            console.log('Employee department updated successfully');
                        } else {
                            console.error('Failed to update employee department');
                        }
                    }
                }
            }

            showToast('Task assigned successfully!', 'success');
            assignform.reset();
            await loadAdminTasksFromDatabase();

        } catch (error) {
            console.error(error);
            showToast('Sync error. Check connection.', 'error');
        } finally {
            setLoading(false, btn);
        }
    });
}

// Update tasks table view
function updateTasksView() {
    const tbody = document.getElementById('task-row');
    if (!tbody) return;

    if (allAssignTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">No tasks assigned yet</td></tr>';
        return;
    }

    const startIndex = (currentPage.tasks - 1) * itemsPerPage;
    const paginatedData = allAssignTasks.slice(startIndex, startIndex + itemsPerPage);

    tbody.innerHTML = paginatedData.map((t, index) => {
        const progress = t.progress || 0;
        const progressColor = progress >= 75 ? '#27ae60' : progress >= 50 ? '#f39c12' : '#e74c3c';

        return `
            <tr onclick="openTaskModal(${t.id})" style="cursor: pointer;">
                <td class="id-cell">${startIndex + index + 1}</td>
                <td style="font-size: 0.85rem;">${new Date(t.assignedDate).toLocaleDateString()}</td>
                <td>${t.assigneeName}</td>
                <td>${t.dept}</td>
                <td class="task-cell" style="font-size: 0.85rem;">${t.task.substring(0, 30)}${t.task.length > 30 ? '...' : ''}</td>
                <td style="padding: 4px 10px;">
                    <span class="status-badge ${t.status.toLowerCase()}" style="padding: 1px 6px; font-size: 0.65rem;">${t.status}</span>
                    <div style="margin-top: 3px; display: flex; align-items: center; gap: 5px;">
                        <div style="flex: 1; background: #e0e0e0; height: 3px; border-radius: 2px; overflow: hidden;">
                            <div style="width: ${progress}%; background: ${progressColor}; height: 100%;"></div>
                        </div>
                        <span style="font-size: 0.6rem; color: #666;">${progress}%</span>
                    </div>
                </td>
               <td class="action-cell">
                    <button class="view-btn" style="padding: 4px 10px; border: none; background: #fff; font-size: 0.75rem; pointer-events: none;">
                        <i class="fas fa-eye"></i> 
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    addPaginationControls('task-row', allAssignTasks.length, currentPage.tasks, 'tasks');
}
// Open task modal with progress tracking
function openTaskModal(taskId) {
    currentTaskId = taskId;
    const task = allAssignTasks.find(t => t.id === taskId);
    if (!task) return;

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
        
        <h3>Current Progress</h3>
        <div style="margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span style="font-weight: 600;">Progress:</span>
                <span style="font-weight: 600; color: ${progressColor}; font-size: 1.2rem;">${task.progress}%</span>
            </div>
            
            <div style="background: #e0e0e0; height: 30px; border-radius: 15px; overflow: hidden;">
                <div style="width: ${task.progress}%; background: ${progressColor}; height: 100%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                    ${task.progress > 15 ? task.progress + '%' : ''}
                </div>
            </div>
            
            ${task.update_note ? `
                <div style="margin-top: 15px; padding: 12px; background: white; border-left: 4px solid #149648; border-radius: 4px;">
                    <strong style="color: #149648; display: block; margin-bottom: 5px;">Latest Update:</strong>
                    <p style="margin: 0; color: #555;">${task.update_note}</p>
                </div>
            ` : '<p style="margin-top: 15px; color: #999; text-align: center;">No update notes yet</p>'}
        </div>

        <div class="action-buttons" style="margin-top: 25px; display: flex; gap: 10px;">
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

    openTaskModal(taskId);
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Permanently delete this task from the database?')) return;

    try {
        const response = await fetch('/api/delete-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId })
        });

        if (response.ok) {
            allAssignTasks = allAssignTasks.filter(t => t.id !== taskId);
            updateTasksView();
            closeModal();
            showToast('Task removed from cloud', 'warning');
        }
    } catch (error) {
        showToast('Delete failed', 'error');
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
    let colspan = 7;
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
        const employee = validEmployees.find(emp => emp.name === r.name);
        const employeeTask = allAssignTasks.find(task => task.assigneeName === r.name);

        let currentDept = r.dept;
        if (employee && employee.department && employee.department !== 'Not Assigned') {
            currentDept = employee.department;
        } else if (employeeTask && employeeTask.dept && employeeTask.dept !== 'Not Assigned') {
            currentDept = employeeTask.dept;
        }

        if (!stats[r.name]) stats[r.name] = { total: 0, approved: 0, dept: currentDept };
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
    allReports.forEach(r => {
        const employee = validEmployees.find(emp => emp.name === r.name);
        const employeeTask = allAssignTasks.find(task => task.assigneeName === r.name);

        let currentDept = r.dept;
        if (employee && employee.department && employee.department !== 'Not Assigned') {
            currentDept = employee.department;
        } else if (employeeTask && employeeTask.dept && employeeTask.dept !== 'Not Assigned') {
            currentDept = employeeTask.dept;
        }

        deptCounts[currentDept] = (deptCounts[currentDept] || 0) + 1;
    });

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
        const response = await fetch('/api/reports', {
            method: 'POST',
            action: 'updateStatus',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: report.id, status: 'Approved' })
        });

        if (response.ok) {
            report.status = 'Approved';
            updateUI();
            closeModal();
            showToast('Report approved!', 'success');
        }
    } catch (error) {
        showToast('Failed to update status', 'error');
    }
}

async function rejectReport() {
    if (!confirm('Are you sure you want to reject this report?')) return;
    const report = allReports.find(r => r.id === currentReportId);
    if (!report) return;

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: report.id, status: 'Rejected' })
        });

        if (response.ok) {
            report.status = 'Rejected';
            updateUI();
            closeModal();
            showToast('Report rejected', 'error');
        }
    } catch (error) {
        showToast('Failed to update server', 'error');
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
    showToast('PDF exported successfully!', 'success');
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
    showToast('Excel exported successfully!', 'success');
}

// settings
async function saveSettings() {
    const saveBtn = document.querySelector('#settings-view .btn');
    setLoading(true, saveBtn, "Saving...");

    const newName = document.getElementById('adminName').value.trim();
    const newEmail = document.getElementById('adminEmail').value.trim();
    const notifPref = document.getElementById('notifPref').value;

    if (!newName || !newEmail) {
        showToast('Name and Email are required', 'error');
        setLoading(false, saveBtn);
        return;
    }

    const profileData = {
        id: currentUser.id,
        name: newName,
        email: newEmail
    };

    try {
        // update profile in database
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();

        if (response.ok) {
            currentUser.name = newName;
            currentUser.email = newEmail;

            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            localStorage.setItem('adminSettings', JSON.stringify({ notif: notifPref }));
            updateUserHeader();

            showToast('Settings saved successfully', 'success');
        } else {
            showToast(result.error || 'failed to update settings', 'error');
        }
    } catch (error) {
        console.error('save settings error:', error);
        showToast('Server connection error', 'error');
    } finally {
        setLoading(false, saveBtn);
    }
}

function clearAllData() {
    if (confirm('are you sure you want to clear all data? this action cannot be undone!')) {
        localStorage.removeItem('cpReports');
        localStorage.removeItem('cpAssignedTasks');
        allReports = [];
        allAssignTasks = [];
        updateUI();
        updateTasksView();
        showToast('All data cleared!', 'warning');
    }
}

// closing modal
window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
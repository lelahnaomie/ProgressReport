// Global State
let allReports = [];
let allAssignTasks = [];
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
let currentReportId = null;
let currentTaskId = null;

// Pagination state
let currentPage = {
    reports: 1,
    tasks: 1
};
const itemsPerPage = 5;

const logBtn = document.getElementById('log-btn');
const loadingSpinner = document.getElementById('loading-spinner');
const contentDiv = document.getElementById('content');

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
    updateUserHeader();
    loadDataFromDatabase(); // Initial fetch from Turso
    setupEventListeners();
});
//check if user employee
function checkEmployee() {
    if (!currentUser || currentUser.role !== 'employee') {
        window.location.href = 'index.html';
    }
}

function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername) {
        headerUsername.textContent = currentUser.name;
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
        allAssignTasks.forEach(t => {
            t.submitDate = new Date(t.submitDate);
            // Initialize progress tracking if not exists
            if (!t.progress) t.progress = 0;
            if (!t.updates) t.updates = [];
        });
    } else {
        allAssignTasks = [];
    }

    updateReportsTable();
    updateTaskTable();
}

function saveData() {
    localStorage.setItem('cpReports', JSON.stringify(allReports));
}

function saveTaskData() {
    localStorage.setItem('cpAssignedTasks', JSON.stringify(allAssignTasks));
}
async function loadDataFromDatabase() {
    if (!currentUser.id) return;
    setLoading(true);
    
    try {
        // 1. Fetch Reports (Existing logic)
        const reportRes = await fetch(`/api/get-reports?user_id=${currentUser.id}&role=${currentUser.role}`);
        const reportRows = await reportRes.json();
        if (reportRes.ok) {
            allReports = reportRows.map(row => ({
                id: row.id,
                submitDate: row.submit_date,
                name: row.employee_name,
                dept: row.department,
                start: row.start_date,
                end: row.end_date,
                task: row.task_summary,
                status: row.status || 'Pending'
            }));
        }

        const taskRes = await fetch(`/api/get-tasks?assignee_name=${encodeURIComponent(currentUser.name)}`);
        const taskRows = await taskRes.json();

        if (taskRes.ok) {
            allAssignTasks = taskRows.map(row => ({
                id: row.id,
                assignedDate: row.assigned_date,
                assigneeName: row.assignee_name,
                dept: row.department,
                task: row.task_content,
                status: row.status,
                progress: row.progress || 0,
                dueDate: row.due_date
            }));
            
            // After updating the variable, refresh the table
            updateTaskTable(); 
        }

        updateReportsTable();

    } catch (error) {
        console.error("Employee sync error:", error);
    } finally {
        setLoading(false);
    }
}
function setupEventListeners() {
    const form = document.getElementById('submissionForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        setLoading(true, submitBtn, "Syncing to Turso...");

        const reportData = {
    user_id: currentUser.id,
    employee_name: currentUser.name, // Matches new column
    department: document.getElementById('staffDept').value,
    start_date: document.getElementById('startDate').value,
    end_date: document.getElementById('endDate').value,
    task_summary: document.getElementById('taskContent').value
};

        try {
            const response = await fetch('/api/submit-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });

            if (response.ok) {
                showToast('Report submitted successfully!', 'success');
                form.reset();
                await loadDataFromDatabase(); // Refresh table
                showSection('my-reports-view');
            } else {
                const err = await response.json();
                showToast(err.error || 'Submission failed', 'error');
            }
        } catch (error) {
            showToast('Server connection error', 'error');
        } finally {
            setLoading(false, submitBtn);
        }
    });
}
// UI Tables  
function updateReportsTable() {
    const tbody = document.getElementById('my-reports-rows');
    if (!tbody) return;

    // Use allReports directly (they are already filtered by the API)
    if (allReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">No reports found.</td></tr>';
    } else {
        const sorted = [...allReports].sort((a, b) => b.id - a.id);
        const startIndex = (currentPage.reports - 1) * itemsPerPage;
        const paginatedData = sorted.slice(startIndex, startIndex + itemsPerPage);

        tbody.innerHTML = paginatedData.map((r, index) => `
            <tr onclick="openReport(${r.id})">
                <td class="id-cell">${startIndex + index + 1}</td>
                <td class="date-cell">${new Date(r.submitDate).toLocaleDateString()}</td>
                <td class="period-cell">${r.start} to ${r.end}</td>
                <td class="task-cell">${r.task.substring(0, 30)}${r.task.length > 30 ? '...' : ''}</td>
                <td class="status-cell"><span class="status-badge ${r.status.toLowerCase()}">${r.status}</span></td>
                <td class="action-cell"><button class="view-btn"><i class="fas fa-eye"></i> View</button></td>
            </tr>
        `).join('');

        addPaginationControls('my-reports-rows', sorted.length, currentPage.reports, 'reports');
    }

    // Update Counters
    updateCounter('myTotalReports', allReports.length);
    updateCounter('myApproved', allReports.filter(r => r.status === 'Approved').length);
    updateCounter('myPending', allReports.filter(r => r.status === 'Pending').length);
}

function updateTaskTable() {
    const tbody = document.getElementById('task-row');
    if (!tbody) return;

const myTasks = allAssignTasks;
    if (myTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">No tasks assigned to you yet.</td></tr>';
    } else {
        const sorted = [...myTasks].sort((a, b) => b.id - a.id);

        const totalPages = Math.ceil(sorted.length / itemsPerPage);
        const startIndex = (currentPage.tasks - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = sorted.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedData.map(t => {
            const progress = t.progress || 0;
            const progressColor = progress >= 75 ? '#27ae60' :
                progress >= 50 ? '#f39c12' : '#e74c3c';

            return `
              <tr onclick="openTaskModal(${t.id})" style="cursor: pointer;">
                <td>${new Date(t.assignedDate).toLocaleDateString()}</td>
                <td>${t.assigneeName}</td>
                <td>${t.dept}</td>
                <td class="task-cell">${t.task.substring(0, 40)}${t.task.length > 40 ? '...' : ''}</td>
                <td>
                    <span class="status-badge ${t.status.toLowerCase()}">${t.status}</span>
                    <div style="margin-top:0px; display: flex; align-items: center; gap:2px;">
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

        addPaginationControls('task-row', sorted.length, currentPage.tasks, 'tasks');
    }

    updateCounter('totalTasks', myTasks.length);
}

function addPaginationControls(tableId, totalItems, currentPageNum, type) {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const paginationRow = document.createElement('tr');
    const colspan = type === 'reports' ? '6' : '6';

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
    setLoading(true);

    setTimeout(() => {
        // Use allReports directly for Turso data
        const totalPages = type === 'reports'
            ? Math.ceil(allReports.length / itemsPerPage)
            : Math.ceil(allAssignTasks.filter(t => t.assigneeName === currentUser.name).length / itemsPerPage);

        if (newPage >= 1 && newPage <= totalPages) {
            currentPage[type] = newPage;
            if (type === 'reports') updateReportsTable();
            else if (type === 'tasks') updateTaskTable();
        }
        setLoading(false);
    }, 400);
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

    // REPLACEMENT LOGIC: Always use the Database fetch
    if (id === 'my-reports-view' || id === 'empAssign-view') {
        loadDataFromDatabase(); 
    }
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

// Open task modal with progress update capability
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

    // Check if task is completed
    const isCompleted = task.status === 'Completed' || task.progress === 100;

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
        
        <h3>Your Progress</h3>
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
            
            ${!isCompleted ? `
                <label style="display: block; margin-bottom: 10px; font-weight: 600;">Update Your Progress:</label>
                <input type="range" id="progressSlider" min="0" max="100" value="${task.progress}" 
                    style="width: 100%; height: 8px; margin-bottom: 10px; cursor: pointer;"
                    oninput="document.getElementById('progressValue').textContent = this.value + '%'">
                
                <div style="text-align: center; margin-bottom: 15px;">
                    <span id="progressValue" style="font-size: 1.1rem; font-weight: 600; color: ${progressColor};">${task.progress}%</span>
                </div>
                
                <label style="display: block; margin-bottom: 5px; font-weight: 600;">Progress Note (Optional):</label>
                <textarea id="progressNote" 
                    placeholder="Add a note about your progress..."
                    rows="3"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 15px; font-family: inherit;"></textarea>
                
                <button class="btn" onclick="updateMyProgress(${task.id})" style="width: 100%;">
                    <i class="fas fa-save"></i> Update My Progress
                </button>
            ` : `
                <div style="text-align: center; padding: 20px; background: #d4edda; border-radius: 8px; color: #155724;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p style="margin: 0; font-weight: 600;">Task Completed!</p>
                </div>
            `}
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
    `;

    modal.style.display = 'block';
}

// Update employee's own task progress
async function updateMyProgress(taskId) {
    const newProgress = parseInt(document.getElementById('progressSlider').value);
    const noteField = document.getElementById('progressNote');
    const note = noteField ? noteField.value.trim() : '';

    let newStatus = 'In Progress';
    if (newProgress === 100) newStatus = 'Completed';
    if (newProgress === 0) newStatus = 'Pending';

    setLoading(true);

    try {
        const response = await fetch('/api/update-task-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: taskId,
                progress: newProgress,
                status: newStatus,
                note: note
            })
        });

        if (response.ok) {
            showToast('Progress synced to database!', 'success');
            await loadDataFromDatabase(); // Refresh local variables and UI
            closeModal();
        } else {
            showToast('Failed to update server', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    } finally {
        setLoading(false);
    }
}
function closeModal() {
    const modal = document.getElementById('reportModal');
    if (modal) modal.style.display = 'none';
}

// notifications 
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

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        const logoutBtn = document.getElementById('log-btn');
        setLoading(true, logoutBtn, "Logging out...");

        setTimeout(() => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }, 1000);
    }
}

// Profile functions
function saveProfile() {
    const saveBtn = document.querySelector('#profile-view .btn');
    setLoading(true, saveBtn, "Saving...");

    setTimeout(() => {
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const dept = document.getElementById('profileDept').value;
        const phone = document.getElementById('profilePhone').value;

        currentUser.name = name;
        currentUser.email = email;
        currentUser.dept = dept;
        currentUser.phone = phone;

        localStorage.setItem('currentUser', JSON.stringify(currentUser));

        const users = JSON.parse(localStorage.getItem('cpUsers') || '[]');
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex !== -1) {
            users[userIndex] = currentUser;
            localStorage.setItem('cpUsers', JSON.stringify(users));
        }

        updateUserHeader();
        setLoading(false, saveBtn);
        showToast('Profile updated successfully!', 'success');
    }, 1000);
}

function saveSettings() {
    const emailNotif = document.getElementById('emailNotif').value;
    const reminderPref = document.getElementById('reminderPref').value;
    const langPref = document.getElementById('langPref').value;

    const settings = {
        emailNotif,
        reminderPref,
        langPref
    };

    localStorage.setItem('employeeSettings', JSON.stringify(settings));
    showToast('Settings saved successfully!', 'success');
}

window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
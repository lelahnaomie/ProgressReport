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
    loadDataFromDatabase(); 
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
    if (!currentUser || !currentUser.id) return;
    setLoading(true);

    try {
        const profileRes = await fetch(`/api/get-profile?id=${currentUser.id}`);
        
        if (profileRes.ok) {
            const freshUser = await profileRes.json();
            
            currentUser = { ...currentUser, ...freshUser };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            updateUserHeader();
            
            const profileSection = document.getElementById('profile-view');
            if (profileSection && profileSection.style.display !== 'none') {
                loadProfileData();
            }
        }
        const reportRes = await fetch(`/api/reports?user_id=${currentUser.id}&role=${currentUser.role}`);
        if (reportRes.ok) {
            const reportRows = await reportRes.json();
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
            updateReportsTable();
        }

        const taskRes = await fetch(`/api/get-tasks?assignee_name=${encodeURIComponent(currentUser.name)}`);
        if (taskRes.ok) {
            const taskRows = await taskRes.json();
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
            updateTaskTable();
        }

    } catch (error) {
        console.error("Data synchronization error:", error);
        showToast('Failed to sync data with server', 'error');
    } finally {
        setLoading(false);
    }
}
function loadProfileData() {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userStr);

    // Display at top of profile card
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-role').textContent = user.role || 'Employee';
    
    // Fill the editable input fields
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileEmail').value = user.email || '';
    
    // Department is READ-ONLY (assigned by admin)
    const deptField = document.getElementById('profileDept');
    if (deptField) {
        deptField.value = user.department || 'Not Assigned';
        deptField.readOnly = true;
        deptField.style.backgroundColor = '#f5f5f5';
        deptField.style.cursor = 'not-allowed';
    }
}
// Run when page loads
document.addEventListener('DOMContentLoaded', loadProfileData);
async function markTaskComplete(taskId) {
    if (!confirm('Mark this task as 100% finished?')) return;
    
    await updateMyProgress(taskId, 100, "Task marked as complete by employee.");
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    
    setLoading(true);
    try {
        const response = await fetch('/api/delete-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId })
        });

        if (response.ok) {
            showToast('Task deleted successfully', 'warning');
            await loadDataFromDatabase(); 
            closeModal();
        } else {
            showToast('Delete failed', 'error');
        }
    } catch (error) {
        showToast('Connection error', 'error');
    } finally {
        setLoading(false);
    }
}


async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    
    setLoading(true);
    try {
        const response = await fetch('/api/delete-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId })
        });

        if (response.ok) {
            showToast('Task deleted successfully', 'warning');
            await loadDataFromDatabase();
            closeModal();
        }
    } catch (error) {
        showToast('Error deleting task', 'error');
    } finally {
        setLoading(false);
    }
}

async function updateMyProgress(taskId, overrideProgress = null, overrideNote = null) {
    const newProgress = overrideProgress !== null ? overrideProgress : parseInt(document.getElementById('progressSlider').value);
    const note = overrideNote !== null ? overrideNote : document.getElementById('progressNote').value.trim();

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
                update_note: note 
            })
        });

        if (response.ok) {
            showToast('Progress updated!', 'success');
            await loadDataFromDatabase(); 
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

function showSection(id, el) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if (target) target.style.display = 'block';

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');

    // Auto-fill department when showing submit report section
    if (id === 'submit-view') {
        const deptField = document.getElementById('staffDept');
        if (deptField && currentUser.department) {
            deptField.value = currentUser.department;
        }
    }

    if (id === 'profile-view') loadProfileData(); 
    if (id === 'my-reports-view' || id === 'empAssign-view') {
        loadDataFromDatabase();
    }
}
function setupEventListeners() {
    const form = document.getElementById('submissionForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');

        // Check if user has a department assigned
        if (!currentUser.department) {
            showToast('You have not been assigned a department yet. Please contact admin.', 'error');
            return;
        }

        setLoading(true, submitBtn, "Submitting...");

        const reportData = {
            user_id: currentUser.id,
            employee_name: currentUser.name, 
            department: currentUser.department, // Use department from currentUser
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value,
            task_summary: document.getElementById('taskContent').value
        };

        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit', 
                    ...reportData
                })
            });

            if (response.ok) {
                showToast('Report submitted successfully!', 'success');
                form.reset();
                await loadDataFromDatabase(); 
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
   <td class="action-cell">
                    <button class="view-btn" style="padding: 4px 10px; border: none; background:#fff; font-size: 0.75rem; pointer-events: none;">
                        <i class="fas fa-eye"></i> 
                    </button>
                </td>
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

    if (allAssignTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">No tasks found.</td></tr>';
        return;
    }

    const sorted = [...allAssignTasks].sort((a, b) => b.id - a.id);
    const startIndex = (currentPage.tasks - 1) * itemsPerPage;
    const paginatedData = sorted.slice(startIndex, startIndex + itemsPerPage);

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
                    <button class="view-btn" style="padding: 4px 10px; background:#fff; border: none; font-size: 0.75rem; pointer-events: none;">
                        <i class="fas fa-eye"></i> 
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    updateCounter('totalTasks', allAssignTasks.length);
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

function openTaskModal(taskId) {
    currentTaskId = taskId;
    const task = allAssignTasks.find(t => t.id === taskId);
    if (!task) return;

    const modal = document.getElementById('reportModal');
    const modalContent = modal.querySelector('.modal-content');
    const progress = task.progress || 0;

    modalContent.innerHTML = `
        <span class="close" onclick="closeModal()">&times;</span>
        <h2>Task Details</h2>
        
        <div class="task-box" style="margin-bottom: 20px;">
            <strong>Task:</strong> ${task.task}
        </div>

        <div style="background: #fdfdfd; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
            <h3>Update Progress</h3>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Completion: <strong id="progressValue">${progress}%</strong></span>
            </div>
            <input type="range" id="progressSlider" min="0" max="100" value="${progress}" 
                   style="width: 100%; margin-bottom: 15px;"
                   oninput="document.getElementById('progressValue').textContent = this.value + '%'">

            <label style="display:block; margin-bottom: 5px; font-weight:bold;">Progress Note:</label>
            <textarea id="progressNote" placeholder="What have you done so far?" 
                      style="width: 100%; height: 60px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; margin-bottom: 15px;"></textarea>

            <button class="btn-approve" onclick="updateMyProgress(${task.id})" style="width: 100%; background: #149648;">
                <i class="fas fa-sync"></i> Progress
            </button>
        </div>

        <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn-approve" onclick="markTaskComplete(${task.id})" style="flex: 1; background: #27ae60;">
                <i class="fas fa-check-double"></i> Mark Completed
            </button>
            <button class="btn-reject" onclick="deleteTask(${task.id})" style="flex: 1; background: #e74c3c;">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
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
            showToast('Progress updated!', 'success');
            await loadDataFromDatabase(); 
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
async function saveProfile() {
    const saveBtn = document.querySelector('#profile-view .btn');
    setLoading(true, saveBtn, "Saving...");

    const newName = document.getElementById('profileName').value.trim();
    const newEmail = document.getElementById('profileEmail').value.trim();

    if (!newName || !newEmail) {
        showToast('Name and email are required', 'error');
        setLoading(false, saveBtn);
        return;
    }

    const profileData = {
        id: currentUser.id,
        name: newName,
        email: newEmail
    };

    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();

        if (response.ok) {
            // Update local user object
            currentUser.name = newName;
            currentUser.email = newEmail;

            // Save to localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Update header and refresh profile display
            updateUserHeader();
            loadProfileData();
            
            showToast('Profile updated successfully!', 'success');
        } else {
            showToast(result.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showToast('Server connection error', 'error');
    } finally {
        setLoading(false, saveBtn);
    }
}
function saveSettings() {
    const saveBtn = document.querySelector('#settings-view .btn');
    setLoading(true, saveBtn, "Saving...");
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
    setLoading(false, saveBtn);
}

window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
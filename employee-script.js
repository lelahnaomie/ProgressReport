// employee-dashboard.js

// global state
let allReports = [];
let allAssignTasks = [];
let currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
let currentReportId = null;
let currentTaskId = null;

// pagination state
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
    checkEmployee();
    updateUserHeader();
    loadDataFromDatabase(); 
    setupEventListeners();
});

// check if user is employee
function checkEmployee() {
    if (!currentUser || currentUser.role !== 'employee') {
        window.location.href = 'index.html';
    }
}

function updateUserHeader() {
    const headerUsername = document.getElementById('headerUsername');
    if (headerUsername && currentUser) {
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

// toggle dropdown menu
function toggleDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('show');
}

// close dropdown when clicking outside
window.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown')) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    }
});

// data management
async function loadDataFromDatabase() {
    if (!currentUser || !currentUser.id) {
        console.error('no current user found');
        return;
    }
    
    setLoading(true);

    try {
        // fetch updated profile
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

        // fetch reports
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

        // fetch tasks
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
        console.error('data synchronization error:', error);
        showToast('failed to sync data with server', 'error');
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

    // display at top of profile card
    const profileName = document.getElementById('profile-name');
    const profileRole = document.getElementById('profile-role');
    if (profileName) profileName.textContent = user.name;
    if (profileRole) profileRole.textContent = user.role || 'Employee';
    
    // fill the editable input fields
    const nameField = document.getElementById('profileName');
    const emailField = document.getElementById('profileEmail');
    const deptField = document.getElementById('profileDept');
    
    if (nameField) nameField.value = user.name || '';
    if (emailField) emailField.value = user.email || '';
    
    // department is read-only assigned by admin
    if (deptField) {
        deptField.value = user.department || 'Not Assigned';
        deptField.readOnly = true;
        deptField.style.backgroundColor = '#f5f5f5';
        deptField.style.cursor = 'not-allowed';
    }
}

async function markTaskComplete(taskId) {
    if (!confirm('mark this task as 100% finished?')) return;
    await updateMyProgress(taskId, 100, "task marked as complete by employee.");
}

async function deleteTask(taskId) {
    if (!confirm('are you sure you want to delete this task? this cannot be undone.')) return;
    
    setLoading(true);
    try {
        const response = await fetch('/api/delete-task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: taskId })
        });

        if (response.ok) {
            showToast('task deleted successfully', 'warning');
            await loadDataFromDatabase(); 
            closeModal();
        } else {
            showToast('delete failed', 'error');
        }
    } catch (error) {
        console.error('delete task error:', error);
        showToast('connection error', 'error');
    } finally {
        setLoading(false);
    }
}

async function updateMyProgress(taskId, overrideProgress = null, overrideNote = null) {
    const progressSlider = document.getElementById('progressSlider');
    const progressNote = document.getElementById('progressNote');
    
    const newProgress = overrideProgress !== null ? overrideProgress : parseInt(progressSlider.value);
    const note = overrideNote !== null ? overrideNote : (progressNote ? progressNote.value.trim() : '');

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
            showToast('progress updated successfully', 'success');
            await loadDataFromDatabase(); 
            closeModal();
        } else {
            const errorData = await response.json();
            console.error('update progress error:', errorData);
            showToast('failed to update server', 'error');
        }
    } catch (error) {
        console.error('update progress error:', error);
        showToast('connection error', 'error');
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

        setLoading(true, submitBtn, "submitting...");

        const reportData = {
            user_id: currentUser.id,
            employee_name: currentUser.name, 
            department: currentUser.department || 'Not Assigned', // allow submission without department
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value,
            task_summary: document.getElementById('taskContent').value
        };

        try {
            console.log('submitting report with data:', reportData);
            
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'submit', 
                    ...reportData
                })
            });

            console.log('response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('success response:', result);
                showToast('report submitted successfully', 'success');
                form.reset();
                await loadDataFromDatabase(); 
                showSection('my-reports-view');
            } else {
                const err = await response.json();
                console.error('error response:', err);
                showToast(err.error || 'submission failed', 'error');
            }
        } catch (error) {
            console.error('submit error:', error);
            showToast('server connection error', 'error');
        } finally {
            setLoading(false, submitBtn);
        }
    });
}

// ui tables  
function updateReportsTable() {
    const tbody = document.getElementById('my-reports-rows');
    if (!tbody) return;

    if (allReports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">no reports found.</td></tr>';
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
            </tr>
        `).join('');

        addPaginationControls('my-reports-rows', sorted.length, currentPage.reports, 'reports');
    }

    // update counters
    updateCounter('myTotalReports', allReports.length);
    updateCounter('myApproved', allReports.filter(r => r.status === 'Approved').length);
    updateCounter('myPending', allReports.filter(r => r.status === 'Pending').length);
}

function updateTaskTable() {
    const tbody = document.getElementById('task-row');
    if (!tbody) return;

    if (allAssignTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">no tasks found.</td></tr>';
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
    const colspan = type === 'reports' ? '6' : '7';

    paginationRow.innerHTML = `
        <td colspan="${colspan}" style="text-align: center; padding: 20px;">
            <div style="display: flex; justify-content: center; align-items: center; gap: 10px;">
                <button onclick="changePage('${type}', ${currentPageNum - 1})" 
                    ${currentPageNum === 1 ? 'disabled' : ''} 
                    style="padding: 8px 12px; cursor: pointer; border: 1px solid #ddd; background: white; border-radius: 4px;">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <span style="font-weight: 600;">page ${currentPageNum} of ${totalPages}</span>
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
        const totalPages = type === 'reports'
            ? Math.ceil(allReports.length / itemsPerPage)
            : Math.ceil(allAssignTasks.length / itemsPerPage);

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

function openReport(id) {
    currentReportId = id;
    const r = allReports.find(x => x.id == id);
    if (!r) return;

    const modalName = document.getElementById('modal-name');
    const modalDept = document.getElementById('modal-dept');
    const modalDates = document.getElementById('modal-dates');
    const modalStatus = document.getElementById('modal-status');
    const modalTask = document.getElementById('modal-task');

    if (modalName) modalName.textContent = r.name;
    if (modalDept) modalDept.textContent = r.dept;
    if (modalDates) modalDates.textContent = `${r.start} to ${r.end}`;
    if (modalStatus) modalStatus.innerHTML = `<span class="status-badge ${r.status.toLowerCase()}">${r.status}</span>`;
    if (modalTask) modalTask.textContent = r.task;

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
        <h2>task details</h2>
        
        <div class="task-box" style="margin-bottom: 20px;">
            <strong>task:</strong> ${task.task}
        </div>

        <div style="background: #fdfdfd; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
            <h3>update progress</h3>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>completion: <strong id="progressValue">${progress}%</strong></span>
            </div>
            <input type="range" id="progressSlider" min="0" max="100" value="${progress}" 
                   style="width: 100%; margin-bottom: 15px;"
                   oninput="document.getElementById('progressValue').textContent = this.value + '%'">

            <label style="display:block; margin-bottom: 5px; font-weight:bold;">progress note:</label>
            <textarea id="progressNote" placeholder="what have you done so far?" 
                      style="width: 100%; height: 60px; padding: 8px; border-radius: 4px; border: 1px solid #ccc; margin-bottom: 15px;"></textarea>

            <button class="btn-approve" onclick="updateMyProgress(${task.id})" style="width: 100%; background: #149648;">
                <i class="fas fa-sync"></i> update progress
            </button>
        </div>

        <div class="action-buttons" style="margin-top: 20px; display: flex; gap: 10px;">
            <button class="btn-approve" onclick="markTaskComplete(${task.id})" style="flex: 1; background: #27ae60;">
                <i class="fas fa-check-double"></i> mark completed
            </button>
            <button class="btn-reject" onclick="deleteTask(${task.id})" style="flex: 1; background: #e74c3c;">
                <i class="fas fa-trash"></i> delete
            </button>
        </div>
    `;

    modal.style.display = 'block';
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
    if (confirm('are you sure you want to logout?')) {
        const logoutBtn = document.getElementById('log-btn');
        setLoading(true, logoutBtn, "logging out...");

        setTimeout(() => {
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }, 1000);
    }
}

// profile functions
async function saveProfile() {
    const saveBtn = document.querySelector('#profile-view .btn');
    setLoading(true, saveBtn, "saving...");

    const newName = document.getElementById('profileName').value.trim();
    const newEmail = document.getElementById('profileEmail').value.trim();

    if (!newName || !newEmail) {
        showToast('name and email are required', 'error');
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
            currentUser.name = newName;
            currentUser.email = newEmail;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserHeader();
            loadProfileData();
            showToast('profile updated successfully', 'success');
        } else {
            showToast(result.error || 'failed to update profile', 'error');
        }
    } catch (error) {
        console.error('profile update error:', error);
        showToast('server connection error', 'error');
    } finally {
        setLoading(false, saveBtn);
    }
}

function saveSettings() {
    const saveBtn = document.querySelector('#settings-view .btn');
    setLoading(true, saveBtn, "saving...");
    
    const emailNotif = document.getElementById('emailNotif').value;
    const reminderPref = document.getElementById('reminderPref').value;
    const langPref = document.getElementById('langPref').value;

    const settings = {
        emailNotif,
        reminderPref,
        langPref
    };

    localStorage.setItem('employeeSettings', JSON.stringify(settings));
    showToast('settings saved successfully', 'success');
    setLoading(false, saveBtn);
}

// close modal on outside click
window.onclick = (e) => {
    const modal = document.getElementById('reportModal');
    if (e.target === modal) closeModal();
};
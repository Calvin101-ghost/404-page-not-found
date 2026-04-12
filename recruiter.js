// ========== DATA STORAGE ==========
let jobs = [];
let applications = [];
let notifications = [];
let currentFilter = "all";
let searchTerm = "";
let currentSort = "date"; // date or applicants
let currentPage = 1;
const jobsPerPage = 5;
let selectedJobs = new Set();
let bulkMode = false;

// Sample notification
notifications = [
    { id: 1, title: "Welcome!", message: "Post your first opportunity using the button above", time: "Just now", read: false }
];

// ========== HELPER FUNCTIONS ==========
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function getApplicantCount(jobId) {
    let count = 0;
    for (let i = 0; i < applications.length; i++) {
        if (applications[i].jobId === jobId) count++;
    }
    return count;
}

function saveToLocalStorage() {
    localStorage.setItem('recruiter_jobs', JSON.stringify(jobs));
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem('recruiter_jobs');
    if (saved) {
        jobs = JSON.parse(saved);
    }
}

// ========== SORTING FUNCTION ==========
function sortJobs(jobsArray) {
    let sorted = [...jobsArray];
    if (currentSort === 'date') {
        sorted.sort(function(a, b) {
            return new Date(b.postedDate) - new Date(a.postedDate);
        });
    } else if (currentSort === 'applicants') {
        sorted.sort(function(a, b) {
            return getApplicantCount(b.id) - getApplicantCount(a.id);
        });
    }
    return sorted;
}

// ========== RENDER OPPORTUNITIES ==========
function renderOpportunities() {
    const container = document.getElementById('opportunitiesList');
    if (!container) return;
    
    let filteredJobs = jobs.filter(function(job) {
        const matchesSearch = searchTerm === "" || job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.location.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });
    
    filteredJobs = sortJobs(filteredJobs);
    
    const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
    const startIndex = (currentPage - 1) * jobsPerPage;
    const paginatedJobs = filteredJobs.slice(startIndex, startIndex + jobsPerPage);
    
    // Update pagination UI
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    if (paginatedJobs.length === 0) {
        if (jobs.length === 0) {
            container.innerHTML = `<div class="empty-state"><p>📌 You haven't posted any opportunities yet.</p><p>Click "Post New Opportunity" to create your first learnership.</p></div>`;
        } else {
            container.innerHTML = `<div class="empty-state"><p>🔍 No opportunities match "${searchTerm}"</p><p>Try a different search term.</p></div>`;
        }
        return;
    }
    
    let html = '';
    for (let i = 0; i < paginatedJobs.length; i++) {
        const job = paginatedJobs[i];
        const isSelected = selectedJobs.has(job.id);
        const statusClass = job.status === 'draft' ? 'draft' : (job.status === 'closed' ? 'closed' : 'active');
        const statusText = job.status === 'draft' ? '📝 Draft' : (job.status === 'closed' ? '🔒 Closed' : '✅ Active');
        
        html += `
            <div class="opportunity-card ${statusClass}">
                <div class="card-header">
                    ${bulkMode ? `<input type="checkbox" class="card-checkbox" data-id="${job.id}" ${isSelected ? 'checked' : ''}>` : ''}
                    <h3>${escapeHtml(job.title)}</h3>
                    <div>
                        <button class="duplicate-job-btn" onclick="duplicateJob(${job.id})" title="Duplicate">📋 Copy</button>
                        <button class="edit-job-btn" onclick="editJob(${job.id})">✏️ Edit</button>
                        <button class="delete-job-btn" onclick="confirmDeleteJob(${job.id})">🗑️ Delete</button>
                    </div>
                </div>
                <div class="opportunity-meta">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    <span class="applicant-count">👥 ${getApplicantCount(job.id)} applicants</span>
                    <button class="status-toggle" onclick="toggleJobStatus(${job.id})">${job.status === 'active' ? '🔒 Close' : (job.status === 'draft' ? '✅ Publish' : '✅ Reactivate')}</button>
                </div>
                <div class="location-info">📍 ${escapeHtml(job.location)}</div>
                <div class="stipend-info">💰 ${escapeHtml(job.stipend)}</div>
                <div class="closing-date">📅 Closing: ${job.closingDate}</div>
                <div class="action-buttons-group">
                    <button class="view-details-btn" onclick="viewJobDetails(${job.id})">View Details</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
    
    // Add checkbox event listeners
    if (bulkMode) {
        const checkboxes = document.querySelectorAll('.card-checkbox');
        for (let i = 0; i < checkboxes.length; i++) {
            checkboxes[i].addEventListener('change', function(e) {
                const id = parseInt(this.dataset.id);
                if (this.checked) {
                    selectedJobs.add(id);
                } else {
                    selectedJobs.delete(id);
                }
                updateBulkDeleteBar();
            });
        }
    }
}

function updateBulkDeleteBar() {
    const bar = document.getElementById('bulkDeleteBar');
    const countSpan = document.getElementById('selectedCount');
    if (bar && countSpan) {
        if (selectedJobs.size > 0) {
            bar.style.display = 'flex';
            countSpan.textContent = selectedJobs.size;
        } else {
            bar.style.display = 'none';
        }
    }
}

function toggleBulkMode() {
    bulkMode = !bulkMode;
    if (!bulkMode) {
        selectedJobs.clear();
        updateBulkDeleteBar();
    }
    renderOpportunities();
}

function bulkDelete() {
    if (selectedJobs.size === 0) return;
    
    const jobTitles = [];
    for (let id of selectedJobs) {
        const job = jobs.find(j => j.id === id);
        if (job) jobTitles.push(job.title);
        jobs = jobs.filter(j => j.id !== id);
        applications = applications.filter(app => app.jobId !== id);
    }
    
    notifications.unshift({
        id: Date.now(),
        title: "Bulk Delete",
        message: `You deleted ${selectedJobs.size} opportunities`,
        time: "Just now",
        read: false
    });
    
    selectedJobs.clear();
    bulkMode = false;
    updateBulkDeleteBar();
    renderOpportunities();
    renderApplications();
    renderNotifications();
    saveToLocalStorage();
    alert(`✅ Deleted ${jobTitles.length} opportunities`);
}

// ========== JOB STATUS FUNCTIONS ==========
function toggleJobStatus(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
        if (job.status === 'active') {
            job.status = 'closed';
            notifications.unshift({ id: Date.now(), title: "Job Closed", message: `You closed "${job.title}"`, time: "Just now", read: false });
        } else if (job.status === 'closed') {
            job.status = 'active';
            notifications.unshift({ id: Date.now(), title: "Job Reactivated", message: `You reactivated "${job.title}"`, time: "Just now", read: false });
        } else if (job.status === 'draft') {
            job.status = 'active';
            notifications.unshift({ id: Date.now(), title: "Job Published", message: `You published "${job.title}"`, time: "Just now", read: false });
        }
        saveToLocalStorage();
        renderOpportunities();
        renderNotifications();
    }
}

function duplicateJob(jobId) {
    const original = jobs.find(j => j.id === jobId);
    if (original) {
        const newJob = {
            ...original,
            id: Date.now(),
            title: original.title + " (Copy)",
            postedDate: new Date().toISOString().split('T')[0],
            status: 'draft'
        };
        jobs.push(newJob);
        saveToLocalStorage();
        renderOpportunities();
        notifications.unshift({ id: Date.now(), title: "Job Duplicated", message: `You duplicated "${original.title}"`, time: "Just now", read: false });
        renderNotifications();
        alert(`✅ "${original.title}" has been duplicated as a draft`);
    }
}

// ========== RENDER APPLICATIONS ==========
function renderApplications() {
    const container = document.getElementById('applicationsList');
    if (!container) return;
    
    if (applications.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>📭 No applications yet.</p><p>When students apply to your opportunities, they will appear here.</p></div>`;
        return;
    }
    
    let filteredApps = applications;
    if (currentFilter === 'pending') {
        filteredApps = applications.filter(app => app.status === 'pending');
    } else if (currentFilter === 'reviewed') {
        filteredApps = applications.filter(app => app.status === 'reviewed');
    }
    
    let html = `<table><thead><tr><th>Applicant Name</th><th>Opportunity</th><th>Applied Date</th><th>Qualifications</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
    for (let i = 0; i < filteredApps.length; i++) {
        const app = filteredApps[i];
        const job = jobs.find(j => j.id === app.jobId);
        const jobTitle = job ? job.title : 'Unknown';
        html += `<tr><td>${escapeHtml(app.applicantName)}</td><td>${escapeHtml(jobTitle)}</td><td>${app.appliedDate}</td><td>${escapeHtml(app.qualifications)}</td><td><span class="status-pending">${app.status}</span></td><td class="action-buttons"><button onclick="viewApplicant(${app.id})">👤 View</button><button onclick="shortlistApplicant(${app.id})">✓ Shortlist</button><button onclick="rejectApplicant(${app.id})">✗ Reject</button></td></tr>`;
    }
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>🔔 No new notifications.</p></div>`;
        return;
    }
    
    let html = '';
    for (let i = 0; i < notifications.length; i++) {
        const notif = notifications[i];
        const unreadClass = notif.read ? '' : 'unread';
        html += `<div class="notification-item ${unreadClass}"><div class="notification-content"><div class="notification-title">${escapeHtml(notif.title)}</div><div class="notification-message">${escapeHtml(notif.message)}</div><div class="notification-time">${escapeHtml(notif.time)}</div></div>${!notif.read ? `<button class="notification-read-btn" onclick="markNotificationRead(${notif.id})">Mark read</button>` : ''}</div>`;
    }
    container.innerHTML = html;
}

// ========== SEARCH ==========
function searchOpportunities() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchTerm = searchInput.value;
        currentPage = 1;
        renderOpportunities();
    }
}

// ========== SORT FUNCTIONS ==========
function setSortByDate() {
    currentSort = 'date';
    currentPage = 1;
    document.getElementById('sortByDateBtn').classList.add('active');
    document.getElementById('sortByApplicantsBtn').classList.remove('active');
    renderOpportunities();
}

function setSortByApplicants() {
    currentSort = 'applicants';
    currentPage = 1;
    document.getElementById('sortByApplicantsBtn').classList.add('active');
    document.getElementById('sortByDateBtn').classList.remove('active');
    renderOpportunities();
}

// ========== PAGINATION ==========
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderOpportunities();
    }
}

function nextPage() {
    const totalJobs = jobs.filter(function(job) {
        return searchTerm === "" || job.title.toLowerCase().includes(searchTerm.toLowerCase());
    }).length;
    const totalPages = Math.ceil(totalJobs / jobsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderOpportunities();
    }
}

// ========== TAB SWITCHING ==========
function switchTab(tab) {
    const opportunitiesSection = document.getElementById('opportunitiesSection');
    const applicationsSection = document.getElementById('applicationsSection');
    const notificationsSection = document.getElementById('notificationsSection');
    const btns = ['opportunitiesBtn', 'applicationsBtn', 'notificationsBtn'];
    
    opportunitiesSection.style.display = tab === 'opportunities' ? 'block' : 'none';
    applicationsSection.style.display = tab === 'applications' ? 'block' : 'none';
    notificationsSection.style.display = tab === 'notifications' ? 'block' : 'none';
    
    for (let i = 0; i < btns.length; i++) {
        const btn = document.getElementById(btns[i]);
        if (btn) btn.classList.remove('active');
    }
    document.getElementById(tab + 'Btn').classList.add('active');
    
    if (tab === 'opportunities') renderOpportunities();
    else if (tab === 'applications') renderApplications();
    else if (tab === 'notifications') renderNotifications();
}

// ========== FORM VALIDATION ==========
function validateJobForm() {
    const title = document.getElementById('jobTitle').value.trim();
    const location = document.getElementById('jobLocation').value.trim();
    const stipend = document.getElementById('jobStipend').value.trim();
    const duration = document.getElementById('jobDuration').value.trim();
    const closingDate = document.getElementById('jobClosingDate').value;
    const requirements = document.getElementById('jobRequirements').value.trim();
    
    if (!title || !location || !stipend || !duration || !closingDate || !requirements) {
        alert('Please fill in all required fields (*)');
        return false;
    }
    return true;
}

// ========== POST/SAVE JOB ==========
let editingJobId = null;

function openPostJobModal() {
    document.getElementById('postJobForm').reset();
    editingJobId = null;
    document.getElementById('modalTitle').textContent = 'Post New Opportunity';
    document.getElementById('submitJobBtn').textContent = 'Post Opportunity';
    document.getElementById('jobStatus').value = 'active';
    document.getElementById('postJobModal').style.display = 'flex';
}

function closePostJobModal() {
    document.getElementById('postJobModal').style.display = 'none';
}

function saveAsDraft() {
    const title = document.getElementById('jobTitle').value.trim();
    const location = document.getElementById('jobLocation').value.trim();
    const stipend = document.getElementById('jobStipend').value.trim();
    const duration = document.getElementById('jobDuration').value.trim();
    const closingDate = document.getElementById('jobClosingDate').value;
    const requirementsText = document.getElementById('jobRequirements').value.trim();
    const description = document.getElementById('jobDescription').value;
    
    if (!title && !location && !stipend && !duration && !closingDate && !requirementsText) {
        alert('Please fill at least some fields before saving as draft');
        return;
    }
    
    const requirements = requirementsText ? requirementsText.split('\n').filter(l => l.trim() !== '') : [];
    
    const draftJob = {
        id: editingJobId || Date.now(),
        title: title || 'Untitled Draft',
        location: location || 'TBD',
        stipend: stipend || 'TBD',
        duration: duration || 'TBD',
        closingDate: closingDate || '2026-12-31',
        requirements: requirements,
        description: description,
        postedDate: new Date().toISOString().split('T')[0],
        status: 'draft'
    };
    
    if (editingJobId) {
        const index = jobs.findIndex(j => j.id === editingJobId);
        if (index !== -1) jobs[index] = draftJob;
        notifications.unshift({ id: Date.now(), title: "Draft Updated", message: `You updated draft "${draftJob.title}"`, time: "Just now", read: false });
    } else {
        jobs.push(draftJob);
        notifications.unshift({ id: Date.now(), title: "Draft Saved", message: `You saved "${draftJob.title}" as draft`, time: "Just now", read: false });
    }
    
    saveToLocalStorage();
    closePostJobModal();
    switchTab('opportunities');
    renderNotifications();
    alert('💾 Job saved as draft!');
}

function postJob(event) {
    event.preventDefault();
    if (!validateJobForm()) return;
    
    const title = document.getElementById('jobTitle').value.trim();
    const location = document.getElementById('jobLocation').value.trim();
    const stipend = document.getElementById('jobStipend').value.trim();
    const duration = document.getElementById('jobDuration').value.trim();
    const closingDate = document.getElementById('jobClosingDate').value;
    const requirementsText = document.getElementById('jobRequirements').value.trim();
    const description = document.getElementById('jobDescription').value;
    const status = document.getElementById('jobStatus').value;
    
    const requirements = requirementsText.split('\n').filter(l => l.trim() !== '');
    
    const jobData = {
        id: editingJobId || Date.now(),
        title: title,
        location: location,
        stipend: stipend,
        duration: duration,
        closingDate: closingDate,
        requirements: requirements,
        description: description,
        postedDate: editingJobId ? jobs.find(j => j.id === editingJobId)?.postedDate || new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: status === 'draft' ? 'draft' : 'active'
    };
    
    if (editingJobId) {
        const index = jobs.findIndex(j => j.id === editingJobId);
        if (index !== -1) jobs[index] = jobData;
        notifications.unshift({ id: Date.now(), title: "Job Updated", message: `You updated "${title}"`, time: "Just now", read: false });
        alert('✅ Job updated successfully!');
    } else {
        jobs.push(jobData);
        notifications.unshift({ id: Date.now(), title: "Job Posted", message: `You posted "${title}"`, time: "Just now", read: false });
        alert('✅ Job posted successfully!');
    }
    
    saveToLocalStorage();
    closePostJobModal();
    switchTab('opportunities');
    renderNotifications();
    editingJobId = null;
}

function editJob(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    editingJobId = jobId;
    document.getElementById('jobTitle').value = job.title;
    document.getElementById('jobLocation').value = job.location;
    document.getElementById('jobStipend').value = job.stipend;
    document.getElementById('jobDuration').value = job.duration;
    document.getElementById('jobClosingDate').value = job.closingDate;
    document.getElementById('jobRequirements').value = job.requirements.join('\n');
    document.getElementById('jobDescription').value = job.description || '';
    document.getElementById('jobStatus').value = job.status || 'active';
    document.getElementById('modalTitle').textContent = 'Edit Opportunity';
    document.getElementById('submitJobBtn').textContent = 'Update Opportunity';
    document.getElementById('postJobModal').style.display = 'flex';
}

function confirmDeleteJob(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (job && confirm(`Are you sure you want to delete "${job.title}"?`)) {
        jobs = jobs.filter(j => j.id !== jobId);
        applications = applications.filter(app => app.jobId !== jobId);
        saveToLocalStorage();
        renderOpportunities();
        renderApplications();
        notifications.unshift({ id: Date.now(), title: "Job Deleted", message: `You deleted "${job.title}"`, time: "Just now", read: false });
        renderNotifications();
        alert(`✅ "${job.title}" deleted.`);
    }
}

function viewJobDetails(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    let reqText = '';
    for (let i = 0; i < job.requirements.length; i++) reqText += '\n✓ ' + job.requirements[i];
    alert(`📋 ${job.title}\n\n📍 ${job.location}\n💰 ${job.stipend}\n📅 ${job.duration}\n📆 Closing: ${job.closingDate}\n👥 ${getApplicantCount(job.id)} applicants\nStatus: ${job.status}\n\nREQUIREMENTS:${reqText}\n\n📝 ${job.description || 'No description'}`);
}

function viewApplicant(appId) {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    alert(`👤 ${app.applicantName}\n📋 ${app.opportunityTitle}\n📅 ${app.appliedDate}\n📚 ${app.qualifications}\nStatus: ${app.status}`);
}

function shortlistApplicant(appId) {
    const app = applications.find(a => a.id === appId);
    if (app) {
        app.status = 'shortlisted';
        renderApplications();
        notifications.unshift({ id: Date.now(), title: "Shortlisted", message: `You shortlisted ${app.applicantName}`, time: "Just now", read: false });
        renderNotifications();
        alert(`✅ ${app.applicantName} shortlisted`);
    }
}

function rejectApplicant(appId) {
    const app = applications.find(a => a.id === appId);
    if (app) {
        app.status = 'rejected';
        renderApplications();
        notifications.unshift({ id: Date.now(), title: "Rejected", message: `You rejected ${app.applicantName}`, time: "Just now", read: false });
        renderNotifications();
        alert(`❌ ${app.applicantName} rejected`);
    }
}

function markNotificationRead(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) notif.read = true;
    renderNotifications();
}

function markAllNotificationsRead() {
    for (let i = 0; i < notifications.length; i++) notifications[i].read = true;
    renderNotifications();
    alert('All marked as read');
}

function exportJobsToCSV() {
    if (jobs.length === 0) { alert('No jobs to export'); return; }
    let csv = "Job Title,Location,Stipend,Duration,Closing Date,Posted Date,Status,Applicants,Requirements\n";
    for (let job of jobs) {
        csv += `"${job.title}","${job.location}","${job.stipend}","${job.duration}","${job.closingDate}","${job.postedDate}","${job.status}",${getApplicantCount(job.id)},"${job.requirements.join('; ')}"\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`✅ Exported ${jobs.length} jobs`);
}

// ========== DARK MODE ==========
function toggleDarkMode() {
    const body = document.body;
    const themeBtn = document.getElementById('themeToggleBtn');
    if (body.getAttribute('data-theme') === 'dark') {
        body.setAttribute('data-theme', 'light');
        themeBtn.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '☀️';
    }
}

// ========== CHARACTER COUNTER ==========
function setupCharCounter() {
    const textarea = document.getElementById('jobRequirements');
    const counter = document.getElementById('charCounter');
    if (textarea && counter) {
        textarea.addEventListener('input', function() {
            const count = this.value.length;
            counter.textContent = count + ' characters';
            counter.style.color = count > 500 ? 'orange' : 'green';
        });
    }
}

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    
    document.getElementById('opportunitiesBtn').addEventListener('click', () => switchTab('opportunities'));
    document.getElementById('applicationsBtn').addEventListener('click', () => switchTab('applications'));
    document.getElementById('notificationsBtn').addEventListener('click', () => switchTab('notifications'));
    document.getElementById('searchInput').addEventListener('keyup', searchOpportunities);
    document.getElementById('postJobBtn').addEventListener('click', openPostJobModal);
    document.getElementById('closeModalBtn').addEventListener('click', closePostJobModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closePostJobModal);
    document.getElementById('postJobForm').addEventListener('submit', postJob);
    document.getElementById('saveDraftBtn').addEventListener('click', saveAsDraft);
    document.getElementById('markAllReadBtn').addEventListener('click', markAllNotificationsRead);
    document.getElementById('exportJobsBtn').addEventListener('click', exportJobsToCSV);
    document.getElementById('sortByDateBtn').addEventListener('click', setSortByDate);
    document.getElementById('sortByApplicantsBtn').addEventListener('click', setSortByApplicants);
    document.getElementById('prevPageBtn').addEventListener('click', prevPage);
    document.getElementById('nextPageBtn').addEventListener('click', nextPage);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleDarkMode);
    document.getElementById('bulkDeleteBtn').addEventListener('click', bulkDelete);
    document.getElementById('cancelBulkBtn').addEventListener('click', () => toggleBulkMode());
    
    const filterAll = document.getElementById('filterAll');
    const filterPending = document.getElementById('filterPending');
    const filterReviewed = document.getElementById('filterReviewed');
    if (filterAll) filterAll.addEventListener('click', () => { currentFilter = 'all'; renderApplications(); });
    if (filterPending) filterPending.addEventListener('click', () => { currentFilter = 'pending'; renderApplications(); });
    if (filterReviewed) filterReviewed.addEventListener('click', () => { currentFilter = 'reviewed'; renderApplications(); });
    
    const dropdownTrigger = document.getElementById('dropdownTrigger');
    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownTrigger) {
        dropdownTrigger.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });
    }
    document.addEventListener('click', function() {
        if (dropdownMenu) dropdownMenu.classList.remove('show');
    });
    
    const profileBtn = document.getElementById('profileBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const privacyBtn = document.getElementById('privacyBtn');
    const helpBtn = document.getElementById('helpBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    if (profileBtn) profileBtn.addEventListener('click', (e) => { e.preventDefault(); alert('Profile - Sprint 2'); });
    if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.preventDefault(); alert('Settings - Sprint 2'); });
    if (privacyBtn) privacyBtn.addEventListener('click', (e) => { e.preventDefault(); alert('Privacy - Sprint 2'); });
    if (helpBtn) helpBtn.addEventListener('click', (e) => { e.preventDefault(); alert('Help - Sprint 2'); });
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); alert('Logged out'); });
    
    setupCharCounter();
    switchTab('opportunities');
});
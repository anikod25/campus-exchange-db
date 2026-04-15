const API_BASE = "http://localhost:8000";
const USE_MOCK = false;

const ADMIN_CREDENTIALS = {
    email: "admin@campus.com",
    password: "admin123"
};

let currentUser = null;

function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

async function handleFetchError(response) {
    try {
        const err = await response.json();
        const rawMsg = err.message || "";
        const allowedMsgs = [
            "Student has reached the maximum active borrow limit of 3.",
            "Student is already on the waitlist for this resource.",
            "A student cannot borrow a resource from themselves.",
            "Resource is not available for borrowing.",
            "This transaction has already been returned."
        ];
        const msg = allowedMsgs.includes(rawMsg) ? rawMsg : "Something went wrong. Please try again.";
        showToast(msg, "error");
    } catch (e) {
        showToast("Something went wrong. Please try again.", "error");
    }
}

// App Logic - Navigation & Initialization

document.addEventListener('DOMContentLoaded', () => {
    
    // Select all navigation links and page sections
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    /**
     * Handles switching the active view
     * @param {string} targetId The ID of the section to show
     */
    function navigateTo(targetId) {
        // 1. Hide all sections and remove active classes
        sections.forEach(section => {
            section.classList.add('hidden');
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // 2. Show the targeted section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // 3. Highlight the correct nav link
        const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // Attach click listeners to sidebar links
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            // Navigate and update the URL hash
            navigateTo(targetId);
            window.location.hash = targetId;
            
            if (targetId === 'dashboard') {
                loadDashboard();
            } else if (targetId === 'resources') {
                loadResources();
            } else if (targetId === 'add-resource') {
                loadAddResource();
            } else if (targetId === 'transactions') {
                loadTransactions();
            } else if (targetId === 'waitlist') {
                loadWaitlist();
            } else if (targetId === 'students') {
                loadStudents();
            }
        });
    });

    // Check if the page loaded with a specific hash (e.g. #resources)
    // If not, default to 'dashboard'
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(initialHash)) {
        navigateTo(initialHash);
        if (initialHash === 'dashboard') loadDashboard();
    } else {
        navigateTo('dashboard');
        loadDashboard();
        // Clear empty hash to ensure consistent state
        if (!initialHash) {
             window.history.replaceState(null, null, ' ');
        }
    }
    
    // Update navigation if the user uses browser back/forward buttons
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            navigateTo(hash);
            if (hash === 'dashboard') loadDashboard();
            if (hash === 'resources') loadResources();
            if (hash === 'add-resource') loadAddResource();
            if (hash === 'transactions') loadTransactions();
            if (hash === 'waitlist') loadWaitlist();
            if (hash === 'students') loadStudents();
        } else {
            navigateTo('dashboard');
            loadDashboard();
        }
    });

    // --- Resources Tab Logic ---
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    const filterCondition = document.getElementById('filter-condition');
    const resourcesTbody = document.getElementById('resources-tbody');

    // Attach event listeners to filters to re-render when changed
    if(filterCategory && filterStatus && filterCondition) {
        filterCategory.addEventListener('change', loadResources);
        filterStatus.addEventListener('change', loadResources);
        filterCondition.addEventListener('change', loadResources);
    }

    async function loadDashboard() {
        const dashboardSection = document.getElementById('dashboard');
        if (!dashboardSection) return;

        let statsData = null;
        let transData = [];
        let overdueData = [];

        if (USE_MOCK) {
            statsData = MOCK_STATS;
            transData = MOCK_TRANSACTIONS.slice(0, 5);
            overdueData = MOCK_TRANSACTIONS.filter(tx => !tx.return_date && new Date(tx.due_date) < new Date());
        } else {
            try {
                const isAdmin = currentUser && currentUser.role === "admin";
                const userId = currentUser ? currentUser.std_id : null;
                
                const statsRes = fetch(`${API_BASE}/dashboard/stats`);
                
                // Build transactions URL with user filtering
                const transUrl = new URL(`${API_BASE}/transactions/`);
                if (userId) {
                    transUrl.searchParams.append('user_id', userId);
                    transUrl.searchParams.append('is_admin', isAdmin);
                }
                const transRes = fetch(transUrl.toString());
                
                const overdueRes = fetch(`${API_BASE}/transactions/overdue`);
                
                const [statsResolved, transResolved, overdueResolved] = await Promise.all([statsRes, transRes, overdueRes]);
                
                if (!statsResolved.ok || !transResolved.ok || !overdueResolved.ok) {
                    showToast("Something went wrong. Please try again.", "error");
                    statsData = { total_resources: 0, available: 0, borrowed: 0, total_students: 0 };
                } else {
                    statsData = await statsResolved.json();
                    transData = await transResolved.json();
                    overdueData = await overdueResolved.json();
                }
            } catch (err) {
                console.error(err);
                showToast("Something went wrong. Please try again.", "error");
                statsData = { total_resources: 0, available: 0, borrowed: 0, total_students: 0 };
                transData = [];
                overdueData = [];
            }
        }

        // 1. Generate Stat Cards HTML
        const statsHtml = `
            <h2>Dashboard</h2>
            <div class="stat-card-container">
                <div class="stat-card">
                    <span class="stat-label">Total Resources</span>
                    <div class="stat-number">${statsData.total_resources || 0}</div>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Available</span>
                    <div class="stat-number">${statsData.available || 0}</div>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Borrowed</span>
                    <div class="stat-number">${statsData.borrowed || 0}</div>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Total Students</span>
                    <div class="stat-number">${statsData.total_students || 0}</div>
                </div>
            </div>
        `;

        // 2. Generate Transactions Table HTML
        let transRowsHtml = '';
        if (transData.length === 0) {
            transRowsHtml = '<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No recent transactions.</td></tr>';
        } else {
            transData.forEach(tx => {
                const status = getTxStatus(tx);
                const badgeClass = status === 'active' ? 'badge-available' : `badge-${status}`;
                transRowsHtml += `
                    <tr>
                        <td><strong>${tx.resource_title}</strong></td>
                        <td>${tx.sender_name}</td>
                        <td>${tx.receiver_name}</td>
                        <td>${tx.issue_date}</td>
                        <td>${tx.due_date}</td>
                        <td><span class="badge ${badgeClass}">${status}</span></td>
                    </tr>
                `;
            });
        }

        const tableHtml = `
            <div>
                <h3 style="margin-bottom: 1rem; font-family: 'Playfair Display', serif; font-weight: 600; color: var(--text-main);">Recent Transactions</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Resource</th>
                                <th>Sender</th>
                                <th>Receiver</th>
                                <th>Issue Date</th>
                                <th>Due Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${transRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 2.5 Generate Overdue Report HTML
        let overdueRowsHtml = '';
        if (overdueData.length === 0) {
            overdueRowsHtml = '<tr><td colspan="6" style="text-align:center; padding: 1rem;"><p style="color: var(--status-returned); font-weight: 500; margin: 0;">No overdue items</p></td></tr>';
        } else {
            overdueData.forEach(tx => {
                const daysOverdue = Math.floor((new Date() - new Date(tx.due_date)) / (1000 * 60 * 60 * 24));
                overdueRowsHtml += `
                    <tr>
                        <td>${tx.receiver_name}</td>
                        <td><strong>${tx.resource_title}</strong></td>
                        <td>${tx.issue_date}</td>
                        <td>${tx.due_date}</td>
                        <td>${daysOverdue}</td>
                        <td><span class="badge badge-overdue">Overdue</span></td>
                    </tr>
                `;
            });
        }

        const overdueHtml = `
            <div style="margin-top: 2rem;">
                <h3 style="margin-bottom: 1rem; font-family: 'Playfair Display', serif; font-weight: 600; color: var(--text-main);">Overdue Report</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Borrower</th>
                                <th>Resource</th>
                                <th>Issue Date</th>
                                <th>Due Date</th>
                                <th>Days Overdue</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${overdueRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // 3. Render into #dashboard
        dashboardSection.innerHTML = statsHtml + tableHtml + overdueHtml;
    }

    async function loadResources() {
        if (!resourcesTbody) return;
        
        let data = [];
        if (USE_MOCK) {
            data = MOCK_RESOURCES;
        } else {
            try {
                const response = await fetch(`${API_BASE}/resources/`);
                if (!response.ok) {
                    await handleFetchError(response);
                    return;
                }
                data = await response.json();
            } catch (err) {
                console.error(err);
                showToast("Something went wrong. Please try again.", "error");
                return;
            }
        }

        // 1. Get filter values
        const catValue = filterCategory.value;
        const statValue = filterStatus.value;
        const condValue = filterCondition.value;

        // 2. Filter mock data
        const filtered = data.filter(res => {
            const matchCategory = catValue === 'All' || res.category === catValue;
            const matchStatus = statValue === 'All' || res.curr_status === statValue;
            const matchCondition = condValue === 'All' || res.item_condition === condValue;
            return matchCategory && matchStatus && matchCondition;
        });

        // 3. Render Table
        resourcesTbody.innerHTML = ''; // clear current rows
        
        if (filtered.length === 0) {
            resourcesTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--text-muted);">No resources match your filters.</td></tr>';
            return;
        }

        filtered.forEach(res => {
            const tr = document.createElement('tr');
            
            // Generate Action button based on status
            let actionHtml = '';
            if (res.curr_status === 'available') {
                actionHtml = `<button class="btn btn-primary btn-borrow" data-id="${res.res_id}">Borrow</button>`;
            } else {
                actionHtml = `<button class="btn btn-outline btn-waitlist" data-id="${res.res_id}">Join Waitlist</button>`;
            }

            tr.innerHTML = `
                <td><strong>${res.title}</strong></td>
                <td>${res.author_model || '-'}</td>
                <td>${res.category}</td>
                <td><span class="badge badge-${res.item_condition}">${res.item_condition}</span></td>
                <td><span class="badge badge-${res.curr_status}">${res.curr_status}</span></td>
                <td>${res.donor_name}</td>
                <td>${actionHtml}</td>
            `;
            resourcesTbody.appendChild(tr);
        });

        // 4. Attach temporary action listeners
        document.querySelectorAll('.btn-borrow').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const res_id = parseInt(e.target.getAttribute('data-id'));
                
                if (!currentUser) {
                    showToast("Please log in first.", "error");
                    return;
                }
                
                if (USE_MOCK) {
                    showToast("Borrow request submitted!");
                } else {
                    try {
                        // Fetch the resource to get donor_id
                        const resourceRes = await fetch(`${API_BASE}/resources/${res_id}`);
                        if (!resourceRes.ok) {
                            showToast("Resource not found.", "error");
                            return;
                        }
                        const resource = await resourceRes.json();
                        
                        const response = await fetch(`${API_BASE}/transactions/borrow`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                                res_id: res_id, 
                                sender_id: currentUser.std_id,  // Borrower making the request
                                receiver_id: resource.donor_id,  // Donor/lender of the resource
                                due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0] 
                            })
                        });
                        if (!response.ok) {
                            await handleFetchError(response);
                        } else {
                            showToast("Borrow request submitted!");
                            // Reload all relevant views
                            loadResources();
                            loadDashboard();
                            if (transactionsTbody) loadTransactions();
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Something went wrong. Please try again.", "error");
                    }
                }
            });
        });

        document.querySelectorAll('.btn-waitlist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const res_id = e.target.getAttribute('data-id');
                
                if (!currentUser) {
                    showToast("Please log in first.", "error");
                    return;
                }
                
                if (USE_MOCK) {
                    showToast("Added to waitlist!");
                } else {
                    try {
                        const response = await fetch(`${API_BASE}/transactions/waitlist`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ res_id: parseInt(res_id), stud_id: currentUser.std_id })
                        });
                        if (!response.ok) {
                            await handleFetchError(response);
                        } else {
                            showToast("Added to waitlist!");
                            loadResources();
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Something went wrong. Please try again.", "error");
                    }
                }
            });
        });
    }

    // Call conditionally on initial load if starting on resources
    if (initialHash === 'resources') {
        loadResources();
    }

    // --- Add Resource Tab Logic ---
    const addResourceForm = document.getElementById('add-resource-form');
    const resTitle = document.getElementById('res-title');
    const resAuthor = document.getElementById('res-author');
    const resCategory = document.getElementById('res-category');
    const resCondition = document.getElementById('res-condition');
    const resDonor = document.getElementById('res-donor');
    const resSubmitBtn = document.getElementById('res-submit-btn');

    function checkAddResourceForm() {
        if (!addResourceForm) return;
        const isValid = resTitle.value.trim() !== '' && 
                        resCategory.value !== '' && 
                        resCondition.value !== '' && 
                        resDonor.value !== '';
        
        resSubmitBtn.disabled = !isValid;
    }

    if (addResourceForm) {
        // Attach listeners to check validity
        resTitle.addEventListener('input', checkAddResourceForm);
        resCategory.addEventListener('change', checkAddResourceForm);
        resCondition.addEventListener('change', checkAddResourceForm);
        resDonor.addEventListener('change', checkAddResourceForm);

        addResourceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const data = {
                title: resTitle.value.trim(),
                author_model: resAuthor.value.trim() || null,
                category: resCategory.value,
                condition: resCondition.value,
                donor_id: parseInt(resDonor.value, 10)
            };

            if (USE_MOCK) {
                const newRes = {
                    res_id: Date.now(), // mockup ID
                    title: data.title,
                    author_model: data.author_model,
                    category: data.category,
                    donor_id: data.donor_id,
                    donor_name: resDonor.options[resDonor.selectedIndex].text,
                    curr_status: "available",
                    item_condition: data.condition
                };
                MOCK_RESOURCES.push(newRes);
                showToast("Resource added successfully!");
                addResourceForm.reset();
                checkAddResourceForm();
                
                // Navigate to resources to show it
                document.querySelector('.nav-link[data-target="resources"]').click();
            } else {
                try {
                    const response = await fetch(`${API_BASE}/resources/donate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        await handleFetchError(response);
                    } else {
                        showToast("Resource added successfully!");
                        addResourceForm.reset();
                        checkAddResourceForm();
                        
                        // Navigate to resources to show it
                        document.querySelector('.nav-link[data-target="resources"]').click();
                    }
                } catch (err) {
                    console.error(err);
                    showToast("Something went wrong. Please try again.", "error");
                }
            }
        });
    }

    async function loadAddResource() {
        if (!resDonor) return;
        resDonor.innerHTML = '<option value="">Select Donor</option>';
        
        try {
            const students = USE_MOCK ? MOCK_STUDENTS : await fetch(`${API_BASE}/students/`).then(r => r.json());
            
            // Remove duplicates based on std_id
            const uniqueStudents = [];
            const seenIds = new Set();
            students.forEach(student => {
                if (!seenIds.has(student.std_id)) {
                    seenIds.add(student.std_id);
                    uniqueStudents.push(student);
                }
            });
            
            uniqueStudents.forEach(student => {
                const opt = document.createElement('option');
                opt.value = student.std_id;
                opt.textContent = student.name;
                resDonor.appendChild(opt);
            });
        } catch (err) {
            console.error(err);
            showToast("Error loading donors.", "error");
        }
    }

    // Call conditionally on initial load if starting on add-resource
    if (initialHash === 'add-resource') {
        loadAddResource();
    }

    // --- Transactions Tab Logic ---
    const transactionsTbody = document.getElementById('transactions-tbody');

    function getTxStatus(tx) {
        if (tx.return_date) return "returned";
        if (tx.due_date && new Date(tx.due_date) < new Date()) return "overdue";
        return "active";
    }

    async function loadTransactions() {
        if (!transactionsTbody) return;

        let data = [];
        if (USE_MOCK) {
            data = MOCK_TRANSACTIONS;
        } else {
            try {
                const isAdmin = currentUser && currentUser.role === "admin";
                const userId = currentUser ? currentUser.std_id : null;
                
                console.log(`Loading transactions - User: ${userId}, Role: ${currentUser ? currentUser.role : 'none'}, Admin: ${isAdmin}`);
                
                const url = new URL(`${API_BASE}/transactions/`);
                if (userId) {
                    url.searchParams.append('user_id', userId);
                    url.searchParams.append('is_admin', isAdmin);
                }
                
                console.log(`Fetching from: ${url.toString()}`);
                
                const response = await fetch(url.toString());
                if (!response.ok) {
                    console.error(`Failed to fetch transactions: ${response.status}`);
                    await handleFetchError(response);
                    return;
                }
                data = await response.json();
                console.log(`Received ${data.length} transactions`);
            } catch (err) {
                console.error("Error loading transactions:", err);
                showToast("Something went wrong. Please try again.", "error");
                return;
            }
        }

        transactionsTbody.innerHTML = ''; // clear current rows

        if (data.length === 0) {
            transactionsTbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 2rem; color: var(--text-muted);">No transactions found.</td></tr>';
            return;
        }

        data.forEach(tx => {
            const tr = document.createElement('tr');
            
            const status = getTxStatus(tx);
            // active status uses the teal styling
            const badgeClass = status === 'active' ? 'badge-available' : `badge-${status}`;

            // Action column: only show if user is involved in the transaction
            let actionHtml = '';
            if ((status === 'active' || status === 'overdue') && currentUser) {
                const isCurrentUserBorrower = tx.sender_id === currentUser.std_id;
                const isCurrentUserDonor = tx.receiver_id === currentUser.std_id;
                
                // Borrower can return
                if (isCurrentUserBorrower) {
                    actionHtml = `<button class="btn btn-outline btn-return" data-id="${tx.tran_id}">Mark Returned</button>`;
                }
                // Donor can validate borrowing (acknowledge receipt)
                else if (isCurrentUserDonor && status === 'active') {
                    const isValidated = tx.validated === 1 || tx.validated === true;
                    if (!isValidated) {
                        actionHtml = `<button class="btn btn-outline btn-validate" data-id="${tx.tran_id}" style="color: #27ae60;">Confirm Borrowed</button>`;
                    } else {
                        actionHtml = `<span style="color: #27ae60; font-weight: 500;">✓ Confirmed</span>`;
                    }
                }
            }

            tr.innerHTML = `
                <td>${tx.tran_id}</td>
                <td>${tx.resource_title}</td>
                <td>${tx.sender_name}</td>
                <td>${tx.receiver_name}</td>
                <td>${tx.issue_date}</td>
                <td>${tx.due_date}</td>
                <td>${tx.return_date || '-'}</td>
                <td><span class="badge ${badgeClass}">${status}</span></td>
                <td>${actionHtml}</td>
            `;
            transactionsTbody.appendChild(tr);
        });

        // Attach action listeners
        document.querySelectorAll('.btn-return').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tran_id = e.target.getAttribute('data-id');
                if (USE_MOCK) {
                    showToast("Resource marked as returned!");
                    loadTransactions();
                    loadResources();
                } else {
                    try {
                        const response = await fetch(`${API_BASE}/transactions/return/${tran_id}`, {
                            method: "POST"
                        });
                        if (!response.ok) {
                            await handleFetchError(response);
                        } else {
                            showToast("Resource marked as returned!");
                            loadTransactions();
                            loadResources();
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Something went wrong. Please try again.", "error");
                    }
                }
            });
        });
        
        // Attach listeners for donor validation buttons
        document.querySelectorAll('.btn-validate').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const tran_id = e.target.getAttribute('data-id');
                if (USE_MOCK) {
                    showToast("Borrowing confirmed!");
                    loadTransactions();
                } else {
                    try {
                        const response = await fetch(`${API_BASE}/transactions/validate/${tran_id}`, {
                            method: "POST"
                        });
                        if (!response.ok) {
                            await handleFetchError(response);
                        } else {
                            showToast("Borrowing confirmed!");
                            loadTransactions();
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Something went wrong. Please try again.", "error");
                    }
                }
            });
        });
    }

    // Call conditionally on initial load if starting on transactions
    if (initialHash === 'transactions') {
        loadTransactions();
    }

    // --- Waitlist Tab Logic ---
    const waitlistTbody = document.getElementById('waitlist-tbody');

    async function loadWaitlist() {
        if (!waitlistTbody) return;

        let data = [];
        if (USE_MOCK) {
            data = MOCK_WAITLIST;
        } else {
            try {
                const response = await fetch(`${API_BASE}/transactions/waitlist`);
                if (!response.ok) {
                    await handleFetchError(response);
                    return;
                }
                data = await response.json();
            } catch (err) {
                console.error(err);
                showToast("Something went wrong. Please try again.", "error");
                return;
            }
        }

        waitlistTbody.innerHTML = ''; // clear current rows

        if (data.length === 0) {
            waitlistTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No waitlist entries found.</td></tr>';
            return;
        }

        // Sort by priority ascending (1 is highest)
        const sortedWaitlist = [...data].sort((a, b) => a.priority - b.priority);

        sortedWaitlist.forEach(entry => {
            const tr = document.createElement('tr');
            
            // Subtle highlight for priority 1 (light yellow/green background)
            if (entry.priority === 1) {
                tr.style.backgroundColor = 'rgba(250, 204, 21, 0.15)'; 
            }

            const actionHtml = `<button class="btn btn-outline btn-remove-waitlist" data-id="${entry.waitlist_id}">Remove</button>`;

            tr.innerHTML = `
                <td><strong>${entry.priority}</strong></td>
                <td>${entry.resource_title}</td>
                <td>${entry.student_name}</td>
                <td>${entry.reg_date}</td>
                <td>${actionHtml}</td>
            `;
            waitlistTbody.appendChild(tr);
        });

        // Attach action listeners
        document.querySelectorAll('.btn-remove-waitlist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const waitlist_id = e.target.getAttribute('data-id');
                if (USE_MOCK) {
                    showToast("Removed from waitlist!");
                    loadWaitlist();
                } else {
                    try {
                        const response = await fetch(`${API_BASE}/transactions/waitlist/${waitlist_id}`, {
                            method: "DELETE"
                        });
                        if (!response.ok) {
                            await handleFetchError(response);
                        } else {
                            showToast("Removed from waitlist!");
                            loadWaitlist();
                        }
                    } catch (err) {
                        console.error(err);
                        showToast("Something went wrong. Please try again.", "error");
                    }
                }
            });
        });
    }

    // Call conditionally on initial load if starting on waitlist
    if (initialHash === 'waitlist') {
        loadWaitlist();
    }

    // --- Students Tab Logic ---
    async function loadStudents() {
        const studentsSection = document.getElementById('students');
        if (!studentsSection) return;

        let studentsData = [];
        let deptsData = [];

        if (USE_MOCK) {
            studentsData = MOCK_STUDENTS;
            deptsData = MOCK_DEPARTMENTS;
        } else {
            try {
                const [studRes, deptRes] = await Promise.all([
                    fetch(`${API_BASE}/students/`),
                    fetch(`${API_BASE}/departments`)
                ]);
                if (!studRes.ok || !deptRes.ok) {
                    showToast("Something went wrong loading students.", "error");
                    return;
                }
                studentsData = await studRes.json();
                deptsData = await deptRes.json();
            } catch (err) {
                console.error(err);
                showToast("Something went wrong. Please try again.", "error");
                return;
            }
        }

        // Build Dept Options
        let deptOptionsHtml = '<option value="">Select Department</option>';
        deptsData.forEach(dept => {
            deptOptionsHtml += `<option value="${dept.dept_id}">${dept.dept_name}</option>`;
        });

        // Build form HTML
        const formHtml = `
            <h2>Students</h2>
            <div class="card" style="max-width: 600px; margin-bottom: 2rem;">
                <form id="add-student-form" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="display: flex; gap: 1rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
                            <label for="std-id" class="stat-label">Student ID *</label>
                            <input type="number" id="std-id" required style="padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border); font-family: inherit;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 2;">
                            <label for="std-name" class="stat-label">Full Name *</label>
                            <input type="text" id="std-name" required style="padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border); font-family: inherit;">
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <label for="std-email" class="stat-label">Email *</label>
                        <input type="email" id="std-email" required style="padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border); font-family: inherit;">
                    </div>
                    <div style="display: flex; gap: 1rem;">
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 1;">
                            <label for="std-year" class="stat-label">Year of Study *</label>
                            <select id="std-year" required style="padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border); font-family: inherit;">
                                <option value="">Select Year</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem; flex: 2;">
                            <label for="std-dept" class="stat-label">Department *</label>
                            <select id="std-dept" required style="padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border); font-family: inherit;">
                                ${deptOptionsHtml}
                            </select>
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <button type="submit" id="std-submit-btn" class="btn btn-primary" disabled style="width: 100%; padding: 0.875rem; font-size: 1rem;">Add Student</button>
                    </div>
                </form>
            </div>
        `;

        // Build Table HTML
        let tableRowsHtml = '';
        if (studentsData.length === 0) {
            tableRowsHtml = '<tr><td colspan="5" style="text-align:center; padding: 2rem; color: var(--text-muted);">No students found.</td></tr>';
        } else {
            studentsData.forEach(std => {
                const dept = deptsData.find(d => d.dept_id === std.dept_id);
                const deptName = dept ? dept.dept_name : std.dept_name || '-';
                tableRowsHtml += `
                    <tr>
                        <td>${std.std_id}</td>
                        <td><strong>${std.name}</strong></td>
                        <td>${std.mail_id}</td>
                        <td>${std.year_of_study}</td>
                        <td>${deptName}</td>
                    </tr>
                `;
            });
        }

        const tableHtml = `
            <div>
                <h3 style="margin-bottom: 1rem; font-family: 'Playfair Display', serif; font-weight: 600; color: var(--text-main);">Student List</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Year</th>
                                <th>Department</th>
                            </tr>
                        </thead>
                        <tbody id="students-tbody">
                            ${tableRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        studentsSection.innerHTML = formHtml + tableHtml;

        // Attach listeners for the form
        const addStudentForm = document.getElementById('add-student-form');
        const stdId = document.getElementById('std-id');
        const stdName = document.getElementById('std-name');
        const stdEmail = document.getElementById('std-email');
        const stdYear = document.getElementById('std-year');
        const stdDept = document.getElementById('std-dept');
        const stdSubmitBtn = document.getElementById('std-submit-btn');

        function checkFormValidity() {
            const isValid = stdId.value.trim() !== '' &&
                            stdName.value.trim() !== '' &&
                            stdEmail.value.trim() !== '' &&
                            stdYear.value !== '' &&
                            stdDept.value !== '';
            stdSubmitBtn.disabled = !isValid;
        }

        stdId.addEventListener('input', checkFormValidity);
        stdName.addEventListener('input', checkFormValidity);
        stdEmail.addEventListener('input', checkFormValidity);
        stdYear.addEventListener('change', checkFormValidity);
        stdDept.addEventListener('change', checkFormValidity);

        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                std_id: parseInt(stdId.value, 10),
                name: stdName.value.trim(),
                mail_id: stdEmail.value.trim(),
                password: "changeme123",
                year_of_study: parseInt(stdYear.value, 10),
                dept_id: parseInt(stdDept.value, 10)
            };

            if (USE_MOCK) {
                // Optionally add dept_name to data so it doesn't just read from dept list if missing
                const d = MOCK_DEPARTMENTS.find(dept => dept.dept_id === data.dept_id);
                if (d) data.dept_name = d.dept_name;

                MOCK_STUDENTS.push(data);
                showToast("Student added successfully!");
                loadStudents(); // Re-render table and form
            } else {
                try {
                    const response = await fetch(`${API_BASE}/students/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        await handleFetchError(response);
                    } else {
                        showToast("Student added successfully!");
                        loadStudents(); // Re-render table and form
                    }
                } catch (err) {
                    console.error(err);
                    showToast("Something went wrong. Please try again.", "error");
                }
            }
        });
    }

    if (initialHash === 'students') {
        loadStudents();
    }

    // --- Authentication & Registration Logic ---
    async function initRegisterForm() {
        const regDept = document.getElementById("reg-dept");
        if (!regDept) return;
        
        let deptsData = [];
        if (USE_MOCK) {
            deptsData = MOCK_DEPARTMENTS;
        } else {
            try {
                const deptRes = await fetch(`${API_BASE}/departments`);
                if (deptRes.ok) deptsData = await deptRes.json();
            } catch (err) { }
        }
        
        deptsData.forEach(dept => {
            const opt = document.createElement("option");
            opt.value = dept.dept_id;
            opt.textContent = dept.dept_name;
            regDept.appendChild(opt);
        });
    }
    initRegisterForm();

    const showRegisterBtn = document.getElementById("show-register-btn");
    const showLoginBtn = document.getElementById("show-login-btn");
    if (showRegisterBtn && showLoginBtn) {
        showRegisterBtn.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("login-card").style.display = "none";
            document.getElementById("register-card").style.display = "flex";
        });

        showLoginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("register-card").style.display = "none";
            document.getElementById("login-card").style.display = "flex";
        });
    }

    const regBtn = document.getElementById("reg-btn");
    if (regBtn) {
        regBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            const stdId = document.getElementById('reg-id').value.trim();
            const stdName = document.getElementById('reg-name').value.trim();
            const stdEmail = document.getElementById('reg-email').value.trim();
            const stdPassword = document.getElementById('reg-password').value.trim();
            const stdYear = document.getElementById('reg-year').value;
            const stdDept = document.getElementById('reg-dept').value;
            const errorEl = document.getElementById('reg-error');

            if (!stdId || !stdName || !stdEmail || !stdPassword || !stdYear || !stdDept) {
                errorEl.textContent = "Please fill in all required fields.";
                return;
            }

            const data = {
                std_id: parseInt(stdId, 10),
                name: stdName,
                mail_id: stdEmail,
                password: stdPassword,
                year_of_study: parseInt(stdYear, 10),
                dept_id: parseInt(stdDept, 10)
            };

            if (USE_MOCK) {
                MOCK_STUDENTS.push({
                    ...data,
                    password: data.password // mock basic auth check will use it
                });
                showToast("Account created successfully!");
                document.getElementById("register-card").style.display = "none";
                document.getElementById("login-card").style.display = "flex";
                document.getElementById('login-email').value = data.mail_id;
            } else {
                try {
                    const response = await fetch(`${API_BASE}/students/register`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        errorEl.textContent = err.detail || err.message || "Failed to create account.";
                    } else {
                        showToast("Account created successfully!");
                        document.getElementById("register-card").style.display = "none";
                        document.getElementById("login-card").style.display = "flex";
                        document.getElementById('login-email').value = data.mail_id;
                    }
                } catch (err) {
                    console.error(err);
                    errorEl.textContent = "Something went wrong. Please try again.";
                }
            }
        });
    }

    async function handleLogin() {
        const email = document.getElementById("login-email").value.trim();
        const password = document.getElementById("login-password").value.trim();
        const errorEl = document.getElementById("login-error");
        errorEl.textContent = "";

        // Check admin first
        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            currentUser = { role: "admin", name: "Admin", std_id: null };
            startApp();
            return;
        }

        if (USE_MOCK) {
            const student = MOCK_STUDENTS.find(s => s.mail_id === email);
            const expectedPassword = student ? (student.password || email) : null;
            if (student && password === expectedPassword) {
                currentUser = { role: "student", name: student.name, std_id: student.std_id };
                startApp();
                return;
            }
            errorEl.textContent = "Invalid email or password.";
        } else {
            try {
                const response = await fetch(`${API_BASE}/students/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ mail_id: email, password: password })
                });
                if (!response.ok) {
                    const err = await response.json();
                    errorEl.textContent = err.detail || "Invalid email or password.";
                } else {
                    const data = await response.json();
                    currentUser = { role: "student", name: data.student.name, std_id: data.student.std_id };
                    startApp();
                }
            } catch (err) {
                console.error(err);
                errorEl.textContent = "Something went wrong. Please try again.";
            }
        }
    }

    function startApp() {
        document.getElementById("login-screen").style.display = "none";
        document.getElementById("app").style.display = "flex";

        // Show or hide nav links based on role
        const adminOnlyTabs = ["students", "waitlist"];
        adminOnlyTabs.forEach(tabId => {
            const link = document.querySelector(`.nav-link[data-target="${tabId}"]`);
            if (link) {
                link.style.display = currentUser.role === "admin" ? "block" : "none";
            }
        });

        // Show current user name in sidebar
        const userChip = document.getElementById("user-chip");
        if (userChip) {
            userChip.textContent = `${currentUser.name} (${currentUser.role})`;
        }

        navigateTo("dashboard");
        loadDashboard();
    }

    function handleLogout() {
        currentUser = null;
        document.getElementById("login-screen").style.display = "flex";
        document.getElementById("app").style.display = "none";
        document.getElementById("login-email").value = "";
        document.getElementById("login-password").value = "";
        
        const loginError = document.getElementById("login-error");
        if (loginError) loginError.textContent = "";

        const regId = document.getElementById("reg-id");
        if (regId) regId.value = "";
        const regName = document.getElementById("reg-name");
        if (regName) regName.value = "";
        const regEmail = document.getElementById("reg-email");
        if (regEmail) regEmail.value = "";
        const regPassword = document.getElementById("reg-password");
        if (regPassword) regPassword.value = "";
        const regYear = document.getElementById("reg-year");
        if (regYear) regYear.value = "";
        const regDept = document.getElementById("reg-dept");
        if (regDept) regDept.value = "";
        const regError = document.getElementById("reg-error");
        if (regError) regError.textContent = "";
        
        const showLoginBtn = document.getElementById("show-login-btn");
        if(showLoginBtn) showLoginBtn.click();
    }

    // Bind Auth Events
    const loginBtn = document.getElementById("login-btn");
    if (loginBtn) loginBtn.addEventListener("click", handleLogin);
    
    const loginEmail = document.getElementById("login-email");
    if (loginEmail) loginEmail.addEventListener("keydown", e => {
        if (e.key === "Enter") handleLogin();
    });
    
    const loginPassword = document.getElementById("login-password");
    if (loginPassword) loginPassword.addEventListener("keydown", e => {
        if (e.key === "Enter") handleLogin();
    });
    
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

});

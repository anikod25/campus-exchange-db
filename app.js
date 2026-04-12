const API_BASE = "http://localhost:5000";
const USE_MOCK = true;

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

        if (USE_MOCK) {
            statsData = MOCK_STATS;
            transData = MOCK_TRANSACTIONS.slice(0, 5);
        } else {
            try {
                const [statsRes, transRes] = await Promise.all([
                    fetch(`${API_BASE}/api/dashboard/stats`),
                    fetch(`${API_BASE}/api/transactions?limit=5`)
                ]);
                statsData = await statsRes.json();
                transData = await transRes.json();
            } catch (err) {
                console.error(err);
                statsData = { total_resources: 0, available: 0, borrowed: 0, total_students: 0 };
                transData = [];
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
                const badgeClass = status === 'active' ? 'badge-available' : \`badge-\${status}\`;
                transRowsHtml += \`
                    <tr>
                        <td><strong>\${tx.resource_title}</strong></td>
                        <td>\${tx.sender_name}</td>
                        <td>\${tx.receiver_name}</td>
                        <td>\${tx.issue_date}</td>
                        <td>\${tx.due_date}</td>
                        <td><span class="badge \${badgeClass}">\${status}</span></td>
                    </tr>
                \`;
            });
        }

        const tableHtml = \`
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
                            \${transRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        \`;

        // 3. Render into #dashboard
        dashboardSection.innerHTML = statsHtml + tableHtml;
    }

    async function loadResources() {
        if (!resourcesTbody) return;
        
        let data = [];
        if (USE_MOCK) {
            data = MOCK_RESOURCES;
        } else {
            try {
                const response = await fetch(`${API_BASE}/api/resources`);
                data = await response.json();
            } catch (err) {
                console.error(err);
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
                const res_id = e.target.getAttribute('data-id');
                if (USE_MOCK) {
                    console.log("Mock POST transaction", res_id);
                } else {
                    try {
                        await fetch(`${API_BASE}/api/transactions`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ res_id, sender_id: 101, receiver_id: 102 })
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-waitlist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const res_id = e.target.getAttribute('data-id');
                if (USE_MOCK) {
                    console.log("Mock POST waitlist", res_id);
                } else {
                    try {
                        await fetch(`${API_BASE}/api/waitlist`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ res_id, stud_id: 102 })
                        });
                    } catch (err) {
                        console.error(err);
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
                item_condition: resCondition.value,
                donor_id: parseInt(resDonor.value, 10)
            };

            if (USE_MOCK) {
                console.log("Mock POST resource", data);
            } else {
                try {
                    await fetch(`${API_BASE}/api/resources`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(data)
                    });
                } catch (err) {
                    console.error(err);
                }
            }
            
            // Clear form
            addResourceForm.reset();
            checkAddResourceForm(); // Will re-disable the button
        });
    }

    function loadAddResource() {
        if (!resDonor) return;
        
        // Populate Donor dropdown if it only has the placeholder option
        if (resDonor.options.length <= 1) {
            MOCK_STUDENTS.forEach(student => {
                const opt = document.createElement('option');
                opt.value = student.std_id;
                opt.textContent = student.name;
                resDonor.appendChild(opt);
            });
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
                const response = await fetch(`${API_BASE}/api/transactions`);
                data = await response.json();
            } catch (err) {
                console.error(err);
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

            // Action column
            let actionHtml = '';
            if (status === 'active' || status === 'overdue') {
                actionHtml = `<button class="btn btn-outline btn-return" data-id="${tx.tran_id}">Mark Returned</button>`;
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
                    console.log("Mock PATCH return", tran_id);
                } else {
                    try {
                        await fetch(`${API_BASE}/api/transactions/${tran_id}/return`, {
                            method: "PATCH"
                        });
                    } catch (err) {
                        console.error(err);
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
                const response = await fetch(`${API_BASE}/api/waitlist`);
                data = await response.json();
            } catch (err) {
                console.error(err);
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
                    console.log("Mock DELETE waitlist", waitlist_id);
                } else {
                    try {
                        await fetch(`${API_BASE}/api/waitlist/${waitlist_id}`, {
                            method: "DELETE"
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });
    }

    // Call conditionally on initial load if starting on waitlist
    if (initialHash === 'waitlist') {
        loadWaitlist();
    }

});

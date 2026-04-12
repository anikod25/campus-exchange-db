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
            
            if (targetId === 'resources') {
                loadResources();
            }
        });
    });

    // Check if the page loaded with a specific hash (e.g. #resources)
    // If not, default to 'dashboard'
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && document.getElementById(initialHash)) {
        navigateTo(initialHash);
    } else {
        navigateTo('dashboard');
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
            if (hash === 'resources') loadResources();
        } else {
            navigateTo('dashboard');
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

    function loadResources() {
        if (!resourcesTbody) return;
        
        // 1. Get filter values
        const catValue = filterCategory.value;
        const statValue = filterStatus.value;
        const condValue = filterCondition.value;

        // 2. Filter mock data
        const filtered = MOCK_RESOURCES.filter(res => {
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
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                console.log(`Borrow clicked for res_id: ${id}`);
            });
        });

        document.querySelectorAll('.btn-waitlist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                console.log(`Waitlist clicked for res_id: ${id}`);
            });
        });
    }

    // Call conditionally on initial load if starting on resources
    if (initialHash === 'resources') {
        loadResources();
    }
});

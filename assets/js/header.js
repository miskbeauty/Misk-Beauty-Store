/**
 * Shared Header for Misk Beauty Store
 * Redesigned with separated utility bar and smart cart widget
 */

function getDynamicNavHTML(passedCategories = null) {
    let categories = [];
    if (passedCategories && Array.isArray(passedCategories) && passedCategories.length > 0) {
        categories = passedCategories;
    } else {
        const savedCats = localStorage.getItem('misk_categories');
        if (savedCats) categories = JSON.parse(savedCats);
    }

    const headerCats = categories || [];
    const parents = headerCats.filter(c => !c.parentId && (String(c.showInHeader) === 'true' || c.showInHeader === true));
    parents.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let html = `<li><a href="/index.html"><i class="fas fa-home"></i> الرئيسية</a></li>`;

    parents.forEach(p => {
        const pId = p._id || p.id;
        // Include all children regardless of showInHeader if the parent is visible
        const children = headerCats.filter(c => c.parentId && String(c.parentId) === String(pId));
        children.sort((a, b) => (b.priority || 0) - (a.priority || 0));
        const parentLink = p.slug ? `/category/${p.slug}` : `/index.html?category=${encodeURIComponent(p.name)}`;

        if (children.length > 0) {
            html += `
                <li class="dropdown">
                    <a href="${parentLink}">${p.name} <i class="fas fa-chevron-down" style="font-size:0.65rem; margin-right:3px;"></i></a>
                    <ul class="dropdown-menu">
                        ${children.map(c => {
                            const childLink = c.slug ? `/category/${c.slug}` : `/index.html?sub=${encodeURIComponent(c.name)}`;
                            return `<li><a href="${childLink}"><i class="fas fa-circle" style="font-size:0.4rem; vertical-align:middle; margin-left:6px;"></i>${c.name}</a></li>`;
                        }).join('')}
                    </ul>
                </li>`;
        } else {
            html += `<li><a href="${parentLink}">${p.name}</a></li>`;
        }
    });

    return html;
}

function getUtilityNavHTML() {
    const user = (typeof AuthService !== 'undefined') ? AuthService.getUser() : null;
    let html = `
        <a href="/offers.html" class="util-btn util-offers">
            <i class="fas fa-fire"></i> العروض
        </a>`;

    if (user) {
        html += `
        <a href="/account.html" class="util-btn util-account">
            <i class="fas fa-user-circle"></i>
            <span>${user.name ? user.name.split(' ')[0] : 'حسابي'}</span>
        </a>`;
    } else {
        html += `
        <a href="/login.html" class="util-btn util-login">
            <i class="fas fa-sign-in-alt"></i>
            <span>دخول</span>
        </a>`;
    }
    return html;
}

const headerHTML = `
    <div class="header-main container">
        <!-- Logo -->
        <div class="logo">
            <a href="/index.html">
                <img src="/assets/images/1745215944148877862-removebg-preview.png" alt="Misk Beauty Logo">
            </a>
        </div>

        <!-- Category Navigation -->
        <nav class="main-nav">
            <ul class="nav-links" id="dynamic-nav">
                <!-- Injected by JS -->
            </ul>
        </nav>

        <!-- Utility Actions (Offers, Account, Cart) -->
        <div class="header-utils">
            <div class="util-links" id="utility-nav">
                <!-- Injected by JS -->
            </div>

            <!-- Smart Cart Button -->
            <div class="smart-cart" id="cartWidgetToggle" onclick="window.location.href='/cart.html'">
                <div class="cart-icon-wrapper">
                    <i class="fas fa-shopping-bag"></i>
                    <span class="cart-badge" id="widgetCartCountBadge" style="display:none;">0</span>
                </div>
                <div class="cart-text-info" id="cartTextInfo">
                    <span class="cart-empty-msg" id="cartEmptyMsg">سلتك فارغة</span>
                    <span class="cart-filled-msg" id="cartFilledMsg" style="display:none;">
                        <span id="widgetCartCountText"></span>
                        <span class="cart-divider">|</span>
                        <span id="widgetCartTotalText"></span>
                    </span>
                </div>

                <!-- Mini Cart Dropdown -->
                <div class="mini-cart-dropdown" id="miniCartDropdown">
                    <div class="mini-cart-header">
                        <i class="fas fa-shopping-bag"></i>
                        <span>سلة المشتريات</span>
                    </div>
                    <div class="mini-cart-items" id="miniCartItems">
                        <div class="mini-cart-empty-state">
                            <i class="fas fa-shopping-bag"></i>
                            <p>سلتك فارغة حالياً</p>
                        </div>
                    </div>
                    <div class="mini-cart-footer" id="miniCartFooter" style="display:none;">
                        <div class="mini-total">
                            <span>المجموع</span>
                            <span><span id="miniCartTotal">0</span> شيكل</span>
                        </div>
                        <button class="btn-mini-checkout" onclick="window.location.href='/cart.html'">
                            <i class="fas fa-shopping-cart"></i> عرض السلة والطلب
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Search Bar Row -->
    <div class="header-search container">
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="searchInput" placeholder="ابحث في مسك بيوتي...">
        </div>
    </div>
`;

function injectHeader(categories = null) {
    const headerElement = document.querySelector('header');
    if (!headerElement) return;

    headerElement.innerHTML = headerHTML;

    // Apply Global Settings
    const savedSettings = localStorage.getItem('misk_settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        const logoImgs = document.querySelectorAll('.logo img');
        if (settings.logo) logoImgs.forEach(img => img.src = settings.logo);
        if (settings.name) {
            logoImgs.forEach(img => img.alt = settings.name);
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.placeholder = `ابحث في ${settings.name}...`;
        }
    }

    // Inject categories nav
    const dynamicNav = document.getElementById('dynamic-nav');
    if (dynamicNav) dynamicNav.innerHTML = getDynamicNavHTML(categories);

    // Inject utility nav (Offers + Login/Account)
    const utilityNav = document.getElementById('utility-nav');
    if (utilityNav) utilityNav.innerHTML = getUtilityNavHTML();
}

// Export
window.injectHeader = injectHeader;

// Execute immediately from cache
injectHeader();

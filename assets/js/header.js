/**
 * Shared Header for Misk Beauty Store
 * Layout: Row 1 (Logo + Nav), Row 2 (Search + Utils)
 * Features: Smart Cart with Mini-Cart Dropdown
 */

async function fetchAndCacheCategories() {
    try {
        const response = await fetch('/api/categories?t=' + Date.now());
        const data = await response.json();
        if (data.success && data.categories) {
            localStorage.setItem('misk_categories', JSON.stringify(data.categories));
            return data.categories;
        }
    } catch (e) {
        console.error('فشل جلب الأقسام:', e);
    }
    const saved = localStorage.getItem('misk_categories');
    return saved ? JSON.parse(saved) : [];
}

function getDynamicNavHTML(categories = []) {
    const parents = categories.filter(c => !c.parentId);
    parents.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let html = `<li><a href="/index.html"><i class="fas fa-home"></i> الرئيسية</a></li>`;

    parents.forEach(p => {
        const pId = String(p._id || p.id);
        const children = categories.filter(c => {
            if (!c.parentId) return false;
            const cPid = String(c.parentId._id || c.parentId);
            return cPid === pId;
        });
        
        children.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        const parentLink = p.slug
            ? `/category/${p.slug}`
            : `/index.html?category=${encodeURIComponent(p.name)}`;

        if (children.length > 0) {
            html += `
                <li class="dropdown">
                    <a href="${parentLink}">${p.name}
                        <i class="fas fa-chevron-down" style="font-size:0.65rem;margin-right:3px;"></i>
                    </a>
                    <ul class="dropdown-menu">
                        ${children.map(c => {
                            const childLink = c.slug
                                ? `/category/${c.slug}`
                                : `/index.html?subCategory=${encodeURIComponent(c.name)}`;
                            return `<li>
                                <a href="${childLink}">
                                    <i class="fas fa-circle" style="font-size:0.4rem;vertical-align:middle;margin-left:6px;"></i>
                                    ${c.name}
                                </a>
                            </li>`;
                        }).join('')}
                    </ul>
                </li>`;
        } else {
            html += `<li><a href="${parentLink}">${p.name}</a></li>`;
        }
    });

    return html;
}

async function getUtilityNavHTML() {
    const user = (typeof AuthService !== 'undefined') ? await AuthService.getUser() : null;
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
            <span>نقاطي</span>
        </a>`;
    }
    return html;
}

const headerHTML = `
    <div class="header-main container">
        <div class="logo">
            <a href="/index.html">
                <img src="/assets/images/1745215944148877862-removebg-preview.png" alt="Misk Beauty Logo">
            </a>
        </div>
        <nav class="main-nav">
            <ul class="nav-links" id="dynamic-nav"></ul>
        </nav>
    </div>

    <div class="header-action-bar container">
        <div class="search-bar">
            <i class="fas fa-search"></i>
            <input type="text" id="searchInput" placeholder="ابحث في مسك بيوتي...">
        </div>
        <div class="header-utils">
            <div class="util-links" id="utility-nav"></div>
            
            <div class="smart-cart" id="cartWidgetToggle">
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
                
                <!-- MINI-CART DROPDOWN -->
                <div class="mini-cart-dropdown" id="miniCartDropdown">
                    <div class="mini-cart-header">
                        <i class="fas fa-shopping-basket"></i> مراجعة السلة
                    </div>
                    <div class="mini-cart-items" id="miniCartItems">
                        <!-- Injected by main.js -->
                    </div>
                    <div class="mini-cart-footer">
                        <div class="mini-total">
                            <span>المجموع:</span>
                            <span id="miniCartTotal">0 ₪</span>
                        </div>
                        <button class="btn-mini-checkout" onclick="window.location.href='/cart.html'">
                            عرض السلة وإتمام الطلب
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

async function injectHeader() {
    const headerElement = document.querySelector('header');
    if (!headerElement) return;
    headerElement.innerHTML = headerHTML;

    const categories = await fetchAndCacheCategories();
    const dynamicNav = document.getElementById('dynamic-nav');
    if (dynamicNav) dynamicNav.innerHTML = getDynamicNavHTML(categories);

    const utilityNav = document.getElementById('utility-nav');
    if (utilityNav) utilityNav.innerHTML = await getUtilityNavHTML();
}

window.injectHeader = injectHeader;
injectHeader();

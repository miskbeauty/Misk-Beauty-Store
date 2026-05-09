/**
 * Shared Header for Misk Beauty Store
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
    // الأقسام الرئيسية فقط (parentId === null) وشرط showInHeader
    const parents = categories.filter(c =>
        !c.parentId && (String(c.showInHeader) === 'true' || c.showInHeader === true)
    );
    parents.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let html = `<li><a href="/index.html"><i class="fas fa-home"></i> الرئيسية</a></li>`;

    parents.forEach(p => {
        // *** FIX: جلب كل الأبناء بغض النظر عن showInHeader ***
        const children = categories.filter(c =>
            c.parentId && String(c.parentId) === String(p._id)
        );
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
        <div class="logo">
            <a href="/index.html">
                <img src="/assets/images/1745215944148877862-removebg-preview.png" alt="Misk Beauty Logo">
            </a>
        </div>
        <nav class="main-nav">
            <ul class="nav-links" id="dynamic-nav"></ul>
        </nav>
    </div>
    <div class="header-second-row container">
        <div class="search-section">
            <div class="search-bar">
                <i class="fas fa-search"></i>
                <input type="text" id="searchInput" placeholder="ابحث في مسك بيوتي...">
            </div>
        </div>
        <div class="header-utils">
            <div class="util-links" id="utility-nav"></div>
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
            </div>
        </div>
    </div>
`;


async function injectHeader() {
    const headerElement = document.querySelector('header');
    if (!headerElement) return;
    headerElement.innerHTML = headerHTML;

    const savedSettings = localStorage.getItem('misk_settings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.logo) {
                document.querySelectorAll('.logo img').forEach(img => img.src = settings.logo);
            }
        } catch(e) {}
    }

    const categories = await fetchAndCacheCategories();

    const dynamicNav = document.getElementById('dynamic-nav');
    if (dynamicNav) dynamicNav.innerHTML = getDynamicNavHTML(categories);

    const utilityNav = document.getElementById('utility-nav');
    if (utilityNav) utilityNav.innerHTML = getUtilityNavHTML();

    // FIX: تفعيل dropdown بـ JavaScript كـ backup للـ CSS
    document.querySelectorAll('.nav-links > li.dropdown').forEach(li => {
        li.addEventListener('mouseenter', () => {
            const menu = li.querySelector('.dropdown-menu');
            if (menu) {
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0)';
                menu.style.pointerEvents = 'all';
            }
        });
        li.addEventListener('mouseleave', () => {
            const menu = li.querySelector('.dropdown-menu');
            if (menu) {
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(10px)';
                menu.style.pointerEvents = 'none';
            }
        });
    });
}


window.injectHeader = injectHeader;
injectHeader();

// ===== DROPDOWN JAVASCRIPT ONLY - �� ����� ��� CSS hover =====
document.addEventListener('mouseover', function(e) {
    const li = e.target.closest('.nav-links > li');
    if (!li) return;
    const menu = li.querySelector('.dropdown-menu');
    if (!menu) return;
    menu.style.cssText = 
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) !important;
        pointer-events: all !important;
        position: absolute !important;
        top: 100% !important;
        right: 0 !important;
        z-index: 99999 !important;
        background: white !important;
        display: block !important;
    ;
});

document.addEventListener('mouseout', function(e) {
    const li = e.target.closest('.nav-links > li');
    if (!li) return;
    const related = e.relatedTarget;
    if (related && li.contains(related)) return;
    const menu = li.querySelector('.dropdown-menu');
    if (!menu) return;
    menu.style.cssText = 
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
    ;
});

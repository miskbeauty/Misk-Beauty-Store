/**
 * Shared Header for Misk Beauty Store
 * This script injects the consistent header across all pages.
 */

function getDynamicNavHTML() {
    const savedCats = localStorage.getItem('misk_categories');
    let categories = [];
    if (savedCats) {
        categories = JSON.parse(savedCats);
    }

    // Filter categories to show in header and sort by priority
    const headerCats = categories.filter(c => c.showInHeader === 'true');
    headerCats.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    const parents = headerCats.filter(c => !c.parentId);

    let html = `<li><a href="index.html">الرئيسية</a></li>`;

    parents.forEach(p => {
        const children = headerCats.filter(c => c.parentId == p.id);
        if (children.length > 0) {
            html += `
                <li class="dropdown">
                    <a href="index.html?category=${encodeURIComponent(p.name)}">${p.name}</a>
                    <ul class="dropdown-menu">
                        ${children.map(c => `<li><a href="index.html?sub=${encodeURIComponent(c.name)}">${c.name}</a></li>`).join('')}
                    </ul>
                </li>`;
        } else {
            html += `<li><a href="index.html?category=${encodeURIComponent(p.name)}">${p.name}</a></li>`;
        }
    });

    return html;
}

const headerHTML = `
    <nav class="container">
        <div class="logo">
            <a href="index.html">
                <img src="assets/images/1745215944148877862-removebg-preview.png" alt="Misk Beauty Logo">
            </a>
        </div>
        <ul class="nav-links" id="dynamic-nav">
            <!-- Dynamic Nav Links Injected Here -->
        </ul>
    </nav>
    <div class="search-cart-row container">
        <div class="search-bar">
            <input type="text" id="searchInput" placeholder="ابحث في مسك بيوتي">
            <i class="fas fa-search"></i>
        </div>
        <div class="cart-widget" id="cartWidgetToggle" onclick="window.location.href='cart.html'" style="cursor: pointer;">
            <div class="cart-icon-wrapper">
                <i class="fas fa-shopping-cart"></i>
                <span class="cart-badge" id="widgetCartCountBadge">0</span>
            </div>
            <div class="cart-info">
                <span class="cart-label">مشترياتك</span>
                <span id="widgetCartCountText">السلة فارغة</span>
                <span id="widgetCartTotalText" style="display: none;">0 شيكل</span>
            </div>
            <!-- Mini Cart Dropdown -->
            <div class="mini-cart-dropdown" id="miniCartDropdown">
                <div class="mini-cart-items" id="miniCartItems">
                    <!-- Items injected by JS -->
                </div>
                <div class="mini-cart-footer">
                    <div class="mini-total">المجموع: <span id="miniCartTotal">0</span> شيكل</div>
                    <button class="btn btn-mini-checkout" onclick="openCart()">عرض السلة والطلب</button>
                </div>
            </div>
        </div>
    </div>
`;

function injectHeader() {
    const headerElement = document.querySelector('header');
    if (headerElement) {
        headerElement.innerHTML = headerHTML;
        const dynamicNav = document.getElementById('dynamic-nav');
        if (dynamicNav) {
            dynamicNav.innerHTML = getDynamicNavHTML();
        }
    }
}

// Execute immediately
injectHeader();

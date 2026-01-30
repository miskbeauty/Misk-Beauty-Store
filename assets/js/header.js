/**
 * Shared Header for Misk Beauty Store
 * This script injects the consistent header across all pages.
 */

const headerHTML = `
    <nav class="container">
        <div class="logo">
            <a href="index.html">
                <img src="assets/images/1745215944148877862-removebg-preview.png" alt="Misk Beauty Logo">
            </a>
        </div>
        <ul class="nav-links">
            <li><a href="index.html">الرئيسية</a></li>
            <li class="dropdown">
                <a href="index.html?category=عناية وجمال">العناية والجمال</a>
                <ul class="dropdown-menu">
                    <li><a href="index.html?sub=مكياج">مكياج</a></li>
                    <li><a href="index.html?sub=عناية بالبشرة">عناية بالبشرة</a></li>
                    <li><a href="index.html?sub=شعر">شعر</a></li>
                    <li><a href="index.html?sub=جسم">جسم</a></li>
                </ul>
            </li>
            <li class="dropdown">
                <a href="index.html?category=عطور">عطور</a>
                <ul class="dropdown-menu">
                    <li><a href="index.html?sub=ستاتي">ستاتي</a></li>
                    <li><a href="index.html?sub=رجالي">رجالي</a></li>
                    <li><a href="index.html?sub=مزيل عرق">مزيل عرق</a></li>
                    <li><a href="index.html?sub=عطر شعر">عطر شعر</a></li>
                    <li><a href="index.html?sub=بخور">بخور</a></li>
                </ul>
            </li>
            <li class="dropdown">
                <a href="index.html?category=شنط وإكسسوارات">شنط وإكسسورات</a>
                <ul class="dropdown-menu">
                    <li><a href="index.html?sub=شنط">شنط</a></li>
                    <li><a href="index.html?sub=إكسسوارات ستاتي">إكسسوارات ستاتي</a></li>
                    <li><a href="index.html?sub=إكسسوارات رجالي">رجالي</a></li>
                </ul>
            </li>
            <li class="dropdown">
                <a href="index.html?category=الأطفال والبيبي">الأطفال والبيبي</a>
                <ul class="dropdown-menu">
                    <li><a href="index.html?sub=مستلزمات">مستلزمات</a></li>
                    <li><a href="index.html?sub=إكسسوارات بيبي">إكسسوارات</a></li>
                </ul>
            </li>
            <li class="dropdown">
                <a href="index.html?category=الطباعة الحرارية">الطباعة الحرارية</a>
                <ul class="dropdown-menu">
                    <li><a href="index.html?sub=براويز">براويز</a></li>
                    <li><a href="index.html?sub=مجات">مجات</a></li>
                    <li><a href="index.html?sub=لهايات وبلايز">لهايات وبلايز</a></li>
                </ul>
            </li>
            <li><a href="index.html?category=منتجات طبية">منتجات طبية</a></li>
            <li><a href="index.html?category=المنزل والديكور">المنزل والديكور</a></li>
            <li><a href="index.html?category=الهدايا">الهدايا</a></li>
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
    }
}

// Execute immediately
injectHeader();

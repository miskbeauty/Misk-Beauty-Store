/**
 * Shared Header for Misk Beauty Store
 * Version: Final Fix
 */

async function fetchAndCacheCategories() {
    try {
        var response = await fetch('/api/categories?t=' + Date.now());
        var data = await response.json();
        if (data.success && data.categories) {
            localStorage.setItem('misk_categories', JSON.stringify(data.categories));
            return data.categories;
        }
    } catch (e) {
        console.error('فشل جلب الأقسام:', e);
    }
    var saved = localStorage.getItem('misk_categories');
    return saved ? JSON.parse(saved) : [];
}

function getDynamicNavHTML(categories) {
    if (!categories) categories = [];

    var parents = [];
    for (var i = 0; i < categories.length; i++) {
        var c = categories[i];
        if (!c.parentId && (String(c.showInHeader) === 'true' || c.showInHeader === true)) {
            parents.push(c);
        }
    }
    parents.sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });

    var html = '<li><a href="/index.html"><i class="fas fa-home"></i> الرئيسية</a></li>';

    for (var j = 0; j < parents.length; j++) {
        var p = parents[j];
        var children = [];
        for (var k = 0; k < categories.length; k++) {
            var cat = categories[k];
            if (cat.parentId && String(cat.parentId) === String(p._id)) {
                children.push(cat);
            }
        }
        children.sort(function(a, b) { return (b.priority || 0) - (a.priority || 0); });

        var parentLink = p.slug ? '/category/' + p.slug : '/index.html?category=' + encodeURIComponent(p.name);

        if (children.length > 0) {
            var childrenHTML = '';
            for (var m = 0; m < children.length; m++) {
                var ch = children[m];
                var childLink = ch.slug ? '/category/' + ch.slug : '/index.html?subCategory=' + encodeURIComponent(ch.name);
                childrenHTML += '<li><a href="' + childLink + '">' + ch.name + '</a></li>';
            }
            html += '<li class="dropdown" style="position:relative;">';
            html += '<a href="' + parentLink + '">' + p.name + ' <i class="fas fa-chevron-down" style="font-size:0.6rem;"></i></a>';
            html += '<ul class="dropdown-menu" style="display:none;position:absolute;top:100%;right:0;background:#fff;min-width:200px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.12);list-style:none;padding:8px;z-index:99999;border:1px solid #f0e6ff;">';
            html += childrenHTML;
            html += '</ul></li>';
        } else {
            html += '<li><a href="' + parentLink + '">' + p.name + '</a></li>';
        }
    }

    return html;
}

function getUtilityNavHTML() {
    var user = (typeof AuthService !== 'undefined') ? AuthService.getUser() : null;
    var html = '<a href="/offers.html" class="util-btn util-offers"><i class="fas fa-fire"></i> العروض</a>';
    if (user) {
        var firstName = user.name ? user.name.split(' ')[0] : 'حسابي';
        html += '<a href="/account.html" class="util-btn util-account"><i class="fas fa-user-circle"></i><span>' + firstName + '</span></a>';
    } else {
        html += '<a href="/login.html" class="util-btn util-login"><i class="fas fa-sign-in-alt"></i><span>دخول</span></a>';
    }
    return html;
}

var headerHTML = '' +
    '<div class="header-main container">' +
        '<div class="logo">' +
            '<a href="/index.html">' +
                '<img src="/assets/images/1745215944148877862-removebg-preview.png" alt="Misk Beauty Logo">' +
            '</a>' +
        '</div>' +
        '<nav class="main-nav">' +
            '<ul class="nav-links" id="dynamic-nav"></ul>' +
        '</nav>' +
        '<div class="header-utils">' +
            '<div class="util-links" id="utility-nav"></div>' +
            '<div class="smart-cart" id="cartWidgetToggle" onclick="window.location.href=\'/cart.html\'">' +
                '<div class="cart-icon-wrapper">' +
                    '<i class="fas fa-shopping-bag"></i>' +
                    '<span class="cart-badge" id="widgetCartCountBadge" style="display:none;">0</span>' +
                '</div>' +
                '<div class="cart-text-info" id="cartTextInfo">' +
                    '<span class="cart-empty-msg" id="cartEmptyMsg">سلتك فارغة</span>' +
                    '<span class="cart-filled-msg" id="cartFilledMsg" style="display:none;">' +
                        '<span id="widgetCartCountText"></span>' +
                        '<span class="cart-divider">|</span>' +
                        '<span id="widgetCartTotalText"></span>' +
                    '</span>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>' +
    '<div class="header-search container">' +
        '<div class="search-bar">' +
            '<i class="fas fa-search"></i>' +
            '<input type="text" id="searchInput" placeholder="ابحث في مسك بيوتي...">' +
        '</div>' +
    '</div>';

function setupDropdowns() {
    var items = document.querySelectorAll('.nav-links > li.dropdown');
    for (var i = 0; i < items.length; i++) {
        (function(li) {
            var menu = li.querySelector('.dropdown-menu');
            if (!menu) return;

            li.addEventListener('mouseenter', function() {
                menu.style.display = 'block';
            });

            li.addEventListener('mouseleave', function() {
                menu.style.display = 'none';
            });
        })(items[i]);
    }
}

async function injectHeader() {
    var headerElement = document.querySelector('header');
    if (!headerElement) return;

    headerElement.innerHTML = headerHTML;

    try {
        var savedSettings = localStorage.getItem('misk_settings');
        if (savedSettings) {
            var settings = JSON.parse(savedSettings);
            if (settings.logo) {
                var logos = document.querySelectorAll('.logo img');
                for (var i = 0; i < logos.length; i++) {
                    logos[i].src = settings.logo;
                }
            }
        }
    } catch(e) {}

    var categories = await fetchAndCacheCategories();

    var dynamicNav = document.getElementById('dynamic-nav');
    if (dynamicNav) dynamicNav.innerHTML = getDynamicNavHTML(categories);

    var utilityNav = document.getElementById('utility-nav');
    if (utilityNav) utilityNav.innerHTML = getUtilityNavHTML();

    setupDropdowns();
}

window.injectHeader = injectHeader;
injectHeader();

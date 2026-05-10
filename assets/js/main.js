/**
 * Misk Beauty & Gifts - Core Logic
 * Handles products, cart synchronization, and mini-cart UI
 */

const CloudinaryHelper = {
    optimize: (url, width = 800) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
};

function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        category: params.get('category') || '',
        subCategory: params.get('subCategory') || '',
        slug: params.get('slug') || ''
    };
}

function getCategorySlugFromPath() {
    const path = window.location.pathname;
    const match = path.match(/^\/category\/(.+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

let cart = JSON.parse(localStorage.getItem('misk_cart')) || [];
let currentPage = 1;
let isLoading = false;
let hasMoreProducts = true;

async function loadProducts(params = {}) {
    const { page = 1, limit = 12, category = '', subCategory = '', ...extra } = params;
    try {
        const query = new URLSearchParams({ page, limit, t: Date.now() });
        if (category) query.append('category', category);
        if (subCategory) query.append('subCategory', subCategory);
        // Pass all extra filters (onSale, bestSeller, topRated, latest, sort, etc)
        Object.entries(extra).forEach(([k, v]) => { if (v) query.append(k, v); });

        const response = await fetch(`/api/products?${query.toString()}`);
        const data = await response.json();
        return data.success
            ? { products: data.products, pagination: data.pagination }
            : { products: [], pagination: null };
    } catch (e) {
        console.error('خطأ في جلب المنتجات:', e);
        return { products: [], pagination: null };
    }
}

async function renderProductGrid(containerId, isLoadMore = false, extraParams = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    // Use per-grid loading lock to allow multiple grids to load simultaneously
    if (container.dataset.loading === 'true' && !isLoadMore) return;
    container.dataset.loading = 'true';
    if (!isLoadMore) {
        container.innerHTML = `<div class="loading-products" style="grid-column:1/-1;text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#c8a96e;"></i><p>جاري تحميل المنتجات...</p></div>`;
    }

    let categoryFilter = '';
    let subCategoryFilter = '';
    const slugFromPath = getCategorySlugFromPath();
    const urlParams = getURLParams();

    if (slugFromPath) {
        const savedCats = localStorage.getItem('misk_categories');
        const allCats = savedCats ? JSON.parse(savedCats) : [];
        const matchedCat = allCats.find(c => c.slug === slugFromPath);
        if (matchedCat) {
            if (matchedCat.parentId) subCategoryFilter = matchedCat.name;
            else categoryFilter = matchedCat.name;
        } else {
            try {
                const res = await fetch(`/api/categories?slug=${slugFromPath}`);
                const data = await res.json();
                if (data.success && data.categories.length > 0) {
                    const cat = data.categories[0];
                    if (cat.parentId) subCategoryFilter = cat.name;
                    else categoryFilter = cat.name;
                }
            } catch (e) {}
        }
    } else if (urlParams.category) {
        categoryFilter = urlParams.category;
    } else if (urlParams.subCategory) {
        subCategoryFilter = urlParams.subCategory;
    }

    // Update Section Title if applicable
    const titleEl = container.closest('section')?.querySelector('.section-title h2');
    if (titleEl && containerId === 'productGrid') {
        if (subCategoryFilter) titleEl.textContent = subCategoryFilter;
        else if (categoryFilter) titleEl.textContent = categoryFilter;
        else titleEl.textContent = 'جميع المنتجات';
    }

    const result = await loadProducts({
        page: isLoadMore ? currentPage : 1,
        limit: extraParams.limit || ((window.location.pathname === '/' || window.location.pathname.includes('index.html') || window.location.pathname === '') ? 8 : 12),
        category: categoryFilter,
        subCategory: subCategoryFilter,
        ...extraParams
    });

    const products = result.products || [];
    const pagination = result.pagination;

    if (!isLoadMore) {
        container.innerHTML = '';
        currentPage = 1;
    }

    if (products.length === 0 && !isLoadMore) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;"><i class="fas fa-box-open" style="font-size:3rem;margin-bottom:16px;display:block;"></i><p>لا توجد منتجات في هذا القسم حالياً</p></div>`;
        isLoading = false;
        return;
    }

    products.forEach(prod => {
        const primaryImage = CloudinaryHelper.optimize(prod.images?.[0] || '/assets/images/placeholder.png', 400);
        const productLink = prod.slug ? `/product/${prod.slug}` : `/product.html?id=${prod._id}`;
        const hasDiscount = prod.oldPrice && prod.oldPrice > prod.price;

        container.insertAdjacentHTML('beforeend', `
            <div class="product-card">
                <div class="product-image">
                    <a href="${productLink}">
                        <img src="${primaryImage}" alt="${escapeHTML(prod.name)}" loading="lazy">
                    </a>
                    ${hasDiscount ? `<span class="badge-discount">خصم</span>` : ''}
                    <button class="btn-add-cart"
                        onclick="addToCart('${prod._id}', '${escapeHTML(prod.name)}', ${prod.price}, '${primaryImage}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3><a href="${productLink}">${escapeHTML(prod.name)}</a></h3>
                    <p class="price">
                        ${prod.price} شيكل
                        ${hasDiscount ? `<span class="old-price">${prod.oldPrice} شيكل</span>` : ''}
                    </p>
                </div>
            </div>
        `);
    });

    if (pagination) {
        hasMoreProducts = currentPage < pagination.pages;
        currentPage++;
    }
    container.dataset.loading = 'false';
    updateLoadMoreButton();
}

function updateLoadMoreButton() {
    const btn = document.getElementById('loadMoreBtn');
    if (!btn) return;
    btn.style.display = hasMoreProducts ? 'block' : 'none';
}

// --- Cart Operations ---
function addToCart(id, name, price, image) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price: parseFloat(price), quantity: 1, image });
    }
    saveCart();
    updateCartUI();
    showCartNotification(name);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
    renderCartPage(); // Update cart page if we are on it
}

function updateQuantity(id, delta) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            updateCartUI();
            renderCartPage();
        }
    }
}

function saveCart() {
    localStorage.setItem('misk_cart', JSON.stringify(cart));
}

function showCartNotification(name) {
    const old = document.getElementById('cart-notification');
    if (old) old.remove();
    const notif = document.createElement('div');
    notif.id = 'cart-notification';
    notif.style.cssText = `position:fixed;bottom:24px;left:24px;background:#2d6a4f;color:#fff;padding:12px 20px;border-radius:10px;font-size:0.9rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:slideIn 0.3s ease;`;
    notif.innerHTML = `<i class="fas fa-check-circle" style="margin-left:8px;"></i> تمت الإضافة: ${escapeHTML(name)}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function updateCartUI() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Update Header Badge
    const badge = document.getElementById('widgetCartCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

    // Update Header Text Info
    const emptyMsg = document.getElementById('cartEmptyMsg');
    const filledMsg = document.getElementById('cartFilledMsg');
    const countText = document.getElementById('widgetCartCountText');
    const totalText = document.getElementById('widgetCartTotalText');

    if (count > 0) {
        if (emptyMsg) emptyMsg.style.display = 'none';
        if (filledMsg) filledMsg.style.display = 'inline';
        if (countText) countText.textContent = `${count} منتج`;
        if (totalText) totalText.textContent = `${total.toFixed(2)} ₪`;
    } else {
        if (emptyMsg) emptyMsg.style.display = 'inline';
        if (filledMsg) filledMsg.style.display = 'none';
    }

    // Update Mini-Cart Dropdown Content
    const miniCartContent = document.getElementById('miniCartItems');
    if (miniCartContent) {
        if (cart.length === 0) {
            miniCartContent.innerHTML = `<div class="mini-cart-empty-state"><i class="fas fa-shopping-basket"></i><p>سلتك فارغة حالياً</p></div>`;
        } else {
            miniCartContent.innerHTML = cart.map(item => `
                <div class="mini-cart-item">
                    <img src="${item.image}" alt="${escapeHTML(item.name)}">
                    <div class="mini-item-info">
                        <h4>${escapeHTML(item.name)}</h4>
                        <p>${item.quantity} × ${item.price} ₪</p>
                    </div>
                </div>
            `).join('');
        }
    }
    const miniTotal = document.getElementById('miniCartTotal');
    if (miniTotal) miniTotal.textContent = `${total.toFixed(2)} ₪`;
}

function renderCartPage() {
    const container = document.getElementById('cartPageItems');
    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:50px;">سلتك فارغة حالياً.. <a href="/index.html" style="color:#6a1b9a;font-weight:700;">تسوق الآن</a></td></tr>`;
        updateCartTotals(0);
        return;
    }

    container.innerHTML = cart.map(item => `
        <tr>
            <td>
                <div class="cart-product-info">
                    <img src="${item.image}" alt="${escapeHTML(item.name)}">
                    <span>${escapeHTML(item.name)}</span>
                </div>
            </td>
            <td>${item.price} شيكل</td>
            <td>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
            </td>
            <td style="font-weight:700;">${(item.price * item.quantity).toFixed(2)} شيكل</td>
            <td>
                <button class="remove-btn" onclick="removeFromCart('${item.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
        </tr>
    `).join('');

    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    updateCartTotals(subtotal);
}

function updateCartTotals(subtotal) {
    const subtotalEl = document.getElementById('cartSubtotal');
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);

    const shippingCost = calculateShipping();
    const shippingEl = document.getElementById('shippingCost');
    if (shippingEl) shippingEl.textContent = shippingCost;

    const grandTotalEl = document.getElementById('grandTotal');
    if (grandTotalEl) grandTotalEl.textContent = (subtotal + parseFloat(shippingCost)).toFixed(2);
}

function calculateShipping() {
    const region = document.getElementById('shippingRegion')?.value || 'none';
    if (region === 'none') return "0";
    if (region === 'aqraba') return "10";
    if (region === 'westbank') return "20";
    if (region === 'jerusalem') return "30";
    if (region === 'inside') return "50";
    return "0";
}

window.updateShipping = function() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    updateCartTotals(subtotal);
};

// --- Dynamic Home Layout Engine ---
const DEFAULT_LAYOUT = [
    { id: 'default-slider', type: 'slider', title: 'السلايدر الرئيسي', data: [] },
    { id: 'default-all', type: 'products', title: 'جميع المنتجات', filter: 'all', limit: 8, showLoadMore: true },
    { id: 'default-latest', type: 'products', title: 'أحدث المنتجات', filter: 'latest', limit: 8 },
    { id: 'default-offers', type: 'products', title: 'عروض وتخفيضات', filter: 'offers', limit: 8 },
    { id: 'default-best', type: 'products', title: 'الأكثر مبيعاً', filter: 'best-seller', limit: 8 },
    { id: 'default-rated', type: 'products', title: 'الأعلى تقييماً', filter: 'top-rated', limit: 8 },
    { id: 'default-features', type: 'features', title: 'مميزاتنا', data: [
        { icon: 'fa-shipping-fast', title: 'شحن سريع وآمن', desc: 'توصيل لجميع المناطق' },
        { icon: 'fa-certificate', title: 'منتجات أصلية', desc: 'جودة مضمونة 100%' },
        { icon: 'fa-credit-card', title: 'خيارات دفع سهلة', desc: 'دفع آمن ومتنوع' }
    ]}
];

async function initSite() {
    updateCartUI();
    renderCartPage();

    const main = document.getElementById('dynamic-main');
    if (!main) return; // Not the home page

    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        const layout = (data.success && data.settings && data.settings.homeLayout && data.settings.homeLayout.length > 0)
            ? data.settings.homeLayout
            : DEFAULT_LAYOUT;
        await renderHomeLayout(main, layout);
    } catch (e) {
        console.error("Error loading home layout:", e);
        await renderHomeLayout(main, DEFAULT_LAYOUT);
    }
}

async function renderHomeLayout(main, layout) {
    main.innerHTML = '';
    for (const sec of layout) {
        if (sec.hidden) continue;
        const el = document.createElement('section');
        el.id = `sec-${sec.id}`;
        el.dataset.secType = sec.type;

        switch (sec.type) {
            case 'slider':
                el.className = 'home-slider';
                renderSliderSection(el, sec);
                break;
            case 'products':
                el.className = 'products-section container';
                el.style.marginBottom = '60px';
                await renderProductsSection(el, sec);
                break;
            case 'categories':
                el.className = 'categories-section container';
                el.style.marginBottom = '60px';
                await renderCategoriesSection(el, sec);
                break;
            case 'features':
                el.className = 'features-bar';
                renderFeaturesSection(el, sec.data);
                break;
            case 'promo':
                el.className = 'promo-section container';
                el.style.marginBottom = '60px';
                renderPromoSection(el, sec.data);
                break;
            default:
                continue;
        }
        main.appendChild(el);
    }
}

async function renderProductsSection(el, sec) {
    const titleIcon = sec.filter === 'offers' ? '<i class="fas fa-tag" style="color:#e91e63;margin-left:10px;"></i>' :
                      sec.filter === 'top-rated' ? '<i class="fas fa-star" style="color:#FFD700;margin-left:10px;"></i>' :
                      sec.filter === 'latest' ? '<i class="fas fa-clock" style="color:#6a1b9a;margin-left:10px;"></i>' :
                      sec.filter === 'best-seller' ? '<i class="fas fa-fire" style="color:#ff6f00;margin-left:10px;"></i>' : '';

    const gridId = `grid-${sec.id}`;
    const loadMoreId = `loadmore-${sec.id}`;

    el.innerHTML = `
        <div class="section-title"><h2>${titleIcon}${escapeHTML(sec.title)}</h2></div>
        <div class="product-grid" id="${gridId}"></div>
        ${sec.showLoadMore ? `<div style="text-align:center;margin-top:40px;"><button id="${loadMoreId}" class="btn btn-primary" style="display:none;" onclick="loadMoreProducts('${gridId}', '${loadMoreId}')">عرض المزيد من المنتجات</button></div>` : ''}
    `;

    const params = { limit: sec.limit || 8 };
    if (sec.filter === 'offers') params.onSale = 'true';
    else if (sec.filter === 'best-seller') params.bestSeller = 'true';
    else if (sec.filter === 'top-rated') params.topRated = 'true';
    else if (sec.filter === 'latest') params.latest = 'true';

    await renderProductGrid(gridId, false, params);

    // Show load more button if applicable
    if (sec.showLoadMore) {
        const btn = document.getElementById(loadMoreId);
        if (btn && hasMoreProducts) btn.style.display = 'inline-block';
    }
}

function loadMoreProducts(gridId, btnId) {
    renderProductGrid(gridId, true).then(() => {
        const btn = document.getElementById(btnId);
        if (btn) btn.style.display = hasMoreProducts ? 'inline-block' : 'none';
    });
}

async function renderCategoriesSection(el, sec) {
    const catGridId = `cats-${sec.id}`;
    el.innerHTML = `
        <div class="section-title"><h2>${escapeHTML(sec.title || 'الأقسام')}</h2></div>
        <div id="${catGridId}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:20px;margin-top:20px;"></div>
    `;
    await renderHomeCategories(catGridId);
}

async function renderHomeCategories(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && data.categories.length > 0) {
            const parents = data.categories.filter(c => !c.parentId).slice(0, 12);
            grid.innerHTML = parents.map(c => `
                <a href="/category/${c.slug || c._id}" style="text-align:center;text-decoration:none;color:inherit;display:block;transition:transform 0.3s;" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                    <div style="width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid #f3e5f5;margin:0 auto 10px;box-shadow:0 4px 15px rgba(106,27,154,0.1);">
                        <img src="${c.image || '/assets/images/placeholder.png'}" style="width:100%;height:100%;object-fit:cover;" loading="lazy">
                    </div>
                    <h4 style="font-size:0.85rem;font-weight:600;color:var(--text-color);">${escapeHTML(c.name)}</h4>
                </a>
            `).join('');
        }
    } catch(e) { console.error('Categories load error:', e); }
}

function renderFeaturesSection(el, data) {
    const features = (data && data.length > 0) ? data : [
        { icon: 'fa-shipping-fast', title: 'شحن سريع وآمن', desc: 'توصيل لجميع المناطق' },
        { icon: 'fa-certificate', title: 'منتجات أصلية', desc: 'جودة مضمونة 100%' },
        { icon: 'fa-credit-card', title: 'خيارات دفع سهلة', desc: 'دفع آمن ومتنوع' }
    ];
    el.innerHTML = `
        <div class="container">
            <div class="features-container">
                ${features.map(f => `
                    <div class="feature-item">
                        <i class="fas ${escapeHTML(f.icon)}"></i>
                        <h4>${escapeHTML(f.title)}</h4>
                        <p>${escapeHTML(f.desc)}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderPromoSection(el, data) {
    if (!data || !data.image) { el.remove(); return; }
    el.innerHTML = `
        <div style="background:url('${data.image}') no-repeat center/cover;padding:80px 40px;border-radius:24px;color:#fff;text-align:center;position:relative;overflow:hidden;min-height:300px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);"></div>
            <div style="position:relative;z-index:2;max-width:600px;">
                <h2 style="font-size:2.2rem;margin-bottom:15px;text-shadow:0 2px 10px rgba(0,0,0,0.3);">${escapeHTML(data.title || '')}</h2>
                <p style="font-size:1.1rem;margin-bottom:25px;opacity:0.9;">${escapeHTML(data.text || '')}</p>
                ${data.btnLabel ? `<a href="${data.link || '#'}" class="btn btn-primary">${escapeHTML(data.btnLabel)}</a>` : ''}
            </div>
        </div>
    `;
}

function renderSliderSection(el, config) {
    const slides = config.data || [];
    if (slides.length === 0) {
        el.innerHTML = `
            <div class="slider-wrapper" style="min-height:450px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#fdf6ff 0%,#F3E5F5 100%);">
                <div class="slide-content" style="text-align:center;">
                    <h2 style="color:var(--primary-dark);font-size:2.5rem;">مرحباً بكم في مسك بيوتي</h2>
                    <p style="color:#666;font-size:1.2rem;">اكتشفوا أرقى العطور ومنتجات الجمال</p>
                    <a href="#sec-default-all" class="btn btn-primary" style="margin-top:20px;">تسوق الآن</a>
                </div>
            </div>`;
        return;
    }

    el.innerHTML = `
        <div class="slider-wrapper">
            <div class="slides">
                ${slides.map((s, i) => `
                    <div class="slide ${i === 0 ? 'active' : ''}" style="background-image:url('${s.image}');background-size:cover;background-position:center;">
                        <div class="slide-content">
                            <h2>${escapeHTML(s.title || '')}</h2>
                            <p>${escapeHTML(s.subtitle || '')}</p>
                            ${s.link ? `<a href="${s.link}" class="btn btn-primary">تسوق الآن</a>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            ${slides.length > 1 ? `
                <button class="slider-arrow prev"><i class="fas fa-chevron-right"></i></button>
                <button class="slider-arrow next"><i class="fas fa-chevron-left"></i></button>
                <div class="slider-dots">${slides.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}</div>
            ` : ''}
        </div>
    `;
    if (slides.length > 1) setTimeout(() => initSliderLogic(el), 100);
}

function initSliderLogic(el) {
    const slides = el.querySelectorAll('.slide');
    const dots = el.querySelectorAll('.dot');
    const prev = el.querySelector('.prev');
    const next = el.querySelector('.next');
    let current = 0;
    if (!slides.length) return;
    function show(i) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        current = (i + slides.length) % slides.length;
        slides[current].classList.add('active');
        if (dots[current]) dots[current].classList.add('active');
    }
    if (next) next.onclick = () => show(current + 1);
    if (prev) prev.onclick = () => show(current - 1);
    dots.forEach((d, i) => d.onclick = () => show(i));
    const timer = setInterval(() => { if (!document.contains(el)) { clearInterval(timer); return; } show(current + 1); }, 6000);
}

document.addEventListener('DOMContentLoaded', initSite);

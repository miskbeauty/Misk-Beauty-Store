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
    const { page = 1, limit = 12, category = '', subCategory = '' } = params;
    try {
        const query = new URLSearchParams({ page, limit, t: Date.now() });
        if (category) query.append('category', category);
        if (subCategory) query.append('subCategory', subCategory);

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

async function renderProductGrid(containerId, isLoadMore = false) {
    const container = document.getElementById(containerId);
    if (!container || isLoading) return;
    isLoading = true;
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

    const result = await loadProducts({
        page: isLoadMore ? currentPage : 1,
        limit: 12,
        category: categoryFilter,
        subCategory: subCategoryFilter
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
    isLoading = false;
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

// --- Initialization ---
async function initSite() {
    updateCartUI();
    renderCartPage();

    console.log("Initializing Storefront Home Layout...");
    const layoutContainer = document.getElementById('home-layout-container');
    if (layoutContainer) {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            const layout = (data.success && data.settings && data.settings.homeLayout) ? data.settings.homeLayout : null;

            if (layout && layout.length > 0) {
                console.log("Loading saved layout:", layout);
                await renderHomeLayout(layout);
            } else {
                console.log("No layout found, loading default products...");
                const defaultLayout = [{ id: 'def-prod', type: 'products', title: 'أحدث المنتجات' }];
                await renderHomeLayout(defaultLayout);
            }
        } catch (e) {
            console.error("CRITICAL: Error loading home layout:", e);
            layoutContainer.innerHTML = '<div style="text-align:center;padding:50px;">فشل تحميل المحتوى، يرجى إعادة المحاولة.</div>';
        }
    }
}

async function renderHomeLayout(layout) {
    const container = document.getElementById('home-layout-container');
    if (!container) return;
    container.innerHTML = '';

    for (const section of layout) {
        console.log("Rendering section:", section.type);
        const sectionEl = document.createElement('section');
        try {
            if (section.type === 'slider') {
                renderSliderSection(sectionEl, section);
            } else if (section.type === 'categories') {
                await renderCategoriesSection(sectionEl, section);
            } else if (section.type === 'products') {
                await renderProductsSection(sectionEl, section);
            } else if (section.type === 'promo') {
                renderPromoSection(sectionEl, section);
            } else if (section.type === 'features') {
                renderFeaturesSection(sectionEl, section);
            }
            container.appendChild(sectionEl);
        } catch (err) {
            console.error(`Error rendering section ${section.type}:`, err);
        }
    }
}

function renderSliderSection(el, config) {
    el.className = 'home-slider container';
    const slides = config.data || [];
    if (slides.length === 0) {
        el.style.display = 'none';
        return;
    }

    el.innerHTML = `
        <div class="slider-wrapper">
            <div class="slides">
                ${slides.map((s, i) => `
                    <div class="slide ${i === 0 ? 'active' : ''}" style="background-image: url('${s.image}'); background-size: cover; background-position: center;">
                        <div class="slide-content">
                            <h2>${escapeHTML(s.title)}</h2>
                            <p>${escapeHTML(s.subtitle)}</p>
                            ${s.link ? `<a href="${s.link}" class="btn btn-primary">تسوق الآن</a>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            <button class="slider-arrow prev"><i class="fas fa-chevron-right"></i></button>
            <button class="slider-arrow next"><i class="fas fa-chevron-left"></i></button>
            <div class="slider-dots">
                ${slides.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
            </div>
        </div>
    `;
    setTimeout(() => initSliderLogic(el), 100);
}

function initSliderLogic(el) {
    const slides = el.querySelectorAll('.slide');
    const dots = el.querySelectorAll('.dot');
    const prev = el.querySelector('.prev');
    const next = el.querySelector('.next');
    let current = 0;

    if (!slides.length) return;

    function show(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        if (slides[index]) slides[index].classList.add('active');
        if (dots[index]) dots[index].classList.add('active');
        current = index;
    }

    if (next) next.onclick = () => show((current + 1) % slides.length);
    if (prev) prev.onclick = () => show((current - 1 + slides.length) % slides.length);
    dots.forEach((d, i) => d.onclick = () => show(i));
    
    const autoSlide = setInterval(() => {
        if (!document.contains(el)) { clearInterval(autoSlide); return; }
        if (next) next.click();
    }, 5000);
}

async function renderCategoriesSection(el, config) {
    el.className = 'categories-section container';
    const gridId = `cat-grid-${config.id}`;
    el.innerHTML = `
        <div class="section-title"><h2>${escapeHTML(config.title || 'تصنيفاتنا')}</h2></div>
        <div class="category-grid" id="${gridId}" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap:20px; margin-top:20px;"></div>
    `;
    
    const grid = document.getElementById(gridId);
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && grid) {
            const parents = data.categories.filter(c => !c.parentId).slice(0, 6);
            grid.innerHTML = parents.map(c => `
                <a href="/category/${c.slug || c._id}" class="category-card-mini" style="text-align:center; text-decoration:none; color:inherit;">
                    <div style="width:100%; aspect-ratio:1; border-radius:50%; overflow:hidden; border:3px solid #f3e5f5; margin-bottom:10px;">
                        <img src="${c.image || '/assets/images/placeholder.png'}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <h4 style="font-size:0.9rem;">${escapeHTML(c.name)}</h4>
                </a>
            `).join('');
        }
    } catch(e) { console.error("Error loading cats for home:", e); }
}

async function renderProductsSection(el, config) {
    el.className = 'products container';
    const gridId = `grid-${config.id}`;
    el.innerHTML = `
        <div class="section-title"><h2>${escapeHTML(config.title || 'منتجات مختارة')}</h2></div>
        <div class="product-grid" id="${gridId}"></div>
    `;
    
    // Use existing renderProductGrid
    // TEMPORARY FIX: Bypass global isLoading lock for home layout
    const originalIsLoading = window.isLoading;
    window.isLoading = false; 
    await renderProductGrid(gridId);
    window.isLoading = originalIsLoading;
}

function renderPromoSection(el, config) {
    el.className = 'promo-banner container';
    const d = config.data || {};
    if (!d.image && !d.title) { el.style.display = 'none'; return; }
    
    el.innerHTML = `
        <div class="promo-content">
            <h2>${escapeHTML(d.title)}</h2>
            <p>${escapeHTML(d.text)}</p>
            ${d.link ? `<a href="${d.link}" class="btn-white">${escapeHTML(d.btnLabel || 'اكتشف المزيد')}</a>` : ''}
        </div>
        <div class="promo-image">
            <img src="${d.image || '/assets/images/placeholder.png'}" alt="Promo">
        </div>
    `;
}

function renderFeaturesSection(el, config) {
    el.className = 'features-bar';
    const feats = config.data || [];
    if (feats.length === 0) { el.style.display = 'none'; return; }

    el.innerHTML = `
        <div class="container">
            <div class="features-container" style="display:flex; justify-content:space-around; gap:20px; padding:30px 0; flex-wrap:wrap;">
                ${feats.map(f => `
                    <div class="feature-item" style="text-align:center; min-width:200px;">
                        <i class="fas ${f.icon}" style="font-size:2rem; color:var(--primary-dark); margin-bottom:15px;"></i>
                        <h4 style="margin-bottom:5px;">${escapeHTML(f.title)}</h4>
                        <p style="font-size:0.85rem; color:#666;">${escapeHTML(f.desc)}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', initSite);

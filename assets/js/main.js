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
        brand: params.get('brand') || '',
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
    const { page = 1, limit = 12, category = '', subCategory = '', brand = '', onSale = '', sort = '' } = params;
    try {
        const query = new URLSearchParams({ page, limit, t: Date.now() });
        if (category) query.append('category', category);
        if (subCategory) query.append('subCategory', subCategory);
        if (brand) query.append('brand', brand);
        if (onSale) query.append('onSale', onSale);
        if (sort) query.append('sort', sort);

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
    let brandFilter = '';
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
    }
    
    if (urlParams.category) {
        categoryFilter = urlParams.category;
    }
    if (urlParams.subCategory) {
        subCategoryFilter = urlParams.subCategory;
    }
    if (urlParams.brand) {
        brandFilter = urlParams.brand;
    }

    // Update Section Title if applicable
    const titleEl = container.closest('section')?.querySelector('.section-title h2');
    if (titleEl && containerId === 'productGrid') {
        if (brandFilter) titleEl.textContent = `منتجات ${brandFilter}`;
        else if (subCategoryFilter) titleEl.textContent = subCategoryFilter;
        else if (categoryFilter) titleEl.textContent = categoryFilter;
        else titleEl.textContent = 'جميع المنتجات';
    }

    const result = await loadProducts({
        page: isLoadMore ? currentPage : 1,
        limit: (window.location.pathname === '/' || window.location.pathname.includes('index.html') || window.location.pathname === '') ? 16 : 12,
        category: categoryFilter,
        subCategory: subCategoryFilter,
        brand: brandFilter
        // No special filters for the main grid - shows all products
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

    const homeSection = document.getElementById('home');
    if (homeSection) {
        // Load only the slider dynamically
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            const layout = (data.success && data.settings && data.settings.homeLayout) ? data.settings.homeLayout : null;
            const sliderSec = layout ? layout.find(s => s.type === 'slider') : null;
            
            if (sliderSec) {
                renderSliderSection(homeSection, sliderSec);
            } else {
                // Fallback Slider
                homeSection.innerHTML = `
                    <div class="slider-wrapper">
                        <div class="slides">
                            <div class="slide active" style="background: linear-gradient(135deg, #fdf6ff 0%, #F3E5F5 100%);">
                                <div class="slide-content">
                                    <h2>مرحباً بكم في مسك بيوتي</h2>
                                    <p>اكتشفوا أرقى العطور ومنتجات الجمال</p>
                                    <a href="#products" class="btn btn-primary">تسوق الآن</a>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            console.error("Error loading slider:", e);
        }
    }

    // Revert to simple initialization of fixed grids
    if (document.getElementById('categoriesGrid')) await renderCategoriesGrid();
    if (document.getElementById('newArrivalsGrid')) await renderNewArrivalsGrid();
    if (document.getElementById('offersGrid')) await renderOffersGrid();
    if (document.getElementById('featuredProductsGrid')) await renderBestsellersGrid();
    if (document.getElementById('topRatedGrid')) await renderTopRatedGrid();
    if (document.querySelector('.brands-slider')) await renderBrandsSlider();
    if (document.getElementById('productGrid')) await renderProductGrid('productGrid');
}

async function renderCategoriesGrid() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success) {
            const mainCats = data.categories.filter(c => !c.parentId).slice(0, 6);
            container.innerHTML = mainCats.map(cat => `
                <a href="/category/${cat.slug || cat.name}" class="category-card">
                    <div class="category-image-wrapper">
                        <img src="${cat.image || '/assets/images/placeholder.png'}" alt="${escapeHTML(cat.name)}">
                    </div>
                    <h4>${escapeHTML(cat.name)}</h4>
                </a>
            `).join('');
        }
    } catch (e) { console.error("Error loading categories:", e); }
}

async function renderNewArrivalsGrid() {
    const container = document.getElementById('newArrivalsGrid');
    if (!container) return;
    const result = await loadProducts({ limit: 4, sort: 'newest' });
    const products = result.products || [];
    if (products.length === 0) {
        container.closest('section').style.display = 'none';
        return;
    }
    container.innerHTML = '';
    products.forEach(prod => renderProductCard(prod, container));
}

async function renderTopRatedGrid() {
    const container = document.getElementById('topRatedGrid');
    if (!container) return;
    const result = await loadProducts({ limit: 4, sort: 'top-rated' });
    const products = result.products || [];
    if (products.length === 0) {
        container.closest('section').style.display = 'none';
        return;
    }
    container.innerHTML = '';
    products.forEach(prod => renderProductCard(prod, container));
}

let offersCurrentPage = 1;
let hasMoreOffers = true;

// Renders only discounted products (oldPrice > price)
async function renderOffersGrid(isLoadMore = false) {
    const container = document.getElementById('offersGrid');
    if (!container || (isLoading && isLoadMore)) return;
    
    if (!isLoadMore) {
        container.innerHTML = `<div class="loading-products" style="grid-column:1/-1;text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#c8a96e;"></i></div>`;
        offersCurrentPage = 1;
    }
    
    isLoading = true;
    const result = await loadProducts({ 
        page: isLoadMore ? offersCurrentPage : 1, 
        limit: 4, 
        onSale: 'true' 
    });
    
    const products = result.products || [];
    const pagination = result.pagination;
    
    isLoading = false;
    
    if (products.length === 0 && !isLoadMore) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;"><i class="fas fa-tag" style="font-size:3rem;margin-bottom:16px;display:block;"></i><p>لا توجد عروض متاحة حالياً</p></div>`;
        return;
    }
    
    if (!isLoadMore) container.innerHTML = '';
    
    products.forEach(prod => renderProductCard(prod, container));
    
    if (pagination) {
        hasMoreOffers = offersCurrentPage < pagination.pages;
        offersCurrentPage++;
    }
    
    const btn = document.getElementById('loadMoreOffersBtn');
    if (btn) btn.style.display = hasMoreOffers ? 'inline-block' : 'none';
}

let bestsellersCurrentPage = 1;
let hasMoreBestsellers = true;

// Renders bestselling products (sorted by salesCount)
async function renderBestsellersGrid(isLoadMore = false) {
    const container = document.getElementById('featuredProductsGrid');
    if (!container || (isLoading && isLoadMore)) return;
    
    if (!isLoadMore) {
        container.innerHTML = `<div class="loading-products" style="grid-column:1/-1;text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#c8a96e;"></i></div>`;
        bestsellersCurrentPage = 1;
    }
    
    isLoading = true;
    const result = await loadProducts({ 
        page: isLoadMore ? bestsellersCurrentPage : 1, 
        limit: 4, 
        sort: 'bestsellers' 
    });
    
    const products = result.products || [];
    const pagination = result.pagination;
    
    isLoading = false;
    
    if (products.length === 0 && !isLoadMore) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;"><i class="fas fa-fire" style="font-size:3rem;margin-bottom:16px;display:block;"></i><p>لا توجد بيانات مبيعات بعد</p></div>`;
        return;
    }
    
    if (!isLoadMore) container.innerHTML = '';
    
    products.forEach(prod => renderProductCard(prod, container));
    
    if (pagination) {
        hasMoreBestsellers = bestsellersCurrentPage < pagination.pages;
        bestsellersCurrentPage++;
    }
    
    const btn = document.getElementById('loadMoreBestsellersBtn');
    if (btn) btn.style.display = hasMoreBestsellers ? 'inline-block' : 'none';
}

function renderProductCard(prod, container) {
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
                <div class="price-wrapper">
                    ${hasDiscount
                        ? `<span class="old-price">${prod.oldPrice} شيكل</span><span class="sale-price">${prod.price} شيكل</span>`
                        : `<span class="price">${prod.price} شيكل</span>`
                    }
                </div>
            </div>
        </div>
    `);
}


function renderSliderSection(el, config) {
    const slides = config.data || [];
    if (slides.length === 0) return;

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

async function renderBrandsSlider() {
    const sliderContainer = document.querySelector('.brands-slider');
    if (!sliderContainer) return;

    try {
        const res = await fetch('/api/brands');
        const data = await res.json();
        if (data.success && data.brands.length > 0) {
            const sortedBrands = data.brands.sort((a, b) => (b.priority || 0) - (a.priority || 0));
            // Double the items for seamless loop if few brands
            const brandsToRender = sortedBrands.length < 6 ? [...sortedBrands, ...sortedBrands] : sortedBrands;
            
            sliderContainer.innerHTML = brandsToRender.map(brand => `
                <a href="/index.html?brand=${encodeURIComponent(brand.name)}#products" class="brand-item">
                    <img src="${brand.logo || '/assets/images/placeholder.png'}" alt="${escapeHTML(brand.name)}">
                </a>
            `).join('');
        }
    } catch (e) {
        console.error("Error loading brands slider:", e);
    }
}

document.addEventListener('DOMContentLoaded', initSite);


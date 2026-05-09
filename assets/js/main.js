/**
 * Misk Beauty & Gifts - Core Logic
 * Fix: قراءة params من URL لعرض المنتجات الصحيحة حسب القسم
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

// Fix: قراءة الـ URL params بشكل صحيح
function getURLParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        category: params.get('category') || '',
        subCategory: params.get('subCategory') || '',
        slug: params.get('slug') || ''
    };
}

// Fix: استخراج slug من مسار URL مثل /category/عطور
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

// Fix: الدالة الرئيسية تقرأ القسم من URL تلقائياً
async function renderProductGrid(containerId, isLoadMore = false) {
    const container = document.getElementById(containerId);
    if (!container || isLoading) return;

    isLoading = true;

    // عرض loading
    if (!isLoadMore) {
        container.innerHTML = `
            <div class="loading-products" style="grid-column:1/-1;text-align:center;padding:40px;">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;color:#c8a96e;"></i>
                <p>جاري تحميل المنتجات...</p>
            </div>`;
    }

    // Fix: تحديد القسم من URL
    let categoryFilter = '';
    let subCategoryFilter = '';

    const slugFromPath = getCategorySlugFromPath();
    const urlParams = getURLParams();

    if (slugFromPath) {
        // المسار /category/slug — ابحث عن القسم في localStorage أو API
        const savedCats = localStorage.getItem('misk_categories');
        const allCats = savedCats ? JSON.parse(savedCats) : [];
        const matchedCat = allCats.find(c => c.slug === slugFromPath);

        if (matchedCat) {
            if (matchedCat.parentId) {
                // قسم فرعي
                subCategoryFilter = matchedCat.name;
            } else {
                // قسم رئيسي
                categoryFilter = matchedCat.name;
            }
        } else {
            // إذا لم يوجد في الكاش، اجلب من API
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
        container.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
                <i class="fas fa-box-open" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p>لا توجد منتجات في هذا القسم حالياً</p>
            </div>`;
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

    // تحديث حالة "تحميل المزيد"
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

// إدارة سلة المشتريات
function addToCart(id, name, price, image) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price: parseFloat(price), quantity: 1, image });
    }
    localStorage.setItem('misk_cart', JSON.stringify(cart));
    updateCartUI();
    showCartNotification(name);
}

function showCartNotification(name) {
    // إزالة أي notification قديمة
    const old = document.getElementById('cart-notification');
    if (old) old.remove();

    const notif = document.createElement('div');
    notif.id = 'cart-notification';
    notif.style.cssText = `
        position:fixed;bottom:24px;left:24px;
        background:#2d6a4f;color:#fff;
        padding:12px 20px;border-radius:10px;
        font-size:0.9rem;z-index:9999;
        box-shadow:0 4px 12px rgba(0,0,0,0.2);
        animation:slideIn 0.3s ease;
    `;
    notif.innerHTML = `<i class="fas fa-check-circle" style="margin-left:8px;"></i> تمت الإضافة: ${escapeHTML(name)}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

function updateCartUI() {
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const badge = document.getElementById('widgetCartCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }

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
}

// تشغيل الموقع
async function initSite() {
    updateCartUI();
    await renderProductGrid('productGrid');
}

document.addEventListener('DOMContentLoaded', initSite);

/**
 * Misk Beauty & Gifts - Core Logic
 * Focused on Security, Validation, and Premium UX
 */

// --- Data Protection Helper ---
const DataVault = {
    encrypt: (data) => btoa(encodeURIComponent(JSON.stringify(data))), // Basic obfuscation for demo
    decrypt: (secret) => {
        if (!secret) return null;
        try {
            return JSON.parse(decodeURIComponent(atob(secret)));
        } catch (e) {
            return null;
        }
    }
};

// Cart State - Load from LocalStorage if exists
let cart = JSON.parse(localStorage.getItem('misk_cart')) || [];

// DOM Elements
const cartSidebar = document.getElementById('cartSidebar');
const cartToggle = document.getElementById('cartToggle'); // Might be null now
const closeCart = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');

// New Functional Row Elements
const cartWidgetToggle = document.getElementById('cartWidgetToggle');
const widgetCartCountBadge = document.getElementById('widgetCartCountBadge');
const widgetCartCountText = document.getElementById('widgetCartCountText');
const widgetCartTotalText = document.getElementById('widgetCartTotalText');

// Mini Cart Elements
const miniCartItems = document.getElementById('miniCartItems');
const miniCartTotal = document.getElementById('miniCartTotal');

// Search Elements
const searchInput = document.getElementById('searchInput');
const noResultsMessage = document.getElementById('noResultsMessage');
const productCards = document.querySelectorAll('.product-card');

// Slider Elements
const slides = document.querySelectorAll('.slide');
const dots = document.querySelectorAll('.dot');
const prevBtn = document.querySelector('.slider-arrow.prev');
const nextBtn = document.querySelector('.slider-arrow.next');

// --- Security & Validation ---

/**
 * Validates product data before adding to cart
 * Prevents malicious data injection
 */
function validateProduct(id, name, price) {
    if (typeof id !== 'number' || isNaN(id)) return false;
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) return false;
    if (typeof price !== 'number' || isNaN(price) || price < 0) return false;

    // Basic sanitization for name (remove potential HTML tags)
    const sanitizedName = name.replace(/<[^>]*>?/gm, '');
    if (sanitizedName !== name) return false; // Reject if it looks like HTML

    return true;
}

// --- Cart Core Functions ---

function addToCart(id, name, price, image = 'assets/images/1745215944148877862.png', variant = null) {
    console.log(`جارِ إضافة المنتج: ${name}`);

    // Data Validation
    if (!validateProduct(id, name, price)) {
        console.error("فشل التحقق من صحة بيانات المنتج. تم منع الإضافة لأسباب أمنية.");
        alert("حدث خطأ في معالجة المنتج. يرجى المحاولة مرة أخرى.");
        return;
    }

    // Include variant in uniqueness check if applicable
    const existingItem = cart.find(item => item.id === id && JSON.stringify(item.variant) === JSON.stringify(variant));

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1, image, variant });
    }

    saveCart();
    updateCartUI();
    openCart();
}

function saveCart() {
    localStorage.setItem('misk_cart', JSON.stringify(cart));
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
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
        }
    }
}

function updateCartUI() {
    // Clear and redraw
    cartItemsContainer.innerHTML = '';
    let total = 0;
    let count = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        count += item.quantity;

        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        let variantText = '';
        if (item.variant) {
            variantText = Object.entries(item.variant).map(([k, v]) => `<span style="font-size: 0.75rem; color: #888;">${k}: ${v}</span>`).join(' | ');
        }
        cartItem.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    <img src="${item.image}" class="cart-item-img" alt="${item.name}">
                    <div>
                        <h4 style="margin: 0; font-size: 0.95rem;">${escapeHTML(item.name)}</h4>
                        ${variantText ? `<div style="margin-top: 2px;">${variantText}</div>` : ''}
                        <p style="color: #6a1b9a; margin: 5px 0; font-size: 0.85rem;">${item.price} شيكل × ${item.quantity}</p>
                    </div>
                </div>
                <button onclick="removeFromCart(${item.id})" style="background: none; border: none; color: #880E4F; cursor: pointer; padding: 5px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartCount.textContent = count;
    cartTotal.textContent = total;

    // Update new widget
    const isEmpty = cart.length === 0;
    const cartWidget = document.getElementById('cartWidgetToggle');

    if (cartWidget) {
        if (isEmpty) {
            cartWidget.classList.add('is-empty');
        } else {
            cartWidget.classList.remove('is-empty');
        }
    }

    if (widgetCartCountBadge) {
        widgetCartCountBadge.textContent = count;
        if (isEmpty) {
            widgetCartCountBadge.style.display = 'none';
        } else {
            widgetCartCountBadge.style.display = 'flex';
        }
    }

    if (widgetCartCountText) {
        if (isEmpty) {
            widgetCartCountText.textContent = "السلة فارغة";
            widgetCartCountText.style.display = 'inline';
        } else {
            widgetCartCountText.textContent = `${count} منتجات`;
            widgetCartCountText.style.display = 'inline';
        }
    }

    // --- Cart Page Specific Rendering ---
    const cartPageItems = document.getElementById('cartPageItems');
    if (cartPageItems) {
        renderFullCart();
    }

    // --- Checkout Page Specific Rendering ---
    const checkoutItemsList = document.getElementById('checkoutItemsList');
    if (checkoutItemsList) {
        renderCheckoutSummary();
    }

    // --- Update Mini Cart Dropdown ---
    if (miniCartItems) {
        miniCartItems.innerHTML = '';
        if (isEmpty) {
            miniCartItems.innerHTML = '<p style="text-align: center; color: #888; padding: 20px;">السلة فارغة.</p>';
        } else {
            cart.forEach(item => {
                const miniItem = document.createElement('div');
                miniItem.className = 'mini-cart-item';
                miniItem.innerHTML = `
                        <img src="${item.image}" alt="${item.name}" style="width: 40px; height: 40px; border-radius: 5px; margin-left: 10px; object-fit: cover;">
                        <div class="mini-item-info">
                            <h4 style="margin: 0; font-size: 0.9rem;">${escapeHTML(item.name)}</h4>
                            <p style="margin: 2px 0 0; font-size: 0.8rem; color: #6a1b9a;">${item.price} شيكل × ${item.quantity}</p>
                        </div>
                    `;
                miniCartItems.appendChild(miniItem);
            });
        }
    }
    if (miniCartTotal) miniCartTotal.textContent = total;
}

// Full Cart Page Logic
const shippingRates = {
    'none': 0,
    'aqraba': 7,
    'westbank': 20,
    'jerusalem': 30,
    'inside': 70
};

let selectedShippingRate = 0;

function renderFullCart() {
    const cartPageItems = document.getElementById('cartPageItems');
    const subtotalEl = document.getElementById('cartSubtotal');
    const shippingEl = document.getElementById('shippingCost');
    const grandTotalEl = document.getElementById('grandTotal');
    const freeShippingMsg = document.getElementById('freeShippingMsg');

    if (!cartPageItems) return;

    cartPageItems.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        cartPageItems.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px;">سلة المشتريات فارغة.</td></tr>';
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="cart-product-info">
                        <img src="${item.image}" alt="${item.name}">
                        <span>${escapeHTML(item.name)}</span>
                    </div>
                </td>
                <td>${item.price} شيكل</td>
                <td>
                    <div class="quantity-controls">
                        <button onclick="updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </td>
                <td>${itemTotal} شيكل</td>
                <td>
                    <button class="remove-btn" onclick="removeFromCart(${item.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            cartPageItems.appendChild(tr);
        });
    }

    subtotalEl.textContent = `${subtotal}`;

    // Free Shipping Rule
    let freeShippingThreshold = 300;
    const savedSettings = localStorage.getItem('misk_settings');
    if (savedSettings) {
        freeShippingThreshold = JSON.parse(savedSettings).freeShippingThreshold || 300;
    }

    let activeShipping = selectedShippingRate;
    if (subtotal >= freeShippingThreshold && selectedShippingRate > 0) {
        activeShipping = 0;
        if (freeShippingMsg) freeShippingMsg.style.display = 'block';
        if (freeShippingMsg) freeShippingMsg.innerHTML = `<i class="fas fa-truck"></i> مبروك! حصلت على توصيل مجاني`;
    } else {
        if (freeShippingMsg) freeShippingMsg.style.display = 'none';
    }

    shippingEl.textContent = `${activeShipping}`;
    grandTotalEl.textContent = `${subtotal + activeShipping}`;
}

function updateShipping() {
    const selector = document.getElementById('shippingRegion');
    if (selector) {
        selectedShippingRate = shippingRates[selector.value] || 0;
        renderFullCart();
    }
}

// Checkout Page Functions
function renderCheckoutSummary() {
    const listContainer = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const shippingEl = document.getElementById('checkoutShipping');
    const grandTotalEl = document.getElementById('checkoutGrandTotal');

    if (!listContainer) return;

    listContainer.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'checkout-item-compact';
        itemDiv.style.display = 'flex';
        itemDiv.style.justifyContent = 'space-between';
        itemDiv.style.marginBottom = '10px';
        itemDiv.style.fontSize = '0.9rem';
        itemDiv.innerHTML = `
            <span>${escapeHTML(item.name)} (×${item.quantity})</span>
            <span>${itemTotal} شيكل</span>
        `;
        listContainer.appendChild(itemDiv);
    });

    if (cart.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #888;">السلة فارغة</p>';
    }

    subtotalEl.textContent = `${subtotal}`;

    // Apply Free Shipping Rule in Checkout too
    let freeShippingThreshold = 300;
    const savedSettings = localStorage.getItem('misk_settings');
    if (savedSettings) {
        freeShippingThreshold = JSON.parse(savedSettings).freeShippingThreshold || 300;
    }

    let activeShipping = selectedShippingRate;
    if (subtotal >= freeShippingThreshold && selectedShippingRate > 0) {
        activeShipping = 0;
    }

    shippingEl.textContent = `${activeShipping}`;
    grandTotalEl.textContent = `${subtotal + activeShipping}`;
}

function updateCheckoutShipping() {
    const citySelector = document.getElementById('checkoutCity');
    if (citySelector) {
        selectedShippingRate = shippingRates[citySelector.value] || 0;
        renderCheckoutSummary();
    }
}

function handleCheckoutSubmit(e) {
    if (e) e.preventDefault();

    // Basic validation
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const region = document.getElementById('checkoutCity').value;
    const city = document.getElementById('cityText').value.trim();
    const address = document.getElementById('address').value.trim();

    if (!fullName || !phone || region === 'none' || !city || !address) {
        alert("يرجى ملء جميع الحقول المطلوبة واختيار المنطقة.");
        return;
    }

    if (cart.length === 0) {
        alert("سلة المشتريات فارغة!");
        return;
    }

    // Success Action
    const checkoutContent = document.getElementById('checkoutContent');
    const successSection = document.getElementById('successSection');

    if (checkoutContent && successSection) {
        checkoutContent.style.display = 'none';
        successSection.style.display = 'block';

        // Update WhatsApp Order Link if button exists
        const waBtn = document.getElementById('waOrderBtn');
        if (waBtn) {
            let storeWa = "+970599000000";
            const settings = JSON.parse(localStorage.getItem('misk_settings'));
            if (settings && settings.whatsapp) storeWa = settings.whatsapp;

            const orderMsg = `مرحباً مسك بيوتي، أود تأكيد طلبي:\nالاسم: ${fullName}\nالعنوان: ${address}, ${city}\nالإجمالي: ${grandTotalEl.textContent} شيكل`;
            waBtn.href = `https://wa.me/${storeWa.replace('+', '')}?text=${encodeURIComponent(orderMsg)}`;
        }

        // --- Data Protection: Encrypt and Persist Order & Customer ---
        const encryptedOrders = localStorage.getItem('misk_orders_vault');
        const orders = DataVault.decrypt(encryptedOrders) || [];

        const newOrder = {
            id: Date.now().toString().slice(-5),
            date: new Date().toISOString().split('T')[0],
            customer: fullName,
            whatsapp: phone,
            city: region + ", " + city,
            address: address,
            total: grandTotalEl.textContent + " شيكل",
            status: "waiting"
        };

        orders.push(newOrder);
        localStorage.setItem('misk_orders_vault', DataVault.encrypt(orders));

        // Update Customers tab data
        const encryptedCustomers = localStorage.getItem('misk_customers_vault');
        const customers = DataVault.decrypt(encryptedCustomers) || [];

        let customer = customers.find(c => c.phone === phone);
        const orderAmount = parseInt(grandTotalEl.textContent) || 0;

        if (customer) {
            customer.totalSpend += orderAmount;
            customer.points = (customer.points || 0) + orderAmount; // 1 ILS = 1 Point
            if (!customer.pointsHistory) customer.pointsHistory = [];
            customer.pointsHistory.push({ amount: orderAmount, date: newOrder.date });
            customer.orderCount += 1;
            customer.lastOrderDate = newOrder.date;
            customer.name = fullName;
        } else {
            customers.push({
                name: fullName,
                phone: phone,
                totalSpend: orderAmount,
                points: orderAmount,
                pointsHistory: [{ amount: orderAmount, date: newOrder.date }],
                orderCount: 1,
                lastOrderDate: newOrder.date
            });
        }
        localStorage.setItem('misk_customers_vault', DataVault.encrypt(customers));

        // Clear Cart
        cart = [];
        saveCart();
        updateCartUI();

        // Scroll to top
        window.scrollTo(0, 0);
    }
}

/**
 * Escapes HTML characters to prevent XSS
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// --- UI Interactions ---

function openCart() {
    // Redirect to the full cart page instead of just opening a sidebar
    window.location.href = 'cart.html';
}

// Event Listeners
if (cartToggle) cartToggle.addEventListener('click', openCart);
if (cartWidgetToggle) cartWidgetToggle.addEventListener('click', openCart);
if (closeCart) closeCart.addEventListener('click', () => cartSidebar?.classList.remove('active'));

// --- Slider Component ---
let currentSlide = 0;
let slideInterval;

function showSlide(index) {
    if (slides.length === 0) return;

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    currentSlide = (index + slides.length) % slides.length;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
}

function nextSlide() {
    showSlide(currentSlide + 1);
}

function prevSlide() {
    showSlide(currentSlide - 1);
}

function startSlideShow() {
    stopSlideShow();
    slideInterval = setInterval(nextSlide, 5000);
}

function stopSlideShow() {
    if (slideInterval) clearInterval(slideInterval);
}

// Slider Listeners
if (nextBtn) nextBtn.addEventListener('click', () => {
    nextSlide();
    startSlideShow(); // Reset timer
});

if (prevBtn) prevBtn.addEventListener('click', () => {
    prevSlide();
    startSlideShow(); // Reset timer
});

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        showSlide(index);
        startSlideShow(); // Reset timer
    });
});

// --- Apply Global Settings ---
function applyGlobalSettings() {
    const savedSettings = localStorage.getItem('misk_settings');
    if (!savedSettings) return;

    const settings = JSON.parse(savedSettings);

    // 1. Meta Tags (SEO)
    if (settings.metaTitle) {
        // If it's the home page, use the full meta title, else prefix it
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '' || window.location.pathname.includes('index.html')) {
            document.title = settings.metaTitle;
        } else if (!window.location.pathname.includes('product.html')) {
            // For other pages, we usually want "Page Name | Store Name"
            if (!document.title.includes(settings.name)) {
                const currentTitle = document.title.split('|')[0].trim();
                document.title = `${currentTitle} | ${settings.name}`;
            }
        }
    }

    if (settings.metaDescription) {
        // Only set global meta description if the page doesn't have a specific one (e.g. product page)
        if (!window.location.pathname.includes('product.html')) {
            let metaDesc = document.querySelector('meta[name="description"]');
            if (!metaDesc) {
                metaDesc = document.createElement('meta');
                metaDesc.name = "description";
                document.head.appendChild(metaDesc);
            }
            metaDesc.content = settings.metaDescription;
        }
    }

    if (settings.metaKeywords) {
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.name = "keywords";
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.content = settings.metaKeywords;
    }

    // 2. Footer Updates
    const footerName = document.querySelector('footer .footer-col h3');
    if (footerName && settings.name) footerName.textContent = settings.name;

    const footerDesc = document.querySelector('footer .footer-col p');
    if (footerDesc && settings.description) footerDesc.textContent = settings.description;

    const copyright = document.querySelector('.copyright');
    if (copyright && settings.name) {
        copyright.textContent = `© ${new Date().getFullYear()} ${settings.name}. جميع الحقوق محفوظة`;
    }

    // 3. Social & WhatsApp
    const socialLinks = document.querySelector('.social-links');
    if (socialLinks) {
        socialLinks.innerHTML = '';
        if (settings.instagram) {
            socialLinks.insertAdjacentHTML('beforeend', `<a href="${settings.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`);
        }
        if (settings.facebook) {
            socialLinks.insertAdjacentHTML('beforeend', `<a href="${settings.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>`);
        }
        if (settings.whatsapp) {
            const cleanWa = settings.whatsapp.replace(/\D/g, '');
            socialLinks.insertAdjacentHTML('beforeend', `<a href="https://wa.me/${cleanWa}" target="_blank"><i class="fab fa-whatsapp"></i></a>`);
        }
        if (settings.tiktok) {
            socialLinks.insertAdjacentHTML('beforeend', `<a href="${settings.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>`);
        }
    }

    // 4. Legal Links in Footer
    const footerLinksUl = document.querySelector('footer .footer-links');
    if (footerLinksUl) {
        // Only append if they don't exist to avoid duplicates
        if (settings.privacyPolicy && !footerLinksUl.innerHTML.includes('type=privacy')) {
            footerLinksUl.insertAdjacentHTML('beforeend', `<li><a href="legal.html?type=privacy">سياسة الخصوصية</a></li>`);
        }
        if (settings.termsOfUse && !footerLinksUl.innerHTML.includes('type=terms')) {
            footerLinksUl.insertAdjacentHTML('beforeend', `<li><a href="legal.html?type=terms">شروط الاستخدام</a></li>`);
        }
    }
}

// Initialization
startSlideShow();
updateCartUI(); // Ensure UI reflects localStorage state on load
applyGlobalSettings(); // Apply store-wide settings

// --- Search Functionality ---

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        let anyVisible = false;

        productCards.forEach(card => {
            const productName = card.getAttribute('data-name').toLowerCase();
            if (productName.includes(searchTerm)) {
                card.style.display = 'block';
                anyVisible = true;
            } else {
                card.style.display = 'none';
            }
        });

        // Show/Hide No Results Message
        if (noResultsMessage) {
            if (!anyVisible) {
                noResultsMessage.classList.remove('hidden');
            } else {
                noResultsMessage.classList.add('hidden');
            }
        }
    });
}

// Close cart when clicking outside (kept for safety, though we now redirect)
document.addEventListener('click', (e) => {
    if (!cartSidebar) return;
    const isClickInsideCart = cartSidebar.contains(e.target);
    const isClickOnToggle = (cartToggle && cartToggle.contains(e.target)) || (cartWidgetToggle && cartWidgetToggle.contains(e.target));

    if (!isClickInsideCart && !isClickOnToggle && cartSidebar.classList.contains('active')) {
        cartSidebar.classList.remove('active');
    }
});

// --- Single Product Page Interactions ---

// --- Advanced Product Data Management ---

function loadProducts() {
    let products = JSON.parse(localStorage.getItem('misk_products'));
    if (!products || products.length === 0) {
        products = [
            {
                id: 1,
                name: "عطر مسك إيطالي فاخر",
                slug: "premium-italian-musk",
                metaDesc: "عطر مسك فاخر يدوم طويلاً",
                category: "عطور",
                subCategory: "عطور رجالية",
                priority: 10,
                price: 150,
                stock: 24,
                images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=800&auto=format&fit=crop"],
                desc: "<p>عطر مسك إيطالي فاخر يدوم طويلاً.</p>",
                variants: [
                    { label: "50 مل", price: 150, stock: 10, sku: "M-50" },
                    { label: "100 مل", price: 280, stock: 5, sku: "M-100" }
                ]
            }
        ];
    }
    return products;
}

function getProductCardHTML(prod) {
    const primaryImage = prod.images && prod.images[0] ? prod.images[0] : 'https://placehold.co/400x400?text=No+Image';
    const hasDiscount = prod.originalPrice && prod.originalPrice > prod.price;
    const discountPercent = hasDiscount ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) : 0;

    return `
        <div class="product-card" data-id="${prod.id}" data-name="${prod.name}" data-price="${prod.price}">
            ${hasDiscount ? `<span class="badge-sale">-${discountPercent}%</span>` : ''}
            <div class="product-image">
                <a href="product.html?id=${prod.id}">
                    <img src="${primaryImage}" alt="${prod.name}">
                </a>
                <div class="product-actions">
                    <button class="btn-quick-view" onclick="location.href='product.html?id=${prod.id}'"><i class="fas fa-eye"></i></button>
                    <button class="btn-add-cart"
                        onclick="addToCart(${prod.id}, '${prod.name}', ${prod.price}, '${primaryImage}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-category-small">${prod.subCategory || prod.category}</div>
                <a href="product.html?id=${prod.id}">
                    <h3>${prod.name}</h3>
                </a>
                <div class="price-wrapper" style="margin-bottom: 0;">
                    ${hasDiscount ? `<span class="old-price" style="font-size: 0.85rem;">${prod.originalPrice} شيكل</span>` : ''}
                    <p class="price" style="${hasDiscount ? 'color: #ff5252;' : ''}">${prod.price} شيكل</p>
                </div>
            </div>
        </div>
    `;
}

function renderProductGrid(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let products = loadProducts();

    // Automatic Category Filtering based on URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const filterCat = urlParams.get('category');
    const filterSub = urlParams.get('sub');

    // Category Static Content Injection
    const headerContainer = document.getElementById('categoryHeaderContainer');
    if (headerContainer) {
        headerContainer.innerHTML = '';
        const savedCats = localStorage.getItem('misk_categories');
        if (savedCats) {
            const categories = JSON.parse(savedCats);
            let activeCat = null;
            if (filterSub) {
                activeCat = categories.find(c => c.name === filterSub);
            } else if (filterCat) {
                activeCat = categories.find(c => c.name === filterCat);
            }

            if (activeCat) {
                if (activeCat.staticHeader && activeCat.staticHeader !== '<p><br></p>') {
                    headerContainer.innerHTML = `<div class="category-rich-header">${activeCat.staticHeader}</div>`;
                }
                const sectionTitle = document.querySelector('.section-title h2');
                if (sectionTitle) sectionTitle.innerText = activeCat.name;
            }
        }
    }

    if (filterCat) {
        products = products.filter(p => p.category === filterCat);
    }
    if (filterSub) {
        products = products.filter(p => p.subCategory === filterSub);
    }

    // Sort by Priority (Descending)
    products.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    container.innerHTML = '';
    products.forEach(prod => {
        container.insertAdjacentHTML('beforeend', getProductCardHTML(prod));
    });
}

// --- Single Product Page (Advanced) ---

function initProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = parseInt(urlParams.get('id'));
    if (!prodId) return;

    const products = loadProducts();
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    // Update Meta
    const savedSettings = localStorage.getItem('misk_settings');
    const storeName = savedSettings ? JSON.parse(savedSettings).name : "مسك بيوتي";
    document.title = `${prod.name} | ${storeName}`;
    if (prod.metaDesc) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = "description";
            document.head.appendChild(meta);
        }
        meta.content = prod.metaDesc;
    }

    // Breadcrumbs
    const currentBreadcrumb = document.querySelector('.breadcrumbs .current-page');
    if (currentBreadcrumb) currentBreadcrumb.textContent = prod.name;

    // Gallery
    const mainImg = document.getElementById('mainProductImg');
    const thumbList = document.querySelector('.thumbnail-list');
    if (mainImg && prod.images && prod.images.length > 0) {
        mainImg.src = prod.images[0];

        if (thumbList) {
            thumbList.innerHTML = '';
            prod.images.forEach((img, idx) => {
                const thumb = document.createElement('img');
                thumb.src = img;
                thumb.className = `thumb ${idx === 0 ? 'active' : ''}`;
                thumb.onclick = function () {
                    document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                    this.classList.add('active');
                    mainImg.src = this.src;
                };
                thumbList.appendChild(thumb);
            });
        }
    }

    // Details logic
    const titleEl = document.querySelector('.product-title');
    if (titleEl) titleEl.textContent = prod.name;

    const skuEl = document.getElementById('product-sku');
    if (skuEl) skuEl.textContent = prod.sku || 'N/A';

    const stockEl = document.getElementById('product-stock-status');
    const stockCountEl = document.getElementById('stock-count');

    function updateStockDisplay(count) {
        if (!stockEl) return;
        if (count > 0) {
            stockEl.innerHTML = `<span style="color: #2e7d32;"><i class="fas fa-check-circle"></i> متوفر في المخزون</span>`;
            if (stockCountEl) stockCountEl.textContent = `(${count} متوفرة)`;
        } else {
            stockEl.innerHTML = `<span style="color: #d32f2f;"><i class="fas fa-times-circle"></i> غير متوفر حالياً</span>`;
            if (stockCountEl) stockCountEl.textContent = '';
        }
    }

    updateStockDisplay(prod.stock);

    const priceWrapper = document.querySelector('.price-wrapper-single');
    function updatePriceDisplay(price, original) {
        if (!priceWrapper) return;
        const hasDiscount = original && original > price;
        priceWrapper.innerHTML = `
            ${hasDiscount ? `<span class="old-price-single">${original} شيكل</span>` : ''}
            <span class="sale-price-single" style="${hasDiscount ? 'color: #ff5252;' : ''}">${price} شيكل</span>
        `;
    }

    updatePriceDisplay(prod.price, prod.originalPrice);

    // Description (Rich Text)
    const descEl = document.querySelector('.product-description');
    if (descEl) {
        descEl.innerHTML = `<h3>وصف المنتج</h3>` + (prod.desc || '<p>لا يوجد وصف متاح.</p>');
    }

    // Variants v2
    const purchaseActions = document.querySelector('.purchase-actions');
    if (purchaseActions && prod.variants && prod.variants.length > 0) {
        // Remove existing selectors if any
        document.querySelectorAll('.variant-selectors').forEach(el => el.remove());

        const variantContainer = document.createElement('div');
        variantContainer.className = 'variant-selectors';
        variantContainer.style.marginBottom = '25px';

        variantContainer.innerHTML = `
            <label style="display: block; margin-bottom: 12px; font-weight: 700; color: #444;">المواصفات المختارة:</label>
            <div class="variant-options-v2" style="display: flex; gap: 12px; flex-wrap: wrap;">
                ${prod.variants.map((v, i) => `
                    <button class="variant-opt-v2-btn ${i === 0 ? 'active' : ''}" 
                            data-label="${v.label}"
                            data-price="${v.price}"
                            data-orig="${v.originalPrice || ''}"
                            data-stock="${v.stock}"
                            data-sku="${v.sku || ''}">
                        ${v.label}
                    </button>
                `).join('')}
            </div>
        `;

        // Insert before purchase actions
        purchaseActions.parentNode.insertBefore(variantContainer, purchaseActions);

        // Variant Selection Logic
        document.querySelectorAll('.variant-opt-v2-btn').forEach(btn => {
            btn.onclick = function () {
                document.querySelectorAll('.variant-opt-v2-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                // Update Price, Stock, SKU
                const vPrice = parseInt(this.getAttribute('data-price'));
                const vOrig = this.getAttribute('data-orig') ? parseInt(this.getAttribute('data-orig')) : null;
                const vStock = parseInt(this.getAttribute('data-stock'));
                const vSku = this.getAttribute('data-sku');

                updatePriceDisplay(vPrice, vOrig);
                updateStockDisplay(vStock);
                if (skuEl) skuEl.textContent = vSku || prod.sku || 'N/A';
            };
        });

        // Initialize with first variant if exists
        const firstVar = prod.variants[0];
        updatePriceDisplay(firstVar.price, firstVar.originalPrice);
        updateStockDisplay(firstVar.stock);
        if (skuEl) skuEl.textContent = firstVar.sku || prod.sku || 'N/A';
    }

    // Add to Cart update
    const addBtn = document.querySelector('.btn-add-cart-single');
    if (addBtn) {
        addBtn.onclick = function () {
            const activeVarBtn = document.querySelector('.variant-opt-v2-btn.active');
            let finalPrice = prod.price;
            let finalVariant = null;
            let finalSku = prod.sku;

            if (activeVarBtn) {
                finalPrice = parseInt(activeVarBtn.getAttribute('data-price'));
                finalVariant = { label: activeVarBtn.getAttribute('data-label') };
                finalSku = activeVarBtn.getAttribute('data-sku');
            }

            const qty = parseInt(document.getElementById('productQty').value) || 1;

            // Simple validation: check stock
            const currentStock = activeVarBtn ? parseInt(activeVarBtn.getAttribute('data-stock')) : prod.stock;
            if (qty > currentStock) {
                alert("عذراً، الكمية المطلوبة غير متوفرة حالياً.");
                return;
            }

            for (let i = 0; i < qty; i++) {
                addToCart(prod.id, prod.name, finalPrice, prod.images[0], finalVariant);
            }
        };
    }
}

function applyStoreSettingsToFooter() {
    const savedSettings = localStorage.getItem('misk_settings');
    if (!savedSettings) return;

    const settings = JSON.parse(savedSettings);
    const footerStoreName = document.querySelector('.footer-col h3');
    const footerStoreDesc = document.getElementById('footerStoreDesc') || document.querySelector('.footer-col p');
    const footerSocialLinks = document.querySelector('.social-links');
    const copyright = document.querySelector('.copyright');

    if (settings.name && footerStoreName) {
        footerStoreName.textContent = settings.name;
    }
    if (settings.description && footerStoreDesc) {
        footerStoreDesc.textContent = settings.description;
    }
    if (copyright && settings.name) {
        copyright.textContent = `© ${new Date().getFullYear()} ${settings.name} للجمال والهدايا. جميع الحقوق محفوظة`;
    }

    if (footerSocialLinks && settings) {
        footerSocialLinks.innerHTML = `
            ${settings.instagram ? `<a href="${settings.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>` : ''}
            ${settings.whatsapp ? `<a href="https://wa.me/${settings.whatsapp.replace('+', '')}" target="_blank"><i class="fab fa-whatsapp"></i></a>` : ''}
            ${settings.tiktok ? `<a href="${settings.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>` : ''}
            ${settings.facebook ? `<a href="${settings.facebook}" target="_blank"><i class="fab fa-facebook"></i></a>` : ''}
        `;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyStoreSettingsToFooter();
    // ... rest of init ...
    const path = window.location.pathname;
    if (path.includes('index.html') || path === '/' || path.endsWith('Misk-Beauty-Store/')) {
        renderProductGrid('productGrid');
    } else if (path.includes('product.html')) {
        initProductPage();
    }

    // Thumbnail Switching (existing logic, but enhanced in initProductPage)
    const mainImg = document.getElementById('mainProductImg');
    const thumbnails = document.querySelectorAll('.thumb');
    // ... rest of DOMContentLoaded ...

    // Quantity Selector
    const qtyInput = document.getElementById('productQty');
    const plusBtn = document.querySelector('.qty-btn.plus');
    const minusBtn = document.querySelector('.qty-btn.minus');

    if (qtyInput && plusBtn && minusBtn) {
        plusBtn.addEventListener('click', () => {
            qtyInput.value = parseInt(qtyInput.value) + 1;
        });

        minusBtn.addEventListener('click', () => {
            if (parseInt(qtyInput.value) > 1) {
                qtyInput.value = parseInt(qtyInput.value) - 1;
            }
        });
    }

    // Zoom Effect
    const zoomContainer = document.getElementById('zoomContainer');
    if (zoomContainer && mainImg) {
        zoomContainer.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = zoomContainer.getBoundingClientRect();
            const x = ((e.pageX - left) / width) * 100;
            const y = ((e.pageY - top) / height) * 100;

            mainImg.style.transformOrigin = `${x}% ${y}%`;
            mainImg.style.transform = "scale(2)";
        });

        zoomContainer.addEventListener('mouseleave', () => {
            mainImg.style.transform = "scale(1.1)";
            mainImg.style.transformOrigin = "center center";
        });
    }
});

console.log("Misk Beauty JS initialized successfully with Security Validation & Product Page logic.");


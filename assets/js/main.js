/**
 * Misk Beauty & Gifts - Core Logic
 * Focused on Security, Validation, and Premium UX
 */

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

function addToCart(id, name, price, image = 'assets/images/1745215944148877862.png') {
    console.log(`جارِ إضافة المنتج: ${name}`);

    // Data Validation
    if (!validateProduct(id, name, price)) {
        console.error("فشل التحقق من صحة بيانات المنتج. تم منع الإضافة لأسباب أمنية.");
        alert("حدث خطأ في معالجة المنتج. يرجى المحاولة مرة أخرى.");
        return;
    }

    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, price, quantity: 1, image });
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
        cartItem.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div style="display: flex; align-items: center;">
                    <img src="${item.image}" class="cart-item-img" alt="${item.name}">
                    <div>
                        <h4 style="margin: 0; font-size: 0.95rem;">${escapeHTML(item.name)}</h4>
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
    let activeShipping = selectedShippingRate;
    if (subtotal >= 300 && selectedShippingRate > 0) {
        activeShipping = 0;
        if (freeShippingMsg) freeShippingMsg.style.display = 'block';
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
    let activeShipping = selectedShippingRate;
    if (subtotal >= 300 && selectedShippingRate > 0) {
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

// Initialization
startSlideShow();
updateCartUI(); // Ensure UI reflects localStorage state on load

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

document.addEventListener('DOMContentLoaded', () => {
    // Thumbnail Switching
    const mainImg = document.getElementById('mainProductImg');
    const thumbnails = document.querySelectorAll('.thumb');

    if (thumbnails.length > 0 && mainImg) {
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                mainImg.src = thumb.src.replace('w=200', 'w=800');
            });
        });
    }

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


/**
 * Misk Beauty & Gifts - Core Logic
 * Focused on Security, Validation, and Premium UX
 */

// Cart State
let cart = [];

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

    updateCartUI();
    openCart();
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
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

    if (widgetCartTotalText) {
        if (isEmpty) {
            widgetCartTotalText.style.display = 'none';
        } else {
            widgetCartTotalText.textContent = `${total} شيكل`;
            widgetCartTotalText.style.display = 'inline';
        }
    }

    // Update Mini Cart Dropdown
    if (miniCartItems) {
        miniCartItems.innerHTML = '';
        if (isEmpty) {
            // Dropdown is hidden via CSS .is-empty .mini-cart-dropdown
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
    cartSidebar.classList.add('active');
}

function closeCartSidebar() {
    cartSidebar.classList.remove('active');
}

// Event Listeners
if (cartToggle) cartToggle.addEventListener('click', openCart);
if (cartWidgetToggle) cartWidgetToggle.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCartSidebar);

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

// Close cart when clicking outside
document.addEventListener('click', (e) => {
    const isClickInsideCart = cartSidebar.contains(e.target);
    const isClickOnToggle = (cartToggle && cartToggle.contains(e.target)) || (cartWidgetToggle && cartWidgetToggle.contains(e.target));

    if (!isClickInsideCart && !isClickOnToggle && cartSidebar.classList.contains('active')) {
        closeCartSidebar();
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


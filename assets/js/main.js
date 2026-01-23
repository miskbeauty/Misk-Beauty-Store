/**
 * Misk Beauty & Gifts - Core Logic
 * Focused on Security, Validation, and Premium UX
 */

// Cart State
let cart = [];

// DOM Elements
const cartSidebar = document.getElementById('cartSidebar');
const cartToggle = document.getElementById('cartToggle');
const closeCart = document.getElementById('closeCart');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');

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

function addToCart(id, name, price) {
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
        cart.push({ id, name, price, quantity: 1 });
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
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div>
                    <h4 style="margin: 0;">${escapeHTML(item.name)}</h4>
                    <p style="color: #D4AF37; margin: 5px 0;">${item.price} ر.س × ${item.quantity}</p>
                </div>
                <button onclick="removeFromCart(${item.id})" style="background: none; border: none; color: #880E4F; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItem);
    });

    cartCount.textContent = count;
    cartTotal.textContent = total;
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
cartToggle.addEventListener('click', openCart);
closeCart.addEventListener('click', closeCartSidebar);

// Close cart when clicking outside
document.addEventListener('click', (e) => {
    if (!cartSidebar.contains(e.target) && !cartToggle.contains(e.target) && cartSidebar.classList.contains('active')) {
        closeCartSidebar();
    }
});

console.log("Misk Beauty JS initialized successfully with Security Validation.");

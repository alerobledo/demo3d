// Cart module
let cart = [];

export function addToCart(modelUrl) {
    cart.push(modelUrl);
    console.log('Item added to cart:', modelUrl);
    console.log('Current cart:', cart);
    updateCartDisplay();
}

export function getCart() {
    return cart;
}

export function clearCart() {
    cart = [];
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

// Initialize cart display
export function initCart() {
    // Create cart icon and counter
    const cartContainer = document.createElement('div');
    cartContainer.id = 'cartContainer';
    cartContainer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.8);
        padding: 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
    `;

    const cartIcon = document.createElement('span');
    cartIcon.innerHTML = '🛒';
    cartIcon.style.fontSize = '24px';

    const cartCount = document.createElement('span');
    cartCount.id = 'cartCount';
    cartCount.textContent = '0';
    cartCount.style.cssText = `
        background: #ff4444;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 14px;
    `;

    cartContainer.appendChild(cartIcon);
    cartContainer.appendChild(cartCount);
    document.body.appendChild(cartContainer);

    // Add click handler to show cart contents
    cartContainer.addEventListener('click', () => {
        showCartContents();
    });
}

function showCartContents() {
    // Create modal for cart contents
    const modal = document.createElement('div');
    modal.id = 'cartModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1001;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Shopping Cart';
    content.appendChild(title);

    if (cart.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Your cart is empty';
        content.appendChild(emptyMessage);
    } else {
        const itemsList = document.createElement('ul');
        itemsList.style.cssText = `
            list-style: none;
            padding: 0;
        `;

        cart.forEach((item, index) => {
            const li = document.createElement('li');
            li.style.cssText = `
                padding: 10px;
                border-bottom: 1px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const itemName = document.createElement('span');
            itemName.textContent = `Item ${index + 1}`;

            const removeButton = document.createElement('button');
            removeButton.textContent = 'Remove';
            removeButton.style.cssText = `
                background: #ff4444;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 5px;
                cursor: pointer;
            `;

            removeButton.addEventListener('click', () => {
                cart.splice(index, 1);
                updateCartDisplay();
                showCartContents(); // Refresh the display
            });

            li.appendChild(itemName);
            li.appendChild(removeButton);
            itemsList.appendChild(li);
        });

        content.appendChild(itemsList);

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Cart';
        clearButton.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 20px;
        `;

        clearButton.addEventListener('click', clearCart);
        content.appendChild(clearButton);
    }

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background: #666;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 20px;
        margin-left: 10px;
    `;

    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);
} 
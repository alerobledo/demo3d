// Cart module
import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.146.0/examples/jsm/loaders/GLTFLoader.js';
import { modelList } from './model-list.js';

// Change cart to use a Map to store model URLs and their counts
let cart = new Map();

export function addToCart(modelUrl) {
    const currentCount = cart.get(modelUrl) || 0;
    cart.set(modelUrl, currentCount + 1);
    console.log('Item added to cart:', modelUrl, 'Count:', currentCount + 1);
    console.log('Current cart:', Object.fromEntries(cart));
    updateCartDisplay();
}

export function getCart() {
    return cart;
}

export function clearCart() {
    cart.clear();
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        // Calculate total items by summing all counts
        const totalItems = Array.from(cart.values()).reduce((sum, count) => sum + count, 0);
        cartCount.textContent = totalItems;
    }
}

// Helper function to format price
function formatPrice(price) {
    return `$${price.toFixed(2)}`;
}

// Helper function to calculate total price
function calculateTotalPrice() {
    let total = 0;
    cart.forEach((count, modelUrl) => {
        const modelData = modelList.find(model => model.url === modelUrl);
        if (modelData) {
            total += modelData.price * count;
        }
    });
    return total;
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
        background: rgba(255, 255, 255, 0.9);
        padding: 10px;
        border-radius: 5px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 1000;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: transform 0.2s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `;

    // Add hover effect for desktop
    cartContainer.addEventListener('mouseover', () => {
        cartContainer.style.transform = 'scale(1.05)';
    });
    cartContainer.addEventListener('mouseout', () => {
        cartContainer.style.transform = 'scale(1)';
    });

    // Add touch feedback for mobile
    cartContainer.addEventListener('touchstart', () => {
        cartContainer.style.transform = 'scale(0.95)';
    });
    cartContainer.addEventListener('touchend', () => {
        cartContainer.style.transform = 'scale(1)';
    });

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
        min-width: 20px;
        text-align: center;
        user-select: none;
        -webkit-user-select: none;
    `;

    cartContainer.appendChild(cartIcon);
    cartContainer.appendChild(cartCount);
    document.body.appendChild(cartContainer);

    // Add click handler to show cart contents
    const showCart = () => {
        console.log('Cart clicked, current items:', cart); // Debug log
        showCartContents();
    };

    // Handle both click and touch events
    cartContainer.addEventListener('click', showCart);
    cartContainer.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent double-firing on mobile
        showCart();
    });
}

function createItemPreview(modelUrl, container) {
    const canvas = document.createElement('canvas');
    canvas.width = 90;
    canvas.height = 90;
    canvas.style.cssText = `
        background: #f0f0f0;
        border-radius: 5px;
        margin-right: 12px;
    `;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true
    });
    renderer.setSize(90, 90);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 2);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;

    const loader = new GLTFLoader();
    loader.load(
        modelUrl,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(0.45, 0.45, 0.45);
            model.position.set(0, -0.3, 0);
            scene.add(model);

            function animate() {
                requestAnimationFrame(animate);
                controls.update();
                renderer.render(scene, camera);
            }
            animate();
        },
        undefined,
        (err) => console.error(err)
    );

    return canvas;
}

function showCartContents() {
    // Remove any existing modal first
    const existingModal = document.getElementById('cartModal');
    if (existingModal) {
        existingModal.remove();
    }

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
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
    `;

    // Add touch event to close modal when clicking outside
    modal.addEventListener('touchend', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
        transform: scale(1.5);
        transform-origin: center center;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Shopping Cart';
    title.style.cssText = `
        font-size: 32px;
        margin-bottom: 24px;
        color: #333;
    `;
    content.appendChild(title);

    if (cart.size === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.textContent = 'Your cart is empty';
        emptyMessage.style.cssText = `
            font-size: 20px;
            color: #666;
            text-align: center;
            padding: 20px;
        `;
        content.appendChild(emptyMessage);
    } else {
        const itemsList = document.createElement('ul');
        itemsList.style.cssText = `
            list-style: none;
            padding: 0;
            margin: 0;
        `;

        // Iterate through cart items
        cart.forEach((count, modelUrl) => {
            const modelData = modelList.find(model => model.url === modelUrl);
            if (!modelData) return;

            const li = document.createElement('li');
            li.style.cssText = `
                padding: 16px;
                border-bottom: 2px solid #eee;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            const itemContainer = document.createElement('div');
            itemContainer.style.cssText = `
                display: flex;
                align-items: center;
                flex: 1;
                gap: 16px;
            `;

            const previewCanvas = createItemPreview(modelUrl, itemContainer);
            itemContainer.appendChild(previewCanvas);

            const itemInfo = document.createElement('div');
            itemInfo.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 4px;
            `;

            const itemName = document.createElement('span');
            itemName.textContent = `${modelData.name} (${count})`;
            itemName.style.cssText = `
                font-size: 20px;
                color: #333;
            `;
            itemInfo.appendChild(itemName);

            const itemPrice = document.createElement('span');
            itemPrice.textContent = `${formatPrice(modelData.price)} each`;
            itemPrice.style.cssText = `
                font-size: 16px;
                color: #666;
            `;
            itemInfo.appendChild(itemPrice);

            const itemTotal = document.createElement('span');
            itemTotal.textContent = `Total: ${formatPrice(modelData.price * count)}`;
            itemTotal.style.cssText = `
                font-size: 18px;
                color: #333;
                font-weight: bold;
            `;
            itemInfo.appendChild(itemTotal);

            itemContainer.appendChild(itemInfo);

            const removeButton = document.createElement('button');
            removeButton.textContent = '×';
            removeButton.style.cssText = `
                background: #ff4444;
                color: white;
                border: none;
                width: 36px;
                height: 36px;
                border-radius: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                line-height: 1;
                padding: 0;
                transition: background-color 0.2s;
            `;

            removeButton.addEventListener('mouseover', () => {
                removeButton.style.backgroundColor = '#ff0000';
            });

            removeButton.addEventListener('mouseout', () => {
                removeButton.style.backgroundColor = '#ff4444';
            });

            removeButton.addEventListener('click', () => {
                cart.delete(modelUrl);
                updateCartDisplay();
                showCartContents(); // Refresh the display
            });

            li.appendChild(itemContainer);
            li.appendChild(removeButton);
            itemsList.appendChild(li);
        });

        content.appendChild(itemsList);

        // Add total price section
        const totalSection = document.createElement('div');
        totalSection.style.cssText = `
            margin-top: 24px;
            padding-top: 16px;
            border-top: 2px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const totalLabel = document.createElement('span');
        totalLabel.textContent = 'Total Price:';
        totalLabel.style.cssText = `
            font-size: 24px;
            color: #333;
            font-weight: bold;
        `;

        const totalPrice = document.createElement('span');
        totalPrice.textContent = formatPrice(calculateTotalPrice());
        totalPrice.style.cssText = `
            font-size: 24px;
            color: #333;
            font-weight: bold;
        `;

        totalSection.appendChild(totalLabel);
        totalSection.appendChild(totalPrice);
        content.appendChild(totalSection);

        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear Cart';
        clearButton.style.cssText = `
            background: #ff4444;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            margin-top: 24px;
            font-size: 18px;
            transition: background-color 0.2s;
        `;

        clearButton.addEventListener('mouseover', () => {
            clearButton.style.backgroundColor = '#ff0000';
        });

        clearButton.addEventListener('mouseout', () => {
            clearButton.style.backgroundColor = '#ff4444';
        });

        clearButton.addEventListener('click', clearCart);
        content.appendChild(clearButton);
    }

    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        background: #666;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 24px;
        margin-left: 16px;
        font-size: 18px;
        transition: background-color 0.2s;
    `;

    closeButton.addEventListener('mouseover', () => {
        closeButton.style.backgroundColor = '#555';
    });

    closeButton.addEventListener('mouseout', () => {
        closeButton.style.backgroundColor = '#666';
    });

    closeButton.addEventListener('click', () => {
        modal.remove();
    });

    content.appendChild(closeButton);
    modal.appendChild(content);
    document.body.appendChild(modal);
} 
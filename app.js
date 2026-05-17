import { GoogleSheetAdapter } from './google-sheet-adapter.js';

// Main Application Logic
class App {
    constructor() {
        this.db = new GoogleSheetAdapter(CONFIG.sheetID);
        this.products = [];
        this.cart = JSON.parse(localStorage.getItem('copier_maximum_cart')) || [];

        this.init();
    }

    async init() {
        // UI Bindings
        this.bindEvents();

        // Initial Render
        this.renderCategories(); // Static categories for now

        // Fetch Data
        await this.loadProducts();
    }

    bindEvents() {
        // Mobile Menu
        const menuBtn = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.desktop-nav');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                nav.classList.toggle('hidden-mobile');
                nav.classList.toggle('mobile-active');
            });
        }

        // Search Toggle
        const searchBtn = document.querySelector('.search-toggle');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.toggleSearch());
        }

        // Search Input (Dynamic creation if needed, or check existing)
        // We will inject a search bar if not present
        if (!document.getElementById('search-bar')) {
            const bar = document.createElement('div');
            bar.id = 'search-bar';
            bar.className = 'container hidden';
            bar.style.padding = '1rem 0';
            bar.innerHTML = `<input type="text" id="search-input" placeholder="Search products..." style="width:100%; padding:1rem; border:2px solid var(--accent-color); border-radius: var(--radius-md);">`;
            document.querySelector('.main-header').after(bar);

            document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Cart Toggle -> WhatsApp Checkout
        const cartBtn = document.querySelector('.cart-toggle');
        if (cartBtn) {
            cartBtn.addEventListener('click', () => {
                this.checkoutWhatsApp();
            });
        }

        // Active Menu Highlighting (ScrollSpy & Hash)
        window.addEventListener('hashchange', () => this.highlightMenu());
        window.addEventListener('scroll', () => this.handleScrollSpy());
        this.highlightMenu(); // Run on load
        this.initHeroCarousel(); // Start Hero Carousel
    }

    /* --- Hero Carousel Logic --- */
    initHeroCarousel() {
        this.currentHeroSlide = 0;
        this.heroSlides = document.querySelectorAll('.hero-slide');
        this.heroIndicators = document.querySelectorAll('.carousel-indicators button');

        if (this.heroSlides.length === 0) return;
        if (this.heroSlides.length === 1) return; // Don't autoplay if only 1 slide

        // Autoplay
        this.startHeroCarousel();
    }

    startHeroCarousel() {
        if (this.heroInterval) clearInterval(this.heroInterval);
        this.heroInterval = setInterval(() => this.nextHeroSlide(), 5000);
    }

    goToHeroSlide(index) {
        if (!this.heroSlides || this.heroSlides.length === 0) return;

        // Reset Interval on manual interaction
        this.startHeroCarousel();

        // Update classes for current slide (Hide)
        const current = this.heroSlides[this.currentHeroSlide];
        current.classList.remove('active', 'opacity-100');
        current.classList.add('opacity-0');

        if (this.heroIndicators[this.currentHeroSlide]) {
            const ind = this.heroIndicators[this.currentHeroSlide];
            ind.classList.remove('active', 'bg-white', 'opacity-100');
            ind.classList.add('bg-white/50');
        }

        // Update Index
        this.currentHeroSlide = index;

        // Update classes for new slide (Show)
        const next = this.heroSlides[this.currentHeroSlide];
        next.classList.add('active', 'opacity-100');
        next.classList.remove('opacity-0');

        if (this.heroIndicators[this.currentHeroSlide]) {
            const ind = this.heroIndicators[this.currentHeroSlide];
            ind.classList.add('active', 'bg-white', 'opacity-100');
            ind.classList.remove('bg-white/50');
        }
    }

    nextHeroSlide() {
        let nextIndex = (this.currentHeroSlide + 1) % this.heroSlides.length;
        this.goToHeroSlide(nextIndex);
    }

    handleScrollSpy() {
        // Disable Spy on Product Page
        if (window.location.pathname.includes('product.html')) return;

        const sections = ['home', 'shop', 'services', 'contact'];
        let current = '';

        // Find the section currently in view
        for (const section of sections) {
            const el = document.getElementById(section);
            if (el) {
                const rect = el.getBoundingClientRect();
                // If top of section is within viewport (with some offset for header)
                if (rect.top <= 180 && rect.bottom >= 180) {
                    current = section;
                    break;
                }
            }
        }

        // Fallback for bottom of page
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
            current = 'contact';
        }

        if (current) {
            this.updateActiveLink(`#${current}`);
        }
    }

    updateActiveLink(hash) {
        const links = document.querySelectorAll('.desktop-nav a');
        const path = window.location.pathname;

        links.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');

            if (!href) return; // Safety check

            // Product Page Logic
            if (path.includes('product.html')) {
                if (href.includes('shop')) link.classList.add('active');
                return;
            }

            // Index Page Logic
            // Clean href to just hash check if local
            const isHome = hash === '#home' && (href === 'index.html' || href === '#home' || href === '/' || href === './');
            const isMatch = (href === hash) || (href.endsWith(hash) && href !== 'index.html'); // Avoid index.html matching everything

            if (isMatch || isHome) {
                link.classList.add('active');
            }
        });
    }

    highlightMenu() {
        // Initial Load Logic
        if (window.location.pathname.includes('product.html')) {
            this.updateActiveLink('#shop'); // Dummy hash to trigger shop logic
            return;
        }

        const hash = window.location.hash || '#home';
        this.updateActiveLink(hash);
    }

    toggleSearch() {
        const bar = document.getElementById('search-bar');
        if (bar) bar.classList.toggle('hidden');
        const input = document.getElementById('search-input');
        if (input && !bar.classList.contains('hidden')) input.focus();
    }

    triggerSearch() {
        const query = document.getElementById('global-search').value;
        const category = document.getElementById('global-category').value;

        let filtered = this.products;

        if (category) {
            filtered = filtered.filter(p => p.category === category);
        }

        if (query) {
            const lower = query.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(lower) ||
                (p.category && p.category.toLowerCase().includes(lower))
            );
        }

        this.renderProducts(filtered);

        const shop = document.getElementById('shop');
        if (shop) shop.scrollIntoView({ behavior: 'smooth' });
    }

    handleSearch(query) {
        if (!query) {
            this.renderProducts(this.products);
            return;
        }
        const lower = query.toLowerCase();
        const filtered = this.products.filter(p =>
            p.name.toLowerCase().includes(lower) ||
            (p.category && p.category.toLowerCase().includes(lower))
        );
        this.renderProducts(filtered);
    }

    checkoutWhatsApp() {
        if (this.cart.length === 0) {
            alert("Your cart is empty.");
            return;
        }

        // Count items
        const counts = {};
        this.cart.forEach(x => { counts[x] = (counts[x] || 0) + 1; });

        let message = "Hello Copier Maximum, I would like to order:\n\n";
        for (const [name, qty] of Object.entries(counts)) {
            message += `- ${name} (x${qty})\n`;
        }
        message += "\nPlease confirm availability and total price.";

        const phone = "254700000000"; // Replace with real number
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }

    async loadProducts() {
        const productContainer = document.getElementById('products-container');
        try {
            this.products = await this.db.fetchProducts();

            if (this.products.length === 0) {
                // Mock Data if empty (for demonstration)
                this.products = this.getMockData();
            }

            this.renderProducts(this.products);
            this.updateHero(this.products);

        } catch (error) {
            console.error("Failed to load products", error);
            if (productContainer) productContainer.innerHTML = '<p class="error">Failed to load products. Please try again later.</p>';
        }
    }

    renderCategories() {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;

        const categories = [
            { name: "Refurbished Copiers", icon: "fa-copy" },
            { name: "Drum units", icon: "fa-circle-notch" },
            { name: "Kyocera B/W A4 Printers", icon: "fa-print" },
            { name: "Toner Refills", icon: "fa-fill-drip" },
            { name: "Toners", icon: "fa-tint" },
            { name: "Accessories", icon: "fa-mouse" },
            { name: "Brand New Copiers", icon: "fa-star" },
            { name: "Laptops & Computers", icon: "fa-laptop" },
            { name: "Spare Parts", icon: "fa-cogs" }
        ];

        grid.innerHTML = categories.map(cat => `
            <div class="category-card">
                <div>
                    <i class="fas ${cat.icon} fa-3x" style="color:var(--primary-light); margin-bottom:1rem"></i>
                    <h3>${cat.name}</h3>
                </div>
            </div>
        `).join('');
    }

    renderProducts(products) {
        const container = document.getElementById('products-container');
        if (!container) return;

        // Show max 8 items on home
        const displayItems = products.slice(0, 8);

        container.innerHTML = displayItems.map(p => this.createProductCard(p)).join('');
    }

    createProductCard(product) {
        const price = parseFloat(product.price).toLocaleString();
        const oldPrice = product.old_price ? parseFloat(product.old_price).toLocaleString() : null;

        // Handle image: default mock if missing or invalid
        let imageSrc = product.images ? product.images.split(',')[0] : 'assets/placeholder.png';
        if (!imageSrc || imageSrc.length < 5) imageSrc = 'https://via.placeholder.com/300x300?text=No+Image';

        return `
            <div class="product-card">
                <a href="javascript:void(0)" onclick="window.App.openProductModal('${encodeURIComponent(product.name)}')" style="text-decoration:none; color:inherit; display:block;">
                    <img src="${imageSrc}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <div class="product-price">
                            ${oldPrice ? `<span class="old-price">KES ${oldPrice}</span>` : ''}
                            KES ${price}
                        </div>
                    </div>
                </a>
                <button class="btn btn-outline" style="width:100%; margin-top:auto" onclick="window.App.addToCart('${product.name}')">
                    Add to Cart
                </button>
            </div>
        `;
    }

    updateHero(products) {
        // Find a "featured" product or just take the first one
        if (products.length > 0) {
            const featured = products[0];
            // Ideally update the hero text dynamically
            // For now, we keep the static design for stability
        }
    }

    addToCart(productName) {
        this.cart.push(productName);
        localStorage.setItem('copier_maximum_cart', JSON.stringify(this.cart));

        // Update Badge
        const badge = document.querySelector('.badge');
        if (badge) {
            badge.textContent = this.cart.length;
            badge.classList.remove('hidden');
        }

        alert(`${productName} added to cart!`);
    }

    getMockData() {
        return [
            { name: "Kyocera TASKalfa 4052ci", category: "Refurbished Copiers", price: "125000", old_price: "150000", images: "https://via.placeholder.com/300?text=Copier,https://via.placeholder.com/300?text=Side-View,https://via.placeholder.com/300?text=Top-View", description: "Color MFP, High Speed. Excellent for busy offices requiring large volume prints. Includes ADF and duplex standard." },
            { name: "HP EliteBook 840 G5", category: "Laptops & Computers", price: "45000", old_price: "55000", images: "https://via.placeholder.com/300?text=Laptop", description: "i5 8th Gen, 8GB RAM, 256GB SSD." },
            { name: "Kyocera TK-8505 Toner", category: "Toners", price: "12000", old_price: null, images: "https://via.placeholder.com/300?text=Toner", description: "Original Black Toner." },
            { name: "Ricoh MP C3004", category: "Refurbished Copiers", price: "95000", old_price: "110000", images: "https://via.placeholder.com/300?text=Ricoh", description: "Excellent Condition." }
        ];
    }

    /* Modal Logic */
    openProductModal(encodedName) {
        const name = decodeURIComponent(encodedName);
        const product = this.products.find(p => p.name === name);
        if (!product) return;

        const modal = document.getElementById('product-modal');
        if (!modal) return;

        // Populate basic info
        document.getElementById('modal-title').textContent = product.name;

        const price = parseFloat(product.price).toLocaleString();
        const oldPrice = product.old_price ? parseFloat(product.old_price).toLocaleString() : null;
        document.getElementById('modal-price').innerHTML = `
            ${oldPrice ? `<span class="old-price">KES ${oldPrice}</span>` : ''}
            KES ${price}
        `;

        document.getElementById('modal-description').innerHTML = product.description || "No specific details available.";

        // Handle Images
        let imagesArr = product.images ? product.images.split(',') : ['assets/placeholder.png'];
        if (imagesArr.length === 0 || imagesArr[0].length < 5) imagesArr = ['https://via.placeholder.com/300x300?text=No+Image'];

        const mainImg = document.getElementById('modal-main-img');
        const thumbsContainer = document.getElementById('modal-thumbnails');

        mainImg.src = imagesArr[0];

        thumbsContainer.innerHTML = '';
        if (imagesArr.length > 1) {
            imagesArr.forEach(imgUrl => {
                const thumbBtn = document.createElement('img');
                thumbBtn.src = imgUrl;
                thumbBtn.className = 'thumb-img';
                thumbBtn.onclick = () => window.App.changeMainImage(imgUrl);
                thumbsContainer.appendChild(thumbBtn);
            });
        }

        // Action Button
        const addBtn = document.getElementById('modal-add-cart-btn');
        addBtn.onclick = () => {
            this.addToCart(product.name);
            this.closeProductModal();
        };

        // Show Modal
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // prevent background scroll
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    changeMainImage(imgUrl) {
        document.getElementById('modal-main-img').src = imgUrl;
    }
}

// Global Access
window.App = new App();

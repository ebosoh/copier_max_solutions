import { GoogleSheetAdapter } from './google-sheet-adapter.js';

// Main Application Logic
class App {
    constructor() {
        this.db = new GoogleSheetAdapter(CONFIG.sheetID, CONFIG.googleScriptUrl);
        this.products = [];
        this.cart = JSON.parse(localStorage.getItem('copier_maximum_cart')) || [];
        this.currentProductPage = 1;
        this.currentCategoryPage = 1;

        this.init();
    }

    async init() {
        // UI Bindings
        this.bindEvents();
        this.updateCartBadge(); // Initialize cart badges from local storage

        // Initial Render
        this.renderCategories(); // Static categories for now

        // Fetch Data
        await this.loadProducts();
        this.renderCategoryPills();
        this.updateQuoteModels("Refurbished Copiers");
    }

    bindEvents() {
        // Mobile Menu
        const menuBtn = document.querySelector('.mobile-menu-toggle');
        const nav = document.querySelector('.desktop-nav');
        if (menuBtn && nav) {
            menuBtn.addEventListener('click', () => {
                nav.classList.toggle('hidden-mobile');
                nav.classList.toggle('mobile-active');
            });

            // Close mobile menu when links are clicked
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (nav.classList.contains('mobile-active')) {
                        nav.classList.add('hidden-mobile');
                        nav.classList.remove('mobile-active');
                    }
                });
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
        this.initTestimonialsCarousel(); // Start Testimonials Carousel
        this.initAboutCounters(); // Start About trust counters animation
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

    /* --- Testimonials Carousel Logic --- */
    initTestimonialsCarousel() {
        this.currentTestimonial = 0;
        this.testimonialSlides = document.querySelectorAll('.testimonial-slide');
        this.testimonialIndicators = document.querySelectorAll('.testimonials-indicators button');

        if (this.testimonialSlides.length === 0) return;
        if (this.testimonialSlides.length === 1) return; // Don't autoplay if only 1 slide

        // Autoplay
        this.startTestimonialsCarousel();
    }

    startTestimonialsCarousel() {
        if (this.testimonialInterval) clearInterval(this.testimonialInterval);
        this.testimonialInterval = setInterval(() => this.nextTestimonial(), 7000);
    }

    goToTestimonial(index) {
        if (!this.testimonialSlides || this.testimonialSlides.length === 0) return;

        // Reset Interval on manual interaction
        this.startTestimonialsCarousel();

        // Update classes for current slide (Hide)
        const current = this.testimonialSlides[this.currentTestimonial];
        current.classList.remove('active');

        if (this.testimonialIndicators[this.currentTestimonial]) {
            this.testimonialIndicators[this.currentTestimonial].classList.remove('active');
        }

        // Update Index
        this.currentTestimonial = index;

        // Update classes for new slide (Show)
        const next = this.testimonialSlides[this.currentTestimonial];
        next.classList.add('active');

        if (this.testimonialIndicators[this.currentTestimonial]) {
            this.testimonialIndicators[this.currentTestimonial].classList.add('active');
        }
    }

    nextTestimonial() {
        if (!this.testimonialSlides || this.testimonialSlides.length === 0) return;
        let nextIndex = (this.currentTestimonial + 1) % this.testimonialSlides.length;
        this.goToTestimonial(nextIndex);
    }

    prevTestimonial() {
        if (!this.testimonialSlides || this.testimonialSlides.length === 0) return;
        let prevIndex = (this.currentTestimonial - 1 + this.testimonialSlides.length) % this.testimonialSlides.length;
        this.goToTestimonial(prevIndex);
    }

    handleScrollSpy() {
        // Disable Spy on Product Page
        if (window.location.pathname.includes('product.html')) return;

        const sections = ['home', 'about', 'shop', 'contact', 'faqs', 'service-hub'];
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

        // Prompt for customer phone number
        const customerPhone = prompt("Please enter your phone number so we can reach you:\n(e.g. +254712345678)");
        if (customerPhone === null) return; // User cancelled
        if (!customerPhone.trim()) {
            alert("A phone number is required to proceed with checkout.");
            return;
        }

        // Build item list with prices
        const counts = {};
        this.cart.forEach(name => { counts[name] = (counts[name] || 0) + 1; });

        let message = `📞 My Phone Number: ${customerPhone.trim()}\n\n`;
        message += `Hello Copier Maximum Solutions, I would like to order the following:\n\n`;

        let grandTotal = 0;
        for (const [name, qty] of Object.entries(counts)) {
            const product = this.products.find(p => p.name === name);
            const unitPrice = product ? parseFloat(product.price) : 0;
            const lineTotal = unitPrice * qty;
            grandTotal += lineTotal;

            const priceStr = unitPrice > 0
                ? ` — KES ${unitPrice.toLocaleString()} x${qty} = KES ${lineTotal.toLocaleString()}`
                : ` (x${qty})`;
            message += `• ${name}${priceStr}\n`;
        }

        if (grandTotal > 0) {
            message += `\n💰 Estimated Total: KES ${grandTotal.toLocaleString()}`;
        }

        message += `\n\nKindly confirm availability and arrange delivery. Thank you! 🙏`;

        const waNumber = "254717520268";
        const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
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
            this.renderCategories(); // Re-render categories to use real product images once fetched

            // Load discount offers and dynamic hero carousel
            await this.loadDiscountsAndHero();

            // Load brand and testimonial settings dynamically
            await this.loadBrandsAndTestimonials();

        } catch (error) {
            console.error("Failed to load products", error);
            if (productContainer) productContainer.innerHTML = '<p class="error">Failed to load products. Please try again later.</p>';
        }
    }

    async loadBrandsAndTestimonials() {
        try {
            const brands = await this.db.fetchBrands();
            if (brands && brands.length > 0) {
                this.renderBrands(brands);
            }

            const testimonials = await this.db.fetchTestimonials();
            if (testimonials && testimonials.length > 0) {
                this.renderTestimonials(testimonials);
            }
        } catch (e) {
            console.error("Failed to load brands or testimonials", e);
        }
    }

    renderBrands(brands) {
        const container = document.querySelector('.brands-track');
        if (!container) return;

        // Duplicate the brands array to create a seamless infinite scrolling effect
        const doubledBrands = [...brands, ...brands];

        container.innerHTML = doubledBrands.map(b => {
            const nameLower = b.name.toLowerCase();
            const content = b.logo_url && b.logo_url.length > 10
                ? `<img src="${b.logo_url}" alt="${b.name}" style="max-width:100%; max-height:100%; object-fit:contain;">`
                : `<span class="brand-logo-text ${nameLower}">${b.name}</span>`;

            return `
                <div class="brand-item">
                    ${content}
                </div>
            `;
        }).join('');
    }

    renderTestimonials(list) {
        const carousel = document.querySelector('.testimonials-carousel');
        const indicators = document.querySelector('.testimonials-indicators');
        if (!carousel || !indicators) return;

        carousel.innerHTML = list.map((t, index) => {
            const activeClass = index === 0 ? 'active' : '';
            const ratingStars = Array(5).fill(0).map((_, i) => 
                `<i class="fas fa-star" style="${i < parseInt(t.rating || 5) ? 'color: #FFB800' : 'color: #E2E8F0'}"></i>`
            ).join('');

            const avatar = t.photo_url && t.photo_url.length > 10
                ? `<img src="${t.photo_url}" alt="${t.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`
                : `<i class="fas fa-user"></i>`;

            return `
                <div class="testimonial-slide ${activeClass}">
                    <div class="testimonial-rating">
                        ${ratingStars}
                    </div>
                    <p class="testimonial-text">${t.text}</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">${avatar}</div>
                        <div class="author-info">
                            <h4>${t.name}</h4>
                            <span>${t.role || 'Verified Customer'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        indicators.innerHTML = list.map((_, index) => `
            <button class="${index === 0 ? 'active' : ''}" onclick="window.App.goToTestimonial(${index})"></button>
        `).join('');

        // Re-initialize testimonial carousel variables
        this.initTestimonialsCarousel();
    }

    renderCategories(page = 1) {
        const grid = document.getElementById('categories-grid');
        if (!grid) return;

        const categories = [
            { name: "Multifunctional Photocopiers and Printers", defaultImage: "commercial-copier.png" },
            { name: "Computers & Laptops", defaultImage: "https://images.unsplash.com/photo-1496181130204-755241544e35?w=300&auto=format&fit=crop&q=60" },
            { name: "Toner Cartridges & Refills", defaultImage: "https://images.unsplash.com/photo-1544256718-3bcf237f3974?w=300&auto=format&fit=crop&q=60" },
            { name: "Photocopy Spareparts", defaultImage: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=60" }
        ];

        this.currentCategoryPage = page;
        const limit = 10;
        const totalItems = categories.length;
        const totalPages = Math.ceil(totalItems / limit);

        if (page < 1) page = 1;
        if (page > totalPages && totalPages > 0) page = totalPages;
        this.currentCategoryPage = page;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const displayCategories = categories.slice(startIndex, endIndex);

        const subCategoriesMap = {
            "Multifunctional Photocopiers and Printers": ["Refurbished Copiers", "Brand New Copiers", "Kyocera B/W A4 Printers", "Office Printers"],
            "Computers & Laptops": ["Laptops & Computers"],
            "Toner Cartridges & Refills": ["Toners", "Toner Refills", "Accessories"],
            "Photocopy Spareparts": ["Spare Parts", "Drum units"]
        };

        grid.innerHTML = displayCategories.map(cat => {
            // Find a product in the mapped sub-categories to get a real image from the Google Sheet
            const subCats = subCategoriesMap[cat.name] || [];
            const productInCat = this.products.find(p => subCats.includes(p.category));
            let img = cat.defaultImage;
            if (productInCat && productInCat.images) {
                const firstImg = productInCat.images.split(',')[0];
                if (firstImg && firstImg.length > 5) {
                    img = firstImg;
                }
            }

            return `
                <div class="category-card" onclick="window.App.handleMacroCategoryClick('${cat.name.replace(/'/g, "\\'")}')" style="cursor:pointer;">
                    <div class="category-image-wrapper">
                        <img src="${img}" alt="${cat.name}" class="category-img">
                    </div>
                    <div class="category-info-overlay">
                        <h3>${cat.name}</h3>
                        <span class="explore-btn">Explore <i class="fas fa-arrow-right"></i></span>
                    </div>
                </div>
            `;
        }).join('');

        this.renderCategoriesPagination(categories, totalPages, page);
    }

    renderCategoriesPagination(categories, totalPages, currentPage) {
        const paginationContainer = document.getElementById('categories-pagination');
        if (!paginationContainer) return;

        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = '';
        
        // Prev button
        html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;

        // Page buttons
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        // Next button
        html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;

        paginationContainer.innerHTML = html;

        // Bind events
        paginationContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                if (targetBtn.disabled) return;
                const page = parseInt(targetBtn.getAttribute('data-page'), 10);
                this.renderCategories(page);
                
                // Scroll to categories section
                const categoriesSec = document.querySelector('.categories-section');
                if (categoriesSec) categoriesSec.scrollIntoView({ behavior: 'smooth' });
            });
        });
    }

    renderProducts(products, page = 1) {
        const container = document.getElementById('products-container');
        if (!container) return;

        this.currentProductPage = page;
        const limit = 10;
        const totalItems = products.length;
        const totalPages = Math.ceil(totalItems / limit);

        if (page < 1) page = 1;
        if (page > totalPages && totalPages > 0) page = totalPages;
        this.currentProductPage = page;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const displayItems = products.slice(startIndex, endIndex);

        if (displayItems.length === 0) {
            container.innerHTML = '<p class="text-center py-8 w-full" style="grid-column: 1/-1;">No products found.</p>';
            this.renderProductsPagination(products, totalPages, page);
            return;
        }

        container.innerHTML = displayItems.map(p => this.createProductCard(p)).join('');
        this.renderProductsPagination(products, totalPages, page);
    }

    renderProductsPagination(products, totalPages, currentPage) {
        const paginationContainer = document.getElementById('products-pagination');
        if (!paginationContainer) return;

        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = '';
        
        // Prev button
        html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}"><i class="fas fa-chevron-left"></i></button>`;

        // Page buttons
        for (let i = 1; i <= totalPages; i++) {
            html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }

        // Next button
        html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"><i class="fas fa-chevron-right"></i></button>`;

        paginationContainer.innerHTML = html;

        // Bind events
        paginationContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                if (targetBtn.disabled) return;
                const page = parseInt(targetBtn.getAttribute('data-page'), 10);
                this.renderProducts(products, page);
                
                // Scroll to shop section
                const shop = document.getElementById('shop');
                if (shop) shop.scrollIntoView({ behavior: 'smooth' });
            });
        });
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
        this.updateCartBadge();
        alert(`${productName} added to cart!`);
    }

    addToCartWithQty() {
        const urlParams = new URLSearchParams(window.location.search);
        const name = urlParams.get('product');
        if (name) {
            this.addToCart(name);
        } else {
            alert("Product name not found in the URL.");
        }
    }

    updateCartBadge() {
        const badges = document.querySelectorAll('.badge');
        badges.forEach(badge => {
            badge.textContent = this.cart.length;
            if (this.cart.length > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
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

        // Product Link Button
        const linkBtn = document.getElementById('modal-product-link');
        if (linkBtn) {
            if (product.product_link && product.product_link.trim() !== '') {
                linkBtn.href = product.product_link;
                linkBtn.classList.remove('hidden');
            } else {
                linkBtn.classList.add('hidden');
            }
        }

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

    renderCategoryPills() {
        const container = document.getElementById('category-pills-bar');
        if (!container) return;

        const categories = [
            "All Products",
            "Refurbished Copiers",
            "Drum units",
            "Kyocera B/W A4 Printers",
            "Toner Refills",
            "Toners",
            "Accessories",
            "Brand New Copiers",
            "Laptops & Computers",
            "Spare Parts",
            "Office Printers"
        ];

        container.innerHTML = categories.map(cat => {
            const isActive = cat === "All Products" ? "active" : "";
            return `
                <button class="category-pill ${isActive}" onclick="window.App.handleCategoryPillClick(this, '${cat}')">
                    ${cat}
                </button>
            `;
        }).join('');
    }

    handleCategoryPillClick(element, category) {
        document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));
        element.classList.add('active');

        if (category === "All Products") {
            this.renderProducts(this.products);
        } else {
            const filtered = this.products.filter(p => p.category === category);
            this.renderProducts(filtered);
        }
    }

    handleMacroCategoryClick(macroName) {
        const mapping = {
            "Multifunctional Photocopiers and Printers": ["Refurbished Copiers", "Brand New Copiers", "Kyocera B/W A4 Printers", "Office Printers"],
            "Computers & Laptops": ["Laptops & Computers"],
            "Toner Cartridges & Refills": ["Toners", "Toner Refills", "Accessories"],
            "Photocopy Spareparts": ["Spare Parts", "Drum units"]
        };

        const subCats = mapping[macroName] || [];

        // Deactivate all pills
        document.querySelectorAll('.category-pill').forEach(pill => pill.classList.remove('active'));

        const filtered = this.products.filter(p => subCats.includes(p.category));
        this.renderProducts(filtered);

        // Scroll smoothly to shop section
        const shop = document.getElementById('shop');
        if (shop) shop.scrollIntoView({ behavior: 'smooth' });
    }

    toggleFaq(faqId) {
        const item = document.getElementById(faqId);
        if (!item) return;
        const isActive = item.classList.contains('active');
        
        document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
        
        if (!isActive) {
            item.classList.add('active');
        }
    }

    updateQuoteModels(category) {
        const select = document.getElementById('quote-model-select');
        if (!select) return;
        select.innerHTML = '';

        const modelPrices = {
            "Refurbished Copiers": [
                { name: "Kyocera TASKalfa 4052ci", price: 125000 },
                { name: "Kyocera TASKalfa 3511i", price: 55000 },
                { name: "Ricoh MP C3004", price: 95000 },
                { name: "Ricoh MP 2555", price: 65000 }
            ],
            "Kyocera B/W A4 Printers": [
                { name: "Kyocera ECOSYS M2040dn", price: 38000 }
            ],
            "Toners": [
                { name: "Kyocera TK-1170 Black Toner", price: 3500 },
                { name: "Kyocera TK-8505 CMYK Set", price: 42000 },
                { name: "Ricoh MP C3003 Black Toner", price: 4500 }
            ],
            "Spare Parts": [
                { name: "Kyocera Drum Unit DK-1150", price: 9500 },
                { name: "Ricoh Fuser Film", price: 3000 },
                { name: "Kyocera Feed Roller Set", price: 1500 }
            ]
        };

        const models = modelPrices[category] || [];
        models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = `${m.name} (KES ${m.price.toLocaleString()})`;
            opt.setAttribute('data-price', m.price);
            select.appendChild(opt);
        });

        this.recalculateQuotePrice();
    }

    recalculateQuotePrice() {
        const select = document.getElementById('quote-model-select');
        if (!select) return;

        const selectedOption = select.options[select.selectedIndex];
        if (!selectedOption) return;

        const basePrice = parseFloat(selectedOption.getAttribute('data-price')) || 0;
        
        const form = document.querySelector('#quote-request form');
        if (!form) return;

        const qty = parseInt(form.qty.value) || 1;
        const addon = form.addon.value;

        let addonCost = 0;
        if (addon === "single") addonCost = 3500;
        if (addon === "double") addonCost = 7000;

        const total = (basePrice * qty) + addonCost;

        document.getElementById('quote-unit-price').textContent = `KES ${basePrice.toLocaleString()}`;
        document.getElementById('quote-addon-price').textContent = `KES ${addonCost.toLocaleString()}`;
        document.getElementById('quote-total-price').textContent = `KES ${total.toLocaleString()}`;
    }

    submitServiceRequest(form) {
        const name = form.name.value.trim();
        const phone = form.phone.value.trim();
        const brand = form.brand.value;
        const service = form.service.value;
        const desc = form.description.value.trim();

        let message = `🔧 *TECHNICAL SERVICE REQUEST*\n\n`;
        message += `• *Client Name:* ${name}\n`;
        message += `• *Contact Phone:* ${phone}\n`;
        message += `• *Device Brand:* ${brand}\n`;
        message += `• *Service Needed:* ${service}\n\n`;
        message += `💬 *Issue Description:*\n${desc}\n\n`;
        message += `Please assign a technician to contact me. Thank you!`;

        const waNumber = "254717520268";
        const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        form.reset();
    }

    submitQuotationRequest(form) {
        const category = form.category.value;
        const model = form.model.value;
        const qty = form.qty.value;
        const addon = form.addon.value;

        const unitText = document.getElementById('quote-unit-price').textContent;
        const totalText = document.getElementById('quote-total-price').textContent;

        let addonDetails = "None";
        if (addon === "single") addonDetails = "1x Extra Replacement Toner";
        if (addon === "double") addonDetails = "2x Extra Replacement Toners";

        let message = `📋 *PURCHASE QUOTATION REQUEST*\n\n`;
        message += `• *Category:* ${category}\n`;
        message += `• *Product Model:* ${model}\n`;
        message += `• *Unit Price:* ${unitText}\n`;
        message += `• *Quantity:* ${qty}\n`;
        message += `• *Add-on Selection:* ${addonDetails}\n\n`;
        message += `💰 *Estimated Total Quote:* ${totalText}\n\n`;
        message += `Please confirm stock availability and send an official invoice draft. Thank you!`;

        const waNumber = "254717520268";
        const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        form.reset();
        this.updateQuoteModels(category);
    }

    initAboutCounters() {
        const counters = document.querySelectorAll('.about-counter');
        if (counters.length === 0) return;

        const animateCounter = (counter) => {
            const target = parseInt(counter.getAttribute('data-target'), 10);
            const duration = 1500; // 1.5 seconds for counting (medium speed)
            const startTime = performance.now();

            const update = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease out quad formula for smooth decelerating animation
                const easeProgress = progress * (2 - progress); 
                const value = Math.floor(easeProgress * target);
                
                counter.textContent = value;

                if (progress < 1) {
                    counter.animationFrameId = requestAnimationFrame(update);
                } else {
                    counter.textContent = target; // Ensure exact final target value
                }
            };

            // Cancel any ongoing animation before starting a new one
            if (counter.animationFrameId) {
                cancelAnimationFrame(counter.animationFrameId);
            }
            counter.animationFrameId = requestAnimationFrame(update);
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const counter = entry.target;
                if (entry.isIntersecting) {
                    // Trigger dynamic increment count when scrolled into view
                    animateCounter(counter);
                } else {
                    // Reset to 0 when scrolled out of view, so it restarts when entering again
                    if (counter.animationFrameId) {
                        cancelAnimationFrame(counter.animationFrameId);
                    }
                    counter.textContent = "0";
                }
            });
        }, {
            threshold: 0.1 // Triggers when at least 10% of the element is visible
        });

        counters.forEach(counter => observer.observe(counter));
    }

    async loadDiscountsAndHero() {
        try {
            const discounts = await this.db.fetchDiscounts();
            this.renderHeroDiscounts(discounts);
        } catch (e) {
            console.error("Failed to load discount offers:", e);
            this.renderHeroDiscounts([]); // Fallback
        }
    }

    renderHeroDiscounts(list) {
        const carousel = document.querySelector('.hero-carousel');
        const indicators = document.querySelector('.carousel-indicators');
        if (!carousel || !indicators) return;

        // Filter active discounts (support both boolean true and string "TRUE"/"true")
        const activeDiscounts = (list || []).filter(d => 
            d.active === true || 
            String(d.active).toUpperCase() === "TRUE"
        );

        let slidesHtml = '';
        let indicatorsHtml = '';

        if (activeDiscounts.length === 0) {
            // Render Premium Fallback Brand Slide
            slidesHtml = `
                <div class="hero-slide active absolute inset-0 transition-opacity duration-1000 ease-in-out opacity-100 bg-white" onclick="document.getElementById('shop').scrollIntoView({ behavior: 'smooth' })" style="cursor:pointer;">
                    <img src="commercial-copier.png" class="w-full h-full object-contain" alt="Copier Maximum Solutions Premium Office Automations">
                    <div class="hero-slide-overlay">
                        <span class="slide-badge">OFFICIAL PARTNER</span>
                        <h2 class="slide-title">Premium Office Automations</h2>
                        <p class="slide-desc">Top deals on refurbished Kyocera copiers, printers & toners in Nairobi, Kenya.</p>
                        <div class="slide-action">Explore Catalog <i class="fas fa-arrow-right"></i></div>
                    </div>
                </div>
            `;
            indicatorsHtml = `<button class="w-3 h-3 rounded-full bg-white opacity-100 transition-all" onclick="window.App.goToHeroSlide(0)"></button>`;
        } else {
            activeDiscounts.forEach((d, idx) => {
                const activeClass = idx === 0 ? 'active opacity-100' : 'opacity-0';
                const banner = d.banner_url || 'commercial-copier.png';
                
                // Format target parameters to make it dynamic
                const escapedTargetType = d.target_type;
                const escapedTargetId = d.target_id.replace(/'/g, "\\'");

                slidesHtml += `
                    <div class="hero-slide ${activeClass} absolute inset-0 transition-opacity duration-1000 ease-in-out bg-slate-900" 
                         onclick="window.App.handleDiscountClick('${escapedTargetType}', '${escapedTargetId}')" 
                         style="cursor:pointer;">
                        <img src="${banner}" class="w-full h-full object-cover" alt="${d.title}" style="filter: brightness(0.65); width: 100%; height: 100%;">
                        <div class="hero-slide-overlay">
                            <span class="slide-badge">${d.discount_value}</span>
                            <h2 class="slide-title">${d.title}</h2>
                            <p class="slide-desc">${d.description}</p>
                            <div class="slide-action">Claim Offer <i class="fas fa-arrow-right"></i></div>
                        </div>
                    </div>
                `;

                const indicatorActive = idx === 0 ? 'active bg-white' : 'bg-white/50';
                indicatorsHtml += `
                    <button class="w-3 h-3 rounded-full ${indicatorActive} transition-all" 
                            onclick="window.App.goToHeroSlide(${idx})"></button>
                `;
            });
        }

        carousel.innerHTML = slidesHtml;
        indicators.innerHTML = indicatorsHtml;

        // Re-initialize carousel slides
        this.initHeroCarousel();
    }

    handleDiscountClick(type, target) {
        if (type === 'category') {
            const mapping = {
                "Multifunctional Photocopiers and Printers": ["Refurbished Copiers", "Brand New Copiers", "Kyocera B/W A4 Printers", "Office Printers"],
                "Computers & Laptops": ["Laptops & Computers"],
                "Toner Cartridges & Refills": ["Toners", "Toner Refills", "Accessories"],
                "Photocopy Spareparts": ["Spare Parts", "Drum units"]
            };
            if (mapping[target]) {
                this.handleMacroCategoryClick(target);
                return;
            }
            const pillBtn = Array.from(document.querySelectorAll('.category-pill'))
                                 .find(btn => btn.textContent.trim() === target);
            if (pillBtn) {
                this.handleCategoryPillClick(pillBtn, target);
            } else {
                this.handleSearch(target);
            }
            const shopSec = document.getElementById('shop');
            if (shopSec) shopSec.scrollIntoView({ behavior: 'smooth' });
        } else if (type === 'product') {
            this.openProductModal(encodeURIComponent(target));
        } else if (type === 'link') {
            window.open(target, '_blank');
        }
    }
}

// Global Access
window.App = new App();

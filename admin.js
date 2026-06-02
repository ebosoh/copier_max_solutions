import { GoogleSheetAdapter } from './google-sheet-adapter.js';

class AdminApplication {
    constructor() {
        this.isAuthenticated = false;
        this.adminToken = null; // Memory-held password
        this.selectedFiles = [];
        this.selectedImages = []; // Unified image management list
        this.sheetDb = new GoogleSheetAdapter(CONFIG.sheetID, CONFIG.googleScriptUrl);
        this.inventoryProducts = [];
        this.currentProductPage = 1;

        // Bind Events
        this.initEvents();
    }

    initEvents() {
        // Login
        const codeInput = document.getElementById('access-code');
        if (codeInput) {
            codeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.login();
            });
        }

        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.login());
        }

        // File Input
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('file-input');

        if (dropzone && fileInput) {
            dropzone.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

            // Drag & Drop
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.style.background = '#F8FAFC';
            });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                this.handleFiles(e.dataTransfer.files);
            });
        }

        // Form Submit
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Settings Forms
        const brandForm = document.getElementById('brand-form');
        if (brandForm) {
            brandForm.addEventListener('submit', (e) => this.handleBrandSubmit(e));
        }

        const testForm = document.getElementById('testimonial-form');
        if (testForm) {
            testForm.addEventListener('submit', (e) => this.handleTestimonialSubmit(e));
        }

        // Discount Forms
        const discForm = document.getElementById('discount-form');
        if (discForm) {
            discForm.addEventListener('submit', (e) => this.handleDiscountSubmit(e));
        }
        const discTypeInput = document.getElementById('discount-target-type-input');
        if (discTypeInput) {
            discTypeInput.addEventListener('change', (e) => this.updateDiscountTargetOptions(e.target.value));
        }
    }

    login() {
        const input = document.getElementById('access-code').value;
        if (!input) return alert('Please enter the access code.');

        // Hold password in memory, bypass local plaintext checking
        this.adminToken = input;
        this.isAuthenticated = true;

        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
    }
    switchTab(tabId) {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        // Reset form completely if switching manually to Add
        if (tabId === 'add') {
            this.resetForm();
        }

        // Show selected
        const view = document.getElementById(`view-${tabId}`);
        if (view) view.classList.remove('hidden');

        // Add active class to corresponding nav-item
        const navItem = document.querySelector(`.nav-item[onclick*="'${tabId}'"]`);
        if (navItem) navItem.classList.add('active');

        if (tabId === 'list') {
            this.loadInventory();
        }

        if (tabId === 'settings') {
            this.loadSettings();
        }

        if (tabId === 'discounts') {
            this.loadDiscounts();
        }

        // Clean view transitions: scroll dashboard main contents and window viewport to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }


    resetForm() {
        document.getElementById('product-form').reset();
        document.getElementById('rowId').value = '';
        document.getElementById('existingImages').value = '';
        document.getElementById('preview-area').innerHTML = '';
        document.getElementById('form-title').innerText = "Add New Product";
        const subBtn = document.querySelector('#product-form button[type="submit"]');
        if (subBtn) subBtn.innerHTML = '<i class="fas fa-save"></i> Save Product';
        this.selectedFiles = [];
        this.selectedImages = []; // Reset unified images
    }

    async loadInventory() {
        const loading = document.getElementById('inventory-loading');
        if (loading) loading.classList.remove('hidden');

        try {
            this.inventoryProducts = await this.sheetDb.fetchProducts();

            // Update counter
            const counter = document.getElementById('inventory-counter');
            if (counter) {
                counter.innerText = `(Total: ${this.inventoryProducts.length})`;
            }

            // Render current page
            this.renderInventoryPage(this.currentProductPage);

        } catch (e) {
            console.error(e);
            alert("Error loading inventory");
        } finally {
            if (loading) loading.classList.add('hidden');
        }
    }

    renderInventoryPage(page) {
        const tbody = document.getElementById('inventory-table-body');
        const cardsContainer = document.getElementById('mobile-inventory-cards-container');
        if (!tbody || !cardsContainer) return;
        tbody.innerHTML = '';
        cardsContainer.innerHTML = '';
        
        this.currentProductPage = page;
        const limit = 10;
        const totalItems = this.inventoryProducts.length;
        const totalPages = Math.ceil(totalItems / limit);

        if (page < 1) page = 1;
        if (page > totalPages && totalPages > 0) page = totalPages;
        this.currentProductPage = page;

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const displayItems = this.inventoryProducts.slice(startIndex, endIndex);

        if (displayItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text); opacity: 0.6;">No products found in inventory.</td></tr>';
            cardsContainer.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text); opacity: 0.6; width:100%;">No products found in inventory.</div>';
            this.renderPaginationControls(totalPages, page);
            return;
        }

        displayItems.forEach((p, displayIndex) => {
            const actualIndex = startIndex + displayIndex;
            const rowId = p.rowId || (actualIndex + 2);
            let imgSrc = p.images ? p.images.split(',')[0] : 'https://via.placeholder.com/50';
            if (!imgSrc || imgSrc.length < 5) imgSrc = 'https://via.placeholder.com/50';

            const linkHtml = p.product_link ? `<a href="${p.product_link}" target="_blank" title="View Product Link" style="color: var(--accent); margin-left: 0.5rem;"><i class="fas fa-external-link-alt" style="font-size: 0.75rem;"></i></a>` : '';

            // Desktop Table Row
            const tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid var(--border)";
            tr.innerHTML = `
                <td style="padding: 1rem;"><img src="${imgSrc}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                <td style="padding: 1rem; font-weight: 500;">${p.name}${linkHtml}</td>
                <td style="padding: 1rem;">${p.category || 'N/A'}</td>
                <td style="padding: 1rem; font-weight: bold; color: var(--accent);">KES ${parseFloat(p.price || 0).toLocaleString()}</td>
                <td style="padding: 1rem; white-space: nowrap;">
                    <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.AdminApp.editProduct(${rowId}, ${actualIndex})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="window.AdminApp.deleteProduct(${rowId})"><i class="fas fa-trash"></i> Delete</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card Row
            const card = document.createElement('div');
            card.className = 'mobile-inventory-card';
            card.innerHTML = `
                <div class="card-header-main">
                    <img src="${imgSrc}" class="card-thumb">
                    <div class="card-meta">
                        <h4>${p.name}${linkHtml}</h4>
                        <span class="card-cat-badge">${p.category || 'Uncategorized'}</span>
                    </div>
                </div>
                <div class="card-price-row">
                    <div class="card-price-label">KES ${parseFloat(p.price || 0).toLocaleString()}</div>
                    <div class="card-actions-wrapper">
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="window.AdminApp.editProduct(${rowId}, ${actualIndex})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="window.AdminApp.deleteProduct(${rowId})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </div>
            `;
            cardsContainer.appendChild(card);
        });

        this.renderPaginationControls(totalPages, page);
    }

    renderPaginationControls(totalPages, currentPage) {
        const paginationContainer = document.getElementById('inventory-pagination');
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
                this.renderInventoryPage(page);
            });
        });
    }

    editProduct(rowId, arrayIndex) {
        const p = this.inventoryProducts[arrayIndex];
        if (!p) return;

        // Switch Tab UI without resetting
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.getElementById(`view-add`).classList.remove('hidden');

        // Populate Form
        document.getElementById('form-title').innerText = "Edit Product";
        document.querySelector('#product-form button[type="submit"]').innerHTML = '<i class="fas fa-sync"></i> Update Product';

        const form = document.getElementById('product-form');
        form.name.value = p.name;
        form.category.value = p.category;
        form.price.value = p.price;
        form.old_price.value = p.old_price || '';
        form.product_link.value = p.product_link || '';
        form.description.value = p.description || '';
        document.getElementById('rowId').value = rowId;
        document.getElementById('existingImages').value = p.images || '';

        // Unify images in reorder preview
        this.selectedImages = [];
        if (p.images) {
            p.images.split(',').filter(imgUrl => imgUrl).forEach(imgUrl => {
                this.selectedImages.push({
                    type: 'existing',
                    value: imgUrl
                });
            });
        }
        this.renderPreviews();
    }

    async deleteProduct(rowId) {
        if (!confirm("Are you sure you want to permanently delete this product?")) return;

        try {
            await this.sendToSheet({ action: "delete", rowId: rowId });
            alert("Product Deleted!");
            this.loadInventory(); // Refresh
        } catch (e) {
            alert("Failed to delete product.");
        }
    }

    handleFiles(fileList) {
        Array.from(fileList).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                this.selectedImages.push({
                    type: 'new',
                    file: file,
                    value: e.target.result // base64 preview string
                });
                this.renderPreviews();
            };
            reader.readAsDataURL(file);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const rowId = formData.get('rowId');
        
        // Show Multi-Step Progress Overlay Modal
        this.showProgressModal(rowId ? "Updating Product..." : "Saving Product...");

        try {
            // Step 1: Compress Images locally
            this.updateProgressStep('compress', 'active');
            
            const imageFilesData = [];
            const newFiles = this.selectedImages.filter(img => img.type === 'new');
            
            for (const img of newFiles) {
                console.log(`Compressing ${img.file.name}...`);
                const compressedFile = await this.compressImage(img.file);
                const base64Content = await this.toBase64(compressedFile);
                imageFilesData.push({
                    name: img.file.name,
                    content: base64Content
                });
            }
            this.updateProgressStep('compress', 'completed');

            // Step 2: Sending metadata to sheets
            this.updateProgressStep('sheets', 'active');
            
            // Collect ordered list of existing image URLs
            const existingImagesStr = this.selectedImages
                .filter(img => img.type === 'existing')
                .map(img => img.value)
                .join(',');

            const productCmd = {
                action: rowId ? "edit" : "add",
                rowId: rowId || null,
                name: formData.get('name'),
                category: formData.get('category'),
                price: formData.get('price'),
                old_price: formData.get('old_price'),
                product_link: formData.get('product_link'),
                description: formData.get('description'),
                images: existingImagesStr, // Leave base image string intact, Apps Script will append
                imageFiles: imageFilesData, // Send compressed files to Google Script
                date_added: new Date().toISOString()
            };

            this.updateProgressStep('sheets', 'completed');

            // Step 3: Secure upload in storage
            this.updateProgressStep('github', 'active');
            await this.sendToSheet(productCmd);
            this.updateProgressStep('github', 'completed');

            // Save Completed -> Confetti animation
            this.showProgressSuccess(rowId ? 'Product Updated Successfully!' : 'Product Saved Successfully!', () => {
                this.resetForm();
                this.switchTab('list');
            });

        } catch (error) {
            console.error(error);
            this.hideProgressModal();
            alert('Error saving product: ' + error.message);
        }
    }

    async sendToSheet(data) {
        if (!CONFIG.googleScriptUrl || CONFIG.googleScriptUrl.includes('YOUR_')) {
            console.warn("Google Script URL not set. Logging data:", data);
            alert("Google Cloud Script URL is not configured. Check Console for data payload.");
            return;
        }

        // Inject memory-held password
        data.password = this.adminToken;

        // CRITICAL: Apps Script requires Content-Type text/plain to read e.postData.contents
        const response = await fetch(CONFIG.googleScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });

        let resultData;
        try {
            resultData = await response.json();
        } catch (parseErr) {
            // Apps Script sometimes returns a redirect on first call — treat as success
            console.warn('Could not parse Apps Script response (may be redirect):', parseErr);
            return true;
        }

        if (resultData.result === 'error') {
            if (resultData.error === 'Unauthorized Access') {
                alert('Unauthorized: Incorrect Admin Password!');
                location.reload();
            }
            throw new Error(resultData.error);
        }

        // Surface upload warnings if the record saved but image upload failed
        if (resultData.upload_warning) {
            alert('⚠️ Record saved, but image upload failed:\n' + resultData.upload_warning + '\n\nCheck your GitHub token and repo name in Script Properties.');
        }

        return resultData;
    }

    /* --- Settings Management (Brands & Testimonials) --- */
    async loadSettings() {
        const brandBody = document.getElementById('brands-table-body');
        const testBody = document.getElementById('testimonials-table-body');

        if (brandBody) brandBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Fetching brands...</td></tr>';
        if (testBody) testBody.innerHTML = '<tr><td colspan="5" style="padding: 1rem; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Fetching testimonials...</td></tr>';

        try {
            // 1. Load Brands
            const brands = await this.sheetDb.fetchBrands();
            if (brandBody) {
                brandBody.innerHTML = '';
                if (brands.length === 0) {
                    brandBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: var(--text); opacity: 0.6;">No brands added yet. Stock brand templates will be used.</td></tr>';
                } else {
                    brands.forEach(b => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = "1px solid var(--border)";
                        const img = b.logo_url ? `<img src="${b.logo_url}" style="height: 40px; max-width: 100px; object-fit: contain;">` : '<span style="color:var(--text); opacity:0.6;">None</span>';
                        tr.innerHTML = `
                            <td style="padding: 1rem;">${img}</td>
                            <td style="padding: 1rem; font-weight: 500;">${b.name}</td>
                            <td style="padding: 1rem; white-space:nowrap;">
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--accent-color); color: white; margin-right:0.4rem;" onclick="window.AdminApp.editBrand(${b.rowId}, '${b.name.replace(/'/g, "\\'") }', '${(b.logo_url || '').replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="window.AdminApp.deleteBrand(${b.rowId})"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        `;
                        brandBody.appendChild(tr);
                    });
                }
            }

            // 2. Load Testimonials
            const testimonials = await this.sheetDb.fetchTestimonials();
            if (testBody) {
                testBody.innerHTML = '';
                if (testimonials.length === 0) {
                    testBody.innerHTML = '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: var(--text); opacity: 0.6;">No testimonials added yet. Stock client reviews will be used.</td></tr>';
                } else {
                    testimonials.forEach(t => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = "1px solid var(--border)";
                        const img = t.photo_url ? `<img src="${t.photo_url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;">` : '<i class="fas fa-user-circle fa-2x" style="color:var(--border);"></i>';
                        const stars = '<i class="fas fa-star" style="color:#FFB800;"></i> '.repeat(parseInt(t.rating || 5));
                        const escapedText = (t.text || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        tr.innerHTML = `
                            <td style="padding: 1rem;">${img}</td>
                            <td style="padding: 1rem;">
                                <div style="font-weight:700;">${t.name}</div>
                                <div style="font-size:0.8rem; color:var(--text); opacity:0.7;">${t.role || ''}</div>
                            </td>
                            <td style="padding: 1rem; font-size: 0.9rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${t.text}</td>
                            <td style="padding: 1rem;">${stars}</td>
                            <td style="padding: 1rem; white-space:nowrap;">
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--accent-color); color: white; margin-right:0.4rem;" onclick="window.AdminApp.editTestimonial(${t.rowId}, '${(t.name||'').replace(/'/g, "\\'")}', '${(t.role||'').replace(/'/g, "\\'")}', '${t.rating||5}', '${escapedText}', '${(t.photo_url||'').replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="window.AdminApp.deleteTestimonial(${t.rowId})"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        `;
                        testBody.appendChild(tr);
                    });
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error loading backend settings");
        }
    }

    async handleBrandSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const rowId    = document.getElementById('brand-row-id').value;
            const fileInput = document.getElementById('brand-logo-input');
            const file = fileInput.files[0];

            // When adding, a file is required. When editing, it's optional.
            if (!rowId && !file) throw new Error('Please select a brand logo file.');

            const brandCmd = {
                action: rowId ? 'edit_brand' : 'add_brand',
                rowId: rowId || null,
                name: formData.get('brandName'),
                existingLogoUrl: document.getElementById('brand-existing-logo').value
            };

            if (file) {
                const base64Content = await this.toBase64(file);
                brandCmd.imageFile = { name: file.name, content: base64Content };
            }

            await this.sendToSheet(brandCmd);
            alert(rowId ? 'Brand updated successfully!' : 'Brand added successfully!');
            this.cancelBrandEdit();
            this.loadSettings();

        } catch (err) {
            console.error(err);
            alert('Error saving brand: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    editBrand(rowId, name, logoUrl) {
        document.getElementById('brand-row-id').value        = rowId;
        document.getElementById('brand-existing-logo').value = logoUrl;
        document.getElementById('brand-name-input').value    = name;
        document.getElementById('brand-form-title').textContent = '✏️ Editing Brand: ' + name;
        document.getElementById('brand-logo-hint').textContent = logoUrl ? '(leave empty to keep current logo)' : '';
        document.getElementById('brand-submit-btn').innerHTML  = '<i class="fas fa-save"></i> Update Brand';
        document.getElementById('brand-cancel-edit').style.display = 'inline-flex';
        document.getElementById('brand-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    cancelBrandEdit() {
        document.getElementById('brand-form').reset();
        document.getElementById('brand-row-id').value         = '';
        document.getElementById('brand-existing-logo').value  = '';
        document.getElementById('brand-form-title').textContent = 'Add New Brand';
        document.getElementById('brand-logo-hint').textContent  = '';
        document.getElementById('brand-submit-btn').innerHTML   = '<i class="fas fa-plus"></i> Add Brand Logo';
        document.getElementById('brand-cancel-edit').style.display = 'none';
    }

    async deleteBrand(rowId) {
        if (!confirm("Are you sure you want to permanently delete this brand partner?")) return;
        try {
            await this.sendToSheet({ action: "delete_brand", rowId: rowId });
            alert("Brand Partner Deleted!");
            this.loadSettings();
        } catch (e) {
            alert("Failed to delete brand.");
        }
    }

    async handleTestimonialSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const formData   = new FormData(e.target);
            const rowId      = document.getElementById('testimonial-row-id').value;
            const fileInput  = document.getElementById('client-photo-input');
            const file       = fileInput.files[0];

            const testCmd = {
                action: rowId ? 'edit_testimonial' : 'add_testimonial',
                rowId: rowId || null,
                name:   formData.get('clientName'),
                role:   formData.get('clientRole'),
                rating: formData.get('clientRating'),
                text:   formData.get('clientText'),
                existingPhotoUrl: document.getElementById('testimonial-existing-photo').value
            };

            if (file) {
                const base64Content = await this.toBase64(file);
                testCmd.imageFile = { name: file.name, content: base64Content };
            }

            await this.sendToSheet(testCmd);
            alert(rowId ? 'Testimonial updated successfully!' : 'Testimonial added successfully!');
            this.cancelTestimonialEdit();
            this.loadSettings();

        } catch (err) {
            console.error(err);
            alert('Error saving testimonial: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    editTestimonial(rowId, name, role, rating, text, photoUrl) {
        document.getElementById('testimonial-row-id').value          = rowId;
        document.getElementById('testimonial-existing-photo').value   = photoUrl;
        document.getElementById('client-name-input').value           = name;
        document.getElementById('client-role-input').value           = role;
        document.getElementById('client-text-input').value           = text;
        const ratingEl = document.getElementById('client-rating-input');
        if (ratingEl) ratingEl.value = rating;
        document.getElementById('testimonial-form-title').textContent = '✏️ Editing: ' + name;
        document.getElementById('client-photo-hint').textContent = photoUrl ? '(leave empty to keep current photo)' : '';
        document.getElementById('testimonial-submit-btn').innerHTML   = '<i class="fas fa-save"></i> Update Testimonial';
        document.getElementById('testimonial-cancel-edit').style.display = 'inline-flex';
        document.getElementById('testimonial-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    cancelTestimonialEdit() {
        document.getElementById('testimonial-form').reset();
        document.getElementById('testimonial-row-id').value           = '';
        document.getElementById('testimonial-existing-photo').value    = '';
        document.getElementById('testimonial-form-title').textContent  = 'Add New Testimonial';
        document.getElementById('client-photo-hint').textContent        = '';
        document.getElementById('testimonial-submit-btn').innerHTML    = '<i class="fas fa-plus"></i> Add Testimonial';
        document.getElementById('testimonial-cancel-edit').style.display = 'none';
    }

    async deleteTestimonial(rowId) {
        if (!confirm("Are you sure you want to permanently delete this testimonial?")) return;
        try {
            await this.sendToSheet({ action: "delete_testimonial", rowId: rowId });
            alert("Testimonial Deleted!");
            this.loadSettings();
        } catch (e) {
            alert("Failed to delete testimonial.");
        }
    }

    /* --- Discounts Management --- */
    async loadDiscounts() {
        const body = document.getElementById('discounts-table-body');
        if (body) body.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Fetching active discount list...</td></tr>';

        try {
            // First load products cache so we can populate product redirect selectors if needed
            if (this.inventoryProducts.length === 0) {
                this.inventoryProducts = await this.sheetDb.fetchProducts();
            }

            // Populate redirect selectors default
            const targetTypeSelect = document.getElementById('discount-target-type-input');
            if (targetTypeSelect) {
                this.updateDiscountTargetOptions(targetTypeSelect.value);
            }

            const discounts = await this.sheetDb.fetchDiscounts();
            if (body) {
                body.innerHTML = '';
                if (discounts.length === 0) {
                    body.innerHTML = '<tr><td colspan="6" style="padding: 1rem; text-align: center; color: var(--text); opacity: 0.6;">No discount banners added yet. Fallback default branding slide will be shown.</td></tr>';
                } else {
                    discounts.forEach(d => {
                        const tr = document.createElement('tr');
                        tr.style.borderBottom = "1px solid var(--border)";
                        const img = d.banner_url ? `<img src="${d.banner_url}" style="height: 40px; width: 80px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border);">` : '<span style="color:var(--text); opacity:0.6;">None</span>';
                        
                        let targetText = '';
                        if (d.target_type === 'category') targetText = `📂 Category: <strong>${d.target_id}</strong>`;
                        else if (d.target_type === 'product') targetText = `📦 Product Modal: <strong>${d.target_id}</strong>`;
                        else targetText = `🔗 Link: <a href="${d.target_id}" target="_blank" style="color:var(--accent); font-weight:500;">${d.target_id.substring(0, 30)}...</a>`;

                        const statusBadge = d.active === 'TRUE' 
                            ? `<span style="background:rgba(16,185,129,0.15); color:#10B981; font-size:0.75rem; padding:4px 8px; border-radius:12px; font-weight:700;">Active</span>`
                            : `<span style="background:rgba(239,68,68,0.15); color:#EF4444; font-size:0.75rem; padding:4px 8px; border-radius:12px; font-weight:700;">Disabled</span>`;

                        const escapedTitle = (d.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        const escapedVal = (d.discount_value || '').replace(/'/g, "\\'");
                        const escapedDesc = (d.description || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        const escapedBanner = (d.banner_url || '').replace(/'/g, "\\'");

                        tr.innerHTML = `
                            <td style="padding: 1rem;">${img}</td>
                            <td style="padding: 1rem; font-weight: 600; color:var(--primary);">${d.title}</td>
                            <td style="padding: 1rem;"><span style="background:#FFD700; color:var(--primary); font-weight:700; font-size:0.8rem; padding:3px 8px; border-radius:4px;">${d.discount_value}</span></td>
                            <td style="padding: 1rem; font-size:0.85rem;">${targetText}</td>
                            <td style="padding: 1rem;">${statusBadge}</td>
                            <td style="padding: 1rem; white-space:nowrap;">
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--accent-color); color: white; margin-right:0.4rem;" onclick="window.AdminApp.editDiscount(${d.rowId}, '${escapedTitle}', '${escapedVal}', '${d.target_type}', '${(d.target_id||'').replace(/'/g, "\\'")}', '${escapedDesc}', '${escapedBanner}', '${d.active}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="window.AdminApp.deleteDiscount(${d.rowId})"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        `;
                        body.appendChild(tr);
                    });
                }
            }
        } catch (e) {
            console.error(e);
            alert("Error loading dynamic discount offers: " + e.message);
        }
    }

    updateDiscountTargetOptions(type) {
        const select = document.getElementById('discount-target-id-input');
        const customInput = document.getElementById('discount-custom-link-input');
        if (!select || !customInput) return;

        select.innerHTML = '';

        if (type === 'category') {
            select.classList.remove('hidden');
            select.disabled = false;
            customInput.classList.add('hidden');
            customInput.required = false;

            const categories = [
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
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                select.appendChild(opt);
            });
        } else if (type === 'product') {
            select.classList.remove('hidden');
            select.disabled = false;
            customInput.classList.add('hidden');
            customInput.required = false;

            if (this.inventoryProducts.length === 0) {
                const opt = document.createElement('option');
                opt.value = '';
                opt.textContent = "Loading active products list...";
                select.appendChild(opt);
            } else {
                this.inventoryProducts.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.name;
                    opt.textContent = p.name;
                    select.appendChild(opt);
                });
            }
        } else if (type === 'link') {
            select.classList.add('hidden');
            select.disabled = true;
            customInput.classList.remove('hidden');
            customInput.required = true;
        }
    }

    async handleDiscountSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            const formData = new FormData(e.target);
            const rowId = document.getElementById('discount-row-id').value;
            const fileInput = document.getElementById('discount-banner-input');
            const file = fileInput.files[0];

            if (!rowId && !file) throw new Error('Please select a discount banner background image.');

            const type = formData.get('discountTargetType');
            let targetVal = '';
            if (type === 'link') {
                targetVal = formData.get('discountCustomLink').trim();
            } else {
                targetVal = formData.get('discountTargetId');
            }

            const discountCmd = {
                action: rowId ? 'edit_discount' : 'add_discount',
                rowId: rowId || null,
                title: formData.get('discountTitle'),
                discount_value: formData.get('discountValue'),
                target_type: type,
                target_id: targetVal,
                description: formData.get('discountDescription'),
                active: formData.get('discountActive'),
                existingBannerUrl: document.getElementById('discount-existing-banner').value
            };

            if (file) {
                console.log(`Compressing discount banner: ${file.name}...`);
                const compressedBanner = await this.compressImage(file);
                const base64Content = await this.toBase64(compressedBanner);
                discountCmd.imageFile = { name: file.name, content: base64Content };
            }

            await this.sendToSheet(discountCmd);
            alert(rowId ? 'Discount Offer updated successfully!' : 'Discount Offer added successfully!');
            this.cancelDiscountEdit();
            this.loadDiscounts();

        } catch (err) {
            console.error(err);
            alert('Error saving discount offer: ' + err.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    editDiscount(rowId, title, discountValue, targetType, targetId, description, bannerUrl, active) {
        document.getElementById('discount-row-id').value = rowId;
        document.getElementById('discount-existing-banner').value = bannerUrl;
        document.getElementById('discount-title-input').value = title;
        document.getElementById('discount-value-input').value = discountValue;
        document.getElementById('discount-description-input').value = description;
        
        const typeSelect = document.getElementById('discount-target-type-input');
        typeSelect.value = targetType;
        this.updateDiscountTargetOptions(targetType);

        if (targetType === 'link') {
            document.getElementById('discount-custom-link-input').value = targetId;
        } else {
            document.getElementById('discount-target-id-input').value = targetId;
        }

        document.getElementById('discount-active-input').value = active;
        document.getElementById('discount-form-title').textContent = '✏️ Editing Discount: ' + title;
        document.getElementById('discount-banner-hint').textContent = bannerUrl ? '(leave empty to keep current banner)' : '';
        document.getElementById('discount-submit-btn').innerHTML = '<i class="fas fa-save"></i> Update Discount';
        document.getElementById('discount-cancel-edit').style.display = 'inline-flex';
        document.getElementById('discount-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    cancelDiscountEdit() {
        document.getElementById('discount-form').reset();
        document.getElementById('discount-row-id').value = '';
        document.getElementById('discount-existing-banner').value = '';
        document.getElementById('discount-form-title').textContent = 'Add New Discount Offer';
        document.getElementById('discount-banner-hint').textContent = '';
        document.getElementById('discount-submit-btn').innerHTML = '<i class="fas fa-plus"></i> Upload Discount Offer';
        document.getElementById('discount-cancel-edit').style.display = 'none';

        const typeSelect = document.getElementById('discount-target-type-input');
        if (typeSelect) {
            typeSelect.value = 'category';
            this.updateDiscountTargetOptions('category');
        }
    }

    async deleteDiscount(rowId) {
        if (!confirm("Are you sure you want to permanently delete this discount offer banner?")) return;
        try {
            await this.sendToSheet({ action: "delete_discount", rowId: rowId });
            alert("Discount Offer Deleted!");
            this.loadDiscounts();
        } catch (e) {
            alert("Failed to delete discount: " + e.message);
        }
    }

    async compressImage(file) {
        return new Promise((resolve) => {
            const maxW = 1200;
            const maxH = 1200;
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (ev) => {
                const img = new Image();
                img.src = ev.target.result;
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;
                    
                    if (w > maxW || h > maxH) {
                        if (w > h) {
                            h = Math.round((h * maxW) / w);
                            w = maxW;
                        } else {
                            w = Math.round((w * maxH) / h);
                            h = maxH;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    
                    canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', 0.82); // 82% quality JPEG
                };
            };
        });
    }

    renderPreviews() {
        const previewArea = document.getElementById('preview-area');
        if (!previewArea) return;
        previewArea.innerHTML = '';

        this.selectedImages.forEach((img, idx) => {
            const div = document.createElement('div');
            div.className = `preview-item ${idx === 0 ? 'cover-item' : ''}`;
            
            const typeTag = img.type === 'existing' 
                ? `<div style="position:absolute; bottom:6px; left:6px; background:rgba(15,23,42,0.85); color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px; z-index:3;">Old</div>`
                : `<div style="position:absolute; bottom:6px; left:6px; background:rgba(16,185,129,0.85); color:white; font-size:0.65rem; padding:2px 6px; border-radius:4px; z-index:3;">New</div>`;
            
            const coverTag = idx === 0 ? `<div class="primary-cover-badge">Primary Cover</div>` : '';

            div.innerHTML = `
                <img src="${img.value}">
                ${typeTag}
                ${coverTag}
                <div class="preview-item-controls">
                    <button type="button" class="control-btn-item" title="Move Left" onclick="window.AdminApp.moveImage(${idx}, -1)">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <button type="button" class="control-btn-item" title="Move Right" onclick="window.AdminApp.moveImage(${idx}, 1)">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <button type="button" class="control-btn-item btn-danger-hover" title="Remove Image" onclick="window.AdminApp.removeImage(${idx})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            previewArea.appendChild(div);
        });
        
        // Update existingImages hidden input with current existing images in order
        const existingUrls = this.selectedImages
            .filter(img => img.type === 'existing')
            .map(img => img.value);
        document.getElementById('existingImages').value = existingUrls.join(',');
    }

    moveImage(idx, dir) {
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= this.selectedImages.length) return;
        
        // Swap elements
        const temp = this.selectedImages[idx];
        this.selectedImages[idx] = this.selectedImages[newIdx];
        this.selectedImages[newIdx] = temp;
        
        this.renderPreviews();
    }
    
    removeImage(idx) {
        this.selectedImages.splice(idx, 1);
        this.renderPreviews();
    }

    /* --- Progress Multi-Step Modal Helpers --- */
    showProgressModal(title) {
        const modal = document.getElementById('progress-modal');
        if (!modal) return;
        
        document.getElementById('progress-title-text').textContent = title;
        document.getElementById('progress-spinner').classList.remove('hidden');
        document.getElementById('progress-success-checkmark').classList.add('hidden');
        
        // Reset steps
        document.querySelectorAll('.progress-step-item').forEach(el => {
            el.classList.remove('active', 'completed');
        });
        
        modal.classList.remove('hidden');
    }
    
    updateProgressStep(stepId, state) {
        const item = document.getElementById(`step-${stepId}`);
        if (!item) return;
        
        if (state === 'active') {
            item.classList.add('active');
            item.classList.remove('completed');
        } else if (state === 'completed') {
            item.classList.add('completed');
            item.classList.remove('active');
        }
    }
    
    showProgressSuccess(message, callback) {
        document.getElementById('progress-spinner').classList.add('hidden');
        document.getElementById('progress-success-checkmark').classList.remove('hidden');
        document.getElementById('progress-title-text').textContent = message;
        
        // Complete all steps visually
        document.querySelectorAll('.progress-step-item').forEach(el => {
            el.classList.add('completed');
            el.classList.remove('active');
        });
        
        setTimeout(() => {
            const modal = document.getElementById('progress-modal');
            if (modal) modal.classList.add('hidden');
            if (callback) callback();
        }, 2200);
    }
    
    hideProgressModal() {
        const modal = document.getElementById('progress-modal');
        if (modal) modal.classList.add('hidden');
    }

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }
}

// Start
// Since we are using modules, we need to attach to window or init
window.addEventListener('DOMContentLoaded', () => {
    window.AdminApp = new AdminApplication();
});

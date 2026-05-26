import { GoogleSheetAdapter } from './google-sheet-adapter.js';

class AdminApplication {
    constructor() {
        this.isAuthenticated = false;
        this.adminToken = null; // Memory-held password
        this.selectedFiles = [];
        this.sheetDb = new GoogleSheetAdapter(CONFIG.sheetID, CONFIG.googleScriptUrl);
        this.inventoryProducts = [];

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

        // File Input
        const dropzone = document.getElementById('dropzone');
        const fileInput = document.getElementById('file-input');

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

        // Form Submit
        document.getElementById('product-form').addEventListener('submit', (e) => this.handleSubmit(e));

        // Settings Forms
        const brandForm = document.getElementById('brand-form');
        if (brandForm) {
            brandForm.addEventListener('submit', (e) => this.handleBrandSubmit(e));
        }

        const testForm = document.getElementById('testimonial-form');
        if (testForm) {
            testForm.addEventListener('submit', (e) => this.handleTestimonialSubmit(e));
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
    }

    async loadInventory() {
        const tbody = document.getElementById('inventory-table-body');
        const loading = document.getElementById('inventory-loading');
        loading.classList.remove('hidden');
        tbody.innerHTML = '';

        try {
            this.inventoryProducts = await this.sheetDb.fetchProducts();

            this.inventoryProducts.forEach((p, index) => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid var(--border)";
                let imgSrc = p.images ? p.images.split(',')[0] : 'https://via.placeholder.com/50';

                // rowId is returned directly by the Apps Script doGet endpoint
                const rowId = p.rowId || (index + 2);

                tr.innerHTML = `
                    <td style="padding: 1rem;"><img src="${imgSrc}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
                    <td style="padding: 1rem; font-weight: 500;">${p.name}</td>
                    <td style="padding: 1rem;">${p.category || 'N/A'}</td>
                    <td style="padding: 1rem; font-weight: bold; color: var(--accent);">KES ${parseFloat(p.price || 0).toLocaleString()}</td>
                    <td style="padding: 1rem;">
                        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.85rem;" onclick="AdminApp.editProduct(${rowId}, ${index})"><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="AdminApp.deleteProduct(${rowId})"><i class="fas fa-trash"></i> Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
            alert("Error loading inventory");
        } finally {
            loading.classList.add('hidden');
        }
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
        form.description.value = p.description || '';
        document.getElementById('rowId').value = rowId;
        document.getElementById('existingImages').value = p.images || '';

        // Show existing images in preview
        const previewArea = document.getElementById('preview-area');
        previewArea.innerHTML = '';
        this.selectedFiles = []; // Reset new file selections
        if (p.images) {
            let existingImagesArray = p.images.split(',').filter(imgUrl => imgUrl);
            existingImagesArray.forEach(imgUrl => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${imgUrl}">
                    <div style="position:absolute; bottom:4px; left:4px; background:rgba(0,0,0,0.5); color:white; font-size:0.7rem; padding:2px; border-radius:4px;">Old</div>
                    <button type="button" class="remove-old-btn" title="Remove image" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                div.querySelector('.remove-old-btn').addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    existingImagesArray = existingImagesArray.filter(url => url !== imgUrl);
                    document.getElementById('existingImages').value = existingImagesArray.join(',');
                    div.remove();
                });
                previewArea.appendChild(div);
            });
        }
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
        const previewArea = document.getElementById('preview-area');
        // Clear previous selection (or append, depending on UX. Let's append)

        Array.from(fileList).forEach(file => {
            if (!file.type.startsWith('image/')) return;

            this.selectedFiles.push(file);

            // Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}">
                    <button type="button" class="remove-btn" title="Remove image" style="position:absolute; top:4px; right:4px; background:rgba(239,68,68,0.9); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-times"></i>
                    </button>
                `;

                div.querySelector('.remove-btn').addEventListener('click', (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    this.selectedFiles = this.selectedFiles.filter(f => f !== file);
                    div.remove();
                });

                previewArea.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        btn.disabled = true;

        try {
            // 1. Convert new images to base64, to send to Apps Script
            const imageFilesData = [];
            for (const file of this.selectedFiles) {
                console.log(`Preparing ${file.name}...`);
                const base64Content = await this.toBase64(file);
                imageFilesData.push({
                    name: file.name,
                    content: base64Content
                });
            }

            // Existing images (from edit mode)
            const existingImagesStr = document.getElementById('existingImages').value;

            // 2. Prepare Data
            const formData = new FormData(e.target);
            const rowId = formData.get('rowId');

            const productCmd = {
                action: rowId ? "edit" : "add",
                rowId: rowId || null,
                name: formData.get('name'),
                category: formData.get('category'),
                price: formData.get('price'),
                old_price: formData.get('old_price'),
                description: formData.get('description'),
                images: existingImagesStr, // Leave base image string intact, Apps Script will append
                imageFiles: imageFilesData, // Send new files to Google Script
                date_added: new Date().toISOString()
            };

            // 3. Send to Google Sheet
            await this.sendToSheet(productCmd);

            alert(rowId ? 'Product Updated Successfully!' : 'Product Saved Successfully!');
            this.resetForm();
            this.switchTab('list');

        } catch (error) {
            console.error(error);
            alert('Error saving product: ' + error.message);
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
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
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--accent-color); color: white; margin-right:0.4rem;" onclick="AdminApp.editBrand(${b.rowId}, '${b.name.replace(/'/g, "\\'") }', '${(b.logo_url || '').replace(/'/g, "\\'")}')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="AdminApp.deleteBrand(${b.rowId})"><i class="fas fa-trash"></i> Delete</button>
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
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--accent-color); color: white; margin-right:0.4rem;" onclick="AdminApp.editTestimonial(${t.rowId}, '${(t.name||'').replace(/'/g,\"\\\\'\")  }', '${(t.role||'').replace(/'/g,\"\\\\'\")  }', '${t.rating||5}', '${escapedText}', '${(t.photo_url||'').replace(/'/g,\"\\\\'\") }')"><i class="fas fa-edit"></i> Edit</button>
                                <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; background: var(--danger); color: white;" onclick="AdminApp.deleteTestimonial(${t.rowId})"><i class="fas fa-trash"></i> Delete</button>
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
window.AdminApp = new AdminApplication();

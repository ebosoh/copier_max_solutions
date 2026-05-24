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

        if (tabId === 'list') {
            this.loadInventory();
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
            if (rowId) this.switchTab('list');

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

        // Inject memory-held password to verify actions against Apps Script Proxy
        data.password = this.adminToken;

        const response = await fetch(CONFIG.googleScriptUrl, {
            method: 'POST',
            body: JSON.stringify(data)
        });

        // The script returns JSON {"result": "success"} or error
        // Note: For advanced setups where basic cors isn't an issue, we can parse response here.
        // Google scripts often return 200 with JSON payload
        try {
            const resultData = await response.json();
            if (resultData.result === "error") {
                throw new Error(resultData.error);
            }
        } catch (e) {
            // Provide a graceful failure format if fetch parses wrongly or Unauthorized triggers
            console.warn("Fetch parsed gracefully or threw specific response log:", e.message);
            if (e.message === "Unauthorized Access") {
                alert("Unauthorized: Incorrect Admin Password!");
                // Kick back to login
                location.reload();
                throw e;
            }
        }

        return true;
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

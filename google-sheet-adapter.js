/**
 * Google Sheets Adapter for CopierMax Solutions
 * Fetches product, brand, and testimonial data via the deployed Google Apps Script Web App (doGet).
 */

export class GoogleSheetAdapter {
    constructor(sheetId, scriptUrl) {
        this.scriptUrl = scriptUrl || (typeof CONFIG !== 'undefined' ? CONFIG.googleScriptUrl : null);
    }

    /**
     * Helper to fetch data by sheet type
     */
    async fetchByType(type) {
        if (!this.scriptUrl || this.scriptUrl.includes('YOUR_')) {
            console.warn(`GoogleSheetAdapter: googleScriptUrl is not configured for ${type}`);
            return [];
        }

        try {
            console.log(`Fetching ${type} from Apps Script API...`);
            const url = this.scriptUrl + (this.scriptUrl.includes('?') ? '&' : '?') + 'type=' + type + '&_t=' + Date.now();
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`API error ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error('Unexpected response format from Apps Script.');
            }

            console.log(`Loaded ${data.length} items for ${type}.`);
            return data.reverse();

        } catch (error) {
            console.error(`GoogleSheetAdapter Error fetching ${type}:`, error);
            return [];
        }
    }

    /**
     * Fetches all products
     */
    async fetchProducts() {
        return this.fetchByType('products');
    }

    /**
     * Fetches brand items
     */
    async fetchBrands() {
        return this.fetchByType('brands');
    }

    /**
     * Fetches customer testimonials
     */
    async fetchTestimonials() {
        return this.fetchByType('testimonials');
    }

    /**
     * Fetches dynamic discount offers
     */
    async fetchDiscounts() {
        return this.fetchByType('discounts');
    }
}

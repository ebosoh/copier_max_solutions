/**
 * Google Sheets Adapter for CopierMax Solutions
 * Fetches product data via the deployed Google Apps Script Web App (doGet).
 * This approach does NOT require the sheet to be "Published to the web",
 * and correctly preserves rowIds and handles commas inside image URL lists.
 */

export class GoogleSheetAdapter {
    constructor(sheetId, scriptUrl) {
        // scriptUrl is the deployed Apps Script URL (used as the data API)
        this.scriptUrl = scriptUrl || (typeof CONFIG !== 'undefined' ? CONFIG.googleScriptUrl : null);
    }

    /**
     * Fetches all products from the Apps Script doGet endpoint.
     * Returns an array of product objects, each with a `rowId` property.
     * @returns {Promise<Array>}
     */
    async fetchProducts() {
        if (!this.scriptUrl || this.scriptUrl.includes('YOUR_')) {
            console.warn('GoogleSheetAdapter: googleScriptUrl is not configured in config.js');
            return [];
        }

        try {
            console.log('Fetching products from Apps Script API...');
            const cacheBusterUrl = this.scriptUrl + (this.scriptUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
            const response = await fetch(cacheBusterUrl, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`API error ${response.status}: ${response.statusText}`);
            }

            const products = await response.json();

            if (!Array.isArray(products)) {
                throw new Error('Unexpected response format from Apps Script.');
            }

            console.log(`Loaded ${products.length} products.`);
            return products;

        } catch (error) {
            console.error('GoogleSheetAdapter Error:', error);
            return [];
        }
    }
}

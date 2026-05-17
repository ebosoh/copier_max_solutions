/**
 * Google Sheets Adapter for CopierMax Solutions
 * Fetches product data from a public Google Sheet CSV feed.
 */

// Configuration - User will need to replace this with their published sheet ID
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; 
const SHEET_TAB_GID = '0'; // Default is usually 0
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_TAB_GID}`;

export class GoogleSheetAdapter {
    constructor(sheetId) {
        this.sheetId = sheetId || SHEET_ID;
        this.csvUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=${SHEET_TAB_GID}`;
    }

    /**
     * Fetches data and updates the local store
     * @returns {Promise<Array>} List of product objects
     */
    async fetchProducts() {
        try {
            console.log("Fetching products from Google Sheets...");
            const response = await fetch(this.csvUrl);
            
            if (!response.ok) {
                // Determine if it's a 404 (Sheet not published/found)
                if(response.status === 404) {
                    throw new Error("Sheet not found. Please check the Sheet ID and ensure it is 'Published to the Web'.");
                }
                throw new Error(`Failed to fetch data: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error("GoogleSheetAdapter Error:", error);
            return []; // Return empty on error to prevent crash
        }
    }

    /**
     * Parses CSV text into JSON objects
     * Assumes first row is header
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); // basics
        
        const products = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Handle commas inside quotes logic would go here, 
            // for now, we do a simple split and assume clean data
            // (A robust CSV parser library is recommended for production)
            const currentLine = this.parseCSVLine(lines[i]);
            
            if (currentLine.length === headers.length) {
                const product = {};
                headers.forEach((header, index) => {
                    product[header] = currentLine[index];
                });
                products.push(product);
            }
        }
        
        return products;
    }

    // Helper to handle simple CSV parsing with quotes
    parseCSVLine(text) {
        const result = [];
        let cell = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(cell.trim());
                cell = '';
            } else {
                cell += char;
            }
        }
        result.push(cell.trim());
        return result;
    }
}

window.CONFIG = {
    // Branding
    siteName: "Copier Maximum Solutions",

    // Google Sheets
    // The ID of the Google Sheet containing product data
    sheetID: "12c-_4A1eiSz9aN9SVIoqBMCKSlKXfHpMK2qbB_CzOHA",
    // The deployed Web App URL for submitting forms (writing data)
    googleScriptUrl: "https://script.google.com/macros/s/AKfycbx6w5OLSutIUUFeTxhAXAKYs7-pREcOV1hpIrv930Y_XfHj9X35i0eI1WWPeYk5W7tuCg/exec",

    // GitHub Configuration is now securely stored out of sight in the Google Apps Script backend (code.gs).

    // Admin Security
    // Passwords are no longer stored here. The active script forces memory-injection of passwords.
};

// Export to local scope as well for legacy references
const CONFIG = window.CONFIG;

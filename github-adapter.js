/**
 * GitHub Adapter for CopierMax Solutions
 * Handles image uploads to the repository via GitHub API.
 */

// Configuration
// In production, this should not be hardcoded in public code without restrictions.
// For a personal admin tool, it's acceptable if the admin keeps the token safe.
const GITHUB_USERNAME = 'ebosoh';
const GITHUB_REPO = 'copier_max_solutions'; // Repository name
const GITHUB_BRANCH = 'main'; // or master
const GITHUB_TOKEN = 'YOUR_GITHUB_TOKEN'; // Personal Access Token with 'repo' scope

export class GitHubAdapter {
    constructor() {
        this.baseUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents`;
    }

    /**
     * Uploads an image file to the assets/products directory
     * @param {File} file - The file object from input
     * @returns {Promise<string>} The public URL of the uploaded image
     */
    async uploadImage(file) {
        if (!file) return null;

        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '-').toLowerCase();
        const path = `${timestamp}-${safeName}`;

        // Convert file to Base64 (required by GitHub API)
        const content = await this.toBase64(file);

        const body = {
            message: `Upload product image: ${safeName}`,
            content: content,
            branch: GITHUB_BRANCH
        };

        try {
            const response = await fetch(`${this.baseUrl}/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Upload failed');
            }

            const data = await response.json();
            // Return the simplified raw URL (served via GitHub Pages if enabled, or raw.githubusercontent)
            // Ideally: https://username.github.io/repo/assets/products/filename
            return `https://${GITHUB_USERNAME}.github.io/${GITHUB_REPO}/${path}`;

        } catch (error) {
            console.error("GitHub Upload Error:", error);
            alert("Failed to upload image to GitHub. Check Console/Network.");
            throw error;
        }
    }

    toBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove the "data:image/png;base64," prefix
                const result = reader.result;
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }
}

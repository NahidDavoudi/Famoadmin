// api-client.js

const API_URL = '../api/admin.php';

export async function api(action, data = {}, method = 'GET') {
    try {
        let url = `${API_URL}?action=${action}`;
        let options = { method, credentials: 'same-origin' };
        
        if (method === 'POST') {
            if (data instanceof FormData) {
                data.append('action', action);
                options.body = data;
            } else {
                const formData = new FormData();
                formData.append('action', action);
                for (const [key, value] of Object.entries(data)) {
                    formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
                }
                options.body = formData;
            }
        } else {
            for (const [key, value] of Object.entries(data)) {
                url += `&${key}=${encodeURIComponent(value)}`;
            }
        }
        
        const response = await fetch(url, options);
        
        // Get response text first to check if it's valid JSON
        const responseText = await response.text();
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            // If response is not valid JSON, it's likely a PHP error
            console.error('Invalid JSON response:', responseText);
            throw new Error('خطا در پاسخ سرور: ' + (responseText.substring(0, 200) || 'پاسخ نامعتبر'));
        }
        
        if (!response.ok) {
            const errorMsg = result.error || `خطای HTTP ${response.status}`;
            throw new Error(errorMsg);
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
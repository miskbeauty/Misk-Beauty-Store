/**
 * Misk Beauty - Customer Authentication & Data Protection
 */

const DataVault = {
    encrypt: (data) => btoa(encodeURIComponent(JSON.stringify(data))),
    decrypt: (secret) => {
        if (!secret) return null;
        try {
            return JSON.parse(decodeURIComponent(atob(secret)));
        } catch (e) {
            return null;
        }
    }
};

const AuthService = {
    register: async (userData) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            const data = await response.json();
            if (response.ok) {
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message };
        } catch (error) {
            return { success: false, message: 'حدث خطأ في الاتصال بالخادم' };
        }
    },

    login: async (phone, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('misk_token', data.token);
                localStorage.setItem('misk_customer_session', JSON.stringify({
                    userId: data.user._id,
                    name: data.user.name,
                    loginTime: Date.now()
                }));
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message };
        } catch (error) {
            return { success: false, message: 'حدث خطأ في الاتصال بالخادم' };
        }
    },

    logout: () => {
        localStorage.removeItem('misk_token');
        localStorage.removeItem('misk_customer_session');
        window.location.href = 'index.html';
    },

    getUser: async () => {
        const token = localStorage.getItem('misk_token');
        if (!token) return null;

        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok) return data.user;

            // If token invalid, logout
            AuthService.logout();
            return null;
        } catch (e) {
            return null;
        }
    },

    // Legacy sync method for convenience (optional)
    getUserSync: () => {
        const sessionStr = localStorage.getItem('misk_customer_session');
        if (!sessionStr) return null;
        return JSON.parse(sessionStr);
    }
};

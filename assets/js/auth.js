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
    register: (userData) => {
        const encryptedUsers = localStorage.getItem('misk_users_vault');
        const users = DataVault.decrypt(encryptedUsers) || [];

        if (users.find(u => u.phone === userData.phone)) {
            return { success: false, message: 'رقم الهاتف مسجل مسبقاً' };
        }

        const newUser = {
            id: 'user_' + Date.now(),
            name: userData.name,
            phone: userData.phone,
            password: userData.password, // In a real app, this would be hashed
            points: 0,
            pointsHistory: [],
            totalSpend: 0,
            orderCount: 0,
            joinedDate: new Date().toISOString().split('T')[0]
        };

        users.push(newUser);
        localStorage.setItem('misk_users_vault', DataVault.encrypt(users));
        return { success: true, user: newUser };
    },

    login: (phone, password) => {
        const encryptedUsers = localStorage.getItem('misk_users_vault');
        const users = DataVault.decrypt(encryptedUsers) || [];

        const user = users.find(u => u.phone === phone && u.password === password);
        if (user) {
            const session = {
                userId: user.id,
                name: user.name,
                loginTime: Date.now()
            };
            localStorage.setItem('misk_customer_session', JSON.stringify(session));
            return { success: true, user: user };
        }
        return { success: false, message: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
    },

    logout: () => {
        localStorage.removeItem('misk_customer_session');
        window.location.href = 'index.html';
    },

    getUser: () => {
        const sessionStr = localStorage.getItem('misk_customer_session');
        if (!sessionStr) return null;

        const session = JSON.parse(sessionStr);
        // Optional: Check session expiry (e.g., 7 days)

        const encryptedUsers = localStorage.getItem('misk_users_vault');
        const users = DataVault.decrypt(encryptedUsers) || [];
        return users.find(u => u.id === session.userId) || null;
    },

    updateUser: (updatedUser) => {
        const encryptedUsers = localStorage.getItem('misk_users_vault');
        const users = DataVault.decrypt(encryptedUsers) || [];
        const index = users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
            users[index] = updatedUser;
            localStorage.setItem('misk_users_vault', DataVault.encrypt(users));
            return true;
        }
        return false;
    }
};

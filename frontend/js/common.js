// Common utility functions and configurations

// API Configuration
const API_CONFIG = {
    baseUrl: window.location.origin,
    timeout: 10000
};

// Authentication utilities
const Auth = {
    getToken: () => localStorage.getItem('token'),
    getUserRole: () => localStorage.getItem('userRole'),
    getUserId: () => localStorage.getItem('userId'),
    getUsername: () => localStorage.getItem('username'),
    
    setAuth: (token, role, userId, username) => {
        localStorage.setItem('token', token);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', username);
    },
    
    clearAuth: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
    },
    
    isAuthenticated: () => {
        return !!Auth.getToken();
    },
    
    checkRole: (requiredRole) => {
        return Auth.getUserRole() === requiredRole;
    }
};

// API helper function
async function apiCall(endpoint, options = {}) {
    const token = Auth.getToken();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const config = { ...defaultOptions, ...options };
    
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, config);
        
        // Handle authentication errors
        if (response.status === 401) {
            Auth.clearAuth();
            window.location.href = '/login';
            return null;
        }
        
        return response;
    } catch (error) {
        console.error('API call failed:', error);
        throw new Error('Network error. Please check your connection.');
    }
}

// Alert utilities
const AlertManager = {
    show: (elementId, message, type = 'info') => {
        const alertElement = document.getElementById(elementId);
        if (!alertElement) return;
        
        alertElement.className = `alert alert-${type}`;
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        
        // Auto-hide after 5 seconds for success messages
        if (type === 'success') {
            setTimeout(() => {
                alertElement.style.display = 'none';
            }, 5000);
        }
    },
    
    hide: (elementId) => {
        const alertElement = document.getElementById(elementId);
        if (alertElement) {
            alertElement.style.display = 'none';
        }
    }
};

// Loading utilities
const LoadingManager = {
    show: (elementId) => {
        const loadingElement = document.getElementById(elementId);
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    },
    
    hide: (elementId) => {
        const loadingElement = document.getElementById(elementId);
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
};

// Form utilities
const FormUtils = {
    serialize: (formElement) => {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },
    
    reset: (formElement) => {
        formElement.reset();
        // Reset any custom styling
        const inputs = formElement.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.style.borderColor = '#e1e5e9';
        });
    },
    
    validate: (formElement) => {
        const requiredFields = formElement.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = '#dc3545';
                isValid = false;
            } else {
                field.style.borderColor = '#28a745';
            }
        });
        
        return isValid;
    }
};

// Date utilities
const DateUtils = {
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    isOverdue: (dueDate) => {
        return new Date(dueDate) < new Date();
    },
    
    getDaysUntilDue: (dueDate) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
};

// Currency utilities
const CurrencyUtils = {
    format: (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    },
    
    formatSimple: (amount) => {
        return `₹${amount.toLocaleString('en-IN')}`;
    }
};

// Validation utilities
const ValidationUtils = {
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    isValidPhone: (phone) => {
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone);
    },
    
    isValidPassword: (password) => {
        return password.length >= 6;
    },
    
    isValidUsername: (username) => {
        return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username);
    },
    
};

// Navigation utilities
const NavigationUtils = {
    redirectBasedOnRole: () => {
        const role = Auth.getUserRole();
        if (role === 'landlord') {
            window.location.href = 'landlord-dashboard.html';
        } else if (role === 'tenant') {
            window.location.href = 'tenant-dashboard.html';
        } else {
            window.location.href = 'login.html';
        }
    },
    
    logout: () => {
        Auth.clearAuth();
        window.location.href = '/';
    }
};

// Tab management utilities
const TabManager = {
    showTab: (tabName) => {
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        event.target.classList.add('active');
        const tabContent = document.getElementById(tabName);
        if (tabContent) {
            tabContent.classList.add('active');
        }
    }
};

// Initialize common functionality
document.addEventListener('DOMContentLoaded', function() {
    // Set up global error handling
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        // You can show a user-friendly error message here
    });
    
    // Set up loading effects for buttons
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.type === 'submit') {
                // Don't add loading effect for submit buttons - let form handlers manage it
                return;
            }
            
            if (this.href && !this.href.includes('#')) {
                e.preventDefault();
                
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
                this.disabled = true;
                
                setTimeout(() => {
                    window.location.href = this.href;
                }, 300);
            }
        });
    });
});

// Export for use in other files
window.Auth = Auth;
window.apiCall = apiCall;
window.AlertManager = AlertManager;
window.LoadingManager = LoadingManager;
window.FormUtils = FormUtils;
window.DateUtils = DateUtils;
window.CurrencyUtils = CurrencyUtils;
window.ValidationUtils = ValidationUtils;
window.NavigationUtils = NavigationUtils;
window.TabManager = TabManager;

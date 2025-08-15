// Authentication related functions

// Handle user registration
function handleRegister(formElement) {
    formElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const data = FormUtils.serialize(this);
        const registerBtn = document.getElementById('registerBtn');
        
        // Validate form
        if (!FormUtils.validate(this)) {
            AlertManager.show('alert', 'Please fill in all required fields correctly.', 'error');
            return;
        }
        
        // Additional validation
        
        if (!ValidationUtils.isValidEmail(data.email)) {
            AlertManager.show('alert', 'Please enter a valid email address.', 'error');
            return;
        }
        
        if (!ValidationUtils.isValidPassword(data.password)) {
            AlertManager.show('alert', 'Password must be at least 6 characters long.', 'error');
            return;
        }
        
        if (!ValidationUtils.isValidUsername(data.username)) {
            AlertManager.show('alert', 'Username must be at least 3 characters and contain only letters, numbers, and underscores.', 'error');
            return;
        }

        // Show loading
        registerBtn.disabled = true;
        LoadingManager.show('loading');
        AlertManager.hide('alert');

        try {
            const response = await apiCall('/api/register', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Success
                AlertManager.show('alert', 'Account created successfully! Redirecting to login...', 'success');
                FormUtils.reset(this);
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                // Error
                AlertManager.show('alert', result.error || 'Registration failed. Please try again.', 'error');
            }
        } catch (error) {
            AlertManager.show('alert', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            registerBtn.disabled = false;
            LoadingManager.hide('loading');
        }
    });
}

// Handle user login
function handleLogin(formElement) {
    formElement.addEventListener('submit', async function(e) {
        e.preventDefault();

        const data = FormUtils.serialize(this);
        const loginBtn = document.getElementById('loginBtn');

        // Show loading
        loginBtn.disabled = true;
        LoadingManager.show('loading');
        AlertManager.hide('alert');

        try {
            const response = await apiCall('/api/login', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                // Success - store token and redirect
                Auth.setAuth(result.token, result.role, result.userId, result.username);

                AlertManager.show('alert', 'Login successful! Redirecting...', 'success');

                setTimeout(() => {
                    if (result.role === 'landlord') {
                        window.location.href = 'landlord-dashboard.html';
                    } else if (result.role === 'tenant') {
                        window.location.href = 'tenant-dashboard.html';
                    }
                }, 1000);
            } else {
                // Error
                AlertManager.show('alert', result.error || 'Login failed. Please try again.', 'error');
            }
        } catch (error) {
            AlertManager.show('alert', 'Network error. Please check your connection and try again.', 'error');
        } finally {
            loginBtn.disabled = false;
            LoadingManager.hide('loading');
        }
    });
}

// Form field validation with visual feedback
function setupFormValidation() {
    // Username validation
    const usernameField = document.getElementById('username');
    if (usernameField) {
        usernameField.addEventListener('input', function() {
            if (ValidationUtils.isValidUsername(this.value)) {
                this.style.borderColor = '#28a745';
            } else {
                this.style.borderColor = '#dc3545';
            }
        });
    }

    // Email validation
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('input', function() {
            if (ValidationUtils.isValidEmail(this.value)) {
                this.style.borderColor = '#28a745';
            } else {
                this.style.borderColor = '#dc3545';
            }
        });
    }

    // Password validation
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            if (ValidationUtils.isValidPassword(this.value)) {
                this.style.borderColor = '#28a745';
            } else {
                this.style.borderColor = '#dc3545';
            }
        });
    }
}

// Initialize authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    // Setup form validation
    setupFormValidation();
    
    // Handle registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        handleRegister(registerForm);
    }
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        handleLogin(loginForm);
    }
});

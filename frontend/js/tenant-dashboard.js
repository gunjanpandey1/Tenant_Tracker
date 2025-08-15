// Tenant Dashboard JavaScript Functions

// Global variable to store tenant info
let currentTenantInfo = null;
let currentContactProperty = null; // Global variable to store current property for contact

// Load tenant dashboard data on page load
document.addEventListener('DOMContentLoaded', () => {
    loadTenantDashboard();
    loadAvailableProperties(); // Load properties with filters applied
    // Event listener for the property filter form
    const propertyFilterForm = document.getElementById('propertyFilterForm');
    if (propertyFilterForm) {
        propertyFilterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            loadAvailableProperties(); // Reload properties with new filters
        });
    }
});

// Load Tenant Dashboard (main property/payment info)
async function loadTenantDashboard() {
    const loadingElement = document.getElementById('initialLoading');
    const dashboardContent = document.getElementById('dashboardContent');
    const noPropertyMessage = document.getElementById('noPropertyMessage');
    
    try {
        // Fetch tenant information
        const response = await apiCall('/api/tenant-dashboard');
        const tenantInfo = await response.json();

        if (!response.ok || !tenantInfo || !tenantInfo.propertyId) {
            // If no property is assigned, hide dashboard content and show message
            loadingElement.style.display = 'none';
            dashboardContent.style.display = 'none';
            noPropertyMessage.style.display = 'block';
            return;
        }

        // Store tenant info globally
        currentTenantInfo = tenantInfo;
        
        // Populate property details
        populatePropertyDetails(tenantInfo);

        // Populate payment status
        populatePaymentStatus(tenantInfo);

        // Populate payment history
        await populatePaymentHistory(); // No need to pass tenantInfo, can use global or fetch again

        // Hide loading and show content
        loadingElement.style.display = 'none';
        dashboardContent.style.display = 'block';

    } catch (error) {
        console.error('Error loading tenant dashboard:', error);
        loadingElement.style.display = 'none';
        dashboardContent.style.display = 'none';
        noPropertyMessage.style.display = 'block'; // Show no property message on error too
    }
}

// Populate property details with new fields
function populatePropertyDetails(tenantInfo) {
    const propertyDetailsContainer = document.getElementById('propertyDetails');
    const property = tenantInfo.propertyId;

    propertyDetailsContainer.innerHTML = `
        <div class="detail-item">
            <h4>Address</h4>
            <p>${property.address}</p>
        </div>
        <div class="detail-item">
            <h4>Rent Amount</h4>
            <p>₹${property.rentAmount.toLocaleString()}</p>
        </div>
        <div class="detail-item">
            <h4>Type</h4>
            <p>${property.type || 'N/A'}</p>
        </div>
        <div class="detail-item">
            <h4>Bedrooms</h4>
            <p>${property.bedrooms !== undefined ? property.bedrooms : 'N/A'}</p>
        </div>
        <div class="detail-item">
            <h4>Bathrooms</h4>
            <p>${property.bathrooms !== undefined ? property.bathrooms : 'N/A'}</p>
        </div>
        <div class="detail-item">
            <h4>Area</h4>
            <p>${property.areaSqFt !== undefined ? property.areaSqFt.toLocaleString() + ' Sq.Ft.' : 'N/A'}</p>
        </div>
        <div class="detail-item">
            <h4>Due Date</h4>
            <p>${DateUtils.formatDate(tenantInfo.dueDate)}</p>
        </div>
        ${property.description ? `
            <div class="detail-item" style="grid-column: 1 / -1;">
                <h4>Description</h4>
                <p>${property.description}</p>
            </div>
        ` : ''}
    `;
}

// Populate payment status
function populatePaymentStatus(tenantInfo) {
    const paymentStatusContainer = document.getElementById('paymentStatus');

    let statusClass = '';
    let statusText = '';
    let actionNeeded = '';

    switch (tenantInfo.paymentStatus) {
        case 'pending':
            statusClass = 'due-soon';
            statusText = 'Rent is due soon.';
            actionNeeded = 'Please make your payment by the due date.';
            break;
        case 'paid':
            statusClass = 'paid';
            statusText = 'Payment pending verification.';
            actionNeeded = 'Your payment has been received and is awaiting landlord verification.';
            break;
        case 'verified':
            statusClass = 'paid';
            statusText = 'Rent payment is verified.';
            actionNeeded = 'Your rent for the current period has been verified. Thank you!';
            break;
        default:
            statusClass = 'overdue';
            statusText = 'Payment is overdue!';
            actionNeeded = 'Your rent payment is overdue. Please make the payment immediately.';
            break;
    }

    paymentStatusContainer.className = `status-card ${statusClass}`;
    paymentStatusContainer.innerHTML = `
        <h3>${statusText}</h3>
        <p>Current Status: <strong>${tenantInfo.paymentStatus.toUpperCase()}</strong></p>
        <p>${actionNeeded}</p>
        ${tenantInfo.lastPaymentDate ? `<p class="text-muted">Last payment: ${DateUtils.formatDate(tenantInfo.lastPaymentDate)}</p>` : ''}
    `;
    
    // Control visibility of QR generation and Mark Paid buttons
    const generateQRBtn = document.getElementById('generateQRBtn');
    const markPaidBtn = document.getElementById('markPaidBtn');
    if (tenantInfo.paymentStatus === 'verified' || tenantInfo.paymentStatus === 'paid') {
        generateQRBtn.style.display = 'none';
        markPaidBtn.style.display = 'none';
    } else {
        generateQRBtn.style.display = 'inline-block';
        markPaidBtn.style.display = 'inline-block';
    }
}

// Populate payment history
async function populatePaymentHistory() {
    const paymentHistoryContainer = document.getElementById('paymentHistory');
    paymentHistoryContainer.innerHTML = '<tr><td colspan="4" style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading history...</td></tr>';

    try {
        const response = await apiCall('/api/payment-history');
        const paymentHistory = await response.json();

        if (paymentHistory.length === 0) {
            paymentHistoryContainer.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: #666; padding: 20px;">
                        No payment history found.
                    </td>
                </tr>
            `;
        } else {
            paymentHistoryContainer.innerHTML = paymentHistory.map(payment => `
                <tr>
                    <td>${DateUtils.formatDate(payment.paymentDate)}</td>
                    <td>₹${payment.amount.toLocaleString()}</td>
                    <td>
                        <span class="status-badge status-${payment.status}">
                            ${payment.status}
                        </span>
                    </td>
                    <td>${payment.notes}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
        paymentHistoryContainer.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: #dc3545; padding: 20px;">
                    Error loading payment history.
                </td>
            </tr>
        `;
    }
}

// Generate QR Code for payment
async function generateQR() {
    if (!currentTenantInfo || !currentTenantInfo.propertyId) {
        AlertManager.show('paymentAlert', 'No assigned property to generate QR for.', 'error');
        return;
    }
    
    const qrContainer = document.getElementById('qrContainer');
    const paymentAmountElement = document.getElementById('paymentAmount');
    const qrImage = document.getElementById('qrCode');
    const generateQRBtn = document.getElementById('generateQRBtn');
    
    generateQRBtn.disabled = true;
    generateQRBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const response = await apiCall(`/api/generate-qr/${currentTenantInfo.propertyId._id}`);
        const { qrCode, amount } = await response.json();

        if (response.ok) {
            paymentAmountElement.innerText = `₹${amount.toLocaleString()}`;
            qrImage.src = qrCode;
            qrContainer.style.display = 'block';
            AlertManager.show('paymentAlert', 'QR code generated successfully. Scan to pay!', 'success');
        } else {
            AlertManager.show('paymentAlert', 'Failed to generate QR code. Please try again.', 'error');
            qrContainer.style.display = 'none';
        }
    } catch (error) {
        console.error('Error generating QR code:', error);
        AlertManager.show('paymentAlert', 'Network error. Please try again.', 'error');
        qrContainer.style.display = 'none';
    } finally {
        generateQRBtn.disabled = false;
        generateQRBtn.innerHTML = '<i class="fas fa-qrcode"></i> Generate QR Code';
    }
}

// Mark rent as paid
async function markAsPaid() {
    if (!currentTenantInfo) {
        AlertManager.show('paymentAlert', 'No assigned property to mark payment for.', 'error');
        return;
    }

    if (!confirm('Are you sure you want to mark your rent as paid? This action will be sent to your landlord for verification.')) {
        return;
    }

    const markPaidBtn = document.getElementById('markPaidBtn');
    markPaidBtn.disabled = true;
    markPaidBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Marking...';

    try {
        const response = await apiCall('/api/mark-paid', { method: 'POST' });

        if (response.ok) {
            AlertManager.show('paymentAlert', 'Payment marked as paid. Pending verification by landlord.', 'success');
            loadTenantDashboard(); // Refresh dashboard to update status
        } else {
            const result = await response.json();
            AlertManager.show('paymentAlert', result.error || 'Failed to mark payment as paid.', 'error');
        }
    } catch (error) {
        console.error('Error marking payment as paid:', error);
        AlertManager.show('paymentAlert', 'Network error. Please try again.', 'error');
    } finally {
        markPaidBtn.disabled = false;
        markPaidBtn.innerHTML = '<i class="fas fa-check"></i> I Have Paid';
    }
}

// Load available properties for search (with filters)
async function loadAvailableProperties() {
    LoadingManager.show('propertiesSearchLoading');
    
    try {
        const location = document.getElementById('searchLocation').value;
        const type = document.getElementById('searchType').value;
        const minRent = document.getElementById('searchMinRent').value;
        const maxRent = document.getElementById('searchMaxRent').value;
        const bedrooms = document.getElementById('searchBedrooms').value;
        const bathrooms = document.getElementById('searchBathrooms').value;

        // Construct query parameters
        const queryParams = new URLSearchParams();
        if (location) queryParams.append('location', location);
        if (type) queryParams.append('type', type);
        if (minRent) queryParams.append('minRent', minRent);
        if (maxRent) queryParams.append('maxRent', maxRent);
        if (bedrooms) queryParams.append('bedrooms', bedrooms);
        if (bathrooms) queryParams.append('bathrooms', bathrooms);

        const url = `/api/available-properties?${queryParams.toString()}`;

        const response = await apiCall(url);
        const properties = await response.json();

        const grid = document.getElementById('availablePropertiesGrid');
        
        if (properties.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No available properties found matching your criteria.</p>';
        } else {
            grid.innerHTML = properties.map(property => `
                <div class="property-search-card">
                    <h4><i class="fas fa-map-marker-alt"></i> ${property.address}</h4>
                    <div class="property-search-info">
                        <div><span>Monthly Rent:</span><strong>₹${property.rentAmount.toLocaleString()}</strong></div>
                        <div><span>Type:</span><strong>${property.type || 'N/A'}</strong></div>
                        <div><span>Bedrooms:</span><strong>${property.bedrooms !== undefined ? property.bedrooms : 'N/A'}</strong></div>
                        <div><span>Bathrooms:</span><strong>${property.bathrooms !== undefined ? property.bathrooms : 'N/A'}</strong></div>
                        <div><span>Area:</span><strong>${property.areaSqFt !== undefined ? property.areaSqFt.toLocaleString() + ' Sq.Ft.' : 'N/A'}</strong></div>
                        <div><span>Landlord:</span><strong>${property.landlordId.username}</strong></div>
                    </div>
                    ${property.description ? `<p class="text-muted" style="margin-top:10px;">${property.description}</p>` : ''}
                    <div style="margin-top: 15px;">
                        <button class="contact-btn" onclick="openContactModal('${property._id}', '${property.address}', '${property.landlordId.username}')">
                            <i class="fas fa-envelope"></i> Contact Landlord
                        </button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading available properties:', error);
        const grid = document.getElementById('availablePropertiesGrid');
        grid.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading properties. Please try again.</p>';
    } finally {
        LoadingManager.hide('propertiesSearchLoading');
    }
}

// Reset property search filters
function resetPropertyFilters() {
    document.getElementById('searchLocation').value = '';
    document.getElementById('searchType').value = '';
    document.getElementById('searchMinRent').value = '';
    document.getElementById('searchMaxRent').value = '';
    document.getElementById('searchBedrooms').value = '';
    document.getElementById('searchBathrooms').value = '';
    loadAvailableProperties(); // Reload properties without filters
}

// Open contact modal
function openContactModal(propertyId, address, landlordName) {
    currentContactProperty = { id: propertyId, address, landlordName };
    document.getElementById('contactModal').style.display = 'flex';
    document.getElementById('contactMessage').value = `Hi ${landlordName}! I'm interested in renting your property at ${address}. Could you please provide more details?`;
    AlertManager.hide('contactAlert'); // Hide any previous alerts
}

// Close contact modal
function closeContactModal() {
    document.getElementById('contactModal').style.display = 'none';
    document.getElementById('contactMessage').value = '';
    currentContactProperty = null;
    AlertManager.hide('contactAlert');
}

// Handle contact form submission
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!currentContactProperty) {
                AlertManager.show('contactAlert', 'Please select a property first.', 'error');
                return;
            }
            
            const message = document.getElementById('contactMessage').value;
            const sendBtn = document.getElementById('sendContactBtn');
            
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            try {
                const response = await apiCall('/api/contact-landlord', {
                    method: 'POST',
                    body: JSON.stringify({
                        propertyId: currentContactProperty.id,
                        message: message
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    AlertManager.show('contactAlert', 
                        `Message sent successfully! Landlord contact: ${result.landlord.email}`, 
                        'success'
                    );
                    
                    setTimeout(() => {
                        closeContactModal();
                    }, 3000);
                } else {
                    AlertManager.show('contactAlert', result.error || 'Failed to send message.', 'error');
                }
            } catch (error) {
                console.error('Error sending contact message:', error);
                AlertManager.show('contactAlert', 'Network error. Please try again.', 'error');
            } finally {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            }
        });
    }
});


// --- NEW AGREEMENT MANAGEMENT FUNCTIONS FOR TENANT ---

// Load agreements for the tenant
async function loadTenantAgreements() {
    document.getElementById('agreementsList').style.display = 'block'; // Show the container
    const container = document.getElementById('agreementsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading agreements...</div>';
    
    try {
        const response = await apiCall('/api/agreements');
        const agreements = await response.json();
        
        if (agreements.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No agreements found. Your landlord might create one for you soon!</p>';
            return;
        }
        
        container.innerHTML = agreements.map(agreement => `
            <div class="agreement-card" style="border-left: 4px solid ${getTenantStatusColor(agreement.status)};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #333;">Agreement ID: ${agreement.agreementId}</h4>
                    <span class="status-badge" style="background: ${getTenantStatusColor(agreement.status)};">
                        ${agreement.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </div>
                <div class="info-grid">
                    <div><strong>Landlord:</strong> ${agreement.landlordId ? agreement.landlordId.username : 'N/A'}</div>
                    <div><strong>Property:</strong> ${agreement.propertyId ? agreement.propertyId.address : 'N/A'}</div>
                    <div><strong>Type:</strong> ${agreement.propertyId ? agreement.propertyId.type : 'N/A'}</div>
                    <div><strong>Bedrooms:</strong> ${agreement.propertyId ? agreement.propertyId.bedrooms : 'N/A'}</div>
                    <div><strong>Bathrooms:</strong> ${agreement.propertyId ? agreement.propertyId.bathrooms : 'N/A'}</div>
                    <div><strong>Area:</strong> ${agreement.propertyId ? agreement.propertyId.areaSqFt.toLocaleString() + ' Sq.Ft.' : 'N/A'}</div>
                    <div><strong>Rent:</strong> ₹${agreement.rentAmount.toLocaleString()}</div>
                    <div><strong>Security Deposit:</strong> ₹${agreement.securityDeposit.toLocaleString()}</div>
                    <div><strong>Duration:</strong> ${agreement.leaseDuration} months</div>
                    <div><strong>Start Date:</strong> ${DateUtils.formatDate(agreement.startDate)}</div>
                    <div><strong>End Date:</strong> ${DateUtils.formatDate(agreement.endDate)}</div>
                </div>
                ${agreement.terms ? `<div style="margin-bottom: 15px;"><strong>Terms:</strong> ${agreement.terms}</div>` : ''}
                <div style="margin-top: 15px; display: flex; align-items: center; gap: 20px;">
                    <div><strong>Tenant Signed:</strong> ${agreement.tenantSignature.signed ? '✅ Yes' : '❌ No'}</div>
                    <div><strong>Landlord Signed:</strong> ${agreement.landlordSignature.signed ? '✅ Yes' : '❌ No'}</div>
                    ${agreement.status === 'pending_tenant_signature' && !agreement.tenantSignature.signed ? 
                        `<button class="btn btn-success" onclick="signTenantAgreement('${agreement.agreementId}')">
                            <i class="fas fa-pen"></i> Sign Agreement
                        </button>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading tenant agreements:', error);
        document.getElementById('agreementsContainer').innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading agreements. Please try again.</p>';
    }
}

// Get status color for agreement status (Tenant perspective)
function getTenantStatusColor(status) {
    switch (status) {
        case 'pending_tenant_signature': return '#ffc107'; // Tenant needs to sign
        case 'pending_landlord_signature': return '#17a2b8'; // Landlord needs to sign (tenant's view)
        case 'signed': return '#28a745'; // Both signed
        case 'draft': return '#6c757d'; // Still in draft
        case 'cancelled': return '#dc3545'; // Agreement cancelled
        default: return '#6c757d'; // Default grey for unknown status
    }
}

// Sign agreement (Tenant side)
async function signTenantAgreement(agreementId) {
    if (!confirm('Are you sure you want to sign this agreement? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await apiCall(`/api/sign-agreement/${agreementId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            AlertManager.show('tenantAgreementAlert', 'Agreement signed successfully!', 'success');
            loadTenantAgreements(); // Refresh the agreements list
        } else {
            const result = await response.json();
            AlertManager.show('tenantAgreementAlert', result.error || 'Failed to sign agreement.', 'error');
        }
    } catch (error) {
        console.error('Error signing agreement:', error);
        AlertManager.show('tenantAgreementAlert', 'Network error. Please try again.', 'error');
    }
}
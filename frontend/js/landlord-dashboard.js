// Landlord Dashboard JavaScript Functions

// Load statistics
async function loadStats() {
    try {
        const [propertiesRes, paymentsRes, agreementsRes] = await Promise.all([
            apiCall('/api/properties'),
            apiCall('/api/tenant-payments'),
            apiCall('/api/agreements') // Fetch agreements for stats
        ]);

        const properties = await propertiesRes.json();
        const payments = await paymentsRes.json();
        const agreements = await agreementsRes.json(); // Get agreements

        const totalProperties = properties.length;
        const occupiedProperties = properties.filter(p => p.tenantId).length;
        const pendingPayments = payments.filter(p => p.paymentStatus === 'pending').length;
        const verifiedPayments = payments.filter(p => p.paymentStatus === 'verified').length;
        const pendingLandlordSignatures = agreements.filter(a => a.status === 'pending_landlord_signature').length;


        const statsGrid = document.getElementById('statsGrid');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <i class="fas fa-building"></i>
                <h3>${totalProperties}</h3>
                <p>Total Properties</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-home"></i>
                <h3>${occupiedProperties}</h3>
                <p>Occupied Properties</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-exclamation-circle"></i>
                <h3>${pendingPayments}</h3>
                <p>Pending Payments</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-check-circle"></i>
                <h3>${verifiedPayments}</h3>
                <p>Verified Payments</p>
            </div>
            <div class="stat-card">
                <i class="fas fa-file-signature"></i>
                <h3>${pendingLandlordSignatures}</h3>
                <p>Agreements to Sign</p>
            </div>
        `;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Property management
document.addEventListener('DOMContentLoaded', function() {
    const propertyForm = document.getElementById('propertyForm');
    if (propertyForm) {
        propertyForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = FormUtils.serialize(this);
            // Ensure numeric fields are parsed correctly
            data.rentAmount = parseFloat(data.rentAmount);
            data.bedrooms = parseInt(data.bedrooms); 
            data.bathrooms = parseInt(data.bathrooms);
            data.areaSqFt = parseInt(data.areaSqFt);

            try {
                const response = await apiCall('/api/properties', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    AlertManager.show('propertyAlert', 'Property added successfully!', 'success');
                    FormUtils.reset(this);
                    loadProperties();
                    loadStats();
                } else {
                    AlertManager.show('propertyAlert', result.error || 'Failed to add property', 'error');
                }
            } catch (error) {
                AlertManager.show('propertyAlert', 'Network error. Please try again.', 'error');
            }
        });
    }
});

async function loadProperties() {
    LoadingManager.show('propertiesLoading');
    
    try {
        const response = await apiCall('/api/properties');
        const properties = await response.json();

        const grid = document.getElementById('propertiesGrid');
        if (properties.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No properties added yet. Use the form above to add your first property.</p>';
        } else {
            grid.innerHTML = properties.map(property => `
                <div class="property-card">
                    <h3><i class="fas fa-map-marker-alt"></i> ${property.address}</h3>
                    <div class="property-info">
                        <span>Monthly Rent:</span>
                        <strong>₹${property.rentAmount.toLocaleString()}</strong>
                    </div>
                    <div class="property-info">
                        <span>Type:</span>
                        <strong>${property.type || 'N/A'}</strong>
                    </div>
                    <div class="property-info">
                        <span>Bedrooms:</span>
                        <strong>${property.bedrooms !== undefined ? property.bedrooms : 'N/A'}</strong>
                    </div>
                    <div class="property-info">
                        <span>Bathrooms:</span>
                        <strong>${property.bathrooms !== undefined ? property.bathrooms : 'N/A'}</strong>
                    </div>
                    <div class="property-info">
                        <span>Area:</span>
                        <strong>${property.areaSqFt !== undefined ? property.areaSqFt.toLocaleString() + ' Sq.Ft.' : 'N/A'}</strong>
                    </div>
                    ${property.description ? `
                        <div class="property-info">
                            <span>Description:</span>
                            <strong>${property.description}</strong>
                        </div>
                    ` : ''}
                    <div class="property-info">
                        <span>Status:</span>
                        <strong>${property.tenantId ? 'Occupied' : 'Vacant'}</strong>
                    </div>
                    ${property.tenantId ? `
                        <div class="property-info">
                            <span>Tenant:</span>
                            <strong>${property.tenantId.username}</strong>
                        </div>
                    ` : ''}
                    <div class="property-actions" style="margin-top: 15px; display: flex; gap: 10px; justify-content: center;">
                        ${property.tenantId ? 
                            `<button class="btn btn-warning" onclick="removeTenant('${property._id}', '${property.tenantId._id}')">
                                <i class="fas fa-user-minus"></i> Remove Tenant
                            </button>` : 
                            `<button class="btn btn-danger" onclick="deleteProperty('${property._id}')">
                                <i class="fas fa-trash"></i> Delete Property
                            </button>`
                        }
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading properties:', error);
        grid.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading properties. Please try again.</p>';
    } finally {
        LoadingManager.hide('propertiesLoading');
    }
}

async function loadPropertiesForAssignment() {
    try {
        const response = await apiCall('/api/properties');
        const properties = await response.json();

        const select = document.getElementById('propertySelect');
        select.innerHTML = '<option value="">Select a property</option>' +
            properties.filter(p => !p.tenantId).map(property => 
                `<option value="${property._id}">${property.address} - ₹${property.rentAmount}</option>`
            ).join('');
    } catch (error) {
        console.error('Error loading properties for assignment:', error);
    }
}

// Updated loadTenants function to fetch only unassigned tenants
async function loadTenants() {
    try {
        // Change the API endpoint to fetch only unassigned tenants
        const response = await apiCall('/api/unassigned-tenants');
        const tenants = await response.json();

        const select = document.getElementById('tenantSelect');
        // Always include a default option
        select.innerHTML = '<option value="">Select a tenant</option>'; 
        
        // Populate the dropdown with unassigned tenants
        tenants.map(tenant => 
            `<option value="${tenant._id}">${tenant.username} (${tenant.email})</option>`
        ).forEach(optionHtml => select.insertAdjacentHTML('beforeend', optionHtml));
    } catch (error) {
        console.error('Error loading unassigned tenants:', error);
        // Optionally, show an alert to the user
        AlertManager.show('assignAlert', 'Error loading tenants for assignment. Please try again.', 'error');
    }
}

// Tenant assignment
document.addEventListener('DOMContentLoaded', function() {
    const assignForm = document.getElementById('assignForm');
    if (assignForm) {
        assignForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = FormUtils.serialize(this);

            try {
                const response = await apiCall('/api/assign-tenant', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    AlertManager.show('assignAlert', 'Tenant assigned successfully!', 'success');
                    FormUtils.reset(this);
                    loadPropertiesForAssignment(); // Refresh properties for assignment
                    loadTenants(); // Refresh unassigned tenants list
                    loadStats(); // Update dashboard stats
                } else {
                    AlertManager.show('assignAlert', result.error || 'Failed to assign tenant', 'error');
                }
            } catch (error) {
                AlertManager.show('assignAlert', 'Network error. Please try again.', 'error');
            }
        });
    }
});

async function loadPayments() {
    LoadingManager.show('paymentsLoading');
    
    try {
        const response = await apiCall('/api/tenant-payments');
        const payments = await response.json();

        const tbody = document.getElementById('paymentsTableBody');
        if (payments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #666; padding: 20px;">
                        No tenant payments to display yet.
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = payments.map(payment => `
                <tr>
                    <td>${payment.tenantId.username}</td>
                    <td>${payment.propertyId.address}</td>
                    <td>₹${payment.propertyId.rentAmount.toLocaleString()}</td>
                    <td>${DateUtils.formatDate(payment.dueDate)}</td>
                    <td>
                        <span class="status-badge status-${payment.paymentStatus}">
                            ${payment.paymentStatus}
                        </span>
                    </td>
                    <td>
                        ${payment.paymentStatus === 'paid' ? 
                            `<button class="btn btn-success" onclick="verifyPayment('${payment._id}')">
                                <i class="fas fa-check"></i> Verify
                            </button>` : 
                            '-'
                        }
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        document.getElementById('paymentsTableBody').innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #dc3545; padding: 20px;">
                    Error loading payments. Please try again.
                </td>
            </tr>
        `;
    } finally {
        LoadingManager.hide('paymentsLoading');
    }
}

async function verifyPayment(tenantInfoId) {
    try {
        const response = await apiCall('/api/verify-payment', {
            method: 'POST',
            body: JSON.stringify({ tenantInfoId })
        });

        if (response.ok) {
            loadPayments();
            loadStats();
            AlertManager.show('paymentsAlert', 'Payment verified successfully!', 'success'); 
        } else {
            const result = await response.json();
            AlertManager.show('paymentsAlert', result.error || 'Failed to verify payment', 'error');
        }
    } catch (error) {
        AlertManager.show('paymentsAlert', 'Network error. Please try again.', 'error');
    }
}


// --- AGREEMENT MANAGEMENT FUNCTIONS FOR LANDLORD ---

// Load agreements for the landlord
async function loadLandlordAgreements() {
    LoadingManager.show('agreementsLoading'); // Show loading spinner for agreements
    
    try {
        const container = document.getElementById('landlordAgreementsContainer');
        container.innerHTML = ''; // Clear previous content

        const response = await apiCall('/api/agreements');
        const agreements = await response.json();
        
        if (agreements.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No agreements found.</p>';
            return;
        }
        
        container.innerHTML = agreements.map(agreement => `
            <div class="agreement-card" style="border-left: 4px solid ${getLandlordStatusColor(agreement.status)};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #333;">Agreement ID: ${agreement.agreementId}</h4>
                    <span class="status-badge" style="background: ${getLandlordStatusColor(agreement.status)};">
                        ${agreement.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </div>
                <div class="info-grid">
                    <div><strong>Tenant:</strong> ${agreement.tenantId ? agreement.tenantId.username : 'N/A'}</div>
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
                    ${agreement.status === 'pending_landlord_signature' && !agreement.landlordSignature.signed ? 
                        `<button class="btn btn-success" onclick="signLandlordAgreement('${agreement.agreementId}')">
                            <i class="fas fa-pen"></i> Sign Agreement
                        </button>` : 
                        ''
                    }
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading landlord agreements:', error);
        document.getElementById('landlordAgreementsContainer').innerHTML = '<p style="text-align: center; color: #dc3545; padding: 20px;">Error loading agreements. Please try again.</p>';
    } finally {
        LoadingManager.hide('agreementsLoading'); // Hide loading spinner
    }
}

// Get status color for agreement status (Landlord perspective)
function getLandlordStatusColor(status) {
    switch (status) {
        case 'pending_tenant_signature': return '#ffc107'; // Tenant needs to sign
        case 'pending_landlord_signature': return '#17a2b8'; // Landlord needs to sign
        case 'signed': return '#28a745'; // Both signed
        case 'draft': return '#6c757d'; // Still in draft
        case 'cancelled': return '#dc3545'; // Agreement cancelled
        default: return '#6c757d'; // Default grey for unknown status
    }
}

// Sign agreement (Landlord side)
async function signLandlordAgreement(agreementId) {
    if (!confirm('Are you sure you want to sign this agreement? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await apiCall(`/api/sign-agreement/${agreementId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            AlertManager.show('landlordAgreementAlert', 'Agreement signed successfully!', 'success');
            loadLandlordAgreements(); // Refresh the agreements list
            loadStats(); // Update stats
        } else {
            const result = await response.json();
            AlertManager.show('landlordAgreementAlert', result.error || 'Failed to sign agreement.', 'error');
        }
    } catch (error) {
        console.error('Error signing agreement:', error);
        AlertManager.show('landlordAgreementAlert', 'Network error. Please try again.', 'error');
    }
}

// Load properties for landlord's agreement creation form
async function loadPropertiesForAgreementCreation() {
    try {
        const response = await apiCall('/api/properties'); // Landlords create agreements for their own properties
        const properties = await response.json();
        
        const select = document.getElementById('newAgreementPropertyId');
        select.innerHTML = '<option value="">Select Property</option>';
        
        properties.forEach(property => {
            const option = document.createElement('option');
            option.value = property._id;
            option.textContent = `${property.address} (${property.type}) - ₹${property.rentAmount.toLocaleString()}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading properties for agreement creation:', error);
        AlertManager.show('createAgreementAlert', 'Error loading properties. Please try again.', 'error');
    }
}

// Load tenants for landlord's agreement creation form
async function loadTenantsForAgreementCreation() {
    try {
        // Fetch ALL tenants, not just unassigned, as a landlord might create an agreement for an already assigned tenant
        // (e.g., renewing an agreement or a new agreement for the same tenant on a different property if that's allowed later)
        const response = await apiCall('/api/tenants'); // Use the general /api/tenants route
        const tenants = await response.json();
        
        const select = document.getElementById('newAgreementTenantId');
        select.innerHTML = '<option value="">Select Tenant</option>';
        
        tenants.forEach(tenant => {
            const option = document.createElement('option');
            option.value = tenant._id;
            option.textContent = `${tenant.username} (${tenant.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tenants for agreement creation:', error);
        AlertManager.show('createAgreementAlert', 'Error loading tenants. Please try again.', 'error');
    }
}

// Delete property function
async function deleteProperty(propertyId) {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.\n\nNote: You can only delete properties with no tenant assigned and no existing agreements.')) {
        return;
    }

    try {
        const response = await apiCall(`/api/properties/${propertyId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            AlertManager.show('propertyAlert', 'Property deleted successfully!', 'success');
            loadProperties(); // Refresh the properties list
            loadStats(); // Update stats
            loadPropertiesForAssignment(); // Refresh assignment dropdown
        } else {
            const result = await response.json();
            AlertManager.show('propertyAlert', result.error || 'Failed to delete property.', 'error');
        }
    } catch (error) {
        console.error('Error deleting property:', error);
        AlertManager.show('propertyAlert', 'Network error. Please try again.', 'error');
    }
}

// Remove tenant from property function
async function removeTenant(propertyId, tenantId) {
    if (!confirm('Are you sure you want to remove this tenant from the property?\n\nThis will:\n- Make the property available for new tenants\n- Remove the tenant\'s current assignment\n- Cancel any active rental agreements\n\nThis action cannot be undone.')) {
        return;
    }

    try {
        const response = await apiCall('/api/remove-tenant', {
            method: 'POST',
            body: JSON.stringify({ propertyId, tenantId })
        });

        if (response.ok) {
            const result = await response.json();
            AlertManager.show('propertyAlert', result.message || 'Tenant removed successfully!', 'success');
            loadProperties(); // Refresh the properties list
            loadStats(); // Update stats
            loadPropertiesForAssignment(); // Refresh assignment dropdown
            loadTenants(); // Refresh unassigned tenants list
            loadPayments(); // Refresh payments since tenant info changed
        } else {
            const result = await response.json();
            AlertManager.show('propertyAlert', result.error || 'Failed to remove tenant.', 'error');
        }
    } catch (error) {
        console.error('Error removing tenant:', error);
        AlertManager.show('propertyAlert', 'Network error. Please try again.', 'error');
    }
}

// Handle landlord's agreement creation form submission
document.addEventListener('DOMContentLoaded', function() {
    const newAgreementForm = document.getElementById('newAgreementForm');
    if (newAgreementForm) {
        newAgreementForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = FormUtils.serialize(this);
            // Ensure numeric fields are parsed correctly
            formData.rentAmount = parseFloat(formData.rentAmount);
            formData.securityDeposit = parseFloat(formData.securityDeposit);
            formData.leaseDuration = parseInt(formData.leaseDuration);
            
            try {
                const response = await apiCall('/api/create-agreement', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                
                const result = await response.json();

                if (response.ok) {
                    AlertManager.show('createAgreementAlert', 'Agreement created successfully! Tenant needs to sign.', 'success');
                    FormUtils.reset(this);
                    loadLandlordAgreements(); // Refresh the agreements list
                    loadStats(); // Update stats
                } else {
                    AlertManager.show('createAgreementAlert', result.error || 'Failed to create agreement.', 'error');
                }
            } catch (error) {
                console.error('Error creating agreement:', error);
                AlertManager.show('createAgreementAlert', 'Network error. Please try again.', 'error');
            }
        });
    }
});
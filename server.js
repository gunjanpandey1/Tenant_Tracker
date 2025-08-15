// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const qr = require('qrcode');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Middleware
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(express.json()); // Parses incoming requests with JSON payloads
app.use(express.urlencoded({ extended: true })); // Parses incoming requests with URL-encoded payloads
app.use(express.static('frontend')); // Serves static files from the 'frontend' directory

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-tracker';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas ---

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['landlord', 'tenant'], required: true },
    createdAt: { type: Date, default: Date.now }
});

// Property Schema
const propertySchema = new mongoose.Schema({
    address: { type: String, required: true },
    rentAmount: { type: Number, required: true },
    type: {
        type: String,
        enum: ['1BHK', '2BHK', '3BHK', 'Studio', 'Penthouse', 'Villa', 'Other', 'Commercial'],
        required: true
    },
    bedrooms: { type: Number, min: 0, default: 0 }, // Added number of bedrooms
    bathrooms: { type: Number, min: 0, default: 0 }, // Added number of bathrooms
    areaSqFt: { type: Number, min: 0, default: 0 }, // Added area in square feet
    description: { type: String, default: '' }, // Added property description
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // tenantId can be null if vacant
    createdAt: { type: Date, default: Date.now }
});

// Tenant Info Schema (Links a tenant to their currently assigned property)
const tenantInfoSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, // Tenant can only have one active TenantInfo
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'verified'], 
        default: 'pending' 
    },
    lastPaymentDate: { type: Date, default: null },
    dueDate: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Payment History Schema
const paymentHistorySchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    status: { 
        type: String, 
        enum: ['paid', 'verified'], 
        default: 'paid' 
    },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

// Rental Agreement Schema
const rentalAgreementSchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    agreementId: { type: String, required: true, unique: true },
    rentAmount: { type: Number, required: true },
    securityDeposit: { type: Number, required: true },
    leaseDuration: { type: Number, required: true }, // in months
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    terms: { type: String, required: true },
    status: {
        type: String,
        enum: ['draft', 'pending_tenant_signature', 'pending_landlord_signature', 'signed', 'cancelled'],
        default: 'draft'
    },
    tenantSignature: {
        signed: { type: Boolean, default: false },
        signedAt: { type: Date },
        ipAddress: { type: String }
    },
    landlordSignature: {
        signed: { type: Boolean, default: false },
        signedAt: { type: Date },
        ipAddress: { type: String }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

// --- Mongoose Models ---
const User = mongoose.model('User', userSchema);
const Property = mongoose.model('Property', propertySchema);
const TenantInfo = mongoose.model('TenantInfo', tenantInfoSchema);
const PaymentHistory = mongoose.model('PaymentHistory', paymentHistorySchema);
const RentalAgreement = mongoose.model('RentalAgreement', rentalAgreementSchema);

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token is invalid or expired
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user; // Attach user payload (userId, role) to the request
        next();
    });
};

// --- Frontend Page Routes ---
// Serves static HTML pages for direct URL access
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'html', 'index.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'html', 'login.html'));
});

app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'html', 'register.html'));
});

app.get('/landlord-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'html', 'landlord-dashboard.html'));
});

app.get('/tenant-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'html', 'tenant-dashboard.html'));
});

// // Optional: Serve without .html extension for cleaner URLs
// app.get('/login', (req, res) => {
//     res.sendFile(path.join(__dirname, 'frontend', 'html', 'login.html'));
// });

// app.get('/register', (req, res) => {
//     res.sendFile(path.join(__dirname, 'frontend', 'html', 'register.html'));
// });

// app.get('/landlord-dashboard', (req, res) => {
//     res.sendFile(path.join(__dirname, 'frontend', 'html', 'landlord-dashboard.html'));
// });

// app.get('/tenant-dashboard', (req, res) => {
//     res.sendFile(path.join(__dirname, 'frontend', 'html', 'tenant-dashboard.html'));
// });

// --- API Routes ---

// User Registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user with given email or username already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or username already exists.' });
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = new User({
            username,
            email,
            password: hashedPassword,
            role
        });
        await user.save();

        res.status(201).json({ message: 'User created successfully!' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration. Please try again.' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        // Compare provided password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid username or password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' } // Token expires in 24 hours
        );

        res.json({ 
            token, 
            role: user.role, 
            userId: user._id,
            username: user.username
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login. Please try again.' });
    }
});

// Add new property (Landlord only)
app.post('/api/properties', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can add properties.' });
        }

        const { address, rentAmount, type, bedrooms, bathrooms, areaSqFt, description } = req.body;

        // Basic server-side validation for new property fields
        if (!address || !rentAmount || !type || bedrooms === undefined || bathrooms === undefined || areaSqFt === undefined) {
            return res.status(400).json({ error: 'Missing required property fields.' });
        }
        if (typeof rentAmount !== 'number' || rentAmount <= 0) {
            return res.status(400).json({ error: 'Rent amount must be a positive number.' });
        }
        if (!['1BHK', '2BHK', '3BHK', 'Studio', 'Penthouse', 'Villa', 'Other', 'Commercial'].includes(type)) {
            return res.status(400).json({ error: 'Invalid property type provided.' });
        }
        if (typeof bedrooms !== 'number' || bedrooms < 0 || typeof bathrooms !== 'number' || bathrooms < 0 || typeof areaSqFt !== 'number' || areaSqFt < 0) {
             return res.status(400).json({ error: 'Bedrooms, bathrooms, and area must be non-negative numbers.' });
        }

        const property = new Property({
            address,
            rentAmount,
            type,
            bedrooms,
            bathrooms,
            areaSqFt,
            description,
            landlordId: req.user.userId
        });
        await property.save();

        res.status(201).json({ message: 'Property added successfully!', property });
    } catch (error) {
        console.error('Error adding property:', error);
        res.status(500).json({ error: 'Server error adding property. Please try again.' });
    }
});

// Get landlord's properties (Landlord only)
app.get('/api/properties', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can view their properties.' });
        }

        // Find properties belonging to the logged-in landlord
        const properties = await Property.find({ landlordId: req.user.userId })
            .populate('tenantId', 'username email'); // Populate tenant details if property is occupied

        res.json(properties);
    } catch (error) {
        console.error('Error fetching landlord properties:', error);
        res.status(500).json({ error: 'Server error fetching properties. Please try again.' });
    }
});

// Get all tenants (Landlord only, for general tenant list, now replaced by unassigned-tenants for assignment)
// This route might still be useful for a general "all tenants" list if needed elsewhere.
app.get('/api/tenants', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can view all tenants.' });
        }
        const tenants = await User.find({ role: 'tenant' }, 'username email');
        res.json(tenants);
    } catch (error) {
        console.error('Error fetching all tenants:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get unassigned tenants (Landlord only, for assignment dropdown)
app.get('/api/unassigned-tenants', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Find all tenantIds that exist in the TenantInfo collection (i.e., are already assigned)
        const assignedTenantIds = await TenantInfo.find().distinct('tenantId');

        // Find users with role 'tenant' whose _id is NOT in the assignedTenantIds list
        const unassignedTenants = await User.find(
            { role: 'tenant', _id: { $nin: assignedTenantIds } },
            'username email' // Select username and email fields
        );
        
        res.json(unassignedTenants);
    } catch (error) {
        console.error('Error fetching unassigned tenants:', error);
        res.status(500).json({ error: 'Server error fetching unassigned tenants. Please try again.' });
    }
});

// Get available properties for tenants to browse (with optional filters)
app.get('/api/available-properties', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Access denied. Only tenants can browse properties.' });
        }

        let query = { tenantId: null }; // Only show properties that are currently vacant

        const { location, type, minRent, maxRent, bedrooms, bathrooms } = req.query;

        // Filter by location (address contains substring, case-insensitive)
        if (location) {
            query.address = { $regex: location, $options: 'i' };
        }
        // Filter by property type
        if (type && ['1BHK', '2BHK', '3BHK', 'Studio', 'Penthouse', 'Villa', 'Other', 'Commercial'].includes(type)) {
            query.type = type;
        }
        // Filter by rent range
        if (minRent) {
            query.rentAmount = { ...query.rentAmount, $gte: parseFloat(minRent) };
        }
        if (maxRent) {
            query.rentAmount = { ...query.rentAmount, $lte: parseFloat(maxRent) };
        }
        // Filter by minimum bedrooms
        if (bedrooms) {
            query.bedrooms = { $gte: parseInt(bedrooms) };
        }
        // Filter by minimum bathrooms
        if (bathrooms) {
            query.bathrooms = { $gte: parseInt(bathrooms) };
        }

        const properties = await Property.find(query)
            .populate('landlordId', 'username email'); // Populate landlord details for contact

        res.json(properties);
    } catch (error) {
        console.error('Error getting available properties:', error);
        res.status(500).json({ error: 'Server error fetching available properties. Please try again.' });
    }
});

// Send contact request to landlord from tenant (Tenant only)
app.post('/api/contact-landlord', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Access denied. Only tenants can send contact requests.' });
        }

        const { propertyId, message } = req.body;
        
        const property = await Property.findById(propertyId).populate('landlordId', 'username email');
        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        
        const tenant = await User.findById(req.user.userId, 'username email');
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found.' }); // Should not happen with valid token
        }
        
        // In a real application, this would trigger an email or notification to the landlord.
        // For this project, we return the contact info as a simulated "sent" confirmation.
        res.json({ 
            message: 'Contact request sent successfully!',
            landlord: { username: property.landlordId.username, email: property.landlordId.email },
            tenant: { username: tenant.username, email: tenant.email },
            property: { address: property.address, rent: property.rentAmount },
            contactMessage: message
        });
    } catch (error) {
        console.error('Error sending contact message:', error);
        res.status(500).json({ error: 'Server error sending contact request. Please try again.' });
    }
});

// Assign tenant to property (Landlord only)
app.post('/api/assign-tenant', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can assign tenants.' });
        }

        const { propertyId, tenantId } = req.body;

        // Validate inputs
        if (!propertyId || !tenantId) {
            return res.status(400).json({ error: 'Property ID and Tenant ID are required.' });
        }

        // 1. Check if the property exists and if it's already occupied by a different tenant
        const existingProperty = await Property.findById(propertyId);
        if (!existingProperty) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        if (existingProperty.tenantId && existingProperty.tenantId.toString() !== tenantId) {
            return res.status(400).json({ error: 'This property is already occupied by another tenant.' });
        }
        // If property is already assigned to this specific tenant, it's an idempotent operation
        if (existingProperty.tenantId && existingProperty.tenantId.toString() === tenantId) {
            return res.status(200).json({ message: 'Tenant is already assigned to this property.' });
        }

        // 2. Check if the tenant is already assigned to ANY property
        const existingTenantInfo = await TenantInfo.findOne({ tenantId: tenantId });
        if (existingTenantInfo) {
            return res.status(400).json({ error: 'This tenant is already assigned to a property. A tenant can only be assigned to one property at a time.' });
        }

        // Update the Property document to link the tenant
        const property = await Property.findByIdAndUpdate(
            propertyId,
            { tenantId }, // Set the tenantId on the property document
            { new: true } // Return the updated document
        );

        // This check is mostly redundant now due to prior checks, but keeps a safety net.
        if (!property) {
            return res.status(404).json({ error: 'Property not found after update attempt.' });
        }

        // Create a new TenantInfo record for the assignment
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1); // Set to next month
        dueDate.setDate(1); // Set to the 1st day of next month

        const tenantInfo = new TenantInfo({
            tenantId,
            propertyId,
            dueDate
        });
        await tenantInfo.save();

        res.status(201).json({ message: 'Tenant assigned successfully!', property, tenantInfo });
    } catch (error) {
        console.error('Error assigning tenant:', error);
        res.status(500).json({ error: 'Server error assigning tenant. Please try again.' });
    }
});

// Get tenant's dashboard data (Tenant only)
app.get('/api/tenant-dashboard', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Access denied. Only tenants can view their dashboard.' });
        }

        // Find the single TenantInfo record for the logged-in tenant
        const tenantInfo = await TenantInfo.findOne({ tenantId: req.user.userId })
            .populate('propertyId'); // Populate details of the assigned property

        if (!tenantInfo) {
            // This tenant is not yet assigned to any property
            return res.status(404).json({ error: 'No property currently assigned to this tenant.' });
        }

        res.json(tenantInfo);
    } catch (error) {
        console.error('Error fetching tenant dashboard data:', error);
        res.status(500).json({ error: 'Server error fetching tenant dashboard data. Please try again.' });
    }
});

// Generate QR code for payment (Tenant only)
app.get('/api/generate-qr/:propertyId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const property = await Property.findById(req.params.propertyId);
        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        // Ensure the property belongs to the requesting tenant (security check)
        const tenantInfo = await TenantInfo.findOne({ tenantId: req.user.userId, propertyId: property._id });
        if (!tenantInfo) {
            return res.status(403).json({ error: 'Not authorized to generate QR for this property.' });
        }

        // UPI payment link (replace with real UPI ID for deployment)
        const upiLink = `upi://pay?pa=pandeygunjan197@oksbi&pn=Gunjan Pandey&am=${property.rentAmount}&cu=INR&tn=Rent Payment`;

        // Generate QR code as a Data URL
        const qrCodeDataURL = await qr.toDataURL(upiLink);

        res.json({ qrCode: qrCodeDataURL, amount: property.rentAmount });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Server error generating QR code. Please try again.' });
    }
});

// Mark rent as paid by tenant (Tenant only)
app.post('/api/mark-paid', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Access denied. Only tenants can mark payments as paid.' });
        }

        // Find and update the tenant's current TenantInfo record
        const tenantInfo = await TenantInfo.findOneAndUpdate(
            { tenantId: req.user.userId },
            { 
                paymentStatus: 'paid',
                lastPaymentDate: new Date()
            },
            { new: true } // Return the updated document
        ).populate('propertyId');

        if (!tenantInfo) {
            return res.status(404).json({ error: 'Tenant information not found for current user.' });
        }

        // Create a new PaymentHistory record for this payment
        const paymentHistory = new PaymentHistory({
            tenantId: req.user.userId,
            propertyId: tenantInfo.propertyId._id,
            amount: tenantInfo.propertyId.rentAmount,
            status: 'paid', // Initial status is 'paid' by tenant
            notes: 'Payment marked as paid by tenant through dashboard.'
        });
        await paymentHistory.save();

        res.json({ message: 'Payment marked as paid, pending landlord verification.', tenantInfo });
    } catch (error) {
        console.error('Error marking payment as paid:', error);
        res.status(500).json({ error: 'Server error marking payment as paid. Please try again.' });
    }
});

// Get tenant payment statuses for landlord (Landlord only)
app.get('/api/tenant-payments', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can view tenant payments.' });
        }

        // Find all properties owned by the logged-in landlord
        const landlordsProperties = await Property.find({ landlordId: req.user.userId }).select('_id');
        const landlordPropertyIds = landlordsProperties.map(p => p._id);

        // Find TenantInfo records for properties owned by this landlord
        const tenantInfos = await TenantInfo.find({ propertyId: { $in: landlordPropertyIds } })
            .populate('tenantId', 'username email') // Populate tenant user details
            .populate('propertyId', 'address rentAmount'); // Populate property details

        res.json(tenantInfos);
    } catch (error) {
        console.error('Error fetching tenant payments:', error);
        res.status(500).json({ error: 'Server error fetching tenant payment statuses. Please try again.' });
    }
});

// Verify payment (Landlord only)
app.post('/api/verify-payment', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can verify payments.' });
        }

        const { tenantInfoId } = req.body;
        if (!tenantInfoId) {
            return res.status(400).json({ error: 'TenantInfo ID is required for verification.' });
        }

        // Update the TenantInfo record's payment status to 'verified'
        const tenantInfo = await TenantInfo.findByIdAndUpdate(
            tenantInfoId,
            { paymentStatus: 'verified' },
            { new: true }
        );

        if (!tenantInfo) {
            return res.status(404).json({ error: 'Tenant information record not found.' });
        }

        // Also update the corresponding (most recent) PaymentHistory record to 'verified'
        await PaymentHistory.findOneAndUpdate(
            { 
                tenantId: tenantInfo.tenantId,
                propertyId: tenantInfo.propertyId,
                status: 'paid' // Find the 'paid' record awaiting verification
            },
            { 
                status: 'verified',
                notes: 'Payment verified by landlord.'
            },
            { sort: { createdAt: -1 } } // Update the most recent 'paid' entry
        );

        res.json({ message: 'Payment verified successfully!', tenantInfo });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ error: 'Server error verifying payment. Please try again.' });
    }
});

// Get payment history for a specific tenant (Tenant only)
app.get('/api/payment-history', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Access denied. Only tenants can view their payment history.' });
        }

        const paymentHistory = await PaymentHistory.find({ tenantId: req.user.userId })
            .populate('propertyId', 'address rentAmount') // Populate property details for each payment
            .sort({ createdAt: -1 }); // Show most recent payments first

        res.json(paymentHistory);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ error: 'Server error fetching payment history. Please try again.' });
    }
});

// Tenant requests an agreement (This route is kept for existing functionality, but might be removed if only landlord creates agreements)
app.post('/api/request-agreement', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({ error: 'Only tenants can request agreements.' });
        }

        const { propertyId, rentAmount, securityDeposit, leaseDuration, startDate, terms } = req.body;
        
        const property = await Property.findById(propertyId).populate('landlordId');
        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        
        // Generate a unique agreement ID
        const agreementId = `AGR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Calculate the end date based on lease duration
        const start = new Date(startDate);
        const endDate = new Date(start);
        endDate.setMonth(start.getMonth() + leaseDuration);
        
        const agreement = new RentalAgreement({
            tenantId: req.user.userId,
            landlordId: property.landlordId._id,
            propertyId,
            agreementId,
            rentAmount,
            securityDeposit,
            leaseDuration,
            startDate: start,
            endDate,
            terms,
            status: 'pending_landlord_signature' // Tenant initiated, so landlord needs to sign next
        });
        await agreement.save();
        
        res.status(201).json({ message: 'Agreement request sent successfully!', agreement });
    } catch (error) {
        console.error('Error sending agreement request:', error);
        res.status(500).json({ error: 'Server error sending agreement request. Please try again.' });
    }
});

// Create rental agreement (Landlord only) - This is the primary route for landlords to initiate agreements
app.post('/api/create-agreement', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Only landlords can create agreements.' });
        }

        const { tenantId, propertyId, rentAmount, securityDeposit, leaseDuration, startDate, terms } = req.body;
        
        // Basic validation for agreement creation
        if (!tenantId || !propertyId || !rentAmount || !securityDeposit || !leaseDuration || !startDate || !terms) {
            return res.status(400).json({ error: 'Missing required agreement fields.' });
        }
        if (typeof rentAmount !== 'number' || rentAmount <= 0 || typeof securityDeposit !== 'number' || securityDeposit < 0 || typeof leaseDuration !== 'number' || leaseDuration <= 0) {
            return res.status(400).json({ error: 'Invalid numeric values for agreement.' });
        }

        // Verify property and tenant exist
        const property = await Property.findById(propertyId);
        const tenant = await User.findById(tenantId);
        if (!property || !tenant || tenant.role !== 'tenant') {
            return res.status(404).json({ error: 'Property or Tenant not found, or Tenant is invalid.' });
        }
        // Ensure property belongs to the landlord creating the agreement
        if (property.landlordId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'You can only create agreements for your own properties.' });
        }

        // Generate a unique agreement ID
        const agreementId = `AGR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Calculate the end date based on lease duration
        const start = new Date(startDate);
        const endDate = new Date(start);
        endDate.setMonth(start.getMonth() + leaseDuration);
        
        const agreement = new RentalAgreement({
            tenantId,
            landlordId: req.user.userId, // Landlord creating the agreement
            propertyId,
            agreementId,
            rentAmount,
            securityDeposit,
            leaseDuration,
            startDate: start,
            endDate,
            terms,
            status: 'pending_tenant_signature' // Landlord created, so tenant needs to sign next
        });
        await agreement.save();
        
        res.status(201).json({ message: 'Agreement created successfully!', agreement });
    } catch (error) {
        console.error('Error creating agreement:', error);
        res.status(500).json({ error: 'Server error creating agreement. Please try again.' });
    }
});

// Get agreements for the logged-in user (Landlord or Tenant)
app.get('/api/agreements', authenticateToken, async (req, res) => {
    try {
        let query = {};
        
        if (req.user.role === 'landlord') {
            query.landlordId = req.user.userId;
        } else if (req.user.role === 'tenant') {
            query.tenantId = req.user.userId;
        } else {
            return res.status(403).json({ error: 'Access denied. Invalid user role.' });
        }
        
        const agreements = await RentalAgreement.find(query)
            .populate('tenantId', 'username email') // Populate tenant's basic info
            .populate('landlordId', 'username email') // Populate landlord's basic info
            .populate('propertyId', 'address rentAmount type bedrooms bathrooms areaSqFt') // Populate property details including new fields
            .sort({ createdAt: -1 }); // Order by most recent first
            
        res.json(agreements);
    } catch (error) {
        console.error('Error fetching agreements:', error);
        res.status(500).json({ error: 'Server error fetching agreements. Please try again.' });
    }
});

// Sign an agreement (by Tenant or Landlord)
app.post('/api/sign-agreement/:agreementId', authenticateToken, async (req, res) => {
    try {
        const { agreementId } = req.params;
        const agreement = await RentalAgreement.findOne({ agreementId });
        
        if (!agreement) {
            return res.status(404).json({ error: 'Agreement not found.' });
        }
        const userRole = req.user.role;
        const userId = req.user.userId;
        const clientIP = req.ip || req.connection.remoteAddress;
        const isTenantOfAgreement = agreement.tenantId.toString() === userId;
        const isLandlordOfAgreement = agreement.landlordId.toString() === userId;

        if (!(isTenantOfAgreement || isLandlordOfAgreement)) {
            return res.status(403).json({ error: 'Not authorized to sign this agreement. You are neither the tenant nor the landlord for this agreement.' });
        }
        if (userRole === 'tenant' && isTenantOfAgreement) {
            if (agreement.tenantSignature.signed) {
                return res.status(400).json({ error: 'Tenant has already signed this agreement.' });
            }
            agreement.tenantSignature.signed = true;
            agreement.tenantSignature.signedAt = new Date();
            agreement.tenantSignature.ipAddress = clientIP;
            if (agreement.landlordSignature.signed) {
                agreement.status = 'signed';
            } else {
                agreement.status = 'pending_landlord_signature';
            }
        } else if (userRole === 'landlord' && isLandlordOfAgreement) {
            if (agreement.landlordSignature.signed) {
                return res.status(400).json({ error: 'Landlord has already signed this agreement.' });
            }
            agreement.landlordSignature.signed = true;
            agreement.landlordSignature.signedAt = new Date();
            agreement.landlordSignature.ipAddress = clientIP;
            if (agreement.tenantSignature.signed) {
                agreement.status = 'signed';
            } else {
                agreement.status = 'pending_tenant_signature';
            }
        } else {
            return res.status(403).json({ error: 'Unauthorized to sign. Your role does not match your relation to this agreement.' });
        }
        
        agreement.updatedAt = new Date(); // Update timestamp on modification
        await agreement.save();
        
        res.json({ message: 'Agreement signed successfully!', agreement });
    } catch (error) {
        console.error('Error signing agreement:', error);
        res.status(500).json({ error: 'Server error signing agreement. Please try again.' });
    }
});

// Delete property (Landlord only)
app.delete('/api/properties/:propertyId', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can delete properties.' });
        }

        const { propertyId } = req.params;

        // Find the property and verify ownership
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        // Verify that the property belongs to the requesting landlord
        if (property.landlordId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'You can only delete your own properties.' });
        }

        // Check if property has a tenant assigned
        if (property.tenantId) {
            return res.status(400).json({ 
                error: 'Cannot delete property with assigned tenant. Please remove the tenant first.' 
            });
        }

        // Check for existing agreements for this property
        const existingAgreements = await RentalAgreement.find({ propertyId: propertyId });
        if (existingAgreements.length > 0) {
            return res.status(400).json({ 
                error: 'Cannot delete property with existing rental agreements. Please handle agreements first.' 
            });
        }

        // Delete the property
        await Property.findByIdAndDelete(propertyId);

        res.json({ message: 'Property deleted successfully!' });
    } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ error: 'Server error deleting property. Please try again.' });
    }
});

// Remove tenant from property (Landlord only)
app.post('/api/remove-tenant', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'landlord') {
            return res.status(403).json({ error: 'Access denied. Only landlords can remove tenants.' });
        }

        const { propertyId, tenantId } = req.body;

        // Validate inputs
        if (!propertyId || !tenantId) {
            return res.status(400).json({ error: 'Property ID and Tenant ID are required.' });
        }

        // Verify the property exists and belongs to the landlord
        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }
        if (property.landlordId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'You can only manage tenants for your own properties.' });
        }

        // Check if the tenant is actually assigned to this property
        if (!property.tenantId || property.tenantId.toString() !== tenantId) {
            return res.status(400).json({ error: 'This tenant is not assigned to the specified property.' });
        }

        // Remove tenant from property
        await Property.findByIdAndUpdate(
            propertyId,
            { tenantId: null }, // Clear the tenantId
            { new: true }
        );

        // Remove the TenantInfo record
        const deletedTenantInfo = await TenantInfo.findOneAndDelete({ 
            tenantId: tenantId, 
            propertyId: propertyId 
        });

        if (!deletedTenantInfo) {
            console.warn(`No TenantInfo found for tenantId: ${tenantId}, propertyId: ${propertyId}`);
        }

        // Note: We're keeping payment history for record-keeping purposes
        // You might want to update the status of any active rental agreements
        await RentalAgreement.updateMany(
            { 
                tenantId: tenantId, 
                propertyId: propertyId, 
                status: { $in: ['draft', 'pending_tenant_signature', 'pending_landlord_signature', 'signed'] }
            },
            { 
                status: 'cancelled',
                updatedAt: new Date()
            }
        );

        res.json({ 
            message: 'Tenant removed successfully! Property is now available for new tenants.',
            property: await Property.findById(propertyId)
        });
    } catch (error) {
        console.error('Error removing tenant:', error);
        res.status(500).json({ error: 'Server error removing tenant. Please try again.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
});

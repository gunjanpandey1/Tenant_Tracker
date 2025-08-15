# Tenant Tracker

A comprehensive property management system for landlords and tenants with UPI payment integration, digital rental agreements, and advanced property management features.

## Features

### Landlord Features
- Add and manage properties with detailed information (bedrooms, bathrooms, area, type)
- Assign tenants to properties from available tenant pool
- Track rent payment status and verify payments
- Create and manage digital rental agreements
- View payment history and tenant information
- Remove tenants and delete properties
- Real-time dashboard with property statistics

### Tenant Features
- Browse and filter available properties by location, type, price range
- Contact landlords about specific properties
- View assigned property details and rent information
- Generate UPI QR codes for rent payments
- Mark payments as paid and view payment history
- Sign digital rental agreements electronically
- Check rent due dates and payment status

### Advanced Features
- Digital rental agreement system with electronic signatures
- Comprehensive payment history tracking
- Property filtering and search functionality
- Contact request system between tenants and landlords
- Automated tenant assignment management
- Property vacancy tracking

### Security Features
- JWT-based authentication with 24-hour token expiration
- Role-based access control for landlords and tenants
- Password hashing with bcryptjs
- Input validation and sanitization
- IP address tracking for agreement signatures

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT (jsonwebtoken)** - Authentication tokens
- **bcryptjs** - Password hashing
- **qrcode** - QR code generation for UPI payments
- **cors** - Cross-origin resource sharing
- **body-parser** - Request body parsing
- **nodemon** - Development server auto-restart

### Frontend
- **HTML5** - Markup language
- **CSS3** - Styling with modern features
- **JavaScript** - Client-side logic and DOM manipulation
- **Font Awesome** - Icon library
- **Responsive Design** - Mobile-friendly interface

## Project Structure

```
Tenant_Tracker/
├── server.js                 # Main server file with all API routes
├── package.json              # Dependencies and npm scripts
├── package-lock.json         # Dependency lock file
├── README.md                 # Project documentation
├── .env                      # Environment variables (not in git)
├── .gitignore                # Git ignore file
├── node_modules/             # Installed dependencies
└── frontend/
    ├── css/
    │   └── main.css          # Main stylesheet
    ├── js/
    │   ├── common.js         # Common utilities and helpers
    │   ├── auth.js           # Authentication logic
    │   ├── tenant-dashboard.js # Tenant dashboard functionality
    │   └── landlord-dashboard.js # Landlord dashboard functionality
    └── html/
        ├── index.html        # Landing page
        ├── login.html        # Login page
        ├── register.html     # Registration page
        ├── landlord-dashboard.html # Landlord dashboard
        └── tenant-dashboard.html   # Tenant dashboard
```

## Installation

### Local Development Setup

1. **Clone or download the project**
   ```bash
   git clone https://github.com/gunjanpandey1/Tenant_Tracker.git
   cd Tenant_Tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   The project includes a `.env` file for local development. Update it with your settings:
   ```bash
   # Database
   MONGODB_URI=mongodb://localhost:27017/tenant-tracker
   
   # Authentication
   JWT_SECRET=your-super-secret-jwt-key-for-local-development-123456
   
   # Server
   PORT=3001
   NODE_ENV=development
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On Windows
   # Start MongoDB service from Services panel
   ```

5. **Run the application**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:4000
   ```

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Properties Management
- `GET /api/properties` - Get landlord's properties (landlord only)
- `POST /api/properties` - Add new property with details (landlord only)
- `DELETE /api/properties/:propertyId` - Delete property (landlord only)
- `GET /api/available-properties` - Browse available properties with filters (tenant only)

### Tenant Management
- `GET /api/tenants` - Get all tenants (landlord only)
- `GET /api/unassigned-tenants` - Get tenants available for assignment (landlord only)
- `POST /api/assign-tenant` - Assign tenant to property (landlord only)
- `POST /api/remove-tenant` - Remove tenant from property (landlord only)
- `POST /api/contact-landlord` - Send contact request to landlord (tenant only)

### Dashboard and Information
- `GET /api/tenant-dashboard` - Get tenant's property and payment info (tenant only)
- `GET /api/tenant-payments` - Get payment status for properties (landlord only)

### Payments
- `GET /api/generate-qr/:propertyId` - Generate UPI payment QR code (tenant only)
- `POST /api/mark-paid` - Mark rent as paid (tenant only)
- `POST /api/verify-payment` - Verify tenant payment (landlord only)
- `GET /api/payment-history` - Get comprehensive payment history

### Digital Rental Agreements
- `POST /api/request-agreement` - Request rental agreement (tenant only)
- `POST /api/create-agreement` - Create rental agreement (landlord only)
- `GET /api/agreements` - Get user's agreements
- `POST /api/sign-agreement/:agreementId` - Digitally sign agreement

## Database Schema

### User
- `username` - Unique username
- `email` - Unique email address
- `password` - Hashed password using bcryptjs
- `role` - User role ('landlord' or 'tenant')
- `createdAt` - Account creation timestamp

### Property
- `address` - Property address
- `rentAmount` - Monthly rent amount
- `type` - Property type ('1BHK', '2BHK', '3BHK', 'Studio', 'Penthouse', 'Villa', 'Other', 'Commercial')
- `bedrooms` - Number of bedrooms
- `bathrooms` - Number of bathrooms
- `areaSqFt` - Area in square feet
- `description` - Property description
- `landlordId` - Reference to landlord user
- `tenantId` - Reference to tenant user (null if vacant)
- `createdAt` - Property creation timestamp

### TenantInfo
- `tenantId` - Reference to tenant user (unique)
- `propertyId` - Reference to assigned property
- `paymentStatus` - Payment status ('pending', 'paid', 'verified')
- `lastPaymentDate` - Date of last payment
- `dueDate` - Next payment due date
- `createdAt` - Assignment timestamp

### PaymentHistory
- `tenantId` - Reference to tenant user
- `propertyId` - Reference to property
- `amount` - Payment amount
- `paymentDate` - Date of payment
- `status` - Payment status ('paid', 'verified')
- `notes` - Additional notes
- `createdAt` - Record creation timestamp

### RentalAgreement
- `tenantId` - Reference to tenant user
- `landlordId` - Reference to landlord user
- `propertyId` - Reference to property
- `agreementId` - Unique agreement identifier
- `rentAmount` - Agreed rent amount
- `securityDeposit` - Security deposit amount
- `leaseDuration` - Lease duration in months
- `startDate` - Agreement start date
- `endDate` - Agreement end date
- `terms` - Agreement terms and conditions
- `status` - Agreement status ('draft', 'pending_tenant_signature', 'pending_landlord_signature', 'signed', 'cancelled')
- `tenantSignature` - Tenant signature details (signed, signedAt, ipAddress)
- `landlordSignature` - Landlord signature details (signed, signedAt, ipAddress)
- `createdAt` - Agreement creation timestamp
- `updatedAt` - Last modification timestamp

## UPI Payment Integration

The application generates UPI payment links in the format:
```
upi://pay?pa=landlord@upi&pn=Landlord&am=<amount>&cu=INR&tn=Rent Payment
```

Tenants can scan the QR code with any UPI app to make payments.

## Development

### Adding New Features

1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Add new HTML files in `frontend/html/`
3. **Styling**: Update `frontend/css/main.css`
4. **JavaScript**: Add logic in `frontend/js/`

### Common Utilities

The `frontend/js/common.js` file contains:
- Authentication helpers
- API call utilities
- Form validation
- Alert management
- Loading states
- Date/currency formatting

## Security Considerations

1. **JWT Secret**: Change the JWT secret in production
2. **Database**: Use authentication in production MongoDB
3. **HTTPS**: Enable HTTPS in production
4. **Input Validation**: All inputs are validated
5. **Rate Limiting**: Consider adding rate limiting

## License

This project is licensed under the ISC License.

## Support

For support or questions, please contact the development team.

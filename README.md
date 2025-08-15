# Tenant Tracker

A comprehensive property management system for landlords and tenants with UPI payment integration.

## Features

### 🏠 Landlord Features
- Add and manage properties
- Assign tenants to properties
- Track rent payment status
- Verify tenant payments
- Real-time dashboard with statistics

### 🏡 Tenant Features
- View property details
- Check rent due dates
- Generate UPI QR codes for payments
- Mark payments as paid
- View payment history

### 🔐 Security Features
- JWT-based authentication
- Role-based access control
- Password hashing with bcrypt
- Input validation and sanitization

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **qrcode** - QR code generation

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with modern features
- **JavaScript** - Client-side logic
- **Font Awesome** - Icons
- **Responsive Design** - Mobile-friendly

## Project Structure

```
tenant-tracker/
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── README.md                 # Project documentation
└── frontend/
    ├── css/
    │   └── main.css          # Main stylesheet
    ├── js/
    │   ├── common.js         # Common utilities
    │   ├── auth.js           # Authentication logic
    │   └── tenant-dashboard.js # Tenant dashboard logic
    └── html/
        ├── index.html        # Landing page
        ├── login.html        # Login page
        ├── register.html     # Registration page
        ├── landlord-dashboard.html # Landlord dashboard
        └── tenant-dashboard.html   # Tenant dashboard
```

## Installation

1. **Clone or download the project**
   ```bash
   cd tenant-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start MongoDB**
   Make sure MongoDB is running on your system:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Ubuntu/Debian
   sudo systemctl start mongod
   
   # On Windows
   # Start MongoDB service from Services panel
   ```

4. **Run the application**
   ```bash
   npm start
   ```

5. **Access the application**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /login` - User login

### Properties (Landlord)
- `GET /properties` - Get landlord's properties
- `POST /properties` - Add new property
- `GET /tenants` - Get all tenants for assignment
- `POST /assign-tenant` - Assign tenant to property

### Payments
- `GET /tenant-dashboard` - Get tenant's property info
- `GET /generate-qr/:propertyId` - Generate payment QR code
- `POST /mark-paid` - Mark rent as paid (tenant)
- `GET /tenant-payments` - Get payment status (landlord)
- `POST /verify-payment` - Verify payment (landlord)

## Database Schema

### User
- `username` - Unique username
- `email` - Email address
- `password` - Hashed password
- `role` - 'landlord' or 'tenant'

### Property
- `address` - Property address
- `rentAmount` - Monthly rent
- `landlordId` - Reference to landlord
- `tenantId` - Reference to tenant (optional)

### TenantInfo
- `tenantId` - Reference to tenant
- `propertyId` - Reference to property
- `paymentStatus` - 'pending', 'paid', or 'verified'
- `dueDate` - Next payment due date
- `lastPaymentDate` - Last payment date

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

## Production Deployment

1. **Environment Variables**:
   ```bash
   export JWT_SECRET=your-secure-secret
   export MONGODB_URI=mongodb://localhost:27017/tenant-tracker
   export PORT=3000
   ```

2. **MongoDB**: Set up MongoDB Atlas or local MongoDB
3. **Process Manager**: Use PM2 or similar for production
4. **Reverse Proxy**: Use Nginx for serving static files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support or questions, please contact the development team.

# Hospital Day Care Appointments Module

## Overview
Complete module for managing hospital day care appointments with bed charges, medical procedures, and optional doctor consultation charges.

## Features

### Pricing Components
```
Total Price = (Bed Rate × Hours) + Procedures + Doctor Charges - Discount
```

**Bed Rates (Optional):**
- Private: ₹200/hour
- Semi-Private: ₹150/hour  
- General: ₹100/hour
- If not provided: Bed charges = ₹0

**Doctor Charges:**
- Optional (boolean flag: `doctorVisitCharges`)
- When enabled: Uses doctor's "Day Care" + "New" visit type charge
- When disabled: ₹0

**Procedures:**
- Multiple procedures can be added
- Each with individual pricing
- Total calculated automatically

**Discount:**
- Requires password from Constants (key: "DISCOUNT_PASSWORD")
- Uses bcrypt password comparison (same as hospital visits)
- Discount authorized timestamp recorded

### ID Generation
- **Day Care ID**: `JJMDC00001` (auto-incremented)
- **Appointment ID**: `APT00001` (shared with visits)

### Status Workflow
`Scheduled` → `In Progress` → `Completed` | `Cancelled`

## API Endpoints

Base URL: `/api/v1/hospital/daycare-appointments`

### 1. Calculate Price (Live)
```http
POST /calculate-price
```
**Body (all fields optional except doctorVisitCharges):**
```json
{
  "daycareChargesType": "Private",
  "daycareChargesHours": 8,
  "procedureIds": ["507f1f77bcf86cd799439013"],
  "doctorId": "507f1f77bcf86cd799439012",
  "doctorVisitCharges": true
}
```
**Note:** Use MongoDB ObjectIds (_id), not readable IDs (PROC00001)

### 2. Create with Existing Patient
```http
POST /
```
**Body (daycareChargesType and daycareChargesHours are optional):**
```json
{
  "patientId": "507f1f77bcf86cd799439011",
  "doctorId": "507f1f77bcf86cd799439012",
  "daycareChargesType": "Private",
  "daycareChargesHours": 8,
  "procedureIds": ["507f1f77bcf86cd799439013"],
  "doctorVisitCharges": true,
  "discount": 100,
  "discountPassword": "your_password",
  "appointmentDate": "2024-03-15"
}
```

### 3. Create with Transaction
```http
POST /with-transaction
```
**Body:** Same as above + `transaction` object

### 4. Create with New Patient
```http
POST /with-patient
```
**Body:**
```json
{
  "patient": {
    "title": "Mr.",
    "name": "John Doe",
    "phone": "9876543210",
    "gender": "Male",
    "age": 45
  },
  "daycareChargesType": "General",
  "daycareChargesHours": 4,
  "doctorVisitCharges": false,
  "appointmentDate": "2024-03-16"
}
```

### 5. Get All Appointments
```http
GET /?skip=0&limit=10&status=Scheduled&daycareChargesType=Private
```

### 6. Get Single Appointment (by MongoDB _id)
```http
GET /:id
```

### 7. Get by Patient
```http
GET /patient/:patientId
```

### 8. Get by Doctor
```http
GET /doctor/:doctorId?date=2024-03-15
```

### 9. Update Appointment (by MongoDB _id)
```http
PUT /:id
```
**Body:**
```json
{
  "status": "In Progress"
}
```

### 10. Delete Appointment (by MongoDB _id)
```http
DELETE /:id
```

### 11. Search by Readable ID (JJMDC00001)
```http
GET /search/daycareId/:daycareId
```

## Database Schema

**Collection:** `daycareappointments`

```javascript
{
  daycareId: String,              // JJMDC00001
  appointmentId: String,          // APT00001
  patientId: String,              // MongoDB _id
  doctorId: String,               // Optional
  
  daycareChargesType: String,         // Optional: Private | Semi-Private | General
  daycareChargesRate: Number,         // Optional: 200 | 150 | 100
  daycareChargesHours: Number,        // Optional: Number of hours
  daycareChargesTotal: Number,        // Optional: rate × hours
  
  procedures: [{
    procedureId: String,
    procedureName: String,
    price: Number
  }],
  procedureChargesTotal: Number,
  
  doctorVisitCharges: Boolean,
  doctorChargesAmount: Number,
  
  subtotal: Number,
  discount: Number,
  discountAuthorizedAt: Date,     // When discount was authorized
  totalPrice: Number,
  
  appointmentDate: Date,
  status: String,                 // Scheduled | In Progress | Completed | Cancelled
  
  createdAt: Date,
  updatedAt: Date
}
```

## Module Structure

```
hospital-daycare-appointment/
├── models/
│   ├── daycare-appointment.model.ts      # Mongoose model
│   └── daycare-appointment.types.ts      # TypeScript types
├── services/
│   └── daycare-appointment.service.ts    # Business logic
├── controllers/
│   ├── daycare-appointment.controller.ts
│   ├── daycare-appointments.controller.ts
│   └── index.ts
├── dtos/
│   └── daycare-appointment.dto.ts
├── validators/
│   ├── daycare-appointment-new.json
│   ├── daycare-appointment-update.json
│   └── calculate-price.json
└── routes/
    └── daycare-appointment.routes.ts
```

## Usage Examples

### Example 1: Procedures Only (No Bed Charges)
```javascript
{
  patientId: "507f1f77bcf86cd799439011",  // MongoDB _id
  procedureIds: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"],  // MongoDB _ids
  doctorVisitCharges: false
  // appointmentDate defaults to today if not provided
}
// Price: Procedure Costs only
```

### Example 2: Simple Day Care (Bed Only)
```javascript
{
  patientId: "507f1f77bcf86cd799439011",  // MongoDB _id
  daycareChargesType: "General",
  daycareChargesHours: 4,
  doctorVisitCharges: false,
  appointmentDate: "2024-03-15"  // Optional
}
// Price: 4 × ₹100 = ₹400
```

### Example 3: Day Care with Procedures
```javascript
{
  patientId: "507f1f77bcf86cd799439011",  // MongoDB _id
  daycareChargesType: "Semi-Private",
  daycareChargesHours: 6,
  procedureIds: ["507f1f77bcf86cd799439013", "507f1f77bcf86cd799439014"],  // MongoDB _ids
  doctorVisitCharges: false,
  appointmentDate: "2024-03-15"
}
// Price: (6 × ₹150) + Procedure Costs
```

### Example 4: Full Day Care with Doctor & Discount
```javascript
{
  patientId: "507f1f77bcf86cd799439011",  // MongoDB _id
  doctorId: "507f1f77bcf86cd799439012",  // MongoDB _id
  daycareChargesType: "Private",
  daycareChargesHours: 8,
  procedureIds: ["507f1f77bcf86cd799439013"],  // MongoDB _id
  doctorVisitCharges: true,
  discount: 200,
  discountPassword: "your_password",
  appointmentDate: "2024-03-15"
}
// Price: (8 × ₹200) + Procedures + Doctor Charge - ₹200
```

## Integration

### Dependencies
- `hospital-patient` - Patient management (uses MongoDB _id)
- `hospital-doctor` - Doctor charges (uses MongoDB _id)
- `hospital-procedure` - Procedure pricing (uses MongoDB _id)
- `hospital-transaction` - Payment tracking
- `constants` - Discount password storage
- `counter` - ID generation

**Important:** All references use MongoDB ObjectIds (_id), not readable IDs like PROC00001, DOC00001, etc.

### Routes Integration
Already integrated in `src/routes/v1/hospital.routes.ts`:
```javascript
router.use("/daycare-appointments", daycareAppointmentRouter);
```

## Testing

Use Postman collection: `docs/Hospital Management API.postman_collection.json`

Look for folder: **"Hospital Day Care Appointments"** (10 endpoints with tests)

## Notes

- No token/queue system (unlike regular visits)
- Bed charges are optional - can create appointments with only procedures or doctor charges
- Doctor is optional
- Procedures are optional
- Discount requires password from Constants model (same as visits)
- Payment status: Paid, Unpaid, Partially Paid
- Supports multiple transactions per appointment

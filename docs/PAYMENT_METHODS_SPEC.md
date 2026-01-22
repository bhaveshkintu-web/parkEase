# Payment Methods Management System Specification

This document outlines the architecture, data models, and workflows for a Payment Methods Management system supporting **Credit/Debit Cards**, **PayPal**, **UPI** (Unified Payments Interface), and **Cash on Delivery (COD)**.

## 1. Core Principles & Security
- **PCI DSS Compliance**: We NEVER store raw credit card numbers or CVV codes. We only store **tokens** or **payment method IDs** provided by the payment gateway (e.g., Stripe, PayPal).
- **Tokenization**: The frontend collects sensitive data and exchanges it for a secure token directly with the provider. This token is sent to our backend.
- **Validation**: All inputs (like UPI VPAs) must be validated for format and existence before saving.

## 2. Data Model (Schema Extensions)
Modify the `PaymentMethod` model to support various types and metadata.

```prisma
model PaymentMethod {
  id          String   @id @default(cuid())
  userId      String
  
  // Type Discriminator
  type        PaymentMethodType // CARD, PAYPAL, UPI, COD

  // Common Fields
  isDefault   Boolean  @default(false)
  nickname    String?  // User-defined name e.g., "Corporate Card"

  // Provider Data (Stored securely)
  provider    String   // stripe, razorpay, paypal
  providerId  String   // source_id, payment_method_id, billing_agreement_id

  // Display Data (Safe to show)
  details     Json     
  // Structure depends on type:
  // CARD: { last4: "4242", brand: "Visa", expiryMonth: 12, expiryYear: 2025 }
  // PAYPAL: { email: "user@example.com" }
  // UPI: { vpa: "user@oksbi" }

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, isDefault])
}

enum PaymentMethodType {
  CARD
  PAYPAL
  UPI
  COD
}
```

## 3. Workflow & API Design

### A. List Payment Methods (`GET /api/account/payment-methods`)
- **Response**: Array of methods with safe details.
- **Logic**:
    - Fetch all where `userId = current_user`.
    - Sort `isDefault` first, then `createdAt` desc.

### B. Add Payment Method (`POST /api/account/payment-methods`)
- **Input**:
    - `type`: "CARD" | "PAYPAL" | "UPI"
    - `token`: (Provider specific token)
    - `isDefault`: boolean
- **Process**:
    1.  **Frontend**: Uses Stripe Elements / PayPal SDK to authorize and get a `paymentMethodId` or `nonce`.
    2.  **API**: Receives `id` and `type`.
    3.  **Validation**:
        - **Card**: Retrieve details from Stripe to verify validity and ownership.
        - **UPI**: Validate VPA format (e.g., regex `^[\w.-]+@[\w.-]+$`). Optionally use a verification API.
    4.  **Save**: Store the `providerId` and extracted display details (`last4`, `brand`).
    5.  **Default Handling**: If `isDefault` is true, unset previous default in a transaction.

### C. Update Default (`PATCH /api/account/payment-methods/:id/default`)
- **Action**: Set the specified ID as default.
- **Transaction**:
    ```typescript
    prisma.$transaction([
      prisma.paymentMethod.updateMany({ 
        where: { userId, isDefault: true }, 
        data: { isDefault: false } 
      }),
      prisma.paymentMethod.update({ 
        where: { id, userId }, 
        data: { isDefault: true } 
      })
    ])
    ```

### D. Delete Method (`DELETE /api/account/payment-methods/:id`)
- **Validation**:
    - Ensure method belongs to user.
    - **Soft Check**: Warn if active subscriptions/bookings are using this method.
- **Provider Sync**: Optionally call provider API to detach/delete the method from the customer object in Stripe/PayPal.

## 4. UI/UX Considerations

### Card Management
- **Visuals**: Show card brand icons (Visa, MC, Amex).
- **Expiry Warning**: Highlight cards expiring soon (e.g., red text for < 30 days).
- **Edit**: Users usually cannot "edit" card numbers. They must delete and re-add. Only "Billing Address" or "Nickname" is editable.

### UPI (Unified Payments Interface)
- **Input**: Simple text field for VPA (e.g., `name@bank`).
- **Verification**: Show a "Verify" button that hits an API to check if VPA is valid before saving.

### Fallback
- Always allow **Cash on Delivery (COD)** as a toggleable option in checkout, but usually not saved as a "method" in the profile unless defining preferences.

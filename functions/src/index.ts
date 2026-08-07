import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

// 1. Auth Trigger: Create audit log on signup
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    // We intentionally DO NOT create the Firestore 'users' document here anymore.
    // That responsibility belongs to the CompleteRegistration flow to ensure 
    // phone numbers and necessary details are provided before the account is active.
    
    await db.collection('audit_logs').add({
      action: 'USER_REGISTRATION_STARTED',
      user_id: user.uid,
      email: user.email || "",
      details: 'New user auth account created (pending full registration)',
      created_at: new Date().toISOString()
    });
    console.log(`User auth created for ${user.uid}, pending profile completion.`);

  } catch (error) {
    console.error("Error creating auth log:", error);
  }
});

// 2. Booking Trigger: Notifications on status change
export const onBookingUpdate = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    const bookingId = context.params.bookingId;

    if (newData.status !== previousData.status) {
      console.log(`Booking ${bookingId} status changed from ${previousData.status} to ${newData.status}`);
      
      // const customerId = newData.customerId;
      // const partnerId = newData.partnerId;

      // Fetch Customer and Partner for FCM tokens
      // const customerDoc = await db.collection("users").doc(customerId).get();
      // const fcmToken = customerDoc.data()?.fcmToken;

      // TODO: Send FCM Push Notification
      // if (fcmToken) {
      //   await admin.messaging().send({
      //     token: fcmToken,
      //     notification: {
      //       title: 'Booking Update',
      //       body: `Your booking status is now: ${newData.status}`
      //     }
      //   });
      // }

      // TODO: Send Transactional Email & SMS
    }
    return null;
  });

// 3. Partner Verification Trigger
export const onPartnerStatusChange = functions.firestore
  .document("partners/{partnerId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();

    if (newData.status === 'approved' && previousData.status !== 'approved') {
       // Update user role to 'partner' if approved
       await db.collection("users").doc(context.params.partnerId).update({
         role: 'partner'
       });
       console.log(`Partner ${context.params.partnerId} approved and role updated.`);
       // TODO: Send Email Notification
    }
    return null;
  });


// 4. Audit Trigger: Log changes to businesses
export const onBusinessUpdate = functions.firestore
  .document("businesses/{bizId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    if (newData.status !== previousData.status) {
      await db.collection('audit_logs').add({
        action: 'BUSINESS_STATUS_CHANGE',
        target_id: context.params.bizId,
        details: `Status changed from ${previousData.status} to ${newData.status}`,
        performed_by: 'System / Cloud Function',
        created_at: new Date().toISOString()
      });
    }
    return null;
  });

// 5. Audit Trigger: Log changes to user roles
export const onUserRoleUpdate = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    if (newData.role !== previousData.role) {
      await db.collection('audit_logs').add({
        action: 'USER_ROLE_CHANGE',
        target_user: newData.email || context.params.userId,
        details: `Role changed from ${previousData.role} to ${newData.role}`,
        performed_by: 'System / Cloud Function',
        created_at: new Date().toISOString()
      });
    }
    return null;
  });

// 6. Audit Trigger: Auth Events (Registration and Login)
export const onUserUpdate = functions.firestore
  .document("users/{userId}")
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const previousData = change.before.data();
    
    const logs = [];
    
    // Check if login time changed
    if (newData.lastLogin !== previousData.lastLogin) {
      logs.push(db.collection('audit_logs').add({
        action: 'USER_LOGIN',
        user_id: context.params.userId,
        email: newData.email,
        details: 'User logged in successfully',
        created_at: new Date().toISOString(),
        ip_address: 'Logged via client', // IP isn't available in firestore trigger without client sending it
        platform: 'Web/Mobile' 
      }));
    }

    // Check if phone was verified/linked
    if (newData.phone && !previousData.phone) {
      logs.push(db.collection('audit_logs').add({
        action: 'PHONE_VERIFICATION_COMPLETED',
        user_id: context.params.userId,
        details: `Phone ${newData.phone} linked to account`,
        created_at: new Date().toISOString()
      }));
    }

    await Promise.all(logs);
    return null;
  });

// 7. Emergency Auth Reset
export const emergencyResetPassword = functions.https.onRequest(async (req, res) => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).send("Email required");
    return;
  }
  
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, {
      password: "GouujiMasterKey2026!"
    });
    res.status(200).send(`Successfully reset password for ${email}`);
  } catch (error: any) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// 8. Partner Workflow: On New Business Registration
export const onPartnerRegistered = functions.firestore
  .document("businesses/{bizId}")
  .onCreate(async (snap, context) => {
    const data = snap.data();
    
    // Only process if it's a new pending partner application
    if (data.status === 'pending') {
      console.log(`New partner application received: ${data.businessName}`);
      
      await db.collection('audit_logs').add({
        action: 'PARTNER_APPLICATION_RECEIVED',
        target_id: context.params.bizId,
        details: `New application submitted by ${data.ownerName} for ${data.businessName}`,
        created_at: new Date().toISOString()
      });

      // Send email alert to admin via Firebase Extensions (Trigger Email)
      await db.collection('mail').add({
        to: 'admin@gouuji.com',
        message: {
          subject: 'New Partner Registration Received',
          html: `<p>A new partner registration has been submitted.</p>
                 <p><strong>Business:</strong> ${data.businessName}</p>
                 <p><strong>Owner:</strong> ${data.ownerName}</p>
                 <p>Please review the application in the Admin Dashboard.</p>`
        }
      });
    }
    return null;
  });

// 9. Partner Workflow: Approve Application & Generate Token
export const approvePartnerApplication = functions.https.onCall(async (data, context) => {
  try {
    // Enforce Admin access
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to perform this action.');
    }
    
    let isAdmin = context.auth.token.admin;
    const userEmail = context.auth.token.email;
    
    // Check email whitelist
    if (!isAdmin && userEmail) {
      const adminEmails = ['superadmin@gouuji.com', 'admin@gouujipets.com', 'admin@example.com', 'admin@gmail.com', 'rachanuthappa@gmail.com'];
      if (adminEmails.includes(userEmail)) {
        isAdmin = true;
      }
    }

    // Check Firestore users collection
    if (!isAdmin) {
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      if (userDoc.exists) {
        const role = userDoc.data()?.role;
        if (role === 'admin' || role === 'super_admin') {
          isAdmin = true;
        }
      }
    }

    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', `Only admins can approve partners. Your UID: ${context.auth.uid}`);
    }

    const { businessId } = data;
    if (!businessId) {
      throw new functions.https.HttpsError('invalid-argument', 'Business ID is required.');
    }

    const bizRef = db.collection('businesses').doc(businessId);
    const bizDoc = await bizRef.get();

    if (!bizDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Business not found.');
    }

    const bizData = bizDoc.data()!;
    
    if (bizData.status === 'approved' || bizData.status === 'active') {
      // Don't throw an error, allow regeneration of the token for resending
      console.log(`Business ${businessId} is already approved/active. Regenerating token for resend.`);
    }

    // Fallback email if missing
    let targetEmail = data.ownerEmail || bizData.email;
    if (!targetEmail && bizData.ownerId) {
      const ownerDoc = await db.collection('users').doc(bizData.ownerId).get();
      if (ownerDoc.exists) {
        targetEmail = ownerDoc.data()?.email;
      }
    }
    targetEmail = targetEmail || 'no-email-provided@gouuji.com';

    // Generate secure token (32 random bytes, hex encoded)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store token hash in a dedicated collection
    await db.collection('activation_tokens').doc(businessId).set({
      tokenHash,
      email: targetEmail,
      businessId: businessId,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString()
    });

    // Update business status
    await bizRef.update({
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: context.auth.uid
    });

    // Trigger branded approval email containing the token link
    const activationLink = `https://pets.gouuji.com/partner/activate?token=${rawToken}&id=${businessId}`;
    
    await db.collection('mail').add({
      to: targetEmail,
      message: {
        subject: 'Welcome to GOUUJI Pets - Action Required!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Congratulations ${bizData.ownerName || 'Partner'}!</h2>
            <p>Your partner application for <strong>${bizData.businessName || 'your facility'}</strong> has been approved.</p>
            <p>To access your partner dashboard, you must activate your account and securely set your password.</p>
            <p><strong>This activation link expires in exactly 24 hours.</strong></p>
            <a href="${activationLink}" style="background-color: #9333ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Activate Account</a>
            <p style="font-size: 12px; color: #666;">If you did not register for GOUUJI Pets, please ignore this email. We never include passwords in emails.</p>
          </div>
        `
      }
    });

    await db.collection('audit_logs').add({
      action: 'PARTNER_APPROVED',
      target_id: businessId,
      details: `Admin ${context.auth.uid} approved ${bizData.businessName || businessId} and dispatched token.`,
      created_at: new Date().toISOString()
    });

    return { 
      success: true, 
      message: 'Partner approved.', 
      activationLink, 
      targetEmail, 
      businessName: bizData.businessName 
    };
  } catch (error: any) {
    console.error("Approve Partner Error:", error);
    // Rethrow standard HttpsErrors
    if (error.code && error.message) {
      throw error;
    }
    // Convert unknown errors to internal with detailed message
    throw new functions.https.HttpsError('internal', `Backend error: ${error.message}`);
  }
});

// 10. Partner Workflow: Activate Account with Token
export const activatePartner = functions.https.onCall(async (data, context) => {
  const { businessId, token, newPassword } = data;

  if (!businessId || !token || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  // Validate password strength
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{12,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 12 characters and include uppercase, lowercase, number, and special character.');
  }

  const tokenRef = db.collection('activation_tokens').doc(businessId);
  const tokenDoc = await tokenRef.get();

  if (!tokenDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Invalid activation token.');
  }

  const tokenData = tokenDoc.data()!;

  // Check if used
  if (tokenData.used) {
    throw new functions.https.HttpsError('failed-precondition', 'This activation link has already been used.');
  }

  // Check expiration
  if (new Date() > new Date(tokenData.expiresAt)) {
    throw new functions.https.HttpsError('failed-precondition', 'This activation link has expired.');
  }

  // Verify token hash
  const providedHash = crypto.createHash('sha256').update(token).digest('hex');
  if (providedHash !== tokenData.tokenHash) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid activation token.');
  }

  // All checks pass! Create or update the Auth user
  let userRecord;
  try {
    // Check if auth user already exists somehow
    userRecord = await admin.auth().getUserByEmail(tokenData.email);
    // Update their password
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Create new user
      userRecord = await admin.auth().createUser({
        email: tokenData.email,
        password: newPassword,
        emailVerified: true
      });
    } else {
      throw new functions.https.HttpsError('internal', 'Auth error occurred.');
    }
  }

  // Set custom claims if needed
  await admin.auth().setCustomUserClaims(userRecord.uid, { partner: true });

  // Update business record
  await db.collection('businesses').doc(businessId).update({
    status: 'active',
    ownerId: userRecord.uid, // Link business to the newly created auth UID
    activatedAt: new Date().toISOString()
  });

  // Create/Update the 'users' document for this partner
  await db.collection('users').doc(userRecord.uid).set({
    email: tokenData.email,
    role: 'partner',
    businessId: businessId,
    status: 'active',
    createdAt: new Date().toISOString()
  }, { merge: true });

  // Invalidate token
  await tokenRef.update({
    used: true,
    usedAt: new Date().toISOString()
  });

  await db.collection('audit_logs').add({
    action: 'PARTNER_ACTIVATED',
    target_id: businessId,
    details: `Partner ${businessId} successfully activated their account.`,
    created_at: new Date().toISOString()
  });

  return { success: true };
});

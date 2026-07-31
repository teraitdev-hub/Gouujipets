import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 1. Auth Trigger: Create user profile on signup
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  const userProfile = {
    uid: user.uid,
    email: user.email || "",
    name: user.displayName || "New User",
    phone: user.phoneNumber || "",
    role: "customer",
    walletBalance: 0,
    rewardPoints: 0,
    createdDate: new Date().toISOString(),
    isActive: true,
  };

  try {
    await db.collection("users").doc(user.uid).set(userProfile, { merge: true });
    // TODO: Send Welcome Email via SendGrid/Nodemailer here
    
    await db.collection('audit_logs').add({
      action: 'USER_REGISTRATION',
      user_id: user.uid,
      email: user.email || "",
      details: 'New user registered',
      created_at: new Date().toISOString()
    });
    console.log(`User profile created for ${user.uid}`);

  } catch (error) {
    console.error("Error creating user profile:", error);
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
      
      const customerId = newData.customerId;
      const partnerId = newData.partnerId;

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

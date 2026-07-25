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

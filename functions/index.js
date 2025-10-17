const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendBirthdayMessage = functions.pubsub
  .schedule('15 13 * * *') // 1:15 PM daily
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const todayStr = `${day}/${month}`;

    const db = admin.firestore();
    const snapshot = await db.collection('birthdaycanva')
                             .where('dob', '==', todayStr).get();

    if (snapshot.empty) {
      console.log('No birthdays today.');
      return;
    }

    snapshot.forEach(async doc => {
      const data = doc.data();
      const name = data.Name;
      const phone = data['Mobile no'];
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/ujb-auth-login-app.appspot.com/o/birthdayImages%2F${phone}?alt=media`;

      // Here, call your WhatsApp API to send message
      console.log(`Sending birthday wish to ${name} at ${phone} with image: ${imageUrl}`);
      
      // Call WhatsApp API here
    });
  });

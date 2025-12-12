const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

exports.sendBirthdayMessage = onSchedule(
  {
     schedule: "0 9 * * *",

   // 🔥 Runs daily at 5:30 PM IST
    timeZone: "Asia/Kolkata",
  },
  async (event) => {
    console.log("🔥 Birthday Cron Running at 5:30 PM IST");

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const todayStr = `${day}/${month}`;

    const db = admin.firestore();
    const usersRef = db.collection("birthdaycanva");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log("❌ No birthday entries in DB.");
      return;
    }

    const birthdayUsers = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      let dob = data.dob;

      if (!dob) return;

      // Convert DOB formats to dd/mm
      if (typeof dob === "string" && dob.includes("-")) {
        // Format: YYYY-MM-DD
        const parts = dob.split("-");
        dob = `${parts[2]}/${parts[1]}`;
      } else if (typeof dob === "string" && dob.includes("/")) {
        // Format: dd/mm or dd/mm/yyyy
        const parts = dob.split("/");
        dob = `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
      } else {
        // Timestamp fallback
        const dobDate = new Date(dob);
        dob = `${String(dobDate.getDate()).padStart(2, "0")}/${String(
          dobDate.getMonth() + 1
        ).padStart(2, "0")}`;
      }

      if (dob === todayStr) {
        birthdayUsers.push({ id: doc.id, ...data });
      }
    });

    if (birthdayUsers.length === 0) {
      console.log("🎉 No birthdays today.");
      return;
    }

    console.log("🎂 Today's Birthday Users:", birthdayUsers);

    // WhatsApp API config
    const phoneNumberId = "527476310441806";
    const accessToken =
      "EAAHwbR1fvgsBOwUInBvR1SGmVLSZCpDZAkn9aZCDJYaT0h5cwyiLyIq7BnKmXAgNs0ZCC8C33UzhGWTlwhUarfbcVoBdkc1bhuxZBXvroCHiXNwZCZBVxXlZBdinVoVnTB7IC1OYS4lhNEQprXm5l0XZAICVYISvkfwTEju6kV4Aqzt4lPpN8D3FD7eIWXDhnA4SG6QZDZD";

    await Promise.all(
      birthdayUsers.map(async (user) => {
        const name = user.name;
        const phone = user.phone;
        const imageUrl = user.imageUrl;

        if (!phone) {
          console.log(`❌ Missing phone number for ${name}`);
          return;
        }

        const messageData = {
          messaging_product: "whatsapp",
          to: phone,
          type: "template",
          template: {
            name: "daily_reminder",
            language: { code: "en" },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: { link: imageUrl }, // Use actual Firestore image URL
                  },
                ],
              },
              {
                type: "body",
                parameters: [
                  { type: "text", text: name },
                  {
                    type: "text",
                    text: "Happy Birthday from UJustBe Universe!",
                  },
                ],
              },
            ],
          },
        };

        try {
          await axios.post(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
            messageData,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          console.log(`🎉 WhatsApp sent to ${name} (${phone})`);
        } catch (error) {
          console.error(
            `❌ Error sending WhatsApp to ${name}:`,
            error.response?.data || error
          );
        }
      })
    );

    console.log("✅ Birthday Function Completed Successfully");
    return;
  }
);

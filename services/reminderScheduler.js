const cron = require("node-cron");
const { processAllReminders } = require("../services/reminderService");
const { processAllReviewRequests } = require("../services/reviewService");

/**
 * Har 30 minute mein saari clinics ke reminders + review requests check/send karta hai.
 * server.js mein ek dafa call karna hai: startReminderScheduler()
 */
function startReminderScheduler() {
  cron.schedule("*/30 * * * *", async () => {
    console.log("[Cron] Reminder aur review check chal raha hai...");
    try {
      await processAllReminders();
      await processAllReviewRequests();
    } catch (err) {
      console.error("[Cron] Error:", err.message);
    }
  });
  console.log("[Cron] Scheduler start ho gaya (har 30 min)");
}

module.exports = startReminderScheduler;

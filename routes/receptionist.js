const express = require("express");
const router = express.Router();
const resolveTenant = require("../middleware/resolveTenant");
const { handleReceptionistMessage } = require("../services/aiReceptionist");

// In-memory conversation store (demo ke liye). Production mein Redis/DB use karein.
const chatSessions = {};
const callSessions = {};

router.use(resolveTenant);

/**
 * CHAT WIDGET
 * POST /api/receptionist/chat
 * Header: x-clinic-id: smilecare
 * Body: { sessionId, message }
 */
router.post("/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!sessionId || !message) {
      return res.status(400).json({ error: "sessionId aur message dono chahiye" });
    }

    const history = chatSessions[sessionId] || [];
    const { reply, updatedHistory } = await handleReceptionistMessage(
      message,
      history,
      req.tenant.models,
      req.tenant.clinic
    );

    chatSessions[sessionId] = updatedHistory;
    res.json({ reply });
  } catch (err) {
    console.error("[Chat] Error:", err.message);
    res.status(500).json({ error: "Chat process karte waqt error aayi" });
  }
});

/**
 * VOICE CALL (Twilio)
 * Twilio number ka webhook isi URL par set hoga:
 * POST /api/receptionist/voice/incoming
 * Header (Twilio config mein set karein): x-clinic-id: smilecare
 */
router.post("/voice/incoming", (req, res) => {
  const callSid = req.body.CallSid;
  callSessions[callSid] = [];

  // Twilio <Gather input="speech"> khud hi call karne wale ki awaaz
  // ko text mein convert kar deta hai (built-in STT) — hume alag se
  // Whisper/Deepgram setup nahi karna padta shuru mein.
  const twiml = `
    <Response>
      <Gather input="speech" action="/api/receptionist/voice/process" method="POST" speechTimeout="auto" language="ur-PK">
        <Say language="ur-PK">${req.tenant.clinic.name} mein khush aamdeed. Aap appointment book karna chahte hain?</Say>
      </Gather>
      <Say>Koi jawab nahi mila. Dobara call karein.</Say>
    </Response>
  `.trim();

  res.type("text/xml").send(twiml);
});

/**
 * Twilio speech result yahan aata hai, hum usay LLM se process karke
 * TwiML <Say> ke zariye jawab bolte hain aur <Gather> se agli baat sunte hain.
 * POST /api/receptionist/voice/process
 */
router.post("/voice/process", async (req, res) => {
  try {
    const callSid = req.body.CallSid;
    const speechText = req.body.SpeechResult || "";
    const history = callSessions[callSid] || [];

    const { reply, updatedHistory } = await handleReceptionistMessage(
      speechText,
      history,
      req.tenant.models,
      req.tenant.clinic
    );
    callSessions[callSid] = updatedHistory;

    const twiml = `
      <Response>
        <Gather input="speech" action="/api/receptionist/voice/process" method="POST" speechTimeout="auto" language="ur-PK">
          <Say language="ur-PK">${escapeXml(reply)}</Say>
        </Gather>
        <Say>Shukriya, Allah Hafiz.</Say>
      </Response>
    `.trim();

    res.type("text/xml").send(twiml);
  } catch (err) {
    console.error("[Voice] Error:", err.message);
    res.type("text/xml").send(`<Response><Say>Maazrat, system mein masla hai.</Say></Response>`);
  }
});

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = router;

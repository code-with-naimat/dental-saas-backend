const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// LLM ko diye jane wale "functions" (tools) — ye hi asli booking logic ko trigger karte hain
const tools = [
  {
    name: "check_availability",
    description: "Kisi doctor ki di gayi date ke liye available time slots check karta hai",
    input_schema: {
      type: "object",
      properties: {
        doctorName: { type: "string", description: "Doctor ka naam ya specialty" },
        date: { type: "string", description: "YYYY-MM-DD format mein date" },
      },
      required: ["date"],
    },
  },
  {
    name: "book_appointment",
    description: "Patient ke liye appointment book karta hai jab date/time confirm ho jaye",
    input_schema: {
      type: "object",
      properties: {
        patientName: { type: "string" },
        patientPhone: { type: "string" },
        doctorName: { type: "string" },
        dateTime: { type: "string", description: "ISO format: YYYY-MM-DDTHH:mm:ss" },
      },
      required: ["patientName", "patientPhone", "dateTime"],
    },
  },
  {
    name: "get_clinic_info",
    description: "Clinic ke timings, location, services jaisi general info deta hai",
    input_schema: { type: "object", properties: {} },
  },
];

/**
 * Function jo LLM call kare, usay actual tenant DB operation mein convert karta hai.
 */
async function executeFunction(name, input, models, clinic) {
  const { Doctor, Patient, Appointment } = models;

  if (name === "check_availability") {
    const doctorQuery = input.doctorName
      ? { name: new RegExp(input.doctorName, "i") }
      : {};
    const doctors = await Doctor.find(doctorQuery);
    if (doctors.length === 0) return { error: "Doctor nahi mila" };

    const dayStart = new Date(`${input.date}T00:00:00`);
    const dayEnd = new Date(`${input.date}T23:59:59`);

    const booked = await Appointment.find({
      doctorId: { $in: doctors.map((d) => d._id) },
      dateTime: { $gte: dayStart, $lte: dayEnd },
      status: "booked",
    });

    // Simple version: clinic 10am-6pm, 1-hour slots, jo book nahi wo available
    const allSlots = [];
    for (let h = 10; h < 18; h++) {
      allSlots.push(`${input.date}T${String(h).padStart(2, "0")}:00:00`);
    }
    const bookedTimes = booked.map((b) => b.dateTime.toISOString().slice(0, 19));
    const available = allSlots.filter((s) => !bookedTimes.includes(s));

    return { doctor: doctors[0].name, availableSlots: available };
  }

  if (name === "book_appointment") {
    let patient = await Patient.findOne({ phone: input.patientPhone });
    if (!patient) {
      patient = await Patient.create({
        name: input.patientName,
        phone: input.patientPhone,
      });
    }

    let doctorQuery = input.doctorName
      ? { name: new RegExp(input.doctorName, "i") }
      : {};
    let doctor = await Doctor.findOne(doctorQuery);
    if (!doctor) doctor = await Doctor.findOne(); // fallback: pehla available doctor

    const clash = await Appointment.findOne({
      doctorId: doctor._id,
      dateTime: new Date(input.dateTime),
      status: "booked",
    });
    if (clash) return { error: "Ye slot abhi abhi book ho gaya, dusra time batayein" };

    const appointment = await Appointment.create({
      patientId: patient._id,
      doctorId: doctor._id,
      dateTime: new Date(input.dateTime),
      source: "chat",
    });

    return {
      success: true,
      confirmation: `Appointment confirm: ${patient.name} with ${doctor.name} on ${input.dateTime}`,
      appointmentId: appointment._id,
    };
  }

  if (name === "get_clinic_info") {
    return {
      clinicName: clinic.name,
      timings: "Mon-Sat, 10am - 6pm",
      status: clinic.status,
    };
  }

  return { error: "Unknown function" };
}

/**
 * Ek user message process karta hai aur LLM se reply generate karta hai.
 * Agar LLM koi tool/function call kare to usay execute kar ke result
 * LLM ko wapas bhejta hai taake wo final natural-language jawab de.
 *
 * @param {string} userMessage
 * @param {Array} conversationHistory - pichli messages [{role, content}]
 * @param {Object} models - tenant models (Patient, Doctor, Appointment, ...)
 * @param {Object} clinic - clinic document (master DB se)
 */
async function handleReceptionistMessage(userMessage, conversationHistory, models, clinic) {
  const systemPrompt = `Aap ${clinic.name} clinic ki AI receptionist hain. Aapka kaam hai:
- Patients ko appointment book karne mein madad karna
- Available slots batana
- Clinic ki general info dena
Hamesha polite aur professional tareeqe se baat karein. Agar patient ka naam/phone number
na mila ho to booking se pehle poochein. Confirm hone se pehle date/time dohra kar confirm karein.`;

  const messages = [...conversationHistory, { role: "user", content: userMessage }];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  // Jab tak LLM function call karta rahe, usay execute kar ke result wapas bhejte rahein
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of toolUseBlocks) {
      const result = await executeFunction(block.name, block.input, models, clinic);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find((b) => b.type === "text");
  return {
    reply: textBlock ? textBlock.text : "Maazrat, kuch masla hua.",
    updatedHistory: messages.concat([{ role: "assistant", content: response.content }]),
  };
}

module.exports = { handleReceptionistMessage };

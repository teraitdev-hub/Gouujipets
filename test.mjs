const notes = `Payment ID: pay_demo_1784101876154\n\nSpecial Instructions:\n[INTAKE_JSON]{"ownerName":"rish"}[/INTAKE_JSON]`;
const notesParts = notes.split("Special Instructions:");
let specialInstructions = notesParts[1] ? notesParts[1].trim() : "";
let intakeData = null;

if (specialInstructions.includes("[INTAKE_JSON]")) {
  const startIdx = specialInstructions.indexOf("[INTAKE_JSON]") + 13;
  const endIdx = specialInstructions.indexOf("[/INTAKE_JSON]");
  if (endIdx > -1) {
    try {
      intakeData = JSON.parse(specialInstructions.substring(startIdx, endIdx));
    } catch (e) {
      console.error(e);
    }
  }
}
console.log("DATA:", intakeData);

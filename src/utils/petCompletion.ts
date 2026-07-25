/**
 * Pet Profile Completion Calculator
 * 
 * Computes how complete a pet profile is, field-by-field,
 * inspired by LinkedIn's profile strength model.
 * 
 * Each field has a weight so critical fields count more.
 */

export interface CompletionField {
  key: string;
  label: string;
  category: "basic" | "health" | "care" | "security";
  weight: number;
  filled: boolean;
  hint: string;
  icon: string;
}

export interface PetCompletionResult {
  percentage: number;
  level: "Starter" | "Good" | "Advanced" | "Expert" | "All Star";
  levelColor: string;
  levelBg: string;
  levelEmoji: string;
  fields: CompletionField[];
  filledCount: number;
  totalCount: number;
  missingCritical: CompletionField[];
  nextSuggestion: CompletionField | null;
}

const isEmpty = (val: any): boolean => {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") return val.trim() === "";
  if (typeof val === "boolean") return !val;
  return false;
};

export const computePetCompletion = (pet: any): PetCompletionResult => {
  const FIELDS: Omit<CompletionField, "filled">[] = [
    // === BASIC (40%) ===
    { key: "name",    label: "Pet Name",    category: "basic",    weight: 10, hint: "Give your pet a name",              icon: "🐾" },
    { key: "species", label: "Species",     category: "basic",    weight: 8,  hint: "Select the pet species",            icon: "🐶" },
    { key: "breed",   label: "Breed",       category: "basic",    weight: 7,  hint: "Specify the breed",                 icon: "📋" },
    { key: "gender",  label: "Gender",      category: "basic",    weight: 5,  hint: "Set gender (Male / Female)",        icon: "⚥" },
    { key: "dob",     label: "Date of Birth", category: "basic",  weight: 5,  hint: "Add your pet's birthday",          icon: "🎂" },
    { key: "weight",  label: "Weight (kg)", category: "basic",    weight: 5,  hint: "Log the current weight",           icon: "⚖️" },

    // === HEALTH (30%) ===
    { key: "medical_history",   label: "Medical History",   category: "health",  weight: 10, hint: "Describe any health conditions",          icon: "🏥" },
    { key: "allergies",         label: "Allergies",          category: "health",  weight: 8,  hint: "List known allergies or write 'None'",    icon: "⚠️" },
    { key: "vaccination_report",label: "Vaccination Report", category: "health",  weight: 7,  hint: "Add recent vaccination details",          icon: "💉" },
    { key: "next_vaccination_date", label: "Next Vaccine Due", category: "health", weight: 5, hint: "Schedule the next vaccine date",         icon: "📅" },

    // === CARE (20%) ===
    { key: "food_preferences",  label: "Food Preferences",  category: "care",    weight: 8,  hint: "Describe diet / preferred food brands",   icon: "🥗" },
    { key: "skin_details",      label: "Skin Sensitivities", category: "care",   weight: 6,  hint: "Note any skin conditions or triggers",    icon: "🧴" },
    { key: "ideal_temperature", label: "Ideal Temperature", category: "care",    weight: 6,  hint: "Specify comfortable temperature range",   icon: "🌡️" },

    // === SECURITY (10%) ===
    { key: "behavior_notes",    label: "Behavior Notes",    category: "security", weight: 6,  hint: "Describe general behavior and habits",   icon: "😊" },
    { key: "aggression_triggers", label: "Aggression Triggers", category: "security", weight: 2, hint: "Document any aggression triggers", icon: "⚡" },
    { key: "calming_methods",   label: "Calming Methods",   category: "security", weight: 2,  hint: "How does your pet calm down?",          icon: "🕊️" },
  ];

  const filledFields: CompletionField[] = FIELDS.map(f => ({
    ...f,
    filled: !isEmpty(pet?.[f.key]),
  }));

  const totalWeight = filledFields.reduce((sum, f) => sum + f.weight, 0);
  const earnedWeight = filledFields.filter(f => f.filled).reduce((sum, f) => sum + f.weight, 0);
  const percentage = Math.round((earnedWeight / totalWeight) * 100);

  let level: PetCompletionResult["level"];
  let levelColor: string;
  let levelBg: string;
  let levelEmoji: string;
  if (percentage === 100) {
    level = "All Star"; levelColor = "text-purple-950 font-black"; levelBg = "bg-purple-100 border-purple-300 shadow-xs"; levelEmoji = "⭐";
  } else if (percentage >= 80) {
    level = "Expert";   levelColor = "text-purple-900"; levelBg = "bg-purple-100/80 border-purple-300"; levelEmoji = "🏆";
  } else if (percentage >= 60) {
    level = "Advanced"; levelColor = "text-purple-800"; levelBg = "bg-purple-50 border-purple-200"; levelEmoji = "🚀";
  } else if (percentage >= 35) {
    level = "Good";     levelColor = "text-purple-700"; levelBg = "bg-purple-50/70 border-purple-200"; levelEmoji = "👍";
  } else {
    level = "Starter";  levelColor = "text-purple-600"; levelBg = "bg-purple-50/40 border-purple-100"; levelEmoji = "🌱";
  }

  const missingCritical = filledFields.filter(f => !f.filled && f.weight >= 7);
  const nextSuggestion = filledFields.find(f => !f.filled) ?? null;

  return {
    percentage,
    level,
    levelColor,
    levelBg,
    levelEmoji,
    fields: filledFields,
    filledCount: filledFields.filter(f => f.filled).length,
    totalCount: filledFields.length,
    missingCritical,
    nextSuggestion,
  };
};

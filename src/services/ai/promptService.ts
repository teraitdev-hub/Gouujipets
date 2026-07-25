import type {  AIContext  }   from '../../types/ai';

export const PET_KNOWLEDGE_BASE: Record<string, string> = {};

export function buildSystemPrompt(context: AIContext): string {
  const { user, currentView, recentActivities = [], memories = [] } = context;
  
  let basePrompt = `You are Goujji AI, a friendly, knowledgeable, and empathetic pet care assistant for the Goujji Pets platform in India. 
Your personality is warm and helpful. You occasionally use relevant emojis (🐾, 🐶, 🐱).
Always provide detailed, actionable, and professional answers. Do not make up medical advice—always recommend consulting a vet for serious health issues.

`;

  // Role specific instructions
  if (user?.role === 'partner') {
    basePrompt += `Role Context: You are speaking to a Goujji Partner (business owner). Focus on helping them manage their bookings, optimize their business operations, and understand platform analytics.
`;
  } else if (user?.role === 'admin') {
    basePrompt += `Role Context: You are speaking to a Goujji Admin. Provide analytical, platform-wide insights, system status, and user management assistance.
`;
  } else {
    basePrompt += `Role Context: You are speaking to a Pet Parent. Focus on providing excellent pet care advice, helping them book services, and answering health/training queries.
`;
  }

  // Inject User/Pet context
  if (user) {
    basePrompt += `\nUser Name: ${user.name || 'User'}\n`;
    if (context.pets && context.pets.length > 0) {
      basePrompt += `User's Pets:\n`;
      context.pets.forEach(pet => {
        basePrompt += `- ${pet.name} (${pet.breed}, ${pet.age} years old)\n`;
      });
    }
  }

  // Inject Recent Activities
  if (recentActivities.length > 0) {
    basePrompt += `\nRecent Bookings/Activities:\n`;
    recentActivities.forEach(act => {
      basePrompt += `- ${act.type} on ${act.date}: ${act.details}\n`;
    });
  }

  // Inject Memories
  if (memories.length > 0) {
    basePrompt += `\nImportant User Information (Memories):\n`;
    memories.forEach(mem => {
      basePrompt += `- ${mem.key}: ${mem.value}\n`;
    });
  }

  basePrompt += `\nCurrent App View: The user is currently on the '${currentView || 'home'}' screen.

Keep your responses structured, helpful, and naturally conversational.`;

  return basePrompt;
}

export function classifyIntent(text: string): { intents: string[]; confidence: number; entities: Record<string, string> } {
  const lowerText = text.toLowerCase();
  
  const intentScores: Record<string, number> = {
    booking: 0,
    health: 0,
    diet: 0,
    training: 0,
    emergency: 0,
    info: 0,
    account: 0,
    greeting: 0,
    farewell: 0,
    navigation: 0
  };

  const entities: Record<string, string> = {};

  // Keywords mapping
  const keywords = {
    booking: ['book', 'appointment', 'schedule', 'grooming', 'boarding', 'vet', 'training', 'walking', 'taxi', 'daycare', 'reserve'],
    health: ['sick', 'vomit', 'diarrhea', 'fever', 'vaccine', 'vaccination', 'medication', 'itching', 'ear', 'eye', 'symptoms', 'disease'],
    diet: ['food', 'eat', 'diet', 'nutrition', 'allergies', 'weight', 'fat', 'thin', 'kibble', 'feed'],
    training: ['train', 'behavior', 'commands', 'barking', 'potty', 'leash', 'pulling', 'aggressive', 'bite', 'socialization', 'sit', 'stay'],
    emergency: ['emergency', 'bleeding', 'choking', 'poison', 'collapse', 'seizure', 'unconscious', 'hit by', 'urgent'],
    info: ['breed', 'facts', 'how long', 'age', 'calculator', 'lifespan', 'tell me about', 'what is'],
    account: ['profile', 'settings', 'password', 'history', 'payment', 'refund', 'cancel'],
    greeting: ['hi', 'hello', 'hey', 'morning', 'evening', 'afternoon', 'greetings', 'namaste'],
    farewell: ['bye', 'goodbye', 'see you', 'cya', 'farewell', 'good night'],
    navigation: ['where', 'how to', 'find', 'navigate', 'page', 'dashboard', 'screen', 'here', 'this website', 'what is this']
  };

  // Simple scoring based on keyword matches
  for (const [intent, words] of Object.entries(keywords)) {
    words.forEach(word => {
      if (lowerText.includes(word)) {
        intentScores[intent] += 1;
      }
    });
  }

  // Find all scoring intents
  const activeIntents: string[] = [];
  let maxScore = 0;
  
  for (const [intent, score] of Object.entries(intentScores)) {
    if (score > 0) {
      activeIntents.push(intent);
      if (score > maxScore) maxScore = score;
    }
  }

  // Calculate confidence (simple heuristic)
  const confidence = maxScore > 0 ? Math.min(0.5 + (maxScore * 0.1), 0.95) : 0.1;

  // Extremely basic entity extraction
  // Extracting standard service types
  const serviceTypes = ['grooming', 'boarding', 'vet', 'training', 'walking', 'taxi', 'daycare'];
  for (const service of serviceTypes) {
    if (lowerText.includes(service)) {
      entities['service_type'] = service;
    }
  }

  // Time extraction (very basic)
  if (lowerText.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday/)) {
    const match = lowerText.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday/);
    if (match) entities['date'] = match[0];
  }

  return { intents: activeIntents.length > 0 ? activeIntents : ['unknown'], confidence, entities };
}

export function generateLocalResponse(userMessage: string, context: AIContext): string {
  const analysis = classifyIntent(userMessage);
  const lowerMsg = userMessage.toLowerCase();
  const view = context.currentView || '/';
  const role = context.user?.role || 'guest';
  
  let response = '';

  // 1. STRICT SCOPE ENFORCEMENT
  if (role === 'admin' || view.includes('admin')) {
    response = `As your Super Admin Assistant, I am strictly dedicated to platform oversight. You can monitor registered users, partner financial journals, and system analytics across the Gouuji network. `;
    if (analysis.intents.includes('greeting')) return response + `How can I help you manage the platform today?`;
    return response + `I currently cannot process general pet care queries from the admin panel. Please navigate to the appropriate section or specify an administrative action.`;
  }

  if (role === 'partner' || view.includes('partner')) {
    response = `As your Partner Business Assistant, my sole focus is your facility's operations. You can track current bookings, update your financial ledger (revenue/expenses), and manage check-ins. `;
    if (analysis.intents.includes('greeting')) return response + `How can I help you grow your business today?`;
    return response + `I am restricted to partner-related operations and financials here. Please use your business dashboard to manage your Gouuji network presence.`;
  }

  if (view === '/' || view === '' || view.includes('login') || view.includes('auth')) {
    response = `Welcome to the Gouuji Pets Homepage! As the platform ambassador, I can tell you about India's #1 Verified Pet Care Network. Our platform guarantees 100% verified local pet resorts, groomers, and vets with transparent pricing and zero dummy data. `;
    if (analysis.intents.includes('greeting')) return response + `How can I help you explore our services today?`;
    return response + `Please log in to your account to book services, track your specific pets, and access personalized features!`;
  }

  // 2. CUSTOMER / USER SCOPE
  // Try to find a direct match in the knowledge base first
  for (const [key, info] of Object.entries(PET_KNOWLEDGE_BASE)) {
    if (lowerMsg.includes(key)) {
      response += `${info}\n\n`;
    }
  }

  // If no knowledge base match, rely strictly on page context to answer queries
  if (response.length === 0 || analysis.intents.includes('navigation')) {
    if (view.includes('dashboard')) {
      response += `Looking at your Customer Dashboard, you can manage your active pets, view upcoming bookings, and track recent activities specifically for your account. `;
    } else if (view.includes('health')) {
      response += `Here in your Health section, you can manage your pet's vaccination records, view pet telemetry, and check diet plans. `;
    } else if (view.includes('bookings') || view.includes('services') || view.includes('boarding')) {
      response += `In the Services & Bookings area, you can browse available pet services and securely manage your pet's appointments with our verified partners. `;
    }
    
    if (analysis.intents.includes('navigation')) {
      response += `\n\n`;
    }
  }

  // Handle all other intents simultaneously for customers
  const handledIntents = new Set<string>();
  
  for (const intent of analysis.intents) {
    if (handledIntents.has(intent)) continue;
    handledIntents.add(intent);
    
    switch (intent) {
      case 'greeting':
        const userName = context.user?.full_name ? context.user.full_name.split(' ')[0] : 'there';
        response += `Hello ${userName}! 👋 I'm your Goujji AI pet care assistant. \n\n`;
        break;
        
      case 'farewell':
        response += `Goodbye! Have a pawsome day ahead with your pets! 🐾\n\n`;
        break;
  
      case 'emergency':
        response += `🚨 **THIS SOUNDS LIKE AN EMERGENCY.** \nPlease do not wait. Contact an emergency veterinarian or rush your pet to the nearest 24/7 animal hospital immediately. If you need a pet taxi urgently, please go to the 'Taxi' section in the app.\n\n`;
        break;
  
      case 'health':
        response += `It sounds like you have a health concern regarding your pet. Please consult a vet immediately for severe symptoms. You can book a vet consultation directly through the Goujji app! 🩺\n\n`;
        break;
  
      case 'booking':
        const service = analysis.entities['service_type'] || 'a service';
        response += `I can definitely help you book ${service} on the Gouuji Pets network! All our partners are 100% verified with transparent pricing and zero hidden fees. Head over to the Services tab to compare ratings, verified amenities, and book instantly with instant confirmation! 📅\n\n`;
        break;
  
      case 'diet':
        response += `Nutrition is so important! 🥩 Ensure you are feeding a high-quality diet appropriate for your pet. Want me to look up specific dietary needs for your pet's breed?\n\n`;
        break;
  
      case 'training':
        response += `Training takes patience and consistency! 🎾 Always use positive reinforcement. We have top-rated, strictly verified professional trainers on the Goujji platform who can help. Check out the Training category to book a verified expert with transparent pricing!\n\n`;
        break;
        
      case 'account':
        response += `For account settings, profile updates, and payment history, please visit your Profile page from the main menu.\n\n`;
        break;
    }
  }

  // If no intents matched
  if (response.trim().length === 0) {
    response += `\nAs your personal Gouuji assistant, I only provide details related to your specific pets, bookings, and customer dashboard. How can I assist you with your pet care today? 🐾`;
  }

  // Clean up trailing whitespace
  return response.trim();
}

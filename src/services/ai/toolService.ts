import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type {  AITool, AIToolCall, AIToolResult  }   from '../../types/ai';

export const AI_TOOLS: AITool[] = [
  {
    name: 'searchFacilities',
    description: 'Search businesses by type (boarding/grooming/veterinary/training) and city.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Business type (boarding, grooming, veterinary, training)' },
        city: { type: 'string', description: 'City name' }
      },
      required: ['type']
    }
  },
  {
    name: 'getBookingHistory',
    description: 'Get the user\'s past and upcoming bookings.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getPetInfo',
    description: 'Get information about the user\'s pets.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'getVaccinationSchedule',
    description: 'Get upcoming vaccinations for the user\'s pets.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'createBooking',
    description: 'Create a new booking in Firestore.',
    parameters: {
      type: 'object',
      properties: {
        business_id: { type: 'string' },
        check_in: { type: 'string' },
        check_out: { type: 'string' },
        pet_count: { type: 'number' },
        service_type: { type: 'string' }
      },
      required: ['business_id', 'check_in', 'check_out', 'pet_count', 'service_type']
    }
  },
  {
    name: 'getNearbyVets',
    description: 'Search for nearby veterinary businesses.',
    parameters: {
      type: 'object',
      properties: {
        city: { type: 'string' }
      }
    }
  },
  {
    name: 'getHealthRecords',
    description: 'Get health records for the user\'s pets.',
    parameters: { type: 'object', properties: {} }
  }
];

export async function executeTool(toolCall: AIToolCall, userId: string): Promise<AIToolResult> {
  const { name, arguments: args } = toolCall;
  const toolName = name || toolCall.function?.name;
  const toolArgs = args || (toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {});

  try {
    let data: any = null;

    switch (toolName) {
      case 'searchFacilities': {
        const { type, city } = toolArgs;
        const constraints = [where('type', '==', type)];
        if (city) constraints.push(where('city', '==', city));
        
        const q = query(collection(db, 'businesses'), ...constraints, limit(10));
        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        break;
      }
      
      case 'getBookingHistory': {
        const q = query(collection(db, 'bookings'), where('customer_id', '==', userId), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        break;
      }
      
      case 'getPetInfo': {
        const q = query(collection(db, 'pets'), where('owner_id', '==', userId));
        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        break;
      }
      
      case 'getVaccinationSchedule': {
        const q = query(collection(db, 'health_records_and_reminders'), where('owner_id', '==', userId), where('type', '==', 'vaccination'));
        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        break;
      }
      
      case 'createBooking': {
        const { business_id, check_in, check_out, pet_count, service_type } = toolArgs;
        const newBooking = {
          customer_id: userId,
          business_id,
          check_in,
          check_out,
          pet_count,
          service_type,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'bookings'), newBooking);
        data = { id: docRef.id, ...newBooking };
        break;
      }
      
      case 'getNearbyVets': {
        const city = toolArgs.city;
        const constraints = [where('type', '==', 'veterinary')];
        if (city) constraints.push(where('city', '==', city));
        
        const q = query(collection(db, 'businesses'), ...constraints, limit(10));
        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        break;
      }
      
      case 'getHealthRecords': {
        const q = query(collection(db, 'health_records_and_reminders'), where('owner_id', '==', userId));
        const snapshot = await getDocs(q);
        data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        break;
      }
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      toolCallId: toolCall.id,
      toolName: toolName || 'unknown',
      name: toolName,
      success: true,
      data
    };
  } catch (error: any) {
    console.error(`Error executing tool ${toolName}:`, error);
    return {
      toolCallId: toolCall.id,
      toolName: toolName || 'unknown',
      name: toolName,
      success: false,
      error: error.message || 'Unknown error occurred while executing tool.'
    };
  }
}

export function formatToolResult(result: AIToolResult): string {
  if (!result.success) {
    return `Failed to execute ${result.name}: ${result.error}`;
  }

  const { name, data } = result;
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return `I performed the action ${name}, but no results were found.`;
  }

  // Basic formatting based on tool name
  switch (name) {
    case 'searchFacilities':
    case 'getNearbyVets':
      return `Found ${data.length} facilities:\n${data.map((f: any) => `- ${f.name} in ${f.city}`).join('\n')}`;
      
    case 'getBookingHistory':
      return `Found ${data.length} bookings:\n${data.map((b: any) => `- ${b.service_type} on ${b.check_in} (Status: ${b.status})`).join('\n')}`;
      
    case 'getPetInfo':
      return `Found ${data.length} pets:\n${data.map((p: any) => `- ${p.name} (${p.species}, ${p.breed})`).join('\n')}`;
      
    case 'getVaccinationSchedule':
    case 'getHealthRecords':
      return `Found ${data.length} records:\n${data.map((r: any) => `- ${r.record_name || r.type} on ${r.date || r.due_date}`).join('\n')}`;
      
    case 'createBooking':
      return `Successfully created a booking with ID: ${data.id}.`;
      
    default:
      return JSON.stringify(data, null, 2);
  }
}

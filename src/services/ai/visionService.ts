import type {
  VisionAnalysisResult,
  ImageAnalysisType,
  PetVisionAnalysis,
  DocumentVisionAnalysis,
  PetHealthIssue
} from '../../types/ai';

/**
 * Mock preset datasets for simulating realistic vision analysis outputs.
 */
const MOCK_PET_ANALYSES: PetVisionAnalysis[] = [
  {
    detectedSpecies: 'Canine (Dog)',
    detectedBreed: 'Golden Retriever',
    breedConfidence: 0.96,
    estimatedAgeRange: '2 - 4 years',
    physicalTraits: ['Golden double coat', 'Floppy ears', 'Friendly posture', 'Bright clear eyes', 'Healthy wet nose'],
    healthAssessment: {
      overallStatus: 'healthy',
      summary: 'The dog appears in excellent overall health with a shiny, well-groomed coat and clear eyes.',
      potentialIssues: [
        {
          severity: 'low',
          condition: 'Mild Tear Staining',
          description: 'Minor reddish staining around the inner corners of eyes.',
          recommendation: 'Wipe gently daily with a damp warm cloth. Ensure clean drinking water.'
        }
      ],
      careRecommendations: [
        'Regular coat brushing twice a week to manage shedding',
        'Daily moderate-to-high exercise (45-60 mins)',
        'Schedule annual routine health checkup & booster shots'
      ]
    }
  },
  {
    detectedSpecies: 'Canine (Dog)',
    detectedBreed: 'French Bulldog',
    breedConfidence: 0.92,
    estimatedAgeRange: '1 - 3 years',
    physicalTraits: ['Brachycephalic snout', 'Bat ears', 'Compact muscular build', 'Short coat'],
    healthAssessment: {
      overallStatus: 'attention_needed',
      summary: 'Pet exhibits typical breed traits. Facial skin folds show slight redness requiring gentle cleaning.',
      potentialIssues: [
        {
          severity: 'medium',
          condition: 'Facial Fold Moisture / Irritation',
          description: 'Mild redness detected inside facial skin creases.',
          recommendation: 'Clean fold creases daily with antiseptic vet-approved wipes and keep area dry.'
        },
        {
          severity: 'low',
          condition: 'Heat Sensitivity Risk',
          description: 'Brachycephalic breed prone to overheating during high temperatures.',
          recommendation: 'Avoid vigorous exercise during peak sunny hours. Provide air-conditioned shelter.'
        }
      ],
      careRecommendations: [
        'Maintain strictly controlled dietary weight to avoid joint and breathing stress',
        'Daily facial crease hygiene maintenance',
        'Use a chest harness instead of a collar to avoid trachea pressure'
      ]
    }
  },
  {
    detectedSpecies: 'Feline (Cat)',
    detectedBreed: 'Domestic Shorthair (Tabby)',
    breedConfidence: 0.94,
    estimatedAgeRange: '3 - 5 years',
    physicalTraits: ['Classic tabby pattern', 'Alert upright ears', 'Green almond-shaped eyes', 'Lean body condition'],
    healthAssessment: {
      overallStatus: 'healthy',
      summary: 'Alert and healthy feline showing good body condition score and clean coat.',
      potentialIssues: [
        {
          severity: 'low',
          condition: 'Minor Dental Plaque',
          description: 'Slight yellow buildup near upper rear molars.',
          recommendation: 'Introduce feline dental treats or weekly toothpaste cleaning.'
        }
      ],
      careRecommendations: [
        'Encourage water intake via pet fountain',
        'Interactive toys for daily mental stimulation',
        'Regular flea & tick preventative treatments'
      ]
    }
  }
];

const MOCK_DOCUMENT_ANALYSES: DocumentVisionAnalysis[] = [
  {
    documentType: 'vaccination_record',
    title: 'Veterinary Vaccination & Immunization Record',
    summary: 'Official veterinary certificate detailing core vaccines including Rabies and DHPP.',
    extractedInfo: {
      petName: 'Max',
      ownerName: 'Sarah Jenkins',
      vetClinic: 'Metro Pet Wellness Center',
      date: '2026-03-15',
      dueDate: '2027-03-15',
      vaccinesOrTreatments: [
        'Rabies 3-Year Vaccine (Given: 2026-03-15, Expires: 2029-03-15)',
        'DHPP Booster (Given: 2026-03-15, Next Due: 2027-03-15)',
        'Bordetella Intranasal (Given: 2026-03-15, Next Due: 2027-03-15)'
      ],
      medications: [
        { name: 'Heartgard Plus', dosage: '25-50 lbs', frequency: 'Monthly' }
      ],
      totalAmount: '$120.00'
    },
    keyActionItems: [
      'Schedule DHPP & Bordetella annual booster before March 15, 2027',
      'Administer monthly Heartgard chewable on the 1st of every month',
      'Keep Rabies Tag ID stored in pet profile'
    ]
  },
  {
    documentType: 'vet_invoice',
    title: 'Clinical Examination & Medical Receipt',
    summary: 'Itemized invoice for annual wellness examination, microchip registration, and routine blood panel.',
    extractedInfo: {
      petName: 'Bella',
      ownerName: 'Alex Morgan',
      vetClinic: 'Paws & Care Veterinary Clinic',
      date: '2026-06-10',
      dueDate: 'Paid in Full',
      vaccinesOrTreatments: [
        'Comprehensive Physical Exam',
        'Feline Leukemia (FeLV) Screening - Negative',
        'Microchip Placement & Global Registry Entry'
      ],
      medications: [
        { name: 'Revolution Plus Feline', dosage: '5.6 - 11 lbs', frequency: 'Monthly topical' }
      ],
      totalAmount: '$185.50'
    },
    keyActionItems: [
      'Confirm microchip registration details online at PetLink',
      'Next routine bloodwork scheduled for June 2027'
    ]
  }
];

/**
 * Analyzes an image (base64 string or URL) and returns structured AI vision & document insights.
 * Simulated with a realistic asynchronous network delay.
 *
 * @param imageSource Base64 string, Object URL, or HTTP image URL
 * @param typeHint Optional hint to force 'pet_photo', 'document', or 'auto' detection
 */
export async function analyzeImage(
  imageSource: string,
  typeHint: ImageAnalysisType = 'auto'
): Promise<VisionAnalysisResult> {
  if (!imageSource || imageSource.trim() === '') {
    throw new Error('Image source is required for vision analysis.');
  }

  // Simulate network & AI processing delay (1500ms - 2200ms)
  const processingDelay = Math.floor(Math.random() * 700) + 1500;
  await new Promise((resolve) => setTimeout(resolve, processingDelay));

  const lowerSrc = imageSource.toLowerCase();

  // Determine whether this resembles a document or a pet photo
  let isDoc = typeHint === 'document';
  if (typeHint === 'auto') {
    isDoc =
      lowerSrc.includes('doc') ||
      lowerSrc.includes('pdf') ||
      lowerSrc.includes('invoice') ||
      lowerSrc.includes('receipt') ||
      lowerSrc.includes('vaccine') ||
      lowerSrc.includes('text') ||
      lowerSrc.includes('paper');
  }

  const timestamp = new Date().toISOString();
  const id = `vision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (isDoc) {
    const docIndex = Math.floor(Math.random() * MOCK_DOCUMENT_ANALYSES.length);
    const docAnalysis = MOCK_DOCUMENT_ANALYSES[docIndex];

    return {
      id,
      analysisType: 'document',
      confidence: 0.95,
      summary: docAnalysis.summary,
      timestamp,
      documentAnalysis: docAnalysis,
      rawTags: ['document', 'medical_record', 'vet_certificate', 'text_ocr', 'vaccination'],
      imageUrl: imageSource.startsWith('data:') ? imageSource : undefined
    };
  } else {
    const petIndex = Math.floor(Math.random() * MOCK_PET_ANALYSES.length);
    const petAnalysis = MOCK_PET_ANALYSES[petIndex];

    return {
      id,
      analysisType: 'pet',
      confidence: petAnalysis.breedConfidence,
      summary: `${petAnalysis.detectedBreed} detected (${Math.round(petAnalysis.breedConfidence * 100)}% confidence). ${petAnalysis.healthAssessment.summary}`,
      timestamp,
      petAnalysis,
      rawTags: [
        petAnalysis.detectedSpecies.toLowerCase(),
        petAnalysis.detectedBreed.toLowerCase(),
        'pet_photo',
        petAnalysis.healthAssessment.overallStatus
      ],
      imageUrl: imageSource.startsWith('data:') ? imageSource : undefined
    };
  }
}

/**
 * Helper to convert a browser File object to a Base64 string.
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Validates if a file is an acceptable image or document file type.
 */
export function isImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  return validTypes.includes(file.type);
}

/**
 * Helper to generate a concise Markdown or text summary of an analysis result.
 */
export function formatAnalysisSummary(result: VisionAnalysisResult): string {
  if (result.analysisType === 'pet' && result.petAnalysis) {
    const p = result.petAnalysis;
    return `**Species:** ${p.detectedSpecies}\n**Breed:** ${p.detectedBreed} (${Math.round(p.breedConfidence * 100)}%)\n**Age Estimate:** ${p.estimatedAgeRange}\n**Status:** ${p.healthAssessment.overallStatus.toUpperCase()}\n\n${p.healthAssessment.summary}`;
  }

  if (result.analysisType === 'document' && result.documentAnalysis) {
    const d = result.documentAnalysis;
    return `**Document:** ${d.title}\n**Clinic:** ${d.extractedInfo.vetClinic || 'N/A'}\n**Date:** ${d.extractedInfo.date || 'N/A'}\n\n${d.summary}`;
  }

  return result.summary;
}

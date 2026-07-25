import React from "react";
import { ShieldCheck, HeartPulse, Activity, User, Phone, Info } from "lucide-react";

export interface PetIntakeData {
  ownerName: string;
  ownerPhone: string;
  behavior: string;
  diet: string;
  temperature: string;
  aggressionTriggers: string;
  calmingMethods: string;
  skinDetails: string;
  healthIssues: string;
  vaccinationReport: string;
  nextVaccinationDate: string;
  vetServiceRequired: boolean;
  securityMeasures: string;
}

interface PetIntakeFormProps {
  data: PetIntakeData;
  onChange: (data: PetIntakeData) => void;
}

export const PetIntakeForm: React.FC<PetIntakeFormProps> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      onChange({ ...data, [name]: (e.target as HTMLInputElement).checked });
    } else {
      onChange({ ...data, [name]: value });
    }
  };

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

  return (
    <div className="space-y-6">
      {/* Owner Info */}
      <div className="bg-purple-50/50 p-4 sm:p-5 rounded-2xl border border-purple-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User size={18} className="text-purple-600" /> Owner Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Owner Name *</label>
            <input required type="text" name="ownerName" value={data.ownerName} onChange={handleChange} className={inputClass} placeholder="Full Name" />
          </div>
          <div>
            <label className={labelClass}>Emergency Phone *</label>
            <input required type="tel" name="ownerPhone" value={data.ownerPhone} onChange={handleChange} className={inputClass} placeholder="+91 9876543210" />
          </div>
        </div>
      </div>

      {/* Health & Care Essentials */}
      <div>
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <HeartPulse size={18} className="text-purple-500" /> Essential Health & Care
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Diet / What it eats *</label>
            <textarea required name="diet" value={data.diet} onChange={handleChange} className={`${inputClass} min-h-[80px] resize-y`} placeholder="Specific food brands, allergies, feeding times..." />
          </div>
          <div>
            <label className={labelClass}>Health Issues *</label>
            <textarea required name="healthIssues" value={data.healthIssues} onChange={handleChange} className={`${inputClass} min-h-[80px] resize-y`} placeholder="Any ongoing medical conditions? (Type 'None' if healthy)" />
          </div>
        </div>
      </div>
    </div>
  );
};


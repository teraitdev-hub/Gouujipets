import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  X,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Activity,
  Copy,
  Check,
  ImageIcon,
  ArrowRight,
  Info
} from 'lucide-react';
import type { VisionAnalysisResult, ImageAnalysisType } from '../../types/ai';
import { analyzeImage, fileToBase64, isImageFile } from '../../services/ai/visionService';

export interface ImageUploadProps {
  onAnalysisComplete?: (result: VisionAnalysisResult) => void;
  className?: string;
  defaultTypeHint?: ImageAnalysisType;
  showSampleButtons?: boolean;
}

// Sample demo images for instant user testing
const SAMPLE_IMAGES = [
  {
    label: '🐶 Dog Photo',
    type: 'pet_photo' as ImageAnalysisType,
    url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    description: 'Golden Retriever breed scan'
  },
  {
    label: '🐱 Cat Photo',
    type: 'pet_photo' as ImageAnalysisType,
    url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    description: 'Tabby Cat health scan'
  },
  {
    label: '📄 Vet Vaccine Record',
    type: 'document' as ImageAnalysisType,
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80',
    description: 'Vaccination certificate OCR'
  }
];

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onAnalysisComplete,
  className = '',
  defaultTypeHint = 'auto',
  showSampleButtons = true
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [typeHint, setTypeHint] = useState<ImageAnalysisType>(defaultTypeHint);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStepIndex, setScanStepIndex] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<VisionAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const scanSteps = [
    'Initialising AI Vision Model...',
    'Extracting physical traits & key markings...',
    'Running health & clinical risk assessment...',
    'Structuring diagnostic recommendations...'
  ];

  // Handle File Selection
  const handleFile = useCallback(async (file: File) => {
    if (!isImageFile(file)) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, WEBP) or PDF document.');
      return;
    }

    setErrorMsg(null);
    setAnalysisResult(null);

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileDetails({ name: file.name, size: `${sizeInMb} MB` });

    try {
      const base64 = await fileToBase64(file);
      setSelectedImage(base64);
    } catch (err) {
      console.error('Failed to read image file:', err);
      setErrorMsg('Failed to process image file. Please try another image.');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const selectSampleImage = (sample: (typeof SAMPLE_IMAGES)[0]) => {
    setErrorMsg(null);
    setAnalysisResult(null);
    setTypeHint(sample.type);
    setSelectedImage(sample.url);
    setFileDetails({ name: sample.description, size: 'Sample Data' });
  };

  const resetAll = () => {
    setSelectedImage(null);
    setFileDetails(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    setIsAnalyzing(false);
    setScanStepIndex(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Run AI Analysis Simulation
  const triggerAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setScanStepIndex(0);

    // Step progress interval
    const stepInterval = setInterval(() => {
      setScanStepIndex((prev) => (prev < scanSteps.length - 1 ? prev + 1 : prev));
    }, 450);

    try {
      const result = await analyzeImage(selectedImage, typeHint);
      clearInterval(stepInterval);
      setAnalysisResult(result);
      setIsAnalyzing(false);

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setErrorMsg(err.message || 'Vision analysis failed. Please try again.');
    }
  };

  const copyResultSummary = () => {
    if (!analysisResult) return;
    const textToCopy = analysisResult.summary;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative w-full max-w-4xl mx-auto rounded-3xl bg-white/75 dark:bg-slate-900/85 backdrop-blur-xl border border-white/30 dark:border-slate-800/80 shadow-2xl overflow-hidden p-6 sm:p-8 transition-all duration-300 ${className}`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-200/60 dark:border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5 mr-1 animate-pulse" />
              Phase 2: Vision & OCR AI
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mt-1">
            Goujji Pet Image & Document AI
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Upload pet photos for breed & health analysis, or vet records for smart OCR extraction.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-gray-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTypeHint('auto')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              typeHint === 'auto'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Auto Detect
          </button>
          <button
            type="button"
            onClick={() => setTypeHint('pet_photo')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              typeHint === 'pet_photo'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Pet Photo
          </button>
          <button
            type="button"
            onClick={() => setTypeHint('document')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              typeHint === 'document'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Doc OCR
          </button>
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Upload / Preview Area */}
      {!selectedImage ? (
        <div className="space-y-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative group cursor-pointer border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-300 flex flex-col items-center justify-center min-h-[280px] ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-gray-300/80 dark:border-slate-700/80 bg-gray-50/50 dark:bg-slate-800/30 hover:border-emerald-500/60 hover:bg-emerald-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleInputChange}
              className="hidden"
            />

            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4 border border-emerald-500/20 shadow-inner"
            >
              <Upload className="w-8 h-8" />
            </motion.div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Drag & Drop pet photo or document here
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md">
              Supports JPEG, PNG, WEBP images or PDF files up to 10MB for instant AI identification & health scan.
            </p>

            <div className="mt-6 flex items-center space-x-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-white/80 dark:bg-slate-800/80 px-4 py-2 rounded-full border border-gray-200/80 dark:border-slate-700/80 shadow-sm">
              <Camera className="w-4 h-4" />
              <span>Or click to browse from device</span>
            </div>
          </div>

          {/* Quick Demo Samples */}
          {showSampleButtons && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">
                Try quick sample images
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_IMAGES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSampleImage(sample)}
                    className="flex items-center space-x-3 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 border border-gray-200/70 dark:border-slate-700/70 hover:border-emerald-500/40 transition-all text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-slate-700">
                      <img
                        src={sample.url}
                        alt={sample.label}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {sample.label}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-slate-400 truncate">
                        {sample.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Image Preview & Active Analysis Section */
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-black/90 border border-gray-200/50 dark:border-slate-800 shadow-xl max-h-[420px] flex items-center justify-center">
            <img
              src={selectedImage}
              alt="Selected Preview"
              className="max-h-[420px] w-full object-contain"
            />

            {/* Scanning Laser Overlay when Analyzing */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center z-20"
                >
                  {/* Laser Line */}
                  <motion.div
                    animate={{ top: ['5%', '90%', '5%'] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981]"
                  />

                  {/* Central Radar Pulse */}
                  <div className="relative flex items-center justify-center mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                      className="absolute w-24 h-24 rounded-full border-2 border-emerald-400"
                    />
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg">
                      <RefreshCw className="w-7 h-7 animate-spin" />
                    </div>
                  </div>

                  {/* Step Feedback Text */}
                  <div className="text-center px-4">
                    <div className="text-sm font-semibold text-emerald-400 tracking-wide">
                      {scanSteps[scanStepIndex]}
                    </div>
                    <div className="w-48 h-1.5 bg-slate-800 rounded-full mx-auto mt-3 overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-400 rounded-full"
                        animate={{ width: `${((scanStepIndex + 1) / scanSteps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Toolbar Overlay */}
            {!isAnalyzing && (
              <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                <button
                  type="button"
                  onClick={resetAll}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all shadow-md"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bottom Info Bar Overlay */}
            {!isAnalyzing && fileDetails && (
              <div className="absolute bottom-3 left-3 right-3 px-4 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-xs flex items-center justify-between z-10">
                <div className="flex items-center space-x-2 truncate">
                  <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="truncate font-medium">{fileDetails.name}</span>
                </div>
                <span className="text-slate-400 ml-2 flex-shrink-0">{fileDetails.size}</span>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          {!analysisResult && !isAnalyzing && (
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all"
              >
                Choose Different File
              </button>

              <button
                type="button"
                onClick={triggerAnalysis}
                className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2 transition-all transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Results Presentation */}
          <AnimatePresence>
            {analysisResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="space-y-6"
              >
                {/* Result Type Banner */}
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-gray-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500 text-white flex-shrink-0 shadow-md">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          {analysisResult.analysisType === 'pet' ? 'Pet Breed & Health Insights' : 'Document OCR Extraction'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                          {Math.round(analysisResult.confidence * 100)}% Confidence
                        </span>
                      </div>
                      <h4 className="text-lg font-bold mt-0.5">
                        {analysisResult.analysisType === 'pet' && analysisResult.petAnalysis
                          ? `${analysisResult.petAnalysis.detectedBreed} (${analysisResult.petAnalysis.detectedSpecies})`
                          : analysisResult.documentAnalysis?.title || 'Processed Document'}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copyResultSummary}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all self-start sm:self-auto"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Summary'}</span>
                  </button>
                </div>

                {/* Pet Specific Details */}
                {analysisResult.analysisType === 'pet' && analysisResult.petAnalysis && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Traits & Age */}
                    <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span>Physical Traits & Age</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-slate-300 font-medium">
                        Estimated Age: <span className="font-bold text-gray-900 dark:text-white">{analysisResult.petAnalysis.estimatedAgeRange}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {analysisResult.petAnalysis.physicalTraits.map((trait, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 shadow-2xs"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Health Assessment Status */}
                    <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold uppercase text-gray-500 dark:text-slate-400">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Health Status</span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                            analysisResult.petAnalysis.healthAssessment.overallStatus === 'healthy'
                              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}
                        >
                          {analysisResult.petAnalysis.healthAssessment.overallStatus.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                        {analysisResult.petAnalysis.healthAssessment.summary}
                      </p>
                    </div>

                    {/* Potential Issues */}
                    {analysisResult.petAnalysis.healthAssessment.potentialIssues.length > 0 && (
                      <div className="md:col-span-2 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Potential Observations & Care Notes</span>
                        </div>
                        <div className="space-y-2">
                          {analysisResult.petAnalysis.healthAssessment.potentialIssues.map((issue, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-amber-500/20 text-xs">
                              <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                <span>{issue.condition}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500/10 text-amber-600">
                                  {issue.severity} Priority
                                </span>
                              </div>
                              <p className="text-gray-600 dark:text-slate-300 mt-1">{issue.description}</p>
                              <p className="text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                                💡 Tip: {issue.recommendation}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document Specific Details */}
                {analysisResult.analysisType === 'document' && analysisResult.documentAnalysis && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase">Pet Name</div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                          {analysisResult.documentAnalysis.extractedInfo.petName || 'N/A'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase">Vet Clinic</div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                          {analysisResult.documentAnalysis.extractedInfo.vetClinic || 'N/A'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase">Date Recorded</div>
                        <div className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                          {analysisResult.documentAnalysis.extractedInfo.date || 'N/A'}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase">Due / Amount</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {analysisResult.documentAnalysis.extractedInfo.totalAmount || analysisResult.documentAnalysis.extractedInfo.dueDate || 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Extracted Vaccines / Treatments */}
                    {analysisResult.documentAnalysis.extractedInfo.vaccinesOrTreatments && (
                      <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-800/40 border border-gray-200/60 dark:border-slate-700/60 space-y-2">
                        <div className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <span>Extracted Vaccines & Clinical Procedures</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-gray-700 dark:text-slate-300">
                          {analysisResult.documentAnalysis.extractedInfo.vaccinesOrTreatments.map((v, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                              <span>{v}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Reset & Re-scan Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={resetAll}
                    className="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200 text-xs font-semibold border border-gray-200 dark:border-slate-700 transition-all flex items-center space-x-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Upload & Analyze Another Image</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

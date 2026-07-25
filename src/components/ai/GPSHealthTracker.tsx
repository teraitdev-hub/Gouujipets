import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Heart,
  Thermometer,
  Activity,
  BatteryCharging,
  Wifi,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Compass,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Navigation,
  Eye,
  AlertTriangle,
  Footprints,
  ChevronRight,
  Zap,
  Radio,
  BellRing,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { PetGPSLocation, ActivityType } from '../../types/ai';

// Interface for historical chart data points
interface VitalChartPoint {
  time: string;
  heartRate: number;
  temperature: number;
  speed: number;
}

// Initial Mock Pet Locations & Vitals
const INITIAL_PETS: PetGPSLocation[] = [
  {
    id: 'pet-1',
    petId: 'milo-01',
    petName: 'Milo',
    species: 'Dog',
    breed: 'Golden Retriever',
    collarId: 'GOUJJI-CL-8821',
    lat: 37.7749,
    lng: -122.4194,
    lastUpdated: 'Just now',
    isInsideGeofence: true,
    geofenceName: 'Home Safe Zone',
    geofenceRadiusMeters: 200,
    distanceFromHomeMeters: 85,
    vitals: {
      heartRate: 84,
      temperatureF: 101.4,
      temperatureC: 38.5,
      activityLevel: 'Walking',
      batteryLevel: 88,
      signalStrength: 96,
      stepsCount: 6840,
      caloriesBurned: 345,
      distanceKm: 3.4,
      speedKmh: 4.2,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  },
  {
    id: 'pet-2',
    petId: 'luna-02',
    petName: 'Luna',
    species: 'Dog',
    breed: 'French Bulldog',
    collarId: 'GOUJJI-CL-4419',
    lat: 37.7712,
    lng: -122.4230,
    lastUpdated: '2s ago',
    isInsideGeofence: true,
    geofenceName: 'Backyard Safe Zone',
    geofenceRadiusMeters: 100,
    distanceFromHomeMeters: 32,
    vitals: {
      heartRate: 72,
      temperatureF: 101.1,
      temperatureC: 38.4,
      activityLevel: 'Sleeping',
      batteryLevel: 94,
      signalStrength: 92,
      stepsCount: 3120,
      caloriesBurned: 190,
      distanceKm: 1.8,
      speedKmh: 0,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  },
  {
    id: 'pet-3',
    petId: 'charlie-03',
    petName: 'Charlie',
    species: 'Cat',
    breed: 'Tabby Cat',
    collarId: 'GOUJJI-CL-1192',
    lat: 37.7760,
    lng: -122.4150,
    lastUpdated: '1s ago',
    isInsideGeofence: true,
    geofenceName: 'Indoors Safe Zone',
    geofenceRadiusMeters: 50,
    distanceFromHomeMeters: 12,
    vitals: {
      heartRate: 110,
      temperatureF: 102.0,
      temperatureC: 38.9,
      activityLevel: 'Playful',
      batteryLevel: 76,
      signalStrength: 89,
      stepsCount: 8920,
      caloriesBurned: 280,
      distanceKm: 2.1,
      speedKmh: 7.5,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    },
  },
];

// Helper to generate initial chart points
const generateInitialHistory = (baseBPM: number, baseTemp: number): VitalChartPoint[] => {
  const points: VitalChartPoint[] = [];
  const now = new Date();
  for (let i = 14; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 5000);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const jitter = Math.floor(Math.sin(i) * 5) + (Math.random() * 4 - 2);
    points.push({
      time: timeStr,
      heartRate: Math.max(50, Math.round(baseBPM + jitter)),
      temperature: Number((baseTemp + (Math.random() * 0.2 - 0.1)).toFixed(1)),
      speed: Number((Math.max(0, 3 + Math.sin(i * 0.8) * 2)).toFixed(1)),
    });
  }
  return points;
};

export const GPSHealthTracker: React.FC = () => {
  // State
  const [pets, setPets] = useState<PetGPSLocation[]>(INITIAL_PETS);
  const [selectedPetId, setSelectedPetId] = useState<string>('pet-1');
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [selectedMetric, setSelectedMetric] = useState<'heartRate' | 'temperature' | 'speed'>('heartRate');
  const [showGeofence, setShowGeofence] = useState<boolean>(true);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [beaconLightOn, setBeaconLightOn] = useState<boolean>(false);
  const [beeperActive, setBeeperActive] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [aiReportOpen, setAiReportOpen] = useState<boolean>(false);

  // Historical graph data keyed by pet ID
  const [chartHistory, setChartHistory] = useState<Record<string, VitalChartPoint[]>>(() => ({
    'pet-1': generateInitialHistory(84, 101.4),
    'pet-2': generateInitialHistory(72, 101.1),
    'pet-3': generateInitialHistory(110, 102.0),
  }));

  // Selected pet object
  const currentPet = pets.find((p) => p.id === selectedPetId) || pets[0];

  // Show temporary toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Sound generator for "Ring Collar Beeper"
  const playBeeperSound = () => {
    setBeeperActive(true);
    triggerToast(`🔊 Audio signal sent to ${currentPet.petName}'s collar! Beeper active.`);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {
      // Audio fallback
    }

    setTimeout(() => {
      setBeeperActive(false);
    }, 2500);
  };

  // Toggle night beacon light on collar
  const toggleBeaconLight = () => {
    setBeaconLightOn((prev) => {
      const next = !prev;
      triggerToast(next ? `💡 Collar LED Night Beacon Activated for ${currentPet.petName}` : `💡 Collar LED Night Beacon Deactivated`);
      return next;
    });
  };

  // Simulate manual change of activity level
  const setActivityLevel = (activity: ActivityType) => {
    let targetBPM = 80;
    let targetSpeed = 0;

    if (activity === 'Sleeping') {
      targetBPM = 68;
      targetSpeed = 0;
    } else if (activity === 'Walking') {
      targetBPM = 92;
      targetSpeed = 4.2;
    } else if (activity === 'Running') {
      targetBPM = 138;
      targetSpeed = 12.5;
    } else if (activity === 'Playful') {
      targetBPM = 115;
      targetSpeed = 6.8;
    }

    setPets((prevPets) =>
      prevPets.map((p) => {
        if (p.id === selectedPetId) {
          return {
            ...p,
            vitals: {
              ...p.vitals,
              activityLevel: activity,
              heartRate: targetBPM,
              speedKmh: targetSpeed,
            },
          };
        }
        return p;
      })
    );

    triggerToast(`Activity switched to ${activity}. Vitals calibrating...`);
  };

  // Geofence alert breach simulator
  const toggleGeofenceBreach = () => {
    setPets((prevPets) =>
      prevPets.map((p) => {
        if (p.id === selectedPetId) {
          const nextInside = !p.isInsideGeofence;
          if (!nextInside) {
            triggerToast(`⚠️ GEOFENCE BREACH WARNING: ${p.petName} exited ${p.geofenceName}!`);
          } else {
            triggerToast(`✅ ${p.petName} returned safely inside ${p.geofenceName}.`);
          }
          return {
            ...p,
            isInsideGeofence: nextInside,
            distanceFromHomeMeters: nextInside ? 85 : 340,
          };
        }
        return p;
      })
    );
  };

  // Real-time interval simulation engine
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const timestampStr = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setPets((prevPets) =>
        prevPets.map((pet) => {
          const { activityLevel, heartRate, temperatureF, stepsCount, caloriesBurned, distanceKm } = pet.vitals;

          // Target bounds based on activity
          let baseHR = 80;
          let hrDelta = 3;
          let tempJitter = (Math.random() * 0.1 - 0.05);

          if (activityLevel === 'Sleeping') {
            baseHR = 68;
            hrDelta = 2;
          } else if (activityLevel === 'Walking') {
            baseHR = 92;
            hrDelta = 5;
          } else if (activityLevel === 'Running') {
            baseHR = 138;
            hrDelta = 8;
          } else if (activityLevel === 'Playful') {
            baseHR = 115;
            hrDelta = 6;
          }

          // Gentle random walk algorithm
          const nextHR = Math.min(
            170,
            Math.max(55, Math.round(heartRate + (Math.random() * hrDelta * 2 - hrDelta) + (baseHR - heartRate) * 0.1))
          );
          const nextTempF = Number(Math.min(103.5, Math.max(99.5, temperatureF + tempJitter)).toFixed(1));
          const nextTempC = Number(((nextTempF - 32) * (5 / 9)).toFixed(1));

          // Increment steps/calories if active
          const isMoving = activityLevel === 'Walking' || activityLevel === 'Running' || activityLevel === 'Playful';
          const newSteps = isMoving ? stepsCount + Math.floor(Math.random() * 6 + 2) : stepsCount;
          const newCalories = isMoving ? Number((caloriesBurned + 0.2).toFixed(1)) : caloriesBurned;
          const newDistance = isMoving ? Number((distanceKm + 0.002).toFixed(3)) : distanceKm;

          // Slight random drift in position for visual map realism
          const latDrift = (Math.random() - 0.5) * 0.00008;
          const lngDrift = (Math.random() - 0.5) * 0.00008;

          return {
            ...pet,
            lat: pet.lat + latDrift,
            lng: pet.lng + lngDrift,
            lastUpdated: 'Just now',
            vitals: {
              ...pet.vitals,
              heartRate: nextHR,
              temperatureF: nextTempF,
              temperatureC: nextTempC,
              stepsCount: newSteps,
              caloriesBurned: newCalories,
              distanceKm: newDistance,
              timestamp: timestampStr,
            },
          };
        })
      );

      // Update Chart points for selected pet
      setChartHistory((prevHistory) => {
        const petObj = pets.find((p) => p.id === selectedPetId) || pets[0];
        const currentPoints = prevHistory[selectedPetId] || [];
        const newPoint: VitalChartPoint = {
          time: timestampStr,
          heartRate: petObj.vitals.heartRate,
          temperature: petObj.vitals.temperatureF,
          speed: petObj.vitals.speedKmh,
        };

        const updated = [...currentPoints.slice(-19), newPoint];
        return {
          ...prevHistory,
          [selectedPetId]: updated,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, selectedPetId, pets]);

  // AI Assessment Generator based on current vitals
  const getAIAssessment = () => {
    const hr = currentPet.vitals.heartRate;
    const temp = currentPet.vitals.temperatureF;
    const act = currentPet.vitals.activityLevel;
    const isSafe = currentPet.isInsideGeofence;

    if (!isSafe) {
      return {
        status: 'warning',
        badge: 'GEOFENCE ALERT',
        badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
        headline: `${currentPet.petName} has left the ${currentPet.geofenceName}!`,
        analysis: `Goujji AI GPS tracker detected spatial perimeter exit. ${currentPet.petName} is currently ${currentPet.distanceFromHomeMeters} meters away. Vitals are elevated (${hr} BPM) due to movement.`,
        recommendation: `Recommended Action: Ring collar beeper or turn on LED night beacon light to locate easily.`,
      };
    }

    if (hr > 130 || act === 'Running') {
      return {
        status: 'active',
        badge: 'HIGH CARDIO ACTIVITY',
        badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        headline: `High exertion detected! Vitals adapting well.`,
        analysis: `${currentPet.petName} is currently ${act.toLowerCase()} with an active heart rate of ${hr} BPM and body temperature of ${temp}°F. High cardio activity is within safe athletic thresholds for a ${currentPet.breed}.`,
        recommendation: `AI Recommendation: Ensure cool water is accessible. 10-minute rest session suggested after run.`,
      };
    }

    if (act === 'Sleeping') {
      return {
        status: 'optimal',
        badge: 'RESTING & RECOVERY',
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        headline: `Deep rest cycle. Sleep quality: 96% (Optimal)`,
        analysis: `Vitals are stable and serene. Heart rate steady at ${hr} BPM (resting baseline) and body temp at ${temp}°F. Muscle recovery and low stress index detected.`,
        recommendation: `AI Recommendation: Great time for scheduled medication or post-nap grooming routine.`,
      };
    }

    return {
      status: 'optimal',
      badge: 'VITALS STABLE & NORMAL',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      headline: `Vitals in prime healthy range. All sensors nominal.`,
      analysis: `${currentPet.petName} is in steady condition (${act} state). Heart rate is ${hr} BPM, body temp ${temp}°F, collar battery ${currentPet.vitals.batteryLevel}% with strong 5G/GPS signal lock.`,
      recommendation: `AI Recommendation: Daily activity goal is ${Math.min(100, Math.round((currentPet.vitals.stepsCount / 8000) * 100))}% complete. Keep up the healthy routine!`,
    };
  };

  const aiAssessment = getAIAssessment();
  const currentChartData = chartHistory[selectedPetId] || [];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-100 font-sans p-2 sm:p-4">
      {/* ============================================================ */}
      {/* 1. TOP HEADER & PET SELECTOR STRIP                            */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 shadow-2xl shadow-purple-950/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Live Status */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25 border border-white/20">
              <Radio className="w-6 h-6 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Goujji AI GPS & Health Tracker
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Sparkles size={12} className="text-yellow-300" /> Live telemetry
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time smart collar location, vitals monitor & AI health diagnostics
              </p>
            </div>
          </div>

          {/* Pet Switcher Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {pets.map((pet) => {
              const isSelected = pet.id === selectedPetId;
              return (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={cn(
                    'flex items-center gap-2.5 px-3.5 py-2 rounded-2xl transition-all duration-300 border text-xs font-semibold whitespace-nowrap',
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white border-purple-400/50 shadow-lg shadow-purple-600/30 scale-[1.02]'
                      : 'bg-slate-800/60 text-slate-300 border-white/10 hover:bg-slate-800 hover:border-white/20'
                  )}
                >
                  <div className="relative w-7 h-7 rounded-full bg-purple-950 flex items-center justify-center font-bold text-purple-200 border border-white/20 overflow-hidden">
                    {pet.species === 'Dog' ? '🐶' : '🐱'}
                  </div>
                  <div className="text-left">
                    <div className="font-bold leading-tight">{pet.petName}</div>
                    <div className="text-[10px] opacity-75 font-normal">{pet.breed}</div>
                  </div>
                  {isSelected && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Collar Hardware Quick Info Strip */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-slate-200">
              <span className="text-purple-400 font-bold">Collar ID:</span> {currentPet.collarId}
            </span>

            {/* Battery Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/10">
              <BatteryCharging size={14} className="text-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-300">{currentPet.vitals.batteryLevel}%</span>
              <span className="text-[10px] text-slate-400">(~4.2 days left)</span>
            </div>

            {/* Signal & GPS */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/10">
              <Wifi size={14} className="text-indigo-400" />
              <span className="font-semibold text-indigo-300">{currentPet.vitals.signalStrength}% Signal</span>
              <span className="text-[10px] text-emerald-400 font-bold">12 GPS Satellites</span>
            </div>

            {/* Geofence Pill */}
            <div
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all',
                currentPet.isInsideGeofence
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
              )}
            >
              {currentPet.isInsideGeofence ? (
                <ShieldCheck size={14} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={14} className="text-red-400" />
              )}
              <span>{currentPet.isInsideGeofence ? `Inside ${currentPet.geofenceName}` : `OUTSIDE SAFE ZONE!`}</span>
            </div>
          </div>

          {/* Live Sync Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={cn(
                'px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all',
                isSimulating
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
              )}
            >
              {isSimulating ? <Pause size={13} /> : <Play size={13} />}
              <span>{isSimulating ? 'Live Telemetry Active' : 'Simulation Paused'}</span>
            </button>

            <button
              onClick={toggleGeofenceBreach}
              title="Test Geofence Breach Alert"
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-xs font-medium flex items-center gap-1 transition-all"
            >
              <AlertTriangle size={13} className="text-amber-400" />
              <span className="hidden sm:inline">Simulate Geofence Alert</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Toast Alert Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="rounded-2xl bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-slate-900/90 border border-purple-400/40 p-3.5 text-center text-sm font-semibold text-purple-100 shadow-xl shadow-purple-950/40 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <BellRing className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 2. MAP MOCKUP + LIVE AI VITALS ASSESSMENT                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MAP MOCKUP (7 cols) */}
        <div className="lg:col-span-7 relative overflow-hidden rounded-3xl bg-slate-900/90 border border-white/10 p-5 shadow-2xl flex flex-col justify-between min-h-[380px]">
          {/* Map Controls Header */}
          <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400 animate-spin-slow" />
              <span className="font-bold text-sm text-white">Live GPS Location Radar</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Lat: {currentPet.lat.toFixed(4)}° N, Lng: {currentPet.lng.toFixed(4)}° W
              </span>
            </div>

            {/* Map Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={playBeeperSound}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all',
                  beeperActive
                    ? 'bg-yellow-500/30 text-yellow-200 border-yellow-400 animate-bounce'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-yellow-300 border-yellow-500/30'
                )}
                title="Ring collar acoustic distress beeper"
              >
                <Volume2 size={13} />
                <span className="hidden sm:inline">Ring Beeper</span>
              </button>

              <button
                onClick={toggleBeaconLight}
                className={cn(
                  'px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center gap-1 transition-all',
                  beaconLightOn
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-500/40'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-indigo-300 border-indigo-500/30'
                )}
                title="Toggle night LED beacon on collar"
              >
                <Zap size={13} />
                <span className="hidden sm:inline">Beacon</span>
              </button>

              <button
                onClick={() => setShowGeofence(!showGeofence)}
                className={cn(
                  'px-2 py-1 rounded-xl text-xs border transition-all',
                  showGeofence ? 'bg-purple-600/30 border-purple-400 text-purple-200' : 'bg-slate-800 text-slate-400 border-white/10'
                )}
                title="Toggle Geofence Safe Zone overlay"
              >
                <Eye size={13} />
              </button>
            </div>
          </div>

          {/* SVG Map Canvas Abstraction */}
          <div className="relative my-3 w-full h-[280px] rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-white/5 shadow-inner">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

            {/* SVG Map Abstract Elements */}
            <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Decorative Map Features: Roads / River / Park */}
              {/* Park Zone */}
              <rect x="50" y="40" width="180" height="130" rx="20" fill="#059669" fillOpacity="0.08" stroke="#10b981" strokeOpacity="0.2" strokeDasharray="4,4" />
              <text x="65" y="65" fill="#34d399" fontSize="10" fontWeight="bold" opacity="0.6">Sunny Paws Park</text>

              {/* Curved River */}
              <path d="M -20 220 Q 150 160 400 240 T 700 180" fill="none" stroke="#38bdf8" strokeWidth="12" strokeOpacity="0.15" strokeLinecap="round" />

              {/* Vector Roads Grid */}
              <path d="M 0 110 L 600 110" stroke="#475569" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="6 6" />
              <path d="M 0 210 L 600 210" stroke="#475569" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="6 6" />
              <path d="M 280 0 L 280 350" stroke="#475569" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="6 6" />

              {/* Geofence Perimeter Circle */}
              {showGeofence && (
                <g filter="url(#glow)">
                  <circle
                    cx="260"
                    cy="145"
                    r={currentPet.isInsideGeofence ? '110' : '70'}
                    fill={currentPet.isInsideGeofence ? '#10b981' : '#ef4444'}
                    fillOpacity="0.06"
                    stroke={currentPet.isInsideGeofence ? '#10b981' : '#ef4444'}
                    strokeWidth="2"
                    strokeDasharray="6,6"
                    className="animate-pulse"
                  />
                  <text
                    x="260"
                    y={currentPet.isInsideGeofence ? '42' : '82'}
                    textAnchor="middle"
                    fill={currentPet.isInsideGeofence ? '#34d399' : '#f87171'}
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {currentPet.geofenceName} ({currentPet.geofenceRadiusMeters}m Safe Radius)
                  </text>
                </g>
              )}

              {/* Home Base Marker */}
              <g transform="translate(260, 145)">
                <circle r="8" fill="#6366f1" fillOpacity="0.4" />
                <circle r="4" fill="#818cf8" />
                <text x="12" y="4" fill="#a5b4fc" fontSize="9" fontWeight="bold">Home Base</text>
              </g>

              {/* Path Trail Line */}
              {showTrail && (
                <path
                  d="M 120 180 Q 180 120 260 145 T 380 130"
                  fill="none"
                  stroke="url(#routeGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="4,4"
                />
              )}

              {/* Animated Pet Position Pin Marker */}
              <g
                transform={
                  currentPet.isInsideGeofence
                    ? `translate(380, 130)`
                    : `translate(460, 220)`
                }
              >
                {/* Pulse Aura */}
                <circle r="22" fill="#a855f7" fillOpacity="0.25" className="animate-ping" />
                <circle r="14" fill="#a855f7" fillOpacity="0.4" />

                {/* Night Beacon LED Effect */}
                {beaconLightOn && (
                  <circle r="30" fill="#6366f1" fillOpacity="0.3" className="animate-pulse" />
                )}

                {/* Beeper Audio Pulse Visual */}
                {beeperActive && (
                  <circle r="40" fill="#eab308" fillOpacity="0.35" stroke="#eab308" strokeWidth="2" className="animate-ping" />
                )}

                {/* Core Pin */}
                <circle r="8" fill="#ffffff" stroke="#9333ea" strokeWidth="3" />

                {/* Pet Name Tag Floating Label */}
                <g transform="translate(0, -18)">
                  <rect x="-42" y="-14" width="84" height="18" rx="9" fill="#0f172a" fillOpacity="0.9" stroke="#a855f7" strokeWidth="1.5" />
                  <text x="0" y="-2" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                    🐾 {currentPet.petName} ({currentPet.vitals.speedKmh} km/h)
                  </text>
                </g>
              </g>
            </svg>
          </div>

          {/* Map Footer Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 border-t border-white/10 pt-2.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <MapPin size={13} className="text-purple-400" />
                Distance from Base: <strong className="text-purple-300">{currentPet.distanceFromHomeMeters} meters</strong>
              </span>
              <span className="flex items-center gap-1">
                <Footprints size={13} className="text-indigo-400" />
                Speed: <strong className="text-indigo-300">{currentPet.vitals.speedKmh} km/h</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerToast(`Map view centered on ${currentPet.petName}`)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-white/10 flex items-center gap-1"
              >
                <Navigation size={12} className="text-purple-400" /> Center Pet
              </button>
            </div>
          </div>
        </div>

        {/* LIVE AI VITALS ANALYSIS BOX (5 cols) */}
        <div className="lg:col-span-5 relative overflow-hidden rounded-3xl bg-gradient-to-b from-purple-950/60 via-slate-900/90 to-slate-900 border border-purple-500/30 p-5 shadow-2xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Sparkles size={16} className="text-yellow-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Goujji AI Vitals Diagnostic
                  </h3>
                  <p className="text-[10px] text-purple-300">Continuous biometric neural monitoring</p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-extrabold border', aiAssessment.badgeColor)}>
                {aiAssessment.badge}
              </span>
            </div>

            {/* Headline & Main Assessment Content */}
            <div className="mt-4 space-y-3">
              <h4 className="text-sm font-bold text-purple-200 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-400" />
                {aiAssessment.headline}
              </h4>

              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 rounded-2xl p-3.5 border border-purple-500/20">
                {aiAssessment.analysis}
              </p>

              <div className="bg-purple-900/20 rounded-2xl p-3 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                <div className="font-bold text-[11px] text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <Zap size={12} className="text-yellow-400" /> AI Care Guidance
                </div>
                <p className="text-xs text-slate-300">{aiAssessment.recommendation}</p>
              </div>
            </div>

            {/* AI Insights Indicators Grid */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Stress Index</span>
                <span className="font-bold text-emerald-400">Low (12/100)</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Daily Target</span>
                <span className="font-bold text-purple-300">
                  {Math.min(100, Math.round((currentPet.vitals.stepsCount / 8000) * 100))}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Hydration Need</span>
                <span className="font-bold text-indigo-300">Normal</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Rest Score</span>
                <span className="font-bold text-emerald-400">94 / 100</span>
              </div>
            </div>
          </div>

          {/* Ask AI CTA Button */}
          <div className="mt-4 pt-3 border-t border-purple-500/20">
            <button
              onClick={() => {
                setAiReportOpen(true);
                triggerToast(`Goujji AI is preparing a comprehensive health report for ${currentPet.petName}...`);
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles size={14} className="text-yellow-300 animate-spin-slow" />
              <span>Ask Goujji AI for Full Health Assessment</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal / Report Overlay for Full AI Health Diagnostic */}
      <AnimatePresence>
        {aiReportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl text-slate-100 relative space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-500/30">
                    <Sparkles className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">
                      Full AI Biometric Analysis: {currentPet.petName}
                    </h3>
                    <p className="text-xs text-purple-300">Generated by Goujji AI Telemetry Intelligence</p>
                  </div>
                </div>

                <button
                  onClick={() => setAiReportOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
                <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-1">
                  <h4 className="font-bold text-purple-200 text-sm">Overall Health Index: 98% Exceptional</h4>
                  <p className="text-slate-300">
                    Based on 150+ live telemetry data points analyzed over the last hour, {currentPet.petName}'s cardiovascular rhythm and thermal regulation are functioning at peak efficiency.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-white/10">
                    <span className="text-slate-400 font-medium">Avg Heart Rate:</span>
                    <p className="text-base font-extrabold text-purple-300">{currentPet.vitals.heartRate} BPM</p>
                    <span className="text-[10px] text-emerald-400">Normal Range (60 - 120)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-white/10">
                    <span className="text-slate-400 font-medium">Thermal Equilibrium:</span>
                    <p className="text-base font-extrabold text-indigo-300">{currentPet.vitals.temperatureF}°F</p>
                    <span className="text-[10px] text-emerald-400">Normal Range (100.5°F - 102.5°F)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-white/10 space-y-2">
                  <h4 className="font-bold text-white text-xs">Veterinary Insights & Next Steps:</h4>
                  <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                    <li>Cardiovascular endurance is strong with smooth recovery rate after high activity.</li>
                    <li>No cardiac arrhythmia or abnormal temperature spikes detected today.</li>
                    <li>Smart Collar battery health is optimal with 88% remaining (~4.2 days of continuous GPS).</li>
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setAiReportOpen(false);
                    triggerToast(`Health report exported to ${currentPet.petName}'s digital record!`);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30"
                >
                  Download / Save Health Log
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 3. REAL-TIME VITALS METRICS CARDS GRID (4 CARDS)             */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: HEART RATE */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-purple-500/30 p-4 shadow-xl flex flex-col justify-between group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={14} className="text-red-400 animate-bounce" /> Heart Rate
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
              Live Pulse
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentPet.vitals.heartRate}
            </span>
            <span className="text-xs font-bold text-slate-400">BPM</span>
          </div>

          {/* Range Visual Bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-purple-500 to-red-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, ((currentPet.vitals.heartRate - 50) / 110) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Resting (60)</span>
              <span className="font-semibold text-slate-300">Target Safe Zone</span>
              <span>High (140)</span>
            </div>
          </div>
        </div>

        {/* CARD 2: BODY TEMPERATURE */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-indigo-500/30 p-4 shadow-xl flex flex-col justify-between group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer size={14} className="text-amber-400" /> Body Temperature
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Normal
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentPet.vitals.temperatureF}°
            </span>
            <span className="text-xs font-bold text-slate-400">F ({currentPet.vitals.temperatureC}°C)</span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-blue-400 via-emerald-400 to-amber-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, ((currentPet.vitals.temperatureF - 99) / 4) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>99.5°F</span>
              <span className="font-semibold text-emerald-400">Baseline (101.5°F)</span>
              <span>103.5°F</span>
            </div>
          </div>
        </div>

        {/* CARD 3: ACTIVITY LEVEL & STEPS */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-emerald-500/30 p-4 shadow-xl flex flex-col justify-between group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-emerald-400" /> Activity Mode
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {currentPet.vitals.activityLevel}
            </span>
          </div>

          <div className="my-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {currentPet.vitals.stepsCount.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">steps today</span>
          </div>

          {/* Interactive Activity Level Switcher for User Testing */}
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center justify-between">
              <span>Test Activity Reaction:</span>
              <span className="text-purple-300">{currentPet.vitals.caloriesBurned} kcal</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {(['Sleeping', 'Walking', 'Running', 'Playful'] as ActivityType[]).map((act) => (
                <button
                  key={act}
                  onClick={() => setActivityLevel(act)}
                  className={cn(
                    'py-1 rounded-lg text-[10px] font-bold border transition-all',
                    currentPet.vitals.activityLevel === act
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700'
                  )}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 4: SMART COLLAR HARDWARE & GEOFENCE */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/80 border border-purple-500/30 p-4 shadow-xl flex flex-col justify-between group hover:border-purple-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-400" /> Collar Hardware
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              v2.4.1 Firmware
            </span>
          </div>

          <div className="my-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Battery Level:</span>
              <span className="font-extrabold text-emerald-400">{currentPet.vitals.batteryLevel}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400"
                style={{ width: `${currentPet.vitals.batteryLevel}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>Geofence Status:</span>
            <span
              className={cn(
                'font-bold',
                currentPet.isInsideGeofence ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              {currentPet.isInsideGeofence ? 'Protected (In Zone)' : 'BREACH ALERT'}
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LIVE RECHARTS HEART RATE & VITALS GRAPH STREAM            */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900/90 border border-white/10 p-5 shadow-2xl">
        {/* Graph Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Heart className="w-5 h-5 text-purple-400 animate-pulse" />
              Live Biometric Telemetry Graph ({currentPet.petName})
            </h3>
            <p className="text-xs text-slate-400">Continuous 2-second streaming sensor buffer</p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMetric('heartRate')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                selectedMetric === 'heartRate'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                  : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'
              )}
            >
              Heart Rate (BPM)
            </button>
            <button
              onClick={() => setSelectedMetric('temperature')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                selectedMetric === 'temperature'
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'
              )}
            >
              Body Temp (°F)
            </button>
            <button
              onClick={() => setSelectedMetric('speed')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                selectedMetric === 'speed'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-400 border-white/10 hover:bg-slate-700'
              )}
            >
              Speed (km/h)
            </button>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="mt-5 w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHeartRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c084fc" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#7e22ce" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#3730a3" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#065f46" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />

              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={false}
              />

              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                domain={
                  selectedMetric === 'heartRate'
                    ? [50, 160]
                    : selectedMetric === 'temperature'
                    ? [98, 104]
                    : [0, 20]
                }
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload as VitalChartPoint;
                    return (
                      <div className="bg-slate-950/95 border border-purple-500/40 rounded-2xl p-3 shadow-xl backdrop-blur-md text-xs space-y-1 font-sans">
                        <div className="font-bold text-purple-300 border-b border-white/10 pb-1">
                          Time: {label}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-200">
                          <span>Heart Rate:</span>
                          <strong className="text-red-400">{dataPoint.heartRate} BPM</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-200">
                          <span>Body Temp:</span>
                          <strong className="text-indigo-300">{dataPoint.temperature}°F</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-200">
                          <span>Movement Speed:</span>
                          <strong className="text-emerald-400">{dataPoint.speed} km/h</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Threshold Lines for Safety */}
              {selectedMetric === 'heartRate' && (
                <>
                  <ReferenceLine y={140} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'High Exertion Threshold (140 BPM)', fill: '#f87171', fontSize: 10, position: 'top' }} />
                  <ReferenceLine y={60} stroke="#34d399" strokeDasharray="3 3" label={{ value: 'Rest Baseline (60 BPM)', fill: '#34d399', fontSize: 10, position: 'bottom' }} />
                </>
              )}

              {selectedMetric === 'heartRate' && (
                <Area
                  type="monotone"
                  dataKey="heartRate"
                  stroke="#c084fc"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorHeartRate)"
                  isAnimationActive={false}
                />
              )}

              {selectedMetric === 'temperature' && (
                <Area
                  type="monotone"
                  dataKey="temperature"
                  stroke="#818cf8"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorTemp)"
                  isAnimationActive={false}
                />
              )}

              {selectedMetric === 'speed' && (
                <Area
                  type="monotone"
                  dataKey="speed"
                  stroke="#34d399"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorSpeed)"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Footer info strip */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Streaming data buffer updated in real-time</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setChartHistory((prev) => ({
                  ...prev,
                  [selectedPetId]: generateInitialHistory(currentPet.vitals.heartRate, currentPet.vitals.temperatureF),
                }));
                triggerToast('Telemetry buffer reset.');
              }}
              className="text-slate-400 hover:text-white font-semibold flex items-center gap-1"
            >
              <RotateCcw size={12} /> Reset Stream
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GPSHealthTracker;

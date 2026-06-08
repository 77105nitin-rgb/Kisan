import React, { useState, useEffect } from "react";
import { 
  CloudRain, Sun, Wind, Droplets, MapPin, Sparkles, Navigation, 
  ShieldCheck, AlertTriangle, CloudLightning, ShieldAlert, CheckCircle, RefreshCw 
} from "lucide-react";
import { LanguageCode } from "../types";
import { MOCK_WEATHER_DATA, PRESET_PUNJAB_DISTRICTS, PRESET_HARYANA_DISTRICTS, PRESET_UP_DISTRICTS } from "../data";

interface WeatherWidgetProps {
  language: LanguageCode;
}

interface WeatherWarning {
  id: string;
  alertName: string;
  alertName_pa: string;
  alertName_hi: string;
  severity: string;
  category: string;
  district: string;
  state: string;
  timeline: string;
  timeline_pa: string;
  timeline_hi: string;
  details: string;
  details_pa: string;
  details_hi: string;
  countdownHours: number;
  checklist: string[];
  checklist_pa: string[];
  checklist_hi: string[];
}

const WARNING_UI_LABELS = {
  en: {
    radarTitle: "Doppler Micro-Climate Radar",
    hazardCenter: "Severe Weather Early-Warning Center",
    safeDistrict: "Skies Clear over your Coordinates",
    safeDetail: "Your district currently has no critical severe storm or flash flooding alerts. Satellite radar sweeps are fully normal.",
    drillBtn: "Initiate Storm drills",
    drillActive: "Simulating Storm Alert",
    preventTitle: "Standing Crop Care Instructions (Act in Advance)",
    threatZone: "DIAL EMERGENCY COORDINATOR",
    detailsLabel: "Atmospheric Telemetry Overview",
    activeWarnings: "Active Alerts in neighboring regions"
  },
  hi: {
    radarTitle: "डॉप्लर मौसम रडार सिमुलेशन",
    hazardCenter: "भीषण मौसम चेतावनी केंद्र",
    safeDistrict: "आपके निकटतम स्थान पर मौसम साफ है",
    safeDetail: "आपके जिले में फिलहाल ओलावृष्टि या चक्रवात का सक्रिय खतरा नहीं है। सैटेलाइट तरंगें सामान्य हैं।",
    drillBtn: "तूफान चेतावनी ड्रिल शुरू करें",
    drillActive: "सक्रिय मौसम मॉक ड्रिल",
    preventTitle: "फसल सुरक्षा निवारक उपाय (अग्रिम कार्रवाई करें)",
    threatZone: "आपातकालीन कृषि अधिकारी से बात करें",
    detailsLabel: "वायुमंडलीय रडार विवरण",
    activeWarnings: "पड़ोसी ज़िलों में सक्रिय चेतावनियां"
  },
  pa: {
    radarTitle: "ਡੌਪਲਰ ਮਾਈਕਰੋ-ਕਲਾਈਮੇਟ ਰਡਾਰ",
    hazardCenter: "ਗੰਭੀਰ ਮੌਸਮ ਚੇਤਾਵਨੀ ਕੇਂਦਰ",
    safeDistrict: "ਤੁਹਾਡੇ ਇਲਾਕੇ ਵਿੱਚ ਅਸਮਾਨ ਸਾਫ਼ ਹੈ",
    safeDetail: "ਤੁਹਾਡੇ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਗੜੇਮਾਰੀ, ਚੱਕਰਵਾਤ ਜਾਂ ਹੜ੍ਹ ਦੀ ਕੋਈ ਚੇਤਾਵਨੀ ਨਹੀਂ ਹੈ। ਸੈਟੇਲਾਈਟ ਨਿਗਰਾਨੀ ਜਾਰੀ ਹੈ।",
    drillBtn: "ਮੌਸਮ ਚੇਤਾਵਨੀ ਡਰਿੱਲ ਚਲਾਓ",
    drillActive: "ਮੌਸਮ ਐਮਰਜੈਂਸੀ ਡਰਿੱਲ ਸਰਗਰਮ",
    preventTitle: "ਖੜ੍ਹੀ ਫਸਲ ਦੀ ਬਚਾਅ ਗਾਈਡ (ਅਗਾਊਂ ਕਦਮ ਚੁੱਕੋ)",
    threatZone: "ਐਮਰਜੈਂਸੀ ਖੇਤੀਬਾੜੀ ਅਫਸਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ",
    detailsLabel: "ਵਾਤਾਵਰਣ ਸੈਟੇਲਾਈਟ ਵੇਰਵਾ",
    activeWarnings: "ਗੁਆਂਢੀ ਇਲਾਕਿਆਂ ਵਿੱਚ ਸਰਗਰਮ ਅਲਰਟ"
  }
};

export default function WeatherWidget({ language }: WeatherWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState({
    district: "Khanna",
    state: "Punjab",
    lat: 30.7046,
    lng: 76.2218
  });
  
  const [weather, setWeather] = useState({
    temp: MOCK_WEATHER_DATA.temp,
    humidity: MOCK_WEATHER_DATA.humidity,
    rainProbability: MOCK_WEATHER_DATA.rainProbability,
    windSpeed: MOCK_WEATHER_DATA.windSpeed,
    uvIndex: MOCK_WEATHER_DATA.uvIndex,
    condition: MOCK_WEATHER_DATA.condition,
    aiRecommendation: MOCK_WEATHER_DATA.aiRecommendation[language]
  });

  // State filtering configurations
  const [selectedState, setSelectedState] = useState("Punjab");
  const [districtList, setDistrictList] = useState<string[]>(PRESET_PUNJAB_DISTRICTS);

  // Severe Warning States
  const [warnings, setWarnings] = useState<WeatherWarning[]>([]);
  const [simulatedDrillActive, setSimulatedDrillActive] = useState<string | null>(null);

  useEffect(() => {
    fetchWeatherWarnings();
  }, []);

  const fetchWeatherWarnings = async () => {
    try {
      const response = await fetch("/api/weather-warnings");
      const result = await response.json();
      if (result.status === "success" && result.data) {
        setWarnings(result.data);
      }
    } catch (e) {
      console.error("Failed to load weather warnings from backend:", e);
    }
  };

  useEffect(() => {
    if (selectedState === "Punjab") {
      setDistrictList(PRESET_PUNJAB_DISTRICTS);
      setLocation((prev) => ({ ...prev, state: "Punjab", district: PRESET_PUNJAB_DISTRICTS[0] }));
      triggerWeatherUpdate(PRESET_PUNJAB_DISTRICTS[0], "Punjab");
    } else if (selectedState === "Haryana") {
      setDistrictList(PRESET_HARYANA_DISTRICTS);
      setLocation((prev) => ({ ...prev, state: "Haryana", district: PRESET_HARYANA_DISTRICTS[0] }));
      triggerWeatherUpdate(PRESET_HARYANA_DISTRICTS[0], "Haryana");
    } else {
      setDistrictList(PRESET_UP_DISTRICTS);
      setLocation((prev) => ({ ...prev, state: "Uttar Pradesh", district: PRESET_UP_DISTRICTS[0] }));
      triggerWeatherUpdate(PRESET_UP_DISTRICTS[0], "Uttar Pradesh");
    }
  }, [selectedState]);

  // Handle manual district change
  const handleDistrictChange = (district: string) => {
    setLocation((prev) => ({ ...prev, district }));
    triggerWeatherUpdate(district, selectedState);
  };

  // Trigger weather state shifts dynamically
  const triggerWeatherUpdate = (dist: string, st: string) => {
    setLoading(true);
    setTimeout(() => {
      // Map seed to generate dynamic offsets mimicking live APIs
      const seed = dist.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) || 40;
      const t = 28 + (seed % 11);
      const h = 50 + (seed % 31);
      const rp = (seed % 10) * 8 + 8;
      const ws = 6 + (seed % 12);
      const uv = 4 + (seed % 7);
      
      const recommendations: Record<LanguageCode, string> = {
        en: `Recommendations for ${dist}, ${st}: Relative humidity is ${h}%. High possibility of evening showers (${rp}%). Refrain from heavy urea broadcasting today. Ensure field drainage pipes are clear for paddy holdings.`,
        hi: `${dist}, ${st} के लिए मौसम सलाह: सापेक्षिक आर्द्रता ${h}% है। शाम को हल्की वर्षा होने की संभावना (${rp}%) है। आज यूरिया का छिड़काव रोक दें। धान के खेतों में पानी निकासी की व्यवस्था करें।`,
        pa: `${dist}, ${st} ਲਈ ਮੌਸਮ ਸਲਾਹ: ਹਵਾ ਵਿੱਚ ਨਮੀ ਦੀ ਮਾਤਰਾ ${h}% ਹੈ। ਚੂਲੀ ਪਨੀਰੀ ਬਚਾਉਣ ਲਈ ਅੱਜ ਖੇਤ ਵਿੱਚ ਕੋਈ ਸਪਰੇਅ ਨਾ ਕਰੋ। ਖੇਤਾਂ 'ਚ ਸਿੰਚਾਈ ਦਾ ਪਾਣੀ ਕੱਢਣ ਦੀ ਵਿਵਸਥਾ ਬਣਾਈ ਰੱਖੋ।`
      };

      setWeather({
        temp: t,
        humidity: h,
        rainProbability: rp,
        windSpeed: ws,
        uvIndex: uv,
        condition: rp > 60 ? "Scattered Showers" : rp > 35 ? "Partly Cloudy" : "Mostly Sunny",
        aiRecommendation: recommendations[language]
      });
      setLoading(false);
    }, 500);
  };

  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      alert("GPS Geolocation service is not supported by your device browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({
          district: "GPS-Detected Zone",
          state: "Punjab Region",
          lat: parseFloat(latitude.toFixed(4)),
          lng: parseFloat(longitude.toFixed(4))
        });
        
        setTimeout(() => {
          setWeather({
            temp: 31,
            humidity: 62,
            rainProbability: 25,
            windSpeed: 11,
            uvIndex: 6,
            condition: "Partly Cloudy",
            aiRecommendation: language === "pa"
              ? "ਜੀਪੀਐਸ ਨਿਰਦੇਸ਼ਾਂਕ ਅਨੁਸਾਰ: ਵਾਤਾਵਰਣ ਵਿੱਚ ਨਮੀ 62% ਹੈ। ਨਰਮੇ ਅਤੇ ਝੋਨੇ ਦੀ ਸਿੰਚਾਈ ਸਵੇਰੇ ਦੀ ਕੂਲ ਸ਼ਿਫਟ ਵਿੱਚ ਕਰਨਾ ਮੁਆਫਕ ਰਹੇਗਾ।"
              : language === "hi"
              ? "जीपीएस विवरण के अनुसार: हवा में नमी 62% है। छिड़काव या सिंचाई कार्य सुबह के ठंडे तापमान में ही करें।"
              : "GPS Location Active: Atmospheric details indicate steady moisture (62%). Direct spray coordinates are clean for minor pesticide spray schedules."
          });
          setLoading(false);
        }, 600);
      },
      (err) => {
        console.error(err);
        alert("Unable to access GPS location coordinates. Please choose manually.");
        setLoading(false);
      }
    );
  };

  // --- EARLY WARNING FILTER LOGIC ---
  // If simulated drill is active, prioritize that warning first!
  let activeWarning: WeatherWarning | undefined;

  if (simulatedDrillActive) {
    // Return a structured simulated warning matching the selected drill category
    activeWarning = {
      id: "drill_wea",
      alertName: simulatedDrillActive === "hail" ? "Severe Hailstorm & Supercell Gale Drill" : simulatedDrillActive === "flood" ? "Extreme Cloudburst Flash Flood drill" : "Cyclonic Squall Lodging Drill",
      alertName_pa: simulatedDrillActive === "hail" ? "ਗੜੇਮਾਰੀ ਅਤੇ ਤੇਜ਼ ਚੱਕਰਵਾਤੀ ਝੱਖੜ (ਡਰਿੱਲ)" : simulatedDrillActive === "flood" ? "ਭਾਰੀ ਕਲਾਊਡਬਰਸਟ ਅਤੇ ਹੜ੍ਹ ਚੇਤਾਵਨੀ (ਡਰਿੱਲ)" : "ਚੱਕਰਵਾਤੀ ਤੂਫ਼ਾਨ ਅਤੇ ਤੇਜ਼ ਹਵਾਵਾਂ (ਡਰਿੱਲ)",
      alertName_hi: simulatedDrillActive === "hail" ? "भीषण ओलावृष्टि और चक्रवाती तूफान (मॉक ड्रिल)" : simulatedDrillActive === "flood" ? "तीव्र मेघगर्जन व मूसलाधार बाढ़ अलर्ट (मॉक ड्रिल)" : "चक्रवाती अंधड़ और फसल सुरक्षा ड्रिल",
      severity: "critical",
      category: simulatedDrillActive,
      district: location.district,
      state: location.state,
      timeline: "Immediate impact in next 1 to 2 hours",
      timeline_pa: "ਅਗਲੇ 1 ਤੋਂ 2 ਘੰਟਿਆਂ ਵਿੱਚ ਪ੍ਰਭਾਵੀ ਅਸਰ",
      timeline_hi: "अगले 1 से 2 घंटों में तात्कालिक आपदा प्रभाव",
      details: "EMERGENCY DRILL SIMULATION: Radar indicates localized high-reflectivity cloud structure. Expect massive localized precipitation, lightning bursts, and dangerous crop-lodging gusts.",
      details_pa: "ਮੌਸਮ ਐਮਰਜੈਂਸੀ ਡਰਿੱਲ: ਰਡਾਰ ਤੇਜ਼ ਬੱਦਲਾਂ ਦੇ ਸੰਕੇਤ ਦਿਖਾ ਰਿਹਾ ਹੈ। ਤੇਜ਼ ਬਿਜਲੀ ਅਤੇ ਫ਼ਸਲਾਂ ਨੂੰ ਲਿਟਾਉਣ ਵਾਲੀਆਂ ਤੇਜ਼ ਹਵਾਵਾਂ ਚੱਲਣ ਦੀ ਚੇਤਾਵਨੀ।",
      details_hi: "आपातकालीन मौसमी ड्रिल: रडार बादलों के तेजी से घूमने का संकेत दे रहा है। अत्यधिक वर्षा, बिजली गिरने और फसल को गिराने वाली तेज आंधी की चेतावनी।",
      countdownHours: 1,
      checklist: simulatedDrillActive === "hail" 
        ? ["Immediately deploy high-tension anti-hail protective coverings.", "Bring pre-harvested fruits/vegetables to dry closed warehousing.", "Postpone all active chemical spraying to prevent pesticide runoff."]
        : simulatedDrillActive === "flood"
        ? ["Halt and suspend all artificial fertilization broadcasting.", "Clear secondary field outlet drains to handle sudden flood surges.", "Navigate cattle and tractors away from high-hazard slopes."]
        : ["Support sugarcane stalks using cluster binding techniques.", "Cease watering fields completely to avoid loosening soil anchors.", "Inspect greenhouse tie-downs and reinforce windward vents."],
      checklist_pa: simulatedDrillActive === "hail"
        ? ["ਖੇਤਾਂ ਉੱਤੇ ਗੜੇ ਰੋਕੂ ਜਾਲੀਆਂ (Anti-Hail Nets) ਨੂੰ ਤੁਰੰਤ ਖੋਲ੍ਹੋ।", "ਕੱਟੀਆਂ ਹੋਈਆਂ ਸਬਜ਼ੀਆਂ ਤੇ ਫਲਾਂ ਨੂੰ ਸੁੱਕੇ ਗੋਦਾਮ ਵਿੱਚ ਤਬਦੀਲ ਕਰੋ।", "ਅੱਜ ਕਿਸੇ ਵੀ ਕੀਟਨਾਸ਼ਕ ਦਾ ਛਿੜਕਾਅ ਨਾ ਕਰੋ, ਨਹੀਂ ਤਾਂ ਰੁੜ੍ਹ ਜਾਵੇਗਾ।"]
        : ["ਖੇਤ ਵਿੱਚ ਕਿਸੇ ਵੀ ਖਾਦ ਜਾਂ ਯੂਰੀਏ ਦਾ ਛਿੜਕਾਅ ਰੋਕੋ।", "ਫਾਲਤੂ ਪਾਣੀ ਦੇ ਨਿਕਾਸ ਵਾਲੀਆਂ ਨਾਲੀਆਂ ਦਾ ਰਸਤਾ ਸਾਫ਼ ਕਰੋ।", "ਟਰੈਕਟਰਾਂ ਅਤੇ ਪਸ਼ੂਆਂ ਨੂੰ ਉੱਚੇ ਅਤੇ ਸੁਰੱਖਿਅਤ ਸਥਾਨਾਂ ਤੇ ਮੁਹੱਈਆ ਕਰਵਾਓ।"],
      checklist_hi: simulatedDrillActive === "hail"
        ? ["फसलों पर तुरंत एंटी-हेल जाल बिछाएं या उन्हें तिरपाल से सुरक्षित करें।", "खुले में कटी हुई सब्जियों व फलों को बंद कोठरी या गोदाम में ले जाएं।", "आज किसी भी कीटनाशक के छिड़काव को स्थगित रखें ताकि रिसाव न हो।"]
        : ["उर्वरक एवं यूरिया के किसी भी छिड़काव पर पूर्ण रोक लगाएं।", "खेतों से जल निकासी की नालियों को तत्काल दुरुस्त करें।", "पशुओं व कीमती उपकरणों को निचले इलाकों से सुरक्षित बाहर निकालें।"]
    };
  } else {
    // Standard match by Selected District coordinates
    activeWarning = warnings.find(
      (w) => w.district.toLowerCase() === location.district.toLowerCase()
    );
  }

  return (
    <div id="weather-section" className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 relative overflow-hidden flex flex-col space-y-6">
      
      {/* Location Filter & Geo-Locator Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 p-2.5 rounded-2xl text-emerald-700 shadow-inner">
            <MapPin className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <div className="text-[10px] text-slate-450 font-black uppercase tracking-widest">
              {language === "pa" ? "ਖੇਤ ਦਾ ਇਲਾਕਾ" : language === "hi" ? "खेत का वास्तविक स्थान" : "Farming Geocoordinates"}
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
              {location.district}, {location.state}
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                Lat: {location.lat.toFixed(2)}
              </span>
            </h3>
          </div>
        </div>

        {/* State/District Dropdowns & Locator buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter */}
          <select 
            value={selectedState} 
            onChange={(e) => setSelectedState(e.target.value)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none cursor-pointer transition-all"
          >
            <option value="Punjab">Punjab (ਪੰਜਾਬ)</option>
            <option value="Haryana">Haryana (हरियाणा)</option>
            <option value="UP">Uttar Pradesh (उत्तर प्रदेश)</option>
          </select>

          {/* District Filter */}
          <select 
            value={location.district} 
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs text-slate-700 font-extrabold focus:outline-none cursor-pointer transition-all"
          >
            {districtList.map((dist) => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>

          <button
            onClick={handleGPSDetect}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-850 hover:bg-slate-750 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === "pa" ? "ਜੀਪੀਐਸ" : language === "hi" ? "लोकेटर" : "My Location"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-700 rounded-full animate-spin"></div>
          <p className="text-xs font-mono font-bold text-slate-400 tracking-wider">SYNCING HYPER-LOCAL WEATHER COORDINATES...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Block - Primary Temperature Indicator */}
            <div className="col-span-1 lg:col-span-4 flex items-center justify-center p-5 bg-gradient-to-tr from-emerald-800 to-emerald-950 rounded-2xl text-white shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
              <div className="text-center z-10 select-none">
                <div className="flex justify-center mb-3">
                  {weather.rainProbability > 50 ? (
                    <CloudRain className="w-16 h-16 text-sky-300 animate-bounce" />
                  ) : (
                    <Sun className="w-16 h-16 text-amber-300 animate-spin-slow" />
                  )}
                </div>
                <div className="text-5xl font-black tracking-tight mb-1">
                  {weather.temp}°C
                </div>
                <div className="text-xs uppercase tracking-widest text-emerald-250 font-black">
                  {weather.condition}
                </div>
                <span className="inline-block mt-3.5 text-[9px] font-bold text-emerald-200 bg-emerald-900/60 border border-emerald-700/80 px-2.5 py-0.5 rounded-full">
                  {language === "pa" ? "ਸੈਟੇਲਾਈਟ ਫੀਡ" : language === "hi" ? "सैमसंग उपग्रह फ़ीड" : "Met-Radar Live Stream"}
                </span>
              </div>
            </div>

            {/* Center Block - Weather Variables Dashboard */}
            <div className="col-span-1 lg:col-span-8 flex flex-col justify-between space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 select-none">
                {/* Rain prob */}
                <div className="bg-slate-55 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-sky-50 text-sky-600 p-2.5 rounded-xl">
                    <CloudRain className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                      {language === "pa" ? "ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ" : language === "hi" ? "बारिश संभावना" : "Rain Prob."}
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-1">{weather.rainProbability}%</div>
                  </div>
                </div>

                {/* Humidity */}
                <div className="bg-slate-55 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-blue-50 text-blue-650 p-2.5 rounded-xl">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                      {language === "pa" ? "ਨਮੀ ਪ੍ਰਤੀਸ਼ਤ" : language === "hi" ? "नमी / आर्द्रता" : "Humidity"}
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-1">{weather.humidity}%</div>
                  </div>
                </div>

                {/* Wind Speed */}
                <div className="bg-slate-55 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-amber-50 text-amber-655 p-2.5 rounded-xl">
                    <Wind className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                      {language === "pa" ? "ਹਵਾ ਦੀ ਰਫ਼ਤਾਰ" : language === "hi" ? "हावा की गति" : "Wind Speed"}
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-1">{weather.windSpeed} km/h</div>
                  </div>
                </div>

                {/* UV index */}
                <div className="bg-slate-55 border border-slate-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-slate-400 leading-none">
                      {language === "pa" ? "ਯੂਵੀ ਇੰਡੈਕਸ" : language === "hi" ? "यूवी सूचकांक" : "UV Index"}
                    </div>
                    <div className="text-base font-extrabold text-slate-900 mt-1">{weather.uvIndex} (High)</div>
                  </div>
                </div>
              </div>

              {/* AI Recommendation Panel */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1.5 bg-emerald-700 text-white rounded-bl-xl text-[9px] uppercase font-bold tracking-wide flex items-center gap-1 shadow-sm select-none">
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  <span>Kisan AI recommendation</span>
                </div>
                <div className="bg-emerald-650 text-white p-2.5 rounded-xl shrink-0 mt-1 shadow-sm">
                  <Sparkles className="w-4 h-4 text-emerald-100" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5 select-none">
                    {language === "pa" ? "ਏਆਈ ਮੌਸਮ ਸਲਾਹਕਾਰ" : language === "hi" ? "एआई मौसम सलाहकार" : "AI Agrometeorological Advice"}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-bold">
                    {weather.aiRecommendation}
                  </p>
                  <div className="text-[9px] text-emerald-600 font-bold pt-1.5 flex items-center gap-1 select-none">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approved by ICAR Regional Crop Pathology Directorate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ADVANCED SEVERE WEATHER EARLY-WARNING PANEL */}
          {/* ========================================================================= */}
          <div className="border border-slate-150 rounded-3xl p-5 bg-slate-50/30">
            <div className="flex flex-col xl:flex-row gap-6">
              
              {/* Radar Simulation Animation Display (Left Aspect) */}
              <div className="w-full xl:w-[240px] shrink-0">
                <h4 className="text-[10px] text-slate-450 font-black uppercase tracking-wider mb-2 select-none">
                  {WARNING_UI_LABELS[language].radarTitle}
                </h4>
                
                {/* SVG Weather Radar scope with rotation sweep */}
                <div className="aspect-square bg-slate-900 hover:bg-slate-950 rounded-2xl border border-slate-800 p-2 relative overflow-hidden flex flex-col justify-between shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Concentric helper scopes */}
                    <div className="w-[90%] h-[90%] border border-emerald-500/20 rounded-full absolute"></div>
                    <div className="w-[60%] h-[60%] border border-emerald-500/20 rounded-full absolute"></div>
                    <div className="w-[30%] h-[30%] border border-emerald-500/20 rounded-full absolute"></div>
                    
                    {/* Crosshairs */}
                    <div className="w-full h-[1px] bg-emerald-500/20 absolute"></div>
                    <div className="h-full w-[1px] bg-emerald-500/20 absolute"></div>

                    {/* Threat indicator coordinates (visible to match state) */}
                    {activeWarning && (
                      <div className="absolute top-[30%] left-[40%] animate-ping text-red-500 z-10">
                        <AlertTriangle className="w-5 h-5 fill-red-500 stroke-slate-900 text-red-100" />
                      </div>
                    )}

                    {/* Rotating Sweep Line using standard CSS rotation */}
                    <div className="w-[100%] h-[100%] absolute animate-spin-slow">
                      <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        <line x1="50" y1="50" x2="50" y2="0" stroke="#10b981" strokeWidth="1" strokeOpacity="0.8" />
                        <path d="M50,50 L50,0 A50,50 0 0,1 90,20 Z" fill="url(#sweepGrad)" opacity="0.30" />
                        
                        <defs>
                          <linearGradient id="sweepGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* Indicator headers */}
                  <div className="flex justify-between items-center z-10 select-none">
                    <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                      SYS ACT
                    </span>
                    <span className="text-[8px] font-mono font-bold text-[#10b981] animate-pulse">
                      ● SCANNING
                    </span>
                  </div>

                  <div className="flex justify-between items-center z-10 select-none mt-auto">
                    <span className="text-[8px] font-mono text-slate-400">
                      AZM: 304° EL: 12.5
                    </span>
                    <span className="text-[8px] font-mono text-slate-400">
                      RNG: 120km
                    </span>
                  </div>
                </div>
              </div>

              {/* Warnings details and preventive checklists (Right Aspect) */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] text-slate-450 font-black uppercase tracking-wider mb-2 select-none">
                    {WARNING_UI_LABELS[language].hazardCenter}
                  </h4>

                  {activeWarning ? (
                    <div className="space-y-4">
                      {/* Active Alert Banner */}
                      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                        <div className="bg-red-600 text-white p-3 rounded-xl shrink-0 self-start md:self-auto shadow animate-pulse">
                          <CloudLightning className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] uppercase font-black px-2 py-0.5 roundedbg-red-200 bg-red-650 text-white">
                              {activeWarning.severity.toUpperCase()} ALERT
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              Timeline: {language === "pa" ? activeWarning.timeline_pa : language === "hi" ? activeWarning.timeline_hi : activeWarning.timeline}
                            </span>
                          </div>
                          
                          <h3 className="font-black text-rose-900 text-base mt-1">
                            {language === "pa" ? activeWarning.alertName_pa : language === "hi" ? activeWarning.alertName_hi : activeWarning.alertName}
                          </h3>
                          <p className="text-xs text-slate-705 leading-relaxed font-semibold pt-1">
                            {language === "pa" ? activeWarning.details_pa : language === "hi" ? activeWarning.details_hi : activeWarning.details}
                          </p>
                        </div>
                      </div>

                      {/* Standing Crop Care Instructions */}
                      <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4">
                        <h5 className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5 mb-2.5 select-none">
                          <ShieldAlert className="w-4 h-4 text-amber-700" />
                          {WARNING_UI_LABELS[language].preventTitle}
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-bold font-sans text-amber-950">
                          {((language === "pa" ? activeWarning.checklist_pa : language === "hi" ? activeWarning.checklist_hi : activeWarning.checklist) || []).map((step, idx) => (
                            <div key={idx} className="flex gap-2 bg-white/70 p-2 border border-amber-100 rounded-xl shadow-sm">
                              <span className="text-[10px] bg-amber-200 h-5 w-5 shrink-0 rounded-lg flex items-center justify-center font-black">
                                {idx + 1}
                              </span>
                              <p className="text-[11px] leading-tight text-slate-755">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Safe Skies standard displays */
                    <div className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4 shadow-sm">
                      <div className="bg-emerald-600 text-white p-3 rounded-xl shrink-0 self-start md:self-auto shadow-md">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-emerald-900 text-base">
                          {WARNING_UI_LABELS[language].safeDistrict}
                        </h3>
                        <p className="text-xs text-slate-650 leading-relaxed font-semibold pt-0.5">
                          {WARNING_UI_LABELS[language].safeDetail}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Drill trigger drills block */}
                <div className="border-t border-slate-100 pt-4 mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase font-bold text-slate-400">Emergency simulation training:</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSimulatedDrillActive(simulatedDrillActive === "hail" ? null : "hail")}
                        className={`text-[10px] font-bold px-2.5 py-1.5 border rounded-lg cursor-pointer transition-all ${
                          simulatedDrillActive === "hail" 
                            ? "bg-red-600 text-white border-red-600 shadow" 
                            : "bg-white hover:bg-slate-50 text-slate-705 border-slate-205"
                        }`}
                      >
                        Storm & Hail Drill
                      </button>
                      <button
                        onClick={() => setSimulatedDrillActive(simulatedDrillActive === "flood" ? null : "flood")}
                        className={`text-[10px] font-bold px-2.5 py-1.5 border rounded-lg cursor-pointer transition-all ${
                          simulatedDrillActive === "flood" 
                            ? "bg-red-600 text-white border-red-600 shadow" 
                            : "bg-white hover:bg-slate-50 text-slate-705 border-slate-205"
                        }`}
                      >
                        Cloudburst Flood Drill
                      </button>
                    </div>
                  </div>

                  <span className="text-[9px] font-black text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-150 uppercase tracking-widest leading-none">
                    ALERT NETWORK: ACTIVE
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* Active alerts in other districts sidebar/footer list */}
          {!simulatedDrillActive && warnings.length > 0 && (
            <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
              <h5 className="text-[9px] uppercase text-slate-450 font-black tracking-widest mb-2.5 select-none">
                {WARNING_UI_LABELS[language].activeWarnings}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {warnings.map((w) => {
                  const isCur = w.district.toLowerCase() === location.district.toLowerCase();
                  return (
                    <div 
                      key={w.id} 
                      onClick={() => handleDistrictChange(w.district)}
                      className={`p-2.5 border rounded-xl cursor-pointer transition-all ${
                        isCur 
                          ? "bg-rose-50 border-rose-250 text-rose-950 font-bold" 
                          : "bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-655"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[7.5px] uppercase font-black px-1.5 bg-slate-100 text-slate-500 rounded">
                          {w.category}
                        </span>
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                      </div>
                      <h6 className="text-[11px] font-extrabold truncate text-slate-900 pt-1 leading-none">
                        {w.district}, {w.state}
                      </h6>
                      <p className="text-[9px] text-slate-400 font-bold font-mono pt-1 leading-none">
                        {w.timeline}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

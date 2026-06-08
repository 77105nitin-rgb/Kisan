import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size to handle base64 images gracefully
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Lazy initializer for Google GenAI client to prevent startup failure if key is missing
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined!");
      throw new Error("GEMINI_API_KEY environment variable is required to access AI features.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// -------------------------------------------------------------------------
// REUSABLE STATIC DATA FOR MANDI AND SCHEMES
// -------------------------------------------------------------------------

let LIVE_MANDI_DATA = [
  // Cereals
  { id: "m1", cropName: "Wheat (Kanak)", market: "Khanna Mandi", state: "Punjab", price: 2350, minPrice: 2275, maxPrice: 2420, trend: "up", category: "cereals", changePercent: 1.2, date: "2026-06-07" },
  { id: "m1_c1", cropName: "Wheat (Kanak)", market: "Karnal Mandi", state: "Haryana", price: 2320, minPrice: 2250, maxPrice: 2380, trend: "stable", category: "cereals", changePercent: 0.0, date: "2026-06-07" },
  { id: "m1_c2", cropName: "Wheat (Kanak)", market: "Meerut Mandi", state: "Uttar Pradesh", price: 2380, minPrice: 2300, maxPrice: 2450, trend: "up", category: "cereals", changePercent: 0.8, date: "2026-06-07" },
  { id: "m2", cropName: "Paddy (Basmati)", market: "Karnal Mandi", state: "Haryana", price: 4100, minPrice: 3950, maxPrice: 4250, trend: "up", category: "cereals", changePercent: 2.1, date: "2026-06-07" },
  { id: "m2_c1", cropName: "Paddy (Basmati)", market: "Khanna Mandi", state: "Punjab", price: 4150, minPrice: 4000, maxPrice: 4300, trend: "up", category: "cereals", changePercent: 1.5, date: "2026-06-07" },
  { id: "m7", cropName: "Maize (Makka)", market: "Chhindwara Mandi", state: "Madhya Pradesh", price: 1950, minPrice: 1850, maxPrice: 2050, trend: "stable", category: "cereals", changePercent: -0.2, date: "2026-06-07" },
  { id: "m7_c1", cropName: "Barley (Jau)", market: "Hisar Mandi", state: "Haryana", price: 2150, minPrice: 2050, maxPrice: 2250, trend: "down", category: "cereals", changePercent: -1.1, date: "2026-06-07" },
  { id: "m7_c2", cropName: "Pearl Millet (Bajra)", market: "Alwar Mandi", state: "Rajasthan", price: 1880, minPrice: 1800, maxPrice: 1950, trend: "up", category: "cereals", changePercent: 0.4, date: "2026-06-07" },
  
  // Vegetables
  { id: "m4", cropName: "Potato (Aloo)", market: "Agra Mandi", state: "Uttar Pradesh", price: 1650, minPrice: 1500, maxPrice: 1800, trend: "stable", category: "vegetables", changePercent: 0.5, date: "2026-06-07" },
  { id: "m4_c1", cropName: "Potato (Aloo)", market: "Jalandhar Mandi", state: "Punjab", price: 1720, minPrice: 1600, maxPrice: 1850, trend: "up", category: "vegetables", changePercent: 1.8, date: "2026-06-07" },
  { id: "m5", cropName: "Onion (Pyaz)", market: "Lasalgaon Mandi", state: "Maharashtra", price: 2200, minPrice: 2000, maxPrice: 2400, trend: "up", category: "vegetables", changePercent: 3.4, date: "2026-06-07" },
  { id: "m5_c1", cropName: "Onion (Pyaz)", market: "Patiala Mandi", state: "Punjab", price: 2280, minPrice: 2150, maxPrice: 2450, trend: "down", category: "vegetables", changePercent: -0.9, date: "2026-06-07" },
  { id: "mv3", cropName: "Tomato (Tamatar)", market: "Garhshankar Mandi", state: "Punjab", price: 2850, minPrice: 2605, maxPrice: 3100, trend: "up", category: "vegetables", changePercent: 2.2, date: "2026-06-07" },
  { id: "mv4", cropName: "Cauliflower (Gobhi)", market: "Meerut Mandi", state: "Uttar Pradesh", price: 1900, minPrice: 1800, maxPrice: 2100, trend: "stable", category: "vegetables", changePercent: -0.1, date: "2026-06-07" },
  
  // Fruits
  { id: "mf1", cropName: "Apple (Saib)", market: "Srinagar Mandi", state: "Jammu & Kashmir", price: 8500, minPrice: 8000, maxPrice: 9200, trend: "up", category: "fruits", changePercent: 0.8, date: "2026-06-07" },
  { id: "mf2", cropName: "Banana (Kela)", market: "Jalgaon Mandi", state: "Maharashtra", price: 1800, minPrice: 1600, maxPrice: 2100, trend: "down", category: "fruits", changePercent: -1.5, date: "2026-06-07" },
  { id: "mf3", cropName: "Mango (Aam)", market: "Lucknow Mandi", state: "Uttar Pradesh", price: 4500, minPrice: 4200, maxPrice: 5000, trend: "up", category: "fruits", changePercent: 4.1, date: "2026-06-07" },
  { id: "mf4", cropName: "Pomegranate (Anar)", market: "Rajkot Mandi", state: "Gujarat", price: 6800, minPrice: 6500, maxPrice: 7200, trend: "stable", category: "fruits", changePercent: 0.0, date: "2026-06-07" },
  
  // Dry Fruits
  { id: "md1", cropName: "Almonds (Badam)", market: "Khari Baoli", state: "Delhi", price: 62000, minPrice: 59000, maxPrice: 65000, trend: "stable", category: "dry_fruits", changePercent: 0.0, date: "2026-06-07" },
  { id: "md2", cropName: "Cashews (Kaju)", market: "Mangalore Mandi", state: "Karnataka", price: 58000, minPrice: 55000, maxPrice: 61000, trend: "up", category: "dry_fruits", changePercent: 0.5, date: "2026-06-07" },
  { id: "md3", cropName: "Raisins (Kishmish)", market: "Sangli Mandi", state: "Maharashtra", price: 24000, minPrice: 22000, maxPrice: 26000, trend: "up", category: "dry_fruits", changePercent: 1.1, date: "2026-06-07" },
  
  // Pulses & Lentils
  { id: "mp1", cropName: "Gram (Chana)", market: "Rajkot Mandi", state: "Gujarat", price: 5100, minPrice: 4950, maxPrice: 5300, trend: "down", category: "pulses", changePercent: -0.5, date: "2026-06-07" },
  { id: "mp2", cropName: "Moong Dal", market: "Indore Mandi", state: "Madhya Pradesh", price: 7400, minPrice: 7200, maxPrice: 7650, trend: "up", category: "pulses", changePercent: 1.1, date: "2026-06-07" },
  { id: "mpmp", cropName: "Gram (Chana)", market: "Karnal Mandi", state: "Haryana", price: 5180, minPrice: 5000, maxPrice: 5400, trend: "up", category: "pulses", changePercent: 0.8, date: "2026-06-07" },
  { id: "mp3", cropName: "Urad Dal", market: "Jalandhar Mandi", state: "Punjab", price: 8200, minPrice: 7950, maxPrice: 8500, trend: "stable", category: "pulses", changePercent: 0.2, date: "2026-06-07" },
  { id: "mp4", cropName: "Arhar (Toor Dal)", market: "Lucknow Mandi", state: "Uttar Pradesh", price: 9100, minPrice: 8800, maxPrice: 9400, trend: "up", category: "pulses", changePercent: 1.7, date: "2026-06-07" },
  
  // Oilseeds
  { id: "m3", cropName: "Mustard (Sarson)", market: "Alwar Mandi", state: "Rajasthan", price: 5450, minPrice: 5300, maxPrice: 5600, trend: "down", category: "oilseeds", changePercent: -0.4, date: "2026-06-07" },
  { id: "mo1", cropName: "Mustard (Sarson)", market: "Bathinda Mandi", state: "Punjab", price: 5520, minPrice: 5400, maxPrice: 5680, trend: "down", category: "oilseeds", changePercent: -0.2, date: "2026-06-07" },
  { id: "mo2", cropName: "Groundnut (Moongfali)", market: "Rajkot Mandi", state: "Gujarat", price: 6200, minPrice: 6000, maxPrice: 6450, trend: "up", category: "oilseeds", changePercent: 0.9, date: "2026-06-07" },
  { id: "mo3", cropName: "Soyabean", market: "Indore Mandi", state: "Madhya Pradesh", price: 4600, minPrice: 4450, maxPrice: 4750, trend: "stable", category: "oilseeds", changePercent: 0.1, date: "2026-06-07" },
  
  // Spices
  { id: "ms1", cropName: "Cumin (Jeera)", market: "Unjha Mandi", state: "Gujarat", price: 34500, minPrice: 33000, maxPrice: 36200, trend: "up", category: "spices", changePercent: 2.8, date: "2026-06-07" },
  { id: "ms2", cropName: "Coriander (Dhania)", market: "Kota Mandi", state: "Rajasthan", price: 7200, minPrice: 7000, maxPrice: 7500, trend: "down", category: "spices", changePercent: -1.3, date: "2026-06-07" },
  { id: "ms3", cropName: "Turmeric (Haldi)", market: "Nizamabad Mandi", state: "Telangana", price: 12500, minPrice: 12000, maxPrice: 13200, trend: "up", category: "spices", changePercent: 1.5, date: "2026-06-07" },
  
  // Other Farm Produce
  { id: "m6", cropName: "Cotton (Narma)", market: "Bathinda Mandi", state: "Punjab", price: 6800, minPrice: 6500, maxPrice: 7100, trend: "down", category: "other", changePercent: -0.7, date: "2026-06-07" },
  { id: "m6_c1", cropName: "Cotton (Narma)", market: "Sirsa Mandi", state: "Haryana", price: 6720, minPrice: 6450, maxPrice: 7000, trend: "down", category: "other", changePercent: -1.1, date: "2026-06-07" },
  { id: "m6_c2", cropName: "Sugarcane (Ganna)", market: "Meerut Mandi", state: "Uttar Pradesh", price: 380, minPrice: 365, maxPrice: 400, trend: "stable", category: "other", changePercent: 0.0, date: "2026-06-07" }
];

const GOVERNMENT_SCHEMES = [
  {
    id: "pm-kisan",
    title: "PM-KISAN Samman Nidhi",
    benefit: "₹6,000 per year directly to bank account in 3 equal installments",
    eligibility: "All small and marginal landholding farmer families with land up to 2 hectares in their name.",
    documents: "Aadhaar Card, Land ownership papers (Jamabandi/Fard), Bank Account Passbook, Mobile Number",
    url: "https://pmkisan.gov.in"
  },
  {
    id: "fasal-bima",
    title: "PM Fasal Bima Yojana (Crop Insurance)",
    benefit: "Financial support/insurance cover for crop damage from sowing to harvesting cycle due to natural disasters.",
    eligibility: "All farmers growing notified crops in notified areas, whether tenant, loanee, or non-loanee.",
    documents: "Land Records, Sowing Certificate (Girdawari), Aadhaar, Bank Details, KYC documents",
    url: "https://pmfby.gov.in"
  },
  {
    id: "soil-health",
    title: "Soil Health Card Scheme",
    benefit: "Provides card reports indicating nutrient status of lands and suggestions on correct fertilizers, free updates every 3 years.",
    eligibility: "All operational farm-holdings inside the country are covered under testing circles.",
    documents: "Identity document, Aadhaar number, Soil sample reference coordinates details",
    url: "https://soilhealth.dac.gov.in"
  },
  {
    id: "solar-pump",
    title: "PM-KUSUM Scheme (Solar Pump Subsidy)",
    benefit: "60% subsidy for installing solar irrigation pumps, plus collateral or 30% bank loan backup.",
    eligibility: "Individual farmers, groups, co-operatives, water user associations possessing agricultural land.",
    documents: "Land details, Aadhaar, Bank reference branch code, electricity connection proof (if applicable)",
    url: "https://pmkusum.mnre.gov.in"
  }
];

// -------------------------------------------------------------------------
// API GATEWAYS
// -------------------------------------------------------------------------

// Health indicator
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Serve Mandi Data
app.get("/api/mandi-prices", (req, res) => {
  res.json({ status: "success", data: LIVE_MANDI_DATA });
});

// Automated dynamic price ticker interval mimicking real-time API integrations
setInterval(() => {
  // Let's modify 4 commodities at random to simulate real-time price updates
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * LIVE_MANDI_DATA.length);
    const item = LIVE_MANDI_DATA[randomIndex];
    
    // Create random tiny oscillation: between -1.5% and +1.5%
    const scale = (Math.random() * 3 - 1.5) / 100; // -0.015 to +0.015
    const change = Math.round(item.price * scale);
    
    const newPrice = item.price + change;
    // Keep price between min and max price limits
    if (newPrice >= item.minPrice && newPrice <= item.maxPrice) {
      item.price = newPrice;
      item.changePercent = parseFloat((scale * 100).toFixed(2));
      item.trend = scale > 0.001 ? "up" : scale < -0.001 ? "down" : "stable";
    }
  }
}, 5000);

// Severe Weather Alerts static database
const SEVERE_WEATHER_ALERTS = [
  {
    id: "wea_1",
    alertName: "Severe Hailstorm & Gale Warning",
    alertName_pa: "ਗੜੇਮਾਰੀ ਅਤੇ ਤੇਜ਼ ਝੱਖੜ ਦੀ ਚੇਤਾਵਨੀ",
    alertName_hi: "भीषण ओलावृष्टि और तेज तूफान की चेतावनी",
    severity: "high", // low, medium, high, critical
    category: "hailstorm",
    district: "Bathinda",
    state: "Punjab",
    timeline: "Sustained impact imminent in next 4-8 hours",
    timeline_pa: "ਅਗਲੇ 4-8 ਘੰਟਿਆਂ ਵਿੱਚ ਸੰਭਾਵੀ ਅਸਰ",
    timeline_hi: "अगले 4-8 घंटों में गंभीर प्रभाव की संभावना",
    details: "Supercell active over Southeast Punjab boundary. Expect massive hailstones up to 3cm, with wind speed gusts in excess of 65 km/h. High potential damage to standing cotton crops and young rice nurseries.",
    details_pa: "ਦੱਖਣ-ਪੂਰਬੀ ਪੰਜਾਬ ਖੇਤਰ ਉੱਤੇ ਸੁਪਰਸੈੱਲ ਬੱਦਲ ਸਰਗਰਮ ਹਨ। 3 ਸੈਂਟੀਮੀਟਰ ਤੱਕ ਦੀ ਗੜੇਮਾਰੀ ਅਤੇ 65 ਕਿਲੋਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ ਤੋਂ ਵੱਧ ਤੇਜ਼ ਹਵਾਵਾਂ ਚੱਲਣ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਖੜ੍ਹੀਆਂ ਫਸਲਾਂ ਅਤੇ ਝੋਨੇ ਦੀ ਪਨੀਰੀ ਲਈ ਭਾਰੀ ਖ਼ਤਰਾ।",
    details_hi: "दक्षिण-पूर्वी पंजाब सीमा पर मजबूत ओलावृष्टि बादल सक्रिय हैं। 3 सेमी तक के ओले और 65 किमी/घंटे से अधिक की आंधी चलने की आशंका है। कपास और धान की नर्सरी को सुरक्षित स्थानों पर ढकें।",
    countdownHours: 4,
    checklist: [
      "Secure shade net greenhouses instantly with outer support cables.",
      "Harvest early any mature vegetable varieties and move to safe sheds.",
      "Clear drainage blocks inside fields to handle flash water discharges.",
      "Cover open seedbeds or nurseries with protective plastic sheets."
    ],
    checklist_pa: [
      "ਗ੍ਰੀਨਹਾਉਸ ਅਤੇ ਨਰਸਰੀਆਂ ਨੂੰ ਮਜ਼ਬੂਤ ਤਾਰਾਂ ਨਾਲ ਬੰਨ੍ਹ ਕੇ ਸੁਰੱਖਿਅਤ ਕਰੋ।",
      "ਪੱਕ ਚੁੱਕੀਆਂ ਸਬਜ਼ੀਆਂ ਦੀ ਤੁਰੰਤ ਕਟਾਈ ਕਰਕੇ ਸੁਰੱਖਿਅਤ ਸ਼ੈੱਡਾਂ ਵਿੱਚ ਰੱਖੋ।",
      "ਖੇਤ ਵਿੱਚ ਸਿੰਚਾਈ ਵਾਲੀਆਂ ਨਾਲੀਆਂ ਦਾ ਰਸਤਾ ਸਾਫ਼ ਕਰੋ ਤਾਂ ਜੋ ਪਾਣੀ ਆਸਾਨੀ ਨਾਲ ਨਿਕਲ ਸਕੇ।",
      "ਖੁੱਲ੍ਹੀਆਂ ਪਨੀਰੀਆਂ ਜਾਂ ਨਰਸਰੀਆਂ ਨੂੰ ਪਲਾਸਟਿਕ ਦੀਆਂ ਸ਼ੀਟਾਂ ਨਾਲ ਢੱਕੋ।"
    ],
    checklist_hi: [
      "ग्रीनहाउस और नर्सरी को मजबूत रस्सियों व केबलों से तुरंत सुरक्षित करें।",
      "पकी हुई सब्जियों की तुरंत कटाई कर सुरक्षित गोदामों या शेड में ले जाएं।",
      "खेतों की जलनिकासी नालियों को साफ करें ताकि जलजमाव न हो पाए।",
      "खुली क्यारियों या धान की नर्सरी को सुरक्षात्मक प्लास्टिक शीट से ढकें।"
    ]
  },
  {
    id: "wea_2",
    alertName: "Extreme Rainfall & Flash Flood Flash Alerts",
    alertName_pa: "ਬਹੁਤ ਭਾਰੀ ਮੀਂਹ ਅਤੇ ਹੜ੍ਹ ਵਰਗੀ ਸਥਿਤੀ ਦਾ ਅਲਰਟ",
    alertName_hi: "अत्यधिक भारी वर्षा और अचानक बाढ़ का अलर्ट",
    severity: "critical",
    category: "flood",
    district: "Karnal",
    state: "Haryana",
    timeline: "Starts within next 2-3 hours",
    timeline_pa: "ਅਗਲੇ 2-3 ਘੰਟਿਆਂ ਵਿੱਚ ਸ਼ੁਰੂ ਹੋਣ ਦੀ ਸੰਭਾਵਨਾ",
    timeline_hi: "अगले 2-3 घंटों के भीतर तीव्र वर्षा आरंभ",
    details: "Intense tropical depression active over Yamuna basin. Multi-station models confirm rain accumulative score exceeding 120mm. High risk of immediate flooding under low-lying flat agricultural plains.",
    details_pa: "ਯਮੁਨਾ ਬੇਸਿਨ ਉੱਤੇ ਭਾਰੀ ਮਾਨਸੂਨ ਦਬਾਅ ਬਣਿਆ ਹੋਇਆ ਹੈ। 120 ਮਿਲੀਮੀਟਰ ਤੋਂ ਵੱਧ ਬਾਰਿਸ਼ ਹੋਣ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਨੀਵੇਂ ਇਲਾਕਿਆਂ ਵਿੱਚ ਹੜ੍ਹ ਆਉਣ ਦੀ ਗੰਭੀਰ ਚੇਤਾਵਨੀ।",
    details_hi: "यमुना बेसिन क्षेत्र पर गहरा मौसमी कम दबाव का क्षेत्र सक्रिय है। 120 मिमी से अधिक मूसलाधार बारिश की आशंका है। निचले खेतों में जलभराव की गंभीर स्थिति बन सकती है।",
    countdownHours: 3,
    checklist: [
      "Abolish and cease all fertilizer broadcasting routines entirely.",
      "Activate deep-trench water channels around your prime cultivation land.",
      "Move farm livestock, tools, and dry animal feeds to elevated structures.",
      "Postpone any planned crop threshing operations to stop wet rotting."
    ],
    checklist_pa: [
      "ਖੇਤਾਂ ਵਿੱਚ ਯੂਰੀਆ ਜਾਂ ਕਿਸੇ ਖਾਦ ਦਾ ਸਪਰੇਅ ਪੂਰੀ ਤਰ੍ਹਾਂ ਰੋਕ ਦਿਓ।",
      "ਮੁੱਖ ਫਸਲਾਂ ਦੇ ਆਲੇ-ਦੁਆਲੇ ਡੂੰਘੀਆਂ ਨਾਲੀਆਂ ਬਣਾ ਕੇ ਪਾਣੀ ਬਾਹਰ ਕੱਢਣ ਦਾ ਪ੍ਰਬੰਧ ਕਰੋ।",
      "ਪਸ਼ੂਆਂ, ਖੇਤੀ ਸੰਦਾਂ ਅਤੇ ਸੁੱਕੇ ਚਾਰੇ ਨੂੰ ਉੱਚੇ ਸਥਾਨਾਂ 'ਤੇ ਤਬਦੀਲ ਕਰੋ।",
      "ਗਿੱਲੀ ਸੜਨ ਤੋਂ ਬਚਣ ਲਈ ਫਸਲ ਗਾਹੁਣ ਦੇ ਸਾਰੇ ਕੰਮ ਮੁਲਤਵੀ ਕਰੋ।"
    ],
    checklist_hi: [
      "खेतों में यूरिया या किसी अन्य उर्वरक का छिड़काव पूरी तरह से रोक दें।",
      "मुख्य फसलों के चारों ओर गहरी खाई जैसी जल निकासी नालियाँ तैयार रखें।",
      "पशुओं, कृषि यंत्रों और सूखे चारे को ऊंचे स्थानों पर तुरंत स्थानांतरित करें।",
      "फसलों की मड़ाई/थ्रेसिंग का काम बारिश समाप्त होने तक स्थगित रखें।"
    ]
  },
  {
    id: "wea_3",
    alertName: "Severe Cyclonic Storm & Squall stream advisory",
    alertName_pa: "ਭਿਆਨਕ ਚੱਕਰਵਾਤੀ ਤੂਫ਼ਾਨ ਅਤੇ ਤੇਜ਼ ਹਵਾਵਾਂ ਦੀ ਚੇਤਾਵਨੀ",
    alertName_hi: "भीषण चक्रवाती तूफान और तेज हवाओं की चेतावनी",
    severity: "critical",
    category: "cyclone",
    district: "Sirsa",
    state: "Haryana",
    timeline: "Expected landfall within 6-12 hours",
    timeline_pa: "ਅਗਲੇ 6-12 ਘੰਟਿਆਂ ਵਿੱਚ ਜ਼ਮੀਨ ਨਾਲ ਟਕਰਾਉਣ ਦਾ ਅੰਦਾਜ਼ਾ",
    timeline_hi: "अगले 6-12 घंटों में तेज अंधड़ के साथ टकराने का अंदेशा",
    details: "Cyclone pressure path crossing right through Western Haryana fringes. Expected wind drafts of 80 to 95 km/h. Strong lodging risk for tall crops like sugarcane and mature maize plantings.",
    details_pa: "ਚੱਕਰਵਾਤੀ ਹਵਾਵਾਂ ਦਾ ਮਾਰਗ ਪੱਛਮੀ ਹਰਿਆਣਾ ਦੇ ਸਰਹੱਦੀ ਇਲਾਕਿਆਂ ਨੂੰ ਪ੍ਰਭਾਵਿਤ ਕਰੇਗਾ। 80 ਤੋਂ 95 ਕਿਲੋਮੀਟਰ ਪ੍ਰਤੀ ਘੰਟਾ ਦੀ ਰਫਤਾਰ ਨਾਲ ਝੱਖੜ ਚੱਲਣ ਦੀ ਸੰਭਾਵਨਾ ਹੈ। ਗੰਨੇ ਅਤੇ ਮੱਕੀ ਦੀ ਫਸਲ ਦੇ ਡਿੱਗਣ ਦਾ ਵੱਡਾ ਖਤਰਾ।",
    details_hi: "चक्रवाती तूफान का दबाव पश्चिमी हरियाणा के सीमावर्ती क्षेत्रों से गुजरेगा। 80 से 95 किमी/घंटे की रफ्तार से विनाशकारी हवाएं चल सकती हैं। गन्ने व मक्के जैसी ऊंची फसलों के गिरने का उच्च जोखिम है।",
    countdownHours: 8,
    checklist: [
      "Support tall-standing Sugarcane clumps using cooperative binding.",
      "Refrain from utilizing drip systems or loose irrigation to avoid mud lodging.",
      "Secure dynamic pump-sets and cover electrical distribution heads.",
      "Fasten all auxiliary stable sheets and warehouse rooftops firmly."
    ],
    checklist_pa: [
      "ਗੰਨੇ ਦੀਆਂ ਖੜ੍ਹੀਆਂ ਫਸਲਾਂ ਨੂੰ ਆਪਸ ਵਿੱਚ ਬੰਨ੍ਹ ਕੇ ਸਹਾਰਾ ਦਿਓ ਤਾਂ ਜੋ ਡਿੱਗਣ ਨਾ।",
      "ਕੀਚੜ ਕਾਰਨ ਬੂਟਿਆਂ ਦੇ ਉਖੜਨ ਤੋਂ ਬਚਣ ਲਈ ਸਿੰਚਾਈ ਪੂਰੀ ਤਰ੍ਹਾਂ ਰੋਕ ਦਿਓ।",
      "ਮੋਟਰ ਪੰਪ-ਸੈੱਟ ਅਤੇ ਬਿਜਲੀ ਦੇ ਬੋਰਡਾਂ ਨੂੰ ਪਲਾਸਟਿਕ ਸ਼ੀਟ ਨਾਲ ਸੁਰੱਖਿਅਤ ਢੱਕੋ।",
      "ਗੋਦਾਮ ਦੇ ਸ਼ੈੱਡਾਂ ਅਤੇ ਪੱਕੇ ਕਮਰਿਆਂ ਦੀਆਂ ਛੱਤਾਂ ਨੂੰ ਮਜ਼ਬੂਤੀ ਨਾਲ ਬੰਨ੍ਹੋ।"
    ],
    checklist_hi: [
      "गन्ने की खड़ी फसलों को रस्सियों से आपस में बांधकर सहारा दें ताकि वे गिरने से बचें।",
      "मिट्टी ढीली होने और उखड़ने से बचाने के लिए सिंचाई तत्काल रोक दें।",
      "सिंचाई पंपसेट और खुले बिजली के मोटरों को सुरक्षात्मक आवरण से ढके।",
      "कृषि गोदाम के टिन शेड और छतों को भारी वजन या बोल्ट से कसकर कसें।"
    ]
  }
];

// Serve severe weather warnings
app.get("/api/weather-warnings", (req, res) => {
  res.json({ status: "success", data: SEVERE_WEATHER_ALERTS });
});

// Serve Gov Schemes
app.get("/api/schemes", (req, res) => {
  res.json({ status: "success", data: GOVERNMENT_SCHEMES });
});

// -------------------------------------------------------------------------
// COMPREHENSIVE EXPERT AGRICULTURAL FALLBACKS (RECOVERY MODE)
// -------------------------------------------------------------------------

const FALLBACK_DISEASES: Record<string, any> = {
  Wheat: {
    cropType: "Wheat",
    diseaseName: "Yellow Rust (Pila Rati)",
    confidence: 0.94,
    causes: "Puccinia striiformis fungal spores spreading through air currents under high humidity and cool temperatures (10-20°C). Over-irrigation and excess Urea exacerbate outbreak.",
    symptoms: [
      "Bright yellow, narrow linear stripes consisting of pustules along leaf veins",
      "Pustules readily break to reveal fine, dusty orange-yellow powdery spores",
      "Leaves turn yellow and dry up prematurely, leading to reduced grain size"
    ],
    prevention: "Plant rust-resistant certified seeds such as HD 3226, PBW 725, or DBW 187. Avoid late sowing.",
    treatment: "Apply Propiconazole 25% EC (such as Tilt) @ 200 ml diluted in 200 liters of water per acre, or spray Tebufenozide immediately upon visual confirmation."
  },
  Paddy: {
    cropType: "Paddy",
    diseaseName: "Bacterial Leaf Blight (BLB)",
    confidence: 0.92,
    causes: "Xanthomonas oryzae bacteria entering through wind wounds during wet monsoon rainy seasons. Sparked by high Nitrogen levels.",
    symptoms: [
      "Wavy translucent yellow to straw-colored lesions starting at leaf tips and margins",
      "Affected leaves dry rapidly, showing papery white or gray dead sections",
      "Presence of tiny amber-colored bacterial ooze balls on leaf veins in the early mornings"
    ],
    prevention: "Avoid excessive Nitrogen fertilizer; use balanced NPK ratios. Cultivate resistant strains (e.g. CSR 30, PR 126). Keep fields well-drained as standing water propagates infection.",
    treatment: "Spray clinical combination of Streptocycline @ 6 grams mixed with 50 grams of Copper Oxychloride inside 150-200 liters of water per acre."
  },
  Mustard: {
    cropType: "Mustard",
    diseaseName: "White Rust (Albugo candida)",
    confidence: 0.89,
    causes: "Albugo candida water mold thriving in cool, damp winter mornings with heavy morning fog.",
    symptoms: [
      "White or creamy chalk-like raised blisters (pustules) on the underside of leaves",
      "Corresponding light green or yellow chlorotic spots on the upper leaf surface",
      "Staghead phase causing complete swelling and distortion of floral parts"
    ],
    prevention: "Sow seeds early in October to escape peak fog windows. Deep summer plowing; 3-year crop rotation.",
    treatment: "Spray Metalaxyl 8% + Mancozeb 64% WP (such as Ridomil Gold) @ 2 grams per liter of water."
  },
  Cotton: {
    cropType: "Cotton",
    diseaseName: "Cotton Leaf Curl Disease (CLCuD)",
    confidence: 0.91,
    causes: "Begomovirus pathogen vectored and rapidly spread by the sap-sucking Whitefly (Bemisia tabaci) during warm, humid spells.",
    symptoms: [
      "Upward or downward curling and thickening of leaf margins",
      "Severe thickening of major leaf veins with leafy green outgrowths (enations) on the undersides",
      "Highly stunted crop node development leading to severe reduction of bolls"
    ],
    prevention: "Maintain strict eradication of alternate weed hosts like Kanghi. Grow resistant hybrids.",
    treatment: "Mitigate vector by spraying Imidacloprid 17.8% SL @ 40 ml or Thiamethoxam 25% WG @ 80 grams in 150 liters of water per acre."
  },
  Potato: {
    cropType: "Potato",
    diseaseName: "Late Blight (Phytophthora)",
    confidence: 0.95,
    causes: "Phytophthora infestans mold propagating with hyper-speed during high relative humidity (>90%) and mild temperatures (15-22°C).",
    symptoms: [
      "Water-soaked, irregular purple-black spots on leaves, often starting at the tips",
      "Fuzzy white biological mold growth visible on the leaf undersides in humid mornings",
      "Tubers develop irregular dark, sunken patches with reddish-brown dry rot inside"
    ],
    prevention: "Plant healthy, disease-free seed tubers. Maintain high earthing-up ridges. Apply prophylactic sprays of Mancozeb.",
    treatment: "Apply systemic fungicide such as Metalaxyl 8% + Mancozeb 64% @ 2.5 grams per liter, or Cymoxanil + Mancozeb @ 2g per liter."
  },
  Onion: {
    cropType: "Onion",
    diseaseName: "Purple Blotch (Alternaria porri)",
    confidence: 0.88,
    causes: "Alternaria porri fungus spreading during hot, wet, muggy rainy spells with prolonged leaf wetness.",
    symptoms: [
      "Small white or water-soaked spots on leaves that rapidly turn distinct purple in centers",
      "Spots enlarge to form concentric rings, leading to leaf tipping, drying, and eventual collapse of stalks",
      "Bulb rot beginning at the neck during storage"
    ],
    prevention: "Improve soil drainage and space onion seed rows generously. Perform 2-year crop rotation with non-allium plants.",
    treatment: "Spray Mancozeb 75% WP @ 2.5g/liter or Metiram 55% + Pyraclostrobin 5% DF @ 2g per liter of water."
  }
};

const GENERIC_FALLBACK_DISEASE = {
  cropType: "General Crop",
  diseaseName: "Leaf Spot & Moisture Damage",
  confidence: 0.85,
  causes: "General fungal leaf pathogens activated by damp microclimate conditions, combined with mild Potassium deficiency in soil.",
  symptoms: [
    "Small circular brown spots with faint yellow halos on outer foliage",
    "Premature leaf yellowing along tips and margins",
    "Stressed leaves with poor texture and mild curling"
  ],
  prevention: "Ensure balanced watering cycles; avoid watering overhead during hot afternoons. Apply potash to build cell wall strength.",
  treatment: "Apply natural Neem seed kernel extract (NSKE) at 5% or spray standard protective Copper Oxychloride @ 2.5g per liter of water."
};

const FALLBACK_SOIL: Record<string, any> = {
  Wheat: {
    soilType: "Sandy Loam (Virasat Profile)",
    nitrogen: 210,
    phosphorus: 18,
    potassium: 245,
    ph: 6.8,
    deficiencies: ["Available Nitrogen (Low)", "Zinc deficiency (Marginal)", "Soil Organic Carbon (Low)"],
    suitableCrops: ["Wheat", "Mustard", "Barley", "Gram"],
    analysis: "Your sandy loam soil is well-drained and easily cultivated. With a pH of 6.8, nutrient availability is excellent. However, low organic carbon and nitrogen values indicate a risk of poor tillering of wheat. Potassium is highly sufficient, so additional potash is not critically needed.",
    fertilizerRecommendation: "Incorporate 6-8 tons of compost per acre. Apply 55 kg of Urea (at sowing, 21 days, and 45 days) along with 50 kg of Single Super Phosphate (SSP) per acre. Also, add Zinc Sulphate (21%) @ 10 kg/acre to prevent zinc chlorosis."
  },
  Paddy: {
    soilType: "Clay Loam (Dhan Mitti Profile)",
    nitrogen: 185,
    phosphorus: 16,
    potassium: 310,
    ph: 7.2,
    deficiencies: ["Iron deficiency (Chlorosis)", "Organic Matter (Moderate)", "Nitrogen (Low)"],
    suitableCrops: ["Paddy / Rice", "Sugarcane", "Wheat"],
    analysis: "Heavy clay-loam structure with excellent water retention properties, making it highly suitable for puddle paddy cultivation. The mild alkaline pH is normal for crop yield. Nitrogen levels are low and organic carbon needs replenishment.",
    fertilizerRecommendation: "Apply 60 kg of DAP (Diammonium Phosphate) and 20 kg of MOP (Muriate of Potash) per acre as a basal dose. Broad-cast 90 kg of Urea in three split doses: at transplanting, 21 days, and 45 days. Spray Ferrous Sulphate (0.5%) if leaves yellow."
  },
  Mustard: {
    soilType: "Loamy Sand (Sarson Profile)",
    nitrogen: 170,
    phosphorus: 15,
    potassium: 220,
    ph: 7.0,
    deficiencies: ["Sulphur deficiency (Critical)", "Nitrogen (Low)", "Boron (Low)"],
    suitableCrops: ["Mustard", "Guar", "Chickpea", "Barley"],
    analysis: "Light sand-loam structure with dry characteristics. Neutral pH 7.0 is ideal. Mustard has high Sulphur demands to synthesise oil content. Current Sulphur and Boron levels are critically low.",
    fertilizerRecommendation: "Apply Bentonite Sulphur @ 10 kg/acre or Gypsum @ 100 kg/acre during land preparation. Use 40 kg Urea and 35 kg Single Super Phosphate (containing sulphur) per acre as basal fertilizer. Foliar spray Borax (0.1%) during flowering."
  },
  Cotton: {
    soilType: "Deep Black / Alluvial Soil (Kapas Black)",
    nitrogen: 195,
    phosphorus: 20,
    potassium: 280,
    ph: 7.6,
    deficiencies: ["Magnesium deficiency", "Nitrogen (Low)", "Organic Matter"],
    suitableCrops: ["Cotton", "Soybean", "Sorghum", "Pigeon Pea"],
    analysis: "Rich, deep soil with high cation-exchange capacity. The pH of 7.6 is slightly alkaline but optimal for cotton roots. Magnesium deficiency can cause reddish leaf margins during peak boll formation; Nitrogen needs careful management.",
    fertilizerRecommendation: "Add 15 kg/acre of Magnesium Sulphate to prevent leaf reddening. Apply Nitrogen @ 60 kg/acre in splits (basal, square formation, and early flowering phases) along with 30 kg Phosphorus."
  },
  Potato: {
    soilType: "Sandy Loam (Aloo Root Sand)",
    nitrogen: 220,
    phosphorus: 24,
    potassium: 190,
    ph: 6.2,
    deficiencies: ["Potassium deficiency (High potato demand)", "Calcium (Medium)", "Nitrogen"],
    suitableCrops: ["Potato", "Onion", "Moong Bean", "Radish"],
    analysis: "Perfect loose sandy-loam texture permitting free tuber expansion. Potato requires immense amounts of Potassium to transfer starch directly into tubers. Potassium levels are currently low, and the soil is slightly acidic (pH 6.2) which potato tolerates well.",
    fertilizerRecommendation: "Apply 120 kg MOP (Muriate of Potash) per acre in a split formulation: 60 kg at sowing, and 60 kg during earthing up. Balance with 80 kg Urea and 80 kg Single Super Phosphate (SSP) to satisfy phosphorus needs."
  },
  Onion: {
    soilType: "Rich Loam (Pyaz Loam)",
    nitrogen: 190,
    phosphorus: 22,
    potassium: 215,
    ph: 6.7,
    deficiencies: ["Sulphur deficiency (Alliums odor)", "Nitrogen (Moderate)", "Zinc"],
    suitableCrops: ["Onion", "Garlic", "Tomato", "Wheat"],
    analysis: "Well-structured rich loam profile with normal pH. Alliums like Onion depend directly on Sulphur for bulb pungency, cell walls, and shell storability. Nitrogen is moderate but requires quick booster feeds.",
    fertilizerRecommendation: "Apply Gypsum @ 80 kg/acre as basal dose. Use 50 kg Urea, 50 kg DAP, and 40 kg MOP per acre during transplanting. Spray micro-nutrients including Zinc and Boron 30 days after transplanting."
  }
};

const GENERIC_SOIL_FALLBACK = {
  soilType: "Medium Sandy Loam",
  nitrogen: 190,
  phosphorus: 15,
  potassium: 210,
  ph: 6.5,
  deficiencies: ["Organic Carbon (Low)", "Nitrogen & Phosphorus deficit"],
  suitableCrops: ["Mustard", "Wheat", "Gram", "Potato"],
  analysis: "Your agricultural soil is a standard sandy loam with fast permeability. Soil organic matter is below par, causing poor crop water absorption index and weak nutrient buffer capacity.",
  fertilizerRecommendation: "Apply 10 tonnes of organic compost or green manure per acre. Use standard NPK 12:32:16 complex @ 75 kg per acre during field preparation."
};

/**
 * Robust async retry wrapper with exponential backoff for APIs
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 3, delay = 800): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;
    console.warn(`[AI Kisan Mitra] API call failed, retrying in ${delay}ms... (${retries - 1} retries left)`, error);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

// 1. Crop Disease Detection Gateway (Supports JPEG, PNG, WebP & dynamic mime-type checks)
app.post("/api/gemini/disease-detect", async (req, res) => {
  const { imageBase64, cropType } = req.body;
  
  if (!imageBase64) {
    res.status(400).json({ error: "No image content provided." });
    return;
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  // Detect image mimeType dynamically from base64 data string
  let detectedMimeType = "image/jpeg";
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  if (mimeMatch) {
    detectedMimeType = mimeMatch[1];
  }

  const promptText = `
    You are an expert plant pathologist and agricultural research officer specialized in Indian crops (especially Wheat, Paddy, Mustard, Cotton, Potato, Onions).
    Analyze the attached image of a ${cropType || "general crop"} plant.
    Provide crop disease analysis as a valid, parsable JSON matching this schema:
    {
      "cropType": "Crop name (e.g., Wheat)",
      "diseaseName": "Accurate common name in English & vernacular Hindi/Punjabi if known (e.g., Leaf Rust (Pila Rati))",
      "confidence": 0.0 to 1.0 confidence level,
      "causes": "Explanation of biological agents (fungal, pest, virus, nutrient deficiency) responsible",
      "symptoms": ["List and describe key physical changes and symptoms visible on leaves/stems"],
      "prevention": "Practical measures before next sowing/cultural methods",
      "treatment": "Direct biological or chemical cure suggestions (prescribe specific, safe chemical combinations with dilution advice for Indian farmers)"
    }
    If the crop appears healthy, set diseaseName to "Healthy Plant" and provide recommendations to maintain soil vigor.
    Ensure the response contains ONLY the valid JSON, raw and uncorrupted, and matches exactly the parameters above.
  `;

  const imagePart = {
    inlineData: {
      mimeType: detectedMimeType,
      data: cleanBase64,
    },
  };

  const textPart = {
    text: promptText,
  };

  try {
    const ai = getGenAI();
    
    const apiCall = () => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cropType: { type: Type.STRING },
            diseaseName: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            causes: { type: Type.STRING },
            symptoms: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            prevention: { type: Type.STRING },
            treatment: { type: Type.STRING }
          },
          required: ["cropType", "diseaseName", "confidence", "causes", "symptoms", "prevention", "treatment"]
        }
      }
    });

    // Execute with backoff retries
    const response = await retryWithBackoff(apiCall, 3, 1000);
    const resultText = response.text;
    
    if (!resultText) {
      throw new Error("Gemini returned empty diagnosis stream.");
    }

    const reportData = JSON.parse(resultText);
    res.json({ ...reportData, isFallback: false });
  } catch (error: any) {
    console.error("[AI Kisan Mitra] Realtime Gemini crop disease detect failed. Triggering recovery mode falling back...", error);

    // Dynamic expert fallback recovery based on cropType selection
    const cropKey = cropType || "Wheat";
    const recoveryReport = FALLBACK_DISEASES[cropKey] || GENERIC_FALLBACK_DISEASE;
    
    res.json({
      ...recoveryReport,
      isFallback: true,
      fallbackReason: error.message || "Dynamic Pathogen API was offline."
    });
  }
});


// 2. Multilingual Ag-Advisor Assistant Chat Route
app.post("/api/gemini/advisor-chat", async (req, res) => {
  try {
    const { message, history, language } = req.body;
    if (!message) {
      res.status(400).json({ error: "Message is required." });
      return;
    }

    const ai = getGenAI();

    // System instruction sets multilingual capability, friendliness, and regional sensitivity
    const systemIns = `
      You are "AI Kisan Mitra", an expert Indian Agricultural Officer, agronomist, and farmer companion.
      Your goal is to answer agricultural questions about sowing, irrigation rates, fertilizer calculations, pest controls, crop diseases, organic farming, government schemes, weather plans, and live market trends.
      IMPORTANT GUIDELINES:
      1. Deliver responses strictly in the requested language: Selected Preferred Language is [${language || "English"}].
         - If 'pa' or Punjabi, reply with polite and clear Gurmukhi scripts.
         - If 'hi' or Hindi, reply with clear Devanagari scripts.
         - If 'en' or English, use simple, friendly terms.
      2. Keep technical jargon friendly; explain urea/potash ratios simply.
      3. For weather and watering recommendations, support localized, seasonal guidelines.
      4. Always format your output cleanly using markdown headings, bullet points, and highlight terms for farmers readability.
    `;

    // Map the simple chat history objects to the content structure if provided
    const chatParts: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        chatParts.push({
          role: h.sender === "user" ? "user" : "model",
          parts: [{ text: h.message }]
        });
      });
    }

    // Append current prompt
    chatParts.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatParts,
      config: {
        systemInstruction: systemIns,
        temperature: 0.7,
      },
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Gemini advisor chat failed:", error);
    res.status(500).json({ error: error.message || "Failed to fetch response" });
  }
});

// 3. Oral Assistant Voice Synthesis (Text to Speech) using gemini-3.1-flash-tts-preview
app.post("/api/gemini/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text content is required." });
      return;
    }

    const ai = getGenAI();
    const chosenVoice = voice || "Kore"; // Choose between Puck, Charon, Kore, Fenrir, Zephyr

    const promptText = `Speak in a pleasant, professional agricultural advisor tone: ${text}`;

    // Request speech audio using standard tts modality
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Failed to generate vocal audio stream from Gemini TTS" });
    }
  } catch (error: any) {
    console.error("Gemini voice synthesis failed:", error);
    res.status(500).json({ error: error.message || "Failed to process speech synthesis" });
  }
});

// 4. Soil Health Analyzer Report parser (accepts either imageBase64 or values text)
app.post("/api/gemini/analyze-soil", async (req, res) => {
  const { imageBase64, textualData, cropGoal } = req.body;
  const analysisPrompt = `
    You are an expert soil chemist and agronomist. 
    Analyze the soil profile report provided. Target crop goal is [${cropGoal || "Wheat/Generic"}].
    Please respond as a detailed JSON output strictly complying with the following schema:
    {
      "soilType": "Extracted soil classification (e.g. Clayey-loam)",
      "nitrogen": number (estimated Nitrogen ppm or index value, 0 if unknown),
      "phosphorus": number (P ppm or index value, 0 if unknown),
      "potassium": number (K ppm or index value, 0 if unknown),
      "ph": number (soil pH, 7 if unknown),
      "deficiencies": ["List nutrient element gaps or pH issues"],
      "suitableCrops": ["Top 3 crops recommended based on this health profile"],
      "analysis": "Markdown summarized explanation of soil health status in friendly farmer language",
      "fertilizerRecommendation": "Explicit NPK application advice, urea/potash ratios, and organic manure suggestions"
    }
    If values are provided via crop data rather than a health sheet image directly, parse them accurately to form the expert report.
  `;

  // Detect image mimeType dynamically from base64 data string if present
  let detectedMimeType = "image/jpeg";
  let cleanBase64 = "";
  if (imageBase64) {
    cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    if (mimeMatch) {
      detectedMimeType = mimeMatch[1];
    }
  }

  try {
    const ai = getGenAI();

    const apiCall = () => {
      if (imageBase64) {
        return ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: {
            parts: [
              { inlineData: { mimeType: detectedMimeType, data: cleanBase64 } },
              { text: analysisPrompt }
            ]
          },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                soilType: { type: Type.STRING },
                nitrogen: { type: Type.NUMBER },
                phosphorus: { type: Type.NUMBER },
                potassium: { type: Type.NUMBER },
                ph: { type: Type.NUMBER },
                deficiencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                suitableCrops: { type: Type.ARRAY, items: { type: Type.STRING } },
                analysis: { type: Type.STRING },
                fertilizerRecommendation: { type: Type.STRING }
              },
              required: ["soilType", "nitrogen", "phosphorus", "potassium", "ph", "deficiencies", "suitableCrops", "analysis", "fertilizerRecommendation"]
            }
          }
        });
      } else {
        return ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            { text: `Soil inputs textual state: ${JSON.stringify(textualData || {})}. Sowing goal: ${cropGoal}.` },
            { text: analysisPrompt }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                soilType: { type: Type.STRING },
                nitrogen: { type: Type.NUMBER },
                phosphorus: { type: Type.NUMBER },
                potassium: { type: Type.NUMBER },
                ph: { type: Type.NUMBER },
                deficiencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                suitableCrops: { type: Type.ARRAY, items: { type: Type.STRING } },
                analysis: { type: Type.STRING },
                fertilizerRecommendation: { type: Type.STRING }
              },
              required: ["soilType", "nitrogen", "phosphorus", "potassium", "ph", "deficiencies", "suitableCrops", "analysis", "fertilizerRecommendation"]
            }
          }
        });
      }
    };

    const response = await retryWithBackoff(apiCall, 3, 1000);
    const resultText = response.text;
    
    if (!resultText) {
      throw new Error("Soil classification response text is empty.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("[AI Kisan Mitra] Soil analysis API failed. Entering recovery mode using soil fallback...", error);
    
    const cropKey = cropGoal || "Wheat";
    const recoverySoil = FALLBACK_SOIL[cropKey] || GENERIC_SOIL_FALLBACK;
    
    res.json({
      ...recoverySoil,
      isFallback: true,
      fallbackReason: error.message || "Dynamic Soil Chemist API was offline."
    });
  }
});

// -------------------------------------------------------------------------
// VITE DEV SERVER OR STATIC SERVING MIDDLEWARE Setup
// -------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI Kisan Mitra] Fullstack server successfully booted on port ${PORT}`);
  });
}

startServer();

import React, { useState } from "react";
import { Sparkles, FlaskConical, CircleAlert, Beaker, CheckCircle, Table, Brain } from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { LanguageCode, SoilReport } from "../types";
import { syncSoilReportToSupabase } from "../supabase";

interface SoilAnalyzerProps {
  language: LanguageCode;
  userId: string;
}

export default function SoilAnalyzer({ language, userId }: SoilAnalyzerProps) {
  const [targetCrop, setTargetCrop] = useState("Wheat");
  const [soilType, setSoilType] = useState("Sandy Loam");
  const [nitrogen, setNitrogen] = useState(240); // kg/hectare
  const [phosphorus, setPhosphorus] = useState(22);
  const [potassium, setPotassium] = useState(180);
  const [ph, setPh] = useState(6.5);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Partial<SoilReport> | null>(null);

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/gemini/analyze-soil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textualData: {
            soilType,
            nitrogen,
            phosphorus,
            potassium,
            ph
          },
          cropGoal: targetCrop
        })
      });

      if (!response.ok) throw new Error("Soil health engine failed to parse indices.");

      const result = await response.json();
      
      const recordId = "soil_" + Date.now();
      const finalReport = {
        id: recordId,
        userId,
        crop: targetCrop,
        soilType: result.soilType || soilType,
        nitrogen: Number(nitrogen),
        phosphorus: Number(phosphorus),
        potassium: Number(potassium),
        ph: Number(ph),
        analysis: result.analysis || "Soil demonstrates moderate organic minerals.",
        fertilizerRecommendation: result.fertilizerRecommendation || "Apply standard NPK balances.",
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, "soilReports", recordId), finalReport);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `soilReports/${recordId}`);
      }

      // Sync to Supabase in background
      try {
        syncSoilReportToSupabase({
          id: recordId,
          userId,
          crop: targetCrop,
          soilType: finalReport.soilType,
          nitrogen: Number(nitrogen),
          phosphorus: Number(phosphorus),
          potassium: Number(potassium),
          ph: Number(ph),
          analysis: finalReport.analysis,
          fertilizerRecommendation: finalReport.fertilizerRecommendation,
          createdAt: finalReport.createdAt
        });
      } catch (e) {
        console.warn("Supabase quiet skip:", e);
      }

      setReport(finalReport);
    } catch (e) {
      console.error(e);
      alert("Unable to compile soil health indices. Please verify inputs.");
    } finally {
      setLoading(false);
    }
  };

  // NPK Level Classifier
  const getNClass = (val: number) => val < 280 ? { label: "Low", color: "text-red-500 bg-red-50" } : val > 560 ? { label: "High", color: "text-amber-500 bg-amber-50" } : { label: "Medium", color: "text-emerald-500 bg-emerald-50" };
  const getPClass = (val: number) => val < 10 ? { label: "Low", color: "text-red-500 bg-red-50" } : val > 25 ? { label: "High", color: "text-amber-500 bg-amber-50" } : { label: "Medium", color: "text-emerald-500 bg-emerald-50" };
  const getKClass = (val: number) => val < 108 ? { label: "Low", color: "text-red-500 bg-red-50" } : val > 280 ? { label: "High", color: "text-amber-500 bg-amber-50" } : { label: "Medium", color: "text-emerald-500 bg-emerald-50" };

  const nState = getNClass(nitrogen);
  const pState = getPClass(phosphorus);
  const kState = getKClass(potassium);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 h-full flex flex-col justify-between">
      <div className="border-b border-slate-100 pb-5 mb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-emerald-600 animate-pulse" />
          {language === "pa" ? "ਮਿੱਟੀ ਦੀ ਜਾਂਚ (Soil Health)" : language === "hi" ? "मृदा स्वास्थ्य प्रयोगशाला परीक्षण" : "Soil Health Analyzer"}
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          {language === "pa" ? "ਮਿੱਟੀ ਦੇ ਪੋਸ਼ਕ ਤੱਤਾਂ (NPK) ਅਤੇ ਪੀਐਚ ਪੱਧਰ ਦਾ ਵੇਰਵਾ" : language === "hi" ? "मिट्टी के एनपीके (NPK) एवं पीएच स्तर दर्ज करें और कृषि सुधार रिपोर्ट प्राप्त करें" : "Input biological metrics to construct fertilizer recommendation engines"}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
        {/* Left Side: Input variables */}
        <div className="col-span-1 xl:col-span-5 space-y-4">
          <div className="space-y-3.5">
            {/* Target crop goal */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {language === "pa" ? "ਅਗਲੀ ਬਿਜਾਈ ਦੀ ਫਸਲ" : language === "hi" ? "बुआई का लक्ष्य (फसल)" : "Target Crop Goal"}
              </label>
              <select
                value={targetCrop}
                onChange={(e) => setTargetCrop(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer"
              >
                <option value="Wheat">Wheat (ਕਣਕ/गेहूं)</option>
                <option value="Paddy">Paddy (ਝੋਨਾ/धान)</option>
                <option value="Mustard">Mustard (ਸਰ੍ਹੋਂ/सरसों)</option>
                <option value="Cotton">Cotton (ਨਰਮਾ/कपास)</option>
                <option value="Potato">Potato (ਆਲੂ/आलू)</option>
                <option value="Sugarcane">Sugarcane (ਗੰਨਾ/गन्ना)</option>
              </select>
            </div>

            {/* Soil Type classification */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                {language === "pa" ? "ਜ਼ਮੀਨ ਦੀ ਕਿਸਮ" : language === "hi" ? "मिट्टी का प्रकार" : "Soil Type"}
              </label>
              <select
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer"
              >
                <option value="Alluvial Soil">Alluvial Soil (ਦਰਿਆਈ ਮਿੱਟੀ/जलोढ़)</option>
                <option value="Sandy Loam">Sandy Loam (ਰੇਤਲੀ ਦੋਮਟ/बलुई दोमट)</option>
                <option value="Clayey Soil">Clayey Soil (ਚੀਕਣੀ ਮਿੱਟੀ/चिकनी मिट्टी)</option>
                <option value="Black Soil">Black Soil (ਕਾਲੀ ਮਿੱਟੀ/काली मिट्टी)</option>
              </select>
            </div>

            {/* Nitrogen Input Range */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-705 mb-1">
                <span>Nitrogen (N) - {nitrogen} kg/ha</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${nState.color}`}>{nState.label}</span>
              </div>
              <input
                type="range"
                min="50"
                max="800"
                value={nitrogen}
                onChange={(e) => setNitrogen(Number(e.target.value))}
                className="w-full accent-emerald-650 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
              />
            </div>

            {/* Phosphorus Input Range */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-705 mb-1">
                <span>Phosphorus (P) - {phosphorus} kg/ha</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${pState.color}`}>{pState.label}</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                value={phosphorus}
                onChange={(e) => setPhosphorus(Number(e.target.value))}
                className="w-full accent-emerald-650 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
              />
            </div>

            {/* Potassium Input Range */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-705 mb-1">
                <span>Potassium (K) - {potassium} kg/ha</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${kState.color}`}>{kState.label}</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                value={potassium}
                onChange={(e) => setPotassium(Number(e.target.value))}
                className="w-full accent-emerald-650 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
              />
            </div>

            {/* PHP Level */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-750 mb-1">
                <span>Soil Acidicity (pH) - {ph}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${ph < 6 ? "text-red-500 bg-red-5" : ph > 7.5 ? "text-amber-500 bg-amber-50" : "text-emerald-500 bg-emerald-50"}`}>
                  {ph < 6 ? "Acidic" : ph > 7.5 ? "Alkaline" : "Neutral (Ideal)"}
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="9"
                step="0.1"
                value={ph}
                onChange={(e) => setPh(Number(e.target.value))}
                className="w-full accent-emerald-650 cursor-pointer h-1.5 bg-slate-100 rounded-lg"
              />
            </div>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={loading}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-650 disabled:opacity-40 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Brain className="w-4 h-4 animate-pulse" />
            <span>{loading ? "Calculating Soil Mineralization..." : (language === "pa" ? "ਪੋਸ਼ਕ ਤੱਤਾਂ ਦੀ ਰਿਪੋਰਟ ਲਓ" : language === "hi" ? "एआई मृदा परीक्षण शुरू करें" : "Run AI Soil Audit")}</span>
          </button>
        </div>

        {/* Right Side: AI Audit report */}
        <div className="col-span-1 xl:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
          {report ? (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] uppercase font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>NPK Laboratory Status</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    {language === "pa" ? "ਭੂਮੀ ਸਿਹਤ ਵਿਸ਼ਲੇਸ਼ਣ" : language === "hi" ? "मृदा पोषण स्वास्थ्य कार्ड" : "Soil Health Analysis Card"}
                  </h3>
                </div>

                <span className="text-xs font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 px-2.5 py-1 rounded-lg">
                  pH: {report.ph}
                </span>
              </div>

              {/* Chemical/Mineral Visual Indicators */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Nitrogen (N)</div>
                  <div className="text-sm font-extrabold text-blue-600 pt-0.5">{report.nitrogen} kg/ha</div>
                  <span className="text-[10px] text-slate-500 font-semibold italic">Deficient</span>
                </div>
                <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Phosphor (P)</div>
                  <div className="text-sm font-extrabold text-purple-600 pt-0.5">{report.phosphorus} kg/ha</div>
                  <span className="text-[10px] text-emerald-600 font-bold">Optimal</span>
                </div>
                <div className="bg-white border border-slate-100 p-2.5 rounded-xl text-center shadow-sm">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Potash (K)</div>
                  <div className="text-sm font-extrabold text-amber-650 pt-0.5">{report.potassium} kg/ha</div>
                  <span className="text-[10px] text-slate-500 font-semibold italic">Moderate</span>
                </div>
              </div>

              {/* Analysis Textbox */}
              <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Brain className="w-4 h-4 text-emerald-605" />
                  <span>{language === "pa" ? "ਮਾਹਿਰ ਏਆਈ ਵਿਸ਼ਲੇਸ਼ਣ" : language === "hi" ? "मृदा वैज्ञानिक एआई विश्लेषण" : "Agricultural Agronomist Audit"}</span>
                </h4>
                <div className="text-xs text-slate-650 leading-relaxed font-semibold">
                  {report.analysis?.split("\n").map((line, ix) => (
                    <p className="mb-1" key={ix}>{line}</p>
                  ))}
                </div>
              </div>

              {/* Fertilizer Recommendation suggestions */}
              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 mb-1.5">
                  <Beaker className="w-4 h-4 text-emerald-650" />
                  <span>{language === "pa" ? "ਖਾਦ ਪਾਉਣ ਦਾ ਸਹੀ ਤਰੀਕਾ" : language === "hi" ? "यूरिया और डीएपी उपयोग का सही नुस्खा" : "Targeted Dosage Formula"}</span>
                </h4>
                <p className="text-xs text-emerald-850 leading-relaxed font-bold">
                  {report.fertilizerRecommendation}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 bg-slate-200 text-slate-400 p-3 rounded-full flex items-center justify-center mb-3">
                <Table className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-bold text-slate-705 text-sm mb-1">
                {language === "pa" ? "ਕੋਈ ਜਾਂਚ ਰਿਪੋਰਟ ਨਹੀਂ" : language === "hi" ? "कोई मृदा हेल्थ कार्ड सक्रिय नहीं है" : "No Soil Report Rendered"}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm">
                {language === "pa" ? "ਮਿੱਟੀ ਦੀ ਜਾਂਚ ਦੇ ਅੰਕੜੇ ਭਰੋ ਅਤੇ ਏਆਈ ਸੁਝਾਅ ਲੱਭਣ ਲਈ ਬਟਨ ਦਬਾਓ।"
                  : language === "hi" ? "ऊपर दिए गए स्लाइडर्स की मदद से एनपीके अनुपात भरें और रासायनिक योजना तैयार करें।"
                  : "Input your farm field parameters to construct custom chemical and organic solutions."
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

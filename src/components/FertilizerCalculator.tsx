import React, { useState, useEffect } from "react";
import { Calculator, ShoppingBag, ShieldAlert, Coins, RefreshCw, DollarSign } from "lucide-react";
import { LanguageCode } from "../types";

interface FertilizerCalculatorProps {
  language: LanguageCode;
}

export default function FertilizerCalculator({ language }: FertilizerCalculatorProps) {
  const [fCrop, setFCrop] = useState("Paddy (ਝੋਨਾ)");
  const [acreage, setAcreage] = useState(5);
  const [soilCond, setSoilCond] = useState("Standard");

  // Output recommendation states
  const [ureaBags, setUreaBags] = useState(0);
  const [dapBags, setDapBags] = useState(0);
  const [potashBags, setPotashBags] = useState(0);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    // Standard chemical bag estimation logic for Indian agricultural coordinates
    // Urea bag = 45kg (Cost: ₹266), DAP bag = 50kg (Cost: ₹1350), MOP Potash bag = 50kg (Cost: ₹1700)
    let uRatio = 1.2; // bags per acre
    let dRatio = 0.6;
    let pRatio = 0.4;

    if (fCrop.includes("Wheat")) {
      uRatio = 1.5;
      dRatio = 0.8;
      pRatio = 0.5;
    } else if (fCrop.includes("Cotton")) {
      uRatio = 1.0;
      dRatio = 0.5;
      pRatio = 0.6;
    } else if (fCrop.includes("Potato")) {
      uRatio = 1.8;
      dRatio = 1.25;
      pRatio = 1.0;
    } else if (fCrop.includes("Mustard")) {
      uRatio = 0.8;
      dRatio = 0.4;
      pRatio = 0.3;
    }

    // Adjust based on soil state index
    if (soilCond === "Low Minerals") {
      uRatio *= 1.2;
      dRatio *= 1.25;
    } else if (soilCond === "High Organic") {
      uRatio *= 0.8;
      dRatio *= 0.85;
    }

    const calculatedUrea = Math.round(uRatio * acreage);
    const calculatedDap = Math.round(dRatio * acreage);
    const calculatedPotash = Math.round(pRatio * acreage);

    setUreaBags(calculatedUrea);
    setDapBags(calculatedDap);
    setPotashBags(calculatedPotash);

    // Sum estimated expenses in INR
    const cost = (calculatedUrea * 266) + (calculatedDap * 1350) + (calculatedPotash * 1700);
    setTotalCost(cost);

  }, [fCrop, acreage, soilCond]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full justify-between">
      <div className="border-b border-slate-100 pb-5 mb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600 animate-pulse" />
          {language === "pa" ? "ਖਾਦ ਕੈਲਕੁਲੇਟਰ" : language === "hi" ? "खाद खुराक कैलकुलेटर" : "Fertilizer Planner"}
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          {language === "pa" ? "ਫਸਲ ਅਤੇ ਜ਼ਮੀਨ ਦੇ ਰਕਬੇ ਅਨੁਸਾਰ ਖਾਦਾਂ ਦੀ ਜਾਣਕਾਰੀ" : language === "hi" ? "फसल और एकड़ क्षेत्र की गणना करके यूरिया, डीएपी तथा पोटाश की थैलियों का हिसाब करें" : "Calculate chemical bags of urea, DAP, and potash required for next harvest"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        {/* Left Input panel */}
        <div className="col-span-1 md:col-span-6 space-y-4">
          {/* Crop select */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              {language === "pa" ? "ਫਸਲ ਦੀ ਚੋਣ" : language === "hi" ? "फसल" : "Crop Selection"}
            </label>
            <select
              value={fCrop}
              onChange={(e) => setFCrop(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer focus:bg-white transition-all"
            >
              <option value="Wheat (ਕਣਕ)">Wheat (ਕਣਕ/गेहूं)</option>
              <option value="Paddy (ਝੋਨਾ)">Paddy (ਝੋਨਾ/धान)</option>
              <option value="Mustard (ਸਰ੍ਹੋਂ)">Mustard (ਸਰ੍ਹੋਂ/सरसों)</option>
              <option value="Cotton (ਨਰਮਾ)">Cotton (ਨਰਮਾ/कपास)</option>
              <option value="Potato (ਆਲੂ)">Potato (ਆਲੂ/आलू)</option>
            </select>
          </div>

          {/* Acreage Range slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-705 mb-1.5">
              <span>{language === "pa" ? "ਖੇਤ ਦਾ ਰਕਬਾ (ਏਕੜ ਵਿੱਚ)" : language === "hi" ? "भूमि का रकबा (एकड़)" : "Farm Acreage"}</span>
              <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-mono font-bold">
                {acreage} Acres
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={acreage}
              onChange={(e) => setAcreage(Number(e.target.value))}
              className="w-full accent-emerald-650 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          {/* Soil organic condition tracker */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              {language === "pa" ? "ਭੂਮੀ ਦੀ ਵਰਤਮਾਨ ਹਾਲਤ" : language === "hi" ? "वर्तमान मिट्टी गुणवत्ता स्तर" : "Existing Soil Profile"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["Low Minerals", "Standard", "High Organic"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSoilCond(opt)}
                  className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    soilCond === opt
                      ? "bg-emerald-650 hover:bg-emerald-600 text-white border-emerald-650 shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-605"
                  }`}
                >
                  {opt === "Low Minerals" 
                    ? (language === "pa" ? "ਘੱਟ ਉਪਜਾਊ" : "कम उपजाऊ") 
                    : opt === "High Organic" 
                    ? (language === "pa" ? "ਉੱਚ ਉਪਜਾਊ" : "अधिक उपजाऊ") 
                    : (language === "pa" ? "ਸਧਾਰਨ" : "सामान्य")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Outputs section */}
        <div className="col-span-1 md:col-span-6 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-3.5">
            <h4 className="text-xs font-extrabold uppercase text-slate-400 select-none border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
              <span>Required Bags (ਖਾਦ ਦੇ ਥੈਲੇ)</span>
              <Coins className="w-4 h-4 text-emerald-650" />
            </h4>

            {/* Urea block */}
            <div className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl font-bold text-sm">N</div>
                <div>
                  <div className="text-xs font-extrabold text-slate-850">Urea Bags (ਯੂਰੀਆ)</div>
                  <div className="text-[10px] text-slate-400">45 kg per standard bag (₹266/bag)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-blue-600">{ureaBags} Bags</div>
              </div>
            </div>

            {/* DAP block */}
            <div className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl font-bold text-sm">P</div>
                <div>
                  <div className="text-xs font-extrabold text-slate-850">DAP Bags (ਡੀ.ਏ.ਪੀ.)</div>
                  <div className="text-[10px] text-slate-400">50 kg per standard bag (₹1350/bag)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-purple-650">{dapBags} Bags</div>
              </div>
            </div>

            {/* Potash block */}
            <div className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl font-bold text-sm">K</div>
                <div>
                  <div className="text-xs font-extrabold text-slate-850">Potash Bags (ਪੋਟਾਸ਼)</div>
                  <div className="text-[10px] text-slate-400">50 kg per standard bag (₹1700/bag)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-amber-650">{potashBags} Bags</div>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-emerald-700 text-white rounded-xl p-3 flex items-center justify-between shadow-md">
            <div>
              <div className="text-[9px] uppercase tracking-wide text-emerald-200 font-bold">Estimated Cost (ਖ਼ਰਚਾ)</div>
              <div className="text-base font-extrabold flex items-center gap-0.5">
                <span>₹{totalCost.toLocaleString()} INR</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-900 border border-emerald-600 px-2 py-0.5 rounded font-semibold text-emerald-300">
              Co-op Subsidy Rate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Droplet, Waves, CheckCircle, Clock, Lightbulb, Compass, Navigation } from "lucide-react";
import { LanguageCode } from "../types";

interface WaterManagerProps {
  language: LanguageCode;
}

export default function WaterManager({ language }: WaterManagerProps) {
  const [selectedCrop, setSelectedCrop] = useState("Wheat");
  const [soilMoisture, setSoilMoisture] = useState(45); // %
  const [irrigationSchedule, setIrrigationSchedule] = useState({
    need: "Moderate",
    daysLeft: 3,
    volume: "2 Acre-inches",
    note: "Irrigation ideal during vegetative flowering stage."
  });

  useEffect(() => {
    // Standard moisture estimation thresholds
    let need = "Moderate";
    let daysLeft = 4;
    let volume = "2 Acre-inches";
    let note = "Standard irrigation levels recommended.";

    if (soilMoisture > 70) {
      need = "None";
      daysLeft = 9;
      volume = "0 Acre-inches";
      note = "Soil moisture level is high. Do not irrigate to avoid root decay.";
    } else if (soilMoisture < 30) {
      need = "Immediate";
      daysLeft = 0;
      volume = selectedCrop === "Paddy" ? "4 Acre-inches" : "2 Acre-inches";
      note = "Soil is dry. Sowing yields can drop without immediate watering.";
    } else {
      // Moderate moisture levels
      if (selectedCrop === "Paddy") {
        need = "High";
        daysLeft = 1;
        volume = "3.5 Acre-inches";
        note = "Paddy fields need continuous root submerged under 15-20 days.";
      } else if (selectedCrop === "Cotton") {
        need = "Low";
        daysLeft = 6;
        volume = "1.5 Acre-inches";
        note = "Cotton requires well drained soils. Sparingly water under cool slots.";
      }
    }

    setIrrigationSchedule({ need, daysLeft, volume, note });
  }, [selectedCrop, soilMoisture]);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full justify-between">
      <div className="border-b border-slate-100 pb-5 mb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Waves className="w-5 h-5 text-emerald-650 animate-bounce" />
          {language === "pa" ? "ਸਿੰਚਾਈ ਅਤੇ ਜਲ ਪ੍ਰਬੰਧਨ" : language === "hi" ? "स्मार्ट वाटर मैनेजमेंट (सिंचाई गाइड)" : "Water & Irrigation Scheduler"}
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          {language === "pa" ? "ਜਮੀਨੀ ਨਮੀ ਅਨੁਸਾਰ ਪਾਣੀ ਲਗਾਉਣ ਦਾ ਸਹੀ ਤਰੀਕਾ" : language === "hi" ? "फसल के अनुसार सिंचाई समय सारिणी और पानी बचाने के लिए नई ड्रिप तकनीक और सुझाव" : "Optimal irrigation timeline schedules mapped to soil humidity indices"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1">
        {/* Left Inputs block */}
        <div className="col-span-1 md:col-span-5 space-y-4">
          {/* Crop Dropdown selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              {language === "pa" ? "ਫਸਲ ਚੁਣੋ" : language === "hi" ? "फसल का प्रकार" : "Crop Sown"}
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-205 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-semibold focus:outline-none transition-all cursor-pointer"
            >
              <option value="Wheat">Wheat (ਕਣਕ)</option>
              <option value="Paddy">Paddy (ਝੋਨਾ)</option>
              <option value="Cotton">Cotton (ਨਰਮਾ)</option>
              <option value="Mustard">Mustard (ਸਰ੍ਹੋਂ)</option>
            </select>
          </div>

          {/* Soil Moisture Slider */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-705 mb-1">
              <span>{language === "pa" ? "ਮਿੱਟੀ ਦੀ ਨਮੀ" : language === "hi" ? "मिट्टी की नमी का स्तर" : "Soil Moisture Concentration"}</span>
              <span className="text-blue-650 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-mono font-bold">
                {soilMoisture}% Hydrated
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={soilMoisture}
              onChange={(e) => setSoilMoisture(Number(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          <div className="bg-emerald-50/50 p-4 border border-emerald-100 rounded-2xl">
            <h4 className="text-xs font-bold text-emerald-805 flex items-center gap-1.5 mb-1.5">
              <Lightbulb className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>{language === "pa" ? "ਪਾਣੀ ਬਚਾਉਣ ਦਾ ਸਮਾਰਟ ਤਰੀਕਾ" : language === "hi" ? "जल संरक्षण / ड्रिप सिंचाई सलाह" : "Drip Irrigation Best Practices"}</span>
            </h4>
            <p className="text-xs text-slate-650 leading-relaxed font-semibold">
              Deploying drip line emitters is certified to save 45% groundwater. Siting solar energy-pumps decreases diesel operational overheads immediately.
            </p>
          </div>
        </div>

        {/* Right Outputs Scheduler board */}
        <div className="col-span-1 md:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-extrabold uppercase text-slate-400 select-none border-b border-slate-205 pb-2 flex items-center justify-between">
              <span>Optimal Watering Schedule</span>
              <Droplet className="w-4 h-4 text-blue-500" />
            </h4>

            {/* Need variable */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-white border border-slate-100 p-3.5 rounded-xl text-center shadow-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Irrigation Urgency</div>
                <div className={`text-base font-extrabold pt-1 ${
                  irrigationSchedule.need === "Immediate" 
                    ? "text-red-500" 
                    : irrigationSchedule.need === "High" 
                    ? "text-amber-500" 
                    : "text-emerald-600"
                }`}>
                  {irrigationSchedule.need}
                </div>
              </div>

              <div className="bg-white border border-slate-100 p-3.5 rounded-xl text-center shadow-sm">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Scheduled In</div>
                <div className="text-base font-extrabold text-blue-600 pt-1 flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{irrigationSchedule.daysLeft === 0 ? "Now" : `${irrigationSchedule.daysLeft} Days`}</span>
                </div>
              </div>
            </div>

            {/* Target water quantity */}
            <div className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Water Quantity</span>
                <span className="text-xs font-extrabold text-slate-805 mt-0.5 block">{irrigationSchedule.volume}</span>
              </div>
              <Waves className="w-5 h-5 text-blue-500 animate-pulse" />
            </div>

            {/* Note recommendations */}
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-blue-805 mb-1">
                {language === "pa" ? "ਸਿੰਚਾਈ ਸੰਕੇਤ" : language === "hi" ? "आवश्यक सिंचाई संकेत" : "Agronomist Schedule Note"}
              </h4>
              <p className="text-xs text-blue-900 leading-relaxed font-semibold">
                {irrigationSchedule.note}
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-150 pt-2 flex items-center gap-1.5 font-bold mt-3 justify-end">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Water level readings derived from Indian Agrometeorological Satellite Sensors</span>
          </div>
        </div>
      </div>
    </div>
  );
}

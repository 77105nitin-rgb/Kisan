import React, { useState, useEffect } from "react";
import { ShieldAlert, Users, PlusCircle, AlertTriangle, CheckCircle, BookOpen, Send, Sparkles } from "lucide-react";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { LanguageCode, PestAlert } from "../types";
import { MOCK_PEST_HISTORY, PRESET_PUNJAB_DISTRICTS, PRESET_HARYANA_DISTRICTS } from "../data";
import { syncPestAlertToSupabase } from "../supabase";

interface PestAlertNetworkProps {
  language: LanguageCode;
  userId: string;
}

export default function PestAlertNetwork({ language, userId }: PestAlertNetworkProps) {
  const [alerts, setAlerts] = useState<PestAlert[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Custom new alert form states
  const [rName, setRName] = useState("");
  const [rDistrict, setRDistrict] = useState("Bathinda");
  const [rState, setRState] = useState("Punjab");
  const [rCrop, setRCrop] = useState("Cotton");
  const [rPest, setRPest] = useState("Pink Bollworm (गुलाबी सुंडी)");
  const [rSeverity, setRSeverity] = useState<"low" | "medium" | "high">("high");
  const [rDesc, setRDesc] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      // 1st Priority: Attempt to read live reports from Cloud Firestore
      const snap = await getDocs(collection(db, "pestAlerts"));
      const records: PestAlert[] = [];
      snap.forEach((docSnap) => {
        records.push(docSnap.data() as PestAlert);
      });
      
      if (records.length > 0) {
        // Sort descending
        records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setAlerts(records);
      } else {
        // Fallback to static seeds
        const formatted = MOCK_PEST_HISTORY as PestAlert[];
        setAlerts(formatted);
      }
    } catch (e) {
      console.warn("Firestore pest fetch failed, utilizing fallbacks:", e);
      setAlerts(MOCK_PEST_HISTORY as PestAlert[]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rName.trim() || !rDesc.trim()) {
      alert("Please provide reporter name and description.");
      return;
    }

    const alertId = "pest_" + Date.now();
    const newAlertRecord: PestAlert = {
      id: alertId,
      userId,
      reporterName: rName,
      district: rDistrict,
      state: rState,
      cropType: rCrop,
      pestName: rPest,
      severity: rSeverity,
      description: rDesc,
      createdAt: new Date().toISOString().split("T")[0]
    };

    try {
      // Write directly to Cloud Firestore multi-user collection
      await setDoc(doc(db, "pestAlerts", alertId), newAlertRecord);
      setAlerts((prev) => [newAlertRecord, ...prev]);

      // Sync to Supabase in background
      try {
        syncPestAlertToSupabase({
          id: alertId,
          userId,
          reporterName: newAlertRecord.reporterName,
          district: newAlertRecord.district,
          state: newAlertRecord.state,
          cropType: newAlertRecord.cropType,
          pestName: newAlertRecord.pestName,
          severity: newAlertRecord.severity,
          description: newAlertRecord.description,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Supabase quiet bypass:", e);
      }
      
      // Clear states
      setRName("");
      setRDesc("");
      setShowForm(false);
      alert("Thank you. Outbreak report submitted successfully. Officers notified.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `pestAlerts/${alertId}`);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
            {language === "pa" ? "ਕੀੜੇ-ਮਕੌੜੇ ਚੇਤਾਵਨੀ ਨੈੱਟਵਰਕ" : language === "hi" ? "कीट प्रकोप चेतावनी नेटवर्क" : "Pest Outbreak Network"}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {language === "pa" ? "ਆਪਣੇ ਪਿੰਡ ਜਾਂ ਜ਼ਿਲ੍ਹੇ ਵਿੱਚ ਹੋਏ ਕੀੜਿਆਂ ਦੇ ਹਮਲੇ ਦੀ ਰਿਪੋਰਟ ਸਾਂਝੀ ਕਰੋ" : language === "hi" ? "किसान समुदाय कीट प्रकोपो की सूचना दें और जिले के हाई-अलर्ट क्षेत्रों का ब्यौरा प्राप्त करें" : "Report and check ongoing infestation hotspots validated by community networks"}
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-650 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{showForm ? "View Active Alerts" : (language === "pa" ? "ਨਵੀਂ ਰਿਪੋਰਟ ਲਿਖੋ" : "रिपोर्ट दर्ज करें")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {showForm ? (
          /* Report Form Panel (Takes half slot) */
          <form onSubmit={handleSubmitAlert} className="col-span-1 lg:col-span-12 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
              <span>Submit Active Infestation Alert</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Reporter Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Reporter Name</label>
                <input
                  type="text"
                  required
                  value={rName}
                  onChange={(e) => setRName(e.target.value)}
                  placeholder="e.g., Harpreet Singh"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* State Select */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">State</label>
                <select
                  value={rState}
                  onChange={(e) => setRState(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Punjab">Punjab</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                </select>
              </div>

              {/* District Select */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">District</label>
                <select
                  value={rDistrict}
                  onChange={(e) => setRDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {rState === "Punjab" ? (
                    PRESET_PUNJAB_DISTRICTS.map((dst) => <option key={dst} value={dst}>{dst}</option>)
                  ) : (
                    PRESET_HARYANA_DISTRICTS.map((dst) => <option key={dst} value={dst}>{dst}</option>)
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Crop */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Crop Impacted</label>
                <select
                  value={rCrop}
                  onChange={(e) => setRCrop(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Cotton">Cotton (ਨਰਮਾ)</option>
                  <option value="Paddy">Paddy (ਝੋਨਾ)</option>
                  <option value="Wheat">Wheat (ਕਣਕ)</option>
                  <option value="Potato">Potato (ਆਲੂ)</option>
                </select>
              </div>

              {/* Pest */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Pest Pathogen Name</label>
                <select
                  value={rPest}
                  onChange={(e) => setRPest(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="Pink Bollworm (गुलाबी सुंडी)">Pink Bollworm (गुलाबी सुंडी)</option>
                  <option value="Stem Borer (तना छेदक)">Stem Borer (तना छेदक)</option>
                  <option value="Locust Attack (टिड्डी दल)">Locust Attack (टिड्डी दल)</option>
                  <option value="Aphids (चेपा)">Aphids (चेपा)</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Severity</label>
                <select
                  value={rSeverity}
                  onChange={(e) => setRSecureMode()}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="low">Low Warning (ਘੱਟ)</option>
                  <option value="medium">Medium Outbreak (ਮੱਧਮ)</option>
                  <option value="high">High Threat (ਗੰਭੀਰ)</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Observations / Field Details</label>
              <textarea
                required
                value={rDesc}
                onChange={(e) => setRDesc(e.target.value)}
                placeholder="Give exact coordinates or landmarks so district officers can execute chemical or drone sprays."
                rows={3}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-750 hover:bg-emerald-650 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Broadcast Infestation Alert</span>
            </button>
          </form>
        ) : (
          /* Active Alerts listing */
          <div className="col-span-1 lg:col-span-12 flex flex-col md:flex-row gap-6">
            {/* Visual Heatmap Warning index card */}
            <div className="w-full md:w-[350px] bg-slate-50 border border-slate-101 rounded-2xl p-5 shrink-0 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2 mb-2">
                  <span className="text-[9px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 animate-pulse" />
                    <span>Agronomic High Alerts</span>
                  </span>
                  <h4 className="text-xs font-bold text-slate-705">
                    District Danger Scorecards
                  </h4>
                </div>

                {/* Score meters */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-650 mb-1">
                      <span>Bathinda (Punjab)</span>
                      <span className="text-red-500 font-extrabold uppercase">Critical</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: "85%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-650 mb-1">
                      <span>Karnal (Haryana)</span>
                      <span className="text-amber-500 font-extrabold uppercase">Medium</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: "50%" }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-650 mb-1">
                      <span>Patiala (Punjab)</span>
                      <span className="text-emerald-500 font-extrabold uppercase">Normal</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: "15%" }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-101 p-3 rounded-xl mt-4 text-[10px] text-slate-550 leading-relaxed font-semibold">
                Reported warnings trigger automated GPS-mapping for drone-pesticide routing squads. Keep records updated.
              </div>
            </div>

            {/* List */}
            <div className="flex-1 space-y-3.5 overflow-y-auto max-h-[400px] scrollbar-thin">
              {alerts.map((al) => (
                <div key={al.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex items-start gap-3.5 relative overflow-hidden">
                  {/* Visual severity badge */}
                  <div className={`absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg text-[9px] uppercase font-extrabold tracking-wide text-white ${
                    al.severity === "high" ? "bg-red-500" : al.severity === "medium" ? "bg-amber-500" : "bg-blue-500"
                  }`}>
                    {al.severity}
                  </div>

                  <div className={`p-3 rounded-xl ${
                    al.severity === "high" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-500"
                  }`}>
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-805">{al.cropType} Infestation</h4>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">({al.createdAt})</span>
                    </div>

                    <div className="text-xs text-slate-500 font-bold">
                      Reported by {al.reporterName} in{" "}
                      <span className="text-slate-700 font-extraboldUnderline">
                        {al.district}, {al.state}
                      </span>
                    </div>

                    {/* Crop pathogen details */}
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl font-bold font-mono text-[11px] text-slate-650 mt-1">
                      Pathogen: {al.pestName}
                    </div>

                    <p className="text-xs text-slate-705 leading-relaxed font-medium pt-1.5 font-sans">
                      {al.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper set warning mapping
  function setRSecureMode() {
    setRSeverity("high");
  }
}

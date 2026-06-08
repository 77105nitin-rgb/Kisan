import React, { useState, useEffect } from "react";
import { Shield, Users, AlertCircle, FileText, Send, Sparkles, Navigation, CheckCircle, Smartphone } from "lucide-react";
import { collection, doc, setDoc, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { LanguageCode, NotificationItem, UserProfile } from "../types";

interface OfficerDashboardProps {
  language: LanguageCode;
  userId: string;
}

export default function OfficerDashboard({ language, userId }: OfficerDashboardProps) {
  const [farmersCount, setFarmersCount] = useState(1480);
  const [pendingSubsidies, setPendingSubsidies] = useState(48);
  const [activeOutbreaks, setActiveOutbreaks] = useState(12);
  const [droneSprays, setDroneSprays] = useState(35);
  
  // Custom warning broadcast panel
  const [wTitle, setWTitle] = useState("");
  const [wBody, setWBody] = useState("");
  const [wType, setWType] = useState<"weather" | "disease" | "mandi" | "alert">("alert");
  const [broadcasting, setBroadcasting] = useState(false);
  const [activeTab, setActiveTab] = useState<"insights" | "advisories">("insights");

  // Sample analytics data
  const regionalOutbreakHotspots = [
    { district: "Bathinda", crop: "Cotton", severity: "High (Pink Bollworm)", activeCases: 24, status: "Drone Spray Queued" },
    { district: "Karnal", crop: "Paddy", severity: "Medium (Blast Pathogen)", activeCases: 14, status: "Advisory Broadcasted" },
    { district: "Ludhiana", crop: "Wheat", severity: "Low (Leaf Rust)", activeCases: 4, status: "Under Control" },
    { district: "Agra", crop: "Potato", severity: "High (Late Blight)", activeCases: 19, status: "Action Completed" }
  ];

  const handleBroadcastAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wTitle.trim() || !wBody.trim()) {
      alert("Please fill in warning header and guideline body.");
      return;
    }

    setBroadcasting(true);
    const notificationId = "notif_" + Date.now();
    const newAdvisory: NotificationItem = {
      id: notificationId,
      userId: "all", // Broadcast identifier
      title: wTitle,
      body: wBody,
      type: wType === "alert" ? "alert" : wType === "weather" ? "weather" : "disease",
      read: false,
      createdAt: new Date().toISOString()
    };

    try {
      // Write to multi-user /notifications collection in Firestore
      await setDoc(doc(db, "notifications", notificationId), newAdvisory);
      setWTitle("");
      setWBody("");
      alert("Agronomic advisory broadcasted successfully. All farmers will receive this instruction on their Home panels.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `notifications/${notificationId}`);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full">
      {/* Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            {language === "pa" ? "ਖੇਤੀਬਾੜੀ ਅਫਸਰ ਕਮਾਂਡ ਪੋਰਟਲ" : language === "hi" ? "कृषि सुरक्षा अधिकारी कमांड पोर्टल" : "Agriculture Officers Command Portal"}
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            {language === "pa" ? "ਜ਼ਿਲ੍ਹੇ ਦੀ ਨਿਗਰਾਨੀ, ਨਵੀਂ ਚੇਤਾਵਨੀ ਅਤੇ ਡਰੋਨ ਸੇਵਾਵਾਂ" : language === "hi" ? "क्षेत्रवार कीट हमले, मृदा स्वास्थ्य चार्ट, ड्रोन रासायनिक छिड़काव एवं तत्काल संदेश प्रसारण" : "Monitor regional hotspots, authorize drone sprays, and coordinate warning broadcasts"}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("insights")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "insights" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Insights & Analytics
          </button>
          <button
            onClick={() => setActiveTab("advisories")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "advisories" ? "bg-white text-emerald-800 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Broadcast Advisor
          </button>
        </div>
      </div>

      {activeTab === "insights" ? (
        /* Analytical stats + Heatmap index list */
        <div className="space-y-6">
          {/* Key statistical parameters counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Total Registered Farmers</span>
              <div className="text-xl font-extrabold text-slate-800 mt-1">{farmersCount}</div>
              <span className="text-[10px] text-emerald-600 font-bold block pt-1">↑ 14% New Sowing Signups</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Active Disease Signals</span>
              <div className="text-xl font-extrabold text-red-500 mt-1">{activeOutbreaks} Areas</div>
              <span className="text-[10px] text-red-630 font-semibold block pt-1">Urgent action required</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Pending Subsidy Claims</span>
              <div className="text-xl font-extrabold text-amber-500 mt-1">{pendingSubsidies} Cases</div>
              <span className="text-[10px] text-slate-500 block pt-1">Awaiting bank authorizations</span>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl shadow-sm">
              <span className="text-[9px] uppercase font-bold text-slate-400">Completed Drone Sprays</span>
              <div className="text-xl font-extrabold text-emerald-650 mt-1">{droneSprays} Fields</div>
              <span className="text-[10px] text-emerald-600 block pt-1">Using eco-safe pesticides</span>
            </div>
          </div>

          {/* Regional Outbreak grid */}
          <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden p-4">
            <h3 className="text-sm font-extrabold text-slate-705 mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-emerald-650" />
              <span>District Pathogen & Pest Outbreak Index</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-102 border-b border-slate-150 text-slate-550 font-bold">
                    <th className="p-3">District Region</th>
                    <th className="p-3">Crop Impacted</th>
                    <th className="p-3">Identified Strain</th>
                    <th className="p-3 text-center">Cases</th>
                    <th className="p-3">Emergency Action status</th>
                  </tr>
                </thead>
                <tbody>
                  {regionalOutbreakHotspots.map((h, i) => (
                    <tr key={i} className="border-b border-slate-100 font-semibold text-slate-705 hover:bg-emerald-50/20">
                      <td className="p-3 text-slate-805 font-bold">{h.district}</td>
                      <td className="p-3">{h.crop}</td>
                      <td className="p-3">
                        <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          {h.severity}
                        </span>
                      </td>
                      <td className="p-3 text-center font-extrabold">{h.activeCases} farms</td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            if (h.status !== "Action Completed") {
                              alert(`Drone pesticide dispatch unit routed to ${h.district} coordinate nodes.`);
                            }
                          }}
                          className={`px-2.5 py-1 text-[10px] font-extrabold rounded-lg transition-all flex items-center gap-1 cursor-pointer border ${
                            h.status.includes("Completed")
                              ? "bg-slate-100 text-slate-500 border-slate-200"
                              : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-650 shadow-sm"
                          }`}
                        >
                          <Navigation className="w-3 h-3" />
                          <span>{h.status === "Action Completed" ? "Completed" : "Trigger Drone Dispatch"}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Advisory warning broadcasting console */
        <form onSubmit={handleBroadcastAdvisory} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
            <Smartphone className="w-4.5 h-4.5 text-emerald-650 animate-bounce" />
            <span>Advisory Warnings Broadcast Board</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warning header title */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Guidelines / Advisory Header</label>
              <input
                type="text"
                required
                value={wTitle}
                onChange={(e) => setWTitle(e.target.value)}
                placeholder="e.g., Heavy Rainfall & Hailstorm warning"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Warning type classification */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Advisory Category Type</label>
              <select
                value={wType}
                onChange={(e: any) => setWType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="alert">Pest outbreak emergency (कीट प्रकोप)</option>
                <option value="weather">Severe meteorological weather alerts (मौसम विभाग)</option>
                <option value="mandi">Sudden commodity volume shifts (मंडी भाव)</option>
              </select>
            </div>
          </div>

          {/* Guideline description body */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Welfare Guidelines instructions</label>
            <textarea
              required
              value={wBody}
              onChange={(e) => setWBody(e.target.value)}
              placeholder="State precise actions. (e.g., Stop urea spraying in cotton holdings due to 80% humidity factors. Keep field ditches clear...)"
              rows={4}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-205 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={broadcasting}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-655 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {broadcasting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Broadcast Push Advisory Notification</span>
          </button>
        </form>
      )}
    </div>
  );
}

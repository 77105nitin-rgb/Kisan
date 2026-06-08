import React, { useState, useEffect } from "react";
import { Award, BookOpen, ChevronRight, FileText, CheckCircle, ExternalLink, HelpCircle, Sparkles } from "lucide-react";
import { LanguageCode, SchemeInfo } from "../types";

interface GovSchemesProps {
  language: LanguageCode;
}

export default function GovSchemes({ language }: GovSchemesProps) {
  const [loading, setLoading] = useState(false);
  const [schemes, setSchemes] = useState<SchemeInfo[]>([]);
  const [activeScheme, setActiveScheme] = useState<SchemeInfo | null>(null);

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/schemes");
      const result = await response.json();
      if (result.status === "success" && result.data) {
        setSchemes(result.data);
        setActiveScheme(result.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full">
      <div className="border-b border-slate-100 pb-5 mb-5">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-600 animate-bounce" />
          {language === "pa" ? "ਸਰਕਾਰੀ ਖੇਤੀਬਾੜੀ ਯੋਜਨਾਵਾਂ" : language === "hi" ? "सरकारी कृषि योजनाएं" : "Government Schemes & Subsidies"}
        </h2>
        <p className="text-xs text-slate-400 font-medium">
          {language === "pa" ? "ਪ੍ਰਮੁੱਖ ਯੋਜਨਾਵਾਂ, ਸਬਸਿਡੀਆਂ ਦੇ ਫਾਇਦੇ ਅਤੇ ਫਾਰਮ ਭਰਨ ਦੀ ਪ੍ਰਕਿਰਿਆ" : language === "hi" ? "पीएम-किसान, फसल बीमा, सोलर सब्सिडी के लिए पात्रता शर्तें एवं आवेदन प्रक्रिया" : "Translate complex government documentation into simple action points"}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Side: Schemes List */}
        <div className="col-span-1 lg:col-span-5 space-y-2.5">
          {loading ? (
            <div className="text-center py-10 text-slate-400 font-semibold">
              Loading schemes database...
            </div>
          ) : (
            schemes.map((scm) => (
              <button
                key={scm.id}
                onClick={() => setActiveScheme(scm)}
                className={`w-full p-4 text-left border rounded-2xl transition-all cursor-pointer flex items-center justify-between group ${
                  activeScheme?.id === scm.id
                    ? "bg-emerald-600/5 hover:bg-emerald-600/10 border-emerald-500 text-emerald-950 font-bold shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 border-slate-205 text-slate-705"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border transition-colors ${
                    activeScheme?.id === scm.id
                      ? "bg-emerald-600 text-white border-emerald-500"
                      : "bg-white text-slate-400 border-slate-200"
                  }`}>
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{scm.title}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block pt-0.5">Benefit: ₹ Direct Deposit / Grant</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1.5 transition-transform" />
              </button>
            ))
          )}
        </div>

        {/* Right Side: Detailed expanded scheme card */}
        <div className="col-span-1 lg:col-span-7 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
          {activeScheme ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-bold text-emerald-700 select-none flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Verified Ministry Scheme</span>
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800">
                    {activeScheme.title}
                  </h3>
                </div>

                <a
                  href={activeScheme.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-emerald-700 hover:bg-emerald-650 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer leading-none"
                >
                  <span>Apply Now</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Grid content blocks */}
              <div className="space-y-3">
                {/* Benefits */}
                <div className="bg-emerald-50/70 border border-emerald-100 p-3.5 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Beneficiary Financial Grants (ਸਹਾਇਤਾ ਰਾਸ਼ੀ)</span>
                  </h4>
                  <p className="text-xs text-slate-705 leading-relaxed font-semibold">
                    {activeScheme.benefit}
                  </p>
                </div>

                {/* Eligibility */}
                <div className="bg-white border border-slate-101 p-3.5 rounded-xl shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span>Eligibility Criteria (ਲੋੜੀਂਦੀ ਯੋਗਤਾ)</span>
                  </h4>
                  <p className="text-xs text-slate-705 leading-relaxed font-semibold">
                    {activeScheme.eligibility}
                  </p>
                </div>

                {/* Required Papers */}
                <div className="bg-white border border-slate-101 p-3.5 rounded-xl shadow-sm">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Essential Documents (ਲੋੜੀਂਦੇ ਦਸਤਾਵੇਜ਼)</span>
                  </h4>
                  <p className="text-xs text-slate-705 leading-relaxed font-semibold">
                    {activeScheme.documents}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 bg-slate-200 text-slate-400 p-3 rounded-full flex items-center justify-center mb-3">
                <BookOpen className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-bold text-slate-705 text-sm mb-1">No Selected Welfare Scheme</h4>
              <p className="text-xs text-slate-400">Click on any scheme in the side list to read benefits.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

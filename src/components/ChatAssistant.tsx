import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Mic, Volume2, VolumeX, Sparkles, X, ChevronRight, CornerDownLeft } from "lucide-react";
import { ChatMessage, LanguageCode } from "../types";
import { syncChatMessageToSupabase } from "../supabase";

interface ChatAssistantProps {
  language: LanguageCode;
  userId: string;
}

export default function ChatAssistant({ language, userId }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      userId,
      message: language === "pa" 
        ? "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਏਆਈ ਕਿਸਾਨ ਮਿੱਤਰ ਹਾਂ। ਮੈਂ ਫਸਲਾਂ, ਖਾਦਾਂ, ਸਿੰਚਾਈ, ਕੀੜੇ-ਮਕੌੜਿਆਂ ਅਤੇ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਤੁਹਾਡੇ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇ ਸਕਦਾ ਹਾਂ।"
        : language === "hi"
        ? "नमस्कार! मैं एआई किसान मित्र हूँ। मैं सामान्य खेतीबाड़ी, खाद, कीट नियंत्रण और सरकारी योजनाओं के बारे में आपके सभी सवालों का उत्तर दे सकता हूँ।"
        : "Hello! I am your AI Kisan Mitra. I can answer all your questions about sowing, seeds, organic fertilizer ratios, pest control, and subsidies.",
      sender: "ai",
      language,
      createdAt: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Custom Speech Synthesis Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Native Speech-to-Text browser hook
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please type your query.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === "pa" ? "pa-IN" : language === "hi" ? "hi-IN" : "en-IN";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInput(speechToText);
      setIsListening(false);
    };

    recognition.start();
  };

  const speakText = async (textToSpeak: string) => {
    if (!voicePlayback) return;
    
    // Stop any ongoing speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setIsSpeaking(true);

    try {
      // 1st Priority: Try Server-side premium Gemini Voice
      const response = await fetch("/api/gemini/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: textToSpeak.replace(/[*#]/g, ""), 
          voice: language === "pa" ? "Kore" : language === "hi" ? "Zephyr" : "Puck"
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audio) {
          const audioSrc = `data:audio/wav;base64,${data.audio}`;
          const audio = new Audio(audioSrc);
          audioRef.current = audio;
          audio.play();
          audio.onended = () => setIsSpeaking(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Gemini Premium TTS failed, falling back to Browser SpeechSynthesis:", e);
    }

    // 2nd Priority: Fallback to standard client SpeechSynthesis
    if (window.speechSynthesis) {
      const cleanMarked = textToSpeak.replace(/[*#_]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanMarked);
      utterance.lang = language === "pa" ? "pa-IN" : language === "hi" ? "hi-IN" : "en-IN";
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsgText = input.trim();
    setInput("");

    const newUserMsg: ChatMessage = {
      id: Math.random().toString(),
      userId,
      message: userMsgText,
      sender: "user",
      language,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsTyping(true);

    // Sync user message to Supabase
    try {
      syncChatMessageToSupabase({
        id: newUserMsg.id,
        userId: newUserMsg.userId,
        message: newUserMsg.message,
        sender: "user",
        language: newUserMsg.language,
        createdAt: newUserMsg.createdAt
      });
    } catch (e) {
      console.warn("Supabase chat message quiet bypass", e);
    }
    
    // Auto-scroll to ensure typing bubbles are visible
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);

    try {
      const response = await fetch("/api/gemini/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: messages.slice(-10), // Pass recent context for conversation memory
          language
        })
      });

      if (!response.ok) {
        throw new Error("Chat service returned an error.");
      }

      const data = await response.json();
      const aiReply = data.reply || "Unable to draft recommendation. Please check internet connections.";

      const newAiMsg: ChatMessage = {
        id: Math.random().toString(),
        userId,
        message: aiReply,
        sender: "ai",
        language,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, newAiMsg]);
      setIsTyping(false);

      // Sync AI message to Supabase
      try {
        syncChatMessageToSupabase({
          id: newAiMsg.id,
          userId: newAiMsg.userId,
          message: newAiMsg.message,
          sender: "ai",
          language: newAiMsg.language,
          createdAt: newAiMsg.createdAt
        });
      } catch (e) {
        console.warn("Supabase quiet bypass:", e);
      }

      // Read reply aloud if voice mode is enabled
      speakText(aiReply);

    } catch (err: any) {
      console.error(err);
      setIsTyping(false);
      setMessages((prev) => [...prev, {
        id: Math.random().toString(),
        userId,
        message: language === "pa" 
          ? "ਅਫਸੋਸ ਹੈ, ਸਰਵਰ ਨਾਲ ਕਨੈਕਟ ਕਰਨ ਵਿੱਚ ਕੁਝ ਸਮੱਸਿਆ ਆਈ ਹੈ।"
          : language === "hi"
          ? "क्षमा करें, सर्वर से जुड़ने में कुछ समस्या आ रही है।"
          : "Sorry, I had trouble contacting my primary agronomist engine. Please retry.",
        sender: "ai",
        language,
        createdAt: new Date().toISOString()
      }]);
    }
  };

  const handleToggleVoicePlay = () => {
    setVoicePlayback(!voicePlayback);
    if (voicePlayback) {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.pause();
      setIsSpeaking(false);
    }
  };

  return (
    <>
      {/* Floating Sparkle AI Trigger Button */}
      <button
        id="btn-ai-fab"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-4 shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center gap-2 border border-emerald-400 group cursor-pointer"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
        <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-medium text-sm whitespace-nowrap">
          {language === "pa" ? "ਏਆਈ ਸਲਾਹਕਾਰ" : language === "hi" ? "एआई सलाहकार" : "AI Advisor"}
        </span>
      </button>

      {/* Floating Chat Drawer Panel */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[450px] bg-white border-l border-emerald-100 shadow-2xl flex flex-col transition-all duration-300 animation-slide-in">
          {/* Header Panel */}
          <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-4 flex items-center justify-between border-b border-emerald-900 shadow-md">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-base flex items-center gap-1.5">
                  AI Kisan Mitra
                </h3>
                <p className="text-xs text-emerald-200">
                  {language === "pa" ? "ਹਰ ਕਿਸਾਨ ਦਾ ਡਿਜੀਟਲ ਸਾਥੀ" : language === "hi" ? "हर किसान का डिजिटल साथी" : "Digital Expert Advisor"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handleToggleVoicePlay}
                title={voicePlayback ? "Mute Advisor Audio" : "Unmute Advisor Audio"}
                className={`p-1.5 rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer ${voicePlayback ? "text-amber-300" : "text-emerald-350 opacity-50"}`}
              >
                {voicePlayback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => {
                  setIsOpen(false);
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  if (audioRef.current) audioRef.current.pause();
                }}
                className="p-1.5 rounded-lg hover:bg-emerald-600 text-emerald-200 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Node */}
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-emerald-50/20">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-4.5 shadow-sm leading-relaxed ${
                  m.sender === "user" 
                    ? "bg-emerald-600 text-white rounded-br-none" 
                    : "bg-white text-slate-800 border border-slate-100 rounded-bl-none text-sm"
                }`}>
                  {m.sender === "ai" && (
                    <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-bold mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Kisan Mitra
                    </div>
                  )}
                  {/* Message body with basic markdown rendering */}
                  <div className="prose prose-sm prose-emerald max-w-none text-slate-700">
                    {m.message.split("\n").map((line, idx) => {
                      if (line.startsWith("### ")) {
                        return <h4 key={idx} className="font-bold text-slate-900 mt-2 mb-1">{line.replace("### ", "")}</h4>;
                      } else if (line.startsWith("## ")) {
                        return <h3 key={idx} className="font-bold text-slate-900 mt-3 mb-1.5">{line.replace("## ", "")}</h3>;
                      } else if (line.startsWith("- ") || line.startsWith("* ")) {
                        return <li key={idx} className="ml-4 list-disc text-slate-700">{line.replace(/^[-*]\s+/, "")}</li>;
                      }
                      return <p key={idx} className="mb-1">{line}</p>;
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Speaking / Reading indicator */}
            {isSpeaking && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 italic transition-all animate-pulse">
                <Volume2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span>{language === "pa" ? "ਏਆਈ ਬੋਲ ਰਿਹਾ ਹੈ..." : language === "hi" ? "एआई बोल रहा है..." : "Speaking response aloud..."}</span>
              </div>
            )}

            {/* Typing bubble placeholder */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-bl-none border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-200"></span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block font-medium">Assistant is thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Suggestions Rail */}
          <div className="px-4 py-2 border-t border-slate-105 bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none whitespace-nowrap">
            <button 
              onClick={() => {
                setInput(language === "pa" 
                  ? "ਝੋਨੇ ਦੀ ਫਸਲ ਵਿੱਚ ਯੂਰੀਆ ਦੀ ਵਰਤੋਂ ਕਦੋਂ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ?" 
                  : language === "hi" 
                  ? "धान की फसल में यूरिया का प्रयोग किस मात्रा में करना चाहिए?" 
                  : "What is the certified organic fertilizer ratio for growing mustard?"
                );
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-600 rounded-full transition-all cursor-pointer"
            >
              {language === "pa" ? "ਝੋਨੇ 'ਚ ਯੂਰੀਆ" : language === "hi" ? "धान में यूरिया" : "Mustard Fertilizer"}
            </button>
            <button 
              onClick={() => {
                setInput(language === "pa" 
                  ? "ਗੁਲਾਬੀ ਸੁੰਡੀ ਤੋਂ ਨਰਮੇ ਦੀ ਫਸਲ ਨੂੰ ਕਿਵੇਂ ਬਚਾਇਆ ਜਾਵੇ?" 
                  : language === "hi" 
                  ? "गुलाबी सुंडी से कपास की फसल का बचाव कैसे करें?" 
                  : "How can I prevent Pink Bollworm infestation in cotton crops?"
                );
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-600 rounded-full transition-all cursor-pointer"
            >
              {language === "pa" ? "ਗੁਲਾਬੀ ਸੁੰਡੀ" : language === "hi" ? "गुलाबी सुंडी" : "Cotton Bollworm"}
            </button>
            <button 
              onClick={() => {
                setInput(language === "pa" 
                  ? "ਪੀਐਮ ਕਿਸਾਨ ਸਨਮਾਨ ਨਿਧੀ ਦੀ 17ਵੀਂ ਕਿਸ਼ਤ ਕਦੋਂ ਆਵੇਗੀ?" 
                  : language === "hi" 
                  ? "पीएम किसान सम्मान निधि की 17वीं किस्त की क्या योग्यता है?" 
                  : "What is the eligibility process for PM Kisan benefits?"
                );
              }}
              className="px-2.5 py-1 text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-slate-600 rounded-full transition-all cursor-pointer"
            >
              {language === "pa" ? "ਪੀਐਮ ਕਿਸਾਨ" : language === "hi" ? "पीएम किसान" : "PM Kisan Guide"}
            </button>
          </div>

          {/* Form Action Node */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isListening 
                  ? "bg-red-500 text-white animate-pulse" 
                  : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-705"
              }`}
              title="Speak voice query"
            >
              {isListening ? (
                <span className="w-5 h-5 flex items-center justify-center font-bold text-xs">●</span>
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening 
                  ? (language === "pa" ? "ਸੁਣ ਰਿਹਾ ਹਾਂ..." : language === "hi" ? "सुन रहा हूँ..." : "Listening...") 
                  : (language === "pa" ? "ਸਵਾਲ ਪੁੱਛੋ..." : language === "hi" ? "सवाल पूछें..." : "Ask your question...")
              }
              className="flex-1 px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl focus:outline-none text-sm transition-all"
            />

            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

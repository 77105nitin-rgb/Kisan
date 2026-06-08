import React, { useState, useEffect } from "react";
import { 
  Database, Shield, Key, CheckCircle, AlertTriangle, Play, RefreshCw, 
  Copy, ExternalLink, Terminal, Eye, Sparkles, FileCode, Check
} from "lucide-react";
import { 
  getSupabaseUrl, getSupabaseAnonKey, isSupabaseConfigured, getSupabaseClient,
  syncProfileToSupabase, syncChatMessageToSupabase, syncPestAlertToSupabase
} from "../supabase";
import { LanguageCode, UserProfile } from "../types";

interface SupabasePortalProps {
  language: LanguageCode;
  userId: string;
  userProfile: UserProfile | null;
}

export default function SupabasePortal({ language, userId, userProfile }: SupabasePortalProps) {
  // Credentials States
  const [supabaseUrl, setSupabaseUrl] = useState(getSupabaseUrl());
  const [supabaseKey, setSupabaseKey] = useState(getSupabaseAnonKey());
  const [isConfigured, setIsConfigured] = useState(isSupabaseConfigured());
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  // Schema copying state
  const [copied, setCopied] = useState(false);

  // Live Table inspector states
  const [selectedTable, setSelectedTable] = useState<string>("profiles");
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Terminal Console Logs for Query debugging
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] Supabase Connector loaded. Check coordinates above.`,
    `[${new Date().toLocaleTimeString()}] Subsystems binding: public.profiles, public.soil_reports, public.disease_reports.`
  ]);

  const addLog = (msg: string) => {
    setConsoleLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleSaveCredentials = () => {
    localStorage.setItem("VITE_SUPABASE_URL", supabaseUrl.trim());
    localStorage.setItem("VITE_SUPABASE_ANON_KEY", supabaseKey.trim());
    
    const nextConfigured = isSupabaseConfigured();
    setIsConfigured(nextConfigured);
    
    addLog(`Credentials updated. URL: ${supabaseUrl.trim()}, Configured: ${nextConfigured ? "YES" : "NO (Incomplete Key)"}`);
    if (nextConfigured) {
      addLog("Supabase client initialized with your private anon key!");
    } else {
      addLog("Using fallback developer keys. Please key in your real Anon Key above.");
    }
  };

  const handleTestConnection = async () => {
    setIsLoadingStatus(true);
    setTestStatus(null);
    addLog("Initiating authentication and profile testing sweep...");
    
    try {
      const client = getSupabaseClient();
      
      // Test 1: Let's do a fast fetch on profiles table
      const { data, error } = await client
        .from("profiles")
        .select("id")
        .limit(1);

      if (error) {
        addLog(`Response returned database warning: ${error.message} (Is your schema created yet?)`);
        setTestStatus({
          success: false,
          message: `Relational link returned code: ${error.code} - ${error.message}. Ensure you have pasted our schema triggers inside the Supabase SQL editor.`
        });
      } else {
        addLog("Database ping returned HTTP 200 list check. Profiles reachable.");
        setTestStatus({
          success: true,
          message: "Connection Live! Supabase returned data index check cleanly."
        });
        
        // Also sync profile automatically
        if (userProfile) {
          addLog("Triggering session profile backup sync check...");
          const syncRes = await syncProfileToSupabase(userProfile);
          if (syncRes && syncRes.success) {
            addLog("Profile synchronized successfully inside public.profiles!");
          }
        }
      }
    } catch (e: any) {
      addLog(`Synchronous exception encountered: ${e.message}`);
      setTestStatus({
        success: false,
        message: e.message || "Failed to contact database endpoint. Check URL validity and network CORS access."
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Run mock/test inserts to help them verify their Supabase rows
  const handleInsertTestRow = async () => {
    if (!isSupabaseConfigured()) {
      alert("Please save your VITE_SUPABASE_ANON_KEY above to execute inserts!");
      return;
    }
    
    addLog("Deploying sample pest warning block to public.pest_alerts...");
    try {
      const mockAlertId = "pest_test_" + Math.floor(Math.random() * 1000);
      const res = await syncPestAlertToSupabase({
        id: mockAlertId,
        userId: userId,
        reporterName: userProfile?.name || "Kisan Friend",
        district: "Ludhiana",
        state: "Punjab",
        cropType: "Rice / Basmati",
        pestName: "Brown Plant Hopper (BPH)",
        severity: "medium",
        description: "Test diagnostic signal for validation from AI Kisan Mitra dashboard.",
        createdAt: new Date().toISOString()
      });

      if (res && res.success) {
        addLog(`Pest alert inserted! ID: ${mockAlertId}. Check 'pest_alerts' table.`);
        handleRefreshTable("pest_alerts");
      } else {
        addLog(`Insert statement skipped: ${res?.error?.message || "Missing schema definitions"}`);
      }
    } catch (err: any) {
      addLog(`Insert execution error: ${err.message}`);
    }
  };

  // Inspect existing rows inside Supabase tables live!
  const handleRefreshTable = async (tableName: string = selectedTable) => {
    setIsLoadingTable(true);
    setTableError(null);
    addLog(`Querying active records inside table: ${tableName}...`);
    
    try {
      const client = getSupabaseClient();
      const { data, error } = await client
        .from(tableName)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        setTableError(`Schema Table '${tableName}' returned status: ${error.message}`);
        addLog(`Inspector read failed: ${error.message}`);
        setTableRows([]);
      } else {
        setTableRows(data || []);
        addLog(`Read completed. Received ${data?.length || 0} rows from public.${tableName}.`);
      }
    } catch (e: any) {
      setTableError(e.message || "Network read failure.");
      addLog(`Table read exception: ${e.message}`);
    } finally {
      setIsLoadingTable(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      handleRefreshTable(selectedTable);
    }
  }, [selectedTable, isConfigured]);

  const copySqlToClipboard = () => {
    const sql = `-- =========================================================================
-- SUPABASE SCHEMA FOR AI KISAN MITRA (AGRICULTURUAL COMPANION)
-- Copy and paste this script directly into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/zxirdlcuejjufsfxhmtq/sql)
-- =========================================================================

-- Enable uuid-ossp extension for generating unique UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES / USERS TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    language VARCHAR(5) DEFAULT 'pa' NOT NULL,
    role VARCHAR(20) DEFAULT 'farmer' NOT NULL CHECK (role IN ('farmer', 'officer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow system/auth to insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. CROP DISEASE REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.disease_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    image_url TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    confidence NUMERIC(4, 2) NOT NULL,
    causes TEXT NOT NULL,
    symptoms TEXT[] NOT NULL DEFAULT '{}',
    prevention TEXT NOT NULL,
    treatment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.disease_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own disease reports" ON public.disease_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create disease reports" ON public.disease_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. SOIL REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.soil_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crop TEXT NOT NULL,
    nitrogen INTEGER NOT NULL,
    phosphorus INTEGER NOT NULL,
    potassium INTEGER NOT NULL,
    soil_type TEXT NOT NULL,
    ph NUMERIC(3, 1) NOT NULL,
    analysis TEXT NOT NULL,
    fertilizer_recommendation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own soil reports" ON public.soil_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own soil reports" ON public.soil_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    addLog("Copy trigger: SQL installation script copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-emerald-100 flex flex-col h-full space-y-6">
      {/* Tab Banner */}
      <div className="border-b border-slate-100 pb-5 mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <span>Supabase Cloud Sync Console</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold">
            Observe, bind, and inspect table states of your external Postgres SQL environment live.
          </p>
        </div>

        {/* Live Indicator Pills */}
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-805 shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              CONNECTED LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              LOCAL WRITES ONLY (Pending API Key)
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Setup Form & Credentials */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-600" />
              API Key Credentials Configuration
            </h3>

            {/* Input target URL */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Supabase Endpoint URL</label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Input target Anon key */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 flex items-center justify-between">
                <span>Public Anon Secret Key (client-safe)</span>
                {supabaseKey && (
                  <span className="text-emerald-700 lowercase text-[9px] font-bold">Loaded...</span>
                )}
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC..."
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Actions for configuration */}
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleSaveCredentials}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:shadow"
              >
                Save Settings
              </button>

              <button
                disabled={isLoadingStatus}
                onClick={handleTestConnection}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-650 text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isLoadingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>Test Link</span>
              </button>
            </div>

            {/* Direct testing results callback */}
            {testStatus && (
              <div className={`p-3.5 rounded-xl border text-xs leading-relaxed font-semibold ${
                testStatus.success 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-805" 
                  : "bg-red-50 border-red-200 text-red-750"
              }`}>
                {testStatus.success ? "✅ Success: " : "❌ Link Warning: "}
                {testStatus.message}
              </div>
            )}
          </div>

          {/* Quick interactive test playground */}
          <div className="bg-gradient-to-tr from-emerald-950 via-emerald-900 to-emerald-950 text-white p-5 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-5 -translate-y-5 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
            
            <div className="space-y-2">
              <span className="px-2 py-0.5 rounded-md bg-white/10 text-[9px] uppercase font-bold tracking-widest text-emerald-300">
                Playground Environment
              </span>
              <h3 className="text-sm font-extrabold tracking-tight">Active API Write Injector</h3>
              <p className="text-xs text-emerald-200 leading-relaxed font-semibold">
                Generate test values to verify your relational setups. Each trigger bypasses simulated scopes to communicate with live endpoints.
              </p>
            </div>

            <div className="pt-5 flex flex-wrap gap-2">
              <button
                onClick={handleInsertTestRow}
                disabled={!isConfigured}
                className="flex-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-655 disabled:opacity-40 disabled:cursor-not-allowed border border-emerald-600 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors"
              >
                Push Sample Alert
              </button>
              
              <button
                onClick={async () => {
                  if (!isConfigured) return;
                  addLog("Posting dummy conversational thread to public.chat_messages...");
                  const dummyId = "dummy_chat_" + Date.now();
                  const res = await syncChatMessageToSupabase({
                    id: dummyId,
                    userId,
                    message: "Can you consult on basmati fertilizer cycles?",
                    sender: "user",
                    language: "pa",
                    createdAt: new Date().toISOString()
                  });
                  if (res && res.success) {
                    addLog(`Draft chat message saved! ID: ${dummyId}. Checking public.chat_messages...`);
                    handleRefreshTable("chat_messages");
                  }
                }}
                disabled={!isConfigured}
                className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 rounded-xl text-xs font-bold text-white cursor-pointer transition-colors"
              >
                Push Test Chat
              </button>
            </div>
          </div>
        </div>

        {/* Right column: SQL Copy & Live Row Inspector */}
        <div className="lg:col-span-7 space-y-5 flex flex-col justify-between">
          
          {/* Quick reference for SQL paste */}
          <div className="bg-white p-4.5 border border-slate-200/90 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-705 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-600" />
                Install Database Tables (Supabase SQL Editor)
              </h3>
              
              <button
                onClick={copySqlToClipboard}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-205 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? "Copied!" : "Copy SQL Code"}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              To wire your tables automatically: Go to your Supabase Project Dashboard, locate <strong className="text-slate-805">SQL Editor</strong>, and copy-paste the configuration triggers we created for you.
            </p>

            <div className="flex items-center gap-2 text-xs">
              <a
                href="https://supabase.com/dashboard/project/zxirdlcuejjufsfxhmtq/sql"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-800 font-bold hover:underline"
              >
                <span>Open Supabase SQL Web Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="text-slate-300">|</span>
              <span className="text-[10px] font-mono font-bold text-slate-400">File Reference: /supabase_schema.sql</span>
            </div>
          </div>

          {/* Table content rows viewer */}
          <div className="border border-slate-200/80 rounded-2xl flex-1 flex flex-col overflow-hidden bg-slate-50 min-h-[300px]">
            {/* Inspector Selector */}
            <div className="bg-white border-b border-slate-150 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-emerald-600" id="icon-table-eye" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Live Tables Viewer</span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-xl text-xs font-bold cursor-pointer focus:outline-none pr-6"
                >
                  <option value="profiles">profiles (Farmer Profiles)</option>
                  <option value="disease_reports">disease_reports (Crop Disease)</option>
                  <option value="soil_reports">soil_reports (Mridha Health)</option>
                  <option value="chat_messages">chat_messages (AI Dialogs)</option>
                  <option value="pest_alerts">pest_alerts (Outbreaks)</option>
                  <option value="notifications">notifications (Gov Advisories)</option>
                </select>

                <button
                  onClick={() => handleRefreshTable(selectedTable)}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
                  title="Query latest records"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoadingTable ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* List entries */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative max-h-[350px]">
              {isLoadingTable ? (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                  <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500 mt-2">Querying public.{selectedTable}...</p>
                </div>
              ) : null}

              {!isConfigured ? (
                <div className="text-center py-10 space-y-2 text-slate-400 font-semibold leading-relaxed">
                  <Database className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">Database inspection is disabled because VITE_SUPABASE_ANON_KEY is not configured yet.</p>
                  <p className="text-[10px] text-slate-405 leading-snug">Copy-paste your credentials in the left panel to unlock direct live querying.</p>
                </div>
              ) : tableError ? (
                <div className="bg-red-50 text-red-750 border border-red-200 p-4 rounded-xl text-xs leading-relaxed space-y-2 font-semibold">
                  <div className="font-extrabold flex items-center gap-1 text-red-800">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Table Query Guard Warning</span>
                  </div>
                  <p>{tableError}</p>
                  <p className="text-[10px] text-slate-455 font-normal pt-1 block leading-snug">
                    This error usually means the specified table does not exist inside your Supabase project yet. Paste the SQL setup script inside Supabase SQL editor to create it.
                  </p>
                </div>
              ) : tableRows.length === 0 ? (
                <div className="text-center py-10 space-y-2 text-slate-450 font-semibold select-none leading-relaxed">
                  <CheckCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs">Table public.{selectedTable} is currently empty.</p>
                  <p className="text-[10px] text-slate-400">Add some active records in other modules or push test rows on the left to see tables populate!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tableRows.map((row, idx) => (
                    <div key={row.id || idx} className="bg-white border border-slate-200/75 rounded-xl p-3.5 shadow-sm space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          ID: {(row.id || "").toString().slice(0, 8)}...
                        </span>
                        <span className="text-slate-400 font-mono font-bold">
                          {row.created_at ? new Date(row.created_at).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      
                      {/* JSON dump representation for clean modular display */}
                      <pre className="text-[10px] font-mono text-slate-700 bg-slate-50 p-2.5 rounded-lg overflow-x-auto border border-slate-100 font-medium">
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(row).filter(([k]) => !["id", "created_at", "user_id"].includes(k))
                          ), 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Developer Terminal and Live console logger */}
      <div className="bg-slate-900 text-slate-300 p-4 rounded-2xl border border-slate-800 space-y-2.5 shadow-lg select-text">
        <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-slate-400 select-none pb-1 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Interactive Query Feed and Action Logger</span>
          </div>
          <span className="text-[10px] text-emerald-400">Terminal Ready</span>
        </div>

        <div className="font-mono text-[10px] space-y-1 max-h-[100px] overflow-y-auto leading-relaxed scrollbar-thin">
          {consoleLogs.map((log, idx) => (
            <div key={idx} className={`${idx === 0 ? "text-emerald-300 font-bold" : "text-slate-405"}`}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

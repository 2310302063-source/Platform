// Admin Dashboard - God Mode Command Center
import React, { useState, useEffect } from "react";
import { useAdminStore, useAuthStore } from "../store";
import AIMonitoringAgent, { SecurityAlert, AnomalyType } from "../ai/monitoringAgent";
import { AlertCircle, Shield, Settings, BarChart3, Activity, Zap } from "lucide-react";

const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { aiSensitivity, updateAISensitivity } = useAdminStore();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInstructions, setAiInstructions] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "alerts" | "governance" | "ai-control" | "analytics"
  >("overview");

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const activeAlerts = await AIMonitoringAgent.getActiveAlerts();
      setAlerts(activeAlerts);
    } catch (error) {
      console.error("Error loading alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: string, action: string) => {
    try {
      await AIMonitoringAgent.resolveAlert(alertId, action);
      setAlerts(alerts.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  const handleAISensitivityChange = async (level: number) => {
    try {
      await updateAISensitivity(level);
    } catch (error) {
      console.error("Error updating AI sensitivity:", error);
    }
  };

  const handleSendAIInstruction = () => {
    if (!aiInstructions.trim()) return;

    // Send instruction to AI monitoring agent
    console.log(`[Admin] Sending instruction to AI: ${aiInstructions}`);
    setAiInstructions("");

    // In production, this would save to Firestore for the AI to pick up
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🛡️ Admin Command Center</h1>
        <p className="text-slate-400">
          God Mode - Full Platform Control & AI Governance
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {(
          ["overview", "alerts", "governance", "ai-control", "analytics"] as const
        ).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {tab.replace("-", " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Stats Cards */}
          <StatCard
            icon={<AlertCircle className="w-6 h-6" />}
            title="Active Alerts"
            value={alerts.length}
            color="red"
          />
          <StatCard
            icon={<Shield className="w-6 h-6" />}
            title="Blocked Attempts"
            value="342"
            color="orange"
          />
          <StatCard
            icon={<Activity className="w-6 h-6" />}
            title="Monitored Users"
            value="12,548"
            color="blue"
          />
          <StatCard
            icon={<Zap className="w-6 h-6" />}
            title="AI Health"
            value="99.8%"
            color="green"
          />
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Security Alerts</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              ✅ No active alerts. System is secure.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={handleResolveAlert}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Governance & Guardrails Tab */}
      {activeTab === "governance" && (
        <div className="bg-slate-800 rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold">Governance & Guardrails</h2>

          {/* Offensiveness Protection */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Offensiveness Protection</h3>
            <div className="space-y-3">
              <ToggleSwitch label="Enable Content Filtering" defaultChecked />
              <ToggleSwitch label="Auto-flag Hate Speech" defaultChecked />
              <ToggleSwitch label="Shadow Ban Offenders" defaultChecked />
              <div className="pt-3">
                <label className="block text-sm mb-2">Sensitivity Level</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={aiSensitivity}
                  onChange={(e) =>
                    handleAISensitivityChange(parseInt(e.target.value))
                  }
                  className="w-full"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Current: {aiSensitivity}/10
                </p>
              </div>
            </div>
          </div>

          {/* Prompt Injection Filters */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Prompt Injection Filters</h3>
            <div className="space-y-2">
              <ToggleSwitch label="Detect SQL Injection Attempts" defaultChecked />
              <ToggleSwitch label="Detect XSS Patterns" defaultChecked />
              <ToggleSwitch label="Detect Command Injection" defaultChecked />
              <ToggleSwitch label="Block Suspicious Unicode" defaultChecked />
            </div>
          </div>

          {/* Sensitive Data Detection */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Sensitive Data Detection</h3>
            <div className="space-y-2">
              <ToggleSwitch label="Detect Credit Cards" defaultChecked />
              <ToggleSwitch label="Detect Phone Numbers" defaultChecked />
              <ToggleSwitch label="Detect Emails" defaultChecked />
              <ToggleSwitch label="Detect SSN/ID Numbers" defaultChecked />
            </div>
          </div>
        </div>
      )}

      {/* AI Control Tab */}
      {activeTab === "ai-control" && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-6">AI Agent Control</h2>

          {/* AI Status */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">AI Monitoring Agent Status</h3>
                <p className="text-slate-400 text-sm">Active & Operational</p>
              </div>
              <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Give Instructions */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">Send Instructions to AI</h3>
            <textarea
              value={aiInstructions}
              onChange={(e) => setAiInstructions(e.target.value)}
              placeholder="Example: Block all users from Nigeria for 24 hours if they exceed 10 login attempts"
              className="w-full bg-slate-600 text-white rounded p-3 mb-3 min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendAIInstruction}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition"
            >
              Send Instruction
            </button>
          </div>

          {/* AI Capabilities */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">AI Capabilities</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Anomaly Detection
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Vulnerability Scanning
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Caching Optimization
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Content Moderation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Real-time Threat Detection
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Daily Active Users (DAU)</h3>
            <AnalyticsChart />
          </div>
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
            <AnalyticsChart />
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: "red" | "orange" | "blue" | "green";
}> = ({ icon, title, value, color }) => {
  const colors = {
    red: "bg-red-900/20 text-red-400",
    orange: "bg-orange-900/20 text-orange-400",
    blue: "bg-blue-900/20 text-blue-400",
    green: "bg-green-900/20 text-green-400",
  };

  return (
    <div className={`${colors[color]} rounded-lg p-4`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-75">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  );
};

const AlertCard: React.FC<{
  alert: SecurityAlert;
  onResolve: (id: string, action: string) => void;
}> = ({ alert, onResolve }) => {
  const severityColors = {
    low: "border-yellow-500 bg-yellow-900/20",
    medium: "border-orange-500 bg-orange-900/20",
    high: "border-red-500 bg-red-900/20",
    critical: "border-red-600 bg-red-900/40",
  };

  return (
    <div className={`border-l-4 ${severityColors[alert.severity]} rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{alert.type.replace("_", " ").toUpperCase()}</h4>
          <p className="text-sm text-slate-300 mt-1">{alert.description}</p>
          <p className="text-xs text-slate-400 mt-2">
            User: {alert.userId} | {new Date(alert.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onResolve(alert.id || "", "reviewed")}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition"
          >
            Review
          </button>
          <button
            onClick={() => onResolve(alert.id || "", "dismissed")}
            className="bg-slate-600 hover:bg-slate-700 px-3 py-1 rounded text-sm transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

const ToggleSwitch: React.FC<{ label: string; defaultChecked?: boolean }> = ({
  label,
  defaultChecked = false,
}) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <input type="checkbox" defaultChecked={defaultChecked} className="w-4 h-4" />
    <span className="text-sm">{label}</span>
  </label>
);

const AnalyticsChart: React.FC = () => (
  <div className="h-48 bg-slate-700 rounded flex items-center justify-center text-slate-400">
    📊 Chart component (integrate with Chart.js or Recharts)
  </div>
);

export default AdminDashboard;

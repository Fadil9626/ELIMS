import React, { useEffect, useState } from "react";
// @ts-ignore - Ignoring type check for service if it is JS
import billingService from "../../services/billingService";
import { 
  Save, 
  Loader2, 
  CreditCard, 
  Receipt, 
  Banknote, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

interface BillingSettings {
  currency_symbol: string;
  tax_enabled: boolean;
  tax_rate: number;
  invoice_footer_text: string;
  accepted_payment_methods: string[];
}

const BillingSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<BillingSettings>({
    currency_symbol: "Le",
    tax_enabled: false,
    tax_rate: 0,
    invoice_footer_text: "",
    accepted_payment_methods: [],
  });

  // Load initial settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await billingService.getSettings();
      setFormData({
        currency_symbol: data.currency_symbol || "Le",
        tax_enabled: data.tax_enabled || false,
        tax_rate: Number(data.tax_rate) || 0,
        invoice_footer_text: data.invoice_footer_text || "",
        accepted_payment_methods: data.accepted_payment_methods || [],
      });
    } catch (err: any) {
      console.error("Failed to load settings", err);
      setMessage({ type: 'error', text: "Failed to load settings. Please check your connection." });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleMethodToggle = (method: string) => {
    setFormData(prev => {
      const current = prev.accepted_payment_methods;
      if (current.includes(method)) {
        return { ...prev, accepted_payment_methods: current.filter(m => m !== method) };
      } else {
        return { ...prev, accepted_payment_methods: [...current, method] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      await billingService.updateSettings(formData);
      setMessage({ type: 'success', text: "Billing settings saved successfully!" });
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || "Failed to save settings." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="ml-2 text-sm">Loading configurations...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Pricing Configuration</h1>
        <p className="text-sm text-slate-500">Manage currency, tax rules, and invoice details.</p>
      </div>

      {/* Feedback Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* CARD 1: General Currency & Tax */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Banknote className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Currency & Taxes</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                name="currency_symbol"
                value={formData.currency_symbol}
                onChange={handleChange}
                className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="e.g. Le, $, €"
              />
              <p className="text-xs text-slate-500 mt-1">Symbol used on invoices and dashboards.</p>
            </div>

            {/* Tax Toggle */}
            <div className="flex flex-col justify-end">
               <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                 <input 
                    type="checkbox" 
                    name="tax_enabled"
                    checked={formData.tax_enabled}
                    onChange={handleChange}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                 />
                 <div>
                   <span className="block text-sm font-medium text-slate-900">Enable Tax / VAT</span>
                   <span className="block text-xs text-slate-500">Apply tax to test prices automatically</span>
                 </div>
               </label>
            </div>

            {/* Tax Rate (Conditional) */}
            {formData.tax_enabled && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tax Rate (%)</label>
                <input
                  type="number"
                  name="tax_rate"
                  value={formData.tax_rate}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: Payment Methods */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Accepted Payment Methods</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">Select the payment methods available at the reception.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['Cash', 'Mobile Money', 'Card', 'Insurance', 'Bank Transfer'].map(method => (
                <label key={method} className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-all ${
                  formData.accepted_payment_methods.includes(method) 
                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <input 
                    type="checkbox"
                    checked={formData.accepted_payment_methods.includes(method)}
                    onChange={() => handleMethodToggle(method)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">{method}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 3: Invoice Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Invoice Settings</h3>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-700 mb-1">Footer Note</label>
            <textarea
              name="invoice_footer_text"
              value={formData.invoice_footer_text}
              onChange={handleChange}
              rows={3}
              className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              placeholder="e.g. Thank you for choosing our lab. Payment is due upon receipt."
            />
            <p className="text-xs text-slate-500 mt-1">This text will appear at the bottom of every generated invoice.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>

      </form>
    </div>
  );
};

export default BillingSettingsPage;
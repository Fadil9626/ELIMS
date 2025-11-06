// frontend/src/components/profile/ApiKeyManager.jsx
import React, { useState, useEffect, useMemo } from "react";
import userService from "../../services/userService";
import toast from "react-hot-toast";
import {
  HiOutlineKey,
  HiPlus,
  HiTrash,
  HiClipboardCopy,
  HiCheckCircle,
  HiOutlineExclamation,
  HiX,
} from "react-icons/hi";
import { motion, AnimatePresence } from "framer-motion";

// Format dates
const fmtDate = (v) => (v ? new Date(v).toLocaleString() : "Never");

// Copy helper
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text || "");
    toast.success("Copied to clipboard!");
  } catch {
    toast.error("Failed to copy.");
  }
};

export const ApiKeyManager = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState(null); // { fullKey, name }
  const [isGenerating, setIsGenerating] = useState(false);

  const token = useMemo(() => {
    const userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
    return userInfo ? userInfo.token : null;
  }, []);

  const loadKeys = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await userService.listApiKeys(token);
      setKeys(data);
    } catch (err) {
      toast.error(`Failed to load keys: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error("Please provide a name for the key.");
      return;
    }
    setIsGenerating(true);
    try {
      const newKeyData = await userService.generateApiKey(keyName, token); // returns { fullKey, name, ... }
      setNewKey(newKeyData); // show one-time key
      setKeyName("");
      loadKeys(); // refresh list
    } catch (err) {
      toast.error(`Failed to generate key: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevoke = async (keyId) => {
    if (!window.confirm("Revoke this key? This action is permanent.")) return;
    try {
      await userService.revokeApiKey(keyId, token);
      toast.success("API key revoked.");
      loadKeys();
    } catch (err) {
      toast.error(`Failed to revoke key: ${err.message}`);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setNewKey(null);
    setKeyName("");
  };

  return (
    <div className="space-y-8">
      <div className="pb-5 border-b border-gray-200">
        <h2 className="text-xl font-semibold leading-6 text-gray-900">API Key Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage API keys for external instruments and integrations.
        </p>
      </div>

      <div className="rounded-2xl ring-1 ring-gray-200 p-6 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Your Keys</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <HiPlus className="-ml-0.5 h-5 w-5" /> Generate New Key
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-gray-500 italic text-center py-4">No API keys generated yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {keys.map((key) => (
              <li key={key.id} className="flex items-center justify-between py-3 gap-4">
                <div className="flex items-center gap-3">
                  <HiOutlineKey className="h-6 w-6 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-xs text-gray-500">
                      Prefix: <span className="font-mono">{key.key_prefix}****</span> | Last used:{" "}
                      {fmtDate(key.last_used_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(key.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  <HiTrash className="inline-block -mt-0.5 mr-1" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal: Generate Key */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Generate New API Key</h3>
                <button onClick={closeModal}>
                  <HiX className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {newKey ? (
                // Step 2: show one-time key
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800 text-sm flex items-start gap-2">
                    <HiCheckCircle className="h-5 w-5 flex-shrink-0" />
                    <p>
                      New key generated! Copy this key and store it securely. You will not be able
                      to see it again.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={newKey.fullKey}
                      className="w-full rounded-md border-gray-300 bg-gray-100 p-2 font-mono text-sm pr-10"
                    />
                    <button
                      onClick={() => copyToClipboard(newKey.fullKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-800"
                    >
                      <HiClipboardCopy className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    onClick={closeModal}
                    className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                // Step 1: form
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm flex items-start gap-2">
                    <HiOutlineExclamation className="h-5 w-5 flex-shrink-0" />
                    <p>This key inherits your account permissions. Treat it like a password.</p>
                  </div>
                  <div>
                    <label htmlFor="keyName" className="block text-sm font-medium text-gray-600">
                      Key Name
                    </label>
                    <input
                      type="text"
                      id="keyName"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      className="mt-1 w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-base px-3 py-2"
                      placeholder="e.g., Sysmex Analyzer"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-sm font-semibold text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isGenerating ? "Generating..." : "Generate Key"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ✅ Default export so you can import without braces
export default ApiKeyManager;

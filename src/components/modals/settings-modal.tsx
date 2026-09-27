"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, CheckCircle2, RefreshCw } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export function SettingsModal({ isOpen, onClose, onSettingsSaved }: SettingsModalProps) {
  const [lowThreshold, setLowThreshold] = React.useState("60");
  const [mediumThreshold, setMediumThreshold] = React.useState("80");
  const [highThreshold, setHighThreshold] = React.useState("100");
  const [workingHours, setWorkingHours] = React.useState("10");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.lowEfficiencyThreshold) setLowThreshold(data.lowEfficiencyThreshold);
          if (data.mediumEfficiencyThreshold) setMediumThreshold(data.mediumEfficiencyThreshold);
          if (data.highEfficiencyThreshold) setHighThreshold(data.highEfficiencyThreshold);
          if (data.defaultWorkingHours) setWorkingHours(data.defaultWorkingHours);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lowEfficiencyThreshold: lowThreshold,
          mediumEfficiencyThreshold: mediumThreshold,
          highEfficiencyThreshold: highThreshold,
          defaultWorkingHours: workingHours
        })
      });

      if (res.ok) {
        setSuccessMsg("Settings updated successfully!");
        onSettingsSaved?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Settings className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            System Performance Thresholds
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Configure line efficiency alert boundaries and factory operating hours
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            <span className="text-xs">Loading configuration...</span>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {successMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Low Efficiency Alert Threshold (%):
              </label>
              <Input
                type="number"
                value={lowThreshold}
                onChange={(e) => setLowThreshold(e.target.value)}
                className="h-8 text-xs font-mono"
                min="0"
                max="100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Lines below this percentage trigger "Attention Required" alerts (default: 60%).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Target Benchmark Efficiency (%):
              </label>
              <Input
                type="number"
                value={mediumThreshold}
                onChange={(e) => setMediumThreshold(e.target.value)}
                className="h-8 text-xs font-mono"
                min="0"
                max="100"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Standard factory target efficiency curve (default: 80%).
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Daily Working Hours (Shift Hours):
              </label>
              <Input
                type="number"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="h-8 text-xs font-mono"
                min="1"
                max="24"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Used to calculate clock hours = Manpower * Working Hours (default: 10 hrs).
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || loading} className="text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React from "react";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  TrendingUp,
  Users,
  Briefcase,
  AlertTriangle,
  UploadCloud,
  FileSpreadsheet,
  Settings,
  Factory,
  BarChart3,
  ListOrdered,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  alertCount?: number;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, alertCount = 0 }: SidebarProps) {
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    production: true,
    performance: true,
    reports: true,
    data: true
  });

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const mainNav = [
    {
      id: "overview",
      label: "Overview Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "signoff-summary",
      label: "Sign-off Plan Summary",
      icon: ShieldCheck,
      badge: "Excel Summary",
      badgeVariant: "emerald"
    },
    {
      id: "excel-master",
      label: "Excel Plan Master Grid",
      icon: FileSpreadsheet,
      badge: "31-Day Matrix",
      badgeVariant: "sky"
    },
  ];

  const navSections = [
    {
      section: "production",
      label: "Production",
      items: [
        { id: "signoff-summary", label: "Sign-off Plan Summary", icon: ShieldCheck },
        { id: "excel-master", label: "Excel Plan Matrix", icon: FileSpreadsheet },
        { id: "daily-report", label: "Daily Production", icon: Calendar },
        { id: "target-vs-actual", label: "Target vs Actual", icon: BarChart3 },
        { id: "production-calendar", label: "Production Calendar", icon: Calendar },
      ]
    },
    {
      section: "performance",
      label: "Performance",
      items: [
        { id: "line-performance", label: "Line Performance", icon: Layers },
        { id: "efficiency-analysis", label: "Efficiency Analytics", icon: TrendingUp },
        { id: "unit-performance", label: "Unit Performance", icon: Factory },
        { id: "buyer-performance", label: "Buyer Performance", icon: Briefcase },
        { id: "manpower-analysis", label: "Manpower Analysis", icon: Users },
      ]
    },
    {
      section: "orders",
      label: "Orders & Styles",
      items: [
        { id: "all-orders", label: "All Orders & Styles", icon: ListOrdered },
        { id: "production-gap", label: "Production Gap Analysis", icon: TrendingUp },
      ]
    },
    {
      section: "monitoring",
      label: "Monitoring",
      items: [
        {
          id: "attention-required",
          label: "Attention Required",
          icon: AlertTriangle,
          badge: alertCount > 0 ? alertCount : null,
          badgeVariant: "destructive"
        },
        { id: "management-summary", label: "Management Summary", icon: ShieldCheck },
      ]
    },
    {
      section: "data",
      label: "Data Management",
      items: [
        { id: "excel-import", label: "Excel Import / Sync", icon: UploadCloud },
        { id: "import-history", label: "Import History", icon: FileSpreadsheet },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-slate-900 text-slate-100 transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-950 lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header Branding */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md">
              <Factory className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Birichina <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-sky-400">ERP</span>
              </h1>
              <p className="text-[11px] text-slate-400">Planning & Performance</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 custom-scrollbar">
          {/* Main overview & Top Navigation */}
          <div className="space-y-1">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sky-600 text-white shadow-sm font-semibold"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="flex h-5 items-center justify-center rounded-full bg-emerald-500/20 px-2 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sectional navigation */}
          {navSections.map((group) => (
            <div key={group.section} className="space-y-1">
              <div
                onClick={() => toggleSection(group.section)}
                className="flex items-center justify-between px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 cursor-pointer select-none"
              >
                <span>{group.label}</span>
                {openSections[group.section] ? (
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                )}
              </div>

              {openSections[group.section] && (
                <div className="space-y-0.5 pt-1">
                  {group.items.map((item: any) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          isActive
                            ? "bg-sky-600/90 text-white shadow font-semibold"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== null && item.badge !== undefined && (
                          <span
                            className={cn(
                              "flex h-5 items-center justify-center rounded-full px-2 text-[10px] font-bold",
                              item.badgeVariant === "destructive"
                                ? "bg-rose-500 text-white"
                                : "bg-sky-500/20 text-sky-300"
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer info & Settings */}
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={() => {
              setActiveTab("settings");
              setIsOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              activeTab === "settings"
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Settings & Thresholds</span>
            </div>
          </button>
          
          <div className="mt-2.5 rounded-lg bg-slate-950/60 p-2.5 text-[11px] text-slate-400 border border-slate-850">
            <div className="flex items-center justify-between text-slate-300">
              <span>Month Plan:</span>
              <span className="font-semibold text-sky-400">October 2026</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>Status:</span>
              <span className="text-emerald-400 font-medium">Signed Off (113 Lines)</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

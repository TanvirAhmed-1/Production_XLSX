"use client";

import React from "react";
import {
  LayoutDashboard,
  Calendar,
  Layers,
  TrendingUp,
  Users,
  Briefcase,
  UploadCloud,
  FileSpreadsheet,
  Factory,
  BarChart3,
  ListOrdered,
  GitCompare,
  Calculator,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }: SidebarProps) {
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    production: true,
    performance: true,
    tools: true,
  });

  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const navGroups = [
    {
      title: "Core Reports",
      section: "production",
      items: [
        { id: "overview", label: "Overview Dashboard", icon: LayoutDashboard, badge: "KPIs" },
        { id: "daily-report", label: "Daily Summary", icon: Calendar, badge: "31 Days" },
        { id: "unit-summary", label: "Unit Summary", icon: Factory, badge: "B1/B2" },
        { id: "line-detail", label: "Line Detail Report", icon: ListOrdered, badge: "Matrix" },
        { id: "run-lines", label: "Running Lines", icon: Layers, badge: "Running" },
        { id: "change-over", label: "Change Over Timeline", icon: BarChart3, badge: "COs" },
        { id: "buyer-style", label: "Buyers & Styles", icon: Briefcase, badge: null },
      ],
    },
    {
      title: "Data & Management",
      section: "tools",
      items: [
        { id: "upload", label: "Excel Upload & AI", icon: UploadCloud, badge: "Importer" },
        { id: "comparison", label: "Snapshot Comparison", icon: GitCompare, badge: "Diff" },
      ],
    },
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col w-64 bg-slate-950 border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-600/30">
          <Factory className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide">BIRICHINA</h2>
          <p className="text-[11px] text-slate-400 font-mono">Report Engine 2.0</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 px-4 py-4 overflow-y-auto space-y-6">
        {navGroups.map(grp => (
          <div key={grp.section} className="space-y-1.5">
            <button
              onClick={() => toggleSection(grp.section)}
              className="flex items-center justify-between w-full px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
            >
              <span>{grp.title}</span>
              {openSections[grp.section] ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {openSections[grp.section] && (
              <div className="space-y-1 pt-1">
                {grp.items.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-800 text-slate-400"
                          }`}
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

      {/* User / Environment Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            PostgreSQL Prisma
          </span>
          <span className="font-mono text-[11px] text-slate-500">v2.0-calc</span>
        </div>
      </div>
    </aside>
  );
}

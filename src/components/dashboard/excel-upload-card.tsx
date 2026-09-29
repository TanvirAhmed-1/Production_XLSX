"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Eye,
  FileCode,
} from "lucide-react";

interface ExcelUploadCardProps {
  onUploadSuccess: (importId: string) => void;
  onViewRawData?: () => void;
}

export function ExcelUploadCard({
  onUploadSuccess,
  onViewRawData,
}: ExcelUploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [aiReport, setAiReport] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
      setErrorMessage("Only .xlsx or .xls Excel files are supported.");
      return;
    }
    setFile(selectedFile);
    setErrorMessage(null);
    setUploadResult(null);
    setAiReport(null);
  };

  const executeUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setUploadProgress(20);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(50);
      const res = await fetch("/api/excel/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload processing failed");
      }

      setUploadProgress(80);
      setUploadResult(data);

      // Trigger Gemini AI verification
      try {
        const aiRes = await fetch("/api/verify-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: data.importResult,
            sheetNames: data.validation?.sheetNames,
          }),
        });
        const aiData = await aiRes.json();
        if (aiData.aiAudit) {
          setAiReport(aiData.aiAudit);
        }
      } catch (err) {
        console.error("AI check error:", err);
      }

      setUploadProgress(100);
      if (data.importResult?.importId) {
        onUploadSuccess(data.importResult.importId);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            Excel Plan Upload & AI Verification Engine
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatic sheet detection, recap block extraction, database normalization & AI audit
          </p>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      {!uploadResult && (
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition duration-200 ${
            isDragging
              ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]"
              : "border-slate-700/80 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/70"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
            accept=".xlsx, .xls"
            className="hidden"
          />

          <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-3 border border-indigo-500/20">
            <FileSpreadsheet className="w-8 h-8" />
          </div>

          <p className="text-sm font-semibold text-slate-200">
            {file ? file.name : "Drag & drop your Excel plan file here"}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {file
              ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Ready to process`
              : "Supports .xlsx with multiple unit sheets or master factory sheets"}
          </p>

          <button
            type="button"
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            {file ? "Change File" : "Browse Computer"}
          </button>
        </div>
      )}

      {/* Progress & Upload Action */}
      {file && !uploadResult && (
        <div className="space-y-4">
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Parsing sheets & saving to database...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              disabled={isUploading}
              onClick={executeUpload}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Upload, Parse & Calculate
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Post-Upload Success Card (Section 2 Prompt Specification) */}
      {uploadResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Excel File Processed</h4>
                  <p className="text-xs text-slate-400">{uploadResult.importResult?.fileName}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                100% Normalized
              </span>
            </div>

            {/* Checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>File Valid</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadResult.validation?.totalSheets} Sheets Detected</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{uploadResult.importResult?.validRows?.toLocaleString()} Rows Parsed</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Calculations Ready</span>
              </div>
            </div>

            {/* AI Audit Verdict */}
            {aiReport && (
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Gemini AI IE Verification Audit
                  </span>
                  <span className="text-xs font-bold text-emerald-400">
                    Health Score: {aiReport.dataHealthScore}/100
                  </span>
                </div>
                <p className="text-xs text-slate-300">{aiReport.verificationVerdict}</p>
                {aiReport.keyObservations?.length > 0 && (
                  <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-0.5">
                    {aiReport.keyObservations.map((obs: string, idx: number) => (
                      <li key={idx}>{obs}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setUploadResult(null);
                  setFile(null);
                }}
                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                Upload another file
              </button>

              <div className="flex items-center gap-3">
                {onViewRawData && (
                  <button
                    onClick={onViewRawData}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    View Raw Data
                  </button>
                )}
                <button
                  onClick={() => onUploadSuccess(uploadResult.importResult?.importId)}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Interactive Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

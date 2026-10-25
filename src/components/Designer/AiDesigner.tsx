import React, { useState } from 'react';
import { aiFetch } from '../../utils/gemini';
import { 
  Palette, 
  Sparkles, 
  Eye, 
  Code2, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Download, 
  Plus, 
  Trash2, 
  RotateCw, 
  ArrowRight,
  Check,
  Copy,
  Sliders,
  Layers,
  Edit2,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { Project } from '../../types';

interface AiDesignerProps {
  activeProject: Project;
  onSaveToProject: (filename: string, content: string) => void;
  onAskAi: (prompt: string) => Promise<string>;
}

export interface ComponentItem {
  id: string;
  type: 'header' | 'metric' | 'chart' | 'list' | 'actions' | 'bottom_nav';
  title: string;
  subtitle?: string;
  visible: boolean;
}

export const AiDesigner: React.FC<AiDesignerProps> = ({
  activeProject,
  onSaveToProject,
  onAskAi,
}) => {
  const [prompt, setPrompt] = useState('Create a premium expense-tracking dashboard with black background, red accents, monthly statistics, and a spending chart.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<'gemini' | 'local' | null>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual');
  const [deviceSize, setDeviceSize] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [copiedCode, setCopiedCode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Theme controls
  const [accentColor, setAccentColor] = useState('#E5222A'); // ARSHX Red
  const [borderRadius, setBorderRadius] = useState<'rounded-xl' | 'rounded-2xl' | 'rounded-3xl'>('rounded-2xl');
  const [screenTitle, setScreenTitle] = useState('Monthly Overview');
  const [screenCategory, setScreenCategory] = useState('Finances & Tracking');
  const [customComposeCode, setCustomComposeCode] = useState<string | null>(null);

  // Component structure
  const [components, setComponents] = useState<ComponentItem[]>([
    { id: 'c1', type: 'header', title: 'Top Brand Bar', subtitle: 'Profile & notification icon', visible: true },
    { id: 'c2', type: 'metric', title: 'Total Spending KPI', subtitle: '$4,850.00 (-12% vs last mo)', visible: true },
    { id: 'c3', type: 'chart', title: 'Weekly Expense Bar Graph', subtitle: 'Mon to Sun cashflow distribution', visible: true },
    { id: 'c4', type: 'actions', title: 'Quick Action Grid', subtitle: 'Send, Request, Transfer, Bill Split', visible: true },
    { id: 'c5', type: 'list', title: 'Recent Transactions List', subtitle: 'Coffee Shop, Cloud Run, Fiber ISP', visible: true },
    { id: 'c6', type: 'bottom_nav', title: 'Bottom Navigation Dock', subtitle: 'Home, Cards, Analytics, Profile', visible: true },
  ]);

  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSubtitle, setEditingSubtitle] = useState('');

  const toggleComponent = (id: string) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  const addComponent = (type: ComponentItem['type']) => {
    const newId = `c-${Date.now()}`;
    const titles: Record<ComponentItem['type'], { title: string; subtitle: string }> = {
      header: { title: 'Section Header', subtitle: 'Category overview' },
      metric: { title: 'Performance KPI', subtitle: '99.98% uptime' },
      chart: { title: 'Telemetry Graph', subtitle: 'Real-time throughput' },
      actions: { title: 'Control Panel', subtitle: 'Execute batch tasks' },
      list: { title: 'Feed Stream', subtitle: '3 new notifications' },
      bottom_nav: { title: 'Tab Dock', subtitle: 'Global navigation' },
    };
    const info = titles[type] || { title: 'Custom Component', subtitle: 'Interactive element' };
    setComponents(prev => [...prev, { id: newId, type, title: info.title, subtitle: info.subtitle, visible: true }]);
  };

  const startEditComponent = (comp: ComponentItem) => {
    setEditingComponentId(comp.id);
    setEditingTitle(comp.title);
    setEditingSubtitle(comp.subtitle || '');
  };

  const saveEditComponent = () => {
    if (!editingComponentId) return;
    setComponents(prev => prev.map(c => 
      c.id === editingComponentId ? { ...c, title: editingTitle, subtitle: editingSubtitle } : c
    ));
    setEditingComponentId(null);
  };

  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateFromPrompt = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setAiError(null);

    try {
      // Connect directly to the dedicated AI Designer endpoint
      const response = await aiFetch('/api/ai/designer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `HTTP error ${response.status}`);
      }
      if (data.spec) {
        const spec = data.spec;
        if (spec.screenTitle) setScreenTitle(spec.screenTitle);
        if (spec.category) setScreenCategory(spec.category);
        if (spec.theme?.accentColor) setAccentColor(spec.theme.accentColor);
        if (spec.theme?.borderRadius) setBorderRadius(spec.theme.borderRadius);
        if (Array.isArray(spec.components) && spec.components.length > 0) {
          setComponents(spec.components.map((c: any, idx: number) => ({
            id: c.id || `c-${idx + 1}`,
            type: c.type || 'header',
            title: c.title || 'Component',
            subtitle: c.subtitle || '',
            visible: c.visible !== false,
          })));
        }
        if (spec.generatedComposeCode) {
          setCustomComposeCode(spec.generatedComposeCode);
        } else {
          setCustomComposeCode(null);
        }
        setGenerationSource(data.isFallback ? 'local' : 'gemini');
      }
    } catch (err: any) {
      setAiError(err?.message || 'AI generation failed. Please try again.');
        } finally {
      setIsGenerating(false);
    }
  };

  // Generate real Kotlin Jetpack Compose code based on current designer state
  const generatedComposeCode = customComposeCode || `package com.arshx.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ARSHX Theme Palettes (Pinned Android SDK 35 & Compose BOM 2025.02.00)
private val ObsidianBg = Color(0xFF111114)
private val CardSurface = Color(0xFF1A1A20)
private val BorderMuted = Color(0xFF282834)
private val PrimaryAccent = Color(${accentColor.replace('#', '0xFF')})
private val TextPrimary = Color(0xFFF7F7FA)
private val TextSecondary = Color(0xFFA5A5B2)

@Composable
fun ${screenTitle.replace(/[^a-zA-Z0-9]/g, '') || 'Custom'}Screen(
    onNavigateBack: () -> Unit = {}
) {
    Scaffold(
        containerColor = ObsidianBg,
        bottomBar = {
            ${components.find(c => c.type === 'bottom_nav' && c.visible) ? `
            NavigationBar(
                containerColor = Color(0xFF151519),
                contentColor = TextSecondary
            ) {
                NavigationBarItem(
                    selected = true,
                    onClick = {},
                    icon = { Icon(Icons.Default.Home, null) },
                    label = { Text("Home", fontSize = 10.sp) }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = {},
                    icon = { Icon(Icons.Default.Analytics, null) },
                    label = { Text("Stats", fontSize = 10.sp) }
                )
                NavigationBarItem(
                    selected = false,
                    onClick = {},
                    icon = { Icon(Icons.Default.Person, null) },
                    label = { Text("Profile", fontSize = 10.sp) }
                )
            }` : '// Bottom dock omitted'}
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(Modifier.height(8.dp)) }

            ${components.find(c => c.type === 'header' && c.visible) ? `
            // Header: ${screenTitle}
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column {
                        Text(
                            text = "${screenTitle}",
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Text(
                            text = "${screenCategory}",
                            fontSize = 12.sp,
                            color = TextSecondary
                        )
                    }
                    IconButton(onClick = {}) {
                        Icon(Icons.Default.Notifications, null, tint = TextSecondary)
                    }
                }
            }` : ''}

            ${components.find(c => c.type === 'metric' && c.visible) ? `
            // Metric Card: ${components.find(c => c.type === 'metric')?.title}
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = CardSurface)
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text(
                            text = "${components.find(c => c.type === 'metric')?.title.toUpperCase()}",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextSecondary,
                            letterSpacing = 1.sp
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "${components.find(c => c.type === 'metric')?.subtitle || '$4,850.00'}",
                            fontSize = 30.sp,
                            fontWeight = FontWeight.Black,
                            color = TextPrimary
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "↓ Nominal Status · Active",
                                color = Color(0xFF22C55E),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                    }
                }
            }` : ''}

            ${components.find(c => c.type === 'chart' && c.visible) ? `
            // Analytical Chart Block
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = CardSurface)
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Text("${components.find(c => c.type === 'chart')?.title.toUpperCase()}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                        Spacer(Modifier.height(16.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth().height(100.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Bottom
                        ) {
                            listOf(40, 75, 55, 90, 60, 85, 95).forEachIndexed { idx, heightPercent ->
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(
                                        Modifier
                                            .width(18.dp)
                                            .height(heightPercent.dp)
                                            .background(
                                                if (idx == 6) PrimaryAccent else Color(0xFF2C2C38),
                                                RoundedCornerShape(6.dp)
                                            )
                                    )
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        text = listOf("M","T","W","T","F","S","S")[idx],
                                        fontSize = 10.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }
            }` : ''}

            ${components.find(c => c.type === 'actions' && c.visible) ? `
            // Action Grid
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = {},
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = PrimaryAccent)
                    ) {
                        Text("Primary Action", fontWeight = FontWeight.Bold)
                    }
                    OutlinedButton(
                        onClick = {},
                        modifier = Modifier.weight(1f).height(48.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Secondary Action", color = TextPrimary)
                    }
                }
            }` : ''}

            ${components.find(c => c.type === 'list' && c.visible) ? `
            // Activity List Feed
            item {
                Text("${components.find(c => c.type === 'list')?.title.toUpperCase()}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
            }
            items(3) { index ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = CardSurface)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier.size(40.dp).background(Color(0xFF24242C), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Receipt, null, tint = PrimaryAccent)
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Record Item #$index", color = TextPrimary, fontWeight = FontWeight.SemiBold)
                            Text("Status · Nominal", color = TextSecondary, fontSize = 11.sp)
                        }
                        Text("Completed", color = TextPrimary, fontWeight = FontWeight.Bold)
                    }
                }
            }` : ''}

            item { Spacer(Modifier.height(20.dp)) }
        }
    }
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedComposeCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveToActiveProject = () => {
    const filename = `${screenTitle.replace(/[^a-zA-Z0-9]/g, '') || 'Custom'}Screen.kt`;
    onSaveToProject(filename, generatedComposeCode);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0E0E12] overflow-hidden select-none">
      {aiError && (
        <div role="alert" className="glass-card border-[#E5222A]/40 mx-3 mt-2 px-4 py-2.5 text-xs text-[#FF5E65] flex items-start gap-2 shrink-0">
          <span className="font-bold shrink-0">AI error</span>
          <span className="text-[#F7F7FA]/90">{aiError}</span>
        </div>
      )}
      {/* Designer Top Bar */}
      <div className="h-14 bg-[#141418] border-b border-[#24242C] px-4 md:px-6 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <Palette className="w-5 h-5 text-[#E5222A]" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">ARSHX AI Designer</h2>
              {generationSource && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1 ${
                  generationSource === 'gemini' 
                    ? 'bg-[#22C55E]/15 text-[#86EFAC] border border-[#22C55E]/30'
                    : 'bg-[#FBBF24]/15 text-[#FBBF24] border border-[#FBBF24]/30'
                }`}>
                  <Cpu className="w-2.5 h-2.5" />
                  Gemini
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#A5A5B2]">
              Visual component layout studio & Jetpack Compose code synthesis (Target SDK 35).
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#1A1A20] p-1 rounded-lg border border-[#2B2B38]">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'visual' ? 'bg-[#262633] text-white shadow-xs' : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visual Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'code' ? 'bg-[#262633] text-white shadow-xs' : 'text-[#A5A5B2] hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Generated Code</span>
            </button>
          </div>

          <button
            onClick={handleSaveToActiveProject}
            className="px-3.5 py-1.5 bg-[#E5222A] hover:bg-[#d01c24] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#E5222A]/20"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Saved to {activeProject.name}!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Save Screen.kt</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Natural Language Prompt & Component Manager */}
        <div className="w-full lg:w-84 bg-[#121216] border-r border-[#24242C] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Prompt Box */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#E5222A]" />
              Natural Language Screen Prompt
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe screen (e.g. Fitness dashboard with calories and heart rate)..."
              className="w-full bg-[#181820] border border-[#2B2B38] rounded-xl p-3 text-xs text-white placeholder:text-[#555566] focus:outline-none focus:border-[#E5222A] resize-none"
            />
            <button
              onClick={handleGenerateFromPrompt}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-2 bg-[#E5222A] hover:bg-[#d01c24] disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-[#E5222A]/20"
            >
              <RotateCw className={`w-3.5 h-3.5 text-white ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Synthesizing with AI...' : 'Generate with AI'}</span>
            </button>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2]">
              Quick Templates
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { name: 'Expense Tracker', query: 'Expense tracker dashboard with spending chart and monthly KPI' },
                { name: 'Workout Pulse', query: 'Fitness workout pulse with calorie stats and logged sets' },
                { name: 'Mobile Login', query: 'Minimal login auth with email, password, and biometric' },
                { name: 'Developer Hub', query: 'Developer workstation with terminal logs, Git status and builds' },
              ].map(preset => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setPrompt(preset.query);
                    setTimeout(() => handleGenerateFromPrompt(), 50);
                  }}
                  className="px-2.5 py-1.5 bg-[#181820] hover:bg-[#20202A] border border-[#282834] rounded-lg text-[11px] text-[#A5A5B2] hover:text-white text-left truncate transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Component Toggle & Layer Manager */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2] flex items-center gap-1">
                <Layers className="w-3 h-3 text-[#67E8F9]" />
                Component Layers ({components.filter(c => c.visible).length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => addComponent('metric')}
                  className="px-2 py-0.5 text-[10px] bg-[#1E1E28] hover:bg-[#262634] text-[#A5A5B2] hover:text-white rounded border border-[#2C2C3A]"
                  title="Add Metric Card"
                >
                  + Metric
                </button>
                <button
                  onClick={() => addComponent('list')}
                  className="px-2 py-0.5 text-[10px] bg-[#1E1E28] hover:bg-[#262634] text-[#A5A5B2] hover:text-white rounded border border-[#2C2C3A]"
                  title="Add List Feed"
                >
                  + List
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {components.map(comp => (
                <div
                  key={comp.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                    comp.visible 
                      ? 'bg-[#181822] border-[#E5222A]/40 text-white' 
                      : 'bg-[#121217] border-[#22222C] text-[#6B7280]'
                  }`}
                >
                  <div 
                    onClick={() => toggleComponent(comp.id)}
                    className="flex-1 cursor-pointer min-w-0 pr-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-mono uppercase text-[#A5A5B2] px-1 bg-[#22222C] rounded">
                        {comp.type}
                      </span>
                      <h5 className="text-xs font-semibold truncate">{comp.title}</h5>
                    </div>
                    {comp.subtitle && (
                      <p className="text-[10px] text-[#A5A5B2] truncate max-w-[180px]">{comp.subtitle}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEditComponent(comp)}
                      className="p-1 text-[#A5A5B2] hover:text-white hover:bg-[#242430] rounded"
                      title="Edit component title"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <input
                      type="checkbox"
                      checked={comp.visible}
                      onChange={() => toggleComponent(comp.id)}
                      className="accent-[#E5222A] cursor-pointer"
                    />
                    <button
                      onClick={() => removeComponent(comp.id)}
                      className="p-1 text-[#A5A5B2] hover:text-[#E5222A] hover:bg-[#242430] rounded"
                      title="Remove component"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Theme & Styling Details */}
          <div className="space-y-2 pt-2 border-t border-[#24242C]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2] flex items-center gap-1">
              <Sliders className="w-3 h-3 text-[#FBBF24]" />
              Palette & Accent
            </span>
            <div className="flex items-center gap-2">
              {[
                { label: 'ARSHX Red', color: '#E5222A' },
                { label: 'Cyan', color: '#06B6D4' },
                { label: 'Emerald', color: '#10B981' },
                { label: 'Amber', color: '#F59E0B' },
                { label: 'Violet', color: '#8B5CF6' },
              ].map(c => (
                <button
                  key={c.color}
                  onClick={() => setAccentColor(c.color)}
                  style={{ backgroundColor: c.color }}
                  className={`w-7 h-7 rounded-full transition-transform ${accentColor === c.color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Stage: Visual Canvas Preview or Code View */}
        <div className="flex-1 flex flex-col bg-[#08080B] overflow-hidden">
          {viewMode === 'visual' ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Device view switcher */}
              <div className="h-10 bg-[#121216] border-b border-[#24242C] px-4 flex items-center justify-between text-xs text-[#A5A5B2]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{screenTitle}</span>
                  <span className="text-[11px] text-[#A5A5B2]">({screenCategory})</span>
                </div>
                <div className="flex items-center gap-1 bg-[#181820] p-1 rounded-md border border-[#262633]">
                  <button
                    onClick={() => setDeviceSize('mobile')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                      deviceSize === 'mobile' ? 'bg-[#24242C] text-white' : 'hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>390px</span>
                  </button>
                  <button
                    onClick={() => setDeviceSize('tablet')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                      deviceSize === 'tablet' ? 'bg-[#24242C] text-white' : 'hover:text-white'
                    }`}
                  >
                    <Tablet className="w-3 h-3" />
                    <span>720px</span>
                  </button>
                  <button
                    onClick={() => setDeviceSize('desktop')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 ${
                      deviceSize === 'desktop' ? 'bg-[#24242C] text-white' : 'hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3 h-3" />
                    <span>100%</span>
                  </button>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                <div
                  className={`transition-all duration-300 shadow-2xl overflow-y-auto bg-[#111114] border border-[#252530] flex flex-col ${
                    deviceSize === 'mobile'
                      ? 'w-full max-w-[380px] min-w-0 h-[700px] max-h-full rounded-[28px] sm:rounded-[36px] border-[6px] sm:border-[8px] border-[#202028]'
                      : deviceSize === 'tablet'
                      ? 'w-[680px] h-[700px] rounded-2xl'
                      : 'w-full h-full rounded-xl'
                  }`}
                >
                  {/* Visual Screen Simulation */}
                  <div className="p-5 space-y-4 flex-1">
                    {components.find(c => c.type === 'header' && c.visible) && (
                      <div className="flex items-center justify-between pb-2 border-b border-[#202028]">
                        <div>
                          <h3 className="text-lg sm:text-xl font-black text-white break-words">{screenTitle}</h3>
                          <p className="text-[11px] text-[#A5A5B2]">{screenCategory}</p>
                        </div>
                        <div
                          style={{ backgroundColor: accentColor }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                        >
                          A
                        </div>
                      </div>
                    )}

                    {components.find(c => c.type === 'metric' && c.visible) && (
                      <div className="bg-[#1A1A20] border border-[#272733] rounded-2xl p-5 space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2]">
                          {components.find(c => c.type === 'metric')?.title}
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums break-words">
                          {components.find(c => c.type === 'metric')?.subtitle || '$4,850.00'}
                        </div>
                        <div className="text-xs text-[#22C55E] font-semibold flex items-center gap-1">
                          <span>↓ 12% vs prior cycle · Nominal</span>
                        </div>
                      </div>
                    )}

                    {components.find(c => c.type === 'chart' && c.visible) && (
                      <div className="bg-[#1A1A20] border border-[#272733] rounded-2xl p-5 space-y-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2]">
                          {components.find(c => c.type === 'chart')?.title}
                        </span>
                        <div className="h-24 flex items-end justify-between gap-2 pt-2">
                          {[40, 75, 55, 90, 60, 85, 95].map((val, idx) => (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                style={{
                                  height: `${val}%`,
                                  backgroundColor: idx === 6 ? accentColor : '#282834'
                                }}
                                className="w-full max-w-[24px] rounded-md transition-all"
                              />
                              <span className="text-[9px] text-[#A5A5B2] font-mono">
                                {['M','T','W','T','F','S','S'][idx]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {components.find(c => c.type === 'actions' && c.visible) && (
                      <div className="flex gap-2.5">
                        <button
                          style={{ backgroundColor: accentColor }}
                          className="flex-1 py-3 text-white text-xs font-bold rounded-xl shadow-md transition-transform active:scale-95"
                        >
                          Execute Task
                        </button>
                        <button className="flex-1 py-3 bg-[#24242C] text-white border border-[#34343E] text-xs font-semibold rounded-xl">
                          Configure
                        </button>
                      </div>
                    )}

                    {components.find(c => c.type === 'list' && c.visible) && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A5A5B2]">
                          {components.find(c => c.type === 'list')?.title}
                        </span>
                        {[
                          { title: 'System Engine Sync', cat: 'Core · Verified', amt: '100%' },
                          { title: 'Gradle Build Cache', cat: 'Android SDK 35 · Clean', amt: 'Active' },
                          { title: 'Compose BOM Registry', cat: '2025.02.00 · Linked', amt: 'Ready' },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-[#181820] border border-[#24242E] rounded-xl p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-[#24242C] flex items-center justify-center text-xs font-mono font-bold text-white">
                                {idx + 1}
                              </div>
                              <div>
                                <h6 className="text-xs font-bold text-white">{item.title}</h6>
                                <p className="text-[10px] text-[#A5A5B2]">{item.cat}</p>
                              </div>
                            </div>
                            <span className="text-xs font-bold font-mono text-white">
                              {item.amt}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {components.find(c => c.type === 'bottom_nav' && c.visible) && (
                    <div className="h-14 bg-[#141418] border-t border-[#202028] flex items-center justify-around text-[10px] text-[#A5A5B2] shrink-0">
                      <div style={{ color: accentColor }} className="flex flex-col items-center gap-0.5 font-bold">
                        <span>⊞</span>
                        <span>Home</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span>📈</span>
                        <span>Stats</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span>💳</span>
                        <span>Cards</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span>👤</span>
                        <span>Profile</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Code View Mode */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="h-10 bg-[#121216] border-b border-[#24242C] px-4 flex items-center justify-between text-xs text-[#A5A5B2]">
                <span className="font-mono text-white">Generated Kotlin Jetpack Compose (Target SDK 35)</span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1 bg-[#1A1A22] hover:bg-[#252530] text-white text-xs font-medium rounded-md border border-[#2D2D3A] flex items-center gap-1.5 transition-colors"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="flex-1 p-4 font-mono text-xs text-[#E2E8F0] overflow-auto select-text leading-relaxed">
                {generatedComposeCode}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Edit Component Modal */}
      {editingComponentId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#1A1A20] border border-[#34343E] rounded-xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Edit Component Layer</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#A5A5B2] block mb-1">Title</label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
                />
              </div>
              <div>
                <label className="text-xs text-[#A5A5B2] block mb-1">Subtitle / Value</label>
                <input
                  type="text"
                  value={editingSubtitle}
                  onChange={(e) => setEditingSubtitle(e.target.value)}
                  className="w-full bg-[#111114] border border-[#2E2E38] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E5222A]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingComponentId(null)}
                className="px-3 py-1.5 text-xs text-[#A5A5B2] hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveEditComponent}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#E5222A] hover:bg-[#d01c24] rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

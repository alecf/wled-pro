import { useState, useCallback, useMemo } from "react";
import { ScreenContainer } from "@/components/layout";
import { PageHeader } from "@/components/common/PageHeader";
import { useSafeAreaInsets } from "@/hooks/useSafeAreaInsets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, Copy, Info, Wand2 } from "lucide-react";
import { useWledWebSocket } from "@/hooks/useWledWebSocket";
import { usePresets, useSavePreset, useNextPresetId } from "@/hooks/usePresets";
import { useEffects } from "@/hooks/useEffects";
import { useWledPalettesWithColors } from "@/hooks/useWled";
import { useSegmentDefinitions } from "@/hooks/useSegmentDefinitions";
import { SegmentList } from "./SegmentList";
import { SegmentEditorScreen } from "./SegmentEditorScreen";
import { SplitSegmentDialog } from "@/components/common";
import {
  mergeSegments,
  mergeGapUp,
  mergeGapDown,
  convertGapToSegment,
  repairSegments,
} from "@/lib/segmentUtils";
import type { Segment } from "@/types/wled";
import { hasOneBigSegment, globalSegmentsToWledSegments } from "@/lib/lightshow";
import type { WledState } from "@/types/wled";

export type EditorMode = "current" | "preset";

type EditorView = "list" | "edit-segment";

interface LightShowEditorScreenProps {
  baseUrl: string;
  controllerId: string;
  mode: EditorMode;
  presetId?: number;
  onClose: () => void;
}

function cloneSegments(segments: Segment[]): Segment[] {
  return segments.map((seg) => ({
    ...seg,
    col: seg.col?.map((c) => [...c] as [number, number, number]),
  }));
}

function segmentsEqual(a: Segment[], b: Segment[]): boolean {
  if (a.length !== b.length) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

interface EditorState {
  initialSegments: Segment[];
  initialOn: boolean;
  initialBri: number;
  localSegments: Segment[];
  initialized: boolean;
}

export function LightShowEditorScreen({
  baseUrl,
  controllerId,
  mode,
  presetId,
  onClose,
}: LightShowEditorScreenProps) {
  const { state, info, queueUpdate } = useWledWebSocket(baseUrl);
  const { presets } = usePresets(baseUrl);
  const { effects } = useEffects(baseUrl);
  const { data: palettes } = useWledPalettesWithColors(baseUrl);
  const savePreset = useSavePreset(baseUrl);
  const nextPresetId = useNextPresetId(baseUrl);
  const { segments: globalSegments } = useSegmentDefinitions(controllerId);
  const insets = useSafeAreaInsets();

  // Navigation state
  const [view, setView] = useState<EditorView>("list");
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(
    null,
  );
  const [showSplitDialog, setShowSplitDialog] = useState(false);

  const [editorState, setEditorState] = useState<EditorState>(() => ({
    initialSegments: [],
    initialOn: true,
    initialBri: 128,
    localSegments: [],
    initialized: false,
  }));

  const [isLivePreview, setIsLivePreview] = useState(mode === "current");

  const existingPreset =
    presetId !== undefined ? presets.find((p) => p.id === presetId) : null;
  const [presetName, setPresetName] = useState(existingPreset?.n ?? "");

  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");

  const maxLedCount = info?.leds.count ?? 150;

  // Initialize from device state
  if (state && !editorState.initialized) {
    const cloned = cloneSegments(state.seg);
    setEditorState({
      initialSegments: cloned,
      initialOn: state.on,
      initialBri: state.bri,
      localSegments: cloneSegments(state.seg),
      initialized: true,
    });
  }

  const segments = useMemo(
    () => (editorState.initialized ? editorState.localSegments : []),
    [editorState.initialized, editorState.localSegments],
  );

  const effectNames = useMemo(() => {
    const map = new Map<number, string>();
    effects?.forEach((e) => map.set(e.id, e.name));
    return map;
  }, [effects]);

  const applyToDevice = useCallback(
    (segs: Segment[]) => {
      const segUpdates = segs.map((seg) => ({
        id: seg.id,
        start: seg.start,
        stop: seg.stop,
        fx: seg.fx,
        sx: seg.sx,
        ix: seg.ix,
        pal: seg.pal,
        col: seg.col,
        bri: seg.bri,
        c1: seg.c1,
        c2: seg.c2,
        c3: seg.c3,
      }));
      queueUpdate({ seg: segUpdates });
    },
    [queueUpdate],
  );

  const revertToInitial = useCallback(() => {
    if (!editorState.initialized) return;
    const segUpdates = editorState.initialSegments.map((seg) => ({
      id: seg.id,
      start: seg.start,
      stop: seg.stop,
      fx: seg.fx,
      sx: seg.sx,
      ix: seg.ix,
      pal: seg.pal,
      col: seg.col,
      bri: seg.bri,
      c1: seg.c1,
      c2: seg.c2,
      c3: seg.c3,
    }));
    queueUpdate({
      on: editorState.initialOn,
      bri: editorState.initialBri,
      seg: segUpdates,
    });
  }, [editorState, queueUpdate]);

  const handleLivePreviewChange = (enabled: boolean) => {
    if (enabled) {
      applyToDevice(editorState.localSegments);
    } else {
      revertToInitial();
    }
    setIsLivePreview(enabled);
  };

  // Update a segment locally (and optionally push to device)
  const updateSegment = useCallback(
    (segmentId: number, updates: Partial<Segment>) => {
      setEditorState((prev) => {
        const newSegments = prev.localSegments.map((seg) =>
          seg.id === segmentId ? { ...seg, ...updates } : seg,
        );

        if (isLivePreview) {
          applyToDevice(newSegments);
        }

        return { ...prev, localSegments: newSegments };
      });
    },
    [isLivePreview, applyToDevice],
  );

  // Handle splitting a segment
  const handleConfirmSplit = useCallback(
    (splitPoint: number) => {
      if (selectedSegmentId === null) return;

      setEditorState((prev) => {
        // Get fresh segment from current state
        const segment = prev.localSegments.find(
          (s) => s.id === selectedSegmentId,
        );
        if (!segment) return prev;

        // Find available ID (0-9 only, WLED supports max 10 segments)
        const usedIds = new Set(prev.localSegments.map((s) => s.id));
        let newId = 0;
        for (let i = 0; i <= 9; i++) {
          if (!usedIds.has(i)) {
            newId = i;
            break;
          }
        }

        const newSegments = [
          ...prev.localSegments.map((seg) =>
            seg.id === segment.id ? { ...seg, stop: splitPoint } : seg,
          ),
          {
            ...segment,
            id: newId,
            start: splitPoint,
            stop: segment.stop,
          },
        ].sort((a, b) => a.start - b.start);

        if (isLivePreview) {
          applyToDevice(newSegments);
        }

        return { ...prev, localSegments: newSegments };
      });

      setShowSplitDialog(false);
      setSelectedSegmentId(null);
    },
    [selectedSegmentId, isLivePreview, applyToDevice],
  );

  const handleMergeSegments = (keepId: number, removeId: number) => {
    setEditorState((prev) => {
      const newSegments = mergeSegments(prev.localSegments, keepId, removeId);

      if (isLivePreview) {
        const keepSegment = newSegments.find((s) => s.id === keepId);
        if (keepSegment) {
          queueUpdate({
            seg: [
              { id: keepId, start: keepSegment.start, stop: keepSegment.stop },
              { id: removeId, stop: 0 },
            ],
          });
        }
      }

      return { ...prev, localSegments: newSegments };
    });
  };

  const handleMergeGapUp = (gapStart: number, gapStop: number) => {
    setEditorState((prev) => {
      const newSegments = mergeGapUp(prev.localSegments, gapStart, gapStop);

      if (isLivePreview) {
        const segmentAbove = newSegments.find((s) => s.stop === gapStop);
        if (segmentAbove) {
          applyToDevice(newSegments);
        }
      }

      return { ...prev, localSegments: newSegments };
    });
  };

  const handleMergeGapDown = (gapStart: number, gapStop: number) => {
    setEditorState((prev) => {
      const newSegments = mergeGapDown(prev.localSegments, gapStart, gapStop);

      if (isLivePreview) {
        const segmentBelow = newSegments.find((s) => s.start === gapStart);
        if (segmentBelow) {
          applyToDevice(newSegments);
        }
      }

      return { ...prev, localSegments: newSegments };
    });
  };

  const handleConvertGapToSegment = (gapStart: number, gapStop: number) => {
    setEditorState((prev) => {
      const newSegments = convertGapToSegment(prev.localSegments, gapStart, gapStop);

      if (isLivePreview) {
        applyToDevice(newSegments);
      }

      return { ...prev, localSegments: newSegments };
    });
  };

  const handleApplyGlobalSegments = () => {
    if (globalSegments.length === 0) return;

    setEditorState((prev) => {
      // Create a temporary state object to pass to the conversion function
      const tempState: WledState = {
        on: prev.initialOn,
        bri: prev.initialBri,
        transition: 0,
        ps: 0,
        pl: 0,
        nl: { on: false, dur: 0, mode: 0, tbri: 0, rem: 0 },
        udpn: { send: false, recv: false, sgrp: 0, rgrp: 0 },
        lor: 0,
        mainseg: 0,
        seg: prev.localSegments,
      };

      // Convert global segments to WLED segments, preserving current effect/color
      const wledSegments = globalSegmentsToWledSegments(globalSegments, tempState);

      // Convert to full Segment objects with all properties
      const newSegments: Segment[] = wledSegments.map((seg, index) => ({
        id: seg.id ?? index,
        start: seg.start ?? 0,
        stop: seg.stop ?? 0,
        len: (seg.stop ?? 0) - (seg.start ?? 0),
        grp: 1,
        spc: 0,
        of: 0,
        on: seg.on ?? true,
        frz: false,
        bri: seg.bri ?? 255,
        cct: 0,
        col: seg.col ?? [[255, 160, 0]],
        fx: seg.fx ?? 0,
        sx: seg.sx ?? 128,
        ix: seg.ix ?? 128,
        pal: seg.pal ?? 0,
        c1: seg.c1 ?? 0,
        c2: seg.c2 ?? 0,
        c3: seg.c3 ?? 0,
        sel: false,
        rev: false,
        mi: false,
        n: seg.n,
      }));

      if (isLivePreview) {
        applyToDevice(newSegments);
      }

      return { ...prev, localSegments: newSegments };
    });
  };

  // Just close without reverting - for back button in current mode
  const handleClose = () => {
    onClose();
  };

  // Revert changes and close - for Cancel button
  const handleCancel = () => {
    if (isLivePreview && editorState.initialized) {
      const hasChanges = !segmentsEqual(
        editorState.localSegments,
        editorState.initialSegments,
      );
      if (hasChanges) {
        revertToInitial();
      }
    }
    onClose();
  };

  const handleSave = async () => {
    if (mode !== "preset" || presetId === undefined) return;
    if (!presetName.trim()) return;
    if (!info) return;

    // Repair segments before saving (fix overlaps, truncate out-of-bounds, remove invalid)
    const repairedSegments = repairSegments(editorState.localSegments, info.leds.count);

    // Update local state with repaired segments
    setEditorState((prev) => ({ ...prev, localSegments: repairedSegments }));

    // Apply to device
    if (!isLivePreview) {
      applyToDevice(repairedSegments);
    }

    await savePreset.mutateAsync({
      id: presetId,
      name: presetName.trim(),
    });

    onClose();
  };

  const handleSaveAs = async () => {
    if (!saveAsName.trim()) return;
    if (!info) return;

    const targetId = nextPresetId ?? 1;

    // Repair segments before saving (fix overlaps, truncate out-of-bounds, remove invalid)
    const repairedSegments = repairSegments(editorState.localSegments, info.leds.count);

    // Update local state with repaired segments
    setEditorState((prev) => ({ ...prev, localSegments: repairedSegments }));

    // Apply to device
    if (!isLivePreview) {
      applyToDevice(repairedSegments);
    }

    await savePreset.mutateAsync({
      id: targetId,
      name: saveAsName.trim(),
    });

    setShowSaveAs(false);
    onClose();
  };

  const getTitle = () => {
    if (mode === "current") return "Current State";
    return existingPreset?.n || "Edit Light Show";
  };

  // Check if we should show the "Apply Global Segments" button
  const showApplyGlobalSegments =
    globalSegments.length > 0 &&
    segments.length === 1 &&
    info &&
    hasOneBigSegment({ seg: segments } as WledState, info.leds.count);

  // Find the selected segment and its index for sub-screens
  const sortedSegments = [...segments].sort((a, b) => a.start - b.start);
  const selectedSegment =
    selectedSegmentId !== null
      ? segments.find((s) => s.id === selectedSegmentId)
      : null;
  const selectedSegmentIndex = selectedSegment
    ? sortedSegments.findIndex((s) => s.id === selectedSegmentId)
    : -1;

  // Loading state
  if (!editorState.initialized || segments.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <PageHeader title="Loading..." onBack={onClose} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  // Segment editor view
  if (view === "edit-segment" && selectedSegment && effects) {
    return (
      <SegmentEditorScreen
        segment={selectedSegment}
        segmentIndex={selectedSegmentIndex}
        effects={effects}
        palettes={palettes ?? []}
        onUpdate={(updates) => updateSegment(selectedSegment.id, updates)}
        onBack={() => {
          setView("list");
          setSelectedSegmentId(null);
        }}
      />
    );
  }

  // Main list view
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageHeader title={getTitle()} onBack={handleClose} />

      <ScreenContainer className="p-4 space-y-4">
        {mode === "current" ? (
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border-l-4 border-blue-500">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Editing the current running state. All changes are applied
              immediately.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-muted/50">
            <Label htmlFor="live-preview" className="text-sm font-medium">
              Live Preview
            </Label>
            <Switch
              id="live-preview"
              checked={isLivePreview}
              onCheckedChange={handleLivePreviewChange}
            />
          </div>
        )}

        {mode === "preset" && (
          <div className="space-y-2">
            <Label htmlFor="preset-name">Name</Label>
            <Input
              id="preset-name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Light Show"
            />
          </div>
        )}

        {showApplyGlobalSegments && (
          <div className="space-y-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Apply Your Saved Layout</h3>
              <p className="text-xs text-muted-foreground">
                Split this single segment into {globalSegments.length} segments based on your
                saved global segment layout
              </p>
            </div>
            <Button
              variant="default"
              className="w-full"
              onClick={handleApplyGlobalSegments}
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Apply Global Segments
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Segments</Label>
          <SegmentList
            segments={segments}
            effectNames={effectNames}
            effects={effects}
            palettes={palettes ?? []}
            globalSegments={globalSegments}
            maxLedCount={maxLedCount}
            onSelectSegment={(id) => {
              setSelectedSegmentId(id);
              setView("edit-segment");
            }}
            onSplitSegment={(id) => {
              setSelectedSegmentId(id);
              setShowSplitDialog(true);
            }}
            onMergeSegments={handleMergeSegments}
            onMergeGapUp={handleMergeGapUp}
            onMergeGapDown={handleMergeGapDown}
            onConvertGapToSegment={handleConvertGapToSegment}
          />
        </div>
      </ScreenContainer>

      {/* Footer */}
      <footer
        className="sticky bottom-0 border-t bg-background p-4"
        style={{ paddingBottom: `calc(1rem + ${insets.bottom})` }}
      >
        {mode === "current" ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSaveAsName("");
                setShowSaveAs(true);
              }}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Save As
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!presetName.trim() || savePreset.isPending}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSaveAsName(presetName ? `${presetName} Copy` : "");
                setShowSaveAs(true);
              }}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Save As
            </Button>
          </div>
        )}
      </footer>

      {/* Split Segment Dialog */}
      <SplitSegmentDialog
        open={showSplitDialog}
        segment={
          selectedSegment
            ? {
                start: selectedSegment.start,
                stop: selectedSegment.stop,
                n: selectedSegment.n,
              }
            : null
        }
        segmentIndex={selectedSegmentIndex}
        controllerId={controllerId}
        onSplit={handleConfirmSplit}
        onCancel={() => {
          setShowSplitDialog(false);
          setSelectedSegmentId(null);
        }}
      />

      {/* Save As Dialog */}
      {showSaveAs && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-background w-full sm:w-96 sm:rounded-lg sm:mx-4 space-y-4 p-6">
            <h3 className="text-lg font-semibold">Save As New Light Show</h3>
            <div className="space-y-2">
              <Label htmlFor="save-as-name">Name</Label>
              <Input
                id="save-as-name"
                value={saveAsName}
                onChange={(e) => setSaveAsName(e.target.value)}
                placeholder="New Light Show"
                autoFocus
                className="h-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-10"
                onClick={() => setShowSaveAs(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 h-10"
                onClick={handleSaveAs}
                disabled={!saveAsName.trim() || savePreset.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


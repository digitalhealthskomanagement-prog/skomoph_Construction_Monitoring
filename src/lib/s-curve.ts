// Pure S-Curve calculator: Plan vs Actual weekly progress

export type Phase = {
  id: string;
  category?: string | null;
  weight?: number | null;
  progress: number;
};

export type CalEvent = {
  id: string;
  phase_id: string | null;
  start_date: string;
  end_date: string;
};

export type UpdateSnap = {
  created_at: string;
  progress_snapshot: number | null;
};

export type SCurvePoint = {
  weekIso: string; // yyyy-mm-dd (Monday)
  weekTs: number;
  plan: number;
  actual: number | null;
};

function toDate(s: string): Date {
  return new Date(s + "T00:00:00Z");
}

function mondayOf(d: Date): Date {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = nd.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // to Monday
  nd.setUTCDate(nd.getUTCDate() - diff);
  return nd;
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Compute per-phase % done on `atTs` given its calendar-derived start/end.
 * Linear ramp between start (0%) and end (100%).
 */
function phasePctPlanAt(atTs: number, startTs: number, endTs: number): number {
  if (endTs <= startTs) return atTs >= startTs ? 100 : 0;
  if (atTs <= startTs) return 0;
  if (atTs >= endTs) return 100;
  return ((atTs - startTs) / (endTs - startTs)) * 100;
}

export function buildSCurve(
  phases: Phase[],
  events: CalEvent[],
  updates: UpdateSnap[],
  overallCurrent: number,
  opts?: { from?: Date; to?: Date },
): { points: SCurvePoint[]; today: { plan: number; actual: number; delta: number } } {
  // Phase → date range from calendar events
  const rangeByPhase = new Map<string, { start: number; end: number }>();
  for (const e of events) {
    if (!e.phase_id) continue;
    const s = toDate(e.start_date).getTime();
    const en = toDate(e.end_date).getTime();
    const cur = rangeByPhase.get(e.phase_id);
    if (!cur) rangeByPhase.set(e.phase_id, { start: s, end: en });
    else {
      cur.start = Math.min(cur.start, s);
      cur.end = Math.max(cur.end, en);
    }
  }

  const prep = phases.filter((p) => p.category === "preparation");
  const cons = phases.filter((p) => p.category !== "preparation");
  const prepShare = prep.length ? 50 / prep.length : 0; // each phase contributes evenly to 50%
  const consWeightTotal = cons.reduce((s, p) => s + Number(p.weight ?? 0), 0);

  // Bounds
  const allStarts: number[] = [];
  const allEnds: number[] = [];
  for (const r of rangeByPhase.values()) {
    allStarts.push(r.start);
    allEnds.push(r.end);
  }
  const from = opts?.from ?? (allStarts.length ? new Date(Math.min(...allStarts)) : new Date());
  const to = opts?.to ?? (allEnds.length ? new Date(Math.max(...allEnds)) : new Date());

  const startMon = mondayOf(from);
  const endMon = mondayOf(to);

  function planAt(ts: number): number {
    let total = 0;
    for (const p of prep) {
      const r = rangeByPhase.get(p.id);
      if (!r) continue;
      total += (phasePctPlanAt(ts, r.start, r.end) / 100) * prepShare;
    }
    if (consWeightTotal > 0) {
      for (const p of cons) {
        const r = rangeByPhase.get(p.id);
        if (!r) continue;
        const share = (Number(p.weight ?? 0) / consWeightTotal) * 50;
        total += (phasePctPlanAt(ts, r.start, r.end) / 100) * share;
      }
    }
    return Math.max(0, Math.min(100, total));
  }

  // Actual: step function from updates.progress_snapshot; anchor end at overallCurrent.
  const snaps = updates
    .filter((u) => u.progress_snapshot != null)
    .map((u) => ({ ts: new Date(u.created_at).getTime(), v: Number(u.progress_snapshot) }))
    .sort((a, b) => a.ts - b.ts);

  function actualAt(ts: number, nowTs: number): number | null {
    if (ts > nowTs) return null;
    let v = 0;
    for (const s of snaps) {
      if (s.ts <= ts) v = s.v;
      else break;
    }
    // Anchor: if this is the last past week, use overallCurrent
    return v;
  }

  const points: SCurvePoint[] = [];
  const nowTs = Date.now();
  const WEEK = 7 * 24 * 3600 * 1000;
  for (let t = startMon.getTime(); t <= endMon.getTime(); t += WEEK) {
    const plan = planAt(t);
    const actual = actualAt(t, nowTs);
    points.push({
      weekIso: iso(new Date(t)),
      weekTs: t,
      plan: Math.round(plan * 10) / 10,
      actual: actual == null ? null : Math.round(actual * 10) / 10,
    });
  }

  // Overwrite last past week actual with overallCurrent for freshness
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].weekTs <= nowTs) {
      points[i].actual = Math.round(overallCurrent * 10) / 10;
      break;
    }
  }

  const todayPlan = planAt(nowTs);
  const todayActual = overallCurrent;
  return {
    points,
    today: {
      plan: Math.round(todayPlan * 10) / 10,
      actual: Math.round(todayActual * 10) / 10,
      delta: Math.round((todayActual - todayPlan) * 10) / 10,
    },
  };
}

/**
 * Phase-level plan % at now — for status dot in phase list.
 */
export function planPctForPhaseNow(phaseId: string, events: CalEvent[]): number | null {
  let start = Infinity;
  let end = -Infinity;
  for (const e of events) {
    if (e.phase_id !== phaseId) continue;
    start = Math.min(start, toDate(e.start_date).getTime());
    end = Math.max(end, toDate(e.end_date).getTime());
  }
  if (!isFinite(start) || !isFinite(end)) return null;
  return phasePctPlanAt(Date.now(), start, end);
}

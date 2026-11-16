import { AssessmentCategory, AssessmentWeights, DetailScore, MateriItem, PredicateRule } from '../types';

export interface CategoryCalculationResult {
  totalObtained: number;
  totalMax: number;
  score100: number | null; // null if no items scored or incomplete
  ratedCount: number;
  totalCount: number;
  isComplete: boolean;
}

export interface FullCalculationResult {
  categoryResults: Record<AssessmentCategory, CategoryCalculationResult>;
  nilaiDoa: number | null;
  nilaiHadist: number | null;
  nilaiWudhu: number | null;
  nilaiTayamum: number | null;
  nilaiSholat: number | null;
  nilaiAkhir: number | null;
  predikat: string | null;
  status: 'Selesai' | 'Belum Lengkap' | 'Belum Dimulai';
  isTuntas: boolean | null;
  allCategoriesComplete: boolean;
  totalRatedItems: number;
  totalMateriItems: number;
  completionPercentage: number;
}

/**
 * Calculates score for a single category based on active materi items and scores
 */
export function calculateCategoryScore(
  category: AssessmentCategory,
  materiList: MateriItem[],
  scores: Record<string, DetailScore>
): CategoryCalculationResult {
  const activeMateri = materiList.filter((m) => m.kategori === category && m.status === 'Aktif');
  const totalCount = activeMateri.length;
  if (totalCount === 0) {
    return {
      totalObtained: 0,
      totalMax: 0,
      score100: null,
      ratedCount: 0,
      totalCount: 0,
      isComplete: true,
    };
  }

  let totalObtained = 0;
  let ratedCount = 0;

  activeMateri.forEach((m) => {
    const detail = scores[m.id];
    if (detail && typeof detail.skor === 'number' && detail.skor >= 1 && detail.skor <= 4) {
      totalObtained += detail.skor;
      ratedCount++;
    }
  });

  const totalMax = totalCount * 4;
  const isComplete = ratedCount === totalCount;
  
  // Only calculate percentage score if at least one item was scored
  // Incomplete category will still show its partial score for the teacher's insight, but final computation checks isComplete
  const score100 = ratedCount > 0 ? Number(((totalObtained / (ratedCount * 4)) * 100).toFixed(2)) : null;

  return {
    totalObtained,
    totalMax,
    score100,
    ratedCount,
    totalCount,
    isComplete,
  };
}

/**
 * Determines predicate based on final score and configured predicate rules
 */
export function getPredicate(score: number | null, predicates: PredicateRule[]): string {
  if (score === null || isNaN(score)) return 'Belum Lengkap';
  const sorted = [...predicates].sort((a, b) => b.minScore - a.minScore);
  for (const rule of sorted) {
    if (score >= rule.minScore) {
      return rule.label;
    }
  }
  return 'Maqbul';
}

/**
 * Calculates complete assessment score across all 5 categories
 */
export function calculateFullAssessment(
  materiList: MateriItem[],
  scores: Record<string, DetailScore>,
  weights: AssessmentWeights,
  predicates: PredicateRule[],
  kkm: number = 75
): FullCalculationResult {
  const categories: AssessmentCategory[] = ['doa', 'hadist', 'wudhu', 'tayamum', 'sholat'];
  
  const categoryResults: Record<AssessmentCategory, CategoryCalculationResult> = {
    doa: calculateCategoryScore('doa', materiList, scores),
    hadist: calculateCategoryScore('hadist', materiList, scores),
    wudhu: calculateCategoryScore('wudhu', materiList, scores),
    tayamum: calculateCategoryScore('tayamum', materiList, scores),
    sholat: calculateCategoryScore('sholat', materiList, scores),
  };

  const activeMateri = materiList.filter((m) => m.status === 'Aktif');
  const totalMateriItems = activeMateri.length;
  
  let totalRatedItems = 0;
  let allCategoriesComplete = true;

  categories.forEach((cat) => {
    const res = categoryResults[cat];
    totalRatedItems += res.ratedCount;
    if (!res.isComplete) {
      allCategoriesComplete = false;
    }
  });

  const completionPercentage = totalMateriItems > 0 
    ? Math.round((totalRatedItems / totalMateriItems) * 100) 
    : 0;

  const nilaiDoa = categoryResults.doa.score100;
  const nilaiHadist = categoryResults.hadist.score100;
  const nilaiWudhu = categoryResults.wudhu.score100;
  const nilaiTayamum = categoryResults.tayamum.score100;
  const nilaiSholat = categoryResults.sholat.score100;

  let nilaiAkhir: number | null = null;
  let predikat: string | null = null;
  let isTuntas: boolean | null = null;
  let status: 'Selesai' | 'Belum Lengkap' | 'Belum Dimulai';

  if (totalRatedItems === 0) {
    status = 'Belum Dimulai';
  } else if (!allCategoriesComplete) {
    status = 'Belum Lengkap';
    // STRICT RULE: Do not compute final score as 0 or incomplete average. Keep it null as required!
    nilaiAkhir = null;
    predikat = 'Belum Lengkap';
    isTuntas = null;
  } else {
    // All 5 categories are completely rated!
    status = 'Selesai';
    const doaPart = (nilaiDoa || 0) * (weights.doa / 100);
    const hadistPart = (nilaiHadist || 0) * (weights.hadist / 100);
    const wudhuPart = (nilaiWudhu || 0) * (weights.wudhu / 100);
    const tayamumPart = (nilaiTayamum || 0) * (weights.tayamum / 100);
    const sholatPart = (nilaiSholat || 0) * (weights.sholat / 100);
    
    nilaiAkhir = Number((doaPart + hadistPart + wudhuPart + tayamumPart + sholatPart).toFixed(2));
    predikat = getPredicate(nilaiAkhir, predicates);
    isTuntas = nilaiAkhir >= kkm;
  }

  return {
    categoryResults,
    nilaiDoa,
    nilaiHadist,
    nilaiWudhu,
    nilaiTayamum,
    nilaiSholat,
    nilaiAkhir,
    predikat,
    status,
    isTuntas,
    allCategoriesComplete,
    totalRatedItems,
    totalMateriItems,
    completionPercentage,
  };
}

/**
 * Format score to 2 decimal places or dash if null
 */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || isNaN(score)) return '-';
  return Number(score).toFixed(2);
}

/**
 * Utility functions for animal metrics and health indications.
 */

export interface ControlMetric {
    date: string;
    weight?: number;
    height?: number;
}

/**
 * Calculates BMI (Indice de Masa Corporal) for an animal.
 * Formula: weight (kg) / (height (m) ^ 2)
 */
export const calculateBMI = (weight?: number, height?: number): number | null => {
    if (!weight || !height || height <= 0) return null;
    return parseFloat((weight / (height * height)).toFixed(2));
};

/**
 * Analyzes growth trends and returns alerts.
 */
export const analyzeGrowthTrends = (controls: ControlMetric[]) => {
    if (controls.length < 2) return [];

    const alerts: string[] = [];
    const sorted = [...controls].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const latest = sorted[sorted.length - 1];
    const previous = sorted[sorted.length - 2];

    // Weight loss alert
    if (latest.weight && previous.weight && latest.weight < previous.weight) {
        const diff = previous.weight - latest.weight;
        alerts.push(`Pérdida de peso detectada: -${diff.toFixed(1)} kg desde el último control.`);
    }

    // BMI Check (Generic ranges for cattle, can be adjusted)
    const bmi = calculateBMI(latest.weight, latest.height);
    if (bmi) {
        if (bmi < 15) alerts.push(`IMC Bajo (${bmi}): El animal podría estar desnutrido.`);
        if (bmi > 35) alerts.push(`IMC Alto (${bmi}): Posible sobrepeso detectado.`);
    }

    return alerts;
};

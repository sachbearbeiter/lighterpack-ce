// Weight is stored internally as milligrams (integer).
// This matches the original lighterpack behaviour exactly — bit-identical results.

export type WeightUnit = 'oz' | 'g' | 'kg' | 'lb';

const MG_PER: Record<WeightUnit, number> = {
	g: 1_000,
	kg: 1_000_000,
	oz: 28_349.5,
	lb: 453_592
};

/** Convert a value in the given unit to milligrams. */
export function weightToMg(value: number, unit: WeightUnit): number {
	return value * MG_PER[unit];
}

/** Convert milligrams to the given unit, rounded to 2 decimal places. */
export function mgToWeight(mg: number, unit: WeightUnit): number {
	return Math.round((100 * mg) / MG_PER[unit]) / 100;
}

/** Format milligrams as a human-readable string, e.g. "2 lbs 3.5 oz". */
export function mgToDisplay(mg: number, unit: WeightUnit): string {
	if (unit === 'lb') {
		const poundsFloat = mg / MG_PER.lb;
		const pounds = Math.floor(poundsFloat);
		const oz = Math.round(((poundsFloat % 1) * 16 * 100)) / 100;
		const parts: string[] = [];
		if (pounds) parts.push(`${pounds} lb${pounds > 1 ? 's' : ''}`);
		if (oz || !pounds) parts.push(`${oz} oz`);
		return parts.join(' ');
	}
	return `${mgToWeight(mg, unit)} ${unit}`;
}

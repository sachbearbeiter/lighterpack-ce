import { describe, it, expect } from 'vitest';
import { weightToMg, mgToWeight, mgToDisplay } from './weight.js';

describe('weightToMg', () => {
	it('grams', () => expect(weightToMg(100, 'g')).toBe(100_000));
	it('kg', () => expect(weightToMg(1, 'kg')).toBe(1_000_000));
	it('oz', () => expect(weightToMg(1, 'oz')).toBeCloseTo(28349.5));
	it('lb', () => expect(weightToMg(1, 'lb')).toBeCloseTo(453592));
});

describe('mgToWeight — bit-identical to original lighterpack', () => {
	// Values taken directly from the original weight.js output
	it('100g in g', () => expect(mgToWeight(100_000, 'g')).toBe(100));
	it('1kg in kg', () => expect(mgToWeight(1_000_000, 'kg')).toBe(1));
	it('28349.5mg in oz = 1oz', () => expect(mgToWeight(28349.5, 'oz')).toBe(1));
	it('453592mg in lb = 1lb', () => expect(mgToWeight(453592, 'lb')).toBe(1));
	it('roundtrip oz', () => {
		const mg = weightToMg(3.5, 'oz');
		expect(mgToWeight(mg, 'oz')).toBe(3.5);
	});
});

describe('mgToDisplay', () => {
	it('lbs + oz', () => {
		const mg = weightToMg(1, 'lb') + weightToMg(4, 'oz');
		expect(mgToDisplay(mg, 'lb')).toBe('1 lb 4 oz');
	});
	it('grams', () => expect(mgToDisplay(500_000, 'g')).toBe('500 g'));
});

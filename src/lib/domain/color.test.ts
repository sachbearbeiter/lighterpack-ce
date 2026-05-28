import { describe, it, expect } from 'vitest';
import { getColor, rgbToHsv, hsvToRgb, rgbToHex, hexToRgb, rgbToString } from './color.js';

describe('getColor — palette', () => {
	it('index 0 returns first color', () => {
		expect(getColor(0)).toEqual({ r: 27, g: 119, b: 211 });
	});
	it('wraps around at palette length', () => {
		expect(getColor(0)).toEqual(getColor(11));
	});
});

describe('getColor — with baseColor', () => {
	it('returns a different shade', () => {
		const base = { r: 27, g: 119, b: 211 };
		const shade = getColor(1, base);
		expect(shade).not.toEqual(base);
	});
});

describe('rgbToHex / hexToRgb roundtrip', () => {
	it('roundtrip', () => {
		const rgb = { r: 27, g: 119, b: 211 };
		expect(hexToRgb(rgbToHex(rgb))).toEqual(rgb);
	});
});

describe('rgbToString', () => {
	it('formats correctly', () => {
		expect(rgbToString({ r: 10, g: 20, b: 30 })).toBe('rgb(10,20,30)');
	});
});

describe('HSV roundtrip', () => {
	it('rgb → hsv → rgb stays close', () => {
		const original = { r: 100, g: 150, b: 200 };
		const result = hsvToRgb(rgbToHsv(original));
		expect(result.r).toBeCloseTo(original.r, -1);
		expect(result.g).toBeCloseTo(original.g, -1);
		expect(result.b).toBeCloseTo(original.b, -1);
	});
});

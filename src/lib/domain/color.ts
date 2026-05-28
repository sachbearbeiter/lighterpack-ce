export type Rgb = { r: number; g: number; b: number };
export type Hsv = { h: number; s: number; v: number };

// Default palette — same as original, bit-identical
const PALETTE: Rgb[] = [
	{ r: 27, g: 119, b: 211 },
	{ r: 206, g: 24, b: 54 },
	{ r: 242, g: 208, b: 0 },
	{ r: 122, g: 179, b: 23 },
	{ r: 130, g: 33, b: 198 },
	{ r: 232, g: 110, b: 28 },
	{ r: 220, g: 242, b: 51 },
	{ r: 86, g: 174, b: 226 },
	{ r: 226, g: 86, b: 174 },
	{ r: 226, g: 137, b: 86 },
	{ r: 86, g: 226, b: 207 }
];

export function getColor(index: number, baseColor?: Rgb): Rgb {
	if (baseColor) {
		const hsv = rgbToHsv(baseColor);
		hsv.s -= Math.round((hsv.s / 10) * (index % 10));
		hsv.v += Math.round(((100 - hsv.v) / 10) * (index % 10));
		return hsvToRgb(hsv);
	}
	return PALETTE[index % PALETTE.length];
}

export function hsvToRgb(hsv: Hsv): Rgb {
	const h = hsv.h / 360;
	const s = hsv.s / 100;
	const v = hsv.v / 100;

	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);

	let r = 0, g = 0, b = 0;
	switch (i % 6) {
		case 0: r = v; g = t; b = p; break;
		case 1: r = q; g = v; b = p; break;
		case 2: r = p; g = v; b = t; break;
		case 3: r = p; g = q; b = v; break;
		case 4: r = t; g = p; b = v; break;
		case 5: r = v; g = p; b = q; break;
	}
	return {
		r: Math.floor(r * 255),
		g: Math.floor(g * 255),
		b: Math.floor(b * 255)
	};
}

export function rgbToHsv(rgb: Rgb): Hsv {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;

	const v = Math.max(r, g, b);
	const diff = v - Math.min(r, g, b);
	const diffc = (c: number) => (v - c) / 6 / diff + 0.5;

	if (diff === 0) return { h: 0, s: 0, v: Math.round(v * 100) };

	const s = diff / v;
	const rr = diffc(r);
	const gg = diffc(g);
	const bb = diffc(b);

	let h: number;
	if (r === v) h = bb - gg;
	else if (g === v) h = 1 / 3 + rr - bb;
	else h = 2 / 3 + gg - rr;

	if (h < 0) h += 1;
	else if (h > 1) h -= 1;

	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		v: Math.round(v * 100)
	};
}

export function rgbToString(rgb: Rgb): string {
	return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}

export function stringToRgb(rgbString: string): Rgb {
	const inner = rgbString.substring(4, rgbString.length - 1);
	const [r, g, b] = inner.split(',').map(Number);
	return { r, g, b };
}

export function hexToRgb(hex: string): Rgb | null {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16)
			}
		: null;
}

export function rgbToHex(rgb: Rgb): string {
	const toHex = (c: number) => c.toString(16).padStart(2, '0');
	return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

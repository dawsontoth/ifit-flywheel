import { sum } from '../lib/math';
import { calculateRawSpeed } from './speed';

test('handles zero case', () => {
	const { speed, rotationsPerSecond } = calculateRawSpeed(0, 0);
	expect(speed).toBe(0);
	expect(rotationsPerSecond).toBe(0);
});

test('handles 2mph data', () => {
	const data = require('../../test/data/2mph.json');
	const { speed, rotationsPerSecond } = calculateRawSpeed(
		sum(data),
		data.length,
	);
	expect(speed).toBeCloseTo(2, 1);
	expect(rotationsPerSecond).toBeCloseTo(10.98);
});

test('handles 4mph data', () => {
	const data = require('../../test/data/4mph.json');
	const { speed, rotationsPerSecond } = calculateRawSpeed(
		sum(data),
		data.length,
	);
	expect(speed).toBeCloseTo(4, 1);
	expect(rotationsPerSecond).toBeCloseTo(21.96);
});

test('handles 6mph data', () => {
	const data = require('../../test/data/6mph.json');
	const { speed, rotationsPerSecond } = calculateRawSpeed(
		sum(data),
		data.length,
	);
	expect(speed).toBeCloseTo(6, 1);
	expect(rotationsPerSecond).toBeCloseTo(32.94);
});

test('handles 10mph data', () => {
	const data = require('../../test/data/10mph.json');
	const { speed, rotationsPerSecond } = calculateRawSpeed(
		sum(data),
		data.length,
	);
	expect(speed).toBeCloseTo(10, 1);
	expect(rotationsPerSecond).toBeCloseTo(54.87);
});

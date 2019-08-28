import { calculateRawSpeed } from './speed';

test('handles zero case', () => {
	const { speed, rotationsPerSecond } = calculateRawSpeed(0, 0);
	expect(speed).toBe(0);
	expect(rotationsPerSecond).toBe(0);
});
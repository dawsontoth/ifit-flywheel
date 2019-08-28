import { calculateRawCadence } from './cadence';

test('handles zero case', () => {
	const cadence = calculateRawCadence(0, []);
	expect(cadence).toBe(0);
});
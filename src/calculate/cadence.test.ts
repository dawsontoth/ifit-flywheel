import { sum } from '../lib/math';
import { calculateRawCadence } from './cadence';

test('handles zero case', () => {
	const cadence = calculateRawCadence(0, [], 0.02, 0.26);
	expect(cadence).toBe(0);
});

test('handles 6mph-with-cadence data', () => {
	const data = require('../../test/data/6mph-with-cadence-around-180-to-200.json');
	const cadence = calculateRawCadence(sum(data), data, 0.02, 0.27);
	expect(cadence).toBeCloseTo(187, 0);
});

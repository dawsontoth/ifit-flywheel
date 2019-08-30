import { CADENCE_SAMPLE_PERIOD } from '../constants';
import { sum } from '../lib/math';
import { calculateRawCadence } from './cadence';

test('handles zero case', () => {
	const cadence = calculateRawCadence(0, [], 0.02, 0.26);
	expect(cadence).toBe(0);
});

test('handles 6mph-with-cadence data', () => {
	const passes = require('../../test/data/6mph-with-cadence-around-180-to-200.json');
	checkPasses(passes);
});

test('computes accurate rolling cadence', () => {
	const passes = require('../../test/data/6mph-with-cadence-around-180-to-200.json');
	const rollingPasses: number[] = [];
	passes.forEach(pass => {
		rollingPasses.push(pass);
		if (sum(rollingPasses.slice(1)) > CADENCE_SAMPLE_PERIOD) {
			rollingPasses.shift();
		}
		if (sum(rollingPasses) >= CADENCE_SAMPLE_PERIOD) {
			checkPasses(rollingPasses);
		}
	});
});

function checkPasses(passes) {
	const cadence = calculateRawCadence(sum(passes), passes, 0.02, 0.27);
	expect(cadence).toBeCloseTo(187, -1.5);
}

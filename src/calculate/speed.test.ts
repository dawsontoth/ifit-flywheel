import { SPEED_SAMPLE_PERIOD } from '../constants';
import { sum } from '../lib/math';
import { calculateRawSpeed } from './speed';

test('handles zero case', () => {
	const { speed, rotationsPerSecond } = calculateRawSpeed(0, 0);
	expect(speed).toBe(0);
	expect(rotationsPerSecond).toBe(0);
});

describe.each`
  file            | expected
  ${'2mph.json'}  | ${2}
  ${'4mph.json'}  | ${4}
  ${'6mph.json'}  | ${6}
  ${'10mph.json'} | ${10}
`('handles $file data', ({ file, expected }) => {

	test('aggregates speed accurately with the entire data set', () => {
		const passes = require(`../../test/data/${file}`);
		checkPasses(passes);
	});

	test('computes accurate rolling speeds', () => {
		const passes = require(`../../test/data/${file}`);
		const rollingPasses: number[] = [];
		passes.forEach(pass => {
			rollingPasses.push(pass);
			if (sum(rollingPasses.slice(1)) > SPEED_SAMPLE_PERIOD) {
				rollingPasses.shift();
			}
			if (sum(rollingPasses) >= SPEED_SAMPLE_PERIOD) {
				checkPasses(rollingPasses);
			}
		});
	});

	function checkPasses(passes) {
		const { speed, rotationsPerSecond } = calculateRawSpeed(
			sum(passes),
			passes.length,
		);
		expect(speed).toBeCloseTo(expected, 0.5);
		expect(rotationsPerSecond).toBeCloseTo(expected * 5.49, 0);
	}

});
import { sum } from '../lib/math';
import { calculateRawSpeed } from './speed';

test('handles zero case', () => {
	const { speed, rotationsPerSecond } = calculateRawSpeed(0, 0);
	expect(speed).toBe(0);
	expect(rotationsPerSecond).toBe(0);
});

test.each`
  file       | expected
  ${'2mph.json'}  | ${2}
  ${'4mph.json'}  | ${4}
  ${'6mph.json'}  | ${6}
  ${'10mph.json'} | ${10}
`('handles $file data', ({ file, expected }) => {
	const data = require(`../../test/data/${file}`);
	const { speed, rotationsPerSecond } = calculateRawSpeed(
		sum(data),
		data.length,
	);
	expect(speed).toBeCloseTo(expected, 1);
	expect(rotationsPerSecond).toBeCloseTo(expected * 5.49, 1);
});
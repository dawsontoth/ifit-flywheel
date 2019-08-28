export function ConvertBase(num: number) {
	return {
		from: (baseFrom: number) => ({
			to: (baseTo: number) => {
				if (num < 0) {
					num = 0xFFFFFFFF + num + 1;
				}
				return parseInt(num as any, baseFrom).toString(baseTo);
			},
		}),
	};
}

ConvertBase.bin2dec = (num: number) => ConvertBase(num).from(2).to(10);
ConvertBase.bin2hex = (num: number) => ConvertBase(num).from(2).to(16);
ConvertBase.dec2bin = (num: number) => ConvertBase(num).from(10).to(2);
ConvertBase.dec2hex = (num: number) => ConvertBase(num).from(10).to(16);
ConvertBase.hex2bin = (num: number) => ConvertBase(num).from(16).to(2);
ConvertBase.hex2dec = (num: number) => ConvertBase(num).from(16).to(10);

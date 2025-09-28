#!/usr/bin/env node
// اسکریپت اجرای سرور در حالت production با پشتیبانی ESM

(async () => {
	try {
		await import('ts-node/register');
		await import('./server/index.ts');
	} catch (err) {
		console.error('Startup error:', err);
		process.exit(1);
	}
})();

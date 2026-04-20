import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
    console.log('Starting Playwright UI Test...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    
    // Catch console errors and uncaught exceptions to find deep bugs
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(`Console Error: ${msg.text()}`);
        }
    });

    page.on('pageerror', exception => {
        errors.push(`Uncaught Exception: ${exception.message}`);
    });

    try {
        console.log('Navigating to Dashboard (127.0.0.1)...');
        await new Promise(r => setTimeout(r, 4000));
        await page.goto('http://127.0.0.1:5173', { waitUntil: 'load', timeout: 30000 });
        
        console.log('Wait for main app component...');
        // Wait for Lit component or main container to render
        await page.waitForSelector('agdi-app, main, #app', { timeout: 10000 });
        
        console.log('Testing Core Navigation Elements...');
        const requiredRoutes = ['Knowledge', 'Agents', 'Channels', 'Settings'];
        const missingRoutes = [];
        const presentRoutes = [];

        for (const route of requiredRoutes) {
            const locator = page.locator(`text=${route}`).first();
            try {
                await locator.waitFor({ state: 'visible', timeout: 3000 });
                presentRoutes.push(route);
                
                // Click to trigger routing if safe
                console.log(`Clicking ${route}...`);
                await locator.click();
                await page.waitForTimeout(1000); // let UI settle
            } catch (e) {
                missingRoutes.push(route);
            }
        }
        
        console.log(`Present Routes: ${presentRoutes.join(', ')}`);
        if (missingRoutes.length > 0) {
            errors.push(`Missing or unclickable navigation routes: ${missingRoutes.join(', ')}`);
        }

        // Take a screenshot of the final state
        await page.screenshot({ path: 'dashboard-final.png', fullPage: true });

        console.log('Testing complete.');
        
    } catch (e) {
        errors.push(`Fatal Test Error: ${e.message}`);
    } finally {
        await browser.close();
        
        const report = `Playwright E2E Dashboard Testing Report\n=======================================\n\nBugs & Errors Found:\n` +
            (errors.length > 0 ? errors.map(e => `- ${e}`).join('\n') : 'None! The UI components rendered perfectly without exceptions or missing routes.\n');
        
        fs.writeFileSync('playwright_report.txt', report);
        console.log(report);
        console.log('\nReport written to playwright_report.txt');
    }
})();

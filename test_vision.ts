import { NLCommander } from './src/autonomous/nl-commander.js';
import { executeDeviceAction } from './src/autonomous/device-actions.js';

async function test() {
   const commander = new NLCommander();
   
   // Mock Device Controller
   const mockControllerLevel = {
       captureScreen: async () => Buffer.from("mock_png"),
       findImageOnScreen: async (target: string) => {
           console.log(`[DeviceController] Called findImageOnScreen for: ${target}`);
           return { match: true, x: 512, y: 384, confidence: 0.999 };
       },
       click: async (x: number, y: number) => {
           console.log(`[DeviceController] Executing native click at Coordinates: (${x}, ${y})`);
       }
   };

   // Since NLCommander Dynamically imports executeDeviceAction we have to actually use it directly to test the switch block, 
   // or just test both parsing and execution seperately.

   console.log("----- 1. Testing NL Parsing -----");
   // We bypass execute by directly accessing private planFromCommand for test isolation
   const planResult = await (commander as any).planFromCommand("find and click the image login_button.png", Buffer.from("mock"));
   console.log("Intent:", planResult.intent);
   console.log("Step Generated:", planResult.steps[0].action);

   console.log("\n----- 2. Testing Device Executor -----");
   await executeDeviceAction(planResult.steps[0].action, mockControllerLevel as any);
}

test();

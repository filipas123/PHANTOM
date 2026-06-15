import ivm from 'isolated-vm';
import { isCapabilityAllowed } from './trust-tier.js';

/**
 * Executes a JavaScript skill within an isolated sandbox.
 * @param {string} code - The JavaScript code of the skill.
 * @param {Object} args - Arguments to pass to the skill.
 * @param {number} tier - The trust tier level of the skill.
 * @returns {Promise<any>} The result of the skill execution.
 */
export async function runInSandbox(code, args, tier) {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  // Set default sandbox properties
  await jail.set('global', jail.derefInto());

  // Inject allowed capabilities based on trust tier
  if (isCapabilityAllowed(tier, 'console:log')) {
    // In a real implementation, we would bridge console methods carefully
    // For now, let's mock it minimally
    await context.evalClosure(`
      globalThis.console = {
        log: function(...args) { $0.applyIgnored(undefined, args, { arguments: { copy: true } }); }
      };
    `, [() => {}], { arguments: { reference: true } });
  }

  try {
    // Compile script to verify syntax (result unused in this simple wrapper approach)
    await isolate.compileScript(code);

    // Pass args into sandbox by stringifying them safely
    await context.evalClosure(`
      globalThis._args = JSON.parse($0);
    `, [JSON.stringify(args)]);

    // Wrap the user's code to ensure we get a return value or execute a function named 'run' if it exists
    const wrapper = `
      (async function() {
        ${code}
        if (typeof run === 'function') {
          return await run(globalThis._args);
        }
        return null;
      })();
    `;

    const compiledWrapper = await isolate.compileScript(wrapper);
    const result = await compiledWrapper.run(context, { promise: true, timeout: 5000 });
    return result;
  } catch (err) {
    throw new Error(`Sandbox Execution Error: ${err.message}`);
  } finally {
    isolate.dispose();
  }
}

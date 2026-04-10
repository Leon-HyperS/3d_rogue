import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { access, constants, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE_URL = process.env.COMBO_SURVIVOR_URL || 'http://127.0.0.1:4175/';
const DEBUG_PORT = Number(process.env.COMBO_SURVIVOR_CDP_PORT || 9223);
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

async function fileExists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function findChromeExecutable() {
  for (const candidate of CHROME_CANDIDATES) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  throw new Error('Could not find Chrome or Edge in the default Windows install locations.');
}

async function waitForPageTarget(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find(
          (target) => target.type === 'page' && target.url.includes(BASE_URL)
        );
        if (page) {
          return page;
        }
      }
    } catch {
      // Chrome may not have opened the debugging port yet.
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for a CDP page target at ${BASE_URL}.`);
}

async function connectCdp(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const runtimeErrors = [];
  let nextId = 1;

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const deferred = pending.get(message.id);
      if (!deferred) return;
      pending.delete(message.id);
      if (message.error) {
        deferred.reject(new Error(message.error.message));
        return;
      }
      deferred.resolve(message.result);
      return;
    }

    if (message.method === 'Runtime.exceptionThrown') {
      runtimeErrors.push(`exception:${message.params.exceptionDetails.text}`);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  await send('Runtime.enable');

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || `Evaluation failed: ${expression}`);
    }

    return result.result.value;
  };

  const waitFor = async (expression, timeoutMs = 15000, stepMs = 100) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const value = await evaluate(expression);
      if (value) {
        return value;
      }
      await sleep(stepMs);
    }
    throw new Error(`Timed out waiting for: ${expression}`);
  };

  const dispatchKey = async (type, code, key) => {
    const expression =
      `window.dispatchEvent(new KeyboardEvent("${type}", { code: "${code}", key: ${JSON.stringify(
        key
      )}, bubbles: true }))`;
    await evaluate(expression);
  };

  return {
    evaluate,
    waitFor,
    dispatchKey,
    runtimeErrors,
    close: () => ws.close()
  };
}

async function waitForProcessExit(processHandle, timeoutMs = 5000) {
  if (processHandle.exitCode !== null) {
    return;
  }

  await Promise.race([
    new Promise((resolve) => {
      processHandle.once('exit', resolve);
    }),
    sleep(timeoutMs)
  ]);
}

async function main() {
  const chromePath = await findChromeExecutable();
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'combo-survivor-cdp-'));
  const chrome = spawn(
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--window-size=1280,720',
      `--user-data-dir=${userDataDir}`,
      BASE_URL
    ],
    {
      stdio: 'ignore'
    }
  );

  try {
    const page = await waitForPageTarget();
    const cdp = await connectCdp(page.webSocketDebuggerUrl);

    await cdp.waitFor('window.__TEST__ && window.__TEST__.ready === true');
    await cdp.waitFor('window.__TEST__.getState().player !== null');

    const initial = await cdp.evaluate('window.__TEST__.getState()');
    assert(initial.player, 'Expected a player state after readiness.');

    await cdp.dispatchKey('keydown', 'KeyW', 'w');
    await sleep(350);
    await cdp.dispatchKey('keyup', 'KeyW', 'w');
    const afterMove = await cdp.evaluate('window.__TEST__.getState()');
    assert(
      afterMove.player.z < initial.player.z - 0.05,
      `Expected W input to move forward. Before z=${initial.player.z}, after z=${afterMove.player.z}`
    );

    await cdp.dispatchKey('keydown', 'Space', ' ');
    await cdp.waitFor('window.__TEST__.getState().player.isAttacking === true', 2000, 50);

    await cdp.dispatchKey('keydown', 'ShiftLeft', 'Shift');
    await cdp.waitFor('window.__TEST__.getState().player.isDashing === true', 2000, 50);

    await cdp.dispatchKey('keydown', 'KeyF', 'f');
    await cdp.waitFor('window.__TEST__.getState().player.specialCooldown > 0', 2000, 50);

    await cdp.waitFor('window.__TEST__.getState().livingEnemies > 0', 8000, 100);

    await cdp.evaluate('window.__TEST__.grantXp(window.__TEST__.getState().xpToNext)');
    await cdp.waitFor('window.__TEST__.getState().draftActive === true', 5000, 100);
    await cdp.evaluate('window.__TEST__.pickUpgrade(0)');
    await cdp.waitFor('window.__TEST__.getState().draftActive === false', 5000, 100);

    const afterDraft = await cdp.evaluate('window.__TEST__.getState()');
    assert(
      afterDraft.upgrades.length > 0,
      'Expected at least one drafted upgrade after selecting the first card.'
    );
    assert.deepEqual(cdp.runtimeErrors, [], `Runtime errors detected: ${cdp.runtimeErrors.join('\n')}`);

    console.log(
      JSON.stringify(
        {
          initial,
          afterMove,
          afterDraft
        },
        null,
        2
      )
    );

    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
    await waitForProcessExit(chrome);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await rm(userDataDir, { recursive: true, force: true });
        break;
      } catch (error) {
        if (error.code !== 'EBUSY' || attempt === 9) {
          throw error;
        }
        await sleep(150);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

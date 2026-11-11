import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderRunner } from '../../resources/js/prototype3d/orderRunner.js';

test('runs FIFO once, ignores repeated starts and stops on failed completion', async () => {
    const runner = createOrderRunner();
    const pending = ['first', 'second', 'third'];
    const seen = [];
    let finish;
    const run = runner.run(
        () => pending[0],
        async (id) => {
            seen.push(id);
            if (id === 'first')
                await new Promise((resolve) => {
                    finish = resolve;
                });
            pending.shift();
            return id !== 'second';
        },
    );
    await runner.run(
        () => 'duplicate',
        async () => {
            assert.fail('duplicate');
        },
    );
    assert.deepEqual(seen, ['first']);
    finish();
    await run;
    assert.deepEqual(seen, ['first', 'second']);
    assert.deepEqual(pending, ['third']);
    assert.equal(runner.running, false);
});

test('stopped animation cannot resume a previous run or clear a new run', async () => {
    const runner = createOrderRunner();
    let oldFinish, newFinish;
    const old = runner.run(
        () => 'old',
        () =>
            new Promise((resolve) => {
                oldFinish = resolve;
            }),
    );
    runner.stop();
    let calls = 0;
    const current = runner.run(
        () => 'new',
        () => {
            calls++;
            return new Promise((resolve) => {
                newFinish = resolve;
            });
        },
    );
    oldFinish(true);
    await old;
    assert.equal(calls, 1);
    assert.equal(runner.running, true);
    newFinish(false);
    await current;
    assert.equal(runner.running, false);
});

test('empty queue and exceptions release the runner', async () => {
    const runner = createOrderRunner();
    await runner.run(
        () => null,
        () => assert.fail(),
    );
    await assert.rejects(
        runner.run(
            () => 'one',
            async () => {
                throw new Error('failed');
            },
        ),
    );
    assert.equal(runner.running, false);
});

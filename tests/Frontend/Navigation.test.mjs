import test from 'node:test';
import assert from 'node:assert/strict';
import {
    pages,
    pageFromHash,
} from '../../resources/js/prototype3d/navigation.js';
test('seven workspaces have stable offline hash routes and unknown routes fall back to planet', () => {
    for (const page of pages) assert.equal(pageFromHash(`#${page}`), page);
    for (const hash of [
        '',
        '#',
        '#unknown',
        '#constructor',
        '#ships/extra',
        '#<script>',
    ])
        assert.equal(pageFromHash(hash), 'planet');
    assert.equal(pages.length, 7);
});

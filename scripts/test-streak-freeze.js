#!/usr/bin/env node
'use strict';
// Plus members get 2 streak freezes a month on top of everyone's weekly one.
const E=require('../server/engage'); const assert=require('assert');
const D=(d)=>Date.UTC(2026,10,d,12);
let r=E.emptyRecord();
r=E.noteCall(r,{seconds:120,now:D(2)}).rec; r=E.noteCall(r,{seconds:120,now:D(3)}).rec;
// miss 4,5 (2 days) on day 6: free -> reset, plus -> keeps (1 weekly + 1 plus)
let free=E.noteCall(JSON.parse(JSON.stringify(r)),{seconds:120,now:D(6)});
assert.strictEqual(free.bump.count,1);
let plus=E.noteCall(JSON.parse(JSON.stringify(r)),{seconds:120,now:D(6),plus:true});
assert.strictEqual(plus.bump.count,3); assert.strictEqual(plus.bump.frozen,1);
assert.strictEqual(E.view(r,{now:D(6),plus:true}).streak.count,2);
assert.strictEqual(E.view(r,{now:D(6)}).streak.count,0);
assert.strictEqual(E.view(plus.rec,{now:D(6),plus:true}).streak.freezesLeft,1);
// miss 4 days: even plus breaks
assert.strictEqual(E.noteCall(JSON.parse(JSON.stringify(r)),{seconds:120,now:D(8),plus:true}).bump.count,1);
console.log('freeze ok');

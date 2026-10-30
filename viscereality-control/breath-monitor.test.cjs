const test = require('node:test'), assert = require('node:assert/strict');
const {Model, targetAt, actualPaths} = require('./breath-monitor.js');
const sample = (id,t,v=0.4,tracking='valid',source='polar-acc') => [id,t,v,'inhale',tracking,0.9,source];
const packet = (changes={}) => ({v:1,available:true,epoch:'7',run:'7:2',active_ms:1000,running:true,
  state:'active',source:'polar-acc',age_ms:0,cursor:2,samples:[sample(1,0),sample(2,1000)],
  segments:[[0,4000,'inhale',0,1],[4000,6000,'hold',1,1],[6000,10000,'exhale',1,0]],
  history_ms:60000,preview_ms:10000,...changes});

test('native timeline supplies target, phase progress and preview with half-open hold boundaries',()=>{
  const d=packet();
  assert.equal(targetAt(d.segments,2000).progress,0.5);
  assert.ok(Math.abs(targetAt(d.segments,2000).level-0.5)<1e-10);
  assert.equal(targetAt(d.segments,4000).phase,'hold');
  assert.equal(targetAt(d.segments,8000).phase,'exhale');
  assert.equal(targetAt(d.segments,10000),null);
});
test('merge deltas, prune history, reset cursor on new run, and reject stale owner without mutation',()=>{
  const m=new Model();m.accept(packet(),'7');
  m.accept(packet({active_ms:61000,cursor:3,samples:[sample(3,61000)]}),'7');
  assert.deepEqual(m.samples.map(s=>s[0]),[2,3]);
  assert.deepEqual(m.query(),{run:'7:2',after:3});
  assert.throws(()=>m.accept(packet({epoch:'8',run:'8:2'}),'7'),/owner/);
  assert.equal(m.run,'7:2');
  m.accept(packet({run:'7:3',cursor:1,samples:[sample(1,0)]}),'7');
  assert.equal(m.samples.length,1);
  assert.deepEqual(m.query(),{run:'7:3',after:1});
});
test('paused clock stays frozen and absent samples do not invent breathing or join tracking/source gaps',()=>{
  const m=new Model();m.accept(packet(),'7');
  m.accept(packet({running:false,cursor:2,samples:[],age_ms:5000}),'7');
  assert.equal(m.activeMs,1000);assert.equal(m.current().actual,null);
  const rows=[sample(1,0),sample(2,100),sample(3,200,null,'stale'),sample(4,300),
    sample(5,400,0.5,'valid','controller'),sample(6,1500)];
  assert.equal(actualPaths(rows,2000).length,4);
});
test('malformed data and unbounded arrays are rejected before replacing valid state',()=>{
  const m=new Model();m.accept(packet(),'7');
  for(const d of [packet({samples:[sample(3,1000,1.2)]}),packet({cursor:1.5}),
    packet({samples:Array(602).fill(sample(1,0))}),packet({segments:[[0,0,'inhale',0,1]]}),
    packet({segments:[[0,1,'evil',0,1]]}),packet({run:'8:2'}),packet({running:'true'})])
    assert.throws(()=>m.accept(d,'7'));
  assert.equal(m.cursor,2);
});

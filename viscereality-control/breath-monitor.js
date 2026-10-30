/* Read-only breathing view. Observations live in memory and never drive commands. */
(function(root) {
  'use strict';
  const phases=['inhale','exhale','hold','unknown'], sources=['polar-acc','controller'];
  const integer=v=>Number.isSafeInteger(v)&&v>=0;
  const unit=v=>Number.isFinite(v)&&v>=0&&v<=1;
  function targetAt(segments,t) {
    const s=segments.find(s=>t>=s[0]&&t<s[1]);
    if(!s)return null;
    const progress=(t-s[0])/(s[1]-s[0]);
    return {phase:s[2],progress,remainingMs:s[1]-t,
      level:s[3]+(s[4]-s[3])*(0.5-0.5*Math.cos(Math.PI*progress))};
  }
  function actualPaths(samples,now) {
    const paths=[];let previous, path;
    for(const s of samples) {
      if(s[1]>now||s[1]<now-60000||s[2]===null||s[4]!=='valid') {previous=null;continue;}
      if(!previous||s[1]-previous[1]>500||s[6]!==previous[6]) {path=[];paths.push(path);}
      path.push([s[1],s[2]]);previous=s;
    }
    return paths;
  }
  class Model {
    constructor(){this.reset();}
    reset(){this.run='';this.cursor=0;this.samples=[];this.data=null;this.activeMs=0;}
    query(){return {run:this.run,after:this.cursor};}
    accept(d,expectedEpoch) {
      if(d?.v!==1)throw new Error('Invalid breathing monitor version');
      if(d.available===false)return false;
      if(d.available!==true||d.epoch!==expectedEpoch||typeof d.run!=='string'
        ||!/^([1-9][0-9]{0,18}):[0-9]{1,20}$/.test(d.run)||!d.run.startsWith(d.epoch+':'))
        throw new Error('Breathing monitor owner changed');
      if(!integer(d.active_ms)||!integer(d.cursor)||typeof d.running!=='boolean'
        ||d.history_ms!==60000||d.preview_ms!==10000||!(d.age_ms===null||integer(d.age_ms))
        ||!(d.source===null||sources.includes(d.source))||!Array.isArray(d.samples)||d.samples.length>601
        ||!Array.isArray(d.segments)||d.segments.length>256)throw new Error('Invalid breathing monitor bounds');
      let id=0,t=-1,end=-1;
      for(const s of d.samples) {
        if(!Array.isArray(s)||s.length!==7||!integer(s[0])||s[0]<=id||s[0]>d.cursor
          ||!integer(s[1])||s[1]<=t||!(s[2]===null||unit(s[2]))||!phases.includes(s[3])
          ||typeof s[4]!=='string'||s[4].length>32||!unit(s[5])||!sources.includes(s[6]))
          throw new Error('Invalid breathing sample');
        id=s[0];t=s[1];
      }
      for(const s of d.segments) {
        if(!Array.isArray(s)||s.length!==5||!integer(s[0])||!integer(s[1])||s[1]<=s[0]
          ||s[0]<end||!phases.slice(0,3).includes(s[2])||!unit(s[3])||!unit(s[4]))
          throw new Error('Invalid breathing target');
        end=s[1];
      }
      const same=this.run===d.run&&d.cursor>=this.cursor&&d.active_ms>=this.activeMs;
      this.samples=(same?this.samples:[]).concat(d.samples.filter(s=>!same||s[0]>this.cursor))
        .filter(s=>s[1]>=d.active_ms-60000&&s[1]<=d.active_ms).slice(-601);
      this.data=d;this.run=d.run;this.cursor=d.cursor;this.activeMs=d.active_ms;
      return true;
    }
    current() {
      const d=this.data,last=this.samples.at(-1);
      return {target:d?targetAt(d.segments,this.activeMs):null,
        actual:d&&last&&d.age_ms!==null&&d.age_ms<1500&&this.activeMs-last[1]<=500
          &&last[2]!==null&&last[4]==='valid'&&last[6]===d.source?last:null};
    }
  }
  function createView(document) {
    const model=new Model(),el=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
    const text=(id,value)=>{el(id).textContent=value;};
    const x=t=>52+(t-(model.activeMs-60000))/70000*628,y=v=>190-v*158;
    const point=(t,v)=>`${x(t).toFixed(1)},${y(v).toFixed(1)}`;
    let fresh=false;
    function unavailable(message) {
      fresh=false;el('breath-monitor').hidden=false;el('breath-monitor').classList.add('monitor-stale');
      text('breath-monitor-status',message);text('breath-actual-phase','Unavailable');
      text('breath-target-phase','Unavailable');text('breath-target-detail','Waiting for current readback');
      text('breath-actual-detail','No current sensor readback');
      el('breath-target-progress').value=0;el('breath-actual-progress').value=0;
      el('breath-now-actual').setAttribute('visibility','hidden');
      el('breath-now-target').setAttribute('visibility','hidden');
    }
    function render() {
      const d=model.data,{target,actual}=model.current();
      if(!d)return;
      fresh=true;el('breath-monitor').hidden=false;el('breath-monitor').classList.remove('monitor-stale');
      const mode=d.running?'Running':d.state==='active'?'Paused / clock held':'Ready';
      const source=d.source==='polar-acc'?'Polar ACC':d.source==='controller'?'Controller':'Sensor';
      text('breath-monitor-status',`${mode} · ${source}${actual?` · quality ${Math.round(actual[5]*100)}%`:' · waiting for valid tracking'}`);
      text('breath-target-phase',target?target.phase.toUpperCase():'No target');
      text('breath-target-detail',target?`${Math.round(target.progress*100)}% of phase · ${(target.remainingMs/1000).toFixed(1)}s left`:'No packaged target at this time');
      text('breath-actual-phase',actual?actual[3].toUpperCase():'Unavailable');
      text('breath-actual-detail',actual?`${Math.round(actual[2]*100)}% normalized level`:'Tracking missing, stale or calibrating');
      el('breath-target-progress').value=target?.progress||0;
      el('breath-actual-progress').value=actual?.[2]||0;
      const targetCommands=[];
      for(const s of d.segments) {
        const start=Math.max(s[0],model.activeMs-60000),end=Math.min(s[1],model.activeMs+10000);
        if(end<=start)continue;
        for(let t=start;t<=end;t=Math.min(t+100,end)) {
          const p=(t-s[0])/(s[1]-s[0]),v=s[3]+(s[4]-s[3])*(0.5-0.5*Math.cos(Math.PI*p));
          targetCommands.push(`${t===start?'M':'L'}${point(t,v)}`);if(t===end)break;
        }
      }
      el('breath-target-line').setAttribute('d',targetCommands.join(' '));
      const group=el('breath-actual-lines');group.replaceChildren();
      for(const points of actualPaths(model.samples,model.activeMs)) {
        const path=document.createElementNS(ns,'path');path.setAttribute('class','breath-actual-line');
        path.setAttribute('d',points.map((p,i)=>`${i?'L':'M'}${point(...p)}`).join(' '));group.append(path);
      }
      for(const [id,p] of [['breath-now-target',target&&[model.activeMs,target.level]],
        ['breath-now-actual',actual&&[actual[1],actual[2]]]]) {
        el(id).setAttribute('visibility',p?'visible':'hidden');
        if(p){el(id).setAttribute('cx',x(p[0]));el(id).setAttribute('cy',y(p[1]));}
      }
      el('breath-chart').setAttribute('aria-label',`Breathing history: last 60 seconds and next 10 seconds of target. ${source}. Target ${target?.phase||'unavailable'}, actual ${actual?.[3]||'unavailable'}.`);
    }
    return {model,accept(d,epoch){if(model.accept(d,epoch))render();else unavailable(d.reason==='target-window-too-dense'
      ?'This target pattern is too dense for the live monitor.':'Breathing readback temporarily unavailable');},
      unavailable,reset(){model.reset();fresh=false;el('breath-monitor').hidden=true;
        el('breath-target-line').setAttribute('d','');el('breath-actual-lines').replaceChildren();},
      get fresh(){return fresh;}};
  }
  const api={Model,targetAt,actualPaths,createView};
  if(typeof module!=='undefined')module.exports=api;else root.ViscerealityBreathMonitor=api;
})(globalThis);

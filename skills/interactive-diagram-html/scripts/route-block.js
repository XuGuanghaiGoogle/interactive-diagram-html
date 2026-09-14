/* ROUTE-BEGIN：由 scripts/sync-route.mjs 从 scripts/route-block.js 注入 engine.html 与 build.mjs，两处必须一致，勿直接改 */
/* 直角走线：始终从起点端口的外侧出发、从终点端口的外侧进入，不改用户选的端口。
   手写 via / mx / my 优先；否则在候选路线中选不穿过两端方块、拐点最少、最短的一条。 */
function route(e){
  const G=20;
  const ia=String(e.from).split(':'),ib=String(e.to).split(':');
  const sa=ia[1]||'r',sb=ib[1]||'l';
  let p1=port(e.from),p2=port(e.to);if(!p1||!p2)return null;
  if(e.d1)p1={x:p1.x+(e.d1[0]||0),y:p1.y+(e.d1[1]||0)};
  if(e.d2)p2={x:p2.x+(e.d2[0]||0),y:p2.y+(e.d2[1]||0)};
  if(e.via)return[p1].concat(e.via.map(function(v){return{x:v[0],y:v[1]};})).concat([p2]);
  if(e.mx!=null)return[p1,{x:e.mx,y:p1.y},{x:e.mx,y:p2.y},p2];
  if(e.my!=null)return[p1,{x:p1.x,y:e.my},{x:p2.x,y:e.my},p2];
  const na=nodeOf(ia[0]),nb=nodeOf(ib[0]);
  /* 外伸段默认 G；若正前方紧挨着另一端的方块，缩短到空隙的一半，避免伸进对方 */
  function out(p,s,other){let d=G;
    if(other){
      if((s==='b'||s==='t')&&p.x>other.x&&p.x<other.x+other.w){const gap=s==='b'?other.y-p.y:p.y-(other.y+other.h);if(gap>=0&&gap<2*G)d=Math.max(1,gap/2);}
      if((s==='r'||s==='l')&&p.y>other.y&&p.y<other.y+other.h){const gap=s==='r'?other.x-p.x:p.x-(other.x+other.w);if(gap>=0&&gap<2*G)d=Math.max(1,gap/2);}
    }
    return{x:p.x+(s==='r'?d:s==='l'?-d:0),y:p.y+(s==='b'?d:s==='t'?-d:0)};}
  const o=out(p1,sa,nb),q=out(p2,sb,na);
  const boxes=[na,nb].filter(Boolean);
  const L=Math.min.apply(null,boxes.map(function(b){return b.x;}).concat([o.x,q.x]))-G;
  const R=Math.max.apply(null,boxes.map(function(b){return b.x+b.w;}).concat([o.x,q.x]))+G;
  const T=Math.min.apply(null,boxes.map(function(b){return b.y;}).concat([o.y,q.y]))-G;
  const B=Math.max.apply(null,boxes.map(function(b){return b.y+b.h;}).concat([o.y,q.y]))+G;
  const mx=(o.x+q.x)/2,my=(o.y+q.y)/2;
  /* 同为 4 点时先出现的优先：中线折线在前，保持 mx / my 默认取中点的旧行为 */
  const mids=[
    [{x:mx,y:o.y},{x:mx,y:q.y}],[{x:o.x,y:my},{x:q.x,y:my}],
    [{x:q.x,y:o.y}],[{x:o.x,y:q.y}],
    [{x:R,y:o.y},{x:R,y:q.y}],[{x:L,y:o.y},{x:L,y:q.y}],
    [{x:o.x,y:B},{x:q.x,y:B}],[{x:o.x,y:T},{x:q.x,y:T}]
  ];
  function simplify(pts){
    const a=[];pts.forEach(function(p){const l=a[a.length-1];if(!l||l.x!==p.x||l.y!==p.y)a.push(p);});
    for(let i=a.length-2;i>0;i--){const u=a[i-1],v=a[i],w=a[i+1];
      if((u.x===v.x&&v.x===w.x)||(u.y===v.y&&v.y===w.y))a.splice(i,1);}
    return a;
  }
  function hits(u,v,b){
    const x0=b.x+1,x1=b.x+b.w-1,y0=b.y+1,y1=b.y+b.h-1;
    if(u.y===v.y)return u.y>y0&&u.y<y1&&Math.max(u.x,v.x)>x0&&Math.min(u.x,v.x)<x1;
    return u.x>x0&&u.x<x1&&Math.max(u.y,v.y)>y0&&Math.min(u.y,v.y)<y1;
  }
  function ok(pts){
    for(let i=0;i<pts.length-1;i++){const u=pts[i],v=pts[i+1];
      if(u.x!==v.x&&u.y!==v.y)return false;
      for(let k=0;k<boxes.length;k++)if(hits(u,v,boxes[k]))return false;}
    /* 离开起点、进入终点的方向必须与端口朝向一致 */
    const s1=pts[1],s2=pts[pts.length-2];
    const dirOk=function(p,n,s){return s==='r'?n.x>p.x:s==='l'?n.x<p.x:s==='b'?n.y>p.y:n.y<p.y;};
    return dirOk(p1,s1,sa)&&dirOk(p2,s2,sb);
  }
  function len(pts){let s=0;for(let i=0;i<pts.length-1;i++)s+=Math.abs(pts[i].x-pts[i+1].x)+Math.abs(pts[i].y-pts[i+1].y);return s;}
  let best=null;
  mids.forEach(function(m){
    const pts=simplify([p1,o].concat(m,[q,p2]));
    if(pts.length<2||!ok(pts))return;
    if(!best||pts.length<best.length||(pts.length===best.length&&len(pts)<len(best)))best=pts;
  });
  return best||simplify([p1,o,{x:R,y:o.y},{x:R,y:q.y},q,p2]);
}
/* ROUTE-END */

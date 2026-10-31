// Mini interpreter of a C subset for the learning app. Errors are thrown as {line,msg}.
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const fmt=(v,t)=>v===undefined?'? (śmieci)':t==='char'?(v>31&&v<127?`'${String.fromCharCode(v)}' (${v})`:String(v)):(typeof v==='number'&&!Number.isInteger(v)?String(+v.toPrecision(7)):String(v));

const TYPEKW=['int','float','double','char','void','unsigned','signed','const','struct','FILE'],ESC={n:'\n',t:'\t','0':'\0'};
const unesc=s=>s.replace(/\\(.)/g,(_,c)=>c in ESC?ESC[c]:c);
const dict=o=>Object.assign(Object.create(null),o);

function lex(src,macros=dict({}),baseLine=1){
  const T=[],re=/(\s+|\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|(0[xX][0-9a-fA-F]+)|((?:\d+\.\d*|\.\d+|\d+)(?:[eE][+-]?\d+)?)([fFuUlL]*)|([A-Za-z_]\w*)|"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])+)'|(<<=|>>=|\+\+|--|->|<<|>>|<=|>=|==|!=|&&|\|\||[+\-*\/%&|^]=|[-+*\/%<>=!&|^~(){};,?:\[\].])/y;
  let line=baseLine;
  for(let i=0;i<src.length;i=re.lastIndex){
    re.lastIndex=i;const m=re.exec(src);
    if(!m)throw{line,msg:`nieznany znak „${src[i]}”`};
    if(m[1]!==undefined){
      const d=/^#\s*define\s+(\w+)(?:[ \t]+(.*))?$/.exec(m[1]);
      if(d)macros[d[1]]=d[2]===undefined?[]:lex(d[2].trim(),macros,line);
      line+=(m[1].match(/\n/g)||[]).length;continue;
    }
    const tk={line,pos:i,end:re.lastIndex};
    if(m[2]!==undefined)Object.assign(tk,{k:'num',t:'int',v:parseInt(m[2],16)});
    else if(m[3]!==undefined){
      const fl=/[.eE]/.test(m[3]),f=/[fF]/.test(m[4]);
      Object.assign(tk,{k:'num',t:f?'float':fl?'double':'int',v:f?Math.fround(+m[3]):+m[3]});
    }
    else if(m[5]!==undefined){
      if(macros[m[5]]){T.push(...macros[m[5]].map(t=>({...t,line,pos:i,end:re.lastIndex})));continue}
      Object.assign(tk,{k:'id',v:m[5]});
    }
    else if(m[6]!==undefined)Object.assign(tk,{k:'str',v:unesc(m[6])});
    else if(m[7]!==undefined)Object.assign(tk,{k:'chr',v:unesc(m[7]).charCodeAt(0)});
    else Object.assign(tk,{k:'op',v:m[8]});
    T.push(tk);
  }
  return T;
}

function parse(toks,src){
  let p=0,anon=0;
  const structs=dict({}),typedefs=dict({}),funcs=dict({}),declPos=dict({}),globals=[];
  const peek=()=>toks[p]||{k:'eof',v:'koniec pliku',line:toks.length?toks[toks.length-1].line:1};
  const err=(msg,t=peek())=>{throw{line:t.line,msg}};
  const isOp=v=>peek().k==='op'&&peek().v===v;
  const eat=v=>{if(!isOp(v)){const pr=toks[p-1]||peek();err(`brakuje „${v}” (po „${pr.v}”)`,pr)}return toks[p++]};
  const fin=(n,s)=>{n.src=src.slice(s.pos,toks[p-1].end);n.line=s.line;n.pos=s.pos;return n};
  const isTypeTok=t=>!!t&&t.k==='id'&&(TYPEKW.includes(t.v)||t.v in typedefs);
  const PR={'||':1,'&&':2,'|':3,'^':4,'&':5,'==':6,'!=':6,'<':7,'>':7,'<=':7,'>=':7,'<<':8,'>>':8,'+':9,'-':9,'*':10,'/':10,'%':10};
  const ASG=['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>='];
  const isLv=n=>['var','index','member','deref'].includes(n.n);

  function cnum(n){
    if(n.n==='num'&&n.t==='int')return n.v;
    if(n.n==='un'&&n.op==='-')return -cnum(n.e);
    if(n.n==='bin'&&'+-*/'.includes(n.op)){const a=cnum(n.l),b=cnum(n.r);return n.op==='+'?a+b:n.op==='-'?a-b:n.op==='*'?a*b:Math.trunc(a/b)}
    err('długość tablicy musi być stałą liczbą całkowitą (np. 5 albo makro z #define)',{line:n.line});
  }
  function expr(){
    const s=peek(),l=ternary(),t=peek();
    if(t.k==='op'&&ASG.includes(t.v)){
      if(!isLv(l))err('po lewej stronie przypisania musi stać zmienna, element tablicy lub pole',t);
      p++;return fin({n:'asg',op:t.v,t:l,r:expr()},s);
    }
    return l;
  }
  function ternary(){const s=peek(),c=bin(1);if(!isOp('?'))return c;p++;const a=expr();eat(':');return fin({n:'tern',c,a,b:ternary()},s)}
  function bin(min){
    const s=peek();let l=unary();
    for(;;){const t=peek(),pr=t.k==='op'&&PR[t.v];if(!pr||pr<min)return l;p++;l=fin({n:'bin',op:t.v,l,r:bin(pr+1)},s)}
  }
  function unary(){
    const s=peek();
    if(s.k==='op'&&['!','-','+','~'].includes(s.v)){p++;return fin({n:'un',op:s.v,e:unary()},s)}
    if(s.k==='op'&&(s.v==='++'||s.v==='--')){p++;const e=unary();if(!isLv(e))err('++ i -- działają tylko na zmiennej',s);return fin({n:'inc',op:s.v,t:e,post:false},s)}
    if(s.k==='op'&&s.v==='&'){p++;const e=unary();if(!isLv(e))err('& działa tylko na zmiennej, elemencie tablicy lub polu',s);return fin({n:'addr',e},s)}
    if(s.k==='op'&&s.v==='*'){p++;return fin({n:'deref',e:unary()},s)}
    if(s.k==='id'&&s.v==='sizeof'){
      p++;
      if(isOp('(')&&isTypeTok(toks[p+1])){p++;let ty=parseBase();while(isOp('*')){p++;ty={k:'ptr',to:ty}}eat(')');return fin({n:'sizeof',ty},s)}
      return fin({n:'sizeof',e:unary()},s);
    }
    if(isOp('(')&&isTypeTok(toks[p+1])){p++;let ty=parseBase();while(isOp('*')){p++;ty={k:'ptr',to:ty}}eat(')');return fin({n:'cast',ty,e:unary()},s)}
    return postfix();
  }
  function postfix(){
    const s=peek();let e=primary();
    for(;;){
      if(isOp('[')){p++;const i=expr();eat(']');e=fin({n:'index',b:e,i},s)}
      else if(isOp('.')||isOp('->')){
        const arrow=toks[p++].v==='->',f=peek();
        if(f.k!=='id')err('po „.” lub „->” oczekiwano nazwy pola');
        p++;e=fin({n:'member',b:e,f:f.v,arrow},s);
      }
      else if(isOp('++')||isOp('--')){if(!isLv(e))err('++ i -- działają tylko na zmiennej');e=fin({n:'inc',op:toks[p++].v,t:e,post:true},s)}
      else return e;
    }
  }
  function primary(){
    const s=peek();
    if(s.k==='num'){p++;return fin({n:'num',t:s.t,v:s.v},s)}
    if(s.k==='chr'){p++;return fin({n:'num',t:'int',v:s.v},s)}
    if(s.k==='str'){p++;while(peek().k==='str'){s.v+=toks[p++].v}return fin({n:'str',v:s.v},s)}
    if(s.k==='id'){
      p++;
      if(!isOp('('))return fin({n:'var',name:s.v},s);
      p++;const args=[];
      if(!isOp(')')){args.push(expr());while(isOp(',')){p++;args.push(expr())}}
      eat(')');return fin({n:'call',name:s.v,args},s);
    }
    if(isOp('(')){p++;const e=expr();eat(')');e.src=src.slice(s.pos,toks[p-1].end);return e}
    err(`nieoczekiwane „${s.v}” – tu powinna być wartość lub zmienna`);
  }

  function parseBase(){
    let u=false,mod=false;
    for(;;){const t=peek();if(t.v==='const')p++;else if(t.v==='unsigned'){u=mod=true;p++}else if(t.v==='signed'){mod=true;p++}else break}
    const t=peek();
    if(t.v==='long'||t.v==='short')err(`typ „${t.v}” nie jest obsługiwany w pracowni (używaj int, float, double, char)`);
    if(t.k==='id'&&['int','float','double','char','void'].includes(t.v)){p++;return t.v==='void'?{k:'void'}:u&&(t.v==='int'||t.v==='char')?{k:t.v,u:true}:{k:t.v}}
    if(mod)return u?{k:'int',u:true}:{k:'int'};
    if(t.v==='FILE'){p++;return{k:'file'}}
    if(t.v==='struct'){
      p++;const nm=peek();let name;
      if(nm.k==='id'&&!isTypeTok(nm)){name=nm.v;p++}else name='__anon'+(++anon);
      if(isOp('{'))defStruct(name);
      return{k:'struct',name};
    }
    if(t.k==='id'&&t.v in typedefs){p++;return typedefs[t.v]}
    err(`oczekiwano nazwy typu, a jest „${t.v}”`);
  }
  function defStruct(name){
    eat('{');const fields=[];
    while(!isOp('}')){
      if(peek().k==='eof')err('brakuje „}” w definicji struktury',toks[p-1]);
      const base=parseBase();
      do{const d=declarator(base);fields.push({n:d.name,ty:d.ty})}while(isOp(',')&&++p);
      eat(';');
    }
    p++;structs[name]={name,fields,anon:name.startsWith('__anon')};
  }
  function declarator(base,optName){
    let ty=base;while(isOp('*')){p++;ty={k:'ptr',to:ty}}
    let name='';const t=peek();
    if(t.k==='id'&&!isTypeTok(t)){name=t.v;p++}else if(!optName)err('brakuje nazwy zmiennej');
    if(isOp('[')){
      p++;let len=null;if(!isOp(']'))len=cnum(expr());eat(']');
      if(isOp('['))err('tablice wielowymiarowe nie są obsługiwane w pracowni');
      ty={k:'arr',of:ty,len};
    }
    return{name,ty};
  }
  function initList(){
    const s=peek();eat('{');const items=[];
    while(!isOp('}')){items.push(isOp('{')?initList():expr());if(isOp(','))p++;else break}
    eat('}');return fin({n:'list',items},s);
  }
  function declItems(base){
    const items=[];
    do{
      const d=declarator(base);let init=null;
      if(isOp('=')){p++;init=isOp('{')?initList():expr()}
      if(d.ty.k==='arr'&&d.ty.len===null){
        if(init&&init.n==='list')d.ty={...d.ty,len:init.items.length};
        else if(init&&init.n==='str')d.ty={...d.ty,len:[...init.v].length+1};
        else err('rozmiar tablicy trzeba podać w [ ] albo wywnioskować z inicjalizatora {…}');
      }
      if(d.ty.k==='arr'&&d.ty.len<1)err('tablica musi mieć co najmniej 1 element');
      items.push({name:d.name,ty:d.ty,init});
    }while(isOp(',')&&++p);
    return items;
  }
  function stmt(){
    const s=peek();
    if(isOp('{')){p++;const body=[];while(!isOp('}')){if(peek().k==='eof')err('brakuje „}” na końcu programu',toks[p-1]);body.push(stmt())}p++;return{n:'block',body,line:s.line}}
    if(isOp(';')){p++;return{n:'empty',line:s.line}}
    if(isTypeTok(s)){const base=parseBase(),items=declItems(base);eat(';');return{n:'decl',items,line:s.line}}
    if(s.k==='id'){
      const v=s.v;
      if(v==='if'){p++;eat('(');const c=expr();eat(')');const a=stmt();let b=null;if(peek().v==='else'){p++;b=stmt()}return{n:'if',c,a,b,line:s.line}}
      if(v==='while'){p++;eat('(');const c=expr();eat(')');return{n:'while',c,body:stmt(),line:s.line}}
      if(v==='do'){p++;const body=stmt();if(peek().v!=='while')err('po ciele do{…} brakuje „while”');p++;eat('(');const c=expr();eat(')');eat(';');return{n:'do',c,body,line:s.line}}
      if(v==='for'){
        p++;eat('(');let init=null,cond=null,step=null;
        if(!isOp(';')){
          if(isTypeTok(peek())){const base=parseBase();init={n:'decl',items:declItems(base),line:s.line}}else init=expr();
        }
        eat(';');if(!isOp(';'))cond=expr();eat(';');if(!isOp(')'))step=expr();eat(')');
        return{n:'for',init,cond,step,body:stmt(),line:s.line};
      }
      if(v==='break'||v==='continue'){p++;eat(';');return{n:v,line:s.line}}
      if(v==='return'){p++;const e=isOp(';')?null:expr();eat(';');return{n:'return',e,line:s.line}}
    }
    const e=expr();eat(';');return{n:'expr',e,line:s.line};
  }

  while(p<toks.length){
    const s=peek();
    if(s.v==='typedef'){
      p++;const base=parseBase(),d=declarator(base);
      if(base.k==='struct'&&d.ty===base&&structs[base.name]&&structs[base.name].anon){
        const old=base.name;structs[d.name]=structs[old];delete structs[old];structs[d.name].name=d.name;base.name=d.name;
      }
      typedefs[d.name]=d.ty;eat(';');continue;
    }
    if(!isTypeTok(s))err('na najwyższym poziomie oczekiwano funkcji, zmiennej globalnej lub definicji struktury (np. „int main(void) {”)');
    const base=parseBase();
    if(isOp(';')){p++;continue}
    const save=p;let ret=base;
    while(isOp('*')){p++;ret={k:'ptr',to:ret}}
    const nm=peek();
    if(!(nm.k==='id'&&toks[p+1]&&toks[p+1].k==='op'&&toks[p+1].v==='(')){
      p=save;const items=declItems(base);eat(';');globals.push({n:'decl',items,line:s.line});continue;
    }
    p+=2;const params=[];
    if(peek().v==='void'&&toks[p+1]&&toks[p+1].v===')')p++;
    else if(!isOp(')'))do{
      const d=declarator(parseBase(),true);
      params.push({name:d.name,ty:d.ty.k==='arr'?{k:'ptr',to:d.ty.of}:d.ty});
    }while(isOp(',')&&++p);
    eat(')');
    const f=funcs[nm.v]||(funcs[nm.v]={name:nm.v,body:null});
    Object.assign(f,{ret,params});
    if(!(nm.v in declPos))declPos[nm.v]=s.pos;
    if(isOp(';')){p++;continue}
    if(!isOp('{'))err('po nagłówku funkcji brakuje „{” (albo „;” przy prototypie)',toks[p-1]);
    if(f.body)err(`funkcja „${nm.v}” jest zdefiniowana drugi raz`,s);
    f.body=stmt();f.body.endLine=toks[p-1].line;f.line=s.line;
  }
  if(!funcs.main||!funcs.main.body)err('brakuje funkcji main – każdy program w C zaczyna się od main',toks[toks.length-1]);
  return{funcs,globals,declPos,structs};
}

function runC(src,input,files0){
  const{funcs,globals,declPos,structs}=parse(lex(src),src);
  const vars=[],steps=[],frames=[],files=new Map(Object.entries(files0||{})),stdin={s:input||'',pos:0};
  let out='',off=0,goff=0,sOff=0,ev=[],error=null,G=0,nid=0;
  const rt=(msg,line)=>({line,msg});
  const T_INT={k:'int'},T_UINT={k:'int',u:true},T_FLT={k:'float'},T_DBL={k:'double'},T_CHR={k:'char'},T_STR={k:'str'},T_VOID={k:'void'};
  const NUMT={int:T_INT,float:T_FLT,double:T_DBL};
  const isNum=t=>t.k==='int'||t.k==='float'||t.k==='double'||t.k==='char';
  const ptrTo=to=>({k:'ptr',to});
  const hex=n=>'0x'+n.toString(16);

  // ---- types and values
  const st=(ty,line)=>{const s=structs[ty.name];if(!s)throw rt(`struktura „${ty.name}” nie ma definicji`,line);return s};
  function layout(s){
    if(s.lay)return s.lay;
    let o=0,al=1;const offs={};
    for(const f of s.fields){const a=alignOf(f.ty);o=Math.ceil(o/a)*a;offs[f.n]=o;o+=sizeOf(f.ty);al=Math.max(al,a)}
    return s.lay={offs,size:Math.ceil(o/al)*al||1,al};
  }
  function sizeOf(ty){
    switch(ty.k){
      case'int':case'float':return 4;case'double':return 8;case'char':return 1;
      case'ptr':case'file':return 8;case'arr':return ty.len*sizeOf(ty.of);case'struct':return layout(st(ty)).size;
    }
    return 1;
  }
  const alignOf=ty=>ty.k==='arr'?alignOf(ty.of):ty.k==='struct'?layout(st(ty)).al:sizeOf(ty);
  const tname=ty=>ty.k==='ptr'?tname(ty.to)+'*':ty.k==='arr'?tname(ty.of)+'['+ty.len+']':ty.k==='struct'?(structs[ty.name]&&structs[ty.name].anon?ty.name:'struct '+ty.name):ty.k==='file'?'FILE':(ty.u?'unsigned ':'')+ty.k;
  function mkVal(ty,zero){
    switch(ty.k){
      case'arr':return Array.from({length:ty.len},()=>mkVal(ty.of,zero));
      case'struct':{const o={};for(const f of st(ty).fields)o[f.n]=mkVal(f.ty,zero);return o}
      case'ptr':case'file':return zero?null:undefined;
    }
    return zero?0:undefined;
  }
  const copyVal=(ty,v)=>ty.k==='arr'?v.map(x=>copyVal(ty.of,x)):ty.k==='struct'?Object.fromEntries(st(ty).fields.map(f=>[f.n,copyVal(f.ty,v[f.n])])):v;
  const conv=(ty,x)=>ty.k==='int'?(ty.u?Math.trunc(x)>>>0:Math.trunc(x)|0):ty.k==='char'?(ty.u?Math.trunc(x)&255:Math.trunc(x)<<24>>24):ty.k==='float'?Math.fround(x):x;
  const lbl=l=>l.base!==undefined?`${l.base}[${l.k}]`:l.label;
  function show(ty,v){
    if(v===undefined)return '? (śmieci)';
    switch(ty.k){
      case'char':return fmt(v,'char');
      case'ptr':return v===null?'NULL':v.file?`plik „${v.name}” (tryb ${v.mode})`:`${hex(v.addr)} → ${lbl(v)}`;
      case'arr':{
        if(ty.of.k==='char'){let s='';for(const c of v){if(c===0)break;s+=c===undefined?'?':c>31&&c<127?String.fromCharCode(c):'·'}return`"${s}"`+(v.includes(0)?'':' (bez \\0!)')}
        return'{'+v.slice(0,12).map(x=>show(ty.of,x)).join(', ')+(v.length>12?', …':'')+'}';
      }
      case'struct':return'{'+st(ty).fields.map(f=>`${f.n}=${show(f.ty,v[f.n])}`).join(', ')+'}';
    }
    return fmt(v,ty.k);
  }
  const short=(ty,v)=>ty.k==='ptr'?(v===null?'NULL':v.file?v.name:'→'+lbl(v)):ty.k==='struct'?'{…}':show(ty,v);

  // ---- memory
  const find=(n,line)=>{
    const top=frames.length?frames[frames.length-1].base:0;
    for(let i=vars.length-1;i>=top;i--)if(vars[i].n===n)return vars[i];
    for(let i=G-1;i>=0;i--)if(vars[i].n===n)return vars[i];
    throw rt(`zmienna „${n}” nie istnieje – nie została zadeklarowana albo jest poza swoim blokiem {} lub funkcją`,line);
  };
  const kill=from=>{for(let i=from;i<vars.length;i++)vars[i].dead=true};
  const mark=()=>[vars.length,off],release=m=>{kill(m[0]);vars.length=m[0];off=m[1]};
  function declare(ty,n,v){
    const al=alignOf(ty);let a;
    if(frames.length){off=Math.ceil(off/al)*al;a=0x7ffc1000+off;off+=sizeOf(ty)}
    else{goff=Math.ceil(goff/al)*al;a=0x404000+goff;goff+=sizeOf(ty)}
    const o={n,ty,v,id:++nid,fr:frames.length-1,a,dead:false};vars.push(o);return o;
  }
  const varLoc=o=>({h:o,k:'v',root:o,label:o.n,addr:o.a});
  function getL(l,line){
    if(l.root&&l.root.dead)throw rt('ten wskaźnik wskazuje na zmienną, która już nie istnieje (np. adres zmiennej lokalnej zwrócony z funkcji)',line);
    if(Array.isArray(l.h)&&(l.k<0||l.k>=l.h.length))throw rt(`indeks ${l.k} jest poza tablicą (rozmiar ${l.h.length}, poprawne indeksy 0…${l.h.length-1}) – w prawdziwym C to niezdefiniowane zachowanie!`,line);
    return l.h[l.k];
  }
  function setL(l,x,line){
    getL(l,line);
    if(l.root&&l.root.ro)throw rt('nie wolno zmieniać literału tekstowego "…"',line);
    l.h[l.k]=x;
  }
  function strLoc(s){
    const arr=[...s].map(c=>c.charCodeAt(0)).concat(0);
    const o={n:`"${s.length>10?s.slice(0,10)+'…':s}"`,ty:{k:'arr',of:T_CHR,len:arr.length},v:arr,a:0x402000+(sOff+=arr.length),dead:false,ro:true};
    return{h:arr,k:0,root:o,base:o.n,addr:o.a};
  }
  function ptrAdd(pv,n,line){
    if(pv.v===null||pv.v===undefined)throw rt('arytmetyka na wskaźniku NULL',line);
    const l=pv.v;
    if(!Array.isArray(l.h)){if(n===0)return pv;throw rt('arytmetyka wskaźników ma sens tylko wewnątrz tablicy',line)}
    return{ty:pv.ty,v:{h:l.h,k:l.k+n,root:l.root,base:l.base,addr:l.addr+n*sizeOf(pv.ty.to)}};
  }
  function coerce(ty,rv,line){
    const k=ty.k;
    if(k==='ptr'){
      if(rv.ty.k==='ptr')return rv.v;
      if(rv.ty.k==='str')return strLoc(rv.v);
      if(isNum(rv.ty)&&rv.v===0)return null;
      throw rt('do wskaźnika można wpisać tylko adres (&x, nazwę tablicy) albo NULL',line);
    }
    if(k==='struct'){
      if(rv.ty.k!=='struct'||rv.ty.name!==ty.name)throw rt(`niezgodne typy: oczekiwano ${tname(ty)}`,line);
      return copyVal(ty,rv.v);
    }
    if(k==='arr')throw rt('całej tablicy nie można przypisać – kopiuj element po elemencie (napisy: strcpy)',line);
    if(!isNum(rv.ty))throw rt(rv.ty.k==='ptr'?'do zmiennej liczbowej nie można wpisać adresu (wskaźnika)':'do zmiennej liczbowej nie można wpisać tekstu ani struktury',line);
    return conv(ty,rv.v);
  }
  function initVal(ty,init,line){
    if(ty.k==='arr'){
      if(init.n==='str'){
        if(ty.of.k!=='char')throw rt('napisem "…" można inicjalizować tylko tablicę char',line);
        const cs=[...init.v].map(c=>c.charCodeAt(0));
        if(cs.length+1>ty.len)throw rt(`napis „${init.v}” nie mieści się w char[${ty.len}] (potrzeba ${cs.length+1} miejsc razem ze znakiem \\0)`,line);
        const a=mkVal(ty,true);cs.forEach((c,i)=>a[i]=c);return a;
      }
      if(init.n!=='list')throw rt('tablicę inicjalizuje się listą {…}',line);
      if(init.items.length>ty.len)throw rt(`za dużo wartości w {…}: tablica ma ${ty.len} elementów`,line);
      const a=mkVal(ty,true);init.items.forEach((it,i)=>a[i]=initVal(ty.of,it,line));return a;
    }
    if(ty.k==='struct'&&init.n==='list'){
      const s=st(ty,line),o=mkVal(ty,true);
      if(init.items.length>s.fields.length)throw rt(`za dużo wartości w {…}: ${tname(ty)} ma ${s.fields.length} pól`,line);
      init.items.forEach((it,i)=>o[s.fields[i].n]=initVal(s.fields[i].ty,it,line));return o;
    }
    if(init.n==='list')throw rt('klamry {…} służą do inicjalizacji tablic i struktur',line);
    return coerce(ty,evalx(init),line);
  }

  // ---- steps
  const mk=(line,note)=>({line,note,out,stack:frames.map(f=>f.label),
    vars:vars.map(o=>({n:o.n,t:tname(o.ty),a:hex(o.a),id:o.id,fr:o.fr,val:show(o.ty,o.v)})),
    files:files.size?[...files].map(([n,c])=>({n,c})):undefined});
  const step=(line,note)=>{
    if(steps.length>=3000)throw rt('Program wykonuje się zbyt długo (ponad 3000 kroków) – czy pętla nie jest nieskończona?',line);
    steps.push(mk(line,[note,...ev].filter(Boolean).join(' · ')));ev=[];
  };

  // ---- expressions
  const rank=(a,b)=>a.ty.k==='double'||b.ty.k==='double'?T_DBL:a.ty.k==='float'||b.ty.k==='float'?T_FLT:(a.ty.u||b.ty.u)?T_UINT:T_INT;
  const tr=x=>x.ty.k==='ptr'?x.v!==null:x.v!==0;
  const CONST=dict({NULL:{ty:ptrTo(T_VOID),v:null},EOF:{ty:T_INT,v:-1},INT_MAX:{ty:T_INT,v:2147483647},INT_MIN:{ty:T_INT,v:-2147483648},M_PI:{ty:T_DBL,v:Math.PI}});
  function ptrOp(op,a,b,line){
    const ap=a.ty.k==='ptr',bp=b.ty.k==='ptr';
    if(op==='+'||op==='-'){
      if(ap&&isNum(b.ty))return ptrAdd(a,op==='+'?b.v:-b.v,line);
      if(op==='+'&&bp&&isNum(a.ty))return ptrAdd(b,a.v,line);
      if(op==='-'&&ap&&bp){
        if(!a.v||!b.v||a.v.h!==b.v.h)throw rt('odejmować można tylko wskaźniki do tej samej tablicy',line);
        return{ty:T_INT,v:a.v.k-b.v.k};
      }
    }
    if(['==','!=','<','>','<=','>='].includes(op)){
      const na=ap?a.v:(a.v===0?null:undefined),nb=bp?b.v:(b.v===0?null:undefined);
      if(na!==undefined&&nb!==undefined){
        if(op==='=='||op==='!=')return{ty:T_INT,v:+((na===nb||(na&&nb&&na.h===nb.h&&na.k===nb.k))===(op==='=='))};
        if(na&&nb&&na.h===nb.h){const x=na.k,y=nb.k;return{ty:T_INT,v:+(op==='<'?x<y:op==='>'?x>y:op==='<='?x<=y:x>=y)}}
      }
    }
    throw rt('tego działania nie można wykonać na wskaźnikach',line);
  }
  function arith(op,a,b,line){
    if(a.ty.k==='ptr'||b.ty.k==='ptr')return ptrOp(op,a,b,line);
    if(!isNum(a.ty)||!isNum(b.ty))throw rt('na tekstach i strukturach nie da się liczyć',line);
    const x=a.v,y=b.v,cmp={'<':x<y,'>':x>y,'<=':x<=y,'>=':x>=y,'==':x===y,'!=':x!==y};
    if(op in cmp)return{ty:T_INT,v:+cmp[op]};
    const t=rank(a,b);let r;
    if('&|^<<>>'.includes(op)&&op!=='<'&&op!=='>'){
      if(t.k!=='int')throw rt('operatory bitowe działają tylko na liczbach całkowitych',line);
      r=op==='&'?x&y:op==='|'?x|y:op==='^'?x^y:op==='<<'?x<<y:t.u?x>>>y:x>>y;
      return{ty:t,v:conv(t,r)};
    }
    if(op==='+')r=x+y;else if(op==='-')r=x-y;else if(op==='*')r=x*y;
    else if(op==='/'){if(t.k==='int'&&y===0)throw rt('dzielenie przez zero!',line);r=t.k==='int'?Math.trunc(x/y):x/y}
    else{if(t.k!=='int')throw rt('operator % działa tylko na liczbach całkowitych',line);if(y===0)throw rt('dzielenie przez zero (reszta z 0)!',line);r=x%y}
    return{ty:t,v:conv(t,r)};
  }
  function lval(e){
    switch(e.n){
      case'var':{const o=find(e.name,e.line);return{l:varLoc(o),ty:o.ty}}
      case'index':{
        const b=evalx(e.b),i=evalx(e.i);
        if(b.ty.k!=='ptr')throw rt('indeksować [ ] można tylko tablicę lub wskaźnik',e.line);
        if(!isNum(i.ty))throw rt('indeks musi być liczbą całkowitą',e.line);
        if(b.ty.to.k==='arr')throw rt('tablice wielowymiarowe nie są obsługiwane w pracowni',e.line);
        return{l:ptrAdd(b,i.v,e.line).v,ty:b.ty.to};
      }
      case'member':{
        let bl,sty;
        if(e.arrow){
          const pv=evalx(e.b);
          if(pv.ty.k!=='ptr'||pv.ty.to.k!=='struct')throw rt('-> wymaga wskaźnika do struktury',e.line);
          if(pv.v===null)throw rt('dereferencja wskaźnika NULL (segmentation fault)',e.line);
          bl=pv.v;sty=pv.ty.to;
        }else{
          const x=lval(e.b);
          if(x.ty.k!=='struct')throw rt('operator „.” wymaga struktury (dla wskaźnika użyj ->)',e.line);
          bl=x.l;sty=x.ty;
        }
        const s=st(sty,e.line),f=s.fields.find(f=>f.n===e.f);
        if(!f)throw rt(`${tname(sty)} nie ma pola „${e.f}”`,e.line);
        return{l:{h:getL(bl,e.line),k:e.f,root:bl.root,label:`${lbl(bl)}.${e.f}`,addr:bl.addr+layout(s).offs[e.f]},ty:f.ty};
      }
      case'deref':{
        const pv=evalx(e.e);
        if(pv.ty.k!=='ptr')throw rt('operator * wymaga wskaźnika',e.line);
        if(pv.v===null||pv.v===undefined)throw rt('dereferencja wskaźnika NULL albo niezainicjalizowanego (segmentation fault)',e.line);
        if(pv.v.file)throw rt('FILE* nie jest zwykłym wskaźnikiem – używaj fprintf/fscanf',e.line);
        return{l:pv.v,ty:pv.ty.to};
      }
    }
    throw rt('to nie jest miejsce w pamięci, do którego można coś wpisać',e.line);
  }
  const isLvNode=n=>n==='var'||n==='index'||n==='member'||n==='deref';
  function evalx(e){
    if(isLvNode(e.n)){
      if(e.n==='var'&&e.name in CONST)return CONST[e.name];
      const lv=lval(e),x=getL(lv.l,e.line);
      if(lv.ty.k==='arr')return{ty:ptrTo(lv.ty.of),v:{h:x,k:0,root:lv.l.root,base:lbl(lv.l),addr:lv.l.addr}};
      if(x===undefined){ev.push(`UWAGA: ${lbl(lv.l)} nie ma wartości (w prawdziwym C to śmieci)`);return{ty:lv.ty,v:lv.ty.k==='ptr'?null:0}}
      return{ty:lv.ty,v:x};
    }
    switch(e.n){
      case'num':return{ty:NUMT[e.t],v:e.v};
      case'str':return{ty:T_STR,v:e.v};
      case'un':{
        const x=evalx(e.e);
        if(e.op==='!')return{ty:T_INT,v:+!tr(x)};
        if(!isNum(x.ty))throw rt(`operator ${e.op} wymaga liczby`,e.line);
        const t=rank(x,x);
        if(e.op==='~'){if(t.k!=='int')throw rt('~ działa tylko na liczbach całkowitych',e.line);return{ty:t,v:conv(t,~x.v)}}
        return{ty:t,v:conv(t,e.op==='-'?-x.v:x.v)};
      }
      case'bin':{
        if(e.op==='&&'||e.op==='||'){const a=tr(evalx(e.l));return{ty:T_INT,v:+(e.op==='&&'?a&&tr(evalx(e.r)):a||tr(evalx(e.r)))}}
        return arith(e.op,evalx(e.l),evalx(e.r),e.line);
      }
      case'tern':return tr(evalx(e.c))?evalx(e.a):evalx(e.b);
      case'cast':{
        const x=evalx(e.e);
        if(e.ty.k==='ptr'){if(x.ty.k==='ptr')return{ty:e.ty,v:x.v};if(isNum(x.ty)&&x.v===0)return{ty:e.ty,v:null};throw rt('nieobsługiwane rzutowanie na wskaźnik',e.line)}
        if(!isNum(x.ty)||!isNum(e.ty))throw rt('rzutować można tylko liczby',e.line);
        return{ty:e.ty,v:conv(e.ty,x.v)};
      }
      case'sizeof':{
        const ty=e.ty||(isLvNode(e.e.n)?lval(e.e).ty:evalx(e.e).ty);
        return{ty:T_UINT,v:sizeOf(ty)};
      }
      case'addr':{const lv=lval(e.e);return{ty:ptrTo(lv.ty),v:lv.l}}
      case'asg':{
        const lv=lval(e.t),r=evalx(e.r);
        let nv;
        if(e.op==='=')nv=coerce(lv.ty,r,e.line);
        else{
          const cur=getL(lv.l,e.line);
          nv=coerce(lv.ty,arith(e.op.slice(0,-1),{ty:lv.ty,v:cur===undefined?(lv.ty.k==='ptr'?null:0):cur},r,e.line),e.line);
        }
        setL(lv.l,nv,e.line);ev.push(`${lbl(lv.l)} ← ${show(lv.ty,nv)}`);
        return{ty:lv.ty,v:nv};
      }
      case'inc':{
        const lv=lval(e.t),cur=getL(lv.l,e.line);
        const old={ty:lv.ty,v:cur===undefined?(lv.ty.k==='ptr'?null:0):cur};
        const nv=coerce(lv.ty,arith(e.op==='++'?'+':'-',old,{ty:T_INT,v:1},e.line),e.line);
        setL(lv.l,nv,e.line);ev.push(`${lbl(lv.l)} ← ${show(lv.ty,nv)}`);
        return e.post?old:{ty:lv.ty,v:nv};
      }
      case'call':return call(e);
    }
    throw rt('nieobsługiwane wyrażenie',e.line);
  }

  // ---- library
  function cstr(a,line){
    if(a.ty.k==='str')return a.v;
    if(a.ty.k!=='ptr'||!a.v||a.v.file)throw rt('tu potrzebny jest napis (tablica char zakończona znakiem \\0)',line);
    const l=a.v;let s='';
    for(let k=l.k;;k++){
      if(Array.isArray(l.h)&&k>=l.h.length)throw rt('napis nie ma znaku końca \\0 – funkcja czyta poza tablicą',line);
      const c=getL({...l,k},line);
      if(c===0)return s;
      if(c===undefined)throw rt('napis zawiera niezainicjalizowane znaki (brak \\0)',line);
      s+=String.fromCharCode(c);
    }
  }
  function format(args,line,name){
    const f=args[0];
    if(!f||f.ty.k!=='str')throw rt(`${name} potrzebuje tekstu w cudzysłowie jako formatu`,line);
    let k=1;
    return f.v.replace(/%([-0]*)(\d+)?(?:\.(\d+))?(?:ll|l|z)?([dicfsuxXop%])/g,(_,fl,w,pr,c)=>{
      if(c==='%')return'%';
      const a=args[k++];if(!a)throw rt(`w ${name} jest więcej znaczników % niż argumentów`,line);
      let s;
      if(c==='s')s=cstr(a,line);
      else if(c==='p')s=a.ty.k==='ptr'&&a.v?hex(a.v.addr):'(nil)';
      else{
        if(!isNum(a.ty))throw rt(`%${c} wymaga liczby, a podano ${a.ty.k==='ptr'?'wskaźnik':'inny typ'}`,line);
        const n=Math.trunc(a.v);
        if(c==='d'||c==='i')s=String(a.ty.u?n|0:n);
        else if(c==='u')s=String(n>>>0);
        else if(c==='x'||c==='X'){s=(n>>>0).toString(16);if(c==='X')s=s.toUpperCase()}
        else if(c==='o')s=(n>>>0).toString(8);
        else if(c==='f')s=Number(a.v).toFixed(pr===undefined?6:+pr);
        else s=String.fromCharCode(a.v);
      }
      return w?(fl.includes('-')?s.padEnd(+w):s.padStart(+w,fl.includes('0')&&c!=='s'?'0':' ')):s;
    });
  }
  const emit=text=>{out=(out+text).slice(0,5000);ev.push('Wypisano: „'+text.replace(/\n/g,'⏎')+'”')};
  function scan(src,args,line,isFile){
    const f=args[0];
    if(!f||f.ty.k!=='str')throw rt('scanf/fscanf potrzebuje tekstu w cudzysłowie, np. "%d"',line);
    let n=0,k=1;
    for(const m of f.v.matchAll(/%(?:ll|l)?([difcsu])/g)){
      const a=args[k++];
      if(!a||a.ty.k!=='ptr'||!a.v)throw rt('scanf potrzebuje adresu zmiennej – dopisz & przed nazwą (np. &x)',line);
      const l=a.v,to=a.ty.to,c=m[1];
      while(/\s/.test(src.s[src.pos]||''))src.pos++;
      const rest=src.s.slice(src.pos);
      if(!rest){
        src.eof=true;
        if(n===0&&!isFile)throw rt('scanf nie ma już danych w polu „Dane wejściowe” – wpisz je tam przed uruchomieniem',line);
        return n===0?-1:n;
      }
      if(c==='c'){setL(l,conv(to,rest.charCodeAt(0)),line);src.pos++}
      else if(c==='s'){
        const w=/^\S+/.exec(rest)[0];
        for(let i=0;i<=w.length;i++){
          if(Array.isArray(l.h)&&l.k+i>=l.h.length)throw rt('scanf("%s") przepełnił tablicę – bufor jest za mały (w C to groźny błąd bezpieczeństwa)',line);
          setL({...l,k:l.k+i},i<w.length?w.charCodeAt(i):0,line);
        }
        src.pos+=w.length;
      }else{
        const mm=rest.match(c==='f'?/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/:/^[+-]?\d+/);
        if(!mm)return n;
        src.pos+=mm[0].length;setL(l,conv(to,+mm[0]),line);
      }
      if(src.pos>=src.s.length)src.eof=true;
      ev.push(`Wczytano ${show(to,getL(l,line))} do ${lbl(l)}`);n++;
    }
    return n;
  }
  function fileOf(a,line,need){
    if(a.ty.k!=='ptr')throw rt('oczekiwano FILE*',line);
    if(a.v===null||a.v===undefined)throw rt('FILE* jest NULL – fopen się nie powiodło, a program tego nie sprawdził (zawsze sprawdzaj wynik fopen!)',line);
    if(a.v.closed)throw rt(`plik „${a.v.name}” jest już zamknięty (fclose)`,line);
    if(need==='r'&&a.v.mode!=='r')throw rt('z tego pliku nie można czytać (otwarty do zapisu)',line);
    if(need==='w'&&a.v.mode==='r')throw rt('do tego pliku nie można pisać (otwarty do odczytu)',line);
    return a.v;
  }
  const fsrc=f=>({s:files.get(f.name)||'',pos:f.pos,eof:f.eof});
  const fback=(f,s)=>{f.pos=s.pos;f.eof=!!s.eof};
  const fput=(f,text)=>files.set(f.name,(files.get(f.name)||'')+text);
  const R=(v,ty=T_INT)=>({ty,v});
  const MATH={sqrt:Math.sqrt,pow:Math.pow,fabs:Math.abs,floor:Math.floor,ceil:Math.ceil,sin:Math.sin,cos:Math.cos,tan:Math.tan,exp:Math.exp,log:Math.log};
  const B=dict({
    printf:(a,l)=>{emit(format(a,l,'printf'));return R(0)},
    puts:(a,l)=>{emit(cstr(a[0],l)+'\n');return R(0)},
    putchar:(a)=>{emit(String.fromCharCode(a[0].v));return R(a[0].v)},
    scanf:(a,l)=>R(scan(stdin,a,l,false)),
    strlen:(a,l)=>R(cstr(a[0],l).length,T_UINT),
    strcmp:(a,l)=>{const x=cstr(a[0],l),y=cstr(a[1],l);return R(x<y?-1:x>y?1:0)},
    strcpy:(a,l)=>{
      const s=cstr(a[1],l),d=a[0].v;
      for(let i=0;i<=s.length;i++){
        if(Array.isArray(d.h)&&d.k+i>=d.h.length)throw rt('strcpy: za mało miejsca w tablicy docelowej – przepełnienie bufora!',l);
        setL({...d,k:d.k+i},i<s.length?s.charCodeAt(i):0,l);
      }
      return a[0];
    },
    abs:(a)=>R(Math.abs(a[0].v)),
    exit:(a,l)=>{throw{exit:true,code:a[0]?a[0].v:0,line:l}},
    fopen:(a,l)=>{
      const name=cstr(a[0],l),mode=cstr(a[1],l)[0];
      if(!'rwa'.includes(mode))throw rt('tryb fopen to "r", "w" lub "a"',l);
      let f=null;
      if(mode==='r'){if(files.has(name))f={file:true,name,mode,pos:0,eof:false,closed:false}}
      else{files.set(name,mode==='w'?'':files.get(name)||'');f={file:true,name,mode,pos:0,eof:false,closed:false}}
      ev.push(f?`fopen(„${name}”, „${mode}”) → plik otwarty`:`fopen(„${name}”, „${mode}”) → NULL (plik nie istnieje)`);
      return R(f,ptrTo({k:'file'}));
    },
    fclose:(a,l)=>{const f=fileOf(a[0],l);f.closed=true;ev.push(`plik „${f.name}” zamknięty`);return R(0)},
    fprintf:(a,l)=>{const f=fileOf(a[0],l,'w'),t=format(a.slice(1),l,'fprintf');fput(f,t);ev.push(`Zapisano do „${f.name}”: „${t.replace(/\n/g,'⏎')}”`);return R(t.length)},
    fputs:(a,l)=>{const f=fileOf(a[1],l,'w');fput(f,cstr(a[0],l));return R(0)},
    fputc:(a,l)=>{const f=fileOf(a[1],l,'w');fput(f,String.fromCharCode(a[0].v));return R(a[0].v)},
    fscanf:(a,l)=>{const f=fileOf(a[0],l,'r'),s=fsrc(f),n=scan(s,a.slice(1),l,true);fback(f,s);return R(n)},
    fgetc:(a,l)=>{const f=fileOf(a[0],l,'r'),s=files.get(f.name)||'';if(f.pos>=s.length){f.eof=true;return R(-1)}return R(s.charCodeAt(f.pos++))},
    fgets:(a,l)=>{
      const f=fileOf(a[2],l,'r'),s=files.get(f.name)||'',buf=a[0].v,n=a[1].v;
      if(f.pos>=s.length){f.eof=true;return R(null,a[0].ty)}
      let t='';while(f.pos<s.length&&t.length<n-1){const c=s[f.pos++];t+=c;if(c==='\n')break}
      for(let i=0;i<=t.length;i++){
        if(Array.isArray(buf.h)&&buf.k+i>=buf.h.length)throw rt('fgets: bufor za mały',l);
        setL({...buf,k:buf.k+i},i<t.length?t.charCodeAt(i):0,l);
      }
      return a[0];
    },
    feof:(a,l)=>R(+!!fileOf(a[0],l).eof)
  });
  function call(e){
    if(e.name==='assert'){
      if(e.args.length!==1)throw rt('assert przyjmuje jeden argument',e.line);
      if(!tr(evalx(e.args[0])))throw rt(`assert nie powiódł się: ${e.args[0].src} (warunek jest fałszywy – tu jest błąd w programie lub teście)`,e.line);
      return R(0,T_VOID);
    }
    const args=e.args.map(evalx),fn=funcs[e.name];
    if(fn){
      if(!(declPos[e.name]<e.pos))throw rt(`funkcja „${e.name}” jest użyta, zanim została zadeklarowana – dopisz jej prototyp przed main (deklaracja ≠ definicja)`,e.line);
      return callUser(fn,args,e);
    }
    if(e.name in B)return B[e.name](args,e.line);
    if(e.name in MATH){if(!args.every(a=>isNum(a.ty)))throw rt(`${e.name} oczekuje liczb`,e.line);return R(MATH[e.name](...args.map(a=>a.v)),T_DBL)}
    throw rt(`nieznana funkcja „${e.name}”`,e.line);
  }
  function callUser(fn,args,e){
    if(!fn.body)throw rt(`funkcja „${fn.name}” ma tylko prototyp, a nie ma ciała (definicji)`,e.line);
    if(args.length!==fn.params.length)throw rt(`funkcja „${fn.name}” przyjmuje ${fn.params.length} argumentów, a podano ${args.length}`,e.line);
    if(frames.length>=100)throw rt('Przepełnienie stosu (stack overflow) – rekurencja bez warunku zakończenia?',e.line);
    const vals=fn.params.map((p,i)=>coerce(p.ty,args[i],e.line));
    const saved=ev,label=`${fn.name}(${vals.map((v,i)=>short(fn.params[i].ty,v)).join(', ')})`;
    ev=[];frames.push({label,base:vars.length,off});
    fn.params.forEach((p,i)=>declare(p.ty,p.name,vals[i]));
    step(fn.line,`Wywołanie ${label}: na stosie powstaje nowa ramka, parametry dostają KOPIE wartości`);
    const r=exec(fn.body),had=r&&'ret'in r;
    if(!had)step(fn.body.endLine,`Koniec funkcji ${fn.name} – ramka znika ze stosu`);
    const f=frames.pop();kill(f.base);vars.length=f.base;off=f.off;ev=saved;
    if(fn.ret.k==='void')return R(0,T_VOID);
    const rv=had&&r.ret?coerce(fn.ret,r.ret,e.line):mkVal(fn.ret,true);
    ev.push(`${label} zwróciło ${short(fn.ret,rv)}`);
    return{ty:fn.ret,v:rv};
  }

  // ---- statements
  const yes=c=>c?'prawda – wykonujemy ciało':'fałsz – koniec';
  function exec(s){
    switch(s.n){
      case'block':{const m=mark();for(const x of s.body){const r=exec(x);if(r){release(m);return r}}release(m);return}
      case'decl':{
        const notes=[];
        for(const it of s.items){
          const v=it.init?initVal(it.ty,it.init,s.line):mkVal(it.ty,!frames.length);
          declare(it.ty,it.name,v);
          notes.push(`Powstaje zmienna ${it.name} (${tname(it.ty)})`+(it.init?` o wartości ${show(it.ty,v)}`:frames.length?' – bez wartości, więc leżą w niej śmieci':' – zmienne globalne startują od zera'));
        }
        return step(s.line,notes.join('. '));
      }
      case'expr':evalx(s.e);return step(s.line,ev.length?'':`Wykonano: ${s.e.src}`);
      case'if':{
        const c=tr(evalx(s.c));step(s.line,`Warunek ${s.c.src} → ${c?'prawda':'fałsz'}`);
        return c?exec(s.a):s.b?exec(s.b):undefined;
      }
      case'while':for(;;){
        const c=tr(evalx(s.c));step(s.line,`Warunek ${s.c.src} → ${yes(c)}`);if(!c)return;
        const r=exec(s.body);if(r==='break')return;if(r&&r!=='continue')return r;
      }
      case'do':for(;;){
        const r=exec(s.body);if(r==='break')return;if(r&&r!=='continue')return r;
        const c=tr(evalx(s.c));step(s.line,`Warunek ${s.c.src} → ${yes(c)}`);if(!c)return;
      }
      case'for':{
        const m=mark();
        if(s.init){if(s.init.n==='decl')exec(s.init);else{evalx(s.init);step(s.line,ev.length?'':`Wykonano: ${s.init.src}`)}}
        for(;;){
          if(s.cond){const c=tr(evalx(s.cond));step(s.line,`Warunek ${s.cond.src} → ${yes(c)}`);if(!c)break}
          const r=exec(s.body);if(r==='break')break;if(r&&r!=='continue'){release(m);return r}
          if(s.step){evalx(s.step);step(s.line,'Koniec obrotu')}
        }
        return release(m);
      }
      case'break':step(s.line,'break – wychodzimy z pętli');return'break';
      case'continue':step(s.line,'continue – przechodzimy do następnego obrotu');return'continue';
      case'return':{
        const rv=s.e?evalx(s.e):null;
        step(s.line,`return${rv?' '+short(rv.ty,rv.v):''} – ${frames.length===1?'koniec programu':'wracamy do miejsca wywołania'}`);
        return{ret:rv};
      }
    }
  }
  try{globals.forEach(exec);G=vars.length;callUser(funcs.main,[],{line:funcs.main.line})}
  catch(e){
    if(e.exit)steps.push(mk(e.line,`exit(${e.code}) – natychmiastowy koniec programu`));
    else{if(!e.msg)throw e;error=e.msg;steps.push(mk(e.line,'❌ Błąd wykonania: '+e.msg))}
  }
  return{code:src.split('\n'),steps,error};
}
if(typeof module!=='undefined')module.exports={runC,fmt,lex,parse};

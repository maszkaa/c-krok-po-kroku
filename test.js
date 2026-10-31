// node test.js — checks the C interpreter embedded in index.html
const assert = require('assert');
const { runC } = require('./interp.js');
const last = (src, inp = '') => { const T = runC(src, inp); return { T, s: T.steps[T.steps.length - 1] }; };
const main = b => `#include <stdio.h>\nint main(void) {\n${b}\n}`;

assert.strictEqual(last(main('int s=0; for(int i=1;i<=4;i++){s+=i;} printf("S=%d\\n",s); return 0;')).s.out, 'S=10\n');
assert.strictEqual(last(main('int a,b; scanf("%d %d",&a,&b); printf("%d",a*b);'), '7 5').s.out, '35');
assert.strictEqual(last(main('float f=7/2; printf("%.1f %.1f",f,(float)7/2);')).s.out, '3.0 3.5');
assert.strictEqual(last(main('int n=5,w=1; while(n>1){w*=n;n--;} printf("%d",w);')).s.out, '120');
assert.strictEqual(last(main('int i=0; do{i++; if(i==2)continue; if(i>3)break;}while(1); printf("%d",i);')).s.out, '4');
assert.strictEqual(last(main('char c=65; printf("%c%d",c,c+1);')).s.out, 'A66');
const fns = b => `#include <stdio.h>\n${b}`;
const fact = 'int f(int n){ if(n<=1){return 1;} return n*f(n-1); }\nint main(void){ printf("%d",f(5)); return 0; }';
assert.strictEqual(last(fns(fact)).s.out, '120');
assert.strictEqual(Math.max(...runC(fns(fact), '').steps.map(s => s.stack.length)), 6);
assert.strictEqual(last(fns('void g(int x){x=9;}\nint main(void){int a=1; g(a); printf("%d",a);}')).s.out, '1');
assert.strictEqual(last(fns('int c=0;\nint d(int a);\nint main(void){printf("%d",d(2)+c);}\nint d(int a){c++;return a*2;}')).s.out, '5');
assert.ok(last(fns('int main(void){printf("%d",d(2));}\nint d(int a){return a;}')).T.error.includes('zadeklarowana'));
assert.ok(last(fns('int f(int n){return f(n+1);}\nint main(void){f(0);}')).T.error.includes('stosu'));
assert.strictEqual(last(fns('int main(void){printf("%.1f",sqrt(16)+pow(2,3));}')).s.out, '12.0');
assert.ok(last(main('int x=1/0;')).T.error.includes('zero'));
assert.ok(last(main('while(1){}')).T.error.includes('3000'));
assert.ok(last(main('y=3;')).T.error.includes('nie istnieje'));
assert.ok(last(main('int a; scanf("%d",&a);')).T.error.includes('Dane wejściowe'));
assert.throws(() => runC(main('int x = 3'), ''), e => e.line === 3 && /brakuje/.test(e.msg));
// arrays, pointers, structs, bits, files
const out = (b, i, f) => { const T = runC(main(b), i, f); return T.steps[T.steps.length - 1].out; };
const err = (b, i) => runC(main(b), i).error;
assert.strictEqual(out('int t[3]={1,2}; printf("%d %d %d",t[0],t[1],t[2]);'), '1 2 0');
assert.strictEqual(out('int t[]={4,5,6}; printf("%d",(int)sizeof(t));'), '12');
assert.ok(err('int t[3]={1,2,3}; int i=3; printf("%d",t[i]);').includes('poza tablicą'));
assert.strictEqual(out('int x=1; int *p=&x; *p=7; printf("%d",x);'), '7');
assert.strictEqual(out('int t[3]={1,2,3}; int *p=t; p++; printf("%d %d",*p,*(p+1));'), '2 3');
assert.ok(err('int *p=NULL; *p=1;').includes('NULL'));
assert.strictEqual(out('char s[10]="Ala"; s[0]=\'E\'; printf("%s %d",s,(int)strlen(s));'), 'Ela 3');
assert.strictEqual(out('char s[10]; scanf("%s",s); printf("[%s]",s);', 'hej'), '[hej]');
assert.strictEqual(last(fns('struct P{int x;int y;};\nvoid z(struct P *p){p->x=0;}\nint main(void){struct P a={5,6}; z(&a); printf("%d%d",a.x,a.y);}')).s.out, '06');
assert.strictEqual(last(fns('struct S{char c;int i;};\nint main(void){printf("%d",(int)sizeof(struct S));}')).s.out, '8');
assert.strictEqual(last(fns('typedef struct{int a;}T;\nint main(void){T t={3}; printf("%d",t.a);}')).s.out, '3');
assert.ok(last(fns('int *f(void){int x=1;return &x;}\nint main(void){int *p=f(); printf("%d",*p);}')).T.error.includes('nie istnieje'));
assert.strictEqual(out('int x=2147483647; x=x+1; printf("%d",x);'), '-2147483648');
assert.strictEqual(out('unsigned int u=0; u=u-1; printf("%u",u);'), '4294967295');
assert.strictEqual(out('int a=12; printf("%d %d %d %d",a&10,a|3,a^5,a<<2);'), '8 15 9 48');
assert.strictEqual(out('FILE *f=fopen("a.txt","w"); fprintf(f,"%d 5",7); fclose(f); f=fopen("a.txt","r"); int x,y; fscanf(f,"%d %d",&x,&y); printf("%d",x+y);'), '12');
assert.strictEqual(out('FILE *f=fopen("d.txt","r"); int x,s=0; while(fscanf(f,"%d",&x)==1){s+=x;} printf("%d",s);', '', { 'd.txt': '1 2 3' }), '6');
assert.strictEqual(out('FILE *f=fopen("nie.txt","r"); if(f==NULL){printf("brak");}'), 'brak');
assert.ok(err('assert(1==2);').includes('assert'));
assert.strictEqual(out('int n; int r=scanf("%d",&n); printf("%d",r);', 'abc'), '0');
assert.strictEqual(runC(fns('#define N 3\nint main(void){int t[N]; printf("%d",(int)sizeof(t));}'), '').steps.pop().out, '12');
// every lesson example must run; titles with ❌ must stop with an error on purpose
const LESSONS = [{ id: 'l3' }, { id: 'l4' }, { id: 'l5' }], COMING = [0];
const lessonSrc = require('fs').readFileSync(__dirname + '/lessons-c.js', 'utf8');
new Function('LESSONS', 'COMING', 'prog5', '$', 'esc', lessonSrc)(LESSONS, COMING, (title, code, input = '', files) => ({ title, code, input, files }), () => ({}), s => s);
let n = 0;
let tn = 0;
const norm = s => s.replace(/\s+/g, ' ').trim();
for (const l of LESSONS) for (const t of l.tasks || []) {
  for (const c of t.tests) {
    const T = runC(t.sol, c.i || '', c.f);
    assert.ok(!T.error, `${l.id} ${t.title}: ${T.error}`);
    assert.strictEqual(norm(T.steps.pop().out), norm(c.o), `${l.id} ${t.title} [${c.i}]`);
  }
  tn++;
}
assert.strictEqual(tn, 10, 'every lesson needs a task');
for (const l of LESSONS) for (const ex of l.examples || []) {
  const T = runC(ex.code, ex.input, ex.files);
  assert.strictEqual(!!T.error, ex.title.includes('❌'), `${ex.title}: ${T.error}`);
  n++;
}
console.log('OK, examples:', n);

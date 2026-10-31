// node test.js — checks the C interpreter embedded in index.html
const assert = require('assert');
const html = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
const { runC } = new Function(html.match(/<script>([\s\S]*)<\/script>/)[1] + ';return{runC}')();
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
assert.throws(() => runC(main('int t[3];'), ''), e => /tablice/.test(e.msg));
console.log('OK');

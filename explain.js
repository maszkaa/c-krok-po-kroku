// Plain-language, line-by-line explainer for the C subset used in the app.
const EX_TP={int:'liczba całkowita',float:'liczba z ułamkiem',double:'liczba z ułamkiem (dokładniejsza)',char:'pojedynczy znak',void:'nic','unsigned int':'liczba całkowita bez minusa',unsigned:'liczba całkowita bez minusa',FILE:'plik'};
const exTp=t=>{t=t.replace(/\s+/g,' ').trim();return EX_TP[t]||(/^struct /.test(t)?`struktura ${t.slice(7)}`:t)};
const EX_PCT={d:'liczba całkowita',i:'liczba całkowita',u:'liczba bez znaku',f:'liczba z ułamkiem',c:'znak',s:'napis',x:'liczba szesnastkowo',p:'adres'};
const EX_LIB={'stdio.h':'wypisywania i wczytywania (printf, scanf, pliki)','string.h':'napisów (np. strlen, strcpy)','math.h':'matematyki (sqrt, pow, …)','stdlib.h':'różnych przydatnych funkcji','assert.h':'testów (assert)'};

function exSplit(s){ // split on top-level commas
  const out=[];let d=0,q='',cur='';
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(q){cur+=c;if(c==='\\'){cur+=s[++i]||''}else if(c===q)q='';continue}
    if(c==='"'||c==="'"){q=c;cur+=c;continue}
    if('([{'.includes(c))d++;if(')]}'.includes(c))d--;
    if(c===','&&d===0){out.push(cur.trim());cur='';continue}
    cur+=c;
  }
  if(cur.trim()||out.length)out.push(cur.trim());
  return out;
}
const exCond=c=>c.replace(/\s==\s/g,' jest równe ').replace(/\s!=\s/g,' jest różne od ').replace(/\s>=\s/g,' jest co najmniej ').replace(/\s<=\s/g,' jest co najwyżej ').replace(/\s>\s/g,' jest większe niż ').replace(/\s<\s/g,' jest mniejsze niż ').replace(/\s&&\s/g,' ORAZ ').replace(/\s\|\|\s/g,' LUB ');
const exFopen=a=>{const mode=(a[1]||'').replace(/"/g,'')[0];return `otwiera plik ${a[0]} ${mode==='r'?'do czytania':mode==='w'?'do zapisu (stara zawartość jest kasowana)':'do dopisywania'}. Jeśli się nie uda, wynik to NULL`};
const exPlainCond=c=>`Pytanie: czy ${exCond(c)}?`+(/NULL/.test(c)?' (NULL znaczy „nic” – tu sprawdzamy, czy się nie udało).':'');

function exDeclarator(type,d,global){
  const m=/^(\*+)?\s*(\w+)\s*(?:\[([^\]]*)\])?\s*(?:=\s*(.+))?$/.exec(d.trim());
  if(!m)return null;
  const[,star,name,len,init]=m,tp=exTp(type);
  if(len!==undefined){
    if(type==='char'&&init&&init[0]==='"')return `napis \`${name}\` (tablica znaków) z tekstem ${init} i znakiem końca \\0`;
    return `tablicę \`${name}\`: ${len?'`'+len+'`':'kilka'} elementów (${tp}) leżących w pamięci obok siebie, numerowanych od 0`+(init?' – od razu wpisuje wartości z klamr':', na razie bez wartości (śmieci)');
  }
  if(type==='FILE'&&star){
    const f=init&&/fopen\s*\((.*)\)/.exec(init);
    if(f)return `uchwyt do pliku \`${name}\` i ${exFopen(exSplit(f[1]))}`;
    return `uchwyt do pliku \`${name}\``;
  }
  if(star)return `wskaźnik \`${name}\` – zmienną, w której leży ADRES innej zmiennej (typ: ${tp})`+(!init?', na razie bez adresu':init==='NULL'?' i ustawia go na NULL („na nic”)':init[0]==='&'?` i od razu ustawia go na adres zmiennej \`${init.slice(1)}\`, czyli wskazuje na nią`:` i ustawia go na \`${init}\``);
  const kind=/^struct/.test(type)?`zmienną \`${name}\` (${tp})`:`zmienną \`${name}\` (${tp})`;
  return kind+(init?(init[0]==='{'?` i od razu wpisuje wartości pól po kolei: \`${init}\``:` z wartością początkową \`${init}\``+(/\w+\s*\(/.test(init)?' (wynik wywołania funkcji)':'')):' bez wartości początkowej – na razie leżą w niej śmieci');
}

function explainCode(lines){
  const out=[],aliases=[];
  lines.forEach(l=>{const m=/^\s*typedef\b.*?\b(\w+)\s*;\s*$/.exec(l);if(m)aliases.push(m[1])});
  const typeRe=new RegExp('^(unsigned\\s+int|unsigned|int|float|double|char|FILE|struct\\s+\\w+'+aliases.map(a=>'|'+a).join('')+')\\b');
  let depth=0,fn=null,inStruct=false,structDepth=-1;
  lines.forEach((raw,idx)=>{
    const n=idx+1,s=raw.replace(/\s*\/\/.*$/,'').trim();
    const cm=/^\s*\/\/(.*)$/.exec(raw);
    const stripped=s.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,'""');
    const opens=(stripped.match(/\{/g)||[]).length,closes=(stripped.match(/\}/g)||[]).length;
    const add=t=>out.push({n,code:raw.trim(),text:t});
    let m;
    if(cm){add('Komentarz – komputer go pomija. To notatka dla człowieka (np. podpowiedź, co tu wpisać).')}
    else if(!s){}
    else if(m=/^#\s*include\s*<([\w.]+)>/.exec(s))add(`Dołącza bibliotekę ${m[1]} – zbiór gotowych poleceń do ${EX_LIB[m[1]]||'różnych zadań'}. Bez tego komputer nie znałby tych poleceń.`);
    else if(m=/^#\s*define\s+(\w+)\s+(.+)$/.exec(s))add(`Nadaje nazwę \`${m[1]}\` wartości \`${m[2]}\`. Wszędzie, gdzie napiszesz ${m[1]}, komputer podstawi ${m[2]} – a zmienić ją możesz w jednym miejscu.`);
    else if(m=/^typedef\b([^{]*)$/.exec(s))add('Nadaje nowemu typowi krótszą nazwę, żeby nie pisać za każdym razem długiego opisu.');
    else if(/^struct\s+\w+\s*\{$/.test(s)||/^typedef\s+struct/.test(s)){inStruct=true;structDepth=depth;add(`Opisuje własny typ danych (strukturę) \`${s.split(/\s+/)[1]}\` złożony z kilku pól. To tylko wzór: zmienna powstanie dopiero później.`)}
    else if(/^\}\s*;?$/.test(s)||/^\}\s*\w+;$/.test(s)){/* closing brace: skipped */ }
    else if(inStruct&&(m=/^(.+?)\s+(\*?\w+(?:\[\w*\])?)\s*;$/.exec(s)))add(`Pole \`${m[2]}\` w strukturze (${exTp(m[1])}). Każda zmienna tego typu będzie miała takie pole.`);
    else if(m=/^(unsigned\s+int|int|float|double|char|void|struct\s+\w+)\s*(\*?)\s*(\w+)\s*\(([^)]*)\)\s*(\{|;)?$/.exec(s)){
      const[,rt,star,name,params,end]=m;
      const ps=params.trim()===''||params.trim()==='void'?'nie dostaje żadnych danych':'dostaje: '+exSplit(params).map(p=>{const q=/^(.*?)(\*?\s*\w*(?:\[\])?)$/.exec(p.trim());return `\`${p.trim()}\` (${/\[\]$/.test(p.trim())?'tablica: '+exTp(q[1])+' – funkcja dostaje adres jej początku, więc zmienia oryginał':/\*\s*\w*$/.test(p.trim())?'adres zmiennej typu '+exTp(q[1].replace('*','').trim()):exTp(q[1])})`}).join(', ');
      if(end==='{'){
        if(depth===0)fn=name;
        add(name==='main'?'Tu zaczyna się program: komputer zawsze wykonuje najpierw funkcję `main`. Klamra `{` otwiera jej ciało – wszystko do pasującej `}`.'
          :`Tworzy funkcję \`${name}\` – kawałek programu z własną nazwą, który można uruchomić (wywołać) w dowolnym miejscu. Funkcja ${ps}; ${rt==='void'?'nic nie zwraca':'zwraca wynik: '+(star?'adres zmiennej typu '+exTp(rt):exTp(rt))}.`);
      }else add(`Prototyp (deklaracja): zapowiada, że funkcja \`${name}\` istnieje, a jej ciało będzie dalej w pliku. Dzięki temu można ją wywołać wcześniej.`);
    }
    else if(m=/^return\b\s*(.*);$/.exec(s))add(m[1]===''?'Kończy funkcję bez oddawania wyniku.':fn==='main'?`Kończy program. Wartość \`${m[1]}\` to „kod wyjścia”: 0 znaczy, że wszystko poszło dobrze, inna liczba – że wystąpił błąd.`:`Kończy funkcję i oddaje wynik \`${m[1]}\` temu, kto ją wywołał.`);
    else if(m=/^\}?\s*else\s+if\s*\((.*)\)\s*\{?$/.exec(s))add(`„Inaczej, jeśli…”: sprawdzane tylko wtedy, gdy wcześniejsze warunki były fałszywe. ${exPlainCond(m[1])} Jeśli tak, wykonuje się ten blok.`);
    else if(/^\}?\s*else\s*\{?$/.test(s))add('„W przeciwnym razie”: ten blok wykona się, gdy żaden wcześniejszy warunek nie był prawdziwy.');
    else if(m=/^if\s*\((.*)\)\s*\{?$/.exec(s))add(`Warunek. ${exPlainCond(m[1])} Jeśli tak (prawda), wykonuje się blok poniżej (do pasującej klamry). Jeśli nie – blok jest pomijany.`);
    else if(m=/^\}\s*while\s*\((.*)\)\s*;$/.exec(s))add(`Koniec pętli do…while. Dopiero teraz sprawdza warunek: ${exPlainCond(m[1])} Jeśli tak, wraca do \`do {\` i powtarza blok.`);
    else if(m=/^while\s*\((.*)\)\s*\{?$/.exec(s))add(`Pętla: powtarza blok poniżej, dopóki warunek jest prawdziwy. ${exPlainCond(m[1])} Warunek sprawdzany jest przed każdym obrotem – jeśli od początku jest fałszywy, blok nie wykona się wcale.`);
    else if(/^do\s*\{?$/.test(s))add('Początek pętli do…while: najpierw wykonuje blok, dopiero na końcu sprawdza warunek – więc blok wykona się co najmniej raz.');
    else if(m=/^for\s*\((.*)\)\s*\{?$/.exec(s)){
      const p=m[1].split(';').map(x=>x.trim());
      add(`Pętla \`for\` – zwykle służy do liczenia obrotów. (1) Na starcie robi raz: \`${p[0]||'nic'}\`. (2) Przed każdym obrotem sprawdza: \`${p[1]||'zawsze prawda'}\` – jeśli fałsz, pętla się kończy. (3) Po każdym obrocie robi: \`${p[2]||'nic'}\`.`);
    }
    else if(/^break\s*;$/.test(s))add('Natychmiast wychodzi z pętli – reszta obrotów jest pomijana.');
    else if(/^continue\s*;$/.test(s))add('Pomija resztę tego obrotu i przechodzi do następnego.');
    else if(m=/^assert\s*\((.*)\)\s*;$/.exec(s))add(`Test: sprawdza, czy \`${m[1]}\` jest prawdziwe. Jeśli nie, program zatrzymuje się z komunikatem o błędzie – tak wychwytujemy pomyłki.`);
    else if(m=/^(f?printf)\s*\((.*)\)\s*;$/.exec(s)){
      const a=exSplit(m[2]),isF=m[1]==='fprintf',file=isF?a.shift():null,fmtS=a.shift()||'',args=a;
      const txt=fmtS.replace(/^"|"$/g,''),specs=[...txt.matchAll(/%[-0-9.]*(?:ll|l|z)?([dicfsuxXop])/g)];
      const uniq=[...new Set(specs.map(x=>x[0]))];
      add(`${isF?`Zapisuje do pliku \`${file}\``:'Wypisuje na ekranie'} tekst ${fmtS}`+(specs.length?`. Każdy znacznik % jest po kolei zastępowany wartością: ${args.slice(0,specs.length).map(a=>'`'+a+'`').join(', ')} (${uniq.map(u=>`\`${u}\` = ${EX_PCT[u.slice(-1).toLowerCase()]||'wartość'}`).join(', ')})`:'')+(/\\n/.test(txt)?'. \`\\n\` oznacza przejście do nowej linii.':'.'));
    }
    else if(m=/^(f?scanf)\s*\((.*)\)\s*;$/.exec(s)){
      const a=exSplit(m[2]),isF=m[1]==='fscanf',file=isF?a.shift():null;a.shift();
      add(`${isF?`Czyta z pliku \`${file}\``:'Czeka, aż użytkownik wpisze dane z klawiatury,'} i zapisuje je do: ${a.map(x=>'`'+x.replace(/^&/,'')+'`').join(', ')}. Znak \`&\` znaczy „adres zmiennej” – bez niego scanf nie wiedziałby, gdzie wpisać wartość.`);
    }
    else if((m=typeRe.exec(s))&&/;$/.test(s)&&!/^\w+\s*\(/.test(s.slice(m[0].length).trim())){
      const rest=s.slice(m[0].length).replace(/;$/,'').trim(),type=m[1];
      const parts=exSplit(rest).map(d=>exDeclarator(type,d));
      if(parts.every(Boolean))add('Tworzy '+parts.join('; ')+'.'+(depth===0?' To zmienna globalna: widać ją w całym programie, startuje od zera.':''));
      else add(`Wykonuje: \`${s}\``);
    }
    else if(m=/^(\+\+|--)(\w+)\s*;$|^(\w+)(\+\+|--)\s*;$/.exec(s)){const nm=m[2]||m[3],op=m[1]||m[4];add(`${op==='++'?'Zwiększa':'Zmniejsza'} \`${nm}\` o 1.`)}
    else if((m=/^(.+?)\s*(\+=|-=|\*=|\/=|%=|<<=|>>=|&=|\|=|\^=|=)\s*(.+);$/.exec(s))&&/^[\w.\->\[\]*]+$/.test(m[1])){
      const[,t,op,rhs]=m;let txt;
      const verb={'+=':'Zwiększa','-=':'Zmniejsza','*=':'Mnoży','/=':'Dzieli'}[op];
      if(op!=='='&&verb)txt=`${verb} \`${t}\` ${op==='+='?'o':op==='-='?'o':op==='*='?'przez':'przez'} \`${rhs}\` (skrót od \`${t} = ${t} ${op[0]} ${rhs}\`).`;
      else if(op!=='=')txt=`Zmienia \`${t}\` operacją \`${op}\` z \`${rhs}\`.`;
      else if(/^fopen\s*\(/.test(rhs))txt=`Wpisuje do \`${t}\` uchwyt do pliku: ${exFopen(exSplit(rhs.replace(/^fopen\s*\(|\)$/g,'')))}.`;
      else if(t[0]==='*')txt=`Wpisuje \`${rhs}\` pod adres, na który wskazuje \`${t.slice(1)}\` – czyli zmienia zmienną docelową, a nie sam wskaźnik.`;
      else if(/\[/.test(t))txt=`Wpisuje \`${rhs}\` do elementu tablicy \`${t}\` (numer w nawiasie to indeks, liczony od 0).`;
      else if(/->|\./.test(t))txt=`Wpisuje \`${rhs}\` do pola \`${t}\` struktury.`;
      else txt=`Wpisuje do zmiennej \`${t}\` wynik: \`${rhs}\`. Najpierw liczy prawą stronę, potem wynik trafia do zmiennej (stara wartość znika). Znak = to przypisanie, nie „równa się” z matematyki.`;
      if(/\w+\s*\(/.test(rhs)&&op==='=')txt+=' Po prawej jest wywołanie funkcji – wartość, którą zwróci, trafi do zmiennej.';
      add(txt);
    }
    else if(m=/^(\w+)\s*\((.*)\)\s*;$/.exec(s)){
      const T={fclose:'Zamyka plik – kończy pracę z nim i zapewnia, że dane zostały zapisane.',fputs:'Zapisuje tekst do pliku.',fputc:'Zapisuje jeden znak do pliku.',strcpy:'Kopiuje napis do tablicy znaków.',puts:'Wypisuje napis i przechodzi do nowej linii.',putchar:'Wypisuje jeden znak.',fgets:'Czyta jedną linię z pliku do tablicy znaków.',exit:'Natychmiast kończy cały program.'};
      add(T[m[1]]||`Wywołuje funkcję \`${m[1]}\`${m[2].trim()?` z danymi \`${m[2]}\``:''}. Komputer przechodzi do jej kodu, wykonuje go i wraca tutaj. Jej wynik (jeśli jest) jest tu pomijany.`);
    }
    else add(`Wykonuje: \`${s}\``);
    depth+=opens-closes;
    if(inStruct&&depth<=structDepth)inStruct=false;
  });
  return out;
}
if(typeof module!=='undefined')module.exports={explainCode};

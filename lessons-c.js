// Lessons 6-10. Titles containing ❌ are examples that stop with an error on purpose.
COMING.length=0;

LESSONS.push({id:'l6',title:'6. Tablice i struktury',
theory:`
<p>Dotąd jedna zmienna trzymała jedną wartość. <b>Tablica</b> to wiele wartości tego samego typu leżących w pamięci obok siebie, pod jedną nazwą.</p>
<ul>
<li><code>int t[5];</code> – pięć liczb. Elementy numerujemy od <b>0</b>: <code>t[0]</code> … <code>t[4]</code>. Nie istnieje <code>t[5]</code>!</li>
<li>Inicjalizacja: <code>int t[5] = {4, 8, 15};</code> – brakujące elementy dostają 0. Rozmiar możesz policzyć: <code>sizeof(t)</code> bajtów, a elementów <code>sizeof(t) / sizeof(t[0])</code>.</li>
<li>Do przeglądania tablicy służy pętla <code>for</code> z indeksem. <code>#define N 5</code> daje nazwę stałej długości.</li>
<li>Wyjście poza tablicę w C <b>nie zgłasza błędu</b> – po prostu czyta lub psuje cudzą pamięć (niezdefiniowane zachowanie). Pracownia ostrzeże Cię, prawdziwy kompilator nie.</li>
<li>Tablica jako argument funkcji: funkcja dostaje <b>adres</b> pierwszego elementu, więc <b>zmienia oryginał</b> (inaczej niż zwykła zmienna). Długość trzeba przekazać osobno.</li>
<li><b>Napis</b> to tablica <code>char</code> zakończona znakiem <code>\\0</code>. <code>char imie[10] = "Ala";</code> zajmuje 4 znaki (A, l, a, \\0). Wypisujesz go przez <code>%s</code>, a długość daje <code>strlen</code>.</li>
<li><b>Struktura</b> składa różne typy w jedną całość: <code>struct Punkt { int x; int y; };</code>. Pola czytasz kropką: <code>p.x</code>. Struktura jest kopiowana przy przekazaniu do funkcji i przy zwracaniu, jak zwykła zmienna.</li>
<li>Kompilator może dodać między polami „puste” bajty (wyrównanie), dlatego <code>sizeof</code> struktury bywa większy niż suma pól.</li></ul>`,
examples:[
prog5('Przykład 1: tablica i pętla',`#include <stdio.h>
#define N 5

int main(void) {
    int t[N] = {4, 8, 15, 16, 23};
    int suma = 0;
    for (int i = 0; i < N; i++) {
        suma += t[i];
    }
    printf("Suma = %d, srednia = %.1f\\n", suma, (float)suma / N);
    return 0;
}
`),
prog5('Przykład 2: tablica w funkcji zmienia oryginał',`#include <stdio.h>

void podwoj(int a[], int n) {
    for (int i = 0; i < n; i++) {
        a[i] = a[i] * 2;
    }
}

int main(void) {
    int t[3] = {1, 2, 3};
    podwoj(t, 3);
    printf("%d %d %d\\n", t[0], t[1], t[2]);
    return 0;
}
`),
prog5('Przykład 3: napis to tablica znaków',`#include <stdio.h>
#include <string.h>

int main(void) {
    char imie[10] = "Ala";
    printf("%s ma %d litery\\n", imie, (int)strlen(imie));
    imie[0] = 'E';
    printf("%s\\n", imie);
    return 0;
}
`),
prog5('Przykład 4: struktura',`#include <stdio.h>

struct Punkt {
    int x;
    int y;
};

struct Punkt przesun(struct Punkt p, int dx) {
    p.x = p.x + dx;
    return p;
}

int main(void) {
    struct Punkt a = {1, 2};
    struct Punkt b = przesun(a, 5);
    printf("a=(%d,%d) b=(%d,%d)\\n", a.x, a.y, b.x, b.y);
    printf("rozmiar: %d bajtow\\n", (int)sizeof(struct Punkt));
    return 0;
}
`),
prog5('Przykład 5 ❌: wyjście poza tablicę',`#include <stdio.h>

int main(void) {
    int t[3] = {1, 2, 3};
    for (int i = 0; i <= 3; i++) {
        printf("%d ", t[i]);
    }
    return 0;
}
`)],
quiz:[
{q:'Tablica int t[5]. Który indeks jest ostatnim poprawnym?',o:['5','4','6','1'],a:1,w:'Indeksy idą od 0 do 4, czyli od 0 do rozmiar−1.'},
{q:'Funkcja dostała tablicę jako argument i zmieniła jej element. Co się stało z tablicą w main?',o:['Nic – funkcja pracowała na kopii','Zmieniła się – funkcja dostała adres oryginału','Program się nie skompiluje','Cała tablica wyzerowała się'],a:1,w:'Tablice są przekazywane przez adres pierwszego elementu, więc funkcja widzi oryginał.'},
{q:'Ile miejsc w tablicy char zajmuje napis "Ala"?',o:['3','4','2','5'],a:1,w:'Trzy litery plus znak końca napisu \\0.'},
{q:'Jak odczytać pole x ze struktury p?',o:['p->x tylko','p.x','p[x]','x(p)'],a:1,w:'Dla zwykłej struktury używamy kropki; strzałka -> jest dla wskaźnika do struktury.'},
{q:'Co robi program, który czyta t[10] z tablicy int t[10]?',o:['Zawsze zgłasza błąd','Odczytuje cudzą pamięć – niezdefiniowane zachowanie','Zwraca 0','Powiększa tablicę'],a:1,w:'C nie sprawdza zakresu indeksów. To częsta przyczyna błędów i luk bezpieczeństwa.'}
]});

LESSONS.push({id:'l7',title:'7. Wskaźniki',
theory:`
<p>Każda zmienna leży pod jakimś <b>adresem</b> w pamięci (w tabeli widzisz go w kolumnie „adres”). <b>Wskaźnik</b> to zmienna, której wartością jest adres innej zmiennej.</p>
<ul>
<li><code>int x = 10;</code> – zwykła zmienna. <code>int *p = &amp;x;</code> – wskaźnik <code>p</code> przechowuje adres <code>x</code> (<code>&amp;</code> = „adres czego”).</li>
<li><code>*p</code> (dereferencja) = „to, na co wskazuje p”. Instrukcja <code>*p = 20;</code> zmienia <code>x</code>!</li>
<li><b>Po co?</b> Funkcja dostaje kopie argumentów, więc sama nie zmieni Twoich zmiennych. Gdy przekażesz jej <b>adresy</b>, może je zmienić (tak działa <code>scanf</code> z <code>&amp;</code>). Klasyczny przykład to funkcja zamieniająca dwie liczby.</li>
<li><b>Tablice i wskaźniki:</b> nazwa tablicy zamienia się na adres jej pierwszego elementu. <code>p[i]</code> to to samo co <code>*(p + i)</code>. <code>p++</code> przesuwa wskaźnik o jeden <b>element</b> (nie o jeden bajt).</li>
<li><code>p-&gt;x</code> to skrót od <code>(*p).x</code> – pole struktury przez wskaźnik.</li>
<li><code>NULL</code> to „wskazuję na nic”. Odczyt lub zapis przez <code>NULL</code> zawiesza program (segmentation fault).</li>
<li>Pułapki: wskaźnik bez wartości początkowej wskazuje w losowe miejsce; wskaźnik na zmienną lokalną funkcji przestaje być ważny, gdy funkcja się skończy (ramka znika ze stosu).</li></ul>`,
examples:[
prog5('Przykład 1: adres i dereferencja',`#include <stdio.h>

int main(void) {
    int x = 10;
    int *p = &x;
    *p = 20;
    printf("x = %d\\n", x);
    return 0;
}
`),
prog5('Przykład 2: funkcja zamieniająca dwie liczby',`#include <stdio.h>

void zamien(int *a, int *b) {
    int tmp = *a;
    *a = *b;
    *b = tmp;
}

int main(void) {
    int x = 3, y = 7;
    zamien(&x, &y);
    printf("x=%d y=%d\\n", x, y);
    return 0;
}
`),
prog5('Przykład 3: wskaźnik i tablica',`#include <stdio.h>

int main(void) {
    int t[4] = {10, 20, 30, 40};
    int *p = t;
    printf("%d %d\\n", *p, *(p + 2));
    p++;
    printf("%d %d\\n", *p, p[1]);
    return 0;
}
`),
prog5('Przykład 4: wskaźnik do struktury',`#include <stdio.h>

struct Punkt {
    int x;
    int y;
};

void wyzeruj(struct Punkt *p) {
    p->x = 0;
    p->y = 0;
}

int main(void) {
    struct Punkt a = {5, 6};
    wyzeruj(&a);
    printf("(%d,%d)\\n", a.x, a.y);
    return 0;
}
`),
prog5('Przykład 5 ❌: wskaźnik NULL',`#include <stdio.h>

int main(void) {
    int *p = NULL;
    *p = 5;
    printf("%d\\n", *p);
    return 0;
}
`),
prog5('Przykład 6 ❌: adres zmiennej lokalnej',`#include <stdio.h>

int *zle(void) {
    int x = 5;
    return &x;
}

int main(void) {
    int *p = zle();
    printf("%d\\n", *p);
    return 0;
}
`)],
quiz:[
{q:'Co oznacza zapis int *p = &x; ?',o:['p to kopia wartości x','p przechowuje adres zmiennej x','x przechowuje adres p','p i x to ta sama zmienna'],a:1,w:'& daje adres, a wskaźnik jest zmienną trzymającą taki adres.'},
{q:'Po instrukcji *p = 20; (p wskazuje na x) czemu jest równe x?',o:['Pozostaje bez zmian','20','Adresowi p','0'],a:1,w:'Zapis przez dereferencję zmienia zmienną, na którą wskazuje wskaźnik.'},
{q:'Po co funkcji zamien() adresy &x i &y zamiast samych wartości?',o:['Żeby była szybsza','Żeby mogła zmienić oryginały, a nie ich kopie','Bo C nie umie przekazywać liczb','Żeby nie używać return'],a:1,w:'Parametry są kopiami; dopiero adres pozwala funkcji sięgnąć do zmiennej wywołującego.'},
{q:'Ile bajtów przesuwa się wskaźnik int *p po p++ ?',o:['1 bajt','O rozmiar jednego int (zwykle 4 bajty)','8 bajtów zawsze','Wcale'],a:1,w:'Arytmetyka wskaźników liczy w elementach, nie w bajtach.'},
{q:'Co jest groźne w funkcji zwracającej &x, gdzie x jest zmienną lokalną?',o:['Nic, to normalne','Po powrocie zmienna znika, więc adres jest nieważny','Funkcja nie może zwracać adresów','x staje się globalne'],a:1,w:'Ramka funkcji znika ze stosu, a adres wskazuje już w pamięć, której nikt nie pilnuje.'}
]});

const bitsWidget=()=>{
  const box=$('div','card');
  box.innerHTML='<b>Konwerter liczb</b><p>Wpisz liczbę całkowitą (jak <code>int</code>) i zobacz, jak wygląda w pamięci.</p>';
  const inp=$('input','in');inp.type='number';inp.value='-5';
  const res=$('div');res.style.cssText='font:14px ui-monospace,Consolas,monospace;line-height:1.7;word-break:break-all';
  const f=()=>{
    const n=Number(inp.value);
    if(inp.value===''||!Number.isInteger(n)||n<-2147483648||n>2147483647){res.textContent='Podaj liczbę całkowitą z zakresu int: −2147483648 … 2147483647.';return}
    const u=n>>>0,bin=u.toString(2).padStart(32,'0').replace(/(.{8})(?=.)/g,'$1 ');
    const dv=new DataView(new ArrayBuffer(4));dv.setFloat32(0,n);const fb=dv.getUint32(0).toString(2).padStart(32,'0');
    res.innerHTML=`binarnie (4 bajty, kod uzupełnień do 2): ${bin}<br>szesnastkowo: 0x${u.toString(16).toUpperCase().padStart(8,'0')}<br>jako unsigned int: ${u}`
      +(n>=32&&n<127?`<br>jako znak ASCII: '${esc(String.fromCharCode(n))}'`:'')
      +`<br>jako float (${Math.fround(n)}): znak ${fb[0]} | wykładnik ${fb.slice(1,9)} | mantysa ${fb.slice(9)}`;
  };
  inp.oninput=f;f();box.append(inp,res);return box;
};
LESSONS.push({id:'l8',title:'8. Bity, liczby i znaki',widget:bitsWidget,
theory:`
<p>Komputer zna tylko <b>bity</b> (0 i 1). 8 bitów to <b>bajt</b>. Wszystko – liczby, litery, obrazy – to ciągi bitów, a o ich znaczeniu decyduje <b>typ</b>.</p>
<ul>
<li><b>Systemy liczbowe:</b> dwójkowy (0–1), dziesiętny, szesnastkowy (0–9, A–F; <code>0xFF</code> = 255). Jedna cyfra szesnastkowa to dokładnie 4 bity.</li>
<li><b>Liczby całkowite:</b> <code>int</code> ma 32 bity, więc mieści zakres od −2 147 483 648 do 2 147 483 647. Liczby ujemne zapisuje się w <b>kodzie uzupełnień do 2</b>. Po przekroczeniu zakresu następuje <b>nadmiar</b>: liczba „zawija się”. <code>unsigned int</code> to liczby bez znaku (0 … 4 294 967 295).</li>
<li><b>Liczby rzeczywiste</b> (<code>float</code>, <code>double</code>) zapisuje się jako znak, wykładnik i mantysę. Większość ułamków (np. 0,1) nie ma dokładnego zapisu dwójkowego, więc rachunki są <b>przybliżone</b>: nigdy nie porównuj <code>double</code> przez <code>==</code> po obliczeniach. Są też wartości specjalne: <code>Inf</code> i <code>NaN</code>.</li>
<li><b>Znaki:</b> <code>char</code> to mała liczba, a litera wynika z tabeli kodów. W ASCII <code>'A'</code> = 65, <code>'a'</code> = 97, <code>'0'</code> = 48. Polskie litery wymagają innych kodowań: cp1250, latin2, a dziś najczęściej UTF-8 (jeden znak = 1 do 4 bajtów).</li>
<li><b>Operatory bitowe:</b> <code>&amp;</code> (i), <code>|</code> (lub), <code>^</code> (albo), <code>~</code> (negacja), <code>&lt;&lt;</code> i <code>&gt;&gt;</code> (przesunięcia). Przesunięcie w lewo o 1 mnoży przez 2.</li></ul>`,
examples:[
prog5('Przykład 1: nadmiar (overflow) int',`#include <stdio.h>

int main(void) {
    int x = 2147483647;
    printf("%d\\n", x);
    x = x + 1;
    printf("%d\\n", x);
    return 0;
}
`),
prog5('Przykład 2: liczby bez znaku zawijają się',`#include <stdio.h>

int main(void) {
    unsigned int u = 0;
    u = u - 1;
    printf("%u\\n", u);
    return 0;
}
`),
prog5('Przykład 3: ułamki są przybliżone',`#include <stdio.h>

int main(void) {
    double a = 0.1, b = 0.2;
    printf("%.20f\\n", a + b);
    printf("rowne 0.3? %d\\n", a + b == 0.3);
    return 0;
}
`),
prog5('Przykład 4: znak to liczba',`#include <stdio.h>

int main(void) {
    char c = 'a';
    printf("%c to %d\\n", c, c);
    c = c - 32;
    printf("duza litera: %c\\n", c);
    for (char z = 'A'; z <= 'E'; z++) {
        printf("%c", z);
    }
    printf("\\n");
    return 0;
}
`),
prog5('Przykład 5: operatory bitowe',`#include <stdio.h>

int main(void) {
    int a = 12;
    printf("%d\\n", a & 10);
    printf("%d\\n", a | 3);
    printf("%d\\n", a ^ 5);
    printf("%d\\n", a << 2);
    printf("%d\\n", a >> 1);
    printf("0x%x\\n", 255);
    return 0;
}
`)],
quiz:[
{q:'Ile bitów ma jeden bajt?',o:['4','8','16','32'],a:1,w:'Bajt to 8 bitów.'},
{q:'Co się stanie po int x = 2147483647; x = x + 1; ?',o:['x = 2147483648','Nadmiar: x zawinie się do liczby ujemnej','Program zgłosi błąd i przerwie się','x pozostanie bez zmian'],a:1,w:'int ma 32 bity. Po największej wartości następuje najmniejsza.'},
{q:'Dlaczego 0.1 + 0.2 == 0.3 jest w C fałszem?',o:['Bo C źle liczy','Bo ułamki dwójkowe są przybliżone','Bo 0.3 to int','Bo trzeba użyć ==='],a:1,w:'0,1 i 0,2 nie mają dokładnego zapisu dwójkowego; wynik różni się o drobną wartość.'},
{q:'Jaki kod ma w ASCII znak \'A\'?',o:['1','65','97','48'],a:1,w:'Duże litery zaczynają się od 65, małe od 97, cyfry od 48.'},
{q:'Czemu jest równe 1 << 3 ?',o:['3','6','8','13'],a:2,w:'Każde przesunięcie w lewo o 1 bit mnoży przez 2: 1·2·2·2 = 8.'}
]});

LESSONS.push({id:'l9',title:'9. Pliki i strumienie',
theory:`
<p><b>Plik</b> to dane zapisane na dysku pod nazwą. W C pracuje się z nim przez <b>strumień</b>: otwierasz plik, czytasz lub piszesz kawałek po kawałku, na końcu zamykasz.</p>
<ul>
<li><code>FILE *f = fopen("dane.txt", "r");</code> – otwarcie. Tryby: <code>"r"</code> czytanie, <code>"w"</code> pisanie (kasuje starą zawartość!), <code>"a"</code> dopisywanie.</li>
<li><b>Zawsze sprawdzaj wynik:</b> gdy pliku nie ma, <code>fopen</code> zwraca <code>NULL</code>. Użycie takiego f zawiesza program.</li>
<li>Czytanie: <code>fscanf(f, "%d", &amp;x)</code> (działa jak scanf, zwraca liczbę wczytanych wartości), <code>fgets</code> (linia), <code>fgetc</code> (znak). Pisanie: <code>fprintf(f, ...)</code>, <code>fputs</code>, <code>fputc</code>.</li>
<li><code>fclose(f)</code> – zamknięcie; dopiero ono gwarantuje, że dane trafiły na dysk.</li>
<li><code>printf</code> i <code>scanf</code> to też strumienie (ekran i klawiatura).</li>
<li>Pułapka: <code>feof(f)</code> robi się prawdziwe dopiero <b>po</b> nieudanej próbie czytania. Pętla <code>while (!feof(f))</code> przetwarza więc ostatnią wartość dwa razy. Lepiej: <code>while (fscanf(...) == 1)</code>.</li>
<li>Tu pliki są <b>wirtualne</b> (żyją tylko w pamięci strony). Poniżej terminala zobaczysz ich zawartość, a w Pracowni plik <code>dane.txt</code> ustawiasz w osobnym polu.</li></ul>`,
examples:[
prog5('Przykład 1: zapis i odczyt',`#include <stdio.h>

int main(void) {
    FILE *f = fopen("wynik.txt", "w");
    fprintf(f, "Mam %d lat\\n", 19);
    fclose(f);

    char buf[40];
    f = fopen("wynik.txt", "r");
    fgets(buf, 40, f);
    fclose(f);
    printf("Z pliku: %s", buf);
    return 0;
}
`),
prog5('Przykład 2: suma liczb z pliku',`#include <stdio.h>

int main(void) {
    FILE *f = fopen("dane.txt", "r");
    int x, suma = 0;
    while (fscanf(f, "%d", &x) == 1) {
        suma += x;
    }
    fclose(f);
    printf("Suma = %d\\n", suma);
    return 0;
}
`,'',{'dane.txt':'3 7 12 5'}),
prog5('Przykład 3: brak pliku',`#include <stdio.h>

int main(void) {
    FILE *f = fopen("nie_ma.txt", "r");
    if (f == NULL) {
        printf("Nie mozna otworzyc pliku\\n");
        return 1;
    }
    fclose(f);
    return 0;
}
`),
prog5('Przykład 4: pułapka feof',`#include <stdio.h>

int main(void) {
    FILE *f = fopen("dane.txt", "r");
    int x;
    while (!feof(f)) {
        fscanf(f, "%d", &x);
        printf("%d ", x);
    }
    fclose(f);
    printf("\\n");
    return 0;
}
`,'',{'dane.txt':'1 2\n'})],
quiz:[
{q:'Co zwraca fopen, gdy nie może otworzyć pliku do czytania?',o:['0','NULL','-1','Pusty napis'],a:1,w:'Zwraca NULL. Trzeba to sprawdzić przed użyciem pliku.'},
{q:'Co robi otwarcie istniejącego pliku w trybie "w"?',o:['Dopisuje na końcu','Kasuje jego dotychczasową zawartość','Tylko czyta','Zgłasza błąd'],a:1,w:'Tryb "w" tworzy plik od nowa. Do dopisywania służy "a".'},
{q:'Po co jest fclose?',o:['Żeby usunąć plik','Żeby zakończyć pracę z plikiem i zapisać dane','Żeby ukryć plik','Nie jest potrzebny'],a:1,w:'Zamknięcie zwalnia zasoby i kończy zapis danych.'},
{q:'Którą pętlę czytającą liczby z pliku warto wybrać?',o:['while (!feof(f))','while (fscanf(f, "%d", &x) == 1)','for (;;)','do { } while (1)'],a:1,w:'fscanf zwraca liczbę wczytanych wartości, więc wiadomo, kiedy dane się skończyły.'}
]});

LESSONS.push({id:'l10',title:'10. Błędy, testy i styl',
theory:`
<p>Dobry program nie tylko działa, ale też <b>radzi sobie z błędami</b>, ma <b>testy</b> i da się go przeczytać.</p>
<ul>
<li><b>Sprawdzaj wyniki funkcji.</b> <code>scanf</code> zwraca, ile wartości wczytał; <code>fopen</code> zwraca <code>NULL</code> przy porażce. Funkcja, która może się nie udać, powinna to zgłaszać (np. kodem 0/1) – wtedy wywołujący zdecyduje, co dalej.</li>
<li><b>Kod wyjścia</b> programu: <code>return 0;</code> z <code>main</code> znaczy „wszystko OK”, inna liczba – „błąd”.</li>
<li><b>Testowanie:</b> piszesz małe sprawdzenia dla funkcji: zwykłe dane i <b>przypadki brzegowe</b> (0, 1, liczby ujemne, pusta tablica). <code>assert(warunek)</code> przerywa program, gdy warunek jest fałszywy.</li>
<li><b>Debugowanie</b> to szukanie przyczyny błędu. Robisz to cały czas w tej aplikacji: wykonujesz program krok po kroku i patrzysz na zmienne. W prawdziwych IDE ten sam pomysł nazywa się debugger.</li>
<li><b>Styl:</b> czytelne nazwy (<code>suma</code>, nie <code>s2</code>), wcięcia, krótkie funkcje, które robią jedną rzecz, komentarze wyjaśniające <i>dlaczego</i>. Kod czyta się znacznie częściej, niż się go pisze.</li>
<li><b>Cykl życia programu:</b> wymagania → projekt → kod → testy → poprawki → dokumentacja → utrzymanie. Błędy znalezione wcześnie kosztują najmniej, a błędne systemy mogą powodować prawdziwe szkody.</li></ul>`,
examples:[
prog5('Przykład 1: sprawdzamy wynik scanf (wpisz „abc” w danych)',`#include <stdio.h>

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) {
        printf("To nie jest liczba!\\n");
        return 1;
    }
    printf("Kwadrat: %d\\n", n * n);
    return 0;
}
`,'abc'),
prog5('Przykład 2: błąd zgłoszony kodem',`#include <stdio.h>

int dziel(int a, int b, int *wynik) {
    if (b == 0) {
        return 0;
    }
    *wynik = a / b;
    return 1;
}

int main(void) {
    int w;
    if (dziel(10, 0, &w)) {
        printf("Wynik: %d\\n", w);
    } else {
        printf("Nie dzielimy przez zero\\n");
    }
    return 0;
}
`),
prog5('Przykład 3: testy z assert (wszystkie przechodzą)',`#include <stdio.h>
#include <assert.h>

int maks(int a, int b) {
    return a > b ? a : b;
}

int main(void) {
    assert(maks(2, 5) == 5);
    assert(maks(7, 7) == 7);
    assert(maks(-1, -3) == -1);
    printf("Wszystkie testy OK\\n");
    return 0;
}
`),
prog5('Przykład 4 ❌: test wykrywa błąd w funkcji',`#include <stdio.h>
#include <assert.h>

int wartosc_bezwzgledna(int x) {
    if (x > 0) {
        return x;
    }
    return x;
}

int main(void) {
    assert(wartosc_bezwzgledna(4) == 4);
    assert(wartosc_bezwzgledna(-4) == 4);
    printf("OK\\n");
    return 0;
}
`)],
quiz:[
{q:'Co zwraca scanf("%d", &n), gdy użytkownik wpisze litery?',o:['1','0 – nic nie wczytał','-5','Zawiesza się'],a:1,w:'scanf zwraca liczbę poprawnie wczytanych wartości. Dlatego warto sprawdzać, czy równa się 1.'},
{q:'Co oznacza return 0; na końcu main?',o:['Błąd programu','Program zakończył się poprawnie','Zamknięcie pliku','Wyzerowanie zmiennych'],a:1,w:'Zero to umowny kod „sukces”; inne wartości oznaczają błąd.'},
{q:'Który zestaw danych jest przypadkiem brzegowym dla funkcji liczącej maksimum z tablicy?',o:['Tablica z 5 losowymi liczbami','Tablica z jednym elementem','Dowolna duża tablica','Żaden'],a:1,w:'Przypadki brzegowe to skrajne, graniczne sytuacje: najmniejsza tablica, zero, wartości ujemne.'},
{q:'Co robi assert(x > 0), gdy x wynosi -1?',o:['Nic','Przerywa program z komunikatem o błędzie','Zmienia x na 1','Wypisuje ostrzeżenie i działa dalej'],a:1,w:'assert kończy program, gdy warunek jest fałszywy – wygodne do testowania założeń.'}
]});

LESSONS.unshift({id:'l1',title:'1. O co w tym chodzi?',
theory:`
<p><b>Programowanie</b> to wymyślanie dla komputera <b>przepisu</b> (kolejnych kroków), który on wykona sam i bezbłędnie, ale <i>dokładnie tak, jak napisano</i>. Komputer nie domyśla się niczego. Dlatego uczymy się myśleć krok po kroku.</p>
<ul>
<li><b>Droga od pomysłu do działania:</b> problem → <b>algorytm</b> (przepis na rozwiązanie) → <b>program</b> (przepis zapisany w języku programowania) → wynik.</li>
<li><b>Język programowania</b> to ścisły język do rozmawiania z komputerem. My uczymy się języka <b>C</b>: prostego, szybkiego i bliskiego sprzętowi. Dzięki niemu zobaczysz, co naprawdę dzieje się w pamięci.</li>
<li><b>Kod źródłowy</b> to tekst, który piszesz. Komputer rozumie tylko kod maszynowy (zera i jedynki), więc <b>kompilator</b> tłumaczy cały program naraz na plik wykonywalny. <b>Interpreter</b> tłumaczy i wykonuje linia po linii (tak działa np. Python).</li>
<li><b>Programowanie proceduralne</b>: program dzielimy na <b>procedury</b> (funkcje), czyli małe części, z których każda robi jedną rzecz. Programowanie <b>strukturalne</b>: kod składa się z prostych konstrukcji (po kolei, warunek, pętla), bez chaotycznych skoków.</li>
<li><b>Narzędzia programisty:</b> edytor lub <b>IDE</b> (środowisko, np. Visual Studio), kompilator, <b>debugger</b> (wykonywanie programu krok po kroku – to właśnie robisz w tej aplikacji), system kontroli wersji <b>git</b> (historia zmian kodu; GitHub to serwis do jego trzymania).</li>
<li><b>Jak się uczyć programowania:</b> pytaj, czytaj, podglądaj cudzy kod i <b>programuj, programuj, programuj</b>. Błędy to normalna część nauki.</li></ul>`,
examples:[
prog5('Przykład: problem → algorytm → program',`#include <stdio.h>

int main(void) {
    int cena = 3;
    int ile = 4;
    int razem = cena * ile;
    printf("Do zaplaty: %d zl\\n", razem);
    return 0;
}
`)],
quiz:[
{q:'Czym różni się algorytm od programu?',o:['Niczym','Algorytm to pomysł na rozwiązanie, program to jego zapis w języku programowania','Program jest zawsze krótszy','Algorytm działa tylko w C'],a:1,w:'Algorytm jest niezależny od języka. Program to jego konkretny zapis.'},
{q:'Co robi kompilator?',o:['Uruchamia program linia po linii','Tłumaczy kod źródłowy na kod maszynowy','Naprawia błędy','Zapisuje program na dysku'],a:1,w:'Kompilator tłumaczy cały program na postać zrozumiałą dla procesora.'},
{q:'Do czego służy debugger?',o:['Do pisania kodu','Do wykonywania programu krok po kroku i szukania błędów','Do kompilowania','Do przechowywania historii zmian'],a:1,w:'Debugger pokazuje stan programu w trakcie działania. Tak działa okno „co się dzieje” w tej aplikacji.'},
{q:'Na czym polega programowanie proceduralne?',o:['Na pisaniu całości w jednej linii','Na dzieleniu programu na procedury (funkcje)','Na używaniu tylko pętli','Na pisaniu bez zmiennych'],a:1,w:'Małe funkcje robiące jedną rzecz łatwiej napisać, przetestować i zrozumieć.'}
]},
{id:'l2',title:'2. Algorytmy',
theory:`
<p><b>Algorytm</b> to skończony ciąg jasno opisanych kroków prowadzący do rozwiązania zadania. Przykład z życia: przepis na herbatę, droga do uczelni, instrukcja obsługi.</p>
<ul>
<li><b>Cechy algorytmu:</b> <b>skończoność</b> (musi się kiedyś zakończyć), <b>określoność</b> (każdy krok jest jednoznaczny), <b>poprawność</b> (daje dobry wynik dla każdych poprawnych danych). Ma <b>dane wejściowe</b> i <b>wynik</b>.</li>
<li><b>Specyfikacja zadania:</b> zanim cokolwiek napiszesz, ustal: co dostajemy (wejście), co ma wyjść (wyjście). Np. „Dla dwóch liczb podaj większą”.</li>
<li><b>Zapis algorytmu:</b> słownie, <b>pseudokodem</b> lub <b>schematem blokowym</b> (prostokąty = czynności, romby = decyzje, strzałki = kolejność). Pseudokod to „polski” zapis zbliżony do kodu, np.:<pre>jeśli a &gt; b
    wynik ← a
w przeciwnym razie
    wynik ← b</pre></li>
<li><b>Podejście zstępujące:</b> duży problem dzielisz na mniejsze, a te na jeszcze mniejsze, aż każdy da się łatwo zapisać. Z takich części powstają funkcje.</li>
<li><b>Złożoność obliczeniowa</b> mówi, jak rośnie liczba kroków wraz z ilością danych. Szukanie liczby w tablicy po kolei to w najgorszym razie tyle kroków, ile elementów (złożoność liniowa).</li>
<li>Algorytm Euklidesa (NWD) pochodzi sprzed ponad 2000 lat i do dziś jest jednym z najlepszych przykładów: bardzo krótki i bardzo szybki.</li></ul>`,
examples:[
prog5('Przykład 1: większa z dwóch liczb',`#include <stdio.h>

int main(void) {
    int a = 7, b = 12, wynik;
    if (a > b) {
        wynik = a;
    } else {
        wynik = b;
    }
    printf("Wieksza: %d\\n", wynik);
    return 0;
}
`),
prog5('Przykład 2: algorytm Euklidesa (NWD 48 i 18)',`#include <stdio.h>

int main(void) {
    int a = 48, b = 18;
    while (b != 0) {
        int reszta = a % b;
        a = b;
        b = reszta;
    }
    printf("NWD = %d\\n", a);
    return 0;
}
`),
prog5('Przykład 3: szukanie po kolei i liczenie kroków',`#include <stdio.h>
#define N 6

int main(void) {
    int t[N] = {8, 3, 5, 9, 1, 4};
    int szukana = 9, poz = -1, porownania = 0;
    for (int i = 0; i < N; i++) {
        porownania++;
        if (t[i] == szukana) {
            poz = i;
            break;
        }
    }
    printf("indeks %d, porownan: %d\\n", poz, porownania);
    return 0;
}
`)],
quiz:[
{q:'Która cecha algorytmu mówi, że musi się on kiedyś zakończyć?',o:['Określoność','Skończoność','Poprawność','Szybkość'],a:1,w:'Skończoność: algorytm nie może działać w nieskończoność.'},
{q:'Co oznacza romb na schemacie blokowym?',o:['Początek programu','Decyzję (warunek)','Wypisanie wyniku','Pętlę nieskończoną'],a:1,w:'Romb to miejsce, w którym wybieramy dalszą drogę na podstawie warunku.'},
{q:'Czym jest podejście zstępujące?',o:['Pisaniem programu od końca','Dzieleniem dużego problemu na mniejsze części','Szukaniem w tablicy od tyłu','Zapisem algorytmu pseudokodem'],a:1,w:'Rozbijasz zadanie na prostsze kroki, aż każdy da się łatwo zapisać.'},
{q:'Ile porównań w najgorszym razie zrobi szukanie po kolei w tablicy 1000 elementów?',o:['1','10','1000','1 000 000'],a:2,w:'W najgorszym razie sprawdzisz każdy element, czyli tyle kroków, ile elementów.'}
]});
